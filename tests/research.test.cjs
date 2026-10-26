const {test}=require('node:test');const assert=require('node:assert/strict');const {loader}=require('./load-ts.cjs');
const researcher={id:'researcher',isSuperAdmin:false,isMasterSuperAdmin:false,languageRoles:[{languageId:1,role:'researcher'}]};
const permitted={consentScope:'research_only',restrictionLevel:'internal',embargoUntil:null,languageId:1};
test('research library requires real assigned language roles before querying protected collections',async()=>{
 const {researchLibrary}=loader({'@/lib/db':{prisma:{language:{findFirst:()=>assert.fail('Unauthorized read')}}}})('src/lib/research-service.ts');
 await assert.rejects(researchLibrary(null,new URLSearchParams('languageId=1')),e=>e.status===401);
 await assert.rejects(researchLibrary({...researcher,languageRoles:[],profileTypes:['researcher']},new URLSearchParams('languageId=1')),e=>e.status===403);
 await assert.rejects(researchLibrary(researcher,new URLSearchParams('languageId=2')),e=>e.status===403);
});
test('research record pages expose eligible presentation text, exclude pending or sacred records, and log actual reads',async()=>{
 let audited;const records=[{id:'allowed',title:'Reviewed',summary:null,data:{description:'Eligible text',collector:'PRIVATE',sourceReference:'PRIVATE'},module:{baseName:'Oral histories'},...permitted},{id:'pending',title:'Pending',data:{description:'PRIVATE'},...permitted,consentScope:'pending'},{id:'sacred',title:'Sacred',data:{description:'PRIVATE'},...permitted,restrictionLevel:'sacred'}];
 const {researchLibrary}=loader({'@/lib/db':{prisma:{language:{findFirst:async()=>({id:1})},culturalRecord:{findMany:async({where,take})=>{assert.deepEqual(where.status.in,['curated','validated','published']);assert.equal(take,51);return records;}}}},'@/lib/audit':{logAction:async value=>{audited=value;}}})('src/lib/research-service.ts');
 const result=await researchLibrary(researcher,new URLSearchParams('languageId=1'));assert.equal(result.items.length,1);assert.match(result.items[0].text,/Eligible text/);assert.doesNotMatch(JSON.stringify(result),/PRIVATE/);assert.deepEqual(audited.newValue.ids,['allowed']);assert.equal(audited.action,'research.read');
});
test('research transcript access checks both transcript and parent and omits participant metadata',async()=>{
 const allowed={id:'one',text:'Reviewed transcript',versionNo:1,sourceUri:'PRIVATE',sessionId:'PRIVATE',...permitted,record:{id:'parent',title:'Reviewed interview',...permitted}};const denied={...allowed,id:'two',record:{...allowed.record,consentScope:'pending'}};
 const {researchLibrary}=loader({'@/lib/db':{prisma:{language:{findFirst:async()=>({id:1})},transcript:{findMany:async()=>[allowed,denied]}}},'@/lib/audit':{logAction:async()=>{}}})('src/lib/research-service.ts');
 const result=await researchLibrary(researcher,new URLSearchParams('languageId=1&kind=transcripts'));assert.equal(result.items.length,1);assert.equal(result.items[0].text,'Reviewed transcript');assert.doesNotMatch(JSON.stringify(result),/PRIVATE/);
});
test('sparse research pages retain a bounded continuation without leaking forbidden rows',async()=>{
 const records=Array.from({length:51},(_,i)=>({id:'id'+String(i).padStart(3,'0'),title:'Private',data:{},...permitted,restrictionLevel:'sacred'}));
 const {researchLibrary}=loader({'@/lib/db':{prisma:{language:{findFirst:async()=>({id:1})},culturalRecord:{findMany:async()=>records}}},'@/lib/audit':{logAction:async()=>{}}})('src/lib/research-service.ts');
 const result=await researchLibrary(researcher,new URLSearchParams('languageId=1'));assert.deepEqual(result.items,[]);assert.equal(result.next,'id049');
});
test('research input rejects oversized or malformed selections before collection queries',async()=>{
 const {researchLibrary}=loader({'@/lib/db':{prisma:{}}})('src/lib/research-service.ts');
 for(const query of ['languageId=NaN','languageId=1&kind=secrets','languageId=1&after=../../private'])await assert.rejects(researchLibrary(researcher,new URLSearchParams(query)),e=>e.status===400);
});
test('calendar, games, learning and research navigation point to their working shared screens',()=>{
 const {moduleHref}=loader()('src/lib/app-navigation.ts');assert.equal(moduleHref('cultural_calendar'),'/learn?section=event');assert.equal(moduleHref('games'),'/learn?section=game');assert.equal(moduleHref('learning'),'/learn?section=lesson');assert.equal(moduleHref('research'),'/research');
});

