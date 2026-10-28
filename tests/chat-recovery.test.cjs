const test=require('node:test'),assert=require('node:assert/strict');const {loader}=require('./load-ts.cjs');
const complete={status:'completed',steps:[{type:'model_output',content:[{type:'text',text:'Real generated answer'}]}]};
function fixture(requestGemini){const load=loader({'@/lib/settings':{getSystemSetting:async key=>({gemini_api_key:'fixture-key',gemini_model:'primary',gemini_fallback_model:'fallback'}[key]||'')},'./gemini-request':{requestGemini}});return {text:load('src/lib/ai/gemini-text.ts').generateGeminiText,Error:load('src/lib/ai/gemini-errors.ts').AiProviderError};}
test('chat recovers from a model quota error and skips that model briefly on the next question',async()=>{
 const calls=[];let f;f=fixture(async options=>{calls.push(options);if(options.model==='primary')throw new f.Error(429,'Model quota reached',429);return complete;});
 const oldKey=process.env.GEMINI_API_KEY,oldModel=process.env.GEMINI_MODEL,oldFallback=process.env.GEMINI_FALLBACK_MODEL;
 delete process.env.GEMINI_API_KEY;delete process.env.GEMINI_MODEL;delete process.env.GEMINI_FALLBACK_MODEL;
  try{assert.equal((await f.text('Question','Instruction')).model,'fallback');assert.equal((await f.text('Follow-up','Instruction')).text,'Real generated answer');assert.deepEqual(calls.map(c=>c.model),['primary','fallback','fallback']);assert.ok(calls.every(c=>c.standardOnly&&c.timeout<=40000));assert.equal(calls[1].prompt,'Question');assert.equal(calls[1].instruction,'Instruction');}
 finally{for(const [name,value]of Object.entries({GEMINI_API_KEY:oldKey,GEMINI_MODEL:oldModel,GEMINI_FALLBACK_MODEL:oldFallback})){if(value===undefined)delete process.env[name];else process.env[name]=value;}}
});
test('an invalid provider key never retries another model',async()=>{
 let count=0,f;f=fixture(async()=>{count++;throw new f.Error(503,'Service credentials need attention',403);});await assert.rejects(f.text('Question','Instruction'),e=>e.providerStatus===403);assert.equal(count,1);
});
test('both exhausted models remain an explicit quota failure without fabricated answers',async()=>{
 let count=0,f;f=fixture(async()=>{count++;throw new f.Error(429,'Provider quota exhausted',429);});await assert.rejects(f.text('Question','Instruction'),e=>e.status===429);assert.equal(count,2);
});
test('an incomplete primary answer is replaced by a completed fallback answer',async()=>{
 const calls=[];const f=fixture(async options=>{calls.push(options.model);return options.model==='primary'?{...complete,status:'incomplete'}:complete;});const answer=await f.text('Question','Instruction');assert.equal(answer.text,'Real generated answer');assert.deepEqual(calls,['primary','fallback']);
});
test('the chat endpoint returns safe provider configuration errors instead of hiding them',async()=>{
 const load=loader({'@/lib/account-data':{getCurrentAccount:async()=>null},'@/lib/chat-service':{ChatRequestError:class extends Error{},answerChat:async()=>{throw new (load('src/lib/ai/gemini-errors.ts').AiProviderError)(503,'Configure the AI service key in System settings.');}}});
 const response=await load('src/lib/chat-handlers.ts').postChat(new Request('https://app.test/api/v1/chat',{method:'POST',headers:{Origin:'https://app.test','Content-Type':'application/json'},body:JSON.stringify({question:'Hello',allowExternalAi:true})}));assert.equal(response.status,503);assert.match((await response.json()).error,/Configure the AI service key/);
});
