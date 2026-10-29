const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { loader } = require('./load-ts.cjs');
const editor = { user: { id: 'editor', languageRoles: [{ languageId: 1, role: 'content_editor' }] } };

test('editors review and edit their assigned community while publishing remains separately assigned', () => {
  const permissions = loader()('src/lib/permissions.ts');
  assert.equal(permissions.canValidateCulture(editor, 1), true);
  assert.equal(permissions.canEditContent(editor, 1), true);
  assert.equal(permissions.canFinalizeContent(editor, 1), false);
  assert.equal(permissions.canValidateCulture(editor, 2), false);
});

test('deleting a queued upload archives both versions, media and review history before removal', async () => {
  const calls = [];
  const record = { id: 'record', title: 'Wrong upload', languageId: 1, contributorId: 'uploader', status: 'submitted', consentScope: 'public_excerpt', restrictionLevel: 'public', translations: [{ title: 'English version' }], reviews: [{ reviewerId: 'editor' }], versions: [{ version: 1 }], media: [{ sizeBytes: 123n }] };
  const tx = { $queryRaw: async () => calls.push('lock'), culturalRecord: { findUnique: async () => record, delete: async () => calls.push('delete') }, auditLog: { create: async ({ data }) => { calls.push('archive'); assert.equal(data.userId, 'editor'); assert.equal(data.oldValue.contributorId, 'uploader'); assert.equal(data.oldValue.translations[0].title, 'English version'); assert.equal(data.oldValue.media[0].sizeBytes, '123'); assert.equal(data.oldValue.versions.length, 1); } } };
  const { deleteUnpublishedContent } = loader({ '@/lib/db': { prisma: { $transaction: fn => fn(tx) } } })('src/lib/content-deletion.ts');
  assert.equal(await deleteUnpublishedContent(editor, ['record']), 1);
  assert.deepEqual(calls, ['lock', 'archive', 'delete']);
  record.status = 'published'; calls.length = 0;
  await assert.rejects(deleteUnpublishedContent(editor, ['record']), error => error.status === 409);
  assert.deepEqual(calls, ['lock']);
});

test('failed history storage prevents deletion and another language editor has no deletion access', async () => {
  let deleted = false;
  const record = { id: 'record', languageId: 1, status: 'submitted', consentScope: 'public_excerpt', restrictionLevel: 'public' };
  const tx = { $queryRaw: async () => {}, culturalRecord: { findUnique: async () => record, delete: async () => { deleted = true; } }, auditLog: { create: async () => { throw new Error('History unavailable'); } } };
  const { deleteUnpublishedContent } = loader({ '@/lib/db': { prisma: { $transaction: fn => fn(tx) } } })('src/lib/content-deletion.ts');
  await assert.rejects(deleteUnpublishedContent(editor, ['record']), /History unavailable/);
  assert.equal(deleted, false);
  await assert.rejects(deleteUnpublishedContent({ user: { id: 'other', languageRoles: [{ languageId: 2, role: 'content_editor' }] } }, ['record']), error => [403, 404].includes(error.status));
  assert.equal(deleted, false);
});

test('collection search belongs inside the sticky toolbar and empty state has one contribution action', () => {
  const { PaginatedLibrary } = loader()('src/components/shared/paginated-library.tsx');
  const Link = ({ href, children, className }) => React.createElement('a', { href, className }, children);
  const html = renderToStaticMarkup(React.createElement(PaginatedLibrary, { initial: { title: 'Muma', baseName: 'Dictionary', languageName: 'Dholuo', languageCode: 'luo', languageId: 1, moduleCode: 'dictionary', items: [] }, request: async () => {}, Link }));
  assert.ok(html.indexOf('data-sticky-controls') < html.indexOf('role="search"'));
  assert.equal(html.split('href="/contribute/dictionary"').length - 1, 1);
  assert.match(html, /aria-label="Content language"/);
  assert.match(html, /<option value="eng">English<\/option>/);
  assert.match(html, /data-bottom-controls/);
});

test('English view displays the paired English title and downloadable full text', () => {
  const actual = React.useState;
  const load = loader({ react: { ...React, useState: initial => actual(initial === 'luo' ? 'eng' : initial) } });
  const { ModuleContentView } = load('src/components/shared/module-content-view.tsx');
  const Link = ({ href, children }) => React.createElement('a', { href }, children);
  const html = renderToStaticMarkup(React.createElement(ModuleContentView, { title: 'Stories', baseName: 'Stories', languageName: 'Dholuo', languageCode: 'luo', languageId: 1, moduleCode: 'folktales', items: [{ id: 'story', title: 'Local title', englishTitle: 'English title', summary: 'Local summary', englishSummary: 'English summary', englishBodyText: 'The complete English story', media: [{ id: 'audio', type: 'audio', url: '/api/media/audio/file' }] }], Link }));
  assert.match(html, /<h3[^>]*title="English title"/);
  assert.match(html, /download=1/);
  assert.match(html, /The%20complete%20English%20story/);
});

test('public branding exposes approved presentation fields without exposing service settings', async () => {
  const { GET } = loader({ '@/lib/settings': { getSystemSettings: async () => ({ jooust_logo_url: 'https://example.test/logo.png', nrf_logo_url: '', jooust_color: '#123456', nrf_color: '#654321', cloudinary_api_secret: 'private', smtp_password: 'private' }) } })('src/app/api/branding/route.ts');
  const response = await GET(new Request('https://example.test/api/branding'));
  const result = await response.json();
  assert.deepEqual(Object.keys(result.data).sort(), ['jooust_color', 'jooust_logo_url']);
  assert.equal(JSON.stringify(result).includes('private'), false);
});

