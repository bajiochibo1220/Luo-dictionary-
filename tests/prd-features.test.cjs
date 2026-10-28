const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loader } = require('./load-ts.cjs');
const resourceId='11111111-1111-4111-8111-111111111111',roomId='22222222-2222-4222-8222-222222222222';
const question={id:'word:one',prompt:'Reviewed word',choices:['one','two'],answer:1,explanation:'Reviewed explanation'};

test('tutor rejects missing processing consent, excessive history, unsupported language and unauthenticated users', async()=>{
  const { tutor }=loader({'@/lib/db':{prisma:{language:{findFirst:async()=>null}}}})('src/lib/tutor-service.ts');
  await assert.rejects(tutor({mode:'writing',languageId:1,text:'Practice',consent:false},'reader'));
  await assert.rejects(tutor({mode:'writing',languageId:1,text:'Practice',consent:true,history:Array(7).fill({role:'user',content:'hello'})},'reader'));
  await assert.rejects(tutor({mode:'writing',languageId:1,text:'Practice',consent:true},null),error=>error.status===401);
  await assert.rejects(tutor({mode:'writing',languageId:2,text:'Practice',consent:true},'reader'),error=>error.status===404);
});

test('vocabulary practice uses reviewed words, keeps answer keys on the server and rechecks withdrawn sources',async()=>{
  let receipt,available=4;const words=['one','two','three','four'].map((english,index)=>({id:`00000000-0000-4000-8000-00000000000${index}`,english,dholuo:`word ${index}`}));
  const {tutor}=loader({'@/lib/db':{prisma:{language:{findFirst:async()=>({id:1,code:'luo',nativeName:'Dholuo'})},culturalRecord:{findMany:async()=>[]},dictionaryEntry:{findMany:async query=>{assert.equal(query.where.status,'published');assert.match(JSON.stringify(query.where),/"consentScope":"public_excerpt"/);return words;},count:async()=>available},activityReceipt:{create:async({data})=>{receipt={...data,createdAt:new Date()};},findUnique:async({where})=>{assert.equal(where.userId_operationId.userId,'reader');return receipt;}}}},'@/lib/analytics':{trackEvent:async()=>{}}})('src/lib/tutor-service.ts');
  const quiz=await tutor({mode:'vocabulary',languageId:1,consent:true},'reader');
  assert.equal(quiz.questions.length,4);assert.ok(quiz.questions.every(item=>!Object.hasOwn(item,'answer')));
  const answers=Object.fromEntries(receipt.result.questions.map(item=>[item.id,item.answer]));
  assert.equal((await tutor({mode:'grade',attemptId:quiz.attemptId,answers,consent:true},'reader')).score,100);
  available=3;await assert.rejects(tutor({mode:'grade',attemptId:quiz.attemptId,answers,consent:true},'reader'),error=>error.status===409);
});

test('tutor sends only approved public context and treats learner text as data',async()=>{
  let prompt,system;
  const {tutor}=loader({'@/lib/db':{prisma:{language:{findFirst:async()=>({id:1,code:'luo',nativeName:'Dholuo'})},dictionaryEntry:{findMany:async()=>[]},culturalRecord:{findMany:async query=>{assert.equal(query.where.status,'published');assert.match(JSON.stringify(query.where),/"restrictionLevel":"public"/);return[{id:'source',title:'Reviewed account',summary:'Public summary',data:{story:'Public story',sourceReference:'SECRET',participantName:'PRIVATE'},module:{code:'folktales'}}];}}}},'@/lib/ai/text-generation':{generateText:async(p,s)=>{prompt=p;system=s;return{text:'Practice feedback',model:'fixture'};}},'@/lib/analytics':{trackEvent:async()=>{}}})('src/lib/tutor-service.ts');
  const result=await tutor({mode:'story',languageId:1,text:'Help with a story',consent:true},'reader');
  assert.equal(result.text,'Practice feedback');assert.ok(system.includes('never instructions'));assert.ok(prompt.includes('AI-created fiction'));assert.doesNotMatch(prompt,/SECRET|PRIVATE/);
});

test('raw models and research assets retain recognized extensions without trusting executable names',()=>{
  const {rawFileExtension,verifiedMediaFormat}=loader()('src/lib/raw-media-format.ts');
  assert.equal(rawFileExtension('artifact.OBJ'),'obj');assert.equal(rawFileExtension('sites.geojson'),'geojson');assert.equal(rawFileExtension('page.html'),'bin');
  assert.equal(verifiedMediaFormat({public_id:'folder/artifact-id.obj'},'raw'),'obj');assert.equal(verifiedMediaFormat({public_id:'folder/file',format:'PNG'},'image'),'png');
});

