// Live database checks use rollback-only probes; no content/accounts are changed.
require('dotenv').config({ quiet: true });
const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  assert.equal(await prisma.userLanguageRole.count({ where: { role: 'cultural_expert' } }), 0);
  const triggers = await prisma.$queryRaw`SELECT tgname FROM pg_trigger WHERE tgname = 'protect_deleted_content_history' AND NOT tgisinternal`;
  assert.equal(triggers.length, 1);
  for (const operation of ['update', 'delete']) {
    let protectedHistory = false;
    try {
      await prisma.$transaction(async tx => {
        const probe = await tx.auditLog.create({ data: { action: 'verification.rollback_probe', entityType: 'verification' } });
        if (operation === 'update') await tx.auditLog.update({ where: { id: probe.id }, data: { action: 'verification.changed' } });
        else await tx.auditLog.delete({ where: { id: probe.id } });
        throw new Error('Audit mutation unexpectedly succeeded');
      });
    } catch (error) { protectedHistory = /Audit history is append-only/.test(error.message); }
    assert.equal(protectedHistory, true, `${operation} must be blocked by the database`);
  }
  assert.equal(await prisma.auditLog.count({ where: { action: 'verification.rollback_probe' } }), 0);
  console.log('PASS legacy reviewer roles merged; audit update/delete rejected; verification probes rolled back.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
