const test = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { NextRequest } = require('next/server');
const { loader } = require('./load-ts.cjs');
const Link = ({ children, ...props }) => React.createElement('a', props, children);
const item = { id: 'story', title: 'A community story', summary: 'A story shared with the community.', moduleCode: 'oral_histories', moduleName: 'Oral histories', media: [] };
const library = { title: 'Discover heritage', baseName: 'Discover heritage', moduleCode: 'discover', languageCode: 'luo', languageName: 'Dholuo', languageId: 1, canContribute: false, items: [item], categories: [{ code: 'oral_histories', name: 'Oral histories' }, { code: 'riddles', name: 'Riddles' }], limits: { records: 12, dictionaryEntries: 6 }, continuation: { records: 'story', dictionary: null } };

test('discovery includes text records and dictionary entries without requiring a media-library module', async () => {
  const queries = [];
  const { getPublicLibrary } = loader({
    '@/lib/public-navigation': { getPublicModules: async () => [{ id: 1, code: 'oral_histories', baseName: 'Oral histories' }, { id: 2, code: 'dictionary', baseName: 'Dictionary' }, { id: 3, code: 'chatbot' }] },
    '@/lib/db': { prisma: { language: { findUnique: async () => ({ id: 2 }) },
      culturalRecord: { findMany: async query => { queries.push(query); return [{ ...item, languageId: 1, createdAt: new Date('2026-10-29'), module: { code: 'oral_histories', baseName: 'Oral histories' }, translations: [], data: { story: 'Complete public story' }, contributorId: 'private-person' }]; } },
      dictionaryEntry: { findMany: async query => { queries.push(query); return [{ id: 'word', dholuo: 'Word', english: 'Meaning', media: [], createdAt: new Date('2026-10-28') }]; } },
    } },
  })('src/lib/public-library.ts');
  const result = await getPublicLibrary({ id: 1, code: 'luo', nativeName: 'Dholuo' }, 'discover');
  assert.deepEqual(queries[0].where.moduleId, { in: [1, 2] });
  assert.equal(queries[0].where.media, undefined, 'Text-only stories must appear too');
  assert.equal(queries[0].take, 12); assert.equal(queries[1].take, 6);
  for (const query of queries) { assert.equal(query.where.status, 'published'); assert.equal(query.where.languageId, 1); assert.match(JSON.stringify(query.where), /public_excerpt/); assert.match(JSON.stringify(query.select.media.where), /restrictionLevel/); }
  assert.equal(result.moduleCode, 'discover'); assert.equal(result.items.length, 2);
  assert.equal(JSON.stringify(result).includes('private-person'), false);
  assert.equal(result.canContribute, false);
});

test('discovery category requests restrict queries before pagination and cannot reveal inactive modules', async () => {
  let query;
  const { getPublicLibrary } = loader({
    '@/lib/public-navigation': { getPublicModules: async () => [{ id: 5, code: 'riddles', baseName: 'Riddles' }] },
    '@/lib/db': { prisma: { language: { findUnique: async () => null }, culturalRecord: { findMany: async options => { query = options; return []; } }, dictionaryEntry: { findMany: () => assert.fail('No dictionary query for riddles') } } },
  })('src/lib/public-library.ts');
  const language = { id: 1, code: 'luo', nativeName: 'Dholuo' };
  await getPublicLibrary(language, 'discover', { category: 'riddles', query: 'moon', records: 'cursor' });
  assert.equal(query.where.moduleId, 5); assert.equal(query.where.OR[0].title.contains, 'moon'); assert.deepEqual(query.cursor, { id: 'cursor' });
  query = null; assert.equal(await getPublicLibrary(language, 'discover', { category: 'disabled' }), null); assert.equal(query, null);
});

test('the discovery API is public and keeps presentation data within its typed response', async () => {
  const { GET } = loader({ '@/lib/auth': { auth: () => assert.fail('Browsing must not require authentication') }, '@/lib/db': { prisma: { language: { findFirst: async () => ({ id: 1, code: 'luo', nativeName: 'Dholuo' }) } } }, '@/lib/public-library': { getPublicLibrary: async (_language, code) => { assert.equal(code, 'discover'); return { ...library, privateKey: 'private' }; } } })('src/app/api/v1/library/route.ts');
  const response = await GET(new NextRequest('https://heritage.test/api/v1/library?language=luo&module=discover'));
  assert.equal(response.status, 200); assert.equal(JSON.stringify(await response.json()).includes('privateKey'), false);
});

