const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loader } = require('./load-ts.cjs');

for (const page of ['src/app/(public)/[lang]/page.tsx']) {
  test(`${page}: new visitors open login and signed-in accounts open the current dashboard`, async () => {
    for (const [session, destination] of [[null, '/login'], [{ user: {} }, '/login'], [{ user: { id: 'reader' } }, '/dashboard'], [{ user: { id: 'administrator', isSuperAdmin: true } }, '/dashboard']]) {
      const load = loader({
        '@/lib/auth': { auth: async () => session },
        '@/lib/db': { prisma: new Proxy({}, { get: () => assert.fail('entry routing must not fetch the retired landing content') }) },
        'next/navigation': { redirect: path => { throw Object.assign(new Error('redirect'), { destination: path }); } },
      });
      await assert.rejects(load(page).default(), error => error.destination === destination);
    }
  });
}

test('English staff assignments do not turn English into a public cultural collection', async () => {
  let query;
  const load = loader({
    'next/navigation': { redirect: () => assert.fail('active account should not redirect') },
    '@/components/layout/module-content': { ModuleContent: () => null },
    '@/lib/public-navigation': { getDefaultPublicLanguage: async () => ({ id: 1, code: 'luo', nativeName: 'Dholuo' }), getPublicModules: async () => [{ id: 3, code: 'songs', baseName: 'Songs', translations: [], _count: { fieldDefinitions: 4 } }] },
    '@/lib/auth': { auth: async () => ({ user: { id: 'administrator', languageRoles: [{ languageId: 2, languageCode: 'eng', languageName: 'English' }] } }) },
    '@/lib/db': { prisma: {
      language: { findUnique: async () => ({ id: 2 }) },
      module: { findMany: async () => [{ id: 3, code: 'songs', baseName: 'Songs', translations: [], _count: { fieldDefinitions: 4 } }] },
      culturalRecord: { findMany: async options => {
        query = options;
        return [{ id: 'song', languageId: 1, moduleId: 3, title: 'Source title', summary: 'Source summary', data: {}, createdAt: new Date('2026-01-01'), media: [], translations: [{ languageId: 2, title: 'English title', summary: 'English summary', data: {} }] }];
      } },
    } },
  });
  const element = await load('src/app/(dashboard)/dashboard/page.tsx').default({ searchParams: Promise.resolve({ module: 'songs' }) });
  assert.equal(query.where.languageId, 1);
  assert.equal(query.where.status, 'published');
  assert.match(JSON.stringify(query.select.media.where), /"consentScope":"public_excerpt"/);
  assert.equal(element.props.items[0].title, 'Source title');
  assert.equal(element.props.items[0].englishTitle, 'English title');
  assert.equal(element.props.items[0].summary, 'Source summary');
});

test('audio-visual library includes eligible media across modules without relaxing public access', async () => {
  let query;
  const load = loader({
    'next/navigation': { redirect: () => assert.fail('active account should not redirect') },
    '@/components/layout/module-content': { ModuleContent: () => null },
    '@/lib/auth': { auth: async () => ({ user: { id: 'reader', languageRoles: [{ languageId: 1, languageCode: 'luo', languageName: 'Dholuo' }] } }) },
    '@/lib/db': { prisma: {
      language: { findUnique: async () => ({ id: 2 }) },
      module: { findMany: async () => [{ id: 10, code: 'audio_visual', baseName: 'Media library', translations: [], _count: { fieldDefinitions: 0 } }] },
      culturalRecord: { findMany: async options => { query = options; return [{ id: 'story', languageId: 1, moduleId: 4, module: { code: 'oral_histories', baseName: 'Oral histories' }, title: 'Story', data: {}, createdAt: new Date('2026-01-01'), media: [{ id: 'audio', type: 'audio', url: '/api/media/audio/file' }], translations: [] }]; } },
    } },
  });
  const element = await load('src/app/(dashboard)/dashboard/page.tsx').default({ searchParams: Promise.resolve({ module: 'audio_visual' }) });
  assert.equal(query.where.moduleId, undefined);
  assert.equal(query.where.languageId, 1);
  assert.equal(query.where.status, 'published');
  assert.ok(query.where.media.some);
  assert.match(JSON.stringify(query.where.media.some), /public_excerpt/);
  assert.match(JSON.stringify(query.select.media.where), /public_excerpt/);
  assert.equal(element.props.items[0].moduleCode, 'oral_histories');
  assert.equal(element.props.canContribute, false);
});

test('the entry opens login before account creation or explicit public library browsing', () => {
  const load = loader({ 'next/navigation': { redirect: destination => { throw Object.assign(new Error('redirect'), { destination }); } } });
  assert.throws(() => load('src/app/page.tsx').default(), error => error.destination === '/login');
});
