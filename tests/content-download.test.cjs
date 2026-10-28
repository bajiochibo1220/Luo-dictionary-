const test=require('node:test'),assert=require('node:assert/strict');const {loader}=require('./load-ts.cjs');
const id='10000000-0000-4000-8000-000000000001';
const asset=(index,type,format)=>({id:`10000000-0000-4000-8000-${String(index).padStart(12,'0')}`,type,format,caption:`Full ${type} caption`,altText:'Accessible description',sizeBytes:10n,url:`https://res.cloudinary.com/example/${index}.${format}`,publicId:`PRIVATE-STORAGE-${index}`,resourceType:type==='image'?'image':'video',deliveryType:'upload'});
const record=()=>({id,title:'Fishing equipment',summary:'Complete summary <script>alert(1)</script>',language:{id:1,code:'luo',name:'Dholuo',nativeName:'Dholuo'},data:{description:'FULL DESCRIPTION '+ 'long description '.repeat(300),materials:['Wood','Fibre'],examples:[{english:'Example sentence',speaker:'PRIVATE SPEAKER'}],collector:'PRIVATE COLLECTOR',internal_notes:'PRIVATE UNKNOWN FIELD'},tags:['Fishing'],module:{code:'artifacts',baseName:'Artifacts'},isProvisional:true,publishedAt:new Date('2026-10-28'),translations:[{title:'English artifact title',summary:'Complete English summary',data:{description:'Complete translated description',collector:'PRIVATE TRANSLATOR',transcript:'Embedded English transcript'},language:{code:'eng',name:'English',nativeName:'English'}}],transcripts:[{id:'transcript',text:'Every word of the original transcript. '+ 'words '.repeat(300),languageCode:'luo',timestamps:[{start:0,end:10,speaker:'PRIVATE SPEAKER'}]}],media:[asset(1,'image','png'),asset(2,'audio','mp3'),asset(3,'video','mp4'),asset(4,'document','pdf')]});
function service(data=record(),extra={}){return loader({'@/lib/db':{prisma:{culturalRecord:{findFirst:async query=>{assert.equal(query.where.status,'published');assert.ok(query.where.AND.some(rule=>rule.consentScope==='public_excerpt'));for(const selection of [query.select.media,query.select.transcripts])assert.ok(selection.where.AND.some(rule=>rule.restrictionLevel==='public'));return data;}},dictionaryEntry:{findFirst:async()=>data}}},'@/lib/cloudinary':{configureCloudinary:async()=>{},cloudinary:{utils:{private_download_url:()=> 'https://api.cloudinary.com/v1_1/test/download'}}},...extra})('src/lib/content-download.ts');}
const unzip=require('./read-download-zip.cjs');

async function fetchMock(mock,work){const previous=global.fetch;global.fetch=mock;try{return await work();}finally{global.fetch=previous;}}

