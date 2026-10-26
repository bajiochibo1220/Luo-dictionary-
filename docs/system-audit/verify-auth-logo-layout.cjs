// Hydrated browser checks against the real UI components. Only public branding
// is read from the database; account/content APIs use isolated fixture data.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');

async function main() {
  require('dotenv').config({ quiet: true });
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  let branding;
  try { branding = Object.fromEntries((await prisma.systemSetting.findMany({ where: { key: { in: ['jooust_logo_url', 'nrf_logo_url', 'jooust_color', 'nrf_color'] } }, select: { key: true, value: true } })).map(row => [row.key, row.value])); }
  finally { await prisma.$disconnect(); }
  assert.ok(branding.jooust_logo_url && branding.nrf_logo_url, 'Both uploaded institutional logos must be configured.');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'heritage-mobile-ui-'));
  const css = await require('postcss')([require('@tailwindcss/postcss')()]).process(fs.readFileSync('src/app/globals.css', 'utf8'), { from: path.resolve('src/app/globals.css') });
  const source = "import React from 'react'; import {createRoot} from 'react-dom/client';\nimport {AuthShell} from '@/components/layout/auth-shell';\nimport {LoginForm} from '@/components/forms/login-form';\nimport {RegisterForm} from '@/components/forms/register-form';\nimport {InterfaceLanguageProvider} from '@/components/shared/interface-language';\nimport {SystemClient} from '@/app/(admin)/super-admin/system/system-client';\nimport {MaintenanceNotice} from '@/components/layout/maintenance-notice';\nconst kind=new URLSearchParams(location.search).get('kind')||'register';\nwindow.fixtureRefreshCount=0; window.fixtureSettingsRequests=[]; window.fixtureFailure=false;\nconst originalFetch=window.fetch; window.fetch=async (url,options)=>{if(url==='/api/super-admin/settings'&&options?.method==='PATCH'){window.fixtureSettingsRequests.push(JSON.parse(options.body));await new Promise(resolve=>{window.fixtureResolveSave=resolve});return new Response(JSON.stringify(window.fixtureFailure?{error:'Fixture save failed'}:{success:true}),{status:window.fixtureFailure?503:200,headers:{'Content-Type':'application/json'}});}return originalFetch(url,options);};\nconst originalInterval=window.setInterval.bind(window); window.setInterval=(callback,delay,...args)=>{if(delay===30000)window.fixtureRetry=callback;return originalInterval(callback,delay,...args);};\nconst languages=[{id:1,code:'luo',name:'Dholuo',nativeName:'Dholuo'}];\nconst view=kind==='system'?<SystemClient settings={{maintenance_mode:'on',maintenance_message:'Scheduled work'}} languages={languages} isMasterSuperAdmin={true}/>:kind==='maintenance'?<MaintenanceNotice message='Scheduled work'/>:<AuthShell>{kind==='login'?<LoginForm/>:<RegisterForm/>}</AuthShell>;\ncreateRoot(document.getElementById('root')).render(<InterfaceLanguageProvider>{view}</InterfaceLanguageProvider>);";
  const bundle = await require('esbuild').build({ stdin: { contents: source, loader: 'tsx', resolveDir: process.cwd(), sourcefile: 'mobile-arrangement-fixture.tsx' }, bundle: true, write: false, jsx: "automatic", platform: 'browser', tsconfig: path.resolve('tsconfig.json'), define: { 'process.env.NODE_ENV': '"production"', 'process.env': '{}' }, plugins: [{ name: 'fixture-navigation', setup(build) {
    build.onResolve({ filter: /^(next\/link|next\/navigation|next-auth\/react)$/ }, args => ({ path: args.path, namespace: 'fixture' }));
    build.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ loader: 'jsx', resolveDir: process.cwd(), contents: args.path==='next/link' ? "import React from 'react'; export const useLinkStatus=()=>({pending:false}); export default function Link({children,onClick,...props}){return <a {...props} onClick={event=>{event.preventDefault();onClick?.(event);}}>{children}</a>;}" : args.path==='next/navigation' ? "const router={push:()=>{},refresh:()=>{window.fixtureRefreshCount++}};export const useRouter=()=>router; export const usePathname=()=>'/dashboard'; export const useSearchParams=()=>new URLSearchParams(location.search);" : "export const signIn=async()=>{}; export const signOut=async()=>{}; export const useSession=()=>({data:{user:window.fixtureAccount}});" }));
  } }] });
  const fixtureCatalog = Object.fromEntries(Object.entries(require('../../src/lib/interface-copy-defaults.json')).map(([source,local]) => [source,{local,english:source}]));
  const server = http.createServer((request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    if(pathname==='/bundle.js'){response.setHeader('Content-Type','text/javascript');response.end(bundle.outputFiles[0].contents);}
    else if(pathname==='/style.css'){response.setHeader('Content-Type','text/css');response.end(css.css);}
    else if(/\/[\w.-]+\.woff2$/.test(pathname)){const filename=path.join('src/assets/fonts',path.basename(pathname));response.setHeader('Content-Type','font/woff2');response.end(fs.existsSync(filename)?fs.readFileSync(filename):'');}
    else if(pathname==='/api/interface-copy'&&request.method==='PATCH'){let body='';request.on('data',chunk=>body+=chunk);request.on('end',()=>{for(const entry of JSON.parse(body).entries)fixtureCatalog[entry.source]={local:entry.local,english:entry.english};response.setHeader('Content-Type','application/json');response.end(JSON.stringify({success:true}));});}
    else if(pathname.startsWith('/api/')){response.setHeader('Content-Type','application/json');response.end(JSON.stringify({success:true,data:pathname==='/api/branding'?branding:pathname==='/api/interface-copy'?{catalog:fixtureCatalog}:pathname==='/api/languages'?[{id:1,code:'luo',name:'Dholuo',nativeName:'Dholuo'}]:[],unreadCount:0}));}
    else if(/^\/icons\/[\w.-]+$/.test(pathname)){const filename=path.join('public',pathname);if(fs.existsSync(filename)){response.setHeader('Content-Type',pathname.endsWith('.svg')?'image/svg+xml':pathname.endsWith('.png')?'image/png':'image/x-icon');response.end(fs.readFileSync(filename));}else{response.statusCode=404;response.end();}}
    else{response.setHeader('Content-Type','text/html');response.end('<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><body><div id="root"></div><script src="/bundle.js"></script></body></html>');}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=9342',`--user-data-dir=${path.join(directory,'profile')}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
  let socket;
  try {
    let tabs; for(let retry=0;retry<60;retry++){try{tabs=await(await fetch('http://127.0.0.1:9342/json')).json();break;}catch{await new Promise(resolve=>setTimeout(resolve,250));}}
    assert.ok(tabs?.length,'Chrome must start'); socket=new WebSocket(tabs.find(tab=>tab.type==='page').webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
    let id=0;const pending=new Map();socket.onmessage=event=>{const message=JSON.parse(event.data);if(message.method==='Runtime.exceptionThrown')console.error('Browser:',message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);const callback=pending.get(message.id);if(callback){pending.delete(message.id);message.error?callback.reject(new Error(message.error.message)):callback.resolve(message.result);}};
    const command=(method,params={})=>new Promise((resolve,reject)=>{const requestId=++id;pending.set(requestId,{resolve,reject});socket.send(JSON.stringify({id:requestId,method,params}));});
    const evaluate=async expression=>{const value=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(value.exceptionDetails)throw new Error(value.exceptionDetails.exception?.description || value.exceptionDetails.text);return value.result.value;};
    const waitFor=async expression=>{for(let retry=0;retry<80;retry++){if(await evaluate(expression))return;await new Promise(resolve=>setTimeout(resolve,100));}throw new Error('Timed out: '+expression);};
    const click=async selector=>{const bounds=await evaluate(`(()=>{const node=document.querySelector(${JSON.stringify(selector)});if(!node)throw new Error('Missing control');const b=node.getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2};})()`);await command('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...bounds});await command('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...bounds});};
    const menuState = state => `document.querySelector('[aria-label="Open account menu"]')?.getAttribute('aria-expanded')==='${state}'`;
    await command("Runtime.enable");
    const results=[];
    for(const kind of ['login','register']) for(const width of [320,360,390,768,1440]) {
      await command('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<768});
      await command('Page.navigate',{url:origin+'/?kind='+kind});
      await waitFor('document.querySelector(".auth-logo-image")?.naturalWidth>0 && document.querySelector(".auth-logo-image")?.style.maxWidth && [...document.querySelectorAll("[data-partner-branding=auth] img")].length===2 && [...document.querySelectorAll("[data-partner-branding=auth] img")].every(img=>img.complete&&img.naturalWidth>0)');
      const layout=await evaluate(`(()=>{const img=document.querySelector('.auth-logo-image'),card=document.querySelector('.auth-form-surface'),b=img.getBoundingClientRect(),c=card.getBoundingClientRect(),s=getComputedStyle(img);return {width:b.width,height:b.height,top:b.top,bottom:b.bottom,left:b.left,right:b.right,cardTop:c.top,cardBottom:c.bottom,cardLeft:c.left,cardRight:c.right,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight,filter:s.filter,fit:s.objectFit,opacity:Number(s.opacity),source:img.src,overflow:document.documentElement.scrollWidth>innerWidth};})()`);
      assert.equal(layout.source,branding.jooust_logo_url);
      assert.equal(layout.filter,'none');assert.equal(layout.fit,'contain');
      assert.ok(layout.width<=Math.min(320,layout.naturalWidth)+1 && layout.width>100,JSON.stringify(layout));
      assert.ok(Math.abs(layout.width/layout.height-layout.naturalWidth/layout.naturalHeight)<0.01);
      assert.ok(layout.left>=layout.cardLeft && layout.right<=layout.cardRight && layout.top>=layout.cardTop && layout.bottom<=layout.cardBottom);
      assert.ok(layout.top>=0 && layout.bottom<844 && layout.opacity>=0.2 && !layout.overflow,JSON.stringify({kind,width,layout}));
      const selector=kind==='register'?'input[name=name]':'input[name=email]';
      await click(selector);
      assert.equal(await evaluate('document.activeElement.matches('+JSON.stringify(selector)+')'),true);
      await command('Input.insertText',{text:kind==='register'?'Community member':'member@example.test'});
      assert.equal(await evaluate('document.querySelector('+JSON.stringify(selector)+').value'),kind==='register'?'Community member':'member@example.test');
      await evaluate('document.activeElement.blur();window.scrollTo(0,0)');
      if([360,1440].includes(width)){const shot=await command('Page.captureScreenshot',{format:'png'});fs.writeFileSync('docs/system-audit/screenshots/auth-logo-'+kind+'-'+width+'.png',Buffer.from(shot.data,'base64'));}
      results.push({kind,width,layout,inputUsable:true});
      console.log('PASS '+kind+' '+width+'px: actual logos loaded, full crest visible without stretching, input usable, no overflow.');
    }
    await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
    await command('Page.navigate',{url:origin+'/?kind=system'});
    await waitFor('[...document.querySelectorAll("button")].some(node=>node.textContent==="Maintenance")');
    await evaluate('[...document.querySelectorAll("button")].find(node=>node.textContent==="Maintenance").click()');
    await waitFor('!!document.querySelector("[role=switch]")');
    assert.equal(await evaluate('document.querySelector("[role=switch]").getAttribute("aria-checked")'),'true');
    await click('[role=switch]');
    await waitFor('document.querySelector("[role=switch]").disabled && !!window.fixtureResolveSave');
    await evaluate('window.fixtureResolveSave()');
    await waitFor('document.querySelector("[role=switch]").getAttribute("aria-checked")==="false" && !document.querySelector("[role=switch]").disabled');
    assert.deepEqual(await evaluate('window.fixtureSettingsRequests'),[{maintenance_mode:'off'}]);
    assert.ok(await evaluate('window.fixtureRefreshCount>0'));
    await evaluate('window.fixtureFailure=true;window.fixtureResolveSave=null');await click('[role=switch]');
    await waitFor('!!window.fixtureResolveSave');await evaluate('window.fixtureResolveSave()');
    await waitFor('window.fixtureSettingsRequests.length===2&&!document.querySelector("[role=switch]").disabled');
    assert.equal(await evaluate('document.querySelector("[role=switch]").getAttribute("aria-checked")'),'false');
    results.push({kind:'maintenance-switch',savesImmediately:true,disabledWhileSaving:true,failedSaveRetainsPreviousMode:true});
    console.log('PASS maintenance switch: saves off immediately, prevents repeat clicks while saving, failed save retains previous mode.');
    await command('Page.navigate',{url:origin+'/?kind=maintenance'});
    await waitFor('!!window.fixtureRetry');
    await evaluate('window.fixtureRetry()');assert.equal(await evaluate('window.fixtureRefreshCount'),1);
    await evaluate('window.dispatchEvent(new Event("focus"))');assert.equal(await evaluate('window.fixtureRefreshCount'),2);
    await evaluate('[...document.querySelectorAll("button")].find(node=>node.textContent==="Try again").click()');
    assert.equal(await evaluate('window.fixtureRefreshCount'),3);
    results.push({kind:'maintenance-notice',refreshesOnTimer:true,refreshesOnFocus:true,manualRetry:true});
    console.log('PASS maintenance notice: retries on interval, window focus and Try again.');
    fs.writeFileSync('docs/system-audit/auth-logo-layout-verification-2026-10-26.json',JSON.stringify({realSavedBranding:true,fixtureAuthentication:true,results},null,2));
  } finally {socket?.close();chrome.kill();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error.stack);process.exitCode=1;});
