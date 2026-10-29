// Exercise real registration, bcrypt, credential checks and JWT/session callbacks.
// All temporary database work, including consent and rate limits, is rolled back.
require('dotenv').config({quiet:true});
const assert=require('node:assert/strict');const fs=require('node:fs');const {randomUUID,randomBytes}=require('node:crypto');
const {PrismaClient}=require('@prisma/client');const {loader}=require('../tests/load-ts.cjs');
const db=new PrismaClient();const email=`auth-review-${randomUUID()}@example.invalid`;const password=randomBytes(24).toString('base64url');
const rollback=new Error('EXPECTED_AUDIT_ROLLBACK');const report={checks:[],retainedAccounts:0,retainedConsentRows:0};
(async()=>{
 let identity;
 try{await db.$transaction(async tx=>{
   const prisma=new Proxy(tx,{get(target,key){return key==='$transaction'?fn=>fn(tx):Reflect.get(target,key);}});
   let config;
   const load=loader({'@/lib/db':{prisma},'next-auth':options=>{config=options;return {};},'next-auth/providers/credentials':options=>options,'next-auth/providers/google':options=>options,'@auth/prisma-adapter':{PrismaAdapter:()=>({})},'next/headers':{}});
   const {POST}=load('src/app/api/auth/register/route.ts');
   const language=await tx.language.findFirst({where:{isActive:true,code:{not:'eng'}},select:{id:true}});assert.ok(language);
   const request=()=>new Request('http://localhost/api/auth/register',{method:'POST',headers:{Origin:'http://localhost','Content-Type':'application/json'},body:JSON.stringify({name:'Temporary auth verification',email:email.toUpperCase(),password,dateOfBirth:{day:1,month:1,year:2000},interests:['community_member'],languageId:language.id,acceptedTerms:true})});
   const response=await POST(request());const body=await response.json();assert.equal(body.success,true);identity=body.data.id;
   const stored=await tx.user.findUnique({where:{id:identity}});assert.equal(stored.email,email);assert.notEqual(stored.passwordHash,password);report.checks.push('Real registration and normalized email with a bcrypt password hash');
   assert.equal((await POST(request())).status,400);report.checks.push('Duplicate email rejected');
   load('src/lib/auth.ts');const authorize=config.providers[1].authorize;
   const user=await authorize({email:email.toUpperCase(),password});assert.equal(user.id,identity);
   const token=await config.callbacks.jwt({token:{},user});assert.equal(token.id,identity);
   const session=await config.callbacks.session({session:{user:{}},token});assert.equal(session.user.id,identity);assert.equal(session.user.isSuperAdmin,false);report.checks.push('Real credential verification and ordinary-account JWT/session callbacks');
   await assert.rejects(authorize({email,password:'Incorrect-test-password'}));report.checks.push('Wrong password rejected');
   await tx.user.update({where:{id:identity},data:{status:'suspended'}});await assert.rejects(authorize({email,password}));report.checks.push('Suspended account rejected');
   assert.equal(await tx.consentRecord.count({where:{contributorName:'Temporary auth verification'}}),1);throw rollback;
 },{timeout:45000,maxWait:10000});}catch(error){if(error!==rollback)throw error;}
 report.retainedAccounts=await db.user.count({where:{email}});report.retainedConsentRows=await db.consentRecord.count({where:{contributorName:'Temporary auth verification'}});
 assert.equal(report.retainedAccounts,0);assert.equal(report.retainedConsentRows,0);report.rolledBack=true;
 fs.writeFileSync('docs/system-audit/auth-transaction-2026-10-29.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
})().catch(error=>{console.error('Auth transaction verification failed:',error.code||error.name);process.exitCode=1;}).finally(()=>db.$disconnect());
