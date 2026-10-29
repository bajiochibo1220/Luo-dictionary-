const test = require('node:test');
const assert = require('node:assert/strict');
const { loader } = require('./load-ts.cjs');

function fixture({ references = false } = {}) {
  const calls = [];
  const { askQuestion } = loader({
    './provider-config': { getTextAiProvider: async () => 'deepseek' },
    './embeddings': { embedText: () => assert.fail('DeepSeek must not depend on another embedding provider') },
    './public-text-search': { searchPublicText: async () => references ? [{ record_id: 'approved', is_dictionary: false, similarity: 1 }] : [] },
    './text-generation': { generateText: async (prompt, instruction) => { calls.push({ prompt, instruction }); return { text: 'A natural model answer', model: 'deepseek-flash' }; } },
    '@/lib/db': { prisma: {
      language: { findUnique: async () => ({ nativeName: 'English' }) },
      module: { findMany: async () => [{ id: 1, code: 'proverbs', baseName: 'Proverbs' }] },
      culturalRecord: { findMany: async () => references ? [{ id: 'approved', title: 'Reviewed proverb', summary: 'Verified public example', data: {}, module: { baseName: 'Proverbs' }, media: [] }] : [] },
      dictionaryEntry: { findMany: async () => [] }, mediaAsset: { findMany: async () => [] },
    } },
  })('src/lib/ai/rag.ts');
  return { askQuestion, calls };
}

test('ordinary questions and creative examples are not mistaken for collection browsing', () => {
  const { isLibraryCatalogRequest } = loader()('src/lib/ai/rag.ts');
  for (const question of ['What are proverbs?', 'What is a dictionary in Python?', 'What makes images look blurry?', 'Give me examples of riddles', 'List songs by a famous musician', 'Explain how a database stores records', 'How do I find a library in Python?']) {
    assert.equal(isLibraryCatalogRequest(question), false, question);
  }
  for (const question of ['show all artifacts', 'List all published proverbs', 'Which stories are available?', 'What content is available in this system?', 'Find videos in the collection']) {
    assert.equal(isLibraryCatalogRequest(question), true, question);
  }
});

test('general questions use model knowledge without requiring a matching collection entry', async () => {
  const f = fixture();
  for (const question of ['Why does ice float on water?', 'Write a JavaScript function to add two numbers.', 'What are proverbs?', 'Explain Luo family traditions and note regional differences.']) {
    const answer = await f.askQuestion(question, 2);
    assert.equal(answer.answer, 'A natural model answer'); assert.deepEqual(answer.sources, []);
    const { prompt, instruction } = f.calls.at(-1);
    assert.ok(prompt.includes(question)); assert.match(prompt, /general knowledge and reasoning/);
    assert.match(instruction, /not limited to the platform database/);
    assert.doesNotMatch(prompt + instruction, /do not claim facts about.*Luo culture|answer only claims supported/);
    assert.match(prompt, /Do not mention a database search or missing sources unless/);
  }
  assert.equal(f.calls.length, 4, 'One generation per question');
});

test('references supplement knowledge and conversation follow-ups retain context', async () => {
  const f = fixture({ references: true });
  const answer = await f.askQuestion('Compare this proverb with a general example.', 2, 1, [{ role: 'user', content: 'We discussed cooperation.' }, { role: 'assistant', content: 'Working together can help.' }]);
  const { prompt } = f.calls[0];
  assert.match(prompt, /Verified public example/); assert.match(prompt, /general knowledge and reasoning/);
  assert.match(prompt, /Ignore unrelated references/); assert.match(prompt, /We discussed cooperation/);
  assert.equal(answer.sources[0].id, 'approved');
  assert.match(prompt, /Claims about actual platform records or media availability must be supported/);
});

test('general explanations mentioning media do not claim to have found media results', async () => {
  const f = fixture({ references: true });
  const answer = await f.askQuestion('Explain how video compression works.', 2);
  assert.equal(answer.mediaFilter, null);
  assert.doesNotMatch(f.calls[0].prompt, /The user asked for video content/);
});

test('collection requests preserve verified availability and distinguish general examples', async () => {
  const f = fixture();
  const answer = await f.askQuestion('Show all proverbs', 2);
  assert.deepEqual(answer.sources, []);
  assert.match(f.calls[0].prompt, /no matching collection items were found/);
  assert.match(f.calls[0].prompt, /general information or examples/);
  assert.match(f.calls[0].instruction, /Never invent catalog entries/);
});
