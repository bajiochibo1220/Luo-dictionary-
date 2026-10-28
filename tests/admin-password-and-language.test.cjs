const { test } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { loader } = require('./load-ts.cjs');

async function fixture() {
  let state = { users: { master: { id: 'master', status: 'active', isMasterSuperAdmin: true, passwordHash: await bcrypt.hash('current-master-password', 4), sessionVersion: 0 }, staff: { id: 'staff', status: 'active', isMasterSuperAdmin: false, passwordHash: 'old-hash', sessionVersion: 3 } }, sessions: ['master', 'staff'], credentials: ['master', 'staff'], audits: [] };
  let auditFailure = false;
  const db = { $transaction: async work => {
    const next = structuredClone(state);
    const result = await work({ $queryRaw: async () => [], user: {
      findUnique: async ({ where }) => next.users[where.id] || null,
      update: async ({ where, data }) => { Object.assign(next.users[where.id], { passwordHash: data.passwordHash, sessionVersion: next.users[where.id].sessionVersion + data.sessionVersion.increment }); },
    }, session: { deleteMany: async ({ where }) => { next.sessions = next.sessions.filter(id => id !== where.userId); } }, verificationToken: { deleteMany: async ({ where }) => { assert.ok(where.OR.some(condition => condition.identifier?.contains)); next.credentials = next.credentials.filter(id => !where.OR.some(condition => condition.identifier === `account-reset:${id}`)); } }, auditLog: { create: async ({ data }) => { if (auditFailure) throw Error('Audit unavailable'); next.audits.push(data); } } });
    state = next; return result;
  } };
  const service = loader({ '@/lib/db': { prisma: db } })('src/lib/admin-password.ts');
  return { service, state: () => state, failAudit: () => { auditFailure = true; } };
}

test('the master changes a staff password using a real bcrypt hash and revokes only that account', async () => {
  const context = await fixture();
  const result = await context.service.changeAdminPassword('master', 'staff', { password: 'new-staff-passphrase' });
  const state = context.state();
  assert.equal(await bcrypt.compare('new-staff-passphrase', state.users.staff.passwordHash), true);
  assert.equal(bcrypt.getRounds(state.users.staff.passwordHash), 12);
  assert.equal(state.users.staff.sessionVersion, 4);
  assert.deepEqual(state.sessions, ['master']); assert.deepEqual(state.credentials, ['master']);
  assert.equal(result.signInAgain, false);
  assert.equal(state.audits[0].action, 'admin.password_changed');
  assert.equal(JSON.stringify(state.audits).includes('passphrase'), false);
  assert.equal(JSON.stringify(state.audits).includes(state.users.staff.passwordHash), false);
});

test('a master self-change verifies the current password and requires another sign-in', async () => {
  const context = await fixture();
  await assert.rejects(context.service.changeAdminPassword('master', 'master', { password: 'new-master-passphrase', currentPassword: 'wrong-password' }), error => error.status === 400);
  assert.deepEqual(context.state().sessions, ['master', 'staff']);
  const result = await context.service.changeAdminPassword('master', 'master', { password: 'new-master-passphrase', currentPassword: 'current-master-password' });
  assert.equal(result.signInAgain, true);
  assert.equal(await bcrypt.compare('new-master-passphrase', context.state().users.master.passwordHash), true);
  assert.deepEqual(context.state().sessions, ['staff']);
});

test('fresh role revocation and suspended masters cannot change passwords', async () => {
  for (const changes of [{ isMasterSuperAdmin: false }, { status: 'suspended' }]) {
    const context = await fixture(); Object.assign(context.state().users.master, changes);
    await assert.rejects(context.service.changeAdminPassword('master', 'staff', { password: 'new-staff-passphrase' }), error => error.status === 403);
    assert.equal(context.state().users.staff.passwordHash, 'old-hash');
  }
});