test('editors cannot change institutional logos', async () => {
  const { POST } = loader({ '@/lib/auth': { auth: async () => editor }, '@/lib/cloudinary': {}, '@/lib/settings': {}, '@/lib/audit': {} })('src/app/api/super-admin/branding/route.ts');
  assert.equal((await POST(new Request('https://example.test/api/super-admin/branding', { method: 'POST' }))).status, 403);
});

test('institution logo uploads reject active files and persist approved image references', async () => {
  let uploads = 0, saved;
  const { POST } = loader({ '@/lib/auth': { auth: async () => ({ user: { id: 'master', isMasterSuperAdmin: true } }) }, '@/lib/cloudinary': { uploadToCloudinary: async (_bytes, folder, options) => { uploads++; assert.equal(folder, 'luolinguaai/branding'); assert.equal(options.deliveryType, 'upload'); return { url: 'https://res.cloudinary.com/test/logo.png', publicId: 'test/logo' }; } }, '@/lib/settings': { setSystemSetting: async (key, url) => { saved = { key, url }; } }, '@/lib/audit': { logAction: async () => {} } })('src/app/api/super-admin/branding/route.ts');
  function upload(bytes, type) { const form = new FormData(); form.set('partner', 'jooust'); form.set('file', new File([bytes], 'logo.png', { type })); return new Request('https://example.test/api/super-admin/branding', { method: 'POST', body: form }); }
  assert.equal((await POST(upload('<svg onload="alert(1)"></svg>', 'image/svg+xml'))).status, 400);
  assert.equal(uploads, 0);
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5gAAAABJRU5ErkJggg==', 'base64');
  assert.equal((await POST(upload(png, 'image/png'))).status, 200);
  assert.equal(uploads, 1);
  assert.deepEqual(saved, { key: 'jooust_logo_url', url: 'https://res.cloudinary.com/test/logo.png' });
});

test('an editor cannot send an edited community record for publishing without its English version', async () => {
  const { POST } = loader({ '@/lib/auth': { auth: async () => editor }, '@/lib/db': { prisma: { language: { findUnique: async () => ({ id: 2 }) }, culturalRecord: { findUnique: async () => ({ id: 'record', languageId: 1, contributorId: 'uploader', status: 'needs_edit', title: 'Original', data: { story: 'Original story' }, language: { code: 'luo' }, translations: [], consentScope: 'public_excerpt', restrictionLevel: 'public' }) }, $transaction: () => assert.fail('Incomplete translation must not enter publication review') } }, '@/lib/audit': {} })('src/app/api/content/[id]/validate/route.ts');
  const checklist = Object.fromEntries(['spelling', 'translation', 'grammar', 'pronunciation', 'examples', 'culture'].map(key => [key, true]));
  const response = await POST(new Request('https://example.test/api/content/record/validate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ checklist }) }), { params: Promise.resolve({ id: 'record' }) });
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /English version/);
});

test('administrative media uses access-checked file URLs and the transcript filter includes document attachments', async () => {
  let where;
  const Grid = () => null;
  const Filters = () => null;
  const { default: Page } = loader({
    '@/lib/auth': { auth: async () => ({ user: { id: 'admin', isSuperAdmin: true } }) },
    '@/lib/admin-language': { getSelectedAdminCultureId: async () => 1 },
    '@/components/admin/media-grid': { MediaGrid: Grid },
    '@/components/admin/media-type-filters': { MediaTypeFilters: Filters },
    '@/lib/db': { prisma: { module: { findMany: async () => [] }, mediaAsset: { findMany: async options => { where = options.where; return [{ id: 'private-image', type: 'image', url: 'https://example.test/authenticated/private.png', sizeBytes: 100n, createdAt: new Date(), language: { code: 'luo', nativeName: 'Dholuo' } }]; } } } },
  })('src/app/(admin)/admin/media/page.tsx');
  const element = await Page({ searchParams: Promise.resolve({ type: 'document' }) });
  const grid = React.Children.toArray(element.props.children).find(child => child.type === Grid);
  assert.equal(grid.props.assets[0].url, '/api/media/private-image/file');
  assert.equal(grid.props.assets[0].thumbnailUrl, '/api/media/private-image/file');
  assert.ok(where.AND.some(filter => filter.type?.in?.includes('document') && filter.type.in.includes('transcript')));
});

test('expired administrative media sessions redirect before accessing records', async () => {
  const { default: Page } = loader({ '@/lib/auth': { auth: async () => null }, '@/lib/db': { prisma: {} }, 'next/navigation': { redirect: destination => { throw Object.assign(new Error('redirect'), { destination }); } } })('src/app/(admin)/admin/media/page.tsx');
  await assert.rejects(Page({ searchParams: Promise.resolve({}) }), error => error.destination === '/login');
});

test('bottom admin media controls preserve the collection filter when selecting All', () => {
  const Link = ({ children, ...props }) => React.createElement('a', props, children);
  const { MediaTypeFilters } = loader({ '@/components/layout/navigation-link': { NavigationLink: Link } })('src/components/admin/media-type-filters.tsx');
  const html = renderToStaticMarkup(React.createElement(MediaTypeFilters, { type: 'document', moduleCode: 'songs' }));
  assert.match(html, /data-bottom-controls/);
  assert.match(html, /href="\/admin\/media\?module=songs"/);
  assert.equal((html.match(/aria-current="page"/g) || []).length, 1);
});