test('complete item contains unabridged descriptions, translations, transcripts and every original media file',async()=>{
 const s=service(),bundle=await s.prepareContentDownload(id,'cultural');const fetched=[];
 await fetchMock(async url=>{fetched.push(String(url));return new Response('ORIGINAL BYTES: '+url);},async()=>{
  const files=unzip(Buffer.from(await new Response(await s.streamContentDownload(bundle,new AbortController().signal)).arrayBuffer()));
  for(const name of ['index.html','descriptions.txt','metadata.json','README.txt'])assert.ok(files[name]);assert.equal(Object.keys(files).filter(name=>name.startsWith('media/')).length,4);assert.equal(Object.keys(files).filter(name=>name.startsWith('transcripts/')).length,2);
  const description=files['descriptions.txt'].toString();assert.ok(description.includes(record().data.description));assert.match(description,/Complete translated description/);assert.match(description,/Full video caption/);
  const text=Object.entries(files).filter(([name])=>!name.startsWith('media/')).map(([,bytes])=>bytes.toString()).join('\n');assert.doesNotMatch(text,/PRIVATE (COLLECTOR|TRANSLATOR|SPEAKER|UNKNOWN)|PRIVATE-STORAGE|api\.cloudinary/);assert.match(files['index.html'].toString(),/&lt;script&gt;/);assert.doesNotMatch(files['index.html'].toString(),/<script>/);assert.match(files['index.html'].toString(),/<video src="media\//);
  assert.ok(Object.values(files).some(value=>value.toString().includes(record().transcripts[0].text)));for(const [index,entry]of bundle.entries.entries())assert.equal(files[entry.file].toString(),'ORIGINAL BYTES: '+record().media[index].url);assert.equal(fetched.length,4);
 });
});
test('dictionary entries with structured examples and no media also download completely',async()=>{
 const data={id,dholuo:'Dholuo word',english:'Full definition',kiswahili:'Translation',examples:[{dholuo:'Example',english:'English example'}],synonyms:['related'],antonyms:[],language:{id:1,code:'luo',nativeName:'Dholuo'},media:[]};const s=service(data),bundle=await s.prepareContentDownload(id,'dictionary');
 const files=unzip(Buffer.from(await new Response(await s.streamContentDownload(bundle,new AbortController().signal)).arrayBuffer()));assert.match(files['descriptions.txt'].toString(),/English example/);assert.match(files['metadata.json'].toString(),/Full definition/);assert.equal(Object.keys(files).length,4);
});
test('draft, withdrawn and restricted parent records cannot produce a public archive',async()=>{
 const s=service(null);await assert.rejects(s.prepareContentDownload(id,'cultural'),error=>error.status===404);
});
test('media addresses and redirects cannot fetch private network destinations',async()=>{
 for(const redirect of [false,true]){const data=record();data.media=[asset(1,'image','png')];if(!redirect)data.media[0].url='http://127.0.0.1/private';const s=service(data),bundle=await s.prepareContentDownload(id,'cultural');let requests=0;
 await fetchMock(async()=>{requests++;return new Response(null,{status:302,headers:{location:'https://private.example/secret'}});},async()=>{await assert.rejects(new Response(await s.streamContentDownload(bundle,new AbortController().signal)).arrayBuffer(),/source file/);});assert.equal(requests,redirect?1:0);}
});
test('a failed attachment aborts the ZIP rather than silently excluding the original file',async()=>{
 const data=record();data.media=[asset(1,'video','mp4')];const s=service(data),bundle=await s.prepareContentDownload(id,'cultural');
 await fetchMock(async()=>new Response('private provider error',{status:404}),async()=>{await assert.rejects(new Response(await s.streamContentDownload(bundle,new AbortController().signal)).arrayBuffer(),error=>/source file/.test(error.message)&&!error.message.includes('private provider'));});
});
test('the public download endpoint validates input and produces an attachment without exposing storage addresses',async()=>{
 const {NextRequest}=require('next/server');let calls=0;
 const route=loader({'@/lib/content-download':{ContentDownloadError:class extends Error{},prepareContentDownload:async(value,kind)=>{calls++;assert.equal(value,id);assert.equal(kind,'dictionary');return{filename:'word.zip',languageId:1};},streamContentDownload:async()=>new ReadableStream({start(controller){controller.enqueue(new Uint8Array([80,75]));controller.close();}})},'@/lib/analytics':{trackEvent:async()=>{}}})('src/app/api/v1/download/route.ts');
 assert.equal((await route.GET(new NextRequest('https://app.test/api/v1/download?id=invalid'))).status,400);assert.equal(calls,0);
 const result=await route.GET(new NextRequest(`https://app.test/api/v1/download?id=${id}&kind=dictionary`));assert.equal(result.status,200);assert.equal(result.headers.get('content-type'),'application/zip');assert.match(result.headers.get('content-disposition'),/attachment; filename="word.zip"/);assert.match(result.headers.get('cache-control'),/no-store/);await result.arrayBuffer();
});
test('feed downloads use the API host on bundled clients and do not depend on a text description existing',()=>{
 const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');const Link=({children,...props})=>React.createElement('a',props,children);const {ModuleContentView}=loader()('src/components/shared/module-content-view.tsx');
 const html=renderToStaticMarkup(React.createElement(ModuleContentView,{title:'Artifacts',baseName:'Artifacts',languageName:'Dholuo',languageCode:'luo',languageId:1,moduleCode:'artifacts',items:[{id,title:'Object with no description',summary:null,kind:'cultural',media:[]}],Link,downloadOrigin:'https://backend.example'}));assert.match(html,/Download complete item \(ZIP\)/);assert.ok(html.includes('https://backend.example/api/v1/download?id='+id));
});

test('cancelling a streamed download cancels the active upstream media reader',async()=>{
 const data=record();data.media=[asset(1,'video','mp4')];const s=service(data),bundle=await s.prepareContentDownload(id,'cultural');let started=false,cancelled=false,pulls=0;
 await fetchMock(async()=>{started=true;return new Response(new ReadableStream({pull(controller){pulls++;controller.enqueue(new Uint8Array(1024));},cancel(){cancelled=true;}}));},async()=>{
  const abort=new AbortController(),reader=(await s.streamContentDownload(bundle,abort.signal)).getReader();for(let i=0;i<100&&!started;i++)await reader.read();assert.equal(started,true);await reader.cancel();abort.abort();for(let i=0;i<50&&!cancelled;i++)await new Promise(resolve=>setTimeout(resolve,5));assert.equal(cancelled,true);const finalPulls=pulls;await new Promise(resolve=>setTimeout(resolve,20));assert.equal(pulls,finalPulls);
 });
});
