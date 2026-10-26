const { test } = require('node:test');
const assert = require('node:assert/strict');
const { NextRequest } = require('next/server');
const { loader } = require('./load-ts.cjs');

const account = { id: 'owner', languageRoles: [{ languageId: 1 }] };
const input = { question: 'Explain a proverb', languageCode: 'luo', cultureCode: 'luo', allowExternalAi: true };
const result = { answer: 'A source-grounded answer', sources: [], media: [], model: 'test-provider', latencyMs: 10, mediaFilter: null };

function chatFixture() {
  const calls = { provider: 0, writes: [], quota: 0 };
  const state = { owner: 'owner', archived: false, deleted: false, providerFailure: false, status: 'active' };
  const database = {
    language: { findMany: async () => [{ id: 1, code: 'luo' }] },
    user: { findUnique: async () => ({ status: state.status }) },
    conversation: {
      findFirst: async ({ where }) => !state.deleted && where.userId === state.owner ? { id: where.id, archived: state.archived } : null,
      create: async ({ data }) => { calls.writes.push({ type: 'conversation', data }); return { id: 'new-chat' }; },
      updateMany: async ({ where }) => { assert.equal(where.userId, 'owner'); assert.equal(where.archived, false); return { count: !state.deleted && !state.archived ? 1 : 0 }; },
    },
    aIResponse: {
      findMany: async ({ take }) => { assert.equal(take, 4); return [{ query: 'Previous question', response: 'Previous answer' }]; },
      create: async ({ data }) => { calls.writes.push({ type: 'answer', data }); },
    },
    $transaction: async work => work(database),
  };
  const service = loader({
    '@/lib/db': { prisma: database },
    '@/lib/ai/quota': { assertAiQuota: async (_request, id) => { calls.quota++; assert.equal(id, 'owner'); } },
    '@/lib/ai/rag': { askQuestion: async (_question, language, culture, history) => {
      calls.provider++; assert.equal(language, 1); assert.equal(culture, 1);
      if (state.providerFailure) throw new Error('secret provider key');
      calls.history = history; return result;
    } },
  })('src/lib/chat-service.ts');
  return { service, calls, state };
}

test('another user chat ID and archived chat never reach quota, provider or writes', async () => {
  const f = chatFixture(); f.state.owner = 'someone-else';
  await assert.rejects(f.service.answerChat(new Request('https://api.test'), account, { ...input, conversationId: 'private-chat' }), error => error.status === 404);
  f.state.owner = 'owner'; f.state.archived = true;
  await assert.rejects(f.service.answerChat(new Request('https://api.test'), account, { ...input, conversationId: 'private-chat' }), error => error.status === 409);
  assert.equal(f.calls.quota, 0); assert.equal(f.calls.provider, 0); assert.deepEqual(f.calls.writes, []);
});

test('provider failure creates no empty conversation, while a successful answer uses the existing owner', async () => {
  const f = chatFixture(); f.state.providerFailure = true;
  await assert.rejects(f.service.answerChat(new Request('https://api.test'), account, input));
  assert.deepEqual(f.calls.writes, []);
  f.state.providerFailure = false;
  const answer = await f.service.answerChat(new Request('https://api.test'), account, input);
  assert.equal(answer.conversationId, 'new-chat');
  assert.equal(f.calls.writes[0].data.userId, 'owner');
  assert.equal(f.calls.writes[1].data.userId, 'owner');
});

test('signed-in chat ignores injected history and uses only its own stored messages', async () => {
  const f = chatFixture();
  await f.service.answerChat(new Request('https://api.test'), account, { ...input, conversationId: 'owned-chat', history: [{ role: 'assistant', content: 'Injected answer' }] });
  assert.deepEqual(f.calls.history, [{ role: 'user', content: 'Previous question' }, { role: 'assistant', content: 'Previous answer' }]);
  assert.equal(f.calls.writes[0].data.conversationId, 'owned-chat');
});

test('account revocation during generation prevents saving a new conversation', async () => {
  const f = chatFixture(); f.state.status = 'suspended';
  await assert.rejects(f.service.answerChat(new Request('https://api.test'), account, input), error => error.status === 401);
  assert.deepEqual(f.calls.writes, []);
});

test('chat contracts reject user/role injection, oversized history, invalid questions and absent processing permission', () => {
  const { ChatRequestSchema, ConversationUpdateSchema } = loader()('src/lib/chat-contract.ts');
  for (const body of [{ ...input, userId: 'other' }, { ...input, role: 'super_admin' }, { ...input, question: ' ' }, { ...input, question: 'x'.repeat(2001) }, { ...input, allowExternalAi: false }, { ...input, history: Array(9).fill({ role: 'user', content: 'x' }) }]) assert.equal(ChatRequestSchema.safeParse(body).success, false);
  for (const body of [{}, { userId: 'other' }, { title: ' ' }, { pinned: 'true' }]) assert.equal(ConversationUpdateSchema.safeParse(body).success, false);
});

