const test = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { loader } = require('./load-ts.cjs');

function harness(extra = {}) {
  const states = []; let cursor = 0;
  const load = loader({ react: { ...React,
    useState: initial => { const index = cursor++; if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial; return [states[index], next => { states[index] = typeof next === 'function' ? next(states[index]) : next; }]; },
    useMemo: fn => fn(), useEffect: () => {}, useRef: initial => { const index = cursor++; return states[index] ??= { current: initial }; },
  }, ...extra });
  return { load, render: fn => { cursor = 0; return fn(); } };
}
function find(node, predicate) {
  if (!node || typeof node !== 'object') return undefined;
  if (predicate(node)) return node;
  for (const child of React.Children.toArray(node.props?.children)) { const match = find(child, predicate); if (match) return match; }
}

test('content areas, language, status, search and pagination work together and reset to the first page', () => {
  const h = harness();
  const { useCollectionBrowser } = h.load('src/components/shared/collection-browser.tsx');
  const items = Array.from({ length: 32 }, (_, i) => ({ id: String(i), title: `Artifact ${i}`, module: 'Artifacts', language: 'Dholuo', status: i === 30 ? 'needs_edit' : 'submitted' }));
  items.push({ id: 'riddle', title: 'Riddle', module: 'Riddles', language: 'English', status: 'submitted' });
  const render = () => h.render(() => useCollectionBrowser(items));
  let view = render();
  assert.equal(view.visible.length, 25);
  find(view.pagination, node => node.type === 'button' && node.props.children.props?.source === 'Next').props.onClick();
  view = render(); assert.equal(view.visible.length, 8);
  find(view.controls, node => node.type === 'button' && node.props.children[0]?.props?.source === 'Riddles').props.onClick();
  view = render(); assert.deepEqual(view.visible.map(item => item.id), ['riddle']); assert.equal(view.pagination, false);
  find(view.controls, node => node.type === 'button' && node.props.children.props?.source === 'Clear filters').props.onClick();
  view = render();
  const selects = [];
  function visit(node) { if (!node || typeof node !== 'object') return; if (node.type === 'select') selects.push(node); React.Children.toArray(node.props?.children).forEach(visit); }
  visit(view.controls);
  selects[0].props.onChange({ target: { value: 'Dholuo' } });
  selects[1].props.onChange({ target: { value: 'needs_edit' } });
  view = render(); assert.deepEqual(view.visible.map(item => item.id), ['30']);
  find(view.controls, node => node.type === 'input').props.onChange({ target: { value: 'missing' } });
  assert.equal(render().visible.length, 0);
});

test('public categories fetch across the collection and continue within the selected category', async () => {
  const calls = [];
  const h = harness({ '@/lib/activity-events': { emitActivity() {} } });
  const { PaginatedLibrary } = h.load('src/components/shared/paginated-library.tsx');
  const initial = { title: 'Library', baseName: 'Library', moduleCode: 'all', languageCode: 'luo', languageName: 'Dholuo', languageId: 1, items: [] };
  const request = async path => { calls.push(new URL(path, 'https://test.local')); return { ...initial, items: [{ id: 'artifact', title: 'Artifact', moduleCode: 'artifacts', summary: '', media: [] }], continuation: { records: 'cursor', dictionary: null } }; };
  const render = () => h.render(() => PaginatedLibrary({ initial, request, Link: () => null }));
  let tree = render();
  let moduleView = find(tree, node => typeof node.props?.onCategoryChange === 'function');
  await moduleView.props.onCategoryChange('artifacts');
  tree = render(); moduleView = find(tree, node => typeof node.props?.onCategoryChange === 'function');
  assert.equal(moduleView.props.selectedCategory, 'artifacts');
  assert.equal(calls[0].searchParams.get('category'), 'artifacts');
  assert.equal(calls[0].searchParams.get('module'), 'audio_visual');
  const more = find(tree, node => node.type === 'button' && node.props.children.props?.source === 'Load more');
  await more.props.onClick();
  assert.equal(calls[1].searchParams.get('category'), 'artifacts');
  assert.equal(calls[1].searchParams.get('records'), 'cursor');
});

