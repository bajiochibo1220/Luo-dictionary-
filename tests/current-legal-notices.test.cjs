const test = require('node:test');
const assert = require('node:assert/strict');
const { loader } = require('./load-ts.cjs');

test('updated policies preserve institutional text and do not duplicate feature notices', () => {
  const { currentLegalContent, DEFAULT_TERMS, DEFAULT_PRIVACY } = loader()('src/lib/legal-content.ts');
  for (const [key, fallback] of [['terms_content', DEFAULT_TERMS], ['privacy_content', DEFAULT_PRIVACY]]) {
    const custom = '# Institution policy\n\nContact: our institution. Existing rights remain.';
    const resolved = currentLegalContent(key, custom);
    assert.ok(resolved.startsWith(custom));
    assert.match(resolved, /30 October 2026/);
    assert.match(resolved, /CULTURAL HERITAGE/);
    assert.equal(currentLegalContent(key, resolved), resolved);
    assert.equal(currentLegalContent(key, fallback), fallback);
    assert.equal((resolved.match(/## \d+\. Current platform features and controls/g) || []).length, 1);
  }
  assert.equal(currentLegalContent('unrelated_setting', 'unchanged'), 'unchanged');
});

test('public notices and registration use identical resolved stored legal settings', async () => {
  const { currentLegalContent } = loader()('src/lib/legal-content.ts');
  const rows = [
    { key: 'terms_content', value: '# Custom terms\nInstitutional rights.' },
    { key: 'privacy_content', value: '# Custom privacy\nInstitutional contact.' },
    { key: 'site_name', value: 'Institution library' },
  ];
  const { getSystemSettings, getSystemSetting } = loader({
    '@/lib/db': { prisma: { $queryRaw: async () => rows } },
  })('src/lib/settings.ts');
  const settings = await getSystemSettings({ fresh: true });
  for (const row of rows) {
    assert.equal(settings[row.key], currentLegalContent(row.key, row.value));
    assert.equal(await getSystemSetting(row.key), settings[row.key]);
  }
});
