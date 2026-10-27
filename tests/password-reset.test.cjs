const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { loader } = require('./load-ts.cjs');
const email = 'learner@example.invalid';
const request = (body, origin = 'https://heritage.test') => new Request('https://heritage.test/api/auth/password-reset', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

test('password reset normalizes email, accepts only reset actions and never exposes account existence', async () => {
  const calls = [];
  const { POST } = loader({ '@/lib/account-security': { requestPasswordResetCode: async value => calls.push(value), completePasswordResetCode: async (...values) => calls.push(values) } })('src/app/api/auth/password-reset/route.ts');
  const response = await POST(request({ action: 'request', email: ' LEARNER@example.invalid ' }));
  assert.equal(response.status, 200); assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.match((await response.json()).message, /If an active account matches/);
  assert.deepEqual(calls, [email]);
  assert.equal((await POST(request({ action: 'complete', email, code: '123456', password: 'new-password-123' }))).status, 200);
  assert.deepEqual(calls[1], [email, '123456', 'new-password-123']);
  for (const body of [{ action: 'delete', email }, { action: 'request', email, purpose: 'delete' }, { action: 'complete', email, code: '12345', password: 'new-password-123' }, { action: 'complete', email, code: '123456', password: 'short' }]) assert.equal((await POST(request(body))).status, 400);
  assert.equal((await POST(request({ action: 'request', email }, 'https://foreign.test'))).status, 403);
  assert.equal(calls.length, 2);
});

test('reset code delivery stores only a digest, replaces old codes and cleans up failed delivery', async () => {
  let stored, sent, deliveryFails = false; const deleted = [];
  const tx = { $queryRaw: async () => {}, systemSetting: { findUnique: async () => null, upsert: async () => {} }, verificationToken: { deleteMany: async query => deleted.push(query), create: async ({ data }) => { stored = data; } } };
  const { requestPasswordResetCode } = loader({ '@/lib/db': { prisma: { $transaction: async callback => callback(tx), user: { findFirst: async () => ({ id: 'owner', email }) }, verificationToken: { deleteMany: async query => deleted.push(query) } } }, '@/lib/email': { getEmailConfiguration: async () => ({}), sendSystemEmail: async (...args) => { sent = args; if (deliveryFails) throw new Error('delivery failed'); } } })('src/lib/account-security.ts');
  await requestPasswordResetCode(email);
  const code = sent[2].match(/code is: (\d{6})/)[1];
  assert.equal(stored.token, 'reset-code:' + createHash('sha256').update(`${email}:${code}`).digest('hex'));
  assert.equal(stored.identifier, 'account-reset:owner');
  assert.ok(stored.expires > Date.now() + 9 * 60000 && stored.expires <= Date.now() + 10 * 60000);
  assert.equal(deleted[0].where.identifier, 'account-reset:owner');
  deliveryFails = true; await assert.rejects(requestPasswordResetCode(email), /delivery failed/);
  assert.equal(deleted.at(-1).where.token, stored.token);
});

test('reset code completion rate limits guesses, consumes once and revokes existing sessions', async () => {
  let consumed = false, updated = false, revoked = false; const limits = [];
  const key = 'reset-code:' + createHash('sha256').update(`${email}:123456`).digest('hex');
  const tx = { $queryRaw: async () => {}, systemSetting: { findUnique: async ({ where }) => { limits.push(where.key); return null; }, upsert: async () => {} }, verificationToken: { findUnique: async ({ where }) => { assert.equal(where.token, key); return consumed ? null : { identifier: 'account-reset:owner', expires: new Date(Date.now() + 60000) }; }, deleteMany: async ({ where }) => { if (where.token) { consumed = true; return { count: 1 }; } return { count: 1 }; } }, user: { updateMany: async ({ data }) => { assert.equal(data.passwordHash, 'hash'); assert.deepEqual(data.sessionVersion, { increment: 1 }); updated = true; return { count: 1 }; } }, session: { deleteMany: async () => { revoked = true; } }, auditLog: { create: async () => {} } };
  const { completePasswordResetCode } = loader({ bcryptjs: { hash: async () => 'hash' }, '@/lib/db': { prisma: { $transaction: async callback => callback(tx) } } })('src/lib/account-security.ts');
  await completePasswordResetCode(email, '123456', 'new-password-123');
  assert.ok(consumed && updated && revoked); assert.match(limits[0], /reset-code-check/);
  await assert.rejects(completePasswordResetCode(email, '123456', 'new-password-123'), error => error.status === 400);
});

test('forgot password and legacy recovery show only the password reset task', () => {
  const Link = ({ children, ...props }) => React.createElement('a', props, children);
  const load = loader({ 'next/link': Link, 'next/navigation': { useSearchParams: () => new URLSearchParams() } });
  for (const Component of [load('src/components/forms/password-reset-form.tsx').PasswordResetForm, load('src/components/forms/account-recovery-form.tsx').AccountRecoveryForm]) {
    const html = renderToStaticMarkup(React.createElement(Component));
    assert.match(html, /Send reset code/); assert.match(html, /type="email"/);
    assert.doesNotMatch(html, /Delete account|Verify email|href="\/login"|href="\/register"|<select/);
  }
});

test('expired or wrong reset codes and exhausted attempt limits never change the password', async () => {
  for (const row of [null, { identifier: 'account-reset:owner', expires: new Date(0) }, { identifier: 'account-delete:owner', expires: new Date(Date.now() + 60000) }]) {
    const tx = { $queryRaw: async () => {}, systemSetting: { findUnique: async () => null, upsert: async () => {} }, verificationToken: { findUnique: async () => row }, user: { updateMany: () => assert.fail('Invalid codes must never write') } };
    const { completePasswordResetCode } = loader({ bcryptjs: { hash: async () => 'hash' }, '@/lib/db': { prisma: { $transaction: async callback => callback(tx) } } })('src/lib/account-security.ts');
    await assert.rejects(completePasswordResetCode(email, '123456', 'new-password-123'), error => error.status === 400);
  }
  const { completePasswordResetCode } = loader({ '@/lib/db': { prisma: { $transaction: async callback => callback({ $queryRaw: async () => {}, systemSetting: { findUnique: async () => ({ value: JSON.stringify({ count: 10, resetAt: Date.now() + 60000 }) }), upsert: () => assert.fail('Rate limit must stop here') } }) } } })('src/lib/account-security.ts');
  await assert.rejects(completePasswordResetCode(email, '123456', 'new-password-123'), error => error.status === 429);
});

test('Dholuo interface text retains readable, noneditable English below it and English mode has one label', () => {
  const state = { community: 'luo', local: true, t: (source, local = state.local) => local ? 'Dala' : 'Home' };
  const { InterfaceText } = loader({ react: { ...React, useContext: () => state } })('src/components/shared/interface-language.tsx');
  const html = renderToStaticMarkup(React.createElement(InterfaceText, { source: 'Home' }));
  assert.match(html, /lang="luo">Dala<\/span><span lang="en"[^>]*contenteditable="false">Home/);
  const fragment = renderToStaticMarkup(React.createElement('p', null, 'First', React.createElement(InterfaceText, { source: ' Home ' }), 'Last'));
  assert.match(fragment, /First <span/); assert.match(fragment, /<\/span> Last/);
  state.local = false;
  assert.equal(renderToStaticMarkup(React.createElement(InterfaceText, { source: 'Home' })), 'Home');
});
