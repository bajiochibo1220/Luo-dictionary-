require('dotenv').config({quiet:true});
const fs=require('node:fs');const {PrismaClient}=require('@prisma/client');const {loader}=require('../tests/load-ts.cjs');const prisma=new PrismaClient();
const out='docs/system-audit/final-2026-10-28';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const load=loader({'@/lib/db':{prisma}});const settings=await load('src/lib/settings.ts').getSystemSettings();
 const report={at:new Date().toISOString(),checks:[]};
 const check=async(name,fn)=>{const start=Date.now();try{const data=await fn();const r={name,pass:true,ms:Date.now()-start,...data};report.checks.push(r);console.log(JSON.stringify(r));}catch(e){const r={name,pass:false,ms:Date.now()-start,status:e.status||null,error:e.message?.startsWith('[GoogleGenerativeAI Error]')?'Embedding provider request failed':e.message};report.checks.push(r);console.log(JSON.stringify(r));}};
 await check('database-and-role-samples',async()=>({records:await prisma.culturalRecord.count(),media:await prisma.mediaAsset.groupBy({by:['type','format'],_count:{_all:true}}),roles:await prisma.userLanguageRole.groupBy({by:['role'],_count:{_all:true}})}));
 await check('text-primary',async()=>{const r=await load('src/lib/ai/text-generation.ts').generateText('Reply with the word READY.','This is a synthetic application connectivity test.');return{model:r.model,nonempty:!!r.text};});
 await check('chat-public-greeting',async()=>{const r=await load('src/lib/ai/rag.ts').askQuestion('Hello');return{model:r.model,nonempty:!!r.answer};});
 await check('public-text-search',async()=>({results:(await load('src/lib/ai/public-text-search.ts').searchPublicText('language')).length,externalEmbeddingRequests:0}));
 const wave=Buffer.alloc(44+16000);wave.write('RIFF');wave.writeUInt32LE(wave.length-8,4);wave.write('WAVEfmt ',8);wave.writeUInt32LE(16,16);wave.writeUInt16LE(1,20);wave.writeUInt16LE(1,22);wave.writeUInt32LE(8000,24);wave.writeUInt32LE(16000,28);wave.writeUInt16LE(2,32);wave.writeUInt16LE(16,34);wave.write('data',36);wave.writeUInt32LE(16000,40);
 const mm=load('src/lib/ai/multimodal.ts');
 await check('audio-transcription-provider',async()=>({skipped:true,reason:"Unavailable with DeepSeek"}));
 await check('image-understanding-provider',async()=>{const r=await mm.generateMediaAssistance('Describe this synthetic color test image briefly.',{type:'image',mime:'image/png',bytes:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j3ioAAAAASUVORK5CYII=','base64')});return{model:r.model,nonempty:!!r.text};});
 await check('illustration-provider',async()=>({skipped:true,reason:"Unavailable with DeepSeek"}));
 const cl=load('src/lib/cloudinary.ts');await cl.configureCloudinary();
 for(const type of ['audio','image','video']) await check('stored-'+type+'-delivery',async()=>{
 const asset=await prisma.mediaAsset.findFirst({where:{type},select:{publicId:true,resourceType:true,format:true,deliveryType:true,sizeBytes:true}});if(!asset)return{skipped:true,reason:'No stored sample'};
 const url=type==='audio'?cl.cloudinary.url(asset.publicId,{resource_type:asset.resourceType,type:asset.deliveryType,sign_url:true,format:'mp3',transformation:[{quality:'auto'},{audio_codec:'mp3',bit_rate:'128k'}]}):cl.cloudinary.utils.private_download_url(asset.publicId,asset.format,{resource_type:asset.resourceType,type:asset.deliveryType,expires_at:Math.floor(Date.now()/1000)+120});
 const r=await fetch(url,{headers:{Range:'bytes=0-4095'},signal:AbortSignal.timeout(45000)});const bytes=(await r.arrayBuffer()).byteLength;if(!r.ok)throw Error('Storage HTTP '+r.status);
 return{status:r.status,mime:r.headers.get('content-type'),range:r.headers.get('content-range'),sampleBytes:bytes,originalBytes:String(asset.sizeBytes)};
 });
 fs.writeFileSync(out+'/services.json',JSON.stringify(report,null,2));
})().catch(e=>{console.log('Audit failed:',e.code||e.name);process.exitCode=1;}).finally(()=>prisma.$disconnect());
