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
  const source = `
    import React from 'react'; import {createRoot} from 'react-dom/client';
    import {SharedApplication} from '@/components/shared/application';
    import {PaginatedLibrary} from '@/components/shared/paginated-library';
    import {PartnerBranding} from '@/components/shared/partner-branding';
    import {AppTopbar} from '@/components/layout/app-topbar';
    import {AppShell} from '@/components/layout/app-shell';
    import {AdminShell} from '@/components/layout/admin-shell';
    import {SidebarProvider} from '@/components/layout/sidebar-controls';
    import {UserMenu} from '@/components/layout/user-menu';
    import {AuthShell} from '@/components/layout/auth-shell';
    import {LoginForm} from '@/components/forms/login-form';
    import {RegisterForm} from '@/components/forms/register-form';
    const kind = new URLSearchParams(location.search).get('kind') || 'application';
    const language = {id:1,code:'luo',name:'Dholuo',nativeName:'Dholuo',isActive:true};
    const roles = [{languageId:1,languageCode:'luo',languageName:'Dholuo',role:'content_editor'}];
    const account = {id:'fixture',name:'Fixture',email:'fixture@example.test',image:null,profileTypes:[],isSuperAdmin:kind==='super-admin',isMasterSuperAdmin:kind==='super-admin',languageRoles:roles};
    window.fixtureAccount = account;
    const content = {title:'Muma',baseName:'Dictionary',languageName:'Dholuo',languageCode:'luo',languageId:1,moduleCode:'dictionary',canContribute:true,items:Array.from({length:18},(_,i)=>({id:String(i),title:'Community knowledge '+(i+1),summary:'Preserving community knowledge for everyone.',englishTitle:'English version '+(i+1),englishSummary:'The English version of the same cultural record.',media:[]}))};
    const Link = ({children,onClick,...props}) => <a {...props} onClick={event=>{event.preventDefault();onClick?.(event);}}>{children}</a>;
    const request = async path => path==='/api/branding' ? (await fetch(path)).json().then(value=>value.data) : path.includes('/library?') ? content : path==='/api/v1/account/settings' ? {account,sessions:[],notifications:[]} : [];
    const adapters = {apiOrigin:location.origin,artwork:'/icons/luo-heritage-512.png',bootstrap:async()=>({languages:[language],selectedLanguage:language,modules:[{code:'dictionary',title:'Muma',baseName:'Dictionary'}]}),library:async()=>content,account:async()=>account,conversations:async()=>[],featureRequest:request,featureFetch:fetch,chatRequest:fetch,nativeSession:{isNative:kind==='native',subscribe:callback=>{callback({accountId:account.id,expiresAt:new Date(Date.now()+3600000).toISOString()},'restore');return ()=>{};},connect:async()=>()=>{},resume:async()=>{},start:async()=>{},signOut:async()=>{}}};
    const library = <PaginatedLibrary initial={content} request={request} Link={Link}/>;
    const identity = {userInitial:'F',userName:account.name,userEmail:account.email,userImage:null};
    let view;
    if(kind==='login'||kind==='register') view=<AuthShell>{kind==='login'?<LoginForm/>:<RegisterForm/>}</AuthShell>;
    else if(kind==='application'||kind==='native') view=<SharedApplication adapters={adapters}/>;
    else if(kind==='dashboard') view=<SidebarProvider id="fixture-sidebar" storageKey="fixture-sidebar"><div className="flex h-dvh flex-col overflow-hidden"><AppTopbar {...identity} isAdmin={false} languageCode="luo" stats={{uploads:0,approved:0,pending:0}}/><AppShell sidebar={<p>Fixture navigation</p>}>{library}</AppShell></div></SidebarProvider>;
    else if(kind==='legacy-menu') view=<div className="flex h-dvh flex-col"><header className="flex h-14 shrink-0 items-center justify-end px-3"><UserMenu {...identity} isAdmin={false}/></header><main className="min-h-0 flex-1 overflow-y-auto">{library}</main></div>;
    else view=<AdminShell {...identity} isSuperAdmin={account.isSuperAdmin} isMasterSuperAdmin={account.isMasterSuperAdmin} roles={roles} notificationCount={0} languages={[language]} selectedLanguageId={1} selectedCultureId={1}>{library}</AdminShell>;
    createRoot(document.getElementById('root')).render(view);
  `;
  const bundle = await require('esbuild').build({ stdin: { contents: source, loader: 'tsx', resolveDir: process.cwd(), sourcefile: 'mobile-arrangement-fixture.tsx' }, bundle: true, write: false, jsx: "automatic", platform: 'browser', tsconfig: path.resolve('tsconfig.json'), define: { 'process.env.NODE_ENV': '"production"', 'process.env': '{}' }, plugins: [{ name: 'fixture-navigation', setup(build) {
    build.onResolve({ filter: /^(next\/link|next\/navigation|next-auth\/react)$/ }, args => ({ path: args.path, namespace: 'fixture' }));
    build.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ loader: 'jsx', resolveDir: process.cwd(), contents: args.path==='next/link' ? "import React from 'react'; export const useLinkStatus=()=>({pending:false}); export default function Link({children,onClick,...props}){return <a {...props} onClick={event=>{event.preventDefault();onClick?.(event);}}>{children}</a>;}" : args.path==='next/navigation' ? "export const useRouter=()=>({push:()=>{},refresh:()=>{}}); export const usePathname=()=>'/dashboard'; export const useSearchParams=()=>new URLSearchParams(location.search);" : "export const signIn=async()=>{}; export const signOut=async()=>{}; export const useSession=()=>({data:{user:window.fixtureAccount}});" }));
  } }] });
  const server = http.createServer((request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    if(pathname==='/bundle.js'){response.setHeader('Content-Type','text/javascript');response.end(bundle.outputFiles[0].contents);}
    else if(pathname==='/style.css'){response.setHeader('Content-Type','text/css');response.end(css.css);}
    else if(/\/[\w.-]+\.woff2$/.test(pathname)){const filename=path.join('src/assets/fonts',path.basename(pathname));response.setHeader('Content-Type','font/woff2');response.end(fs.existsSync(filename)?fs.readFileSync(filename):'');}
    else if(pathname.startsWith('/api/')){response.setHeader('Content-Type','application/json');response.end(JSON.stringify({success:true,data:pathname==='/api/branding'?branding:pathname==='/api/languages'?[{id:1,code:'luo',name:'Dholuo',nativeName:'Dholuo'}]:[],unreadCount:0}));}
    else if(/^\/icons\/[\w.-]+$/.test(pathname)){const filename=path.join('public',pathname);if(fs.existsSync(filename)){response.setHeader('Content-Type',pathname.endsWith('.svg')?'image/svg+xml':pathname.endsWith('.png')?'image/png':'image/x-icon');response.end(fs.readFileSync(filename));}else{response.statusCode=404;response.end();}}
    else{response.setHeader('Content-Type','text/html');response.end('<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><body><div id="root"></div><script src="/bundle.js"></script></body></html>');}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=9338',`--user-data-dir=${path.join(directory,'profile')}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
  let socket;
  try {
    let tabs; for(let retry=0;retry<60;retry++){try{tabs=await(await fetch('http://127.0.0.1:9338/json')).json();break;}catch{await new Promise(resolve=>setTimeout(resolve,250));}}
    assert.ok(tabs?.length,'Chrome must start'); socket=new WebSocket(tabs.find(tab=>tab.type==='page').webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
    let id=0;const pending=new Map();socket.onmessage=event=>{const message=JSON.parse(event.data);if(message.method==='Runtime.exceptionThrown')console.error('Browser:',message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);const callback=pending.get(message.id);if(callback){pending.delete(message.id);message.error?callback.reject(new Error(message.error.message)):callback.resolve(message.result);}};
    const command=(method,params={})=>new Promise((resolve,reject)=>{const requestId=++id;pending.set(requestId,{resolve,reject});socket.send(JSON.stringify({id:requestId,method,params}));});
    const evaluate=async expression=>{const value=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(value.exceptionDetails)throw new Error(value.exceptionDetails.exception?.description || value.exceptionDetails.text);return value.result.value;};
    const waitFor=async expression=>{for(let retry=0;retry<80;retry++){if(await evaluate(expression))return;await new Promise(resolve=>setTimeout(resolve,100));}throw new Error('Timed out: '+expression);};
    const click=async selector=>{const bounds=await evaluate(`(()=>{const node=document.querySelector(${JSON.stringify(selector)});if(!node)throw new Error('Missing control');const b=node.getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2};})()`);await command('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...bounds});await command('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...bounds});};
    const menuState = state => `document.querySelector('[aria-label="Open account menu"]')?.getAttribute('aria-expanded')==='${state}'`;
    await command("Runtime.enable");
    const results=[];
    for(const kind of ['application','native','dashboard','language-admin','super-admin','legacy-menu']){
      for(const width of [320,360,390,768,1440]){
        await command('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<768});await command('Page.navigate',{url:`${origin}/?kind=${kind}#/dashboard?module=dictionary`});await waitFor(`!!document.querySelector('[data-bottom-controls]') && !!document.querySelector('[aria-label="Open account menu"]')`);
        await evaluate(`window.fixtureScroller=[...document.querySelectorAll('main, main *')].find(node=>['auto','scroll'].includes(getComputedStyle(node).overflowY)&&node.scrollHeight>node.clientHeight+100)||document.querySelector('main');window.fixtureScroller.scrollTop=120;new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`);
        const before=await evaluate(`(()=>{const top=document.querySelector('[data-sticky-controls]').getBoundingClientRect();const dock=document.querySelector('[data-bottom-controls]').getBoundingClientRect();return {top:top.top,height:top.height,dockTop:dock.top,dockBottom:dock.bottom,header:document.querySelector('header').getBoundingClientRect().height};})()`);
        await evaluate('window.fixtureScroller.scrollTop=600;new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
        const after=await evaluate(`(()=>{const top=document.querySelector('[data-sticky-controls]').getBoundingClientRect();const dock=document.querySelector('[data-bottom-controls]').getBoundingClientRect();const row=document.querySelector('[data-search-language-row]');const input=row.querySelector('input').getBoundingClientRect(),select=row.querySelector('select').getBoundingClientRect();return {top:top.top,dockTop:dock.top,dockBottom:dock.bottom,overflow:document.documentElement.scrollWidth>innerWidth,aligned:Math.abs(input.top-select.top)<2,scrolled:window.fixtureScroller.scrollTop,filters:[...document.querySelectorAll('[aria-label="Content type"] button')].map(b=>b.getBoundingClientRect().top)};})()`);
        assert.ok(before.height<=112 && before.header<=64,JSON.stringify({kind,width,before}));assert.ok(Math.abs(before.top-after.top)<1 && Math.abs(before.dockTop-after.dockTop)<1 && Math.abs(after.dockBottom-844)<1 && !after.overflow && after.aligned && after.scrolled>100 && new Set(after.filters).size===1,JSON.stringify({kind,width,before,after}));
        for(const action of ['close','trigger','escape','outside','navigate']){
          await click('[aria-label="Open account menu"]');await waitFor(menuState('true'));
          if(action==='close')await click('[aria-label="Close account menu"]');
          else if(action==='trigger')await click('[aria-label="Open account menu"]');
          else if(action==='escape')await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
          else if(action==='outside'){await command('Input.dispatchMouseEvent',{type:'mousePressed',x:8,y:400,button:'left',clickCount:1});await command('Input.dispatchMouseEvent',{type:'mouseReleased',x:8,y:400,button:'left',clickCount:1});}
          else await evaluate(`document.querySelector('[aria-label="Close account menu"]').parentElement.parentElement.querySelector('a[href]').click()`);
          await waitFor(menuState('false'));
        }
        // Filtering must actually change the collection, not just the button colour.
        if(kind!=='application'&&kind!=='native'){await click('[aria-label="Audio"]');await waitFor(`!!document.querySelector('[aria-label="Audio"][aria-pressed="true"]') && !document.querySelector('article')`);await click('[aria-label="All"]');await waitFor(`!!document.querySelector('article')`);}
        results.push({kind,width,before,after,menuDismissal:['close','trigger','escape','outside','navigate']});
        if(width===360){await command('Page.navigate',{url:`${origin}/?kind=${kind}#/dashboard?module=dictionary`});await waitFor('!!document.querySelector("[data-bottom-controls]")');const shot=await command('Page.captureScreenshot',{format:'png'});fs.writeFileSync(`docs/system-audit/screenshots/mobile-arrangement-${kind}-360.png`,Buffer.from(shot.data,'base64'));}
      }
      console.log('PASS '+kind+': five widths, fixed bottom filters, compact search, five account-menu dismissal methods.');
    }
    for(const kind of ['login','register'])for(const width of [360,1440]){
      await command('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<768});await command('Page.navigate',{url:`${origin}/?kind=${kind}`});await waitFor('document.querySelectorAll("[data-partner-branding=auth] img").length===2 && [...document.querySelectorAll("[data-partner-branding=auth] img")].every(img=>img.complete&&img.naturalWidth>0)');
      const logos=await evaluate('[...document.querySelectorAll("[data-partner-branding=auth] img")].map(img=>({name:img.alt,height:img.getBoundingClientRect().height,top:img.getBoundingClientRect().top}))');assert.ok(logos.every(logo=>logo.height>=80&&logo.top<600));assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false);const shot=await command('Page.captureScreenshot',{format:'png'});fs.writeFileSync(`docs/system-audit/screenshots/branding-${kind}-${width}.png`,Buffer.from(shot.data,'base64'));results.push({kind,width,logos});console.log(`PASS ${kind} ${width}px: both saved logos loaded before authentication.`);
    }
    fs.writeFileSync('docs/system-audit/mobile-arrangement-verification.json',JSON.stringify({fixtureContent:true,realSavedBranding:true,results},null,2));
  } finally {socket?.close();chrome.kill();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error.stack);process.exitCode=1;});
