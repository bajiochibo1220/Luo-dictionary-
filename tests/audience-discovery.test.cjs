const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { NextRequest } = require('next/server');
const { loader } = require('./load-ts.cjs');
const Link = ({ href, children, ...props }) => React.createElement('a', { href, ...props }, children);

test('all PRD audiences and modules have destinations supported by the shared client', () => {
  const load = loader();
  const { AUDIENCE_PATHWAYS, MODULE_DIRECTORY } = load('src/lib/audience-pathways.ts');
  const { applicationScreenHref } = load('src/lib/app-navigation.ts');
  assert.deepEqual(AUDIENCE_PATHWAYS.map(item => item.label), ['Children', 'Youth', 'Adults', 'Schools', 'Universities', 'Researchers', 'Cultural institutions', 'Museums', 'Tourists', 'Diaspora communities', 'Linguists', 'AI researchers', 'Government cultural agencies']);
  assert.equal(MODULE_DIRECTORY.length, 15);
  for (const [label, href] of [...MODULE_DIRECTORY, ...AUDIENCE_PATHWAYS.flatMap(item => item.links)]) assert.ok(applicationScreenHref(href), `${label}: ${href}`);
  const { ExplorePathways } = load('src/components/shared/explore-pathways.tsx');
  const html = renderToStaticMarkup(React.createElement(ExplorePathways, { Link, request: async () => {}, languageCode: 'luo' }));
  assert.equal((html.match(/<option/g) || []).length, 14);
  assert.equal((html.match(/href="\/explore\?subject=/g) || []).length, 27);
});

test('sidebar groups secondary tools and collection links without duplicate destinations', () => {
  const { AppSidebarView } = loader()('src/components/shared/app-sidebar-view.tsx');
  const modules = ['dictionary', 'research', 'chatbot', 'ai_tutor', 'games', 'learning', 'cultural_calendar'].map(code => ({ code, title: code, baseName: code }));
  const html = renderToStaticMarkup(React.createElement(AppSidebarView, { modules, pathname: '/dashboard', activeModule: 'dictionary', Link }));
  assert.match(html, /<details[^>]*open=""[^>]*><summary[^>]*>Collections/);
  assert.match(html, /More &amp; settings/);
  const links = [...html.matchAll(/href="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(links).size, links.length);
  assert.ok(links.includes('/research'));
  assert.ok(links.includes('/explore'));
  assert.ok(html.indexOf('/ai-tools') > html.indexOf('More &amp; settings'));
});

test('subject discovery filters active modules, community and exact JSON classification while retaining public governance', async () => {
  let query;
  const load = loader({
    '@/lib/public-navigation': { getPublicModules: async () => [{ id: 7, code: 'oral_histories' }, { id: 8, code: 'chatbot' }] },
    '@/lib/db': { prisma: { language: { findUnique: async () => ({ id: 2 }) }, culturalRecord: { findMany: async input => { query = input; return []; } } } },
  });
  const { getPublicLibrary } = load('src/lib/public-library.ts');
  const result = await getPublicLibrary({ id: 1, code: 'luo', nativeName: 'Dholuo' }, 'subjects', { subject: 'Fishing traditions', records: 'record-next', query: 'net' });
  assert.deepEqual(query.where.moduleId, { in: [7] });
  assert.deepEqual(query.where.data, { path: ['subject_area'], equals: 'Fishing traditions' });
  assert.equal(query.where.languageId, 1);
  assert.equal(query.where.status, 'published');
  assert.match(JSON.stringify(query.where), /"consentScope":"public_excerpt"/);
  assert.match(JSON.stringify(query.where), /"restrictionLevel":"public"/);
  assert.deepEqual(query.cursor, { id: 'record-next' });
  assert.equal(query.where.OR[0].title.contains, 'net');
  assert.equal(result.subject, 'Fishing traditions');
  assert.equal(result.canContribute, false);
  assert.equal(await getPublicLibrary({ id: 1, code: 'luo', nativeName: 'Dholuo' }, 'subjects', { subject: 'invented' }), null);
});

test('invalid subject API requests fail before reading the database', async () => {
  const { GET } = loader({ '@/lib/db': { prisma: new Proxy({}, { get: () => assert.fail('No database access for invalid subject') }) } })('src/app/api/v1/library/route.ts');
  for (const suffix of ['module=subjects', 'module=subjects&subject=unknown', 'module=dictionary&subject=Riddles']) {
    const response = await GET(new NextRequest(`https://heritage.test/api/v1/library?language=luo&${suffix}`));
    assert.equal(response.status, 400);
  }
});

test('dictionary subject includes the structured dictionary without removing dictionary governance', async () => {
  let dictionaryQuery;
  const { getPublicLibrary } = loader({ '@/lib/public-navigation': { getPublicModules: async () => [{ id: 1, code: 'dictionary' }] }, '@/lib/db': { prisma: { language: { findUnique: async () => ({ id: 2 }) }, culturalRecord: { findMany: async () => [] }, dictionaryEntry: { findMany: async query => { dictionaryQuery = query; return []; } } } } })('src/lib/public-library.ts');
  await getPublicLibrary({ id: 1, code: 'luo', nativeName: 'Dholuo' }, 'subjects', { subject: 'Dholuo dictionary' });
  assert.equal(dictionaryQuery.where.languageId, 1);
  assert.equal(dictionaryQuery.where.status, 'published');
  assert.match(JSON.stringify(dictionaryQuery.where), /"consentScope":"public_excerpt"/);
});

test('disabled dictionary modules cannot be bypassed using the dictionary subject', async () => {
  const { getPublicLibrary } = loader({ '@/lib/public-navigation': { getPublicModules: async () => [] }, '@/lib/db': { prisma: { language: { findUnique: async () => ({ id: 2 }) }, culturalRecord: { findMany: async () => [] }, dictionaryEntry: { findMany: async () => assert.fail('Inactive dictionary must stay hidden') } } } })('src/lib/public-library.ts');
  const result = await getPublicLibrary({ id: 1, code: 'luo', nativeName: 'Dholuo' }, 'subjects', { subject: 'Dholuo dictionary' });
  assert.deepEqual(result.items, []);
});

test('new discovery wording is available to the translation editor', () => {
  const { defaultInterfaceCatalog } = loader()('src/lib/interface-copy.ts');
  const catalog = defaultInterfaceCatalog('luo');
  for (const key of ['Start here', 'More & settings', 'Government cultural agencies', 'Find your starting point', 'Fishing traditions']) assert.ok(catalog[key], key);
});
