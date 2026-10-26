require('dotenv').config({quiet:true});
const {PrismaClient}=require('@prisma/client');const db=new PrismaClient({log:[]});
(async()=>{
 const rows=await db.$transaction(async tx=>{await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');return tx.systemSetting.findMany({where:{key:{in:['gemini_api_key','gemini_model','smtp_provider','smtp_from','smtp_password']}},select:{key:true,value:true}});},{timeout:20000});
 const settings=Object.fromEntries(rows.map(r=>[r.key,r.value]));
 const key=(process.env.GEMINI_API_KEY||settings.gemini_api_key||'').replace(/\s+/g,'');
 const result={database:'connected-read-only',googleConfigured:!!(process.env.AUTH_GOOGLE_ID&&process.env.AUTH_GOOGLE_SECRET),emailConfigured:!!((process.env.EMAIL_API_KEY||settings.smtp_password)&&(process.env.EMAIL_FROM||settings.smtp_from)),aiConfigured:!!key,publicAccountOriginConfigured:!!(process.env.APP_PUBLIC_URL||process.env.AUTH_URL||process.env.NEXTAUTH_URL)};
 if(key){const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models',{headers:{'x-goog-api-key':key},signal:AbortSignal.timeout(20000)});result.aiModelListStatus=response.status;if(response.ok){const data=await response.json();result.generationModels=data.models.filter(m=>m.supportedGenerationMethods?.includes('generateContent')).map(m=>m.name);result.embeddingModels=data.models.filter(m=>m.supportedGenerationMethods?.includes('embedContent')).map(m=>m.name);}}
 console.log(JSON.stringify(result,null,2));
})().catch(e=>{console.error('Service probe failed',e.code||e.name);process.exitCode=1;}).finally(()=>db.$disconnect());
