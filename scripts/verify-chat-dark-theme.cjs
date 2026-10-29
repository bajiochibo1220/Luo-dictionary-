// Exercise the production bundle. Every API request is intercepted: no live writes.
require('dotenv').config({ quiet: true });
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3017';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const modules = ['dictionary', 'oral_histories', 'riddles', 'folktales', 'songs', 'artifacts', 'heritage_sites', 'audio_visual', 'research'].map(code => ({ code, title: code.replaceAll('_', ' '), baseName: code.replaceAll('_', ' '), href: `/dashboard?module=${code}`, contributionHref: `/contribute/${code}` }));
const account = { id: 'synthetic-audit-user', name: 'Synthetic audit account', email: 'audit@example.invalid', image: null, profileTypes: [], isSuperAdmin: true, isMasterSuperAdmin: true, languageRoles: [] };
const languages = [{ id: 1, code: 'luo', name: 'Luo', nativeName: 'Dholuo' }, { id: 2, code: 'eng', name: 'English', nativeName: 'English' }];
const item = { id: '11111111-1111-4111-8111-111111111111', title: 'Synthetic published story for responsive auditing', summary: 'Synthetic content. A long source reference: https://example.invalid/' + 'a'.repeat(180), bodyText: 'Synthetic complete story for interface checks only.', englishTitle: 'Synthetic English title', englishSummary: 'Synthetic English summary', kind: 'cultural', moduleCode: 'oral_histories', moduleName: 'Oral histories', media: [] };
const report = { apiTransport: 'synthetic; all intercepted', viewports: [], contrast: [], runtimeErrors: [], unknownApi: [], interactions: [] };
let failChat = false, failArchivedHistory = true;
let activeRoute = '', width = 390, tutorCalls = 0, chatCalls = 0, mediaCalls = 0, guestMode = false;
function fixture(url, method) {
  const pathname = url.pathname;
  if (pathname === '/api/auth/session') return guestMode ? null : { user: { id: account.id, name: account.name, email: account.email }, expires: new Date(Date.now() + 3600000).toISOString() };
  if (pathname === '/api/v1/bootstrap') return { apiVersion: 1, app: { name: 'Luo Heritage', tagline: 'Heritage', version: 'audit', icon: '/icons/luo-heritage-512.png', manifest: '/application.webmanifest' }, selectedLanguage: languages[0], languages, modules, routes: {}, contentFilters: [], contentViews: [] };
  if (pathname === '/api/v1/library') { const code = url.searchParams.get('module'); return { title: 'Synthetic collection', baseName: 'Synthetic collection', moduleCode: code === 'audio_visual' ? 'all' : code, languageId: 1, languageCode: 'luo', languageName: 'Dholuo', canContribute: true, items: [item], categories: modules.map(entry => ({ code: entry.code, name: entry.baseName })), limits: { records: 12, dictionaryEntries: 6 }, continuation: { records: null, dictionary: null } }; }
  if (pathname === '/api/v1/account') return account;
  if (pathname === '/api/v1/account/conversations') return [];
  if (pathname === '/api/v1/account/settings') return { account, sessions: [], notifications: [] };
  if (pathname === '/api/languages') return languages;
  if (pathname === '/api/interface-copy') return { catalog: {} };
  if (pathname === '/api/branding' || pathname === '/api/v1/activity') return {};
  if (pathname === '/api/v1/learning') return { items: [], states: [], next: null, canEdit: false, canReview: false, canPublish: false };
  if (pathname === '/api/v1/education') return { items: [], next: null, canEdit: false, canReview: false, canPublish: false, canCreateClass: false };
  if (pathname === '/api/v1/saved') return { items: [] };
  if (pathname === '/api/v1/places') return { places: [], bounded: false };
  if (pathname === '/api/v1/knowledge') return { nodes: [], edges: [], truncated: false };
  if (pathname === '/api/v1/ai-tools' && method === 'POST') { mediaCalls++; return { text: 'Synthetic image draft', draft: true }; }
  if (pathname === '/api/v1/ai-tools') return { capabilities: { ocr: true, describe: true, transcribe: false, illustrate: false }, assets: [{ id: item.id, type: 'image', title: 'Synthetic approved image' }], stories: [] };
  if (pathname === '/api/v1/tutor') { tutorCalls++; return { text: 'Synthetic tutor feedback', sources: [] }; }
  if (pathname === '/api/v1/chat') { chatCalls++; return { languageCode: chatCalls === 1 ? 'eng' : 'luo', translation: chatCalls === 1 ? 'Synthetic Dholuo translation' : 'Synthetic English translation', answer: 'Synthetic cultural answer', sources: [{ id: item.id, title: item.title, module: 'oral_histories', similarity: 1 }], media: [], conversationId: null }; }
  if (['/api/users', '/api/super-admin/admins', '/api/super-admin/backup', '/api/audit-logs'].includes(pathname)) return [];
  if (['/api/analytics', '/api/ai/monitoring', '/api/super-admin/settings'].includes(pathname)) return {};
  if (pathname === '/api/content') return [{ ...item, status: 'submitted', languageId: 1, contributorId: 'other-uploader', language: languages[0], module: { code: 'oral_histories', baseName: 'Oral histories' }, canDelete: true }];
  if (pathname === '/api/v1/contributions') return { language: languages[0], englishLanguageId: 2, modules: [{ id: 1, code: 'oral_histories', title: 'Oral histories', fields: [] }], submissions: [] };
  if (pathname === '/api/v1/research') return { items: [], next: null };
  if (pathname === '/api/app-version') return { version: process.env.NEXT_PUBLIC_APP_VERSION || 'development' };
  if (pathname === '/api/nrf/corpus') return { items: [], next: null };
  return undefined;
}

