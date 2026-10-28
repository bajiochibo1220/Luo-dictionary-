const test=require('node:test'),assert=require('node:assert/strict');const {loader}=require('./load-ts.cjs');const React=require('react');const {renderToStaticMarkup}=require('react-dom/server');
async function mockedFetch(mock,fn){const old=global.fetch;global.fetch=mock;try{await fn();}finally{global.fetch=old;}}
const options={key:'fixture-key',model:'fixture-model',prompt:'Question',instruction:'System',timeout:25000};
test('Interactions quota failure falls back to stateless generation, hides thoughts and avoids repeated failed transport',async()=>{
 let paths=[];const {requestGemini}=loader()('src/lib/ai/gemini-request.ts');
 await mockedFetch(async(url,init)=>{paths.push(url);const body=JSON.parse(init.body);if(url.endsWith('/interactions')){assert.equal(body.store,false);return new Response('{}',{status:429});}assert.equal(body.contents[0].parts[0].text,'Question');return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{thought:true,text:'PRIVATE THOUGHT'},{text:'Usable answer'}]}}]});},async()=>{
  const first=await requestGemini(options),second=await requestGemini(options);assert.equal(first.status,'completed');assert.equal(second.status,'completed');assert.doesNotMatch(JSON.stringify(first),/PRIVATE/);assert.equal(paths.filter(p=>p.endsWith('/interactions')).length,1);assert.equal(paths.length,3);
 });
});
test('provider key rejection does not retry through another transport',async()=>{
 let calls=0;await mockedFetch(async()=>{calls++;return new Response('{}',{status:403});},async()=>{await assert.rejects(loader()('src/lib/ai/gemini-request.ts').requestGemini(options),e=>e.status===503&&e.providerStatus===403);assert.equal(calls,1);});
});
test('exhausted generation quota is returned clearly rather than fabricated output',async()=>{
 let calls=0;await mockedFetch(async()=>{calls++;return new Response('{}',{status:429});},async()=>{await assert.rejects(loader()('src/lib/ai/gemini-request.ts').requestGemini(options),e=>e.status===429);assert.equal(calls,2);});
});
test('incomplete generated answers cannot be accepted as completed output',async()=>{
 await mockedFetch(async(url)=>url.endsWith('interactions')?new Response('{}',{status:503}):Response.json({candidates:[{finishReason:'MAX_TOKENS',content:{parts:[{text:'Partial answer'}]}}]}),async()=>{
  const answer=await loader()('src/lib/ai/gemini-request.ts').requestGemini(options);assert.equal(answer.status,'incomplete');
 });
});
test('audio/image inline fallback and image generation preserve MIME types and request image output explicitly',async()=>{
 for(const illustration of [false,true]){
  await mockedFetch(async(url,init)=>{if(url.endsWith('interactions'))return new Response('{}',{status:503});const body=JSON.parse(init.body);if(illustration)assert.deepEqual(body.generationConfig.responseModalities,['TEXT','IMAGE']);else assert.equal(body.contents[0].parts[1].inlineData.mimeType,'audio/wav');return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{inlineData:{data:'aW1hZ2U=',mimeType:'image/png'}}]}}]});},async()=>{
   const result=await loader()('src/lib/ai/gemini-request.ts').requestGemini({...options,illustration,...(!illustration?{media:{type:'audio',mime:'audio/wav',bytes:Buffer.from('wav')}}:{})});assert.equal(result.steps[0].content[0].mime_type,'image/png');
  });
 }
});
test('native chunked file reads stop as soon as the size limit is exceeded',async()=>{
 let canceled=false,pulls=0;const stream=new ReadableStream({pull(controller){pulls++;controller.enqueue(new Uint8Array(4));},cancel(){canceled=true;}});
 const {readMediaBlob}=loader()('src/lib/media-download-client.ts');await assert.rejects(readMediaBlob(new Response(stream),5),/too large/);assert.equal(canceled,true);assert.ok(pulls<=3);
 const blob=await readMediaBlob(new Response('audio',{headers:{'content-type':'audio/mpeg'}}),100);assert.equal(blob.type,'audio/mpeg');assert.equal(blob.size,5);
});
test('AI feature requests allow generation time without extending ordinary API requests',()=>{
 const {apiRequestTimeout}=loader()('src/lib/api-request-timeout.ts');assert.equal(apiRequestTimeout('/api/v1/ai-tools','POST'),90000);assert.equal(apiRequestTimeout('https://heritage.test/api/v1/tutor','post'),90000);assert.equal(apiRequestTimeout('/api/v1/ai-tools','GET'),40000);assert.equal(apiRequestTimeout('/api/v1/account','GET'),40000);
});
test('editors and publishers can discover early publishing through their own navigation',()=>{
 const {AdminSidebar}=loader({'next/navigation':{usePathname:()=>'/admin/dashboard'},'./navigation-link':{NavigationLink:({children,...props})=>React.createElement('a',props,children)}})('src/components/layout/admin-sidebar.tsx');
 for(const role of ['content_editor','publisher','uploader','language_admin']){const html=renderToStaticMarkup(React.createElement(AdminSidebar,{isSuperAdmin:false,roles:[{role}]}));assert.match(html,/href="\/admin\/content"/);assert.doesNotMatch(html,/href="\/super-admin\/system"/);}
});
test('specialist role dashboards show assigned tasks and keep their queries within assigned languages',async()=>{
 for(const role of ['uploader','content_editor','publisher']){
  const calls=[];const page=loader({'@/lib/auth':{auth:async()=>({user:{id:'staff',languageRoles:[{role,languageId:4,languageName:'Dholuo'}]}})},'@/lib/db':{prisma:{culturalRecord:{count:async q=>{calls.push(q);return 3;}}}}})('src/app/(admin)/admin/dashboard/page.tsx');
  const html=renderToStaticMarkup(await page.default());for(const q of calls)assert.deepEqual(q.where.languageId,{in:[4]});
  if(role==='uploader'){assert.match(html,/Uploads to complete/);assert.equal(calls[0].where.contributorId,'staff');assert.doesNotMatch(html,/Ready to publish/);}
  if(role==='content_editor'){assert.match(html,/Review &amp; edit/);assert.doesNotMatch(html,/Ready to publish/);}
  if(role==='publisher'){assert.match(html,/Ready to publish/);assert.doesNotMatch(html,/Uploads to complete/);}
 }
});

