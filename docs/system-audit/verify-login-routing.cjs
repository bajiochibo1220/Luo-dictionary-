// Hydrated real login form + real continuation handler, with fixture sign-in
// sessions. No real credentials, accounts or repository writes are used.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { loader } = require('../../tests/load-ts.cjs');

async function main() {
  const source = `import React from 'react';import {createRoot} from 'react-dom/client';import {LoginForm} from '@/components/forms/login-form';import {SharedApplication} from '@/components/shared/application';
    const role=new URLSearchParams(location.search).get('role');
    const account={id:'fixture-'+role,name:'Fixture',email:'fixture@example.test',image:null,profileTypes:[],isSuperAdmin:false,isMasterSuperAdmin:role==='master',languageRoles:role==='uploader'?[{role:'uploader',languageId:1,languageCode:'luo',languageName:'Dholuo'}]:[]};
    const language={id:1,code:'luo',nativeName:'Dholuo',name:'Dholuo'};
    const featureRequest=async path=>path==='/api/branding'?{}:path.startsWith('/api/v1/contributions')?{language,modules:[]}:[];
    const adapters={apiOrigin:location.origin,artwork:'',bootstrap:async()=>({languages:[language],selectedLanguage:language,modules:[]}),library:async()=>({items:[],title:'All content',baseName:'All content',moduleCode:'all',languageId:1,languageCode:'luo',languageName:'Dholuo'}),account:async()=>account,conversations:async()=>[],featureRequest,featureFetch:fetch,chatRequest:fetch,nativeSession:{isNative:true,subscribe:callback=>{callback({accountId:account.id,expiresAt:new Date(Date.now()+3600000).toISOString()},'sign-in');return ()=>{};},connect:async()=>()=>{},start:async()=>{},resume:async()=>{},signOut:async()=>{}}};
    createRoot(document.getElementById('root')).render(location.pathname==='/native'?<SharedApplication adapters={adapters}/>:<LoginForm/>);`;
  const bundle = await require('esbuild').build({ stdin: { contents: source, loader: 'tsx', resolveDir: process.cwd() }, bundle: true, write: false, jsx: 'automatic', platform: 'browser', tsconfig: path.resolve('tsconfig.json'), define: { 'process.env.NODE_ENV': '"production"' }, plugins: [{ name: 'fixture-auth', setup(build) {
    build.onResolve({ filter: /^(next\/link|next\/navigation|next-auth\/react)$/ }, args => ({ path: args.path, namespace: 'fixture' }));
    build.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ loader: 'jsx', resolveDir: process.cwd(), contents: args.path === 'next/link' ? "import React from 'react';export const useLinkStatus=()=>({pending:false});export default function Link(props){return <a {...props}/>;}" : args.path === 'next/navigation' ? "export const useRouter=()=>({push:value=>location.assign(value),refresh:()=>{}});export const usePathname=()=>location.pathname;export const useSearchParams=()=>new URLSearchParams(location.search);" : "export const useSession=()=>({data:null});export async function signIn(provider,options){const role=new URLSearchParams(location.search).get('role');await fetch('/fixture-session?role='+encodeURIComponent(role));if(provider==='google')location.assign(options.callbackUrl);return {ok:true};}" }));
  } }] });
  const users = { master: { id: 'master', isMasterSuperAdmin: true, isSuperAdmin: false }, super: { id: 'super', isSuperAdmin: true }, reader: { id: 'reader' } };
  for (const role of ['language_admin', 'content_editor', 'uploader', 'publisher']) users[role] = { id: role, languageRoles: [{ role, languageId: 1 }] };
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost');
      if (url.pathname === '/bundle.js') { response.setHeader('Content-Type', 'text/javascript'); response.end(bundle.outputFiles[0].contents); return; }
      if (url.pathname === '/fixture-session') { response.setHeader('Set-Cookie', `fixture-role=${url.searchParams.get('role')}; Path=/; HttpOnly; SameSite=Lax`); response.end('{}'); return; }
      if (url.pathname.startsWith('/api/')) { response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify({ success: true, data: url.pathname === '/api/languages' ? [{id:1,code:'luo',nativeName:'Dholuo'}] : url.pathname === '/api/interface-copy' ? {catalog:{}} : {} })); return; }
      if (url.pathname === '/auth/continue') {
        const role = request.headers.cookie?.match(/(?:^|;\s*)fixture-role=([^;]+)/)?.[1];
        const { GET } = loader({ '@/lib/auth': { auth: async () => users[role] ? { user: users[role] } : null } })('src/app/auth/continue/route.ts');
        const result = await GET(new Request(`http://${request.headers.host}${request.url}`));
        response.writeHead(result.status, { Location: result.headers.get('location') }); response.end(); return;
      }
      response.setHeader('Content-Type', 'text/html');
      response.end(['/login','/native'].includes(url.pathname) ? '<!doctype html><html><body><div id="root"></div><script src="/bundle.js"></script></body></html>' : `<!doctype html><html><body><h1 data-dashboard>${url.pathname}</h1></body></html>`);
    } catch (error) { response.statusCode = 500; response.end(error.message); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'heritage-login-routing-'));
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=9341', `--user-data-dir=${directory}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let socket;
  try {
    let tabs; for (let attempt = 0; attempt < 80; attempt++) { try { tabs = await (await fetch('http://127.0.0.1:9341/json')).json(); break; } catch { await new Promise(resolve => setTimeout(resolve, 100)); } }
    assert.ok(tabs?.length, 'Chrome must start.');
    socket = new WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl); await new Promise(resolve => { socket.onopen = resolve; });
    let id = 0; const pending = new Map(); socket.onmessage = event => { const value = JSON.parse(event.data); const waiter = pending.get(value.id); if (waiter) { pending.delete(value.id); value.error ? waiter.reject(new Error(value.error.message)) : waiter.resolve(value.result); } };
    const command = (method, params = {}) => new Promise((resolve, reject) => { const requestId = ++id; pending.set(requestId, { resolve, reject }); socket.send(JSON.stringify({ id: requestId, method, params })); });
    const evaluate = async expression => { const result = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.text); return result.result.value; };
    const wait = async expression => { for (let attempt = 0; attempt < 100; attempt++) { try { if (await evaluate(expression)) return; } catch {} await new Promise(resolve => setTimeout(resolve, 100)); } throw new Error(`Timed out: ${expression}`); };
    const results = [];
    for (const provider of ['credentials', 'google']) for (const role of Object.keys(users)) {
      await command('Page.navigate', { url: `${origin}/login?role=${role}` }); await wait('!!document.querySelector("input[name=email]")');
      await evaluate(`sessionStorage.setItem('application-return','/application#/dashboard?module=dictionary');`);
      if (provider === 'credentials') await evaluate(`document.querySelector('input[name=email]').value='fixture@example.test';document.querySelector('input[name=password]').value='fixture-only';document.querySelector('form').requestSubmit();`);
      else await evaluate(`[...document.querySelectorAll('button')].find(button=>button.textContent.trim()==='Google').click();`);
      await wait('!!document.querySelector("[data-dashboard]")');
      const actual = await evaluate('location.pathname + location.hash');
      const expected = ['master', 'super'].includes(role) ? '/super-admin/dashboard' : role === 'reader' ? '/application#/dashboard?module=dictionary' : '/admin/dashboard';
      assert.equal(actual, expected, `${provider} ${role}`); assert.equal(await evaluate('sessionStorage.getItem("application-return")'), null);
      results.push({ provider, role, destination: actual });
    }
    for(const role of ['master','uploader','reader']) {
      await command('Page.navigate',{url:`${origin}/native?role=${role}`});
      await wait(`location.hash==='${role==='reader'?'#/account':'#/workspace'}'`);
      if(role!=='reader') await wait(`document.body.textContent.includes('Staff workspace')`);
      results.push({provider:'native-session',role,destination:await evaluate('location.hash')});
    }
    fs.writeFileSync('docs/system-audit/login-routing-browser-verification-2026-10-26.json', JSON.stringify({ fixtureAuthentication: true, productionAccountWrites: false, results }, null, 2) + '\n');
    console.log(`PASS ${results.length} hydrated login flows: credentials/Google, master/super-admin, all staff duties and public readers with remembered library returns.`);
  } finally { socket?.close(); chrome.kill(); await new Promise(resolve => server.close(resolve)); }
}
main().catch(error => { console.error(error.stack); process.exitCode = 1; });
