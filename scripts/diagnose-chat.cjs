require('dotenv').config({quiet:true});
const {PrismaClient}=require('@prisma/client');const {loader}=require('../tests/load-ts.cjs');
const prisma=new PrismaClient();
(async()=>{
 const load=loader({'@/lib/db':{prisma}});
 const ProviderError=load('src/lib/ai/gemini-errors.ts').AiProviderError;
 async function check(name,fn){const started=Date.now();try{const data=await fn();console.log(JSON.stringify({name,pass:true,ms:Date.now()-started,...data}));}catch(e){console.log(JSON.stringify({name,pass:false,ms:Date.now()-started,code:e.code,status:e.status,error:e.name,reason:e.code==='P2028'?'Database transaction expired':e instanceof ProviderError?e.message:'Request failed'}));}}
 await check('configuration',async()=>{const s=await load('src/lib/settings.ts').getSystemSettings();return {keyConfigured:!!(process.env.DEEPSEEK_API_KEY||s.deepseek_api_key),provider:'deepseek',model:process.env.DEEPSEEK_MODEL||s.deepseek_model||'deepseek-flash',activeLanguages:(await prisma.language.findMany({where:{isActive:true},select:{code:true}})).map(l=>l.code)};});
 await check('quota-transaction',async()=>{await load('src/lib/ai/quota.ts').assertAiQuota(new Request('http://localhost/chatbot'));return {};});
 const rag=load('src/lib/ai/rag.ts');
 for(const question of ['Hello','Explain the role of proverbs in everyday conversation.','Show available cultural artifacts'])await check('chat: '+question,async()=>{const r=await rag.askQuestion(question);return {nonempty:!!r.answer,model:r.model,sources:r.sources.length,media:r.media.length};});
})().catch(e=>{console.log(JSON.stringify({fatal:e.name,code:e.code}));process.exitCode=1;}).finally(()=>prisma.$disconnect());
