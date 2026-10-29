const test = require('node:test');
const assert = require('node:assert/strict');
const { loader } = require('./load-ts.cjs');

test('bilingual answers survive storage and owned history reads while legacy answers remain readable', async () => {
  const { storeCulturalAnswer, readCulturalAnswer } = loader()('src/lib/cultural-chat-answer.ts');
  for (const languageCode of ['eng', 'luo']) {
    const answer = { languageCode, answer: 'Original answer [Source 1]', translation: 'Translated answer [Source 1]' };
    const stored = storeCulturalAnswer(answer);
    assert.deepEqual(readCulturalAnswer(stored), answer);
    const { getConversation } = loader({ '@/lib/db': { prisma: {
      conversation: { findFirst: async ({ where }) => where.userId === 'owner' ? { id: 'chat' } : null },
      aIResponse: { findMany: async () => [{ id: 'message', query: 'Cultural question', response: stored, sources: [], createdAt: new Date() }] },
    } } })('src/lib/conversation-data.ts');
    const history = await getConversation('owner', 'chat');
    assert.equal(history.messages[0].response, answer.answer);
    assert.equal(history.messages[0].translation, answer.translation);
    assert.equal(history.messages[0].languageCode, languageCode);
    assert.equal(await getConversation('stranger', 'chat'), null);
  }
  assert.deepEqual(readCulturalAnswer('Historical plain answer'), { answer: 'Historical plain answer' });
});

test('malformed or incomplete bilingual output fails safely rather than publishing JSON or a false translation', async () => {
  for (const text of ['plain answer', '{"languageCode":"eng","answer":"Missing translation"}', '{"languageCode":"fra","answer":"x","translation":"y"}']) {
    const { askQuestion } = loader({
      './text-generation': { generateText: async (_prompt, _system, _timeout, options) => { assert.equal(options.json, true); return { text, model: 'test' }; } },
      '@/lib/db': { prisma: {} },
    })('src/lib/ai/rag.ts');
    await assert.rejects(askQuestion('Hello'), error => error.status === 503 && /translation/.test(error.message));
  }
});

test('missing translated citations and stray scripts trigger one repair before publication', async () => {
  const valid = { languageCode: 'eng', answer: 'Cultural answer [Source 1]', translation: 'Translated cultural answer [Source 1]' };
  for (const translation of ['Translation without the citation', 'Translation \u7f16\u7a0b [Source 1]']) {
    let calls = 0;
    const { askQuestion } = loader({
      './text-generation': { generateText: async prompt => {
        calls++;
        if (calls === 2) assert.match(prompt, /Copy every \[Source N\] marker unchanged/);
        return { text: JSON.stringify(calls === 1 ? { ...valid, translation } : valid), model: 'test' };
      } },
      '@/lib/db': { prisma: {} },
    })('src/lib/ai/rag.ts');
    const result = await askQuestion('Hello');
    assert.equal(calls, 2);
    assert.equal(result.translation, valid.translation);
  }
});