test('Master can assign research access to an ordinary account, with active-language validation and audit',async()=>{
 let granted,audit;const {POST}=loader({'@/lib/auth':{auth:async()=>({user:{id:'master',isSuperAdmin:true,isMasterSuperAdmin:true,languageRoles:[]}})},'@/lib/db':{prisma:{user:{findUnique:async()=>({isSuperAdmin:false,isMasterSuperAdmin:false,languageRoles:[]})},language:{findFirst:async()=>({id:1})},userLanguageRole:{upsert:async query=>{granted=query.create;return {id:5,...query.create};}}}},'@/lib/audit':{logAction:async value=>{audit=value;}}})('src/app/api/users/[id]/roles/route.ts');
 const response=await POST(new Request('http://localhost/api/users/learner/roles',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({languageId:1,role:'researcher'})}),{params:Promise.resolve({id:'learner'})});assert.equal(response.status,200);assert.equal(granted.role,'researcher');assert.equal(granted.assignedBy,'master');assert.equal(audit.action,'user.role_granted');
});
test('a researcher role does not become a stepping stone for promotion of a public account to administrator',async()=>{
 const {POST}=loader({'@/lib/auth':{auth:async()=>({user:{id:'master',isSuperAdmin:true,isMasterSuperAdmin:true,languageRoles:[]}})},'@/lib/db':{prisma:{user:{findUnique:async()=>({isSuperAdmin:false,isMasterSuperAdmin:false,languageRoles:[{id:1,role:'researcher'}]})},userLanguageRole:{upsert:()=>assert.fail('No administrator elevation')}}}})('src/app/api/users/[id]/roles/route.ts');
 const response=await POST(new Request('http://localhost/api/users/learner/roles',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({languageId:1,role:'language_admin'})}),{params:Promise.resolve({id:'learner'})});assert.equal(response.status,403);
});
test('scoped Super Admin cannot grant teaching or research duties outside their assigned language',async()=>{
 const {POST}=loader({'@/lib/auth':{auth:async()=>({user:{id:'super',isSuperAdmin:true,isMasterSuperAdmin:false,languageRoles:[{languageId:1,role:'language_admin'}]}})},'@/lib/db':{prisma:{user:{findUnique:()=>assert.fail('No unauthorized target lookup')}}}})('src/app/api/users/[id]/roles/route.ts');
 const response=await POST(new Request('http://localhost/api/users/learner/roles',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({languageId:2,role:'teacher'})}),{params:Promise.resolve({id:'learner'})});assert.equal(response.status,403);
});
test('role revocation rejects a role ID belonging to a different URL account',async()=>{
 const {DELETE}=loader({'@/lib/auth':{auth:async()=>({user:{id:'master',isSuperAdmin:true,isMasterSuperAdmin:true}})},'@/lib/db':{prisma:{userLanguageRole:{findUnique:async()=>({id:5,userId:'someone-else',user:{}}),delete:()=>assert.fail('Wrong account')}}}})('src/app/api/users/[id]/roles/route.ts');assert.equal((await DELETE(new Request('http://localhost/api/users/learner/roles?roleId=5'),{params:Promise.resolve({id:'learner'})})).status,404);
});
