// Optional integration test against the configured database. All fixture writes,
// including rate counters and progress, run in ONE transaction that rolls back.
require('dotenv').config({quiet:true});
const assert=require('node:assert/strict');const {randomUUID}=require('node:crypto');
const {PrismaClient}=require('@prisma/client');const {loader}=require('../../tests/load-ts.cjs');
async function main(){
 if(!process.argv.includes('--rollback-only'))throw new Error('Use --rollback-only for this integration check.');
 const prisma=new PrismaClient();const host=randomUUID(),guest=randomUUID(),rollback=new Error('PRD_FIXTURE_ROLLBACK');let checked=false;
 try{
 await prisma.$transaction(async tx=>{
  const language=await tx.language.findFirst({where:{isActive:true,code:{not:'eng'}},select:{id:true}});assert.ok(language,'An active community is required.');
  for(const id of[host,guest])await tx.user.create({data:{id,email:`prd-fixture-${id}@example.invalid`,name:'Temporary rollback fixture'}});
  const resource=await tx.learningResource.create({data:{languageId:language.id,kind:'game',title:'Temporary rollback fixture',description:'Not committed cultural content',status:'published',consentScope:'public_excerpt',restrictionLevel:'public',createdBy:host,body:{gameMode:'battle',timeLimit:120,text:'',teacherNotes:'',activities:[],questions:[{id:'fixture-question',prompt:'Choose the fixture answer',choices:['Correct fixture','Other fixture'],answer:0,explanation:'Test fixture only'}]}}});
  const database=new Proxy(tx,{get(target,key){return key==='$transaction'?async work=>work(target):Reflect.get(target,key);}});
  const {mutateGame,readGame}=loader({'@/lib/db':{prisma:database}})('src/lib/game-service.ts');
  const room=await mutateGame(host,{action:'create',resourceId:resource.id});
  await mutateGame(guest,{action:'join',resourceId:resource.id,code:room.code});
  await assert.rejects(mutateGame(guest,{action:'start',roomId:room.id}),error=>error.status===403);
  await mutateGame(host,{action:'start',roomId:room.id});
  const active=await readGame(guest,room.id);assert.ok(active.questions.every(question=>!Object.hasOwn(question,'answer')));
  await mutateGame(host,{action:'submit',roomId:room.id,answers:{'fixture-question':0}});
  const finished=await mutateGame(guest,{action:'submit',roomId:room.id,answers:{'fixture-question':1}});
  assert.equal(finished.status,'finished');assert.deepEqual(finished.players.map(player=>player.score).sort((a,b)=>a-b),[0,100]);
  const states=await tx.learningState.findMany({where:{resourceId:resource.id}});assert.equal(states.length,2);assert.equal(states.find(state=>state.userId===host).completed,true);
  await assert.rejects(mutateGame(host,{action:'submit',roomId:room.id,answers:{'fixture-question':0}}),error=>error.status===409);
  checked=true;throw rollback;
 },{maxWait:15000,timeout:90000}).catch(error=>{if(error!==rollback)throw error;});
 assert.ok(checked);assert.equal(await prisma.user.count({where:{id:{in:[host,guest]}}}),0);
 console.log('PASS real PostgreSQL multiplayer create/join/host authorization/hidden keys/scoring/progress/replay checks; transaction rolled back and fixture accounts absent.');
 }finally{await prisma.$disconnect();}
}
main().catch(error=>{console.error(error instanceof assert.AssertionError?error.message:'Database integration check failed; transaction rolled back.');process.exitCode=1;});
