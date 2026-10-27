const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { NextRequest } = require('next/server');
const { loader } = require('./load-ts.cjs');
const values = { name: '  Fixture learner  ', email: 'FIXTURE@example.invalid', password: 'fixture-password', dateOfBirth: { day: 1, month: 1, year: 2000 }, interests: ['student'], languageId: 1, acceptedTerms: true };
const request = (data, origin = 'https://heritage.test') => new NextRequest('https://heritage.test/api/auth/register', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: typeof data === 'string' ? data : JSON.stringify(data) });
function registration(overrides = {}) {
  const writes = [];
  const prisma = {
    user: { findFirst: async () => null }, language: { findUnique: async () => ({ id: 1, code: 'luo', isActive: true }) },
    $transaction: async fn => fn({ user: { create: async ({ data }) => { writes.push(data); return { id: 'fixture', email: data.email, status: 'active' }; } }, consentRecord: { create: async ({ data }) => { writes.push(data); } } }), ...overrides,
  };
  const { POST } = loader({ '@/lib/db': { prisma }, bcryptjs: { hash: async password => { assert.equal(password, values.password); return 'fixture-hash'; } }, '@/lib/account-security': { assertAccountRateLimit: async () => {} }, '@/lib/settings': { getSystemSetting: async () => 'Fixture terms' } })('src/app/api/auth/register/route.ts');
  return { POST, writes };
}
test('registration creates a normalized account and consent together without assigning injected privileges', async () => {
  const { POST, writes } = registration();
  const response = await POST(request({ ...values, isSuperAdmin: true, languageRoles: [{ role: 'language_admin' }] }));
  assert.equal(response.status, 200);
  assert.equal(writes.length, 2);
  assert.equal(writes[0].email, 'fixture@example.invalid');
  assert.equal(writes[0].name, 'Fixture learner');
  assert.equal(writes[0].passwordHash, 'fixture-hash');
  assert.equal(writes[0].isSuperAdmin, undefined);
  assert.equal(writes[0].languageRoles, undefined);
  assert.equal(writes[1].consentGiven, true);
  assert.match(writes[1].notes, /sha256:/);
  assert.doesNotMatch(JSON.stringify(await response.json()), /fixture-hash|fixture-password/);
});
test('registration rejects foreign origins, malformed input, excessive bodies and missing consent before writes', async () => {
  const { POST, writes } = registration();
  assert.equal((await POST(request(values, 'https://foreign.test'))).status, 403);
  assert.equal((await POST(request('{broken'))).status, 400);
  assert.equal((await POST(request('x'.repeat(20001)))).status, 413);
  assert.equal((await POST(request({ ...values, acceptedTerms: false }))).status, 400);
  assert.equal((await POST(request({ ...values, dateOfBirth: { day: 31, month: 2, year: 2000 } }))).status, 400);
  assert.equal(writes.length, 0);
});
test('inactive and English-only communities cannot be registered as an indigenous community', async () => {
  for (const language of [null, { id: 1, code: 'luo', isActive: false }, { id: 1, code: 'eng', isActive: true }]) {
    const { POST, writes } = registration({ language: { findUnique: async () => language } });
    assert.equal((await POST(request(values))).status, 400);
    assert.equal(writes.length, 0);
  }
});
test('duplicate registration races return a usable conflict', async () => {
  const { POST } = registration({ $transaction: async () => { throw { code: 'P2002' }; } });
  const response = await POST(request(values));
  assert.equal(response.status, 409);
  assert.equal((await response.json()).error, 'Email already registered');
});
test('quick actions keep Master-only backup links out of ordinary administrator dashboards', () => {
  const Link = ({ children, ...props }) => React.createElement('a', props, children);
  const { QuickActions } = loader({ 'next/link': Link })('src/components/admin/quick-actions.tsx');
  assert.doesNotMatch(renderToStaticMarkup(React.createElement(QuickActions)), /href="\/super-admin\/backup"/);
  assert.match(renderToStaticMarkup(React.createElement(QuickActions, { canBackup: true })), /href="\/super-admin\/backup"/);
});
test('teacher and researcher dashboards expose relevant destinations and their account manual', () => {
  const { DashboardOverview } = loader()('src/components/shared/dashboard-overview.tsx');
  for (const [mode, destination] of [['teacher', '/courses'], ['researcher', '/knowledge']]) {
    const html = renderToStaticMarkup(React.createElement(DashboardOverview, { languageName: 'Dholuo', mode }));
    assert.ok(html.includes(`href="${destination}"`));
    assert.ok(html.includes('href="/help"'));
    assert.doesNotMatch(html, /href="\/(?:admin|super-admin)\//);
  }
});
