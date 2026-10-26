const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { loader } = require('./load-ts.cjs');
const verifier = 'v'.repeat(43);
const challenge = createHash('sha256').update(verifier).digest('base64url');
const state = 's'.repeat(43);
const approvalParameters = value => new URL(new URL(value).searchParams.get('callbackUrl'), 'https://api.test').searchParams;

function fixture() {
  const grants = new Map();
  const sessions = new Map();
  const account = { status: 'active' };
  const database = {
    user: { findUnique: async () => account },
    verificationToken: {
      create: async ({ data }) => { grants.set(data.token, data); return data; },
      findUnique: async ({ where }) => grants.get(where.token) || null,
      updateMany: async ({ where, data }) => {
        const row = grants.get(where.token);
        if (!row || row.identifier !== where.identifier || row.expires <= where.expires.gt) return { count: 0 };
        grants.set(where.token, { ...row, ...data }); return { count: 1 };
      },
      deleteMany: async ({ where }) => {
        if (where.identifier?.startsWith) {
          let count = 0;
          for (const [token, row] of grants) if (row.identifier.startsWith(where.identifier.startsWith)) { grants.delete(token); count++; }
          return { count };
        }
        const row = grants.get(where.token);
        if (!row || row.expires <= where.expires.gt) return { count: 0 };
        grants.delete(where.token); return { count: 1 };
      },
    },
    session: {
      create: async ({ data }) => { sessions.set(data.sessionToken, data); return data; },
      findUnique: async ({ where }) => sessions.get(where.sessionToken) || null,
      deleteMany: async ({ where }) => {
        if (typeof where.sessionToken === 'string') return { count: Number(sessions.delete(where.sessionToken)) };
        let count = 0;
        for (const key of sessions.keys()) if (key.startsWith(where.sessionToken.startsWith)) { sessions.delete(key); count++; }
        return { count };
      },
    },
    $transaction: async callback => callback(database),
  };
  const load = loader({ '@/lib/db': { prisma: database } });
  const service = load('src/lib/native-auth.ts');
  async function grant() {
    const callback = new URL(await service.createNativeAuthorization('existing-user', { challenge, state }));
    assert.equal(callback.searchParams.get('state'), state);
    return callback.searchParams.get('code');
  }
  return { load, service, grants, sessions, account, grant };
}

test('native authorization keeps the existing identity and hashes stored codes and sessions', async () => {
  const f = fixture();
  const code = await f.grant();
  assert.equal([...f.grants.values()][0].token.includes(code), false);
  assert.equal([...f.grants.values()][0].identifier.includes('existing-user'), true);
  const session = await f.service.exchangeNativeAuthorization({ code, verifier });
  assert.match(session.accessToken, /^lh_native_/);
  assert.equal([...f.sessions.values()][0].sessionToken.includes(session.accessToken), false);
  assert.equal(await f.service.getNativeSessionUserId('Bearer ' + session.accessToken), 'existing-user');
  assert.equal(await f.service.getNativeSessionUserId('Bearer arbitrary-browser-token'), null);
});

test('incorrect PKCE cannot redeem a code and correct proof redeems it only once', async () => {
  const f = fixture();
  const code = await f.grant();
  assert.equal(await f.service.exchangeNativeAuthorization({ code, verifier: 'x'.repeat(43) }), null);
  assert.equal(f.grants.size, 1);
  const attempts = await Promise.all([f.service.exchangeNativeAuthorization({ code, verifier }), f.service.exchangeNativeAuthorization({ code, verifier })]);
  assert.equal(attempts.filter(Boolean).length, 1);
  assert.equal(f.sessions.size, 1);
  assert.equal(await f.service.exchangeNativeAuthorization({ code, verifier }), null);
});

