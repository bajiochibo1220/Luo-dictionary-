const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { loader: sourceLoader } = require('./load-ts.cjs');
function loader(mocks = {}) {
  const db = mocks['@/lib/db'];
  if (db) mocks['@/lib/db'] = { ...db, prisma: { module: { findMany: async () => [] }, fieldDefinition: { findMany: async () => [] }, ...db.prisma } };
  return sourceLoader(mocks);
}
const editor = { user: { id: 'editor', languageRoles: [{ role: 'content_editor', languageId: 1 }] } };
const language = { id: 1, code: 'luo', isActive: true };
const record = { id: 'story', title: 'Story', status: 'needs_edit', languageId: 1, contributorId: 'uploader', consentScope: 'public_excerpt', restrictionLevel: 'public', language: { nativeName: 'Dholuo' }, module: { baseName: 'Stories' } };
const request = body => new Request('https://heritage.test/api/interface-copy', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const body = { community: 'luo', entries: [{ source: 'Home', local: 'Dala', english: 'Our home' }] };

test('each community keeps an independent local/English interface pair and missing text remains readable', () => {
  const { mergeInterfaceCatalog, translateInterfaceText } = loader()('src/lib/interface-copy.ts');
  const luo = mergeInterfaceCatalog('luo', JSON.stringify({ Home: { local: 'Dala', english: 'Luo home' } }));
  const other = mergeInterfaceCatalog('kik', JSON.stringify({ Home: { local: 'Local home', english: 'Kikuyu home' } }));
  assert.equal(translateInterfaceText(luo, 'Home', true), 'Dala');
  assert.equal(translateInterfaceText(luo, 'Home', false), 'Luo home');
  assert.equal(translateInterfaceText(other, 'Home', false), 'Kikuyu home');
  assert.equal(translateInterfaceText(other, 'Search', true), 'Search');
  assert.equal(translateInterfaceText(luo, 'An uploaded oral history', true), 'An uploaded oral history');
});

test('public interface catalog exposes only the chosen community copy, without an authenticated account', async () => {
  const { GET } = loader({ '@/lib/auth': { auth: () => assert.fail('public interface copy must not require login') }, '@/lib/db': { prisma: { language: { findUnique: async () => language } } }, '@/lib/settings': { getSystemSetting: async key => { assert.equal(key, 'interface-copy:luo'); return JSON.stringify({ Home: { local: 'Dala', english: 'Home' } }); } } })('src/app/api/interface-copy/route.ts');
  const response = await GET(new Request('https://heritage.test/api/interface-copy?community=luo'));
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.deepEqual(result.data.catalog.Home, { local: 'Dala', english: 'Home' });
  assert.deepEqual(Object.keys(result.data).sort(), ['catalog', 'community']);
  assert.equal((await GET(new Request('https://heritage.test/api/interface-copy?community=eng'))).status, 400);
});

test('interface editing rejects uploaders, unassigned editors and oversight-only super admins before writing', async () => {
  for (const user of [{ id: 'uploader', languageRoles: [{ role: 'uploader', languageId: 1 }] }, { id: 'other', languageRoles: [{ role: 'content_editor', languageId: 2 }] }, { id: 'super', isSuperAdmin: true }]) {
    const { PATCH } = loader({ '@/lib/auth': { auth: async () => ({ user }) }, '@/lib/db': { prisma: { language: { findUnique: async () => language }, $transaction: () => assert.fail('No unauthorized writes') } }, '@/lib/settings': {} })('src/app/api/interface-copy/route.ts');
    assert.equal((await PATCH(request(body))).status, 403);
  }
});

test('an assigned editor saves the paired interface copy and audit evidence in one transaction', async () => {
  let saved, audit; const calls = [];
  const tx = { $queryRaw: async () => calls.push('lock'), systemSetting: { findUnique: async () => ({ value: '{}' }), upsert: async value => { calls.push('save'); saved = value; } }, auditLog: { create: async value => { calls.push('audit'); audit = value; } } };
  const { PATCH } = loader({ '@/lib/auth': { auth: async () => editor }, '@/lib/db': { prisma: { language: { findUnique: async () => language }, $transaction: callback => callback(tx) } }, '@/lib/settings': { invalidateSettingsCache: () => calls.push('invalidate') } })('src/app/api/interface-copy/route.ts');
  assert.equal((await PATCH(request(body))).status, 200);
  assert.equal(saved.where.key, 'interface-copy:luo');
  assert.deepEqual(JSON.parse(saved.update.value).Home, { local: 'Dala', english: 'Our home' });
  assert.equal(audit.data.userId, 'editor'); assert.equal(audit.data.action, 'interface_copy.updated');
  assert.deepEqual(calls, ['lock', 'save', 'audit', 'invalidate']);
});

test('interface edits roll back when the immutable audit evidence cannot be stored', async () => {
  let committed = false;
  const tx = { $queryRaw: async () => {}, systemSetting: { findUnique: async () => null, upsert: async () => {} }, auditLog: { create: async () => { throw new Error('Audit unavailable'); } } };
  const { PATCH } = loader({ '@/lib/auth': { auth: async () => editor }, '@/lib/db': { prisma: { language: { findUnique: async () => language }, $transaction: async callback => { await callback(tx); committed = true; } } }, '@/lib/settings': { invalidateSettingsCache: () => assert.fail('Failed writes cannot invalidate as successful') } })('src/app/api/interface-copy/route.ts');
  assert.equal((await PATCH(request(body))).status, 500); assert.equal(committed, false);
});

test('interface updates reject unknown keys, empty English text and oversized batches', async () => {
  const { PATCH } = loader({ '@/lib/auth': { auth: async () => editor }, '@/lib/db': { prisma: { language: { findUnique: async () => language }, $transaction: () => assert.fail('Malformed input must not be saved') } }, '@/lib/settings': {} })('src/app/api/interface-copy/route.ts');
  for (const value of [null, { community: 'eng', entries: body.entries }, { ...body, entries: [{ source: '__proto__', local: 'x', english: 'x' }] }, { ...body, entries: [{ ...body.entries[0], english: '' }] }, { ...body, entries: Array(101).fill(body.entries[0]) }]) assert.equal((await PATCH(request(value))).status, 400);
});

test('the unified review queue includes edits in progress and restricts queries to the assigned languages', async () => {
  let where;
  const List = () => null;
  const Page = loader({ '@/lib/auth': { auth: async () => editor }, '@/components/admin/review-queue-list': { ReviewQueueList: List }, '@/lib/db': { prisma: { culturalRecord: { findMany: async query => { where = query.where; return [record]; } } } } })('src/app/(admin)/admin/validation-queue/page.tsx').default;
  const element = await Page();
  assert.deepEqual(where.languageId, { in: [1] });
  assert.ok(where.OR.some(filter => filter.status === 'needs_edit'));
  const list = React.Children.toArray(element.props.children).find(child => child.type === List);
  assert.equal(list.props.items[0].canDelete, true);
});

test('uploaders cannot open the editorial queue, and old editor bookmarks redirect to the unified queue', async () => {
  const redirect = destination => { throw Object.assign(new Error('redirect'), { destination }); };
  const load = loader({ 'next/navigation': { redirect }, '@/lib/auth': { auth: async () => ({ user: { id: 'uploader', languageRoles: [{ role: 'uploader', languageId: 1 }] } }) }, '@/lib/db': { prisma: {} } });
  await assert.rejects(load('src/app/(admin)/admin/validation-queue/page.tsx').default(), error => error.destination === '/admin/dashboard');
  assert.throws(() => load('src/app/(admin)/admin/editor-queue/page.tsx').default(), error => error.destination === '/admin/validation-queue');
});

test('sidebar duties have one editorial entry and match uploader, editor and publisher assignments', () => {
  const load = loader({ 'next/navigation': { usePathname: () => '/admin/dashboard' }, './navigation-link': { NavigationLink: ({ href, children, ...props }) => React.createElement('a', { href, ...props }, children) } });
  const { AdminSidebar } = load('src/components/layout/admin-sidebar.tsx');
  for (const role of ['uploader', 'content_editor', 'publisher', 'language_admin']) {
    const html = renderToStaticMarkup(React.createElement(AdminSidebar, { isSuperAdmin: false, roles: [{ role }] }));
    assert.doesNotMatch(html, /editor-queue/);
    assert.equal(html.includes('href="/admin/validation-queue"'), ['content_editor', 'language_admin'].includes(role));
    assert.equal(html.includes('href="/admin/review-queue"'), ['publisher', 'language_admin'].includes(role));
    assert.equal(html.includes('href="/admin/interface"'), ['content_editor', 'language_admin'].includes(role));
  }
});

test('bulk deletion archives each unique record once and rejects oversized selections', async () => {
  const deleted = [], archived = [];
  const tx = { $queryRaw: async () => {}, culturalRecord: { findUnique: async () => record, delete: async ({ where }) => deleted.push(where.id) }, auditLog: { create: async value => archived.push(value.data) } };
  const { deleteUnpublishedContent } = loader({ '@/lib/db': { prisma: { $transaction: callback => callback(tx) } } })('src/lib/content-deletion.ts');
  assert.equal(await deleteUnpublishedContent(editor, ['story', 'story']), 1);
  assert.deepEqual(deleted, ['story']); assert.equal(archived.length, 1); assert.equal(archived[0].oldValue.contributorId, 'uploader');
  await assert.rejects(deleteUnpublishedContent(editor, Array.from({ length: 101 }, (_, index) => `id${index}`)), error => error.status === 400);
});

test('oversight-only super admins cannot bypass assigned editorial deletion duties', async () => {
  const tx = { $queryRaw: async () => {}, culturalRecord: { findUnique: async () => record, delete: () => assert.fail('Unauthorized deletion') } };
  const { deleteUnpublishedContent } = loader({ '@/lib/db': { prisma: { $transaction: callback => callback(tx) } } })('src/lib/content-deletion.ts');
  await assert.rejects(deleteUnpublishedContent({ user: { id: 'super', isSuperAdmin: true } }, ['story']), error => error.status === 403);
});

test('shared workspaces show only tasks assigned in the currently selected community', () => {
  const { managementTabs } = loader()('src/components/shared/management-workspace.tsx');
  const account = { id: 'staff', languageRoles: [{ role: 'language_admin', languageId: 1 }, { role: 'uploader', languageId: 2 }] };
  assert.ok(managementTabs(account, 1).some(tab => tab.key === 'people'));
  assert.deepEqual(managementTabs(account, 2).map(tab => tab.key), ['content']);
  assert.deepEqual(managementTabs(account, 3), []);
});

test('bulk deletion leaves the entire batch unchanged when any selected item is already published', async () => {
  let committed = [];
  const { deleteUnpublishedContent } = loader({ '@/lib/db': { prisma: { $transaction: async callback => {
    const staged = [];
    const tx = { $queryRaw: async () => {}, culturalRecord: { findUnique: async ({ where }) => ({ ...record, id: where.id, status: where.id === 'z-published' ? 'published' : 'needs_edit' }), delete: async ({ where }) => staged.push(where.id) }, auditLog: { create: async () => {} } };
    const result = await callback(tx); committed = staged; return result;
  } } } })('src/lib/content-deletion.ts');
  await assert.rejects(deleteUnpublishedContent(editor, ['a-draft', 'z-published']), error => error.status === 409);
  assert.deepEqual(committed, []);
});

test('database collection titles and contribution-field labels join the paired interface catalog', async () => {
  const { getInterfaceCatalog } = loader({ '@/lib/db': { prisma: {
    module: { findMany: async query => { assert.equal(query.select.translations.where.languageId, 1); return [{ baseName: 'Dictionary', translations: [{ title: 'Muma' }] }]; } },
    fieldDefinition: { findMany: async query => { assert.equal(query.select.translations.where.languageId, 1); return [{ baseLabel: 'Meaning', translations: [{ label: 'Tiend wach' }] }]; } },
  } } })('src/lib/interface-catalog.ts');
  const catalog = await getInterfaceCatalog('luo', 1, JSON.stringify({ Meaning: { local: 'Tiend wach', english: 'Meaning in this collection' } }));
  assert.deepEqual(catalog.Dictionary, { local: 'Muma', english: 'Dictionary' });
  assert.deepEqual(catalog.Meaning, { local: 'Tiend wach', english: 'Meaning in this collection' });
});