test('mixed previews give content areas a turn while preserving every item and their order within an area', () => {
  const { mixDiscoveryItems } = loader()('src/components/shared/discovery-feed.tsx');
  const items = [{ ...item, id: 's1' }, { ...item, id: 's2' }, { ...item, id: 'r1', moduleCode: 'riddles' }, { ...item, id: 'w1', moduleCode: 'dictionary' }];
  assert.deepEqual(mixDiscoveryItems(items).map(value => value.id), ['s1', 'r1', 'w1', 's2']);
  assert.deepEqual(items.map(value => value.id), ['s1', 's2', 'r1', 'w1']);
  assert.deepEqual(mixDiscoveryItems([]), []);
});

test('first impressions show actual content before account prompts and retain full collection links', () => {
  let index = 0;
  const { DiscoveryFeed } = loader({ react: { ...React, useState: initial => { const current = index++; return [current === 4 ? library : current === 5 ? false : current === 13 ? library.categories : initial, () => {}]; } } })('src/components/shared/discovery-feed.tsx');
  const html = renderToStaticMarkup(React.createElement(DiscoveryFeed, { request: async () => {}, languageCode: 'luo', Link }));
  assert.ok(html.indexOf('A community story') < html.indexOf('Create an account'));
  assert.match(html, /Explore this item/); assert.match(html, /Browse the library/);
  assert.doesNotMatch(html, /Choose an audience|sign in to (?:view|browse)/i);
  assert.match(html, /href="\/dashboard\?module=oral_histories"/);
});

test('recordings use explicit playback controls and published-before-review labels remain visible', () => {
  const { DiscoveryCard } = loader()('src/components/shared/discovery-feed.tsx');
  const html = renderToStaticMarkup(React.createElement(DiscoveryCard, { item: { ...item, isProvisional: true, media: [{ id: 'audio', type: 'audio', url: '/api/media/audio/file' }] }, onOpen() {}, onSave() {}, saved: false, saveBusy: false, Link }));
  assert.match(html, /<audio[^>]*controls=""/); assert.doesNotMatch(html, /autoplay/i);
  assert.match(html, /Review in progress/); assert.match(html, /aria-label="Save A community story"/);
});

test('discovery retains every attached recording beside videos and exposes the native-safe item download', () => {
  const { DiscoveryCard } = loader()('src/components/shared/discovery-feed.tsx');
  const html = renderToStaticMarkup(React.createElement(DiscoveryCard, { item: { ...item, media: [{ id: 'video', type: 'video', url: '/api/media/video/file' }, { id: 'audio1', type: 'audio', url: '/api/media/audio1/file' }, { id: 'audio2', type: 'audio', url: '/api/media/audio2/file' }, { id: 'document', type: 'document', url: '/api/media/document/file' }] }, downloadOrigin: 'https://heritage.test', onOpen() {}, onSave() {}, saved: false, saveBusy: false, Link }));
  assert.equal((html.match(/<audio\b/g) || []).length, 2);
  assert.match(html, /<video[^>]*controls=""/);
  assert.match(html, /href="\/api\/media\/document\/file"/);
  assert.match(html, /href="https:\/\/heritage.test\/api\/v1\/download\?id=story&amp;kind=cultural"/);
  assert.match(html, /aria-label="Download complete item \(ZIP\)"/);
});

function harness() {
  const values = []; const effects = []; const jobs = []; let cursor = 0;
  const load = loader({ react: { ...React,
    useState(initial) { const i = cursor++; if (!(i in values)) values[i] = initial; return [values[i], next => { values[i] = typeof next === 'function' ? next(values[i]) : next; }]; },
    useRef(initial) { const i = cursor++; return values[i] ??= { current: initial }; },
    useEffect(callback, dependencies) { const i = cursor++; const previous = effects[i]; if (!previous || dependencies.some((value, j) => !Object.is(value, previous.dependencies[j]))) { jobs.push(() => { previous?.cleanup?.(); effects[i] = { dependencies, cleanup: callback() }; }); } },
  } });
  return { load, render(callback) { cursor = 0; const tree = callback(); jobs.splice(0).forEach(job => job()); return tree; } };
}
function find(node, predicate) { if (!node || typeof node !== 'object') return; if (predicate(node)) return node; for (const child of React.Children.toArray(node.props?.children)) { const found = find(child, predicate); if (found) return found; } }
const tick = () => new Promise(resolve => setImmediate(resolve));

