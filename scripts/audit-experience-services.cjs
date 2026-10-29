// Read-only connectivity checks. Never output credentials or participant data.
require('dotenv').config({ quiet: true });
const fs = require('node:fs');
const { PrismaClient } = require('@prisma/client');
const { loader } = require('../tests/load-ts.cjs');
const client = new PrismaClient();
const readOperations = new Set(['findFirst', 'findFirstOrThrow', 'findUnique', 'findUniqueOrThrow', 'findMany', 'count', 'groupBy', 'aggregate']);
const prisma = client.$extends({ query: { $allModels: { $allOperations({ operation, args, query }) { if (!readOperations.has(operation)) throw new Error('Audit refused a database write'); return query(args); } } } });
const load = loader({ '@/lib/db': { prisma }, '@/lib/analytics': { trackEvent: async () => {} } });
const checks = [];
async function check(name, task) {
  const start = Date.now();
  try { const details = await task(); const result = { name, pass: true, ms: Date.now() - start, ...details }; checks.push(result); console.log(JSON.stringify(result)); return true; }
  catch (error) { const safeMessage = error.constructor?.name === 'AiProviderError' ? error.message : error.code || error.name; const result = { name, pass: false, ms: Date.now() - start, status: error.status || null, detail: safeMessage }; checks.push(result); console.log(JSON.stringify(result)); return false; }
}
async function main() {
  if (process.argv.includes('--retrieval-only')) {
    await check('grounded-cultural-chat', async () => {
      const language = await prisma.language.findFirst({ where: { isActive: true, code: { not: 'eng' } }, orderBy: { isDefault: 'desc' }, select: { id: true } });
      const record = await prisma.culturalRecord.findFirst({ where: { ...load('src/lib/governance.ts').publicRecordWhere(), languageId: language.id }, select: { title: true } });
      if (!record) throw new Error('No public source for retrieval check');
      const result = await load('src/lib/ai/rag.ts').askQuestion('Explain the cultural context of ' + record.title, language.id, language.id);
      if (!result.answer || !result.sources.length) throw new Error('Grounded retrieval produced no citations');
      return { model: result.model, nonempty: !!result.answer, citedSources: result.sources.length };
    });
    fs.writeFileSync('docs/system-audit/experience-grounded-ai-2026-10-29.json', JSON.stringify({ checkedAt: new Date().toISOString(), databaseWrites: 0, checks }, null, 2));
    if (checks.some(item => !item.pass)) process.exitCode = 1;
    return;
  }
  if (process.argv.includes('--vision-only')) {
    await check('configured-image-understanding', async () => {
      const result = await load('src/lib/ai/multimodal.ts').generateMediaAssistance('Briefly describe this synthetic color test image.', { type: 'image', mime: 'image/png', bytes: require('./synthetic-test-image.cjs')() });
      return { model: result.model, nonempty: !!result.text };
    });
    return;
  }
  let language;
  const connected = await check('database-public-catalog', async () => {
    language = await prisma.language.findFirst({ where: { isActive: true, code: { not: 'eng' } }, orderBy: [{ isDefault: 'desc' }, { displayOrder: 'asc' }], select: { id: true, code: true, nativeName: true } });
    if (!language) throw new Error('No active community');
    const library = await load('src/lib/public-library.ts').getPublicLibrary(language, 'discover');
    return { publishedPreviewCount: library.items.length, availableAreas: library.categories.length };
  });
  if (connected) {
    const text = await check('configured-text-provider', async () => { const result = await load('src/lib/ai/text-generation.ts').generateText('Reply with READY only.', 'This is a synthetic connectivity check.'); return { model: result.model, nonempty: !!result.text }; });
    if (text) {
      await check('cultural-chat-service', async () => { const result = await load('src/lib/ai/rag.ts').askQuestion('Hello', language.id, language.id); return { model: result.model, nonempty: !!result.answer }; });
      await check('tutor-translation-service', async () => { const result = await load('src/lib/tutor-service.ts').tutor({ mode: 'translation', languageId: language.id, text: 'Translate the English greeting hello. State any uncertainty briefly.', english: true, consent: true }, 'synthetic-read-only-audit'); return { model: result.model, nonempty: !!result.text }; });
    }
    await check('configured-image-understanding', async () => {
      const result = await load('src/lib/ai/multimodal.ts').generateMediaAssistance('Briefly describe the color in this synthetic test image. Do not identify any people.', { type: 'image', mime: 'image/png', bytes: require('./synthetic-test-image.cjs')() });
      return { model: result.model, nonempty: !!result.text };
    });
    const capabilities = await load('src/lib/ai-tools-service.ts').aiToolSources(language.id);
    checks.push({ name: 'media-tool-availability', pass: true, capabilities: capabilities.capabilities });
  }
  fs.writeFileSync('docs/system-audit/experience-live-services-2026-10-29.json', JSON.stringify({ checkedAt: new Date().toISOString(), databaseWrites: 0, checks }, null, 2));
  if (checks.some(item => !item.pass)) process.exitCode = 1;
}
main().catch(error => { console.error('Service audit could not finish:', error.code || error.name); process.exitCode = 1; }).finally(() => client.$disconnect());
