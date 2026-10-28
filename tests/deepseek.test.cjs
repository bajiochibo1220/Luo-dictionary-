const test=require('node:test'),assert=require('node:assert/strict');const {loader}=require('./load-ts.cjs');
const success={choices:[{finish_reason:'stop',message:{content:'A complete answer',reasoning_content:'PRIVATE REASONING'}}]};
function configured(extra={}){return loader({'@/lib/settings':{getSystemSetting:async key=>({ai_text_provider:'deepseek',deepseek_api_key:'fixture-key',deepseek_model:'deepseek-flash',...extra}[key]||'')}});}
async function withFetch(fn,work){const old=global.fetch;global.fetch=fn;try{return await work();}finally{global.fetch=old;}}

test('DeepSeek is the default text provider and sends only server-side credentials to the fixed official endpoint',async()=>{
 const load=configured({ai_text_provider:''});assert.equal(await load('src/lib/ai/provider-config.ts').getTextAiProvider(),'deepseek');
 await withFetch(async(url,init)=>{assert.equal(url,'https://api.deepseek.com/chat/completions');assert.equal(init.headers.Authorization,'Bearer fixture-key');assert.equal(init.redirect,'error');const body=JSON.parse(init.body);assert.deepEqual(body.messages,[{role:'system',content:'Instruction'},{role:'user',content:'Question'}]);assert.equal(body.thinking.type,'disabled');assert.equal(body.stream,false);return Response.json(success);},async()=>{const result=await load('src/lib/ai/text-generation.ts').generateText('Question','Instruction');assert.deepEqual(result,{text:'A complete answer',model:'deepseek-flash'});assert.doesNotMatch(JSON.stringify(result),/PRIVATE REASONING|fixture-key/);});
});

test('missing DeepSeek credentials fail clearly without calling Gemini or an external service',async()=>{
 await withFetch(()=>assert.fail('No provider request without a key'),async()=>{const load=configured({deepseek_api_key:''});assert.equal(await load('src/lib/ai/provider-config.ts').hasTextAi(),false);await assert.rejects(load('src/lib/ai/text-generation.ts').generateText('Question','Instruction'),e=>e.status===503&&/DeepSeek API key/.test(e.message));});
});

test('DeepSeek never exposes provider error bodies and does not silently switch to Google',async()=>{
 for(const status of [401,402,403,404,422,429,500,503]){
  let calls=0;await withFetch(async url=>{calls++;assert.ok(url.startsWith('https://api.deepseek.com/'));return Response.json({error:{message:'PRIVATE PROVIDER BODY fixture-key'}},{status});},async()=>{await assert.rejects(configured()('src/lib/ai/text-generation.ts').generateText('Question','Instruction'),e=>e.status===(status===429?429:503)&&!e.message.includes('PRIVATE')&&!e.message.includes('fixture-key'));});assert.equal(calls,1);
 }
});

test('truncated, empty, tool-call and reasoning-only DeepSeek replies cannot masquerade as completed answers',async()=>{
 for(const choice of [{finish_reason:'length',message:{content:'Partial'}},{finish_reason:'stop',message:{content:' '}},{finish_reason:'stop',message:{reasoning_content:'PRIVATE'}},{finish_reason:'stop',message:{content:'Tool output',tool_calls:[{}]}}])await withFetch(async()=>Response.json({choices:[choice]}),async()=>{await assert.rejects(configured()('src/lib/ai/text-generation.ts').generateText('Question','Instruction'),e=>e.status===503);});
});

test('legacy Gemini selection cannot reactivate Google text generation',async()=>{
 const load=loader({'@/lib/settings':{getSystemSetting:async()=> 'gemini'},'./gemini-text':{generateGeminiText:()=>assert.fail('Google is retired')},'./deepseek':{generateDeepSeekText:async()=>({text:'answer',model:'deepseek-flash'})}});
 assert.equal(await load('src/lib/ai/provider-config.ts').getTextAiProvider(),'deepseek');
 assert.equal((await load('src/lib/ai/text-generation.ts').generateText('Q','I')).model,'deepseek-flash');
});

