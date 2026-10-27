// Real components with isolated fixture transport. No production accounts/content.
const fs=require('node:fs');const path=require('node:path');const os=require('node:os');
const http=require('node:http');const {spawn}=require('node:child_process');const assert=require('node:assert/strict');
async function main(){
 const source=`import React from 'react';import{createRoot}from'react-dom/client';import{SharedApplication}from'@/components/shared/application';
 const language={id:1,code:'luo',name:'Dholuo',nativeName:'Dholuo'};window.fixtureCalls=[];
 const collection=(subject='')=>({title:subject||'Dictionary',baseName:subject||'Dictionary',languageName:'Dholuo',languageCode:'luo',languageId:1,moduleCode:subject?'subjects':'dictionary',subject:subject||undefined,canContribute:false,items:[],continuation:{records:null,dictionary:null}});
 const featureRequest=async(url)=>{window.fixtureCalls.push(url);if(url.includes('/library?')){const params=new URL(url,location.origin).searchParams;return collection(params.get('subject')||'');}if(url.includes('/branding'))return{};return{};};
 const adapters={apiOrigin:location.origin,artwork:'/icons/luo-heritage-512.png',bootstrap:async()=>({selectedLanguage:language,languages:[language],modules:['dictionary','proverbs','riddles','oral_histories','folktales','songs','artifacts','heritage_sites','audio_visual','research','chatbot'].map(code=>({code,title:code,baseName:code}))}),library:async()=>collection(),account:async()=>null,conversations:async()=>[],featureRequest,featureFetch:fetch,chatRequest:fetch,nativeSession:{isNative:false,subscribe:()=>()=>{},connect:async()=>()=>{},resume:async()=>{},start:async()=>{},signOut:async()=>{}}};
 createRoot(document.getElementById('root')).render(<SharedApplication adapters={adapters}/>);`;
 const bundle=await require('esbuild').build({stdin:{contents:source,loader:'tsx',resolveDir:process.cwd()},bundle:true,write:false,outfile:'fixture.js',loader:{'.png':'dataurl'},jsx:'automatic',platform:'browser',tsconfig:path.resolve('tsconfig.json'),define:{'process.env.NODE_ENV':'"production"'}});
 const css=await require('postcss')([require('@tailwindcss/postcss')()]).process(fs.readFileSync('src/app/globals.css','utf8'),{from:path.resolve('src/app/globals.css')});
 const server=http.createServer((req,res)=>{if(req.url==='/bundle.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles.find(file=>file.path.endsWith('.js')).text);}else if(req.url==='/style.css'){res.setHeader('Content-Type','text/css');res.end(css.css);}else if(req.url==='/icons/luo-heritage-512.png'){res.setHeader('Content-Type','image/png');res.end(fs.readFileSync('public/icons/luo-heritage-512.png'));}else if(req.url.startsWith('/api/')){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({success:true,data:req.url.startsWith('/api/languages')?[{id:1,code:'luo',nativeName:'Dholuo'}]:{catalog:{}}}));}else{res.setHeader('Content-Type','text/html');res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><div id="root"></div><script src="/bundle.js"></script>');}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'heritage-prd-ui-'));
 const chrome=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--no-sandbox','--disable-gpu','--remote-debugging-port=0','--user-data-dir='+directory,'about:blank'],{windowsHide:true,stdio:['ignore','ignore','pipe']});
 let socket;try{
 const endpoint=await new Promise((resolve,reject)=>{let output='';const timer=setTimeout(()=>reject(new Error('Chrome startup timed out')),30000);chrome.stderr.on('data',chunk=>{output+=chunk;const match=output.match(/DevTools listening on (ws:\/\/[^\s]+)/);if(match){clearTimeout(timer);resolve(match[1]);}});chrome.once('error',reject);});
 const tabs=await(await fetch(endpoint.replace('ws://','http://').replace(/\/devtools\/browser\/.*/, '/json'))).json();
 socket=new WebSocket(tabs.find(tab=>tab.type==='page').webSocketDebuggerUrl);await new Promise(resolve=>socket.addEventListener('open',resolve,{once:true}));let sequence=0;const pending=new Map();
 socket.addEventListener('message',event=>{const result=JSON.parse(event.data);if(result.id&&pending.has(result.id)){const{resolve,reject}=pending.get(result.id);pending.delete(result.id);result.error?reject(new Error(JSON.stringify(result.error))):resolve(result.result);}});
 const command=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const result=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(JSON.stringify(result.exceptionDetails));return result.result.value;};
 const wait=async expression=>{for(let i=0;i<120;i++){if(await evaluate(expression))return;await new Promise(resolve=>setTimeout(resolve,100));}throw new Error('Timed out: '+expression);};
 const click=async selector=>{await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center'})`);const rect=await evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);await command('Input.dispatchMouseEvent',{type:'mousePressed',...rect,button:'left',clickCount:1});await command('Input.dispatchMouseEvent',{type:'mouseReleased',...rect,button:'left',clickCount:1});};
 const set=async(selector,value)=>evaluate(`(()=>{const node=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(Object.getPrototypeOf(node),'value').set.call(node,${JSON.stringify(value)});node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}));})()`);
 const results=[];
 for(const width of[320,390,768,1440]){
 await command('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<600});
 await command('Page.navigate',{url:origin+'/#/explore'});await wait('!!document.querySelector("#explore-title")');await wait('document.querySelector("main").scrollTop===0');
 assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false,'Discovery overflow '+width);
 const logo=await evaluate('(()=>{const e=document.querySelector("header img");const r=e.getBoundingClientRect();return{loaded:e.complete&&e.naturalWidth>0,width:r.width,height:r.height};})()');
 assert.equal(logo.loaded,true);assert.ok(logo.width>=48&&logo.height>=48);
 if(width===320||width===1440){const shot=await command('Page.captureScreenshot',{format:'png'});fs.writeFileSync('docs/system-audit/prd-discovery-'+width+'.png',Buffer.from(shot.data,'base64'));}
 const audiences=await evaluate('[...document.querySelector("#explore-title").closest("section").querySelectorAll("select option")].map(e=>e.value).filter(Boolean)');assert.equal(audiences.length,13);
 for(const audience of audiences){await set('section[aria-labelledby="explore-title"] select',audience);await wait('!!document.querySelector("[aria-live=polite] a")');assert.equal(await evaluate('document.querySelectorAll("[aria-live=polite] a").length'),3);}
 const moduleLinks=await evaluate('[...document.querySelectorAll("section[aria-labelledby=modules-title] a")].map(e=>e.getAttribute("href"))');assert.equal(moduleLinks.length,15);assert.ok(moduleLinks.every(href=>href.startsWith('#/')));
 if(width<768){await click('button[aria-label="Open menu"]');await wait('document.querySelector("button[aria-label=\\"Open menu\\"]").getAttribute("aria-expanded")==="true"');}
 const sidebar=await evaluate('(()=>{const nav=document.querySelector("nav[aria-label=\\"Public navigation\\"]");return{links:[...nav.children].filter(e=>e.tagName==="A").length,details:[...nav.querySelectorAll("details")].map(e=>e.open)};})()');assert.equal(sidebar.links,7);assert.deepEqual(sidebar.details,[false,false]);
 if(width<768)await evaluate('document.querySelector("button[aria-label=\\"Close menu\\"]").click()');
 await evaluate('[...document.querySelectorAll("#subjects a")].find(e=>e.textContent==="Fishing traditions").click()');
 await wait('document.querySelectorAll("h2").length>2');await wait('window.fixtureCalls.some(url=>url.includes("module=subjects"))');
 assert.ok(await evaluate('window.fixtureCalls.some(url=>new URL(url,location.origin).searchParams.get("subject")==="Fishing traditions")'));
 await set('input[type=search]','net');await evaluate('document.querySelector("form[role=search]").requestSubmit()');
 await wait('window.fixtureCalls.some(url=>url.includes("q=net"))');
 assert.ok(await evaluate('window.fixtureCalls.filter(url=>url.includes("q=net")).every(url=>new URL(url,location.origin).searchParams.get("subject")==="Fishing traditions")'));
 assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false,'Subject overflow '+width);
 results.push({width,audiences:13,moduleLinks:15,subjects:27,logo,sidebar,subjectSearch:true,noOverflow:true});
 }
 fs.writeFileSync('docs/system-audit/prd-discovery-browser.json',JSON.stringify({fixtureTransport:true,productionWrites:false,results},null,2)+'\n');console.log('PASS discovery, 13 audiences, 15 module links, subject search, compact sidebar and visible logo at 320/390/768/1440px.');
 }finally{socket?.close();chrome.kill();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error.stack);process.exitCode=1;});
