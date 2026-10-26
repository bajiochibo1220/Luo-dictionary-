const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { NextRequest } = require('next/server');
const { loader } = require('./load-ts.cjs');

test('shared library applies record and media governance, bounds queries and returns only presentation fields', async () => {
  const calls = [];
  const load = loader({
    '@/lib/public-navigation': { getPublicModules: async () => [{ id: 1, code: 'dictionary', baseName: 'Dictionary', translations: [{ title: 'Muma' }], _count: { fieldDefinitions: 4 } }] },
    '@/lib/db': { prisma: {
      language: { findUnique: async () => ({ id: 2 }) },
      culturalRecord: { findMany: async query => { calls.push(query); return [{ id: 'r', title: 'Original', summary: 'Reviewed summary', languageId: 1, createdAt: new Date('2026-10-01'), module: { code: 'dictionary', baseName: 'Dictionary' }, translations: [{ languageId: 2, title: 'Translated', summary: 'Translation' }], media: [{ id: 'image', type: 'image', url: 'https://media.test/image', contributorId: 'private', storageKey: 'private' }], contributorId: 'private', sourceReference: 'private', consentRecords: ['private'] }]; } },
      dictionaryEntry: { findMany: async query => { calls.push(query); return [{ id: 'd', dholuo: 'Word', english: 'English word', pronunciation: 'Pronunciation', createdAt: new Date('2026-10-02'), media: [], contributorId: 'private' }]; } },
    } },
  });
  const result = await load('src/lib/public-library.ts').getPublicLibrary({ id: 1, code: 'luo', nativeName: 'Dholuo' }, 'dictionary');
  assert.equal(result.items[0].id, 'd');
  assert.equal(result.items[1].englishSummary, 'Translation');
  assert.equal(result.title, 'Muma');
  assert.equal(result.canContribute, true);
  assert.equal(JSON.stringify(result).includes('private'), false);
  assert.equal(calls[0].take, 50);
  assert.equal(calls[1].take, 100);
  for (const query of calls) {
    assert.equal(query.where.status, 'published');
    assert.equal(query.where.languageId, 1);
    assert.match(JSON.stringify(query.where), /public_excerpt/);
    assert.match(JSON.stringify(query.where), /restrictionLevel.*public/);
    assert.match(JSON.stringify(query.select.media.where), /public_excerpt/);
    assert.equal(query.select.contributorId, undefined);
    assert.equal(query.select.media.select.storageKey, undefined);
  }
});

test('public library rejects unavailable or chatbot modules without querying any records', async () => {
  const load = loader({
    '@/lib/public-navigation': { getPublicModules: async () => [{ code: 'chatbot' }] },
    '@/lib/db': { prisma: new Proxy({}, { get: () => assert.fail('No content query for disabled or unsupported modules') }) },
  });
  for (const moduleCode of ['disabled_module', 'chatbot']) assert.equal(await load('src/lib/public-library.ts').getPublicLibrary({ id: 1, code: 'luo', nativeName: 'Dholuo' }, moduleCode), null);
});

test('versioned library validates selections, returns a typed DTO and hides backend failures', async () => {
  const library = { title: 'Artifacts', baseName: 'Artifacts', languageName: 'Dholuo', languageCode: 'luo', languageId: 1, moduleCode: 'artifacts', canContribute: true, items: [], limits: { records: 50, dictionaryEntries: 100 }, internalKey: 'private' };
  const load = loader({
    '@/lib/db': { prisma: { language: { findFirst: async query => { assert.equal(query.where.isActive, true); return query.where.code === 'luo' ? { id: 1, code: 'luo', nativeName: 'Dholuo' } : null; } } } },
    '@/lib/public-library': { getPublicLibrary: async (_, module) => module === 'artifacts' ? library : module === 'failure' ? Promise.reject(new Error('private password')) : null },
  });
  const { GET } = load('src/app/api/v1/library/route.ts');
  const get = (params, headers) => GET(new NextRequest('https://example.test/api/v1/library?' + params, { headers }));
  const good = await get('language=LUO&module=artifacts', { origin: 'capacitor://localhost' });
  assert.equal(good.status, 200);
  assert.equal(good.headers.get('Access-Control-Allow-Origin'), 'capacitor://localhost');
  assert.equal(good.headers.get('Access-Control-Allow-Credentials'), null);
  assert.match(good.headers.get('Cache-Control'), /no-store/);
  assert.equal(JSON.stringify(await good.json()).includes('private'), false);
  assert.equal((await get('module=..%2Fadmin')).status, 400);
  assert.equal((await get('language=eng&module=artifacts')).status, 404);
  assert.equal((await get('module=unknown')).status, 404);
  const failed = await get('module=failure');
  assert.equal(failed.status, 503);
  assert.equal(JSON.stringify(await failed.json()).includes('password'), false);
});

test('public mobile CORS rejects unrelated origins and never grants credentialed access', () => {
  const { appApiHeaders } = loader()('src/lib/app-api-headers.ts');
  for (const origin of ['capacitor://localhost', 'https://localhost', 'http://localhost']) {
    const headers = appApiHeaders(origin);
    assert.equal(headers['Access-Control-Allow-Origin'], origin);
    assert.equal(headers['Access-Control-Allow-Credentials'], undefined);
  }
  for (const origin of ['null', 'https://localhost.evil.test', 'https://evil.test', null]) assert.equal(appApiHeaders(origin)['Access-Control-Allow-Origin'], undefined);
});

test('library maintenance does not query content and exposes no service internals', async () => {
  const load = loader({
    '@/lib/db': { prisma: {} },
    '@/lib/maintenance': { assertServiceAvailable: async () => { throw new Error('private maintenance setting'); } },
    '@/lib/public-library': { getPublicLibrary: async () => assert.fail('No content read during maintenance') },
  });
  const response = await load('src/app/api/v1/library/route.ts').GET(new NextRequest('https://example.test/api/v1/library?module=artifacts'));
  assert.equal(response.status, 503);
  assert.equal(JSON.stringify(await response.json()).includes('private'), false);
});

test('shared sidebar renders identical paths without a Next.js runtime and the overview has no account leakage', () => {
  const { AppSidebarView } = loader()('src/components/shared/app-sidebar-view.tsx');
  const Link = props => React.createElement('a', props);
  const html = renderToStaticMarkup(React.createElement(AppSidebarView, { modules: [{ code: 'proverbs', title: 'Ngero', baseName: 'Proverbs' }, { code: 'chatbot', title: 'Chat', baseName: 'Chatbot' }], pathname: '/dashboard', activeModule: 'proverbs', Link }));
  assert.ok(html.includes('href="/dashboard?module=proverbs"'));
  assert.ok(html.includes('href="/chatbot"'));
  assert.ok(html.includes('href="/dashboard"'));
  const { DashboardOverview } = loader()('src/components/shared/dashboard-overview.tsx');
  assert.ok(renderToStaticMarkup(React.createElement(DashboardOverview, { languageName: 'Dholuo', name: 'George Example' })).includes('Welcome, George'));
});
