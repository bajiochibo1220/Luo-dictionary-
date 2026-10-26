const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loader } = require('./load-ts.cjs');
const { fixture } = require('./native-auth-fixture.cjs');
const family = 'f'.repeat(22);
const token = 'lh_native_' + family + '.' + 'a'.repeat(43);
const refreshToken = 'lh_refresh_' + family + '.' + 'r'.repeat(43);
const nextToken = 'lh_native_' + family + '.' + 'b'.repeat(43);
const nextRefresh = 'lh_refresh_' + family + '.' + 'n'.repeat(43);
const absoluteExpiry = new Date(Date.now() + 86400000).toISOString();
const validUntil = () => absoluteExpiry;
const credential = (overrides = {}) => ({ accessToken: token, refreshToken, expiresAt: new Date(Date.now() + 600000).toISOString(), refreshExpiresAt: validUntil(), ...overrides });
function disk(saved, options = {}) {
  let value = saved == null ? null : JSON.stringify(saved);
  return { read: async () => value, write: async next => { if (options.failWrites) throw new Error('Locked'); value = next; }, current: () => value && JSON.parse(value) };
}
const snapshot = (session = credential(), extra = {}) => ({ version: 1, origin: 'https://api.test', pending: null, session, revocations: [], ...extra });
const coordinator = options => loader()('src/lib/native-login-client.ts').createNativeLoginClient({ origin: 'https://api.test', openBrowser: async () => {}, ...options });

test('renewal rotates hashed credentials, keeps the user and absolute expiry, and invalidates old access', async () => {
  const f = fixture();
  const original = await f.login();
  const renewed = await f.service.refreshNativeSession({ refreshToken: original.refreshToken });
  assert.notEqual(renewed.refreshToken, original.refreshToken);
  assert.equal(renewed.refreshExpiresAt, original.refreshExpiresAt);
  assert.equal(await f.service.getNativeSessionUserId('Bearer ' + original.accessToken), null);
  assert.equal(await f.service.getNativeSessionUserId('Bearer ' + renewed.accessToken), 'existing-user');
  assert.ok([...f.grants.keys()].every(key => !key.includes(original.refreshToken) && !key.includes(renewed.refreshToken)));
});

test('replay revokes only its device family, including its latest renewal token', async () => {
  const f = fixture();
  const a = await f.login(), b = await f.login();
  const next = await f.service.refreshNativeSession({ refreshToken: a.refreshToken });
  assert.equal(await f.service.refreshNativeSession({ refreshToken: a.refreshToken }), null);
  assert.equal(await f.service.getNativeSessionUserId('Bearer ' + next.accessToken), null);
  assert.equal(await f.service.refreshNativeSession({ refreshToken: next.refreshToken }), null);
  assert.equal(await f.service.getNativeSessionUserId('Bearer ' + b.accessToken), 'existing-user');
});

test('access cannot extend past absolute renewal expiry, and invalid family pairs are rejected', async () => {
  const f = fixture();
  const original = await f.login();
  [...f.grants.values()][0].expires = new Date(Date.now() + 45000);
  const value = await f.service.refreshNativeSession({ refreshToken: original.refreshToken });
  assert.equal(value.expiresAt, value.refreshExpiresAt);
  const { NativeSessionSchema } = loader()('src/lib/native-auth-contract.ts');
  assert.equal(NativeSessionSchema.safeParse(value).success, true);
  assert.equal(NativeSessionSchema.safeParse({ ...value, refreshToken: 'lh_refresh_' + 'z'.repeat(22) + '.' + 'k'.repeat(43) }).success, false);
  assert.equal(NativeSessionSchema.safeParse({ ...value, expiresAt: new Date(Date.now() + 86400000).toISOString() }).success, false);
});

test('refresh expiry and suspended/deleted users revoke the device family', async () => {
  for (const condition of ['expired', 'suspended', 'deleted']) {
    const f = fixture();
    const value = await f.login();
    if (condition === 'expired') [...f.grants.values()][0].expires = new Date(Date.now() - 1);
    else f.account.status = condition;
    assert.equal(await f.service.refreshNativeSession({ refreshToken: value.refreshToken }), null);
    assert.equal(await f.service.getNativeSessionUserId('Bearer ' + value.accessToken), null);
  }
});

test('sign-out can revoke an expired access session using renewal proof, but a forged family ID cannot revoke it', async () => {
  const f = fixture();
  const value = await f.login();
  const name = value.refreshToken.split('.')[0];
  await f.service.revokeNativeSession(null, { refreshToken: name + '.' + 'x'.repeat(43) });
  assert.equal(await f.service.getNativeSessionUserId('Bearer ' + value.accessToken), 'existing-user');
  [...f.sessions.values()][0].expires = new Date(Date.now() - 1);
  await f.service.revokeNativeSession(null, { refreshToken: value.refreshToken });
  assert.equal(await f.service.refreshNativeSession({ refreshToken: value.refreshToken }), null);
});

