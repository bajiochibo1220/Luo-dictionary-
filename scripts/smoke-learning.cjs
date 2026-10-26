// Live API acceptance with isolated synthetic accounts/content. No email, SMS,
// AI, research publication, existing-account changes or external messages.
require('dotenv').config({ quiet: true });
const assert = require('node:assert/strict');
const {randomBytes,randomUUID,createHash}=require('node:crypto');
const {PrismaClient}=require('@prisma/client');
const db=new PrismaClient({log:[]});
const base=process.env.SMOKE_BASE_URL||'http://127.0.0.1:3000';
const users=[],rateLimitKeys=[];let resourceId=null,draftId=null;
const testPassword=randomBytes(32).toString('base64url');
async function identity(label,roles,languageId){
  const user=await db.user.create({data:{email:`integration-${label}-${randomUUID()}@example.invalid`,name:`Integration ${label}`,status:'active',...(label==='learner'?{passwordHash:await require('bcryptjs').hash(testPassword,10)}:{}),languageRoles:{create:roles.map(role=>({languageId,role}))}}});
  users.push(user.id);
  const family=randomBytes(16).toString('base64url');const accessToken=`lh_native_${family}.${randomBytes(32).toString('base64url')}`;
  await db.session.create({data:{userId:user.id,sessionToken:`native-session:${family}:${createHash('sha256').update(accessToken).digest('hex')}`,expires:new Date(Date.now()+600000)}});
  return {id:user.id,email:user.email,token:accessToken};
}
async function browserLogin(actor) {
  const jar=new Map();
  const receive=response=>{for(const cookie of response.headers.getSetCookie()){const pair=cookie.split(';')[0],index=pair.indexOf('=');jar.set(pair.slice(0,index),pair.slice(index+1));}return response;};
  const cookieHeader=()=>[...jar].map(([key,value])=>key+'='+value).join('; ');
  const csrf=await receive(await fetch(base+'/api/auth/csrf',{signal:AbortSignal.timeout(40000)})).json();
  assert.ok(csrf.csrfToken,'Real CSRF token required');
  rateLimitKeys.push('rate-limit:account:login:'+createHash('sha256').update(actor.email.trim().toLowerCase()).digest('hex'));
  const response=receive(await fetch(base+'/api/auth/callback/credentials',{method:'POST',redirect:'manual',headers:{Cookie:cookieHeader(),Origin:base,'Content-Type':'application/x-www-form-urlencoded','X-Auth-Return-Redirect':'1'},body:new URLSearchParams({csrfToken:csrf.csrfToken,email:actor.email,password:testPassword,callbackUrl:base+'/application'}),signal:AbortSignal.timeout(40000)}));
  assert.ok(response.ok||response.status===302,'Credentials endpoint answered');
  const session=await(await fetch(base+'/api/auth/session',{headers:{Cookie:cookieHeader()},signal:AbortSignal.timeout(40000)})).json();
  assert.equal(session.user?.id,actor.id,'Password sign-in creates a real browser session');
  const profile=await fetch(base+'/api/v1/account',{headers:{Cookie:cookieHeader()},signal:AbortSignal.timeout(40000)});
  assert.equal(profile.status,200,'Browser profile reads with issued cookie');assert.equal((await profile.json()).data.id,actor.id);
  const revoked=await fetch(base+'/api/v1/account/settings',{method:'POST',headers:{Cookie:cookieHeader(),Origin:base,'Content-Type':'application/json'},body:JSON.stringify({action:'revoke-all'}),signal:AbortSignal.timeout(40000)});
  const revokeResult=await revoked.json();
  assert.equal(revoked.status,200,'Browser revoke-all: '+(revokeResult.error||'success'));
  assert.equal((await fetch(base+'/api/v1/account',{headers:{Cookie:cookieHeader()},signal:AbortSignal.timeout(40000)})).status,401,'Revoked browser cookie no longer grants access');
  assert.equal((await call('/api/v1/account',actor)).status,401,'Revocation also invalidates the native session');
  console.log('PASS real credentials/CSRF browser sign-in, browser/native identity consistency and sign-out-all revocation');
}
async function call(path,actor,body){
  const response=await fetch(base+path,{method:body?'POST':'GET',headers:{...(actor?{Authorization:'Bearer '+actor.token}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(40000)});
  const result=await response.json();return {status:response.status,...result};
}
async function run(){
  assert.ok(['127.0.0.1','localhost'].includes(new URL(base).hostname),'Use a local test server');
  const language=await db.language.findFirst({where:{isActive:true},orderBy:{isDefault:'desc'},select:{id:true}});assert.ok(language);
  const author=await identity('author',['content_editor'],language.id);
  const reviewer=await identity('reviewer',['cultural_expert','publisher'],language.id);
  const learner=await identity('learner',[],language.id);
  const resource={languageId:language.id,kind:'lesson',title:'Integration-only lesson',description:'Synthetic acceptance content; removed after this check.',body:{text:'Synthetic text for application testing.',questions:[{id:'question-1',prompt:'Choose the second option.',choices:['First','Second'],answer:1,explanation:'Synthetic test answer.'}]},consentScope:'public_excerpt',restrictionLevel:'public',downloadAllowed:true};
  const created=await call('/api/v1/learning',author,{action:'create',data:resource});assert.equal(created.status,200);resourceId=created.data.id;
  assert.equal((await call('/api/v1/learning',learner,{action:'create',data:resource})).status,403);
  const manifest=()=>call(`/api/v1/learning?languageId=${language.id}&downloads=${resourceId}`);
  assert.equal((await manifest()).data.downloads.length,0);
  let version=created.data.version;
  for(const [action,actor] of [['submit',author],['approve',reviewer],['publish',reviewer]]){
    const result=await call('/api/v1/learning',actor,{action,data:{id:resourceId,version}});assert.equal(result.status,200,action);version=result.data.version;
  }
  assert.equal((await manifest()).data.downloads[0].id,resourceId);
  const activity={ownerId:learner.id,operationId:randomUUID(),resourceId,version,answers:{'question-1':1},complete:true,position:20};
  const first=await call('/api/v1/learning',learner,{action:'progress',data:activity});assert.equal(first.status,200);assert.equal(first.data.bestScore,100);assert.equal(first.data.attempts,1);
  const repeated=await call('/api/v1/learning',learner,{action:'progress',data:activity});assert.deepEqual(repeated.data,first.data);
  assert.equal((await call('/api/v1/learning',author,{action:'progress',data:activity})).status,403);
  assert.equal((await call('/api/v1/learning',learner,{action:'progress',data:{...activity,answers:{'question-1':0}}})).status,409);
  assert.equal((await call('/api/v1/saved',learner,{action:'save',kind:'learning',resourceId})).status,200);
  assert.ok((await call('/api/v1/saved',learner)).data.items.some(item=>item.id===resourceId));
  assert.equal((await call('/api/v1/saved',author)).data.items.some(item=>item.id===resourceId),false);
  console.log('PASS live author/reviewer roles, public gating, server grading, duplicate retries, account isolation and saved items');
  const metadata=await call(`/api/v1/contributions?languageId=${language.id}`,author);assert.equal(metadata.status,200);
  if(metadata.data.modules.some(module=>module.code==='proverbs')){
    const draft=await call('/api/content',author,{languageId:language.id,moduleCode:'proverbs',title:'Integration-only private draft',status:'draft',data:{original_text:'Synthetic original',translation:'Synthetic translation',meaning:'Synthetic meaning',sourcePermission:'needs_review'},tags:[],consentScope:'pending',restrictionLevel:'internal'});
    assert.equal(draft.status,200);draftId=draft.data.id;
    assert.ok((await call(`/api/v1/contributions?languageId=${language.id}`,author)).data.submissions.some(item=>item.id===draftId));
    assert.equal((await call(`/api/v1/contributions?languageId=${language.id}`,learner)).data.submissions.some(item=>item.id===draftId),false);
    assert.equal((await call('/api/content?mine=true',{token:'invalid'})).status,401);
    console.log('PASS live native bearer access to existing contribution handlers, private draft ownership and invalid-token denial');
  }
  assert.equal((await call('/api/v1/learning',reviewer,{action:'withdraw',data:{id:resourceId,version}})).status,200);
  assert.equal((await manifest()).data.downloads.length,0);
  assert.equal((await call('/api/v1/saved',learner)).data.items.some(item=>item.id===resourceId),false);
  assert.equal((await call('/api/v1/learning',learner,{action:'progress',data:{...activity,operationId:randomUUID()}})).status,404);
  console.log('PASS live withdrawal removes download eligibility/saved visibility and blocks fresh attempts');
  await browserLogin(learner);
}
run().catch(error=>{console.error('Live learning acceptance failed:',error.message);process.exitCode=1;}).finally(async()=>{
  try{
    if(draftId)await db.culturalRecord.deleteMany({where:{id:draftId,contributorId:{in:users},status:'draft',title:'Integration-only private draft'}});
    if(resourceId)await db.learningResource.deleteMany({where:{id:resourceId,createdBy:{in:users},title:'Integration-only lesson'}});
    await db.auditLog.deleteMany({where:{userId:{in:users}}});
    if(rateLimitKeys.length)await db.systemSetting.deleteMany({where:{key:{in:rateLimitKeys}}});
    await db.user.deleteMany({where:{id:{in:users},email:{endsWith:'@example.invalid'},name:{startsWith:'Integration '}}});
    console.log('CLEANUP isolated synthetic records removed; existing accounts/content untouched');
  }catch{console.error('Synthetic cleanup needs inspection; no broad deletion attempted.');process.exitCode=1;}
  await db.$disconnect();
});