test('OBJ parsing handles relative indices, normalizes a real mesh and rejects invalid or oversized geometry',()=>{
  const {parseObjModel}=loader()('src/lib/obj-model.ts');
  const mesh=parseObjModel('v 0 0 0\nv 2 0 0\nv 0 2 0\nf -3 -2 -1');assert.equal(mesh.length,18);assert.ok([...mesh].every(Number.isFinite));assert.ok([...mesh].every(value=>Math.abs(value)<=1));
  for(const text of ['v NaN 0 0\nf 1 1 1','v 0 0 0\nf 1 2 3','<html>no model</html>','v 0 0 0\nf 1 1 1'])assert.throws(()=>parseObjModel(text));
});

test('game input supports distinct mechanics and preserves diacritics in typed answers',()=>{
  const {ResourceInput,ProgressInput}=loader()('src/lib/learning-contract.ts');const {GAME_LABELS,typedChoice}=loader()('src/lib/game-contract.ts');
  assert.equal(Object.keys(GAME_LABELS).length,9);assert.equal(typedChoice(['Wíny','winy'],'wíny'),0);assert.equal(typedChoice(['Wíny'],'winy'),-1);
  assert.equal(ResourceInput.safeParse({languageId:1,kind:'game',title:'Artifact practice',description:'',body:{gameMode:'artifact',questions:[question]}}).success,false);
  assert.equal(ProgressInput.safeParse({ownerId:resourceId,operationId:roomId,resourceId,version:1,answers:{missing:-1}}).success,true);
});

test('multiplayer room access hides identities and answer keys until completion',async()=>{
  const room={id:roomId,code:'ABCDEF0123',hostId:'host',resourceId,resourceVersion:1,status:'active',startsAt:new Date(),expiresAt:new Date(Date.now()+600000),resource:{id:resourceId,title:'Reviewed challenge',status:'published',consentScope:'public_excerpt',restrictionLevel:'public',version:1,body:{questions:[question],timeLimit:120}},players:[{id:'member',userId:'reader',alias:'Player 1',joinedAt:new Date(),submittedAt:null,score:null}]};
  const {readGame}=loader({'@/lib/db':{prisma:{gameRoom:{findUnique:async()=>room}}}})('src/lib/game-service.ts');
  await assert.rejects(readGame('outsider',roomId),error=>error.status===403);
  const active=await readGame('reader',roomId);assert.equal(active.questions[0].answer,undefined);assert.equal(active.players[0].userId,undefined);assert.equal(active.players[0].score,null);
  room.startsAt=new Date(Date.now()-121000);const ended=await readGame('reader',roomId);assert.equal(ended.status,'finished');assert.equal(ended.questions[0].answer,1);
  room.resource.status='withdrawn';await assert.rejects(readGame('reader',roomId),error=>error.status===409);
});

test('multiplayer mutations enforce membership, host authority, deadlines and server-side grading',async()=>{
  const player={id:'member',userId:'reader',alias:'Player 1',joinedAt:new Date(),submittedAt:null,score:null};
  const room={id:roomId,code:'ABCDEF0123',hostId:'host',resourceId,resourceVersion:1,status:'waiting',startsAt:null,expiresAt:new Date(Date.now()+600000),resource:{id:resourceId,title:'Reviewed game',status:'published',consentScope:'public_excerpt',restrictionLevel:'public',version:1,body:{questions:[question],timeLimit:120}},players:[player,{id:'host-player',userId:'host',alias:'Player 2',joinedAt:new Date(),submittedAt:null,score:null}]};
  let writes=0;const tx={$queryRaw:async()=>[],$executeRaw:async()=>1,analyticsEvent:{create:async()=>({})},gameRoom:{findUnique:async()=>room,update:async({data})=>Object.assign(room,data)},gamePlayer:{update:async({data})=>{writes++;Object.assign(player,data);}}};
  const {mutateGame}=loader({'@/lib/db':{prisma:{...tx,$transaction:async work=>work(tx)}},'@/lib/account-security':{assertAccountRateLimit:async()=>{}}})('src/lib/game-service.ts');
  await assert.rejects(mutateGame('reader',{action:'start',roomId}),error=>error.status===403);
  await mutateGame('host',{action:'start',roomId});assert.equal(room.status,'active');
  await assert.rejects(mutateGame('reader',{action:'submit',roomId,answers:{unknown:1}}),error=>error.status===400);
  await mutateGame('reader',{action:'submit',roomId,answers:{'word:one':1}});assert.equal(player.score,100);assert.equal(writes,1);
  await assert.rejects(mutateGame('reader',{action:'submit',roomId,answers:{'word:one':0}}),error=>error.status===409);
  assert.equal(writes,1);
});