test('public category queries apply module and access restrictions before pagination', async () => {
  let query;
  const { getPublicLibrary } = loader({
    '@/lib/public-navigation': { getPublicModules: async () => [
      { id: 1, code: 'audio_visual', baseName: 'Library', _count: { fieldDefinitions: 0 } },
      { id: 2, code: 'artifacts', baseName: 'Artifacts', _count: { fieldDefinitions: 1 } },
    ] },
    '@/lib/db': { prisma: { language: { findUnique: async () => null }, culturalRecord: { findMany: async options => { query = options; return []; } } } },
  })('src/lib/public-library.ts');
  const language = { id: 1, code: 'luo', nativeName: 'Dholuo' };
  const result = await getPublicLibrary(language, 'audio_visual', { category: 'artifacts', records: 'cursor' });
  assert.equal(query.where.moduleId, 2); assert.equal(query.where.status, 'published');
  assert.ok(query.where.media.some); assert.deepEqual(query.cursor, { id: 'cursor' });
  assert.deepEqual(result.categories, [{ code: 'artifacts', name: 'Artifacts' }]);
  query = null;
  assert.equal(await getPublicLibrary(language, 'audio_visual', { category: 'unknown' }), null);
  assert.equal(query, null);
});

const editor = { user: { id: 'editor', languageRoles: [{ role: 'content_editor', languageId: 1 }] } };
const admin = { user: { id: 'admin', languageRoles: [{ role: 'language_admin', languageId: 1 }] } };
const source = { id: 'source', languageId: 1, contributorId: 'uploader', status: 'needs_edit', consentScope: 'public_excerpt', restrictionLevel: 'public', publication: { id: 'public', translations: [{ title: 'English' }], media: [{ sizeBytes: 12n }] } };
test('removing a public version requires explicit confirmation and language administrator authority', async () => {
  const calls = [];
  const tx = { $queryRaw: async () => {}, culturalRecord: { findUnique: async () => source, delete: async ({ where }) => calls.push(where.id) }, auditLog: { create: async ({ data }) => { calls.push('archive'); assert.equal(data.oldValue.publication.media[0].sizeBytes, '12'); assert.equal(data.oldValue.publication.translations[0].title, 'English'); } } };
  const { deleteUnpublishedContent } = loader({ '@/lib/db': { prisma: { $transaction: fn => fn(tx) } } })('src/lib/content-deletion.ts');
  await assert.rejects(deleteUnpublishedContent(admin, ['source']), error => error.status === 409);
  await assert.rejects(deleteUnpublishedContent(editor, ['source'], { deletePublicVersions: true }), error => error.status === 403);
  assert.deepEqual(calls, []);
  assert.equal(await deleteUnpublishedContent(admin, ['source'], { deletePublicVersions: true }), 1);
  assert.deepEqual(calls, ['archive', 'public', 'source']);
});

test('a failed archive prevents removal of either public or source versions', async () => {
  const { deleteUnpublishedContent } = loader({ '@/lib/db': { prisma: { $transaction: fn => fn({ $queryRaw: async () => {}, culturalRecord: { findUnique: async () => source, delete: async () => assert.fail('must preserve both versions') }, auditLog: { create: async () => { throw new Error('Archive unavailable'); } } }) } } })('src/lib/content-deletion.ts');
  await assert.rejects(deleteUnpublishedContent(admin, ['source'], { deletePublicVersions: true }), /Archive unavailable/);
});

test('review rows keep public availability separate and expose single and bulk deletion', () => {
  const { ReviewQueueList } = loader({ 'next/navigation': { useRouter: () => ({ refresh() {} }) } })('src/components/admin/review-queue-list.tsx');
  const html = renderToStaticMarkup(React.createElement(ReviewQueueList, { items: [{ id: 'source', title: 'Artifact', module: 'Artifacts', language: 'Dholuo', status: 'needs_edit', hasPublicVersion: true, canDelete: true }] }));
  assert.match(html, /Needs editing/); assert.match(html, /Public version available/);
  assert.match(html, /Delete selected/); assert.match(html, />Delete<\/button>/);
  assert.match(html, /aria-label="Content areas"/);
});