test('guest saving prompts for an account without posting or blocking browsing', async () => {
  const h = harness(); const calls = [];
  const { DiscoveryFeed, DiscoveryCard } = h.load('src/components/shared/discovery-feed.tsx');
  const request = async (path, init) => { calls.push({ path, init }); return library; };
  const render = () => h.render(() => DiscoveryFeed({ request, languageCode: 'luo', Link }));
  render(); await tick();
  find(render(), node => node.type === DiscoveryCard).props.onSave();
  const card = find(render(), node => node.type === DiscoveryCard);
  assert.ok(card.props.joinPrompt); assert.equal(calls.length, 1); assert.equal(calls[0].init.method, undefined);
  assert.equal(card.props.item.id, 'story');
});

test('changing category cancels pagination and discards a late response from the previous category', async () => {
  const h = harness(); const calls = []; let finishMore;
  const { DiscoveryFeed, DiscoveryCard } = h.load('src/components/shared/discovery-feed.tsx');
  const request = (path, init) => {
    const params = new URL(path, 'https://heritage.test').searchParams; calls.push({ params, signal: init.signal });
    if (params.has('records')) return new Promise(resolve => { finishMore = resolve; });
    return Promise.resolve(params.get('category') === 'riddles' ? { ...library, items: [{ ...item, id: 'riddle', moduleCode: 'riddles' }], continuation: { records: null, dictionary: null } } : library);
  };
  const render = () => h.render(() => DiscoveryFeed({ request, languageCode: 'luo', Link }));
  render(); await tick();
  const more = find(render(), node => node.type === 'button' && node.props.children.props?.source === 'Discover more');
  const pending = more.props.onClick();
  find(render(), node => node.type === 'button' && node.props.children.props?.source === 'Riddles').props.onClick();
  render(); await tick();
  assert.equal(calls[1].signal.aborted, true); assert.equal(calls[1].params.get('records'), 'story');
  finishMore({ ...library, items: [{ ...item, id: 'late-old-item' }] }); await pending; await tick();
  assert.equal(find(render(), node => node.type === DiscoveryCard).props.item.id, 'riddle');
});

test('signed-in saving uses the existing saved-items API and confirms the saved state', async () => {
  const h = harness(); const calls = [];
  const { DiscoveryFeed, DiscoveryCard } = h.load('src/components/shared/discovery-feed.tsx');
  const request = async (path, init) => { calls.push({ path, init }); return path === '/api/v1/saved' ? {} : library; };
  const render = () => h.render(() => DiscoveryFeed({ request, languageCode: 'luo', signedIn: true, Link }));
  render(); await tick(); find(render(), node => node.type === DiscoveryCard).props.onSave(); await tick();
  assert.equal(calls[1].path, '/api/v1/saved'); assert.equal(calls[1].init.method, 'POST');
  assert.deepEqual(JSON.parse(calls[1].init.body), { action: 'save', kind: 'cultural', resourceId: 'story' });
  assert.equal(find(render(), node => node.type === DiscoveryCard).props.saved, true);
});

test('reader dashboards show discovery while teachers and researchers retain their assigned starting tools', async () => {
  const Discovery = () => null;
  for (const role of ['', 'teacher', 'researcher']) {
    const { default: Page } = loader({ '@/lib/auth': { auth: async () => ({ user: { id: 'reader', languageRoles: role ? [{ role, languageId: 1, languageCode: 'luo', languageName: 'Dholuo' }] : [] } }) }, '@/lib/public-navigation': { getDefaultPublicLanguage: async () => ({ id: 1, code: 'luo', nativeName: 'Dholuo' }) }, '@/components/layout/public-discovery': { PublicDiscovery: Discovery } })('src/app/(dashboard)/dashboard/page.tsx');
    const element = await Page({ searchParams: Promise.resolve({}) });
    if (!role) { assert.equal(element.type, Discovery); assert.equal(element.props.languageCode, 'luo'); }
    else assert.equal(element.props.mode, role);
  }
});

test('the shared application resolves the entry session before exposing content', () => {
  const { SharedApplication } = loader()('src/components/shared/application.tsx');
  const adapters = { featureFetch: async () => {}, featureRequest: async () => {}, apiOrigin: 'https://heritage.test', artwork: '/icons/luo-heritage-512.png', nativeSession: { isNative: false } };
  const html = renderToStaticMarkup(React.createElement(SharedApplication, { adapters }));
  assert.match(html, /Opening Luo Heritage/); assert.match(html, /role="status"/);
  assert.doesNotMatch(html, /Find your starting point|Choose an audience/);
});

test('new discovery interface wording remains editable by community translators', () => {
  const catalog = loader()('src/lib/interface-copy.ts').defaultInterfaceCatalog('luo');
  for (const source of ['Discover living heritage.', 'Browse the library', 'Explore this item', 'Discover more']) assert.ok(catalog[source], source);
});