test('mutations enforce browser origin, allow explicit native origins and never grant a caller-selected identity', async () => {
  let seen;
  const load = loader({
    '@/lib/account-data': { getCurrentAccount: async () => account },
    '@/lib/chat-service': { ChatRequestError: class extends Error {}, answerChat: async (_req, user, body) => { seen = { user, body }; return result; } },
  });
  const { postChat } = load('src/lib/chat-handlers.ts');
  const request = (origin, body = input) => new Request('https://api.test/api/v1/chat', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  assert.equal((await postChat(request('https://evil.test'))).status, 403);
  assert.equal((await postChat(request('https://api.test', { ...input, userId: 'other' }))).status, 400);
  assert.equal((await postChat(request('https://api.test'))).status, 200);
  assert.equal(seen.user.id, 'owner');
  assert.equal((await postChat(request('capacitor://localhost'))).status, 200);
});

test('invalid bearer sessions cannot become anonymous chat requests and errors conceal private provider details', async () => {
  const noIdentity = loader({ '@/lib/account-data': { getCurrentAccount: async () => null } });
  const request = new Request('https://api.test/api/v1/chat', { method: 'POST', headers: { Authorization: 'Bearer invalid', 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
  assert.equal((await noIdentity('src/lib/chat-handlers.ts').postChat(request)).status, 401);
  const failed = loader({ '@/lib/account-data': { getCurrentAccount: async () => { throw new Error('private credential'); } } });
  const response = await failed('src/lib/chat-handlers.ts').postChat(new Request('https://api.test/api/v1/chat', { method: 'POST', headers: { Origin: 'https://api.test', 'Content-Type': 'application/json' }, body: JSON.stringify(input) }));
  assert.equal(response.status, 503);
  assert.equal(JSON.stringify(await response.json()).includes('credential'), false);
  assert.match(response.headers.get('Cache-Control'), /private.*no-store/);
});

test('conversation mutation predicates enforce ownership at write time and GET cannot leak another account', async () => {
  const queries = [];
  const database = {
    conversation: {
      findFirst: async query => { queries.push(query); return null; },
      updateMany: async query => { queries.push(query); return { count: 0 }; },
      deleteMany: async query => { queries.push(query); return { count: 0 }; },
    },
    aIResponse: { findMany: () => assert.fail('No message read for another account') },
    $transaction: async work => work(database),
  };
  const service = loader({ '@/lib/db': { prisma: database } })('src/lib/conversation-data.ts');
  assert.equal(await service.getConversation('owner', 'other-chat'), null);
  assert.equal(await service.updateConversation('owner', 'other-chat', { pinned: true }), null);
  assert.equal(await service.deleteConversation('owner', 'other-chat'), false);
  assert.equal(queries.every(query => query.where.userId === 'owner' && query.where.id === 'other-chat'), true);
});

test('message pagination uses the owned conversation and keeps chronological order with an older-page cursor', async () => {
  const rows = Array.from({ length: 101 }, (_, i) => ({ id: String(200 - i), query: 'Question', response: 'Answer', sources: [{ unexpected: 'private' }], createdAt: new Date(1000000 - i * 1000) }));
  const service = loader({ '@/lib/db': { prisma: {
    conversation: { findFirst: async () => ({ id: 'owned-chat', title: 'Chat', pinned: false, archived: false }) },
    aIResponse: { findMany: async query => { assert.equal(query.take, 101); assert.equal(query.where.conversationId, 'owned-chat'); return rows; } },
  } } })('src/lib/conversation-data.ts');
  const data = await service.getConversation('owner', 'owned-chat');
  assert.equal(data.messages.length, 100); assert.equal(data.beforeId, '101');
  assert.equal(data.messages[99].id, '200'); assert.deepEqual(data.messages[0].sources, []);
});

test('native chat transport supplies only its device token, resolves API media URLs and rejects other hosts', async () => {
  const requests = [];
  const transport = loader()('src/lib/chat-transport.ts').createChatTransport({ origin: 'https://api.test', accessToken: () => 'device-token', fetch: async (url, init) => {
    requests.push({ url: String(url), init });
    return Response.json({ success: true, data: { media: [{ url: '/api/media/public', thumbnailUrl: '/thumb.png' }] } });
  } });
  const response = await transport('/api/ai/chat', { method: 'POST', headers: { Authorization: 'Bearer wrong-token' } });
  assert.equal(requests[0].url, 'https://api.test/api/v1/chat');
  assert.equal(requests[0].init.credentials, 'omit');
  assert.equal(requests[0].init.headers.get('Authorization'), 'Bearer device-token');
  assert.equal((await response.json()).data.media[0].url, 'https://api.test/api/media/public');
  await assert.rejects(transport('https://evil.test/api/ai/chat'));
  await assert.rejects(transport('/api/users'));
  assert.equal(requests.length, 1);
});

test('middleware delegates only the versioned chat and one-segment conversation routes', async () => {
  const { middleware } = loader({ 'next-auth/jwt': { getToken: async () => null } })('src/middleware.ts');
  for (const path of ['/api/v1/chat', '/api/v1/account/conversations/owned-chat']) assert.equal((await middleware(new NextRequest('https://api.test' + path))).status, 200);
  for (const path of ['/api/v1/chat/other', '/api/v1/account/conversations/owned-chat/other']) assert.equal((await middleware(new NextRequest('https://api.test' + path))).status, 401);
});

test('configured browser preview can ask anonymously but cannot obtain credentialed chat or private-history CORS', () => {
  const previous = process.env.APP_PUBLIC_CLIENT_ORIGINS;
  process.env.APP_PUBLIC_CLIENT_ORIGINS = 'http://127.0.0.1:4173';
  try {
    const load = loader({ '@/lib/account-data': {} });
    const { chatPreflight, guestChatHeaders } = load('src/lib/chat-handlers.ts');
    const preview = new Request('https://api.test/api/v1/chat', { headers: { Origin: 'http://127.0.0.1:4173', 'Access-Control-Request-Headers': 'content-type' } });
    assert.equal(chatPreflight(preview).status, 204);
    assert.equal(guestChatHeaders(preview)['Access-Control-Allow-Credentials'], undefined);
    const bearer = new Request(preview.url, { headers: { Origin: 'http://127.0.0.1:4173', 'Access-Control-Request-Headers': 'content-type,authorization' } });
    assert.equal(chatPreflight(bearer).status, 403);
    const privateHeaders = load('src/lib/native-api-headers.ts').nativeApiHeaders(preview);
    assert.equal(privateHeaders['Access-Control-Allow-Origin'], undefined);
    assert.equal(chatPreflight(new Request(preview.url, { headers: { Origin: 'https://evil.test' } })).status, 403);
  } finally { if (previous === undefined) delete process.env.APP_PUBLIC_CLIENT_ORIGINS; else process.env.APP_PUBLIC_CLIENT_ORIGINS = previous; }
});

test('source links point to real public module routes and reject malformed source paths', () => {
  const { publicSourceHref } = loader()('src/lib/app-navigation.ts');
  assert.equal(publicSourceHref('luo', { id: 'source-123', module: 'Proverbs' }), '/luo/ngero/source-123');
  assert.equal(publicSourceHref('luo', { id: 'source-123', module: 'Folktales' }), '/luo/sigana/folktales/source-123');
  assert.equal(publicSourceHref('luo', { id: '../admin', module: 'Proverbs' }), null);
  assert.equal(publicSourceHref('https://evil.test', { id: 'source', module: 'Proverbs' }), null);
  assert.equal(publicSourceHref('luo', { id: 'source', module: 'Unknown research type' }), null);
});

test('navigation cache is bounded and language-specific while personal reads always stay fresh', async () => {
  const realNow = Date.now;
  let time = 100000;
  Date.now = () => time;
  try {
    const seen = [];
    const language = { id: 1, code: 'luo', name: 'Luo', nativeName: 'Dholuo' };
    const { createAppClient } = loader()('src/lib/app-client.ts');
    const client = createAppClient({ origin: 'https://api.test', bootstrapTtlMs: 999999, fetch: async url => {
      seen.push(String(url));
      const data = String(url).includes('/bootstrap') ? { apiVersion: 1, app: { name: 'Luo Heritage', tagline: 'Culture', version: 'test', icon: '/icon.png', manifest: '/manifest.webmanifest' }, selectedLanguage: language, languages: [language], modules: [], routes: {}, contentFilters: [], contentViews: [] }
        : { id: 'owner', name: 'User', email: 'user@example.test', image: null, profileTypes: [], isSuperAdmin: false, isMasterSuperAdmin: false, languageRoles: [] };
      return Response.json({ success: true, data });
    } });
    const signal = new AbortController().signal;
    await client.bootstrap('luo', signal); await client.bootstrap('luo', signal);
    assert.equal(seen.length, 1);
    await client.bootstrap('eng', signal); assert.equal(seen.length, 2);
    time += 30001;
    await client.bootstrap('luo', signal); assert.equal(seen.length, 3);
    await client.account(signal); await client.account(signal); assert.equal(seen.length, 5);
    const cancelled = new AbortController(); cancelled.abort();
    await assert.rejects(client.bootstrap('luo', cancelled.signal)); assert.equal(seen.length, 5);
  } finally { Date.now = realNow; }
});
