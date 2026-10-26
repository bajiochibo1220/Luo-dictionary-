const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loader } = require('./load-ts.cjs');
const owner = '11111111-1111-4111-8111-111111111111';
const resourceId = '22222222-2222-4222-8222-222222222222';
const operationId = '33333333-3333-4333-8333-333333333333';
const account = {id:owner,name:'Learner',email:'learner@example.invalid',image:null,profileTypes:[],isSuperAdmin:false,isMasterSuperAdmin:false,languageRoles:[]};
const body = {text:'Approved learning text',teacherNotes:'',activities:[],questions:[{id:'q1',prompt:'Choose one',choices:['First','Second'],answer:1,explanation:'Second is correct.'}]};
const resource = {id:resourceId,languageId:1,kind:'lesson',title:'Lesson',description:'Description',level:'beginner',audience:'all',body,status:'published',consentScope:'public_excerpt',restrictionLevel:'public',version:1,downloadAllowed:true};
const input = {ownerId:owner,operationId,resourceId,version:1,answers:{q1:1},complete:true,position:5};

function fixture(overrides={}) {
  let receipt=null, state=null, writes=0;
  const tx = {
    activityReceipt:{findUnique:async()=>receipt,create:async({data})=>{receipt=data;return data;}},
    learningResource:{findFirst:async()=>resource,...overrides.learningResource},
    learningState:{findUnique:async()=>state,upsert:async({create,update})=>{writes++;state=state?{...state,...update}:{...create};return state;}},
    ...overrides,
  };
  const service=loader({'@/lib/db':{prisma:{$transaction:async action=>action(tx)}}})('src/lib/learning-service.ts');
  return {service,tx,writes:()=>writes};
}

test('lesson contracts reject invalid answers, duplicate questions, invalid event dates and forged scores',()=>{
  const {ResourceInput,ProgressInput}=loader()('src/lib/learning-contract.ts');
  const base={languageId:1,kind:'lesson',title:'Lesson',description:'',body};
  assert.equal(ResourceInput.safeParse(base).success,true);
  assert.equal(ResourceInput.safeParse({...base,body:{...body,questions:[body.questions[0],body.questions[0]]}}).success,false);
  assert.equal(ResourceInput.safeParse({...base,body:{...body,questions:[{...body.questions[0],answer:6}]}}).success,false);
  assert.equal(ResourceInput.safeParse({...base,kind:'event'}).success,false);
  assert.equal(ResourceInput.safeParse({...base,timeZone:'Invalid/Zone'}).success,false);
  assert.equal(ProgressInput.safeParse({...input,score:100}).success,false);
});
test('progress is scored on the server and replaying the same operation counts one attempt',async()=>{
  const f=fixture();
  const first=await f.service.recordProgress(account,input);
  const second=await f.service.recordProgress(account,input);
  assert.equal(first.bestScore,100);assert.equal(first.attempts,1);assert.equal(first.completed,true);
  assert.deepEqual(second,first);assert.equal(f.writes(),1);
  await assert.rejects(f.service.recordProgress(account,{...input,answers:{q1:0}}),error=>error.status===409);
});
test('offline operations cannot migrate to another account and stale/withdrawn lessons cannot be submitted',async()=>{
  const f=fixture();
  await assert.rejects(f.service.recordProgress({...account,id:resourceId},input),error=>error.status===403);
  await assert.rejects(f.service.recordProgress(account,{...input,version:2}),error=>error.status===409);
  const absent=fixture({learningResource:{findFirst:async()=>null}});
  await assert.rejects(absent.service.recordProgress(account,input),error=>error.status===404);
  assert.equal(f.writes(),0);assert.equal(absent.writes(),0);
});
test('incomplete or unknown questions cannot produce a completed lesson',async()=>{
  const f=fixture();
  await assert.rejects(f.service.recordProgress(account,{...input,answers:{}}),error=>error.status===400);
  await assert.rejects(f.service.recordProgress(account,{...input,answers:{q1:1,forged:0}}),error=>error.status===400);
  assert.equal(f.writes(),0);
});
test('new resource versions do not inherit a completed result from an older lesson',async()=>{
  const f=fixture({learningState:{findUnique:async()=>({resourceVersion:0,bestScore:100,completed:true,attempts:5,position:999}),upsert:async({update})=>update}});
  const result=await f.service.recordProgress(account,{...input,answers:{q1:0}});
  assert.equal(result.bestScore,0);assert.equal(result.completed,false);assert.equal(result.attempts,1);
});
test('public resource projection hides answer keys, internal policy and author identities',()=>{
  const {resourceView}=fixture().service;
  const projection=resourceView({...resource,createdBy:'private-author',reviewedBy:'private-reviewer'});
  assert.equal(projection.body.questions[0].answer,-1);assert.equal(projection.body.questions[0].explanation,'');
  assert.equal(JSON.stringify(projection).includes('private'),false);
  assert.equal(resourceView(resource,true).body.questions[0].answer,1);
});
test('ordinary accounts cannot author educational resources',async()=>{
  const {saveResource}=loader({'@/lib/db':{prisma:{learningResource:{create:()=>assert.fail('No unauthorized write')}}}})('src/lib/learning-service.ts');
  await assert.rejects(saveResource(account,{languageId:1,kind:'lesson',title:'Lesson',description:'',body}),error=>error.status===403);
});
test('independent cultural review and explicit permission are required before educational publication',async()=>{
  const staff={...account,languageRoles:[{languageId:1,languageCode:'luo',languageName:'Dholuo',role:'language_admin'}]};
  let current={...resource,status:'submitted',createdBy:owner};
  const service=loader({'@/lib/db':{prisma:{learningResource:{findUnique:async()=>current}}}})('src/lib/learning-service.ts');
  await assert.rejects(service.transitionResource(staff,resourceId,1,'approve'),error=>error.status===403);
  current={...current,status:'validated',createdBy:'another-author',consentScope:'pending'};
  await assert.rejects(service.transitionResource(staff,resourceId,1,'publish'),error=>error.status===409);
});
test('signed-in public transcript readers receive the same safe fields as guests',async()=>{
  let session=null;
  const publicFields={status:'published',consentScope:'public_excerpt',restrictionLevel:'public',languageId:1,embargoUntil:null};
  const transcript={...publicFields,id:'t',recordId:'r',text:'Permitted text',languageCode:'luo',timestamps:null,isAligned:false,speaker:'private-speaker',location:'private-location',sourceReference:'private-source',record:{...publicFields,contributorId:'someone'}};
  const load=loader({'@/lib/auth':{auth:async()=>session},'@/lib/db':{prisma:{transcript:{findUnique:async()=>transcript}}}});
  const get=load('src/app/api/transcripts/[id]/route.ts').GET;
  const guest=await (await get(new Request('https://app.test/api/transcripts/t'),{params:Promise.resolve({id:'t'})})).json();
  session={user:account};
  const registered=await (await get(new Request('https://app.test/api/transcripts/t'),{params:Promise.resolve({id:'t'})})).json();
  assert.deepEqual(registered.data,guest.data);assert.equal(JSON.stringify(registered).includes('private'),false);
});
