// Temporary records never commit. No existing cultural record is modified.
require('dotenv').config({ quiet: true });
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const { loader } = require('../../tests/load-ts.cjs');
async function main() {
  if (!process.argv.includes('--rollback-only')) throw new Error('Use --rollback-only.');
  const prisma = new PrismaClient();
  const rollback = new Error('ROLLBACK_DISCOVERY_FIXTURES');
  const ids = [];
  let checked = false;
  try {
    await prisma.$transaction(async tx => {
      const language = await tx.language.findFirst({ where: { isActive: true, code: { not: 'eng' } }, select: { id: true, code: true, nativeName: true } });
      const module = await tx.module.findFirst({ where: { isActive: true, isStub: false, code: { notIn: ['chatbot', 'dictionary'] } }, select: { id: true } });
      assert.ok(language && module, 'An active community and collection are required.');
      const prefix = `Discovery rollback fixture ${randomUUID()}`;
      const base = { languageId: language.id, moduleId: module.id, title: prefix, tags: [], status: 'published', consentScope: 'public_excerpt', restrictionLevel: 'public', data: { subject_area: 'Fishing traditions', description: 'Test fixture only', participantName: 'PRIVATE_FIXTURE_IDENTITY' } };
      for (const overrides of [{}, { status: 'draft' }, { restrictionLevel: 'sacred' }, { embargoUntil: new Date(Date.now() + 86400000) }, { data: { subject_area: 'Traditional foods' } }]) {
        const record = await tx.culturalRecord.create({ data: { ...base, ...overrides } });
        ids.push(record.id);
      }
      const { getPublicLibrary } = loader({ '@/lib/db': { prisma: tx } })('src/lib/public-library.ts');
      const result = await getPublicLibrary(language, 'subjects', { subject: 'Fishing traditions', query: prefix });
      assert.deepEqual(result.items.map(item => item.id), [ids[0]]);
      assert.equal(result.subject, 'Fishing traditions');
      assert.equal(JSON.stringify(result).includes('PRIVATE_FIXTURE_IDENTITY'), false);
      await tx.culturalRecord.update({ where: { id: ids[0] }, data: { status: 'withdrawn' } });
      const withdrawn = await getPublicLibrary(language, 'subjects', { subject: 'Fishing traditions', query: prefix });
      assert.equal(withdrawn.items.length, 0);
      checked = true;
      throw rollback;
    }, { maxWait: 15000, timeout: 60000 }).catch(error => { if (error !== rollback) throw error; });
    assert.ok(checked);
    assert.equal(await prisma.culturalRecord.count({ where: { id: { in: ids } } }), 0);
    console.log('PASS real PostgreSQL subject filtering, draft/sacred/embargo/other-subject exclusion, private-field redaction and source withdrawal. All five fixtures rolled back; zero fixture records remain.');
  } finally { await prisma.$disconnect(); }
}
main().catch(error => { console.error(error instanceof assert.AssertionError ? error.message : 'Database discovery integration failed; fixture transaction rolled back.'); process.exitCode = 1; });
