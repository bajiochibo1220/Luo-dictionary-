const { test } = require('node:test');
const assert = require('node:assert/strict');
const { NextRequest } = require('next/server');
const { loader } = require('./load-ts.cjs');

const user = {
  id: 'existing-user', name: 'Example', email: 'example@example.test', image: null, avatarUrl: null,
  profileTypes: ['learner'], status: 'active', isSuperAdmin: false, isMasterSuperAdmin: false,
  languageRoles: [{ languageId: 1, role: 'contributor', language: { code: 'luo', name: 'Dholuo' } }],
  passwordHash: 'private-password', providerSecret: 'private-secret', dateOfBirth: new Date(),
};

test('account contract keeps the existing user ID and fresh roles without exposing credential fields', async () => {
  const load = loader({
    '@/lib/auth': { auth: async () => ({ user: { id: user.id, isSuperAdmin: true } }) },
    '@/lib/db': { prisma: { user: { findUnique: async query => {
      assert.equal(query.where.id, user.id);
      assert.equal(query.select.passwordHash, undefined);
      assert.equal(query.select.accounts, undefined);
      return user;
    } } } },
  });
  const result = await load('src/lib/account-data.ts').getCurrentAccount();
  assert.equal(result.id, user.id);
  assert.equal(result.isSuperAdmin, false, 'A stale client claim does not grant administration');
  assert.equal(result.languageRoles[0].languageCode, 'luo');
  assert.equal(JSON.stringify(result).includes('private-'), false);
  assert.equal(result.dateOfBirth, undefined);
});

test('missing, suspended and deleted accounts cannot read personal APIs', async () => {
  for (const account of [null, { ...user, status: 'suspended' }, { ...user, status: 'deleted' }]) {
    const load = loader({
      '@/lib/auth': { auth: async () => ({ user: { id: user.id } }) },
      '@/lib/db': { prisma: { user: { findUnique: async () => account } } },
    });
    const response = await load('src/app/api/v1/account/route.ts').GET();
    assert.equal(response.status, 401);
    assert.match(response.headers.get('Cache-Control'), /no-store/);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
  }
  const anonymous = loader({ '@/lib/auth': { auth: async () => null }, '@/lib/db': { prisma: { user: { findUnique: () => assert.fail('No anonymous database account lookup') } } } });
  assert.equal(await anonymous('src/lib/account-data.ts').getCurrentAccount(), null);
});

test('web chatbot and versioned history API read identical own-account rows and ignore another user ID', async () => {
  const queries = [];
  const load = loader({
    '@/lib/auth': { auth: async () => ({ user: { id: user.id } }) },
    '@/lib/db': { prisma: {
      user: { findUnique: async () => user },
      conversation: { findMany: async query => {
        queries.push(query);
        assert.deepEqual(query.where, { userId: user.id, archived: true });
        assert.equal(query.take, 100);
        assert.equal(query.select.userId, undefined);
        return [{ id: 'saved-chat', title: 'Saved chat', pinned: true, archived: true, updatedAt: new Date('2026-10-12T06:00:00Z'), _count: { messages: 3 }, userId: 'never-serialized' }];
      } },
    } },
  });
  const legacy = await load('src/app/api/conversations/route.ts').GET(new NextRequest('https://example.test/api/conversations?archived=true&userId=another-user'));
  const versioned = await load('src/app/api/v1/account/conversations/route.ts').GET(new NextRequest('https://example.test/api/v1/account/conversations?archived=true&userId=another-user'));
  assert.deepEqual((await legacy.json()).data, (await versioned.json()).data);
  assert.equal(queries.length, 2);
  assert.match(versioned.headers.get('Cache-Control'), /private.*no-store/);
});

test('anonymous requests cannot reach history queries and account failures hide provider details', async () => {
  const anonymous = loader({ '@/lib/account-data': { getCurrentAccount: async () => null, getConversationHistory: () => assert.fail('No anonymous chat-history query') } });
  assert.equal((await anonymous('src/app/api/v1/account/conversations/route.ts').GET(new NextRequest('https://example.test/api/v1/account/conversations'))).status, 401);
  const failure = loader({ '@/lib/account-data': { getCurrentAccount: async () => { throw new Error('database password secret'); } } });
  const response = await failure('src/app/api/v1/account/route.ts').GET();
  assert.equal(response.status, 503);
  assert.equal(JSON.stringify(await response.json()).includes('secret'), false);
});

test('middleware delegates exact native-capable account routes to their handlers and protects other APIs', async () => {
  const { middleware } = loader({ 'next-auth/jwt': { getToken: async () => null } })('src/middleware.ts');
  for (const path of ['/api/v1/account', '/api/v1/account/conversations']) assert.equal((await middleware(new NextRequest('https://example.test' + path))).status, 200);
  for (const path of ['/api/users', '/api/v1/account/other', '/api/v1/native/other']) assert.equal((await middleware(new NextRequest('https://example.test' + path))).status, 401);
});

test('shared API client validates backend origins and keeps personal reads separate from public reads', async () => {
  const { createAppClient, parseAppApiOrigin } = loader()('src/lib/app-client.ts');
  assert.equal(parseAppApiOrigin('https://api.example.test/'), 'https://api.example.test');
  assert.equal(parseAppApiOrigin('http://localhost:3000'), 'http://localhost:3000');
  for (const origin of ['http://api.example.test', 'https://key:secret@api.example.test', 'https://api.example.test/path', 'https://api.example.test?secret=private', 'file:///tmp/index.html']) assert.throws(() => parseAppApiOrigin(origin));
  const requests = [];
  const client = createAppClient({ origin: 'https://api.example.test', fetch: async (url, options) => {
    requests.push({ url: String(url), options });
    return Response.json({ success: true, data: [] });
  } });
  await client.conversations(true, new AbortController().signal);
  assert.equal(requests[0].url, 'https://api.example.test/api/v1/account/conversations?archived=true');
  assert.equal(requests[0].options.credentials, 'same-origin');
  assert.equal(requests[0].options.cache, 'no-store');
  const failed = createAppClient({ origin: 'https://api.example.test', fetch: async () => Response.json({ success: false, error: 'Unauthorized' }, { status: 401 }) });
  await assert.rejects(failed.account(new AbortController().signal), /Unauthorized/);
});