async function main() {
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'heritage-dark-chat-'));
  const browser=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--no-first-run','--remote-debugging-port=0',`--user-data-dir=${directory}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
  let socket;
  try {
    let port;
    for(let i=0;i<150;i++) {
      try { const value=fs.readFileSync(path.join(directory,'DevToolsActivePort'),'utf8').split('\n')[0];if(/^\d+$/.test(value)){port=value;break;} } catch { /* Chrome may still hold the startup file open on Windows. */ }
      await delay(100);
    }
    if(!port)throw Error('Chrome debug port did not become available');
    const target=await(await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'})).json();
    socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
    let sequence=0;const pending=new Map();
    const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;const timer=setTimeout(()=>{pending.delete(id);reject(Error(method+' timed out'));},120000);pending.set(id,message=>{clearTimeout(timer);message.error?reject(Error(message.error.message)):resolve(message.result);});socket.send(JSON.stringify({id,method,params}));});
    const evaluate=async expression=>{const result=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;};
    const until=async(expression,label)=>{const deadline=Date.now()+120000;while(Date.now()<deadline){if(await evaluate(expression))return;await delay(100);}throw Error('Timed out: '+label);};
    socket.onmessage=event=>{
      const message=JSON.parse(event.data);if(pending.has(message.id)){const callback=pending.get(message.id);pending.delete(message.id);callback(message);}
      if(message.method==='Runtime.exceptionThrown')report.runtimeErrors.push(message.params.exceptionDetails.exception?.description||message.params.exceptionDetails.text);
      if(message.method==='Fetch.requestPaused')void(async()=>{
        const p=message.params,url=new URL(p.request.url);let error;
        if(url.pathname==='/api/v1/chat'&&failChat){failChat=false;error='Synthetic provider unavailable. Try again.';}
        if(url.pathname==='/api/v1/account/conversations'&&url.searchParams.get('archived')==='true'&&failArchivedHistory){failArchivedHistory=false;error='Synthetic history failure';}
        let data=error?null:fixture(url,p.request.method);const raw=['/api/auth/session','/api/app-version'].includes(url.pathname);
        if(data===undefined){report.unknownApi.push(url.pathname);error='Unexpected synthetic API';}
        await send('Fetch.fulfillRequest',{requestId:p.requestId,responseCode:error?503:200,responseHeaders:[{name:'Content-Type',value:'application/json'},{name:'Cache-Control',value:'no-store'}],body:Buffer.from(JSON.stringify(error?{success:false,error}:raw?data:{success:true,data})).toString('base64')});
      })().catch(error=>{if(!/Invalid InterceptionId/.test(error.message))report.runtimeErrors.push(error.message);});
    };
    await send('Runtime.enable');await send('Page.enable');await send('Fetch.enable',{patterns:[{urlPattern:'*/api/*'}]});
    await send('Emulation.setDeviceMetricsOverride',{width:320,height:844,deviceScaleFactor:1,mobile:true});
    await send('Page.navigate',{url:base+'/application#/chatbot'});
    await until('!!document.querySelector(".chat-workspace textarea")','chat');
    await evaluate(`window.auditContrast=(selector)=>{const el=document.querySelector(selector);if(!el)throw Error('Missing '+selector);const c=document.createElement('canvas');c.width=c.height=1;const ctx=c.getContext('2d');const rgb=color=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=color;ctx.fillRect(0,0,1,1);return Array.from(ctx.getImageData(0,0,1,1).data);};let parent=el,bg;while(parent){bg=rgb(getComputedStyle(parent).backgroundColor);if(bg[3]===255)break;parent=parent.parentElement;}const fg=rgb(getComputedStyle(el).color);const lum=values=>{const linear=values.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return .2126*linear[0]+.7152*linear[1]+.0722*linear[2];};const a=lum(fg),b=lum(bg||[0,0,0]);return{selector,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};};`);
    const checkContrast=async selectors=>{for(const selector of selectors){const result=await evaluate(`window.auditContrast(${JSON.stringify(selector)})`);report.contrast.push(result);assert.ok(result.ratio>=4.5,JSON.stringify(result));}};
    for(const targetWidth of [320,390,768,1440]){
      width=targetWidth;await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<768});await delay(200);
      const metrics=await evaluate(`(()=>{const root=document.querySelector('.chat-workspace'),log=document.querySelector('[role=log]'),input=document.querySelector('textarea');return{width:innerWidth,page:document.documentElement.scrollWidth,chat:root.scrollWidth,available:root.clientWidth,background:getComputedStyle(root).backgroundColor,header:getComputedStyle(document.querySelector('.chat-header')).backgroundColor,composer:getComputedStyle(document.querySelector('.chat-composer')).backgroundColor,logTop:log.scrollTop,inputVisible:input.getBoundingClientRect().bottom<=innerHeight};})()`);
      report.viewports.push(metrics);assert.ok(metrics.page<=metrics.width+1&&metrics.chat<=metrics.available+1);assert.equal(metrics.background,'rgb(0, 0, 0)');assert.equal(metrics.header,'rgb(0, 0, 0)');assert.equal(metrics.composer,'rgb(0, 0, 0)');assert.equal(metrics.logTop,0);assert.equal(metrics.inputVisible,true);
      await checkContrast(['.chat-header h1','.chat-header p','[role=log] h2','.chat-suggestion','.chat-composer textarea','.chat-composer label']);
      if([390,1440].includes(width)){const shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(`docs/system-audit/screenshots/chat-black-empty-${width}.png`,Buffer.from(shot.data,'base64'));}
    }
    await evaluate(`document.querySelector('button[aria-label="Open chat history"]').click()`);await until('!!document.querySelector(".chat-history")','history');
    await evaluate(`Array.from(document.querySelectorAll('.chat-history button')).find(button=>button.textContent.includes('Show archived chats')).click()`);
    await until('!!document.querySelector(".chat-history [role=alert]")','history error');
    await checkContrast(['.chat-history h2','.chat-history [role=alert] p']);
    await evaluate(`Array.from(document.querySelectorAll('.chat-history button')).find(button=>button.textContent.includes('Try again')).click()`);
    await until('document.querySelector(".chat-history").textContent.includes("No saved chats yet.")','history retry');
    await evaluate(`document.querySelector('.chat-history button[aria-label="Close chat history"]').click()`);
    async function submit(question){await evaluate(`(()=>{const input=document.querySelector('textarea');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input,${JSON.stringify(question)});input.dispatchEvent(new Event('input',{bubbles:true}));})()`);await until(`!document.querySelector('button[aria-label="Send question"]').disabled`,'send enabled');await evaluate('document.querySelector(".chat-composer form").requestSubmit()');}
    await evaluate(`document.querySelector('.chat-composer input[type=checkbox]').click()`);await submit('What are Luo marriage customs?');
    await until('!!document.querySelector(".chat-assistant-message")','answer');
    await evaluate('document.querySelector(".chat-translation summary").click()');
    const sources=await evaluate(`(()=>{const el=Array.from(document.querySelectorAll('[role=log] details')).find(el=>el.querySelector('summary').textContent.includes('Sources'));el.querySelector('summary').click();return true;})()`);assert.equal(sources,true);
    await checkContrast(['.chat-user-message p','.chat-assistant-message p','.chat-translation summary','.chat-translation p','[role=log] details a']);
    failChat=true;await submit('Tell me more about Luo traditions.');
    await until('document.querySelector(".chat-workspace [role=alert]")?.textContent.includes("Synthetic provider unavailable")','provider error');
    await until('document.querySelector("textarea").value==="Tell me more about Luo traditions."','draft restored');
    await checkContrast(['.chat-workspace [role=alert] p']);
    await submit('Tell me more about Luo traditions.');await until('document.querySelectorAll(".chat-assistant-message").length===2','retry answer');
    assert.equal(chatCalls,2);
    await until('!document.querySelector(".chat-workspace [role=alert]")','stale failure cleared');
    for(const targetWidth of [390,1440]){await send('Emulation.setDeviceMetricsOverride',{width:targetWidth,height:844,deviceScaleFactor:1,mobile:targetWidth<768});await delay(200);const shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(`docs/system-audit/screenshots/chat-black-messages-${targetWidth}.png`,Buffer.from(shot.data,'base64'));}
    report.interactions.push('History retry, message send, translation/source expansion, readable provider error, restored draft and successful resend');
    assert.deepEqual(report.runtimeErrors,[]);assert.deepEqual(report.unknownApi,[]);report.completedAt=new Date().toISOString();
    console.log(JSON.stringify({viewports:report.viewports.length,contrastChecks:report.contrast.length,minContrast:Math.min(...report.contrast.map(value=>value.ratio)),interactions:report.interactions,runtimeErrors:report.runtimeErrors}));
    await send('Browser.close').catch(()=>{});
  }finally{fs.writeFileSync('docs/system-audit/chat-black-browser-2026-10-29.json',JSON.stringify(report,null,2));socket?.close();browser.kill();}
}
main().catch(error=>{console.error(error.stack);process.exitCode=1;});