test('expired codes and suspended users cannot create mobile sessions', async () => {
  const f = fixture();
  const expired = await f.grant();
  [...f.grants.values()][0].expires = new Date(Date.now() - 1000);
  assert.equal(await f.service.exchangeNativeAuthorization({ code: expired, verifier }), null);
  const suspended = await f.grant();
  f.account.status = 'suspended';
  assert.equal(await f.service.exchangeNativeAuthorization({ code: suspended, verifier }), null);
  assert.equal(await f.service.createNativeAuthorization('existing-user', { challenge, state }), null);
  assert.equal(f.sessions.size, 0);
});

test('mobile sessions expire and device sign-out revokes only that token', async () => {
  const f = fixture();
  const a = await f.service.exchangeNativeAuthorization({ code: await f.grant(), verifier });
  const b = await f.service.exchangeNativeAuthorization({ code: await f.grant(), verifier });
  await f.service.revokeNativeSession('Bearer ' + a.accessToken);
  assert.equal(await f.service.getNativeSessionUserId('Bearer ' + a.accessToken), null);
  assert.equal(await f.service.getNativeSessionUserId('Bearer ' + b.accessToken), 'existing-user');
  [...f.sessions.values()][0].expires = new Date(Date.now() - 1);
  assert.equal(await f.service.getNativeSessionUserId('Bearer ' + b.accessToken), null);
});

test('invalid bearer tokens cannot fall back to a browser account', async () => {
  const load = loader({
    '@/lib/native-auth': { getNativeSessionUserId: async () => null },
    '@/lib/auth': { auth: () => assert.fail('Must not use another browser identity') },
    '@/lib/db': { prisma: { user: { findUnique: () => assert.fail('No account query without identity') } } },
  });
  assert.equal(await load('src/lib/account-data.ts').getCurrentAccount(new Request('https://api.test', { headers: { Authorization: 'Bearer invalid' } })), null);
});

test('private native CORS requires explicit origins and does not enable cookies', () => {
  const { nativeApiHeaders, nativePreflight } = loader()('src/lib/native-api-headers.ts');
  for (const origin of ['capacitor://localhost', 'https://localhost', 'http://localhost']) {
    const request = new Request('https://api.test/api/v1/account', { headers: { Origin: origin } });
    const headers = nativeApiHeaders(request);
    assert.equal(headers['Access-Control-Allow-Origin'], origin);
    assert.equal(headers['Access-Control-Allow-Credentials'], undefined);
    assert.match(headers['Access-Control-Allow-Headers'], /Authorization/);
    assert.match(headers['Cache-Control'], /private.*no-store/);
    assert.equal(nativePreflight(request).status, 204);
  }
  for (const origin of ['null', 'https://evil.test', 'https://localhost.evil.test', 'http://127.0.0.1:4173']) {
    assert.equal(nativePreflight(new Request('https://api.test', { headers: { Origin: origin } })).status, 403);
  }
});

