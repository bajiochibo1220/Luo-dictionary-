// Read-only comparison of complete published conversations and the reader DTO.
require('dotenv').config({ quiet: true });
const fs = require('node:fs');
const { PrismaClient } = require('@prisma/client');
const { loader } = require('../tests/load-ts.cjs');
const client = new PrismaClient();
const reads = new Set(['findFirst', 'findUnique', 'findMany', 'count', 'groupBy', 'aggregate']);
const prisma = client.$extends({ query: { $allModels: { $allOperations({ operation, args, query }) { if (!reads.has(operation)) throw new Error('Read-only audit refused a write'); return query(args); } } } });
async function main() {
  const load = loader({ '@/lib/db': { prisma } });
  const { publicRecordWhere, publicGovernanceWhere } = load('src/lib/governance.ts');
  const { getPublicReading } = load('src/lib/public-reading.ts');
  const records = await prisma.culturalRecord.findMany({ where: { ...publicRecordWhere(), module: { code: 'oral_histories' } }, select: { id: true, title: true, transcripts: { where: publicGovernanceWhere(), select: { id: true, text: true } } } });
  const checks = [];
  for (const record of records) {
    const reading = await getPublicReading(record.id);
    const expected = record.transcripts.filter(item => item.text.trim());
    const complete = !!reading && reading.transcripts.length === expected.length && expected.every(item => reading.transcripts.some(part => part.id === item.id && part.text === item.text));
    const safeProjection = !!reading && reading.transcripts.every(item => Object.keys(item).every(key => ['id', 'text', 'languageCode', 'role'].includes(key)));
    checks.push({ id: record.id, title: record.title, pass: complete && safeProjection, expectedSegments: expected.length, readableSegments: reading?.transcripts.length || 0, characters: reading?.transcripts.reduce((total, item) => total + item.text.length, 0) || 0, englishAvailable: !!reading?.englishText || !!reading?.transcripts.some(item => item.languageCode === 'eng') });
  }
  const privateRecord = await prisma.culturalRecord.findFirst({ where: { status: { not: 'published' }, module: { code: 'oral_histories' } }, select: { id: true } });
  const privateDenied = !privateRecord || await getPublicReading(privateRecord.id) === null;
  fs.writeFileSync('docs/system-audit/reader-live-2026-10-29.json', JSON.stringify({ checkedAt: new Date().toISOString(), databaseWrites: 0, privateDenied, checks }, null, 2));
  console.log(JSON.stringify({ publishedConversations: checks.length, passed: checks.filter(item => item.pass).length, readableSegments: checks.reduce((total, item) => total + item.readableSegments, 0), englishAvailable: checks.filter(item => item.englishAvailable).length, privateDenied }));
  if (!privateDenied || checks.some(item => !item.pass)) process.exitCode = 1;
}
main().catch(error => { console.error(error.code || error.name); process.exitCode = 1; }).finally(() => client.$disconnect());
