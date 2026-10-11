const { test } = require('node:test');
const assert = require('node:assert/strict');
const { NextRequest } = require('next/server');
const { loader } = require('./load-ts.cjs');
const ordinary = { user: { id: 'reader', languageRoles: [] } };
const master = { user: { id: 'master', isSuperAdmin: true, isMasterSuperAdmin: true, languageRoles: [] } };
const published = { status: 'published', languageId: 1, contributorId: 'owner', consentScope: 'public_excerpt', restrictionLevel: 'public', embargoUntil: null };
const governance = loader()('src/lib/governance.ts');

test('public media requires a published parent and public consent on both objects', () => {
  const asset = { ...published };
  assert.equal(governance.canReadMedia(null, asset, published), true);
  for (const status of ['draft', 'submitted', 'under_review', 'needs_edit', 'curated', 'rejected']) {
    assert.equal(governance.canReadMedia(null, asset, { ...published, status }), false, status);
    assert.equal(governance.canReadMedia(ordinary.user, asset, { ...published, status }), false, status);
  }
  assert.equal(governance.canReadMedia(null, asset, null), false);
  assert.equal(governance.canReadMedia(null, { ...asset, consentScope: 'pending' }, published), false);
  assert.equal(governance.canReadMedia(null, asset, { ...published, restrictionLevel: 'sacred' }), false);
  assert.equal(governance.canReadMedia(null, asset, { ...published, embargoUntil: new Date(Date.now() + 60000) }), false);
});

test('owners can preview their pending files but other contributors cannot', () => {
  const parent = { ...published, status: 'draft', consentScope: 'pending', restrictionLevel: 'internal' };
  assert.equal(governance.canReadMedia({ id: 'owner' }, parent, parent), true);
  assert.equal(governance.canReadMedia(ordinary.user, parent, parent), false);
});

test('review access respects language and sacred restrictions', () => {
  const editor = { id: 'editor', languageRoles: [{ role: 'content_editor', languageId: 1 }] };
  const record = { ...published, status: 'submitted', consentScope: 'pending', restrictionLevel: 'internal' };
  assert.equal(governance.canReadRecord(editor, record), true);
  assert.equal(governance.canReadRecord(editor, { ...record, languageId: 2 }), false);
  assert.equal(governance.canReadRecord(editor, { ...record, restrictionLevel: 'sacred' }), false);
  assert.equal(governance.canReadRecord(master.user, { ...record, restrictionLevel: 'sacred' }), true);
});

test('every staff role can open the public dashboard without being redirected', async () => {
  for (const token of [master.user, { id: 'super', isSuperAdmin: true }, ...['language_admin', 'uploader', 'publisher', 'content_editor', 'cultural_expert'].map(role => ({ id: role, languageRoles: [{ role, languageId: 1 }] }))]) {
    const { middleware } = loader({ 'next-auth/jwt': { getToken: async () => token } })('src/middleware.ts');
    const response = await middleware(new NextRequest('http://localhost/dashboard'));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('location'), null);
    assert.equal(response.headers.get('x-middleware-next'), '1');
  }
});

test('ordinary accounts cannot enter either administrative dashboard', async () => {
  const { middleware } = loader({ 'next-auth/jwt': { getToken: async () => ordinary.user } })('src/middleware.ts');
  for (const route of ['/admin/dashboard', '/super-admin/dashboard']) assert.equal((await middleware(new NextRequest('http://localhost' + route))).headers.get('location'), 'http://localhost/dashboard');
});

test('unauthenticated protected API returns JSON 401 instead of an HTML login redirect', async () => {
  const { middleware } = loader({ 'next-auth/jwt': { getToken: async () => null } })('src/middleware.ts');
  const response = await middleware(new NextRequest('http://localhost/api/users'));
  assert.equal(response.status, 401);
  assert.equal((await response.json()).error, 'Unauthorized');
});

test('stale administrator JWT can reach login for fresh account verification', async () => {
  const { middleware } = loader({ 'next-auth/jwt': { getToken: async () => master.user } })('src/middleware.ts');
  const response = await middleware(new NextRequest('http://localhost/login'));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('location'), null);
});

test('ordinary accounts cannot list users or read another account', async () => {
  const load = loader({ '@/lib/auth': { auth: async () => ordinary }, '@/lib/db': { prisma: { user: { findMany: () => assert.fail('database must not be queried'), findFirst: () => assert.fail('database must not be queried') } } }, '@/lib/audit': { logAction: async () => {} } });
  assert.equal((await load('src/app/api/users/route.ts').GET(new NextRequest('http://localhost/api/users'))).status, 403);
  assert.equal((await load('src/app/api/users/[id]/route.ts').GET(new NextRequest('http://localhost/api/users/other'), { params: { id: 'other' } })).status, 403);
});

test('own profile remains readable and management queries keep their language scope', async () => {
  let query;
  const load = loader({ '@/lib/auth': { auth: async () => ordinary }, '@/lib/db': { prisma: { user: { findFirst: async input => { query = input; return { id: 'reader' }; } } } }, '@/lib/audit': { logAction: async () => {} } });
  assert.equal((await load('src/app/api/users/[id]/route.ts').GET(new NextRequest('http://localhost/api/users/me'), { params: { id: 'me' } })).status, 200);
  assert.deepEqual(query.where, { id: 'reader' });
  const permissions = loader()('src/lib/permissions.ts');
  assert.deepEqual(permissions.userManagementWhere({ user: { id: 'admin', languageRoles: [{ role: 'language_admin', languageId: 2 }, { role: 'teacher', languageId: 3 }] } }), { languageRoles: { some: { languageId: { in: [2] } } } });
});