test('public keyword lookup scopes all sources and transcript parents and strips private record fields',async()=>{
 const checks=[];const load=loader({'@/lib/db':{prisma:{culturalRecord:{findMany:async query=>{checks.push(query.where);return[{id:'record',title:'Fishing equipment',summary:'Public source',data:{description:'A fishing net',collector:'PRIVATE COLLECTOR'},module:{baseName:'Artifacts',code:'artifacts'}}];}},dictionaryEntry:{findMany:async query=>{checks.push(query.where);return[];}},transcript:{findMany:async query=>{checks.push(query.where.record.is);assert.ok(query.where.AND.some(rule=>rule.restrictionLevel==='public'));return[];}}}}});
 const results=await load('src/lib/ai/public-text-search.ts').searchPublicText('fishing',7);assert.equal(results[0].record_id,'record');assert.doesNotMatch(JSON.stringify(results),/PRIVATE COLLECTOR/);assert.equal(checks.length,3);for(const query of checks){assert.equal(query.languageId,7);assert.equal(query.status,'published');assert.ok(query.AND.some(rule=>rule.consentScope==='public_excerpt'));assert.ok(query.AND.some(rule=>rule.restrictionLevel==='public'));}
});

test('DeepSeek questions retrieve public sources without making a Gemini embedding request',async()=>{
 let generated;const load=loader({'@/lib/settings':{getSystemSetting:async()=>''},'./provider-config':{getTextAiProvider:async()=> 'deepseek'},'./public-text-search':{searchPublicText:async()=>[{record_id:'one',is_dictionary:false,title:'Fishing',module:'Artifacts',module_code:'artifacts',content:'Verified current description',similarity:1}]},'./embeddings':{embedText:()=>assert.fail('DeepSeek chat must not call Gemini')},'./text-generation':{generateText:async prompt=>{generated=prompt;return{text:'Answer',model:'deepseek-flash'};}},'@/lib/db':{prisma:{module:{findMany:async()=>[]},culturalRecord:{findMany:async()=>[{id:'one',title:'Fishing',summary:'Verified current description',data:{collector:'PRIVATE'},module:{baseName:'Artifacts'}}]},dictionaryEntry:{findMany:async()=>[]},mediaAsset:{findMany:async()=>[]}}}});
 const result=await load('src/lib/ai/rag.ts').askQuestion('Explain fishing equipment');assert.equal(result.model,'deepseek-flash');assert.equal(result.sources.length,1);assert.match(generated,/Verified current description/);assert.doesNotMatch(generated,/PRIVATE/);
});

test('DeepSeek keys are masked, authorized saves record only setting names, and masked saves preserve the key',async()=>{
 const {maskSettings}=loader()('src/lib/settings-policy.ts');assert.ok(maskSettings({deepseek_api_key:'sensitive-key'}).deepseek_api_key);assert.doesNotMatch(JSON.stringify(maskSettings({deepseek_api_key:'sensitive-key'})),/sensitive-key/);
 let actor={user:{id:'master',isMasterSuperAdmin:true}},saved,audit;const route=loader({'@/lib/auth':{auth:async()=>actor},'@/lib/settings':{getSystemSettings:async()=>({deepseek_api_key:'sensitive-key'}),setSystemSettings:async value=>{saved=value;}},'@/lib/audit':{logAction:async value=>{audit=value;}}})('src/app/api/super-admin/settings/route.ts');
 const request=body=>new Request('http://localhost/api/super-admin/settings',{method:'PATCH',body:JSON.stringify(body)});
 assert.equal((await route.PATCH(request({ai_text_provider:'deepseek',deepseek_api_key:'sensitive-key',deepseek_model:'deepseek-flash'}))).status,200);assert.equal(saved.deepseek_api_key,'sensitive-key');assert.doesNotMatch(JSON.stringify(audit),/sensitive-key/);
 assert.equal((await route.PATCH(request({deepseek_api_key:maskSettings({deepseek_api_key:'sensitive-key'}).deepseek_api_key}))).status,200);assert.deepEqual(saved,{});
 assert.equal((await route.PATCH(request({ai_text_provider:'unknown'}))).status,400);
 actor={user:{id:'ordinary'}};assert.equal((await route.PATCH(request({deepseek_api_key:'other'}))).status,403);assert.equal((await route.GET()).status,403);
});

