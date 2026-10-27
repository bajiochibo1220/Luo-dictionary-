// Real components with isolated fixture transport. No production accounts/content.
const fs=require('node:fs');const path=require('node:path');const os=require('node:os');
const http=require('node:http');const {spawn}=require('node:child_process');const assert=require('node:assert/strict');
async function main(){
 const source=`import React,{useState} from 'react';import{createRoot}from'react-dom/client';import{TutorWorkspace}from'@/components/shared/tutor-workspace';import{GameBoard}from'@/components/shared/game-board';import{ObjViewer}from'@/components/shared/obj-viewer';
 const params=new URLSearchParams(location.search),kind=params.get('kind')||'tutor';window.fixtureCalls=[];
 const request=async(url,options)=>{const data=JSON.parse(options.body);window.fixtureCalls.push(data);return data.mode==='vocabulary'?{attemptId:'fixture',questions:[{id:'q',prompt:'Fixture word',choices:['Meaning','Other']}]}:data.mode==='grade'?{score:100,results:[{id:'q',correct:true,answer:0,explanation:'Fixture explanation'}]}:{text:'Fixture tutor feedback',sources:[]};};
 function Game(){const[answers,setAnswers]=useState({});return <GameBoard origin={location.origin} answers={answers} onAnswer={(id,value)=>setAnswers(old=>({...old,[id]:value}))} onReset={()=>setAnswers({})} resource={{id:'fixture',version:1,body:{gameMode:kind,timeLimit:15,questions:[{id:'q:one',prompt:'Fixture prompt',choices:['Meaning','Other'],answer:0,letters:'gninaeM'}]}}}/>;}
 createRoot(document.getElementById('root')).render(kind==='tutor'?<TutorWorkspace request={request} languageId={1}/>:kind==='obj'?<ObjViewer address='/model.obj'/>:<Game/>);`;
 const bundle=await require('esbuild').build({stdin:{contents:source,loader:'tsx',resolveDir:process.cwd()},bundle:true,write:false,jsx:'automatic',platform:'browser',tsconfig:path.resolve('tsconfig.json'),define:{'process.env.NODE_ENV':'"production"'}});
 const css=await require('postcss')([require('@tailwindcss/postcss')()]).process(fs.readFileSync('src/app/globals.css','utf8'),{from:path.resolve('src/app/globals.css')});
 const server=http.createServer((req,res)=>{if(req.url==='/bundle.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].text);}else if(req.url==='/style.css'){res.setHeader('Content-Type','text/css');res.end(css.css);}else if(req.url==='/model.obj'){res.end('v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n');}else{res.setHeader('Content-Type','text/html');res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><div id="root"></div><script src="/bundle.js"></script>');}});
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
 for(const width of[320,390,1440]){
 await command('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<600});
 await command('Page.navigate',{url:origin+'/?kind=tutor'});await wait('!!document.querySelector("textarea")');
 assert.equal(await evaluate('document.querySelector("button").disabled'),true);
 await set('textarea','Fixture practice sentence');await click('input[type=checkbox]');await click('button');await wait('document.body.textContent.includes("Fixture tutor feedback")');
 assert.equal(await evaluate('window.fixtureCalls[0].consent'),true);
 assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false,'Tutor overflow '+width);
 await set('select','vocabulary');await wait('!document.querySelector("textarea")');await click('button');await wait('!!document.querySelector("input[type=radio]")');await click('input[type=radio]');await evaluate('[...document.querySelectorAll("button")].find(node=>node.textContent.includes("Check my answers")).click()');await wait('document.body.textContent.includes("100%")');
 results.push({width,tutorConsent:true,feedback:true,vocabularyGrade:true,noOverflow:true});
 }
 for(const kind of['word_puzzle','story_completion','proverbs','memory','vocabulary_race','treasure_hunt','artifact']){
 await command('Page.navigate',{url:origin+'/?kind='+kind});await wait('!!document.querySelector("section[aria-label]")');
 if(kind==='word_puzzle'||kind==='story_completion')await set('input','Meaning');
 else if(kind==='proverbs')await set('select','0');
 else if(kind==='memory'){await click('button[aria-label="Card 1"]');await click('button[aria-label="Card 2"]');}
 else{if(kind==='vocabulary_race')await evaluate('[...document.querySelectorAll("button")].find(node=>node.textContent.includes("Start race")).click()');await evaluate('[...document.querySelectorAll("button")].find(node=>node.textContent==="Meaning").click()');}
 await wait('document.body.textContent.includes("1 / 1 answered")');
 assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false,'Game overflow '+kind);results.push({kind,interaction:true});
 }
 await command('Page.navigate',{url:origin+'/?kind=obj'});await wait('!!document.querySelector("button")');await click('button');await wait('!!document.querySelector("canvas")||!!document.querySelector("[role=alert]")');
 assert.equal(await evaluate('document.querySelector("[role=alert]")?.textContent||""'),'','OBJ rendering must initialize');
 assert.ok(await evaluate('!!document.querySelector("canvas").getContext("webgl")'));
 await evaluate('[...document.querySelectorAll("button")].find(node=>node.textContent==="Zoom in").click()');
 assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false);results.push({kind:'obj',loaded:true,webgl:true,zoom:true,noOverflow:true});
 fs.writeFileSync('docs/system-audit/prd-ui-verification.json',JSON.stringify({fixtureTransport:true,productionWrites:false,results},null,2)+'\n');console.log('PASS '+results.length+' real component journeys: tutor consent/feedback/quiz at 320, 390, 1440px, seven game interactions and OBJ WebGL initialization.');
 }finally{socket?.close();chrome.kill();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error.stack);process.exitCode=1;});
