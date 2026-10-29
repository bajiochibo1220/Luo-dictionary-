// Read-only real public library and image delivery; mutation requests are intercepted.
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawn}=require('node:child_process');const base=process.env.SMOKE_BASE_URL||'http://127.0.0.1:3100';const delay=ms=>new Promise(r=>setTimeout(r,ms));
const report={realPublicApi:true,accountOrContentWrites:0,viewports:[],mediaResponses:[],runtimeErrors:[]};
(async()=>{
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'heritage-live-media-'));
 const browser=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--no-first-run','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});let socket;
 try{
  let port;for(let i=0;i<300;i++){try{const value=fs.readFileSync(path.join(profile,'DevToolsActivePort'),'utf8').split('\n')[0];if(/^\d+$/.test(value)){port=value;break;}}catch{}await delay(100);}assert.ok(port);
  const target=await(await fetch('http://127.0.0.1:'+port+'/json/new?about:blank',{method:'PUT'})).json();socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>socket.onopen=r);
  let sequence=0;const pending=new Map();const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;const timer=setTimeout(()=>{pending.delete(id);reject(Error(method+' timed out'));},120000);pending.set(id,m=>{clearTimeout(timer);m.error?reject(Error(m.error.message)):resolve(m.result);});socket.send(JSON.stringify({id,method,params}));});
  socket.onclose=()=>{for(const fn of pending.values())fn({error:{message:'Browser closed'}});pending.clear();};
  socket.onmessage=e=>{const m=JSON.parse(e.data);if(pending.has(m.id)){const fn=pending.get(m.id);pending.delete(m.id);fn(m);}
   if(m.method==='Runtime.exceptionThrown')report.runtimeErrors.push(m.params.exceptionDetails.text);
   if(m.method==='Network.responseReceived'){const r=m.params.response;if(new URL(r.url).pathname.startsWith('/api/media/'))report.mediaResponses.push({path:new URL(r.url).pathname,status:r.status,mime:r.mimeType});}
   if(m.method==='Fetch.requestPaused'){const p=m.params;void (p.request.method==='GET'?send('Fetch.continueRequest',{requestId:p.requestId}):send('Fetch.fulfillRequest',{requestId:p.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from(JSON.stringify({success:true,data:{}})).toString('base64')})).catch(()=>{});}
  };
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text);return r.result.value;};
  const until=async(expression,label)=>{const end=Date.now()+120000;while(Date.now()<end){if(await evaluate(expression))return;await delay(250);}throw Error('Timed out: '+label);};
  await send('Runtime.enable');await send('Page.enable');await send('Network.enable');await send('Fetch.enable',{patterns:[{urlPattern:'*/api/*'}]});
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await send('Page.navigate',{url:base+'/application#/dashboard'});
  await until('!!document.querySelector(".discovery-card.has-media img")','real published image card');
  report.firstCardHasMedia=await evaluate('document.querySelector(".discovery-card").classList.contains("has-media")');report.orderingNote='Text-only records remain in discovery; image decoding is checked on the first published media card.';
  for(const width of [390,1440]){
   await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<768});await evaluate('document.querySelector(".discovery-card.has-media").scrollIntoView({block:"start"})');
   await until('document.querySelector(".discovery-card.has-media img").naturalWidth>0','real image bytes decoded');
   const metrics=await evaluate(`(()=>{const card=document.querySelector('.discovery-card.has-media'),image=card.querySelector('img'),r=image.getBoundingClientRect(),c=card.getBoundingClientRect();return {viewport:innerWidth,page:document.documentElement.scrollWidth,naturalWidth:image.naturalWidth,naturalHeight:image.naturalHeight,width:r.width,height:r.height,cardWidth:c.width,cardHeight:c.height,fit:getComputedStyle(image).objectFit,background:getComputedStyle(image).backgroundColor};})()`);
   assert.equal(metrics.fit,'contain');assert.equal(metrics.background,'rgb(0, 0, 0)');assert.ok(metrics.height>0&&metrics.width>0&&metrics.page<=width);report.viewports.push(metrics);
   fs.writeFileSync('docs/system-audit/screenshots/live-media-'+width+'.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
  }
  assert.deepEqual(report.runtimeErrors,[]);assert.ok(report.mediaResponses.some(r=>r.status===200||r.status===206));report.completedAt=new Date().toISOString();console.log(JSON.stringify(report));await send('Browser.close').catch(()=>{});
 }finally{socket?.close();browser.kill();fs.writeFileSync('docs/system-audit/live-media-browser-2026-10-30.json',JSON.stringify(report,null,2));}
})().catch(error=>{report.error=error.message;fs.writeFileSync('docs/system-audit/live-media-browser-2026-10-30.json',JSON.stringify(report,null,2));console.error(error.message);process.exitCode=1;});