test('the connection test requires an administrator and same-origin JSON and never returns a key',async()=>{
 let actor=null,calls=0;const route=loader({'@/lib/auth':{auth:async()=>actor},'@/lib/settings':{getSystemSettings:async()=>({})},'@/lib/ai/provider-config':{getTextAiProvider:async()=> 'deepseek'},'@/lib/ai/text-generation':{generateText:async()=>{calls++;return{text:'READY',model:'deepseek-flash'};}},'@/lib/ai/quota':{assertAiQuota:async()=>{}}})('src/app/api/super-admin/settings/test-ai/route.ts');
 const request=origin=>new Request('https://app.test/api/super-admin/settings/test-ai',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{}'});
 assert.equal((await route.POST(request('https://app.test'))).status,403);actor={user:{id:'master',isMasterSuperAdmin:true}};assert.equal((await route.POST(request('https://wrong.test'))).status,403);const response=await route.POST(request('https://app.test'));assert.equal(response.status,200);assert.deepEqual((await response.json()).data,{provider:'deepseek',model:'deepseek-flash'});assert.equal(calls,1);
});

test('admin settings default to DeepSeek, render its key as a password and expose a connection test',()=>{
 const React=require('react');const{renderToStaticMarkup}=require('react-dom/server');const Link=({href,children})=>React.createElement('a',{href},children);
 const {SystemClient}=loader({react:{...React,useState:initial=>React.useState(initial==='general'?'api-keys':initial)},'next/link':{__esModule:true,default:Link},'next/navigation':{useRouter:()=>({refresh(){}})},'@/components/shared/partner-branding':{PartnerBrandingSettings:()=>null}})('src/app/(admin)/super-admin/system/system-client.tsx');
 const html=renderToStaticMarkup(React.createElement(SystemClient,{settings:{},languages:[],isMasterSuperAdmin:true}));
 assert.match(html,/<input[^>]*id="setting-deepseek_api_key"[^>]*type="password"/);
 assert.match(html,/<option value="deepseek" selected="">/);assert.match(html,/Test AI connection/);assert.doesNotMatch(html,/Rebuild AI Index<\/button>/);
});

test('DeepSeek image tools send bounded inline images only to DeepSeek',async()=>{
 const image={type:'image',mime:'image/png',bytes:Buffer.from('fixture-image')};
 await withFetch(async(url,init)=>{assert.equal(url,'https://api.deepseek.com/chat/completions');const content=JSON.parse(init.body).messages[1].content;assert.equal(content[0].text,'Read this');assert.equal(content[1].image_url.url,'data:image/png;base64,'+image.bytes.toString('base64'));return Response.json(success);},async()=>{
  const result=await configured()('src/lib/ai/multimodal.ts').generateMediaAssistance('Read this',image);assert.equal(result.model,'deepseek-flash');
 });
});
test('unsupported audio, illustrations and legacy indexing never contact Google or DeepSeek',async()=>{
 await withFetch(()=>assert.fail('No external call for unsupported capabilities'),async()=>{
  const load=configured(),{generateMediaAssistance}=load('src/lib/ai/multimodal.ts');
  await assert.rejects(generateMediaAssistance('Transcribe',{type:'audio',mime:'audio/wav',bytes:Buffer.from('audio')}),/Audio transcription is unavailable/);
  await assert.rejects(generateMediaAssistance('Draw',undefined,true),/Image generation is unavailable/);
  assert.equal(await load('src/lib/ai/gemini.ts').hasGemini(),false);
  await assert.rejects(load('src/lib/ai/gemini.ts').getGemini(),/retired/);
 });
});
