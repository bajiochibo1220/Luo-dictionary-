const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { loader } = require('./load-ts.cjs');

const link = { NavigationLink: ({ href, children, className }) => React.createElement('a', { href, className }, children) };
const modules = ['dictionary', 'proverbs', 'riddles', 'oral_histories', 'folktales', 'songs', 'artifacts', 'heritage_sites'];

test('plain React runtimes keep session reads fresh instead of caching across callers', async () => {
  const { cacheForRender } = loader({ react: {} })('src/lib/render-cache.ts');
  let account = 'first';
  const readSession = cacheForRender(async () => account);
  assert.equal(await readSession(), 'first');
  account = 'second';
  assert.equal(await readSession(), 'second');
});

test('the compact contribution control links directly to the structured form for every public module', () => {
  const { ModuleContent } = loader({ './navigation-link': link })('src/components/layout/module-content.tsx');
  for (const moduleCode of modules) {
    const html = renderToStaticMarkup(React.createElement(ModuleContent, { title: moduleCode, baseName: moduleCode, languageName: 'Dholuo', languageCode: 'luo', languageId: 1, moduleCode, items: [] }));
    assert.equal(html.split(`href="/contribute/${moduleCode}"`).length - 1, 1);
    assert.equal(html.includes('Open contribution form'), false);
  }
});

test('modules without a configured form do not invite contributions to a dead end', () => {
  const { ModuleContent } = loader({ './navigation-link': link })('src/components/layout/module-content.tsx');
  const html = renderToStaticMarkup(React.createElement(ModuleContent, { title: 'Calendar', baseName: 'Calendar', languageName: 'Dholuo', languageCode: 'luo', languageId: 1, moduleCode: 'cultural_calendar', items: [], canContribute: false }));
  assert.equal(html.includes('href="/contribute/'), false);
  assert.equal(html.includes('Add the first'), false);
});

test('public account menus expose working destinations according to privileges', () => {
  const { AppTopbar } = loader({ react: { ...React, useState: () => [true, () => {}] }, './navigation-link': link, 'next-auth/react': { signOut: () => {} } })('src/components/layout/app-topbar.tsx');
  for (const [isAdmin, isSuperAdmin] of [[false, false], [true, false], [true, true]]) {
    const html = renderToStaticMarkup(React.createElement(AppTopbar, { userInitial: 'T', userName: 'Test', userEmail: 'test@example.test', userImage: null, isAdmin, isSuperAdmin, languageCode: 'luo', stats: { uploads: 0, approved: 0, pending: 0 } }));
    assert.ok(html.includes('href="/dashboard"'));
    assert.ok(html.includes('href="/profile"'));
    assert.equal(html.includes('href="/admin/dashboard"'), isAdmin);
    assert.equal(html.includes('href="/super-admin/dashboard"'), isSuperAdmin);
  }
});

test('admin aggregation keeps language scope and correct totals without queries per module', async () => {
  const calls = [];
  const chart = ({ data }) => React.createElement('pre', null, JSON.stringify(data));
  const stat = ({ label, value }) => React.createElement('p', null, label + ':' + value);
  const load = loader({
    '@/lib/auth': { auth: async () => ({ user: { id: 'admin', languageRoles: [{ role: 'language_admin', languageId: 1 }] } }) },
    '@/lib/admin-language': {},
    '@/components/admin/stat-card': { StatCard: stat },
    '@/components/admin/content-bar-chart': { ContentBarChart: chart },
    '@/components/admin/pending-summary': { PendingSummary: () => null },
    '@/components/admin/contributor-list': { ContributorList: () => null },
    '@/components/admin/ai-usage-card': { AiUsageCard: ({ queries, satisfactionPct }) => React.createElement('p', null, `AI:${queries}:${satisfactionPct}`) },
    '@/lib/db': { prisma: {
      module: { findMany: async () => Array.from({ length: 40 }, (_, i) => ({ id: i + 1, baseName: 'Module ' + (i + 1), translations: [] })) },
      culturalRecord: {
        groupBy: async query => { calls.push(query); return query.by.includes('moduleId') ? [{ moduleId: 1, status: 'published', _count: { _all: 5 } }, { moduleId: 1, status: 'submitted', _count: { _all: 2 } }, { moduleId: 2, status: 'draft', _count: { _all: 3 } }] : []; },
        count: async query => { assert.equal(query.where.moduleId, undefined, 'No per-module counts'); assert.deepEqual(query.where.languageId, { in: [1] }); return 0; },
      },
      language: { findFirst: async () => ({ nativeName: 'Dholuo' }) },
      mediaAsset: { count: async () => 4 },
      user: { count: async () => 7 },
      aIResponse: { aggregate: async () => ({ _avg: { latencyMs: 400 }, _count: { id: 8 } }), groupBy: async () => [{ rating: 'up', _count: { _all: 3 } }, { rating: 'down', _count: { _all: 1 } }] },
    } },
  });
  const html = renderToStaticMarkup(await load('src/app/(admin)/admin/dashboard/page.tsx').default());
  assert.ok(html.includes('Total Records:10'));
  assert.ok(html.includes('Pending Review:2'));
  assert.ok(html.includes('AI:8:75'));
  assert.ok(html.includes('Module 1'));
  assert.ok(html.includes('&quot;count&quot;:7'));
  assert.equal(calls.length, 2);
  for (const query of calls) assert.deepEqual(query.where.languageId, { in: [1] });
});
