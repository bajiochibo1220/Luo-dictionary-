// Actual shared chat UI -> HTTP handler -> database/provider. All database
// transactions are rolled back; no saved chats or quota counters are retained.
require('dotenv').config({quiet:true});
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict'),ts=require('typescript');
const {PrismaClient}=require('@prisma/client');const {loader}=require('../tests/load-ts.cjs');
async function main(){
 const question=process.argv.includes('--catalog')?'Show available cultural artifacts':'Hello';
 const db=new PrismaClient(),temp=fs.mkdtempSync(path.join(os.tmpdir(),'luo-chat-check-'));let chrome,socket,server,origin,reply,transactions=0;
 try{
  const rollback=new Error('Synthetic chat verification rollback');
  const database=new Proxy(db,{get(target,name){if(name==='$transaction')return async(callback,options)=>{let result;try{await target.$transaction(async tx=>{result=await callback(tx);transactions++;throw rollback;},options);}catch(error){if(error!==rollback)throw error;}return result;};return Reflect.get(target,name);}});
  const existing=process.argv.includes('--account')?await db.user.findFirst({where:{status:'active',isMasterSuperAdmin:true},select:{id:true}}):null;
  if(process.argv.includes('--account'))assert.ok(existing,'An active administrator sample is required');
  const account=existing?{id:existing.id,languageRoles:[]}:null;
  const load=loader({'@/lib/db':{prisma:database},'@/lib/account-data':{getCurrentAccount:async()=>account}});
  const handler=load('src/lib/chat-handlers.ts').postChat;
  const sources=Object.fromEntries(Object.entries({'chat':'src/components/shared/chat-interface.tsx','@/lib/chat-transport':'src/lib/chat-transport.ts','@/lib/app-navigation':'src/lib/app-navigation.ts','@/components/shared/media-preview':'src/components/shared/media-preview.tsx','@/lib/media-preview':'src/lib/media-preview.ts'}).map(([name,file])=>[name,ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React}}).outputText]));
  const cssFile=fs.readdirSync('clients/mobile/dist/assets').find(file=>file.endsWith('.css'));const css=fs.readFileSync(path.join('clients/mobile/dist/assets',cssFile),'utf8');
  const script=`const sources=${JSON.stringify(sources)},cache={};const require=name=>{if(name==='react')return React;if(name==='lucide-react')return new Proxy({},{get:()=>()=>React.createElement('svg',{width:20,height:20})});if(name.includes('interface-language'))return {InterfaceText:({source})=>source,InterfaceButton:props=>React.createElement('button',props),InterfaceOption:props=>React.createElement('option',props),InterfaceTextarea:React.forwardRef((props,ref)=>React.createElement('textarea',{...props,ref}))};if(name==='@/lib/app-client')return {parseAppApiOrigin:value=>value};if(cache[name])return cache[name].exports;const m={exports:{}};cache[name]=m;new Function('require','module','exports',sources[name])(require,m,m.exports);return m.exports;};const root=ReactDOM.createRoot(document.getElementById('root'));const Link=props=>React.createElement('a',props);root.render(React.createElement(require('chat').SharedChatInterface,{guest:${!account},languageCode:'eng',cultureCode:'luo',request:require('@/lib/chat-transport').createChatTransport({origin:location.origin}),Link,BackLink:Link,onClose:()=>root.render(React.createElement('p',null,'Chat closed'))}));`;
  const html='<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+'html,body,#root{height:100%;margin:0}</style><div id="root"></div><script>'+fs.readFileSync('node_modules/react/umd/react.development.js','utf8')+'</script><script>'+fs.readFileSync('node_modules/react-dom/umd/react-dom.development.js','utf8')+'</script><script>'+script+'</script>';
  server=http.createServer(async(req,res)=>{try{if(req.method==='POST'&&req.url==='/api/v1/chat'){const chunks=[];for await(const chunk of req)chunks.push(chunk);const response=await handler(new Request(origin+req.url,{method:'POST',headers:req.headers,body:Buffer.concat(chunks).toString()}));reply=await response.json();res.writeHead(response.status,{'Content-Type':'application/json'});res.end(JSON.stringify(reply));}else if(req.url.startsWith('/api/v1/account/conversations')){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({success:true,data:[]}));}else if(req.url==='/'){res.writeHead(200,{'Content-Type':'text/html'});res.end(html);}else{res.writeHead(404);res.end();}}catch{res.writeHead(500);res.end(JSON.stringify({success:false,error:'Synthetic chat check failed.'}));}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin='http://127.0.0.1:'+server.address().port;
  const debugPort=await new Promise(resolve=>{const s=require('node:net').createServer();s.listen(0,'127.0.0.1',()=>{const port=s.address().port;s.close(()=>resolve(port));});});
  chrome=require('node:child_process').spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port='+debugPort,'--user-data-dir='+path.join(temp,'profile'),'about:blank'],{windowsHide:true,stdio:'ignore'});
  let target;for(let i=0;i<100;i++){try{target=(await(await fetch('http://127.0.0.1:'+debugPort+'/json/list')).json()).find(t=>t.type==='page');if(target)break;}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(target);
  socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise(resolve=>socket.addEventListener('open',resolve,{once:true}));let sequence=0;const pending=new Map(),errors=[];
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
  socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.text);const callback=pending.get(message.id);if(callback){pending.delete(message.id);message.error?callback.reject(Error(message.error.message)):callback.resolve(message.result);}});
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error('Browser evaluation failed: '+(r.exceptionDetails.exception?.description?.split('\n')[0]||r.exceptionDetails.text)+'; '+expression.slice(0,100));return r.result.value;};
  const until=async(expression,label)=>{const end=Date.now()+90000;while(Date.now()<end){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,250));}throw Error('Timed out: '+label+'; response: '+(reply?.error||'none'));};
  await send('Runtime.enable');await send('Page.enable');await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await send('Page.navigate',{url:origin});
  await until('!!document.querySelector("textarea")','chat composer');
  await evaluate(`document.querySelector('input[type=checkbox]').click();const input=document.querySelector('textarea');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input,${JSON.stringify(question)});input.dispatchEvent(new Event('input',{bubbles:true}));`);
  await until(`!document.querySelector('button[aria-label="Send question"]').disabled`,'send enabled');
  await evaluate(`document.querySelector('button[aria-label="Send question"]').click()`);
  if(process.argv.includes('--expect-unconfigured')) {
    await until('!!document.querySelector("[role=alert]")?.textContent.includes("DeepSeek API key")','DeepSeek setup error');
    assert.equal(reply.success,false);assert.match(reply.error,/DeepSeek API key/);assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);assert.deepEqual(errors,[]);
    console.log(JSON.stringify({pass:true,check:'Actual browser displays the missing DeepSeek key safely',transactionsRolledBack:transactions}));
  } else {
  await until('!!document.querySelector(".chat-assistant-message")?.textContent.trim()','real assistant reply');
  assert.equal(reply.success,true);assert.ok(reply.data.model);assert.ok(transactions>=2);assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);assert.deepEqual(errors,[]);
  console.log(JSON.stringify({pass:true,check:'Actual browser send and receive',mode:process.argv.includes('--catalog')?'catalog':'greeting',accountSample:!!account,model:reply.data.model,sources:reply.data.sources.length,transactionsRolledBack:transactions,conversationId:reply.data.conversationId}));
  }
  await evaluate(`document.querySelector('button[aria-label="Close chat"]').click()`);await until('document.body.textContent.includes("Chat closed")','close chat');console.log('PASS chat closes with X');
 }finally{socket?.close();chrome?.kill();await new Promise(r=>setTimeout(r,500));await new Promise(resolve=>server?server.close(resolve):resolve());await db.$disconnect();const resolved=path.resolve(temp);if(path.dirname(resolved)===path.resolve(os.tmpdir())&&path.basename(resolved).startsWith('luo-chat-check-'))try{fs.rmSync(resolved,{recursive:true,force:true,maxRetries:3});}catch{}}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
