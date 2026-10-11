const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loader } = require('./load-ts.cjs');
const now = new Date();
const record = { id: 'record', languageId: 1, moduleId: 1, contributorId: 'owner', status: 'draft', consentScope: 'pending', restrictionLevel: 'internal', language: { code: 'luo' }, createdAt: now, updatedAt: now };

test('upload authorization permits owner drafts and rejects packages locked for review', async () => {
  let current = record;
  const load = loader({ '@/lib/db': { prisma: { language: { findUnique: async () => ({ id: 1 }) }, module: { findUnique: async () => ({ id: 1, code: 'songs' }) }, culturalRecord: { findUnique: async () => current } } }, '@/lib/cloudinary': { generateFolderPath: (...parts) => parts.join('/') } });
  const { authorizeMediaUpload } = load('src/lib/media-upload-auth.ts');
  const input = { languageCode: 'luo', moduleCode: 'songs', recordId: 'record', assetType: 'audio' };
  assert.equal((await authorizeMediaUpload({ user: { id: 'owner' } }, input)).record.id, 'record');
  for (const status of ['submitted', 'under_review', 'published']) {
    current = { ...record, status };
    await assert.rejects(authorizeMediaUpload({ user: { id: 'owner' } }, input), error => error.status === 409);
  }
  current = record;
  await assert.rejects(authorizeMediaUpload({ user: { id: 'other' } }, input), error => error.status === 403);
  await assert.rejects(authorizeMediaUpload({ user: { id: 'owner' } }, { ...input, assetType: 'executable' }), error => error.status === 400);
});

test('row locking rechecks current workflow stage rather than trusting earlier authorization', async () => {
  const { lockEditableRecord } = loader()('src/lib/content-workflow.ts');
  let locked = false;
  const tx = { $queryRaw: async () => { locked = true; }, culturalRecord: { findUnique: async () => { assert.equal(locked, true); return { ...record, status: 'published' }; } } };
  await assert.rejects(lockEditableRecord(tx, 'record'), error => error.status === 409);
});

test('provider failures preserve existing embeddings for forced reindexing', async () => {
  let deletions = 0;
  const load = loader({ '@/lib/db': { prisma: { culturalRecord: { findUnique: async () => ({ ...record, title: 'Title', data: { description: 'public' }, status: 'published', consentScope: 'public_excerpt', restrictionLevel: 'public', translations: [], media: [] }) }, $executeRawUnsafe: async () => { deletions++; }, $transaction: () => assert.fail('index must not be replaced before generation succeeds') } }, './gemini': { getGemini: async () => ({ getGenerativeModel: () => ({ embedContent: async () => { throw new Error('Provider unavailable'); } }) }) } });
  await assert.rejects(load('src/lib/ai/embeddings.ts').embedRecord('record', true), /Provider unavailable/);
  assert.equal(deletions, 0);
});

test('completed embeddings replace the index atomically and exclude nonpublic media', async () => {
  let query;
  let transaction = false;
  let deletes = 0;
  let inserts = 0;
  const publicRecord = { ...record, title: 'Title', data: {}, status: 'published', consentScope: 'public_excerpt', restrictionLevel: 'public', translations: [], media: [] };
  const tx = { $queryRawUnsafe: async () => [], culturalRecord: { findUnique: async () => publicRecord }, $executeRawUnsafe: async sql => { assert.equal(transaction, true); if (sql.startsWith('DELETE')) deletes++; else inserts++; } };
  const load = loader({ '@/lib/db': { prisma: { culturalRecord: { findUnique: async args => { query = args; return publicRecord; } }, $transaction: async callback => { transaction = true; return callback(tx); } } }, './gemini': { getGemini: async () => ({ getGenerativeModel: () => ({ embedContent: async () => ({ embedding: { values: Array(768).fill(0.1) } }) }) }) } });
  await load('src/lib/ai/embeddings.ts').embedRecord('record', true);
  assert.deepEqual(query.include.media.where.AND.slice(0, 2), [{ consentScope: 'public_excerpt' }, { restrictionLevel: 'public' }]);
  assert.equal(deletes, 1);
  assert.equal(inserts, 1);
});

test('persistent AI quotas reject excess requests and roll back counters', async () => {
  let rows = new Map();
  const load = loader({ '@/lib/db': { prisma: { $transaction: async callback => {
    const staged = new Map(rows);
    const result = await callback({ $queryRaw: async () => [], systemSetting: { findUnique: async ({ where }) => staged.has(where.key) ? { value: staged.get(where.key) } : null, upsert: async ({ where, update }) => { staged.set(where.key, update.value); } } });
    rows = staged;
    return result;
  } } } });
  const { assertAiQuota } = load('src/lib/ai/quota.ts');
  for (let i = 0; i < 10; i++) await assertAiQuota(new Request('http://localhost'), 'user');
  const before = [...rows];
  await assert.rejects(assertAiQuota(new Request('http://localhost'), 'user'), error => error.status === 429 && error.retryAfter > 0);
  assert.deepEqual([...rows], before);
  await assertAiQuota(new Request('http://localhost'), 'different-user');
});

test('maintenance blocks visitors and preserves authorized administrator access', async () => {
  let session = null;
  const { maintenanceMessage, assertServiceAvailable } = loader({ './settings': { getSystemSettings: async () => ({ maintenance_mode: 'on', maintenance_message: 'Scheduled maintenance' }) }, './auth': { auth: async () => session } })('src/lib/maintenance.ts');
  assert.equal(await maintenanceMessage(), 'Scheduled maintenance');
  await assert.rejects(assertServiceAvailable(), error => error.status === 503);
  session = { user: { id: 'editor', languageRoles: [{ role: 'content_editor', languageId: 1 }] } };
  assert.equal(await maintenanceMessage(), null);
  await assertServiceAvailable();
});

test('backup validation preserves bigint JSON and restores foreign-key order', () => {
  const { validateSnapshot, restorationOrder } = loader()('src/lib/backup-format.ts');
  const value = { version: '2.0', tables: { media_assets: '[{"sizeBytes":9223372036854775807}]', cultural_records: '[]', users: '[]', _prisma_migrations: '[]' }, foreignKeys: [{ table: 'media_assets', parent: 'cultural_records' }, { table: 'cultural_records', parent: 'users' }] };
  const snapshot = validateSnapshot(JSON.parse(JSON.stringify(value)));
  assert.equal(snapshot.tables.media_assets, value.tables.media_assets);
  assert.deepEqual(restorationOrder(snapshot), ['users', 'cultural_records', 'media_assets']);
  assert.throws(() => validateSnapshot({ version: '1.0', tables: {} }));
  assert.throws(() => validateSnapshot({ ...value, tables: { 'bad; DROP TABLE users': '[]' } }));
  assert.throws(() => restorationOrder({ ...value, foreignKeys: [{ table: 'users', parent: 'media_assets' }, ...value.foreignKeys] }), /circular/);
});

test('API conflict wrapper returns usable 409 and hides internal errors', async () => {
  const { withApiErrors } = loader()('src/lib/content-workflow.ts');
  const conflict = await withApiErrors(async () => { throw new Error('Content already changed.'); })();
  assert.equal(conflict.status, 409);
  const failure = await withApiErrors(async () => { throw new Error('secret database URL'); })();
  assert.equal(failure.status, 500);
  assert.equal(JSON.stringify(await failure.json()).includes('secret'), false);
});