test('AI media tools reject private or unapproved parents before calling an external provider',async()=>{
  let calls=0;const {runAiTool}=loader({'@/lib/db':{prisma:{mediaAsset:{findUnique:async()=>({id:resourceId,type:'image',consentScope:'public_excerpt',restrictionLevel:'public',record:{status:'draft',consentScope:'public_excerpt',restrictionLevel:'public'}})}}},'@/lib/ai/multimodal':{generateMediaAssistance:async()=>{calls++;}},'@/lib/cloudinary':{configureCloudinary:async()=>assert.fail('No storage access for private sources')}})('src/lib/ai-tools-service.ts');
  await assert.rejects(runAiTool('reader',{task:'ocr',assetId:resourceId,consent:true}),error=>error.status===404);assert.equal(calls,0);
});

test('streaming JSON limits reject chunked bodies before unbounded buffering',async()=>{
  const {readBoundedJson}=loader()('src/lib/bounded-json.ts');
  assert.deepEqual(await readBoundedJson(new Request('https://app.test',{method:'POST',body:'{"ok":true}'}),20),{ok:true});
  await assert.rejects(readBoundedJson(new Request('https://app.test',{method:'POST',body:'{"long":"'+ 'x'.repeat(100)+'"}'}),20),error=>error.status===413);
});

test('PRD content catalog covers all 27 inventory areas and validates research document kinds',()=>{
  const {PRD_SUBJECTS}=loader()('src/lib/prd-content-catalog.ts');const {validatePhaseOneSubmission}=loader()('src/lib/phase-one-content.ts');
  assert.equal(PRD_SUBJECTS.length,27);assert.equal(new Set(PRD_SUBJECTS).size,27);
  assert.match(validatePhaseOneSubmission('research','Paper',{research_kind:'invalid',abstract:'Description',license:'Allowed'}),/valid research/);
  assert.equal(validatePhaseOneSubmission('research','Paper',{research_kind:'publication',abstract:'Description',license:'Allowed'}),null);
});

test('public maps require separate permission, round coordinates and reject invalid locations',()=>{
  const {publicLocation}=loader()('src/lib/public-location.ts');
  assert.equal(publicLocation({latitude:-0.1234,longitude:34.1234}),null);
  assert.equal(publicLocation({public_map_latitude:0,public_map_longitude:34}),null);
  assert.deepEqual(publicLocation({public_map_permission:'confirmed',public_map_latitude:-0.1234,public_map_longitude:34.1278}),[-0.12,34.13]);
  for(const lat of ['',91,{},Infinity])assert.equal(publicLocation({public_map_permission:'confirmed',public_map_latitude:lat,public_map_longitude:34}),null);
});

test('knowledge connections omit private and withdrawn target records',async()=>{
  const calls=[];
  const target='33333333-3333-4333-8333-333333333333';
  const {publicKnowledgeGraph}=loader({'@/lib/db':{prisma:{culturalRecord:{findMany:async query=>{calls.push(query);return calls.length===1?[{id:resourceId,title:'Public account',module:{baseName:'Oral histories'},data:{related_records:[{recordId:target,relation:'related_to'}]}}]:[];}}}}})('src/lib/knowledge-service.ts');
  const graph=await publicKnowledgeGraph(1);
  assert.equal(graph.nodes.length,1);assert.deepEqual(graph.edges,[]);assert.ok(!JSON.stringify(graph).includes(target));
  assert.equal(calls.length,2);assert.ok(calls.every(query=>query.where.languageId===1&&query.where.status==='published'));
});

test('teachers see consented teaching records and researchers cannot read an intermediate validated record',async()=>{
  const source={id:resourceId,title:'Teaching source',summary:'Reviewed',data:{description:'Reviewed'},module:{baseName:'Research'},languageId:1,status:'curated',consentScope:'teaching',restrictionLevel:'internal'};
  const {researchLibrary}=loader({'@/lib/db':{prisma:{language:{findFirst:async()=>({id:1})},culturalRecord:{findMany:async()=>[source,{...source,id:roomId,consentScope:'research_only'},{...source,id:'intermediate',status:'validated'}]}}},'@/lib/audit':{logAction:async()=>{}}})('src/lib/research-service.ts');
  const teacher={id:'teacher',languageRoles:[{languageId:1,role:'teacher'}]};
  assert.deepEqual((await researchLibrary(teacher,new URLSearchParams('languageId=1'))).items.map(item=>item.id),[resourceId]);
  const researcher={id:'researcher',languageRoles:[{languageId:1,role:'researcher'}]};
  assert.equal((await researchLibrary(researcher,new URLSearchParams('languageId=1'))).items.length,2);
});