test('media file route rejects anonymous draft access and permits public legacy delivery', async () => {
  let parent = { ...published, status: 'draft' };
  const asset = { id: 'media', languageId: 1, consentScope: 'public_excerpt', restrictionLevel: 'public', deliveryType: 'upload', url: 'https://example.test/file.jpg' };
  const load = loader({ '@/lib/auth': { auth: async () => null }, '@/lib/db': { prisma: { mediaAsset: { findUnique: async () => ({ ...asset, record: parent, dictionary: null }) } } }, '@/lib/cloudinary': {}, '@/lib/audit': { logAction: async () => {} } });
  const { GET } = load('src/app/api/media/[id]/file/route.ts');
  assert.equal((await GET(new NextRequest('http://localhost/api/media/media/file'), { params: { id: 'media' } })).status, 404);
  parent = published;
  assert.equal((await GET(new NextRequest('http://localhost/api/media/media/file'), { params: { id: 'media' } })).headers.get('location'), asset.url);
});

test('media metadata serializes database BigInt sizes', async () => {
  const load = loader({ '@/lib/auth': { auth: async () => null }, '@/lib/db': { prisma: { mediaAsset: { findUnique: async () => ({ ...published, id: 'media', sizeBytes: 42n, record: published }) } } }, '@/lib/cloudinary': {} });
  const response = await load('src/app/api/media/[id]/route.ts').GET(new NextRequest('http://localhost/api/media/media'), { params: { id: 'media' } });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).data.sizeBytes, 42);
});

test('authenticated media serves active documents as downloads and never caches permissions', async () => {
  const originalFetch = global.fetch;
  try {
    global.fetch = async () => new Response('<html>unsafe document</html>', { headers: { 'content-type': 'text/html' } });
    const load = loader({ '@/lib/auth': { auth: async () => null }, '@/lib/db': { prisma: { mediaAsset: { findUnique: async () => ({ ...published, id: 'media', assetId: 'file', format: 'html', deliveryType: 'authenticated', record: published }) } } }, '@/lib/cloudinary': { configureCloudinary: async () => {}, cloudinary: { utils: { private_download_url: () => 'https://example.test/document' } } }, '@/lib/audit': {} });
    const response = await load('src/app/api/media/[id]/file/route.ts').GET(new NextRequest('http://localhost/api/media/media/file'), { params: Promise.resolve({ id: 'media' }) });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'application/octet-stream');
    assert.equal(response.headers.get('content-disposition'), 'attachment; filename="file.html"');
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  } finally { global.fetch = originalFetch; }
});

test('JWT refresh revokes suspended, deleted, and unverifiable accounts', async () => {
  for (const result of [null, { status: 'suspended' }, new Error('offline')]) {
    let config;
    const load = loader({ 'next-auth': options => { config = options; return {}; }, 'next-auth/providers/credentials': options => options, 'next-auth/providers/google': options => options, '@auth/prisma-adapter': { PrismaAdapter: () => ({}) }, 'next/headers': { cookies: () => ({ get: () => null }) }, '@/lib/db': { prisma: { user: { findUnique: async () => { if (result instanceof Error) throw result; return result; } } } } });
    load('src/lib/auth.ts');
    assert.equal(await config.callbacks.jwt({ token: { id: 'stale', isSuperAdmin: true, languageRoles: [{ role: 'language_admin', languageId: 1 }] } }), null);
  }
});

test('active JWT refresh replaces stale privilege claims with database roles', async () => {
  let config;
  loader({ 'next-auth': options => { config = options; return {}; }, 'next-auth/providers/credentials': options => options, 'next-auth/providers/google': options => options, '@auth/prisma-adapter': { PrismaAdapter: () => ({}) }, 'next/headers': {}, '@/lib/db': { prisma: { user: { findUnique: async () => ({ status: 'active', isSuperAdmin: false, isMasterSuperAdmin: false, languageRoles: [] }) } } } })('src/lib/auth.ts');
  const token = await config.callbacks.jwt({ token: { id: 'reader', isSuperAdmin: true } });
  assert.equal(token.isSuperAdmin, false);
  assert.deepEqual(token.languageRoles, []);
});

test('Google account linking retains the stable provider identifier and normalizes profile fields', () => {
  let config;
  loader({ 'next-auth': options => { config = options; return {}; }, 'next-auth/providers/credentials': options => options, 'next-auth/providers/google': options => options, '@auth/prisma-adapter': { PrismaAdapter: () => ({}) }, 'next/headers': {}, '@/lib/db': { prisma: {} } })('src/lib/auth.ts');
  const profile = config.providers[0].profile({ sub: 'stable-google-id', name: 'Example', email: ' Example@Example.test ', picture: 'https://example.test/avatar.png', email_verified: true });
  assert.deepEqual(profile, { id: 'stable-google-id', name: 'Example', email: 'example@example.test', image: 'https://example.test/avatar.png' });
});

test('bulk release prevents contributors publishing their own work', async () => {
  const record = { ...published, id: 'r', status: 'under_review', moduleId: 1, contributorId: 'master', validatorId: 'reviewer', language: { code: 'eng' }, module: { code: 'songs' }, transcripts: [], translations: [] };
  const load = loader({ '@/lib/auth': { auth: async () => master }, '@/lib/db': { prisma: { language: { findUnique: async () => null }, culturalRecord: { findMany: async () => [record] }, $transaction: () => assert.fail('must reject before writes') } }, '@/lib/audit': {}, '@/lib/ai/gemini': {}, '@/lib/ai/embeddings': {} });
  const response = await load('src/app/api/content/bulk-publish/route.ts').POST(new NextRequest('http://localhost/api/content/bulk-publish', { method: 'POST', body: JSON.stringify({ recordIds: ['r'] }) }));
  assert.equal(response.status, 403);
});
