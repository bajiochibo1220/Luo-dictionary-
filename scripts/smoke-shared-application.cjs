// Browser/IndexedDB/service-worker acceptance. Only the API transport is mocked;
// UI, bundle, browser offline/reload and persistent storage are real. No writes
// to the real database or third-party providers.
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');const os=require('node:os');const path=require('node:path');const {spawn}=require('node:child_process');
const base=process.env.SMOKE_BASE_URL||'http://127.0.0.1:3000';
const id='22222222-2222-4222-8222-222222222222',owner='11111111-1111-4111-8111-111111111111';
async function until(check,label){console.log("CHECK "+label);const end=Date.now()+60000;while(Date.now()<end){if(await check())return;await new Promise(resolve=>setTimeout(resolve,200));}throw new Error('Timed out: '+label);}
async function main(){
 const profile=await fs.mkdtemp(path.join(os.tmpdir(),'luo-shared-app-'));
 const port=await new Promise(resolve=>{const server=require('node:net').createServer();server.listen(0,'127.0.0.1',()=>{const value=server.address().port;server.close(()=>resolve(value));});});
 const chrome=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port='+port,'--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});
 let socket;
 try{
  let target;await until(async()=>{try{target=(await(await fetch('http://127.0.0.1:'+port+'/json/list')).json()).find(item=>item.type==='page');return !!target;}catch{return false;}},'browser');
  socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise(resolve=>socket.addEventListener('open',resolve,{once:true}));let sequence=0;const pending=new Map();let synchronized=0;
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;const timer=setTimeout(()=>{pending.delete(id);reject(new Error('Browser command timed out: '+method));},30000);pending.set(id,{resolve:value=>{clearTimeout(timer);resolve(value);},reject});socket.send(JSON.stringify({id,method,params}));});
  const resource={id,languageId:1,kind:'lesson',title:'Synthetic offline lesson',description:'Transport fixture',level:'beginner',audience:'all',body:{text:'Synthetic approved offline reading.',questions:[{id:'q1',prompt:'Choose second',choices:['First','Second'],answer:-1,explanation:''}],teacherNotes:'',activities:[]},status:'published',version:4,downloadAllowed:true,startsAt:null,endsAt:null,timeZone:'Africa/Nairobi',location:null};
  const account={id:owner,name:'Synthetic learner',email:'learner@example.invalid',image:null,profileTypes:[],isSuperAdmin:false,isMasterSuperAdmin:false,languageRoles:[]};
  socket.addEventListener('message',event=>{
   const message=JSON.parse(event.data);
   if(pending.has(message.id)){const callback=pending.get(message.id);pending.delete(message.id);message.error?callback.reject(new Error(message.error.message)):callback.resolve(message.result);}
   if(message.method!=='Fetch.requestPaused')return;
   const paused=message.params;const url=new URL(paused.request.url);let payload;
   if(url.pathname==='/api/auth/session')payload={user:{id:owner,name:account.name,email:account.email},expires:new Date(Date.now()+600000).toISOString()};
   else if(url.pathname==='/api/v1/bootstrap')payload={success:true,data:{apiVersion:1,app:{name:'Luo Heritage',tagline:'Heritage',version:'fixture',icon:'/icons/luo-heritage-512.png',manifest:'/application.webmanifest'},selectedLanguage:{id:1,code:'luo',name:'Luo',nativeName:'Dholuo'},languages:[{id:1,code:'luo',name:'Luo',nativeName:'Dholuo'}],modules:[{code:"dictionary",title:"Muma",baseName:"Dictionary",href:"/dashboard?module=dictionary",contributionHref:"/contribute/dictionary"}],routes:{},contentFilters:[],contentViews:[]}};
   else if(url.pathname==='/api/v1/library')payload={success:true,data:{title:'Muma',baseName:'Dictionary',languageName:'Dholuo',languageCode:'luo',languageId:1,moduleCode:'dictionary',canContribute:true,items:Array.from({length:40},(_,i)=>({id:'fixture-'+i,kind:'dictionary',title:'Synthetic example '+i,summary:'Synthetic layout fixture. Not cultural teaching content.',englishSummary:'Synthetic text',bodyText:'Synthetic layout fixture for scroll verification.',media:[]})),limits:{records:50,dictionaryEntries:100},continuation:{records:null,dictionary:null}}};
   else if(url.pathname==='/api/v1/account')payload={success:true,data:account};
   else if(url.pathname==='/api/v1/account/conversations')payload={success:true,data:[]};
   else if(url.pathname==='/api/v1/contributions')payload={success:true,data:{language:{id:1,code:'luo',nativeName:'Dholuo'},modules:[{id:1,code:'oral_histories',title:'Oral histories',fields:[]}],submissions:[]}};
   else if(url.pathname==='/api/v1/learning'){
    if(paused.request.method==='POST'){const body=JSON.parse(paused.request.postData);assert.equal(body.action,'progress');assert.equal(body.data.ownerId,owner);synchronized++;payload={success:true,data:{resourceId:id,completed:true,bestScore:100,attempts:1,position:20,grade:{score:100,results:[{id:'q1',correct:true,answer:1,explanation:'Correct fixture answer'}]}}};}
    else payload={success:true,data:url.searchParams.has('downloads')?{downloads:[{id,version:4}]}:{items:[resource],states:synchronized?[{resourceId:id,completed:true,bestScore:100,attempts:1,position:20}]:[],next:null,canEdit:false,canReview:false,canPublish:false}};
   }
   if(payload)void send('Fetch.fulfillRequest',{requestId:paused.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'application/json'},{name:'Cache-Control',value:'no-store'}],body:Buffer.from(JSON.stringify(payload)).toString('base64')});
   else void send('Fetch.continueRequest',{requestId:paused.requestId});
  });
  const evaluate=async expression=>{const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||'Browser evaluation failed');return result.result.value;};
  const clickText = async (text, partial = false) => until(() => evaluate(`(() => { const button = [...document.querySelectorAll("main button")].find(button => ${partial ? "button.textContent.includes(" + JSON.stringify(text) + ")" : "button.textContent === " + JSON.stringify(text)}); if (!button || button.disabled) return false; button.click(); return true; })()`), "button " + text);
  await send('Runtime.enable');await send('Page.enable');await send('Network.enable');await send('Fetch.enable',{patterns:[{urlPattern:'*/api/*'}]});
  await send('Page.navigate',{url:base+'/application#/learn'});
  await until(()=>evaluate('document.querySelector("main")?.textContent.includes("Synthetic offline lesson")'),'shared learning list');
  await until(()=>evaluate('!!navigator.serviceWorker.controller'),'offline shell installation');
  await clickText('Open lesson');
  await until(()=>evaluate('document.querySelector("main")?.textContent.includes("Synthetic approved offline reading.")'),'lesson detail');
  await clickText('Download text',true);
  await until(()=>evaluate('document.querySelector("main")?.textContent.includes("Text downloaded for seven days")'),'persistent text pack');
  console.log('PASS shared lesson detail and persisted download');
  // Avoid mocked API fulfillment while genuinely offline.
  await send('Fetch.disable');await send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:-1,uploadThroughput:-1});
  await send('Page.reload');
  await until(()=>evaluate('document.querySelector("main")?.textContent.includes("Showing downloaded text")'),'offline reload from service worker and IndexedDB');
  await clickText('Open lesson');
  await until(() => evaluate('document.querySelectorAll("main input[type=radio]").length===2'), 'offline questions');
  await evaluate('document.querySelectorAll("main input[type=radio]")[1].click()');
  await clickText('Finish & save',true);
  await until(()=>evaluate('document.querySelector("main")?.textContent.includes("1 waiting")'),'queued offline attempt');
  await send('Page.reload');
  await until(()=>evaluate('document.querySelector("main")?.textContent.includes("1 waiting")'),'queued attempt survives app restart');
  console.log('PASS offline shell reload and queued attempt restart');
  await send('Fetch.enable',{patterns:[{urlPattern:'*/api/*'}]});
  await send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
  await until(()=>evaluate('document.querySelector("main")?.textContent.includes("Best: 100%")'),'reconnect and progress synchronization');
  assert.equal(synchronized,1,'Offline work synchronizes once');
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'),true);
  console.log('PASS shared web application: approved text download, real offline shell reload, restored queue owner, offline attempt, restart persistence and one reconnect sync (API transport mocked)');
  await evaluate('location.hash="/contribute/oral_histories"');
  await until(()=>evaluate('!!document.querySelector("#contribution-title")'),'contribution form');
  await evaluate(`(() => {
    const input=document.querySelector('#contribution-title');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Synthetic device draft');input.dispatchEvent(new Event('input',{bubbles:true}));
    const area=document.querySelector('main form textarea');
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(area,'Offline contribution text');area.dispatchEvent(new Event('input',{bubbles:true}));
    const files=new DataTransfer(); files.items.add(new File(['synthetic transcript bytes'],'fixture.txt',{type:'text/plain'}));
    const fileInput=document.querySelector('main input[type=file][accept^=".txt,.pdf,.doc,.docx"]');fileInput.files=files.files;fileInput.dispatchEvent(new Event('change',{bubbles:true}));
  })()`);
  await clickText('Save on this device');
  await until(()=>evaluate('document.querySelector("main")?.textContent.includes("Device copy saved")'),'device contribution persisted');
  await send('Fetch.disable');await send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:-1,uploadThroughput:-1});
  await send('Page.reload');
  await clickText('Resume device draft');
  assert.equal(await evaluate('document.querySelector("#contribution-title")?.value'),'Synthetic device draft');
  assert.equal(await evaluate('document.querySelector("main form textarea")?.value'),'Offline contribution text');
  await until(()=>evaluate('document.querySelector("main form")?.textContent.includes("fixture.txt")'),'selected File survived reload');
  // Read the actual persisted File bytes, not just its rendered name.
  assert.equal(await evaluate(`new Promise((resolve,reject)=>{const open=indexedDB.open('luo-heritage-learning-v1',1);open.onsuccess=()=>{const db=open.result;const tx=db.transaction('items');const request=tx.objectStore('items').getAll();request.onsuccess=async()=>{const draft=request.result.find(entry=>entry.key.startsWith('contribution:'));resolve(await draft.value.files.document.text());};tx.oncomplete=()=>db.close();tx.onerror=reject;};open.onerror=reject;})`),'synthetic transcript bytes');
  await clickText('Delete device copy');
  await until(()=>evaluate('!document.querySelector("main")?.textContent.includes("Resume device draft")'),'device copy deletion');
  await send('Page.reload');
  await until(()=>evaluate('document.querySelector("main")?.textContent.includes("Contributions & submissions")'),'contribution reload after deletion');
  assert.equal(await evaluate('document.querySelector("main").textContent.includes("Resume device draft")'),false);
  console.log('PASS contribution device drafts: text and File bytes survive actual offline restart; cached forms restore; explicit deletion persists; no server submission');
  await send('Fetch.enable',{patterns:[{urlPattern:'*/api/*'}]});
  await send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
  await evaluate('location.hash="/dashboard?module=dictionary"');
  await until(()=>evaluate('document.querySelector("main")?.textContent.includes("Synthetic example 39")'),'synthetic scroll library');
  const results=[];await fs.mkdir(path.join(process.cwd(),'docs/system-audit/screenshots'),{recursive:true});
  for(const width of [360,1440]){
    await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width===360});
    await evaluate('document.querySelector("main").scrollTop=700');await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    const first=await evaluate('document.querySelector("[data-sticky-controls]").getBoundingClientRect().top');
    await evaluate('document.querySelector("main").scrollTop=1200');await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    const second=await evaluate('document.querySelector("[data-sticky-controls]").getBoundingClientRect().top');
    assert.ok(Math.abs(first-second)<=2,'Controls remain pinned while content scrolls');
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);
    const positions=await evaluate('Array.from(document.querySelectorAll("main button[aria-pressed]" )).filter(button=>["All","Images","Audio","Video","Transcripts"].includes(button.getAttribute("aria-label"))).map(button=>({label:button.getAttribute("aria-label"),top:button.getBoundingClientRect().top,width:button.getBoundingClientRect().width}))');
    assert.equal(positions.length,5);assert.ok(Math.max(...positions.map(item=>item.top))-Math.min(...positions.map(item=>item.top))<=2,'Filters stay in one horizontal row');assert.ok(positions.every(item=>item.width>=44),'Filters retain touch targets');
    const screen=await send('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(process.cwd(),'docs/system-audit/screenshots/library-'+width+'.png'),Buffer.from(screen.data,'base64'));results.push({width,first,second,filters:positions});
  }
  await fs.writeFile(path.join(process.cwd(),'docs/system-audit/sticky-controls-browser.json'),JSON.stringify({fixture:true,results},null,2));
  console.log('PASS actual shared library at 360px and 1440px: pinned controls, one filter row, accessible 44px targets and no horizontal page overflow (synthetic API data).');
 }finally{
  socket?.close();chrome.kill();await new Promise(resolve=>setTimeout(resolve,500));
  const resolved=path.resolve(profile);if(path.dirname(resolved)===path.resolve(os.tmpdir())&&path.basename(resolved).startsWith('luo-shared-app-'))await fs.rm(resolved,{recursive:true,force:true,maxRetries:3}).catch(()=>{});
 }
}
main().catch(error=>{console.error('Shared application acceptance failed:',error.message);process.exitCode=1;});
