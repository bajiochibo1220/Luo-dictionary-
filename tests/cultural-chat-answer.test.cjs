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
  const valid = { languageCode: 'eng', answer: 'Cultural answer', translation: 'Translated cultural answer' };
  for (const translation of ['Translation without the citation', 'Translation \u7f16\u7a0b [Source 1]']) {
    let calls = 0;
    const { askQuestion } = loader({
      './text-generation': { generateText: async prompt => {
        calls++;
        if (calls === 2) assert.match(prompt, /Copy every \[Source N\] marker unchanged/);
        return { text: JSON.stringify(calls === 1 ? { ...valid, answer: 'Cultural answer [Source 1]', translation } : valid), model: 'test' };
      } },
      '@/lib/db': { prisma: {} },
    })('src/lib/ai/rag.ts');
    const result = await askQuestion('Hello');
    assert.equal(calls, 2);
    assert.equal(result.translation, valid.translation);
  }
});


test('historical bilingual payloads remain readable when newer generation validation is stricter', () => {
  const {readCulturalAnswer, CulturalAnswerSchema} = loader()('src/lib/cultural-chat-answer.ts');
  const historical = {languageCode:'eng',answer:'Historical answer [Source 1]',translation:'Historical translation'};
  assert.equal(CulturalAnswerSchema.safeParse(historical).success,false);
  assert.deepEqual(readCulturalAnswer('CULTURAL_HERITAGE_V1\n'+JSON.stringify(historical)),historical);
});

test('invented source numbers are repaired once, including when only the translation invents a source', async () => {
  const valid = {languageCode:'eng',answer:'A brief cultural greeting',translation:'Mock translated greeting'};
  for (const marker of ['[Source 1]','[Source 0]','[Source -1]','[source 99]']) {
    let calls=0;
    const {askQuestion}=loader({
      './text-generation':{generateText:async prompt=>{calls++;if(calls===2)assert.match(prompt,/No sources were supplied/);return{text:JSON.stringify(calls===1?{...valid,answer:valid.answer+' '+marker,translation:valid.translation+' '+marker}:valid),model:'test'};}},
      '@/lib/db':{prisma:{}},
    })('src/lib/ai/rag.ts');
    const result=await askQuestion('Hello');assert.equal(calls,2);assert.equal(result.answer,valid.answer);
  }
  const {askQuestion}=loader({
    './text-generation':{generateText:async()=>({text:JSON.stringify({...valid,translation:'Fake [source 9]'}),model:'test'})},'@/lib/db':{prisma:{}},
  })('src/lib/ai/rag.ts');
  await assert.rejects(askQuestion('Hello'),error=>error.status===503);
});
