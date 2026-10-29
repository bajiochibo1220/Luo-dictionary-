// Real configured-provider checks; no saved chats, analytics or database writes.
require('dotenv').config({ quiet: true });
const fs = require('node:fs');
const { PrismaClient } = require('@prisma/client');
const { loader } = require('../tests/load-ts.cjs');
const client = new PrismaClient();
const reads = new Set(['findFirst', 'findUnique', 'findMany', 'count', 'aggregate', 'groupBy']);
const prisma = client.$extends({ query: { $allModels: { $allOperations({ operation, args, query }) { if (!reads.has(operation)) throw new Error('Read-only audit refused a write'); return query(args); } } } });
async function main() {
  const { askQuestion } = loader({ '@/lib/db': { prisma } })('src/lib/ai/rag.ts');
  const english = await prisma.language.findUnique({ where: { code: 'eng' }, select: { id: true } });
  const questions = ['Why does ice float on water? Answer in two clear sentences.', 'What are proverbs? Explain simply and give one original example.', 'Write a JavaScript function named add that adds two numbers.'];
  const checks = [];
  for (const question of questions) {
    const start = Date.now();
    try {
      const result = await askQuestion(question, english?.id);
      const pass = result.answer.trim().length > 30 && !/only (?:answer|help).{0,35}(?:Luo|database)|cannot answer.{0,35}(?:database|collection)/i.test(result.answer);
      checks.push({ question, pass, model: result.model, answer: result.answer, sources: result.sources.length, ms: Date.now() - start });
      console.log(JSON.stringify({ question, pass, model: result.model, sources: result.sources.length }));
    } catch (error) { checks.push({ question, pass: false, detail: error.constructor?.name === 'AiProviderError' ? error.message : error.code || error.name }); }
  }
  fs.writeFileSync('docs/system-audit/general-chat-live-2026-10-29.json', JSON.stringify({ checkedAt: new Date().toISOString(), databaseWrites: 0, checks }, null, 2));
  if (checks.some(check => !check.pass)) process.exitCode = 1;
}
main().catch(error => { console.error(error.code || error.name); process.exitCode = 1; }).finally(() => client.$disconnect());