test('failed auditing rolls back the password and every session change', async () => {
  const context = await fixture(); context.failAudit();
  await assert.rejects(context.service.changeAdminPassword('master', 'staff', { password: 'new-staff-passphrase' }), /Audit unavailable/);
  assert.equal(context.state().users.staff.passwordHash, 'old-hash');
  assert.equal(context.state().users.staff.sessionVersion, 3);
  assert.deepEqual(context.state().sessions, ['master', 'staff']);
});

test('password management rejects foreign origins, ordinary admins and invalid password payloads', async () => {
  let actor = null, changes = 0;
  const { POST } = loader({ '@/lib/auth': { auth: async () => actor }, '@/lib/account-security': { assertAccountRateLimit: async () => {} }, '@/lib/admin-password': { AdminPasswordSchema: loader()('src/lib/admin-password.ts').AdminPasswordSchema, changeAdminPassword: async () => { changes++; return {}; } } })('src/app/api/super-admin/admins/[id]/password/route.ts');
  const request = (body, origin = 'https://heritage.test') => new Request('https://heritage.test/api/super-admin/admins/staff/password', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const params = { params: Promise.resolve({ id: 'staff' }) };
  assert.equal((await POST(request({ password: 'valid-new-password' }), params)).status, 401);
  actor = { user: { id: 'ordinary', isSuperAdmin: true, isMasterSuperAdmin: false } };
  assert.equal((await POST(request({ password: 'valid-new-password' }), params)).status, 403);
  actor.user.isMasterSuperAdmin = true;
  assert.equal((await POST(request({ password: 'valid-new-password' }, 'https://foreign.test'), params)).status, 403);
  for (const body of [{ password: 'short' }, { password: 'x'.repeat(129) }, { password: 'valid-new-password', isSuperAdmin: true }]) assert.equal((await POST(request(body), params)).status, 400);
  assert.equal(changes, 0);
});

test('public interface sources stay English until approved translations are saved', async () => {
  const { defaultInterfaceCatalog, mergeInterfaceCatalog, translateInterfaceText } = loader()('src/lib/interface-copy.ts');
  const english = defaultInterfaceCatalog('luo');
  assert.ok(Object.values(english).every(entry => entry.local === ''));
  assert.equal(translateInterfaceText(english, 'Home', true), 'Home');
  const saved = mergeInterfaceCatalog('luo', JSON.stringify({ Home: { local: 'Dala', english: 'Home' } }));
  assert.equal(translateInterfaceText(saved, 'Home', true), 'Dala');
  assert.equal(translateInterfaceText(saved, 'Home', false), 'Home');
  assert.equal(translateInterfaceText(saved, 'Sign out', true), 'Sign out');
});

test('the chat starts uncluttered with an accessible close action and collapsed settings', () => {
  const { SharedChatInterface } = loader()('src/components/shared/chat-interface.tsx');
  const markup = renderToStaticMarkup(React.createElement(SharedChatInterface, { guest: false, request: async () => {}, BackLink: () => null, onSessionExpired: () => {}, onClose: () => {} }));
  assert.match(markup, /aria-label="Close chat"/);
  assert.match(markup, /aria-label="Open chat history"/);
  assert.doesNotMatch(markup, /<aside/);
  assert.match(markup, /Chat settings/);
  assert.doesNotMatch(markup, /<details[^>]* open/);
  assert.match(markup, /Allow AI processing for this chat/);
});

test('a master-only account creates an administrator with audited credentials and assigned duties', async () => {
  let created, audit;
  const db = { language: { findMany: async () => [{ id: 1 }] }, user: { findFirst: async () => null }, $transaction: async work => work({ user: { create: async ({ data }) => { created = data; return { id: 'new-staff', email: data.email }; } }, auditLog: { create: async ({ data }) => { audit = data; } } }) };
  const { POST } = loader({ '@/lib/auth': { auth: async () => ({ user: { id: 'master', isMasterSuperAdmin: true, isSuperAdmin: false } }) }, '@/lib/db': { prisma: db } })('src/app/api/super-admin/admins/route.ts');
  const response = await POST(new Request('https://heritage.test/api/super-admin/admins', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'CREATED@example.invalid', name: 'Created Admin', password: 'created-admin-password', role: 'content_editor', languageId: 1 }) }));
  assert.equal(response.status, 200);
  assert.equal(created.email, 'created@example.invalid');
  assert.equal(await bcrypt.compare('created-admin-password', created.passwordHash), true);
  assert.equal(created.isMasterSuperAdmin, false);
  assert.deepEqual(created.languageRoles.create, [{ languageId: 1, role: 'content_editor', assignedBy: 'master' }]);
  assert.equal(audit.action, 'admin.created');
  assert.equal(JSON.stringify(audit).includes('password'), false);
});

