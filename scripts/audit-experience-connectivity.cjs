require('dotenv').config({ quiet: true });
const fs = require('node:fs');
const { PrismaClient } = require('@prisma/client');
const { loader } = require('../tests/load-ts.cjs');
const results = [];
async function database(variable) {
  if (!process.env[variable]) return;
  const url = new URL(process.env[variable]);
  url.searchParams.set('connect_timeout', '10'); url.searchParams.set('pool_timeout', '10'); url.searchParams.set('connection_limit', '1');
  const client = new PrismaClient({ datasources: { db: { url: url.href } } });
  try { await client.$queryRaw`SELECT 1`; results.push({ check: variable, pass: true }); }
  catch (error) { results.push({ check: variable, pass: false, code: error.code || error.name }); }
  finally { await client.$disconnect(); }
}
async function provider() {
  const selected = process.env.AI_TEXT_PROVIDER === 'groq' ? 'groq' : 'deepseek';
  const key = process.env[selected === 'groq' ? 'GROQ_API_KEY' : 'DEEPSEEK_API_KEY'];
  if (!key || /\.{3}|\*{3}|\u2026|\u2022/.test(key)) { results.push({ check: 'environment-ai-provider', skipped: true, reason: 'No usable environment credential; database-saved configuration is required' }); return; }
  const load = loader({ '@/lib/settings': { getSystemSetting: async () => '' } });
  for (const image of [false, true]) {
    try {
      const result = await (image ? load('src/lib/ai/multimodal.ts').generateMediaAssistance('Briefly describe this synthetic color test image.', { type: 'image', mime: 'image/png', bytes: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5gAAAABJRU5ErkJggg==', 'base64') }) : load('src/lib/ai/text-generation.ts').generateText('Reply READY only.', 'Synthetic connection test.'));
      results.push({ check: image ? 'environment-ai-vision' : 'environment-ai-text', provider: selected, pass: !!result.text, model: result.model });
    } catch (error) { results.push({ check: image ? 'environment-ai-vision' : 'environment-ai-text', provider: selected, pass: false, status: error.providerStatus || error.status || null, detail: error.constructor?.name === 'AiProviderError' ? error.message : error.name }); }
  }
}
Promise.all([database('DATABASE_URL'), database('DIRECT_URL'), provider()]).then(() => {
  fs.writeFileSync('docs/system-audit/experience-connectivity-2026-10-29.json', JSON.stringify({ databaseWrites: 0, note: 'Provider checks use environment configuration only, independent of database-saved settings.', results }, null, 2));
  results.forEach(result => console.log(JSON.stringify(result)));
}).catch(error => { console.error(error.code || error.name); process.exitCode = 1; });
