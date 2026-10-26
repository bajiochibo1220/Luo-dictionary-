const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {loader}=require('./load-ts.cjs');

test('public projections remove operational identities, honor named attribution and serialize media safely',()=>{
  const {publicFields}=loader()('src/lib/public-projection.ts');
  const record={id:'record',title:'Public',contributorId:'private-owner',sourceReference:'private-source',provenance:[{collector:'private-collector'}],data:{text:'Public text',sourcePermission:'confirmed',attributionPreference:'anonymous',narrator:'private-name'},media:[{id:'image',type:'image',url:'https://provider.invalid/private-path',publicId:'private-storage',checksum:'private-checksum',sizeBytes:42n}]};
  const result=publicFields(record);assert.equal(JSON.stringify(result).includes('private'),false);assert.equal(result.media[0].sizeBytes,42);assert.equal(result.media[0].url,'/api/media/image/file');
  assert.equal(publicFields({narrator:'Permitted credit',attributionPreference:'name'}).narrator,'Permitted credit');
  assert.equal(publicFields({sizeBytes:9007199254740993n}).sizeBytes,'9007199254740993');
});

test('native legacy API authentication reloads roles and never falls back to browser cookies',async()=>{
  let authorization='Bearer invalid',browserCalls=0;
  const load=loader({
    'next-auth':()=>({auth:async()=>{browserCalls++;return {user:{id:'browser-owner'}};}}),
    'next/headers':{headers:async()=>new Headers(authorization?{Authorization:authorization}:{}),cookies:async()=>({})},
    '@/lib/native-auth':{getNativeSessionUserId:async value=>value==='Bearer valid'?'native-owner':null},
    '@/lib/render-cache':{cacheForRender:callback=>callback},
    '@/lib/db':{prisma:{user:{findUnique:async()=>({id:'native-owner',status:'active',email:'native@example.invalid',name:'Native',image:null,isSuperAdmin:false,isMasterSuperAdmin:false,languageRoles:[{languageId:1,role:'contributor',language:{code:'luo',name:'Dholuo'}}]})}}},
  });
  const {auth}=load('src/lib/auth.ts');
  assert.equal(await auth(),null);assert.equal(browserCalls,0);
  authorization='Bearer valid';const session=await auth();
  assert.equal(session.user.id,'native-owner');assert.equal(session.user.languageRoles[0].languageCode,'luo');assert.equal(browserCalls,0);
  authorization=null;assert.equal((await auth()).user.id,'browser-owner');assert.equal(browserCalls,1);
});
test('reset links are hashed, atomically single-use and revoke refresh grants and sessions',async()=>{
  const token='a'.repeat(43),digest=createHash('sha256').update(token).digest('hex');
  let consumed=false;const revocations=[];
  const tx={
    verificationToken:{findUnique:async({where})=>{assert.equal(where.token,'reset:'+digest);return consumed?null:{identifier:'account-reset:owner',expires:new Date(Date.now()+60000)};},deleteMany:async query=>{revocations.push(query);if(query.where.token){consumed=true;return {count:1};}return {count:1};}},
    user:{updateMany:async({data})=>{assert.equal(data.passwordHash,'hashed');assert.deepEqual(data.sessionVersion,{increment:1});return {count:1};}},
    session:{deleteMany:async query=>{assert.equal(query.where.userId,'owner');}},auditLog:{create:async()=>{}},
  };
  const {completeAccountEmail}=loader({'bcryptjs':{hash:async()=> 'hashed'},'@/lib/db':{prisma:{$transaction:async callback=>callback(tx)}}})('src/lib/account-security.ts');
  await completeAccountEmail(token,'reset','long-test-password');
  assert.equal(consumed,true);assert.match(JSON.stringify(revocations),/phone-login/);assert.match(JSON.stringify(revocations),/userId/);
  await assert.rejects(completeAccountEmail(token,'reset','long-test-password'),error=>error.status===400);
});
test('expired reset links cannot update passwords',async()=>{
  const {completeAccountEmail}=loader({'bcryptjs':{hash:async()=> 'hashed'},'@/lib/db':{prisma:{$transaction:async callback=>callback({verificationToken:{findUnique:async()=>({identifier:'account-reset:owner',expires:new Date(0)})},user:{updateMany:()=>assert.fail('No expired-link write')}})}}})('src/lib/account-security.ts');
  await assert.rejects(completeAccountEmail('b'.repeat(43),'reset','long-password'),error=>error.status===400);
});
test('account deletion preserves institutional ownership until it is explicitly transferred',async()=>{
  const tx={verificationToken:{findUnique:async()=>({identifier:'account-delete:master',expires:new Date(Date.now()+60000)}),deleteMany:()=>assert.fail('No ownership deletion')},user:{findUnique:async()=>({isMasterSuperAdmin:true})}};
  const {completeAccountEmail}=loader({'@/lib/db':{prisma:{$transaction:async callback=>callback(tx)}}})('src/lib/account-security.ts');
  await assert.rejects(completeAccountEmail('c'.repeat(43),'delete'),error=>error.status===409);
});
test('session-version changes invalidate existing browser JWTs',async()=>{
  let config;
  const load=loader({'next-auth':value=>{config=value;return {auth:async()=>null};},'@/lib/db':{prisma:{user:{findUnique:async()=>({status:'active',sessionVersion:2,isSuperAdmin:false,isMasterSuperAdmin:false,languageRoles:[]})}}}});
  load('src/lib/auth.ts');
  assert.equal(await config.callbacks.jwt({token:{id:'owner',sessionVersion:1}}),null);
  const refreshed=await config.callbacks.jwt({token:{id:'owner',sessionVersion:2}});
  assert.equal(refreshed.sessionVersion,2);
});