test('browser authorization rejects CSRF, arbitrary redirects and client-supplied roles', async () => {
  let calls = 0;
  const load = loader({ '@/lib/auth': { auth: async () => ({ user: { id: 'existing-user' } }) },
    '@/lib/native-auth': { createNativeAuthorization: async (userId, input) => { calls++; assert.equal(userId, 'existing-user'); assert.deepEqual(input, { challenge, state }); return 'org.jooust.luoheritage.dev://auth/callback?code=test'; } } });
  const { POST } = load('src/app/api/v1/native/authorize/route.ts');
  const make = (origin, body) => new Request('https://api.test/api/v1/native/authorize', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  assert.equal((await POST(make('https://evil.test', { challenge, state }))).status, 403);
  assert.equal((await POST(make('https://api.test', { challenge, state, redirect: 'https://evil.test', isSuperAdmin: true }))).status, 400);
  assert.equal((await POST(make('https://api.test', { challenge, state }))).status, 200);
  assert.equal(calls, 1);
});

test('token endpoint rejects password/client-identity payloads and hides backend failures', async () => {
  const { POST } = loader({ '@/lib/native-auth': { exchangeNativeAuthorization: async () => { throw new Error('database secret'); } } })('src/app/api/v1/native/token/route.ts');
  const request = body => new Request('https://api.test/api/v1/native/token', { method: 'POST', body: JSON.stringify(body) });
  assert.equal((await POST(request({ email: 'other@account.test', password: 'private', userId: 'other' }))).status, 400);
  const response = await POST(request({ code: 'c'.repeat(43), verifier }));
  assert.equal(response.status, 503);
  assert.equal(JSON.stringify(await response.json()).includes('secret'), false);
});

test('login callback only accepts a validated internal native approval destination', () => {
  const { nativeLoginReturn } = loader()('src/lib/native-auth-contract.ts');
  const good = `/mobile-auth?challenge=${challenge}&state=${state}`;
  assert.equal(nativeLoginReturn(good), good);
  for (const value of [null, undefined, [good, good], { callbackUrl: good }, 'https://evil.test' + good, '//evil.test' + good, '/dashboard', good + '&role=admin', good + '#fragment', good + '&state=extra', '/mobile-auth?challenge=bad&state=bad', '/\\evil.test/mobile-auth']) assert.equal(nativeLoginReturn(value), null);
});

test('native client binds state and verifier, sends no cookies, and never puts bearer tokens in return URLs', async () => {
  const opened = [];
  const requests = [];
  const { createNativeLoginClient } = loader()('src/lib/native-login-client.ts');
  const token = 'lh_native_' + 't'.repeat(43);
  const client = createNativeLoginClient({ origin: 'https://api.test', openBrowser: async url => opened.push(url), fetch: async (url, options) => {
    requests.push({ url: String(url), options });
    return Response.json({ success: true, data: { accessToken: token, expiresAt: new Date(Date.now() + 600000).toISOString() } });
  } });
  await client.start();
  const request = new URL(opened[0]);
  const approval = approvalParameters(request);
  assert.equal(request.pathname, '/login');
  const wrong = `org.jooust.luoheritage.dev://auth/callback?code=${'c'.repeat(43)}&state=${'z'.repeat(43)}`;
  await assert.rejects(client.acceptCallback(wrong), /could not be verified/);
  assert.equal(requests.length, 0);
  assert.equal(await client.acceptCallback('org.jooust.luoheritage.dev://evil/callback'), false);
  await client.acceptCallback(`org.jooust.luoheritage.dev://auth/callback?code=${'c'.repeat(43)}&state=${approval.get('state')}`);
  const payload = JSON.parse(requests[0].options.body);
  assert.equal(createHash('sha256').update(payload.verifier).digest('base64url'), approval.get('challenge'));
  assert.equal(requests[0].options.credentials, 'omit');
  assert.equal(opened[0].includes(token), false);
  assert.equal(client.accessToken(), token);
  await client.signOut();
  assert.equal(client.accessToken(), null);
  assert.equal(requests[1].options.headers.Authorization, 'Bearer ' + token);
});

test('sign-out during token exchange cannot reactivate a session', async () => {
  let opened;
  let complete;
  let revoked = false;
  const { createNativeLoginClient } = loader()('src/lib/native-login-client.ts');
  const token = 'lh_native_' + 't'.repeat(43);
  const client = createNativeLoginClient({ origin: 'https://api.test', openBrowser: async url => { opened = new URL(url); }, fetch: async (url) => {
    if (String(url).endsWith('/revoke')) { revoked = true; return Response.json({ success: true }); }
    return new Promise(resolve => { complete = resolve; });
  } });
  await client.start();
  const exchange = client.acceptCallback(`org.jooust.luoheritage.dev://auth/callback?code=${'c'.repeat(43)}&state=${approvalParameters(opened).get('state')}`);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(typeof complete, 'function', 'Token request must be in flight before sign-out');
  await assert.rejects(client.start(), /still connecting/);
  await client.signOut();
  complete(Response.json({ success: true, data: { accessToken: token, expiresAt: new Date(Date.now() + 600000).toISOString() } }));
  await exchange;
  assert.equal(client.accessToken(), null);
  assert.equal(revoked, true);
});

test('mobile sign-in refuses HTTP without explicit native debug permission', async () => {
  const { createNativeLoginClient } = loader()('src/lib/native-login-client.ts');
  const client = createNativeLoginClient({ origin: 'http://localhost:3000', openBrowser: () => assert.fail('No insecure native sign-in') });
  await assert.rejects(client.start(), /Sign-in is unavailable/);
});

test('USB development sign-in requires a permitted loopback origin and a positive native build check', async () => {
  const { createNativeLoginClient } = loader()('src/lib/native-login-client.ts');
  for (const origin of ['http://localhost:3000', 'http://127.0.0.1:3000']) {
    let opened;
    const client = createNativeLoginClient({ origin, allowLocalUsbAuth: async () => true, openBrowser: async value => { opened = new URL(value); } });
    await client.start();
    assert.equal(opened.origin, origin);
    assert.equal(opened.pathname, '/login');
    assert.match(approvalParameters(opened).get('challenge'), /^[A-Za-z0-9_-]{43}$/);
    for (const check of [async () => false, async () => { throw new Error('Missing native plugin'); }]) {
      await assert.rejects(createNativeLoginClient({ origin, allowLocalUsbAuth: check, openBrowser: () => assert.fail('Not enabled') }).start(), /Sign-in is unavailable/);
    }
  }
  await assert.rejects(createNativeLoginClient({ origin: 'http://localhost:3001', allowLocalUsbAuth: () => assert.fail('Wrong port'), openBrowser: () => assert.fail('Wrong origin') }).start(), /Sign-in is unavailable/);
  assert.throws(() => createNativeLoginClient({ origin: 'http://remote.test:3000', allowLocalUsbAuth: async () => true, openBrowser: () => {} }), /HTTPS API origin/);
});

test('native Create account retains PKCE approval and registration/login links reject injected destinations', async () => {
  const { createNativeLoginClient } = loader()('src/lib/native-login-client.ts');
  const { nativeAuthHref, nativeLoginReturn, nativeReturnCookie, nativeReturnFromCookie } = loader()('src/lib/native-auth-contract.ts');
  let opened;
  await createNativeLoginClient({ origin: 'https://api.test', openBrowser: async value => { opened = new URL(value); } }).start('register');
  assert.equal(opened.pathname, '/register');
  const returnPath = opened.searchParams.get('callbackUrl');
  assert.equal(nativeLoginReturn(returnPath), returnPath);
  for (const page of ['login', 'register']) {
    const link = new URL(nativeAuthHref(page, returnPath), 'https://api.test');
    assert.equal(link.searchParams.get('callbackUrl'), returnPath);
    assert.equal(nativeAuthHref(page, '//evil.test/mobile-auth'), '/' + page);
  }
  const cookie = nativeReturnCookie(returnPath, true);
  assert.match(cookie, /Max-Age=600; Path=\/; SameSite=Lax; Secure$/);
  assert.equal(nativeReturnFromCookie(cookie.split(';')[0].split('=')[1]), returnPath);
  assert.match(nativeReturnCookie(null, true), /Max-Age=0/);
  assert.equal(nativeReturnFromCookie('%ZZ'), null);
  assert.equal(nativeReturnFromCookie(encodeURIComponent('https://evil.test/mobile-auth')), null);
  const pendingLogin = new URL(nativeAuthHref('login', returnPath, { registered: 'pending' }), 'https://api.test');
  assert.equal(pendingLogin.searchParams.get('callbackUrl'), returnPath);
  assert.equal(pendingLogin.searchParams.get('registered'), 'pending');
});

test('sign-out while the native debug check waits prevents a late login launch', async () => {
  const { createNativeLoginClient } = loader()('src/lib/native-login-client.ts');
  let complete;
  const client = createNativeLoginClient({ origin: 'http://localhost:3000', allowLocalUsbAuth: () => new Promise(resolve => { complete = resolve; }), openBrowser: () => assert.fail('Signed out') });
  const starting = client.start();
  await client.signOut(); complete(true); await starting;
  assert.equal(client.accessToken(), null);
});

test('Google rejection keeps a valid native return and drops unsafe cookie destinations', async () => {
  const returnPath = `/mobile-auth?challenge=${challenge}&state=${state}`;
  let configuration;
  const cookieValues = new Map([['google-auth-intent', 'login'], ['native-auth-return', encodeURIComponent(returnPath)]]);
  const load = loader({
    'next-auth': value => { configuration = value; return { auth: async () => null }; },
    'next-auth/providers/credentials': value => value,
    'next-auth/providers/google': value => value,
    '@auth/prisma-adapter': { PrismaAdapter: () => ({}) },
    'next/headers': { cookies: async () => ({ get: key => ({ value: cookieValues.get(key) }), delete: key => cookieValues.delete(key) }) },
    '@/lib/db': { prisma: { account: { findUnique: async () => null }, user: { findFirst: async () => null } } },
  });
  load('src/lib/auth.ts');
  const input = { user: { email: 'example@account.test' }, account: { provider: 'google', providerAccountId: 'example' }, profile: { email_verified: true } };
  const response = new URL(await configuration.callbacks.signIn(input), 'https://api.test');
  assert.equal(response.searchParams.get('error'), 'GoogleAccountNotFound');
  assert.equal(response.searchParams.get('callbackUrl'), returnPath);
  cookieValues.set('native-auth-return', encodeURIComponent('//evil.test/mobile-auth'));
  const rejected = new URL(await configuration.callbacks.signIn(input), 'https://api.test');
  assert.equal(rejected.pathname, '/login');
  assert.equal(rejected.searchParams.get('callbackUrl'), null);
});

test('native account reads use current database roles and reject suspension without a browser fallback', async () => {
  const user = { id: 'existing-user', name: 'Example', email: 'example@account.test', image: null, avatarUrl: null,
    profileTypes: [], status: 'active', isSuperAdmin: false, isMasterSuperAdmin: false, languageRoles: [] };
  const load = loader({
    '@/lib/native-auth': { getNativeSessionUserId: async () => user.id },
    '@/lib/auth': { auth: () => assert.fail('Native sessions never copy browser identity') },
    '@/lib/db': { prisma: { user: { findUnique: async ({ where, select }) => {
      assert.equal(where.id, 'existing-user'); assert.equal(select.passwordHash, undefined); return user;
    } } } },
  });
  const { getCurrentAccount } = load('src/lib/account-data.ts');
  const request = new Request('https://api.test/api/v1/account?userId=another-user', { headers: { Authorization: 'Bearer device-token' } });
  assert.equal((await getCurrentAccount(request)).isSuperAdmin, false);
  user.isMasterSuperAdmin = true;
  assert.equal((await getCurrentAccount(request)).isSuperAdmin, true);
  user.status = 'suspended';
  assert.equal(await getCurrentAccount(request), null);
});

test('shared native transport attaches device credentials only to personal reads', async () => {
  const requests = [];
  const token = 'lh_native_' + 't'.repeat(43);
  const profile = { id: 'existing-user', name: null, email: 'example@account.test', image: null, profileTypes: [], isSuperAdmin: false, isMasterSuperAdmin: false, languageRoles: [] };
  const { createAppClient } = loader()('src/lib/app-client.ts');
  const client = createAppClient({ origin: 'https://api.test', accessToken: () => token, fetch: async (url, options) => {
    requests.push({ url: String(url), options });
    return Response.json({ success: true, data: String(url).endsWith('/account') ? profile : [] });
  } });
  await client.account(new AbortController().signal);
  await client.conversations(false, new AbortController().signal);
  assert.equal(requests.every(request => request.options.credentials === 'omit'), true);
  assert.equal(requests.every(request => request.options.headers.Authorization === 'Bearer ' + token), true);
  await assert.rejects(client.bootstrap('luo', new AbortController().signal));
  assert.equal(requests[2].options.headers.Authorization, undefined);
  assert.equal(requests[2].options.credentials, 'omit');
});
