require('dotenv').config({ quiet: true });
const { PrismaClient } = require('@prisma/client');
const fs = require('node:fs');
const db = new PrismaClient();
async function main() {
  const records = await db.culturalRecord.findMany({ where: { module: { code: 'oral_histories' } }, select: { id: true, title: true, status: true, consentScope: true, restrictionLevel: true, data: true, translations: { select: { language: { select: { code: true } }, data: true, summary: true } }, transcripts: { select: { languageCode: true, consentScope: true, restrictionLevel: true, text: true, speakerRole: true } } } });
  const report = records.map(record => ({ id: record.id, title: record.title, status: record.status, consent: record.consentScope, restriction: record.restrictionLevel, dataKeys: Object.keys(record.data || {}), embeddedTranscriptCharacters: typeof record.data?.transcript === 'string' ? record.data.transcript.length : 0, translations: record.translations.map(item => ({ code: item.language.code, keys: Object.keys(item.data || {}), characters: JSON.stringify(item.data).length, summaryCharacters: item.summary?.length || 0 })), transcripts: Object.entries(record.transcripts.reduce((result, item) => { const key = [item.languageCode, item.consentScope, item.restrictionLevel].join('/'); result[key] ||= { segments: 0, characters: 0, speakerRoles: 0 }; result[key].segments++; result[key].characters += item.text.length; if (item.speakerRole) result[key].speakerRoles++; return result; }, {})).map(([scope, counts]) => ({ scope, ...counts })) }));
  fs.writeFileSync('docs/system-audit/oral-history-data-2026-10-29.json', JSON.stringify({ checkedAt: new Date().toISOString(), databaseWrites: 0, records: report }, null, 2));
  console.log(JSON.stringify({ records: report.length, sample: report.filter(item => /HOM_002|NYA_007/.test(item.title)), transcriptScopes: [...new Set(report.flatMap(item => item.transcripts.map(row => row.scope)))] }));
}
main().catch(error => { console.error(error.code || error.name); process.exitCode = 1; }).finally(() => db.$disconnect());
