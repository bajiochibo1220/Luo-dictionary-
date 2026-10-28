const { test } = require('node:test');
const assert = require('node:assert/strict');
const { NextRequest } = require('next/server');
const { loader } = require('./load-ts.cjs');
const { moduleHref, contributionHref } = loader()('src/lib/app-navigation.ts');

const languages = [
  { id: 1, code: 'luo', name: 'Dholuo', nativeName: 'Dholuo' },
  { id: 2, code: 'eng', name: 'English', nativeName: 'English' },
];
const modules = [
  { code: 'dictionary', baseName: 'Dictionary', translations: [{ title: 'Muma' }], _count: { fieldDefinitions: 9 } },
  { code: 'audio_visual', baseName: 'Audio-Visual Library', translations: [], _count: { fieldDefinitions: 4 } },
  { code: 'chatbot', baseName: 'AI Chatbot', translations: [], _count: { fieldDefinitions: 0 } },
  { code: 'research', baseName: 'Research Portal', translations: [], _count: { fieldDefinitions: 0 } },
];

function bootstrap(overrides = {}) {
  return loader({
    '@/lib/db': { prisma: { language: { findMany: async query => {
      assert.deepEqual(query.where, { isActive: true });
      assert.deepEqual(Object.keys(query.select).sort(), ['code', 'id', 'name', 'nativeName']);
      return languages;
    } } } },
    '@/lib/public-navigation': { getPublicModules: async id => { assert.ok([1, 2].includes(id)); return modules; } },
    ...overrides,
  })('src/app/api/v1/bootstrap/route.ts').GET;
}

test('web and packaged clients use identical module and contribution destinations', () => {
  assert.equal(moduleHref(''), '/dashboard');
  assert.equal(moduleHref('chatbot'), '/chatbot');
  assert.equal(moduleHref('learning'), '/learn?section=lesson');
  for (const code of ['dictionary', 'proverbs', 'riddles', 'oral_histories', 'songs', 'artifacts', 'heritage_sites']) {
    assert.equal(moduleHref(code), '/dashboard?module=' + code);
    assert.equal(contributionHref(code), '/contribute/' + code);
  }
  assert.equal(moduleHref('custom&admin=true'), '/dashboard?module=custom%26admin%3Dtrue');
});

test('public bootstrap uses current active language/module data and omits account/provider fields', async () => {
  const response = await bootstrap()(new NextRequest('https://example.test/api/v1/bootstrap'));
  assert.equal(response.status, 200);
  assert.match(response.headers.get('Cache-Control'), /no-store/);
  const result = await response.json();
  assert.equal(result.data.apiVersion, 1);
  assert.equal(result.data.app.name, 'Luo Heritage');
  assert.equal(result.data.selectedLanguage.code, 'luo');
  assert.equal(result.data.languages.some(item => item.code === 'eng'), false);
  assert.equal(result.data.modules[0].title, 'Dictionary');
  assert.equal(result.data.modules[0].href, moduleHref('dictionary'));
  assert.equal(result.data.modules[0].contributionHref, contributionHref('dictionary'));
  for (const code of ['audio_visual', 'chatbot', 'research']) assert.equal(result.data.modules.find(item => item.code === code).contributionHref, null);
  assert.equal(JSON.stringify(result).includes('fieldDefinitions'), false);
  assert.equal(JSON.stringify(result).includes('password'), false);
  assert.equal(JSON.stringify(result).includes('user'), false);
});

test('bootstrap supports chosen languages and rejects unknown or malformed language selections', async () => {
  const get = bootstrap();
  const selected = await get(new NextRequest('https://example.test/api/v1/bootstrap?language=LUO'));
  assert.equal((await selected.json()).data.selectedLanguage.code, 'luo');
  assert.equal((await get(new NextRequest('https://example.test/api/v1/bootstrap?language=ENG'))).status, 404);
  assert.equal((await get(new NextRequest('https://example.test/api/v1/bootstrap?language=missing'))).status, 404);
  assert.equal((await get(new NextRequest('https://example.test/api/v1/bootstrap?language=..%2Fadmin'))).status, 400);
});

test('bootstrap reports temporary failure without leaking database connection details', async () => {
  const get = bootstrap({ '@/lib/db': { prisma: { language: { findMany: async () => { throw new Error('private database password'); } } } } });
  const response = await get(new NextRequest('https://example.test/api/v1/bootstrap'));
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error, 'App configuration is temporarily unavailable.');
});

test('anonymous clients can bootstrap while neighboring versioned APIs remain protected', async () => {
  const { middleware } = loader({ 'next-auth/jwt': { getToken: async () => null } })('src/middleware.ts');
  assert.equal((await middleware(new NextRequest('https://example.test/api/v1/bootstrap'))).status, 200);
  assert.equal((await middleware(new NextRequest('https://example.test/api/v1/library'))).status, 200);
  assert.equal((await middleware(new NextRequest('https://example.test/api/v1/users'))).status, 401);
});