test('protected restore binds credentials to the backend and rejects expired or malformed state', async () => {
  const storage = disk(snapshot());
  const client = coordinator({ storage });
  await client.initialize();
  assert.equal(client.accessToken(), token);
  for (const saved of [snapshot(credential(), { origin: 'https://other.test' }), snapshot(credential({ expiresAt: 'invalid' })), snapshot(credential({ expiresAt: new Date(0).toISOString(), refreshExpiresAt: new Date(0).toISOString() }))]) {
    const client = coordinator({ storage: disk(saved) });
    await client.initialize(); assert.equal(client.accessToken(), null);
  }
});

test('PKCE state survives a process restart and is consumed before exchanging, without exposing tokens to the browser', async () => {
  const storage = disk(null);
  let opened, payload;
  await coordinator({ storage, openBrowser: async value => { opened = new URL(value); } }).start();
  const original = storage.current().pending;
  const restart = coordinator({ storage, fetch: async (_url, request) => {
    assert.equal(storage.current().pending, null);
    payload = JSON.parse(request.body);
    return Response.json({ success: true, data: credential() });
  } });
  await restart.acceptCallback('org.jooust.luoheritage.dev://auth/callback?' + new URLSearchParams({ code: 'c'.repeat(43), state: original.state }));
  assert.equal(payload.verifier, original.verifier);
  assert.equal(restart.accessToken(), token);
  assert.equal(storage.current().session.refreshToken, refreshToken);
  assert.equal(opened.href.includes(refreshToken), false);
  assert.equal(await restart.acceptCallback('org.jooust.luoheritage.dev://auth/callback?' + new URLSearchParams({ code: 'c'.repeat(43), state: original.state })), true);
});

test('parallel personal reads share one renewal; failed network preserves encrypted renewal for retry', async () => {
  const storage = disk(snapshot(credential({ expiresAt: new Date(Date.now() - 1000).toISOString() })));
  let calls = 0;
  const client = coordinator({ storage, fetch: async (_url, init) => {
    calls++; assert.equal(init.credentials, 'omit');
    assert.deepEqual(JSON.parse(init.body), { refreshToken });
    await new Promise(resolve => setImmediate(resolve));
    if (calls === 1) return Response.json({ success: false, error: 'Offline' }, { status: 503 });
    return Response.json({ success: true, data: credential({ accessToken: nextToken, refreshToken: nextRefresh }) });
  } });
  const first = await Promise.allSettled([client.getAccessToken(), client.getAccessToken()]);
  assert.ok(first.every(value => value.status === 'rejected'));
  assert.equal(calls, 1); assert.equal(storage.current().session.refreshToken, refreshToken);
  const next = await Promise.all([client.getAccessToken(), client.getAccessToken()]);
  assert.deepEqual(next, [nextToken, nextToken]); assert.equal(calls, 2);
  assert.equal(storage.current().session.refreshToken, nextRefresh);
});

test('server rejection clears protected identity and never falls back to a browser cookie', async () => {
  const storage = disk(snapshot(credential({ expiresAt: new Date(0).toISOString() })));
  const client = coordinator({ storage, fetch: async (_url, init) => {
    assert.equal(init.credentials, 'omit');
    return Response.json({ success: false }, { status: 401 });
  } });
  await assert.rejects(client.getAccessToken());
  assert.equal(client.accessToken(), null); assert.equal(storage.current().session, null);
});

test('offline sign-out survives restart as revocation only and completes on reconnection', async () => {
  const storage = disk(snapshot());
  const client = coordinator({ storage, fetch: async () => Response.json({}, { status: 503 }) });
  await assert.rejects(client.signOut(), /Reconnect/);
  assert.equal(storage.current().session, null); assert.equal(storage.current().revocations.length, 1);
  let calls = 0;
  const restart = coordinator({ storage, fetch: async (url, init) => {
    calls++; assert.ok(String(url).endsWith('/revoke'));
    assert.equal(JSON.parse(init.body).refreshToken, refreshToken);
    return Response.json({ success: true });
  } });
  await restart.resume(); assert.equal(calls, 1); assert.equal(restart.accessToken(), null);
  assert.deepEqual(storage.current().revocations, []);
});

