const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { loader } = require('./load-ts.cjs');
const master = { user: { id: 'master', isMasterSuperAdmin: true, isSuperAdmin: false, languageRoles: [] } };

test('master and super-admin roles always override saved public-library return locations', async () => {
  for (const user of [master.user, { id: 'super', isSuperAdmin: true }]) {
    const { GET } = loader({ '@/lib/auth': { auth: async () => ({ user }) } })('src/app/auth/continue/route.ts');
    for (const target of ['/application', '/application#/dashboard?module=dictionary', '/application#/chatbot?conversation=example']) {
      const response = await GET(new Request(`https://heritage.test/auth/continue?${new URLSearchParams({ returnTo: target })}`));
      assert.equal(response.headers.get('location'), 'https://heritage.test/super-admin/dashboard');
    }
  }
});

test('all assigned staff roles open the admin workspace while public profile interests grant no admin access', () => {
  const { loginDestination } = loader()('src/lib/login-destination.ts');
  for (const role of ['language_admin', 'content_editor', 'publisher', 'uploader']) assert.equal(loginDestination({ user: { id: 'staff', languageRoles: [{ role, languageId: 1 }] } }, '/application'), '/admin/dashboard');
  for (const role of ['student', 'teacher', 'researcher', 'elder', 'contributor']) assert.equal(loginDestination({ user: { id: 'reader', profileTypes: ['admin'], languageRoles: [{ role, languageId: 1 }] } }), '/dashboard');
  assert.equal(loginDestination(null), '/login');
  assert.equal(loginDestination({ user: { isMasterSuperAdmin: true } }), '/login');
});

test('public readers retain their collection return and unsafe destinations cannot redirect outside the app', async () => {
  const { GET } = loader({ '@/lib/auth': { auth: async () => ({ user: { id: 'reader' } }) } })('src/app/auth/continue/route.ts');
  const valid = '/application#/dashboard?module=songs';
  assert.equal((await GET(new Request(`https://heritage.test/auth/continue?${new URLSearchParams({ returnTo: valid })}`))).headers.get('location'), `https://heritage.test${valid}`);
  for (const target of ['https://evil.test', '//evil.test', '/super-admin/dashboard', '/application?next=https://evil.test', '/application#//evil.test', '/application#/\\evil', '/application#/\n']) {
    assert.equal((await GET(new Request(`https://heritage.test/auth/continue?${new URLSearchParams({ returnTo: target })}`))).headers.get('location'), 'https://heritage.test/dashboard');
  }
});

test('fresh server-role lookup failure never silently routes an administrator to the public dashboard', async () => {
  const { GET } = loader({ '@/lib/auth': { auth: async () => { throw new Error('Session service unavailable'); } } })('src/app/auth/continue/route.ts');
  await assert.rejects(GET(new Request('https://heritage.test/auth/continue')), /Session service unavailable/);
});

test('a remembered public location is passed through server authorization once and then cleared', () => {
  const oldStorage = globalThis.sessionStorage;
  const disk = new Map([['application-return', '/application#/dashboard?module=songs']]);
  globalThis.sessionStorage = { getItem: key => disk.get(key), removeItem: key => disk.delete(key) };
  try {
    const { authenticationContinueTarget } = loader()('src/lib/application-return.ts');
    assert.equal(new URL(authenticationContinueTarget(), 'https://heritage.test').searchParams.get('returnTo'), '/application#/dashboard?module=songs');
    assert.equal(authenticationContinueTarget(), '/auth/continue');
    assert.equal(disk.has('application-return'), false);
  } finally { globalThis.sessionStorage = oldStorage; }
});

function find(element, predicate) {
  if (!element || typeof element !== 'object') return;
  if (predicate(element)) return element;
  for (const child of React.Children.toArray(element.props?.children)) { const found = find(child, predicate); if (found) return found; }
}