test('the master can edit their own name and email without losing ownership', async () => {
  let change, audit;
  const user = { id: 'master', email: 'new@example.invalid', name: 'Updated Master', status: 'active', isMasterSuperAdmin: true };
  const { PATCH } = loader({ '@/lib/auth': { auth: async () => ({ user: { id: 'master', isMasterSuperAdmin: true, isSuperAdmin: false } }) }, '@/lib/db': { prisma: { user: { findFirst: async ({ where }) => where.id === 'master' ? { isMasterSuperAdmin: true } : null }, $transaction: async work => work({ user: { update: async ({ data }) => { change = data; return user; } }, auditLog: { create: async ({ data }) => { audit = data; } } }) } } })('src/app/api/users/[id]/route.ts');
  const response = await PATCH(new Request('https://heritage.test/api/users/master', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Updated Master', email: 'NEW@example.invalid' }) }), { params: Promise.resolve({ id: 'master' }) });
  assert.equal(response.status, 200);
  assert.deepEqual(change, { name: 'Updated Master', email: 'new@example.invalid' });
  assert.equal(audit.action, 'user.profile_updated');
});

test('administrator login stays reachable for guests while account management stays private', async () => {
  const { NextRequest } = require('next/server');
  const { middleware } = loader({ 'next-auth/jwt': { getToken: async () => null } })('src/middleware.ts');
  const login = await middleware(new NextRequest('https://heritage.test/admin-login'));
  assert.equal(login.headers.get('x-middleware-next'), '1');
  const privatePage = await middleware(new NextRequest('https://heritage.test/super-admin/admins'));
  assert.match(privatePage.headers.get('location'), /\/login\?callbackUrl=/);
});

test('oversized constrained collections reject without allocating one issue per element', () => {
  const { z } = require('zod');
  const result = z.array(z.string()).max(100).safeParse(Array(20000).fill(null));
  assert.equal(result.success, false);
  assert.equal(result.error.issues.length, 1);
});

test('malformed saved interface entries fall back to English instead of crashing navigation', () => {
  const { mergeInterfaceCatalog, translateInterfaceText } = loader()('src/lib/interface-copy.ts');
  const catalog = mergeInterfaceCatalog('luo', JSON.stringify({ Home: null, Search: { local: 42, english: 'Search' } }));
  assert.equal(translateInterfaceText(catalog, 'Home', true), 'Home');
  assert.equal(translateInterfaceText(catalog, 'Search', true), 'Search');
});

test('older translation bookmarks use the same saved-approval editor as public navigation', () => {
  const Page = loader({ 'next/navigation': { redirect: destination => { throw new Error(destination); } } })('src/app/(admin)/admin/translations/page.tsx').default;
  assert.throws(() => Page(), /\/admin\/interface/);
});

test('the upgraded optional OpenAI SDK keeps the server client factory compatible without making a request', () => {
  const previous = process.env.OPENAI_API_KEY;
  try {
    process.env.OPENAI_API_KEY = 'sk-test-fixture-not-a-real-key';
    const { getOpenAI } = loader()('src/lib/ai/openai.ts');
    const client = getOpenAI();
    assert.equal(typeof client.responses.create, 'function');
    assert.equal(client, getOpenAI());
  } finally { if (previous === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = previous; }
});