test('the admin media manager renders Cloudinary audio as audio, not a black video player',()=>{
 const asset={id:'audio',type:'audio',resourceType:'video',format:'wav',url:'/api/media/audio/file',publicId:'private',sizeBytes:100,createdAt:new Date().toISOString(),languageId:1,language:{code:'luo',nativeName:'Dholuo'}};
 let index=0;const {MediaGrid}=loader({'react':{...React,useState:initial=>[index++===0?asset:initial,()=>{}]},'next/navigation':{useRouter:()=>({refresh(){}})},'@/components/shared/media-preview':{MediaAudio:props=>React.createElement('audio',props),MediaVideo:props=>React.createElement('video',props),MediaImage:props=>React.createElement('img',props)}})('src/components/admin/media-grid.tsx');
 const html=renderToStaticMarkup(React.createElement(MediaGrid,{assets:[asset],canDelete:false}));assert.match(html,/<audio/);assert.doesNotMatch(html,/<video/);
});
test('original playback fallback preserves API authorization and the same asset URL',()=>{
 const {originalMediaSource}=loader()('src/lib/media-preview.ts');assert.equal(originalMediaSource('/api/media/one/file'),'/api/media/one/file?original=1');assert.equal(originalMediaSource('https://api.test/api/media/one/file'),'https://api.test/api/media/one/file?original=1');assert.equal(originalMediaSource('blob:local'),null);assert.equal(originalMediaSource('/api/media/one/file?original=1'),null);
});

test('vocabulary includes reviewed dictionary uploads and invalidates a replaced source version',async()=>{
 let receipt,available=4;const words=['one','two','three','four'].map((english,i)=>({id:'source-'+i,data:{dholuo:'word-'+i,english},updatedAt:new Date('2026-10-28T08:00:00Z')}));
 const {tutor}=loader({'@/lib/db':{prisma:{language:{findFirst:async()=>({id:1,nativeName:'Dholuo'})},dictionaryEntry:{findMany:async()=>[]},culturalRecord:{findMany:async q=>{assert.equal(q.where.module.code,'dictionary');assert.equal(q.where.isProvisional,false);assert.equal(q.where.status,'published');return words;},count:async q=>{assert.equal(q.where.isProvisional,false);assert.ok(q.where.OR.every(clause=>clause.updatedAt instanceof Date));return available;}},activityReceipt:{create:async({data})=>{receipt={...data,createdAt:new Date()};},findUnique:async()=>receipt}}},'@/lib/analytics':{trackEvent:async()=>{}}})('src/lib/tutor-service.ts');
 const quiz=await tutor({mode:'vocabulary',languageId:1,consent:true},'reader');assert.equal(quiz.questions.length,4);assert.equal(quiz.questions[0].id,'record:source-0');assert.equal(quiz.questions[0].sourceVersion,undefined);
 const answers=Object.fromEntries(receipt.result.questions.map(q=>[q.id,q.answer]));assert.equal((await tutor({mode:'grade',attemptId:quiz.attemptId,answers,consent:true},'reader')).score,100);
 available=3;await assert.rejects(tutor({mode:'grade',attemptId:quiz.attemptId,answers,consent:true},'reader'),error=>error.status===409);
});