test('the real credentials form sends a master signing in from the public library through role routing', async () => {
  const previous = { storage: globalThis.sessionStorage, window: globalThis.window, FormData: globalThis.FormData };
  const disk = new Map([['application-return', '/application#/dashboard?module=dictionary']]);
  const destinations = [];
  globalThis.sessionStorage = { getItem: key => disk.get(key), removeItem: key => disk.delete(key) };
  globalThis.window = { location: { assign: value => destinations.push(value) } };
  globalThis.FormData = class { get(key) { return key === 'email' ? 'master@example.test' : 'fixture-password'; } };
  try {
    const load = loader({
      react: { ...React, useState: initial => [initial, () => {}] },
      'next/navigation': { useRouter: () => ({ push: () => assert.fail('Web role routing must use a fresh server navigation'), refresh: () => {} }), useSearchParams: () => new URLSearchParams() },
      'next-auth/react': { signIn: async (provider, options) => { assert.equal(provider, 'credentials'); assert.equal(options.redirect, false); return { ok: true }; } },
    });
    const element = load('src/components/forms/login-form.tsx').LoginForm();
    await find(element, node => node.type === 'form').props.onSubmit({ preventDefault() {}, currentTarget: {} });
    assert.equal(destinations.length, 1);
    assert.equal(new URL(destinations[0], 'https://heritage.test').pathname, '/auth/continue');
    const { GET } = loader({ '@/lib/auth': { auth: async () => master } })('src/app/auth/continue/route.ts');
    assert.equal((await GET(new Request(new URL(destinations[0], 'https://heritage.test')))).headers.get('location'), 'https://heritage.test/super-admin/dashboard');
    assert.equal(disk.size, 0);
  } finally { globalThis.sessionStorage = previous.storage; globalThis.window = previous.window; globalThis.FormData = previous.FormData; }
});

test('Google sign-in also delegates saved public returns to server role routing', () => {
  const previous = { storage: globalThis.sessionStorage, window: globalThis.window, document: globalThis.document };
  const disk = new Map([['application-return', '/application#/dashboard']]);
  let callback;
  globalThis.sessionStorage = { getItem: key => disk.get(key), removeItem: key => disk.delete(key) };
  globalThis.window = { location: { protocol: 'https:' } }; globalThis.document = { cookie: '' };
  try {
    const { LoginForm } = loader({ react: { ...React, useState: initial => [initial, () => {}] }, 'next/navigation': { useRouter: () => ({}), useSearchParams: () => new URLSearchParams() }, 'next-auth/react': { signIn: (provider, options) => { assert.equal(provider, 'google'); callback = options.callbackUrl; } } })('src/components/forms/login-form.tsx');
    find(LoginForm(), node => node.props?.onClick?.name === 'startGoogleLogin').props.onClick();
    assert.equal(new URL(callback, 'https://heritage.test').pathname, '/auth/continue');
  } finally { globalThis.sessionStorage = previous.storage; globalThis.window = previous.window; globalThis.document = previous.document; }
});

test('valid mobile sign-in callbacks are preserved and native staff open their embedded staff dashboard', async () => {
  const { nativeLoginDestination } = loader()('src/lib/login-destination.ts');
  assert.equal(nativeLoginDestination(master), '/workspace');
  assert.equal(nativeLoginDestination({ user: { id: 'reader' } }), '/account');
  const previous = { FormData: globalThis.FormData };
  let destination;
  const target = `/mobile-auth?challenge=${'a'.repeat(43)}&state=${'b'.repeat(32)}`;
  globalThis.FormData = class { get() { return 'fixture'; } };
  try {
    const { LoginForm } = loader({ react: { ...React, useState: initial => [initial, () => {}] }, 'next/navigation': { useRouter: () => ({ push: value => { destination = value; }, refresh() {} }), useSearchParams: () => new URLSearchParams({ callbackUrl: target }) }, 'next-auth/react': { signIn: async () => ({ ok: true }) } })('src/components/forms/login-form.tsx');
    await find(LoginForm(), node => node.type === 'form').props.onSubmit({ preventDefault() {}, currentTarget: {} });
    assert.equal(destination, target);
  } finally { globalThis.FormData = previous.FormData; }
});