test('sign-out during renewal cannot restore memory or protected credentials', async () => {
  const storage = disk(snapshot(credential({ expiresAt: new Date(0).toISOString() })));
  let finish, revoked = [];
  const client = coordinator({ storage, fetch: async (url, init) => {
    if (String(url).endsWith('/revoke')) { revoked.push(JSON.parse(init.body).refreshToken); return Response.json({ success: true }); }
    return new Promise(resolve => { finish = resolve; });
  } });
  const renewal = client.getAccessToken();
  await new Promise(resolve => setImmediate(resolve));
  await client.signOut();
  finish(Response.json({ success: true, data: credential({ accessToken: nextToken, refreshToken: nextRefresh }) }));
  assert.equal(await renewal, null); assert.equal(client.accessToken(), null); assert.equal(storage.current().session, null);
  assert.deepEqual(revoked, [refreshToken, nextRefresh]);
});

test('an unavailable secure store fails closed and cannot open sign-in or keep renewed credentials', async () => {
  const storage = disk(null, { failWrites: true });
  const client = coordinator({ storage, openBrowser: () => assert.fail('Must not launch before protected PKCE is saved') });
  await assert.rejects(client.start(), /Locked/);
  const renewalStorage = disk(snapshot(credential({ expiresAt: new Date(0).toISOString() })));
  let revoked = false;
  const renewed = coordinator({ storage: renewalStorage, fetch: async url => {
    if (String(url).endsWith('/revoke')) { revoked = true; return Response.json({ success: true }); }
    renewalStorage.write = async () => { throw new Error('Locked'); };
    return Response.json({ success: true, data: credential({ accessToken: nextToken, refreshToken: nextRefresh }) });
  } });
  await assert.rejects(renewed.getAccessToken(), /Protected login storage/);
  assert.equal(renewed.accessToken(), null); assert.equal(revoked, true);
});

test('simultaneous storage/network sign-out failure does not claim durable logout', async () => {
  const storage = disk(snapshot());
  const client = coordinator({ storage, fetch: async () => Response.json({}, { status: 503 }) });
  await client.initialize();
  storage.write = async () => { throw new Error('Disk unavailable'); };
  await assert.rejects(client.signOut(), /Sign-out could not be saved.*before closing/);
  assert.equal(client.accessToken(), null);
  assert.equal(storage.current().session.accessToken, token, 'Persist failure must be acknowledged, not falsely presented as a saved logout');
});

test('renewal endpoint rejects identity injection and hides backend errors', async () => {
  const { POST } = loader({ '@/lib/native-auth': { refreshNativeSession: async () => { throw new Error('private connection'); } } })('src/app/api/v1/native/refresh/route.ts');
  const request = body => new Request('https://api.test/api/v1/native/refresh', { method: 'POST', body: JSON.stringify(body) });
  assert.equal((await POST(request({ refreshToken, userId: 'someone-else' }))).status, 400);
  const response = await POST(request({ refreshToken }));
  assert.equal(response.status, 503); assert.equal(JSON.stringify(await response.json()).includes('private connection'), false);
});

test('middleware delegates only exact native renewal/revocation routes to bearer-aware handlers', async () => {
  const { NextRequest } = require('next/server');
  const { middleware } = loader({ '@/lib/auth': { auth: async () => null } })('src/middleware.ts');
  for (const endpoint of ['/api/v1/native/refresh', '/api/v1/native/revoke']) {
    assert.equal((await middleware(new NextRequest('https://api.test' + endpoint))).status, 200);
  }
  for (const endpoint of ['/api/v1/native/refresh/other', '/api/v1/native/refresh-admin']) {
    assert.equal((await middleware(new NextRequest('https://api.test' + endpoint))).status, 401);
  }
});

test('both iOS launch paths use the protected-storage bridge and Swift sources belong to the build target', () => {
  const fs = require('node:fs');
  const base = 'clients/mobile/ios/App/';
  const project = fs.readFileSync(base + 'App.xcodeproj/project.pbxproj', 'utf8');
  assert.match(fs.readFileSync(base + 'App/SceneDelegate.swift', 'utf8'), /rootViewController = HeritageViewController\(\)/);
  assert.match(fs.readFileSync(base + 'App/Base.lproj/Main.storyboard', 'utf8'), /customClass="HeritageViewController"/);
  assert.match(fs.readFileSync(base + 'App/HeritageViewController.swift', 'utf8'), /registerPluginInstance\(SecureAuthStoragePlugin\(\)\)/);
  const sources = project.split('/* Begin PBXSourcesBuildPhase section */')[1].split('/* End PBXSourcesBuildPhase section */')[0];
  for (const file of ['HeritageViewController.swift', 'SecureAuthStoragePlugin.swift']) {
    assert.ok(fs.existsSync(base + 'App/' + file));
    assert.ok(sources.includes(file + ' in Sources'));
  }
});
