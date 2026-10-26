require('dotenv').config({quiet:true});
const {PrismaClient}=require('@prisma/client');
const db=new PrismaClient({log:[]});
const timer=setTimeout(()=>{console.log('DATABASE_READ_TIMEOUT');process.exit(2)},45000);
(async()=>{
 const result=await db.$transaction(async tx=>{
  await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
  return {
   languages:await tx.language.findMany({select:{code:true,isActive:true}}),
   modules:await tx.module.findMany({select:{code:true,isActive:true,isStub:true}}),
   dictionary:await tx.dictionaryEntry.groupBy({by:['status','consentScope','restrictionLevel'],_count:true}),
   records:await tx.culturalRecord.groupBy({by:['moduleId','status','consentScope','restrictionLevel'],_count:true}),
   moduleIds:await tx.module.findMany({select:{id:true,code:true}}),
   media:await tx.mediaAsset.groupBy({by:['type'],_count:true}),
   transcripts:await tx.transcript.count(), embeddings:await tx.embedding.count()
  };
 },{timeout:35000,maxWait:5000});
 console.log(JSON.stringify(result,null,2));
})().catch(e=>{console.log('DATABASE_READ_FAILED',e.code||e.name);process.exitCode=1}).finally(async()=>{clearTimeout(timer);await db.$disconnect()});
