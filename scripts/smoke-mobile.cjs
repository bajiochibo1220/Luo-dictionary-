// Read-only browser proof against the built mobile preview and local backend.
// Run after building clients/mobile with VITE_API_ORIGIN for that backend.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const base = process.env.MOBILE_SMOKE_URL || 'http://127.0.0.1:4173';
const identityBoundary = process.argv.includes('--identity-boundary');

async function until(check, description) {
  const end = Date.now() + 60000;
  while (Date.now() < end) {
    if (await check()) return;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error('Timed out: ' + description);
}

async function main() {
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'luo-mobile-review-'));
  const port = await new Promise((resolve, reject) => {
    const server = require('node:net').createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => { const value = server.address().port; server.close(() => resolve(value)); });
  });
  const browser = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=' + port, '--user-data-dir=' + profile, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let socket;
  try {
    let target;
    await until(async () => {
      try { target = (await (await fetch('http://127.0.0.1:' + port + '/json/list')).json()).find(item => item.type === 'page'); return !!target; } catch { return false; }
    }, 'browser startup');
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
    let id = 0;
    const pending = new Map();
    const failures = [];
    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.method === 'Runtime.exceptionThrown') failures.push(message.params.exceptionDetails.text);
      if (pending.has(message.id)) {
        const callback = pending.get(message.id); pending.delete(message.id);
        message.error ? callback.reject(new Error(message.error.message)) : callback.resolve(message.result);
      }
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const sequence = ++id;
      const timer = setTimeout(() => { pending.delete(sequence); reject(new Error('Browser timeout: ' + method)); }, 30000);
      pending.set(sequence, { resolve: value => { clearTimeout(timer); resolve(value); }, reject: error => { clearTimeout(timer); reject(error); } });
      socket.send(JSON.stringify({ id: sequence, method, params }));
    });
    const evaluate = async expression => {
      const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (response.exceptionDetails) throw new Error('Browser evaluation failed: ' + (response.exceptionDetails.exception?.description || response.exceptionDetails.text));
      return response.result.value;
    };
    await send('Runtime.enable');
    await send('Page.enable');
    if (identityBoundary) {
      assert.ok(['http://127.0.0.1:4173', 'http://localhost:4173'].includes(base), 'Use the local built preview');
      const configuration = await (await fetch('http://127.0.0.1:3000/api/v1/bootstrap?language=luo', { signal: AbortSignal.timeout(40000) })).json();
      assert.equal(configuration.success, true);
      const fixture = { version: 1, origin: 'http://localhost:3000', pending: null, revocations: [], session: {
        accessToken: 'lh_native_' + 'f'.repeat(22) + '.' + 'a'.repeat(43),
        refreshToken: 'lh_refresh_' + 'f'.repeat(22) + '.' + 'r'.repeat(43),
        expiresAt: new Date(Date.now() + 600000).toISOString(),
        refreshExpiresAt: new Date(Date.now() + 86400000).toISOString(),
      } };
      await send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => {
        window.__mockDisk = ${JSON.stringify(fixture)};
        window.__mockReads = [];
        window.__finishPrivateReads = () => {
          const account = { id: 'mock-owner', name: 'Mock private owner', email: 'fixture@example.invalid', image: null, profileTypes: [], isSuperAdmin: false, isMasterSuperAdmin: false, languageRoles: [] };
          const history = [{ id: 'mock-chat', title: 'Mock private history', pinned: false, archived: false, messageCount: 2, updatedAt: new Date().toISOString() }];
          for (const item of window.__mockReads) item.resolve(Response.json({success:true,data:item.account?account:history}));
        };
        window.androidBridge = {};
        window.Capacitor = {
          PluginHeaders: [
            {name:'SecureAuthStorage',methods:[{name:'read',rtype:'promise'},{name:'write',rtype:'promise'}]},
            {name:'DevelopmentConnection',methods:[{name:'canUseUsbAuth',rtype:'promise'}]},
            {name:'App',methods:[{name:'getLaunchUrl',rtype:'promise'},{name:'addListener',rtype:'callback'},{name:'removeListener',rtype:'promise'}]},
            {name:'Browser',methods:[{name:'open',rtype:'promise'},{name:'close',rtype:'promise'}]}
          ],
          nativeCallback: () => 'mock-listener',
          nativePromise: async (name,method,options) => {
            if(name==='SecureAuthStorage'&&method==='read') return {value:JSON.stringify(window.__mockDisk)};
            if(name==='SecureAuthStorage'&&method==='write') { window.__mockDisk=JSON.parse(options.value); return {}; }
            if(name==='DevelopmentConnection') return {enabled:true};
            return {};
          }
        };
        const originalFetch=window.fetch;
        window.fetch=(url,init={})=>{
          const pathname=new URL(url,location.href).pathname;
          if(pathname==='/api/v1/bootstrap') return Promise.resolve(Response.json(${JSON.stringify(configuration)}));
          if(pathname==='/api/v1/account'||pathname==='/api/v1/account/conversations') {
            // Intentionally ignore AbortSignal to force a late response through
            // the actual client/component after the identity has been cleared.
            return new Promise(resolve=>window.__mockReads.push({resolve,account:pathname==='/api/v1/account'}));
          }
          if(pathname==='/api/v1/native/revoke') return Promise.resolve(Response.json({success:true}));
          if(pathname.startsWith('/api/')) return Promise.reject(new Error('Unexpected fixture request'));
          return originalFetch(url,init);
        };
      })();` });
      await send('Page.navigate', { url: base });
      try {
        await until(() => evaluate('window.__mockReads?.length===2 && !!document.querySelector("header button[aria-label=\\\"Open account menu\\\"]")'), 'restored mock identity with pending account/history reads');
      } catch (error) {
        console.error(await evaluate('({platform:window.Capacitor?.getPlatform?.(),diskOrigin:window.__mockDisk?.origin,storedSession:!!window.__mockDisk?.session,readCount:window.__mockReads?.length,alerts:Array.from(document.querySelectorAll("[role=\\\"alert\\\"]")).map(e=>e.textContent),status:document.querySelector("main")?.innerText})'));
        console.error('Mock browser exception count:', failures.length);
        throw error;
      }
      await evaluate('document.querySelector("header button[aria-label=\\\"Open account menu\\\"]").click()');
      await evaluate('Array.from(document.querySelectorAll("header button")).find(e=>e.textContent.trim()==="Sign out").click(); queueMicrotask(()=>window.__finishPrivateReads());');
      await until(() => evaluate('!!document.querySelector("header button[aria-label=\\\"Sign in\\\"]") && document.querySelector("main").innerText.includes("Sign in to view your saved chats.")'), 'signed-out account screen');
      assert.equal(await evaluate('document.body.innerText.includes("Mock private owner")||document.body.innerText.includes("Mock private history")'), false);
      assert.equal(await evaluate('window.__mockDisk.session'), null);
      assert.deepEqual(await evaluate('window.__mockDisk.revocations'), []);
      assert.deepEqual(failures, []);
      console.log('PASS built mobile UI: protected-session restore fixture, sign-out during pending account/history loads, delayed responses discarded, guest screen and cleared protected state; native bridge/account responses mocked, no real user/login/provider writes');
      return;
    }
    await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: base });
    try {
      await until(() => evaluate('document.querySelector("main h2")?.textContent.includes("Welcome")'), 'live bootstrap and shared overview');
    } catch (error) {
      console.error('Public preview diagnostic:', await evaluate('JSON.stringify({title:document.querySelector("main h2")?.textContent,status:document.querySelector("[role=\\\"status\\\"]")?.textContent,alert:document.querySelector("[role=\\\"alert\\\"]")?.textContent,rootChildren:document.querySelector("#root")?.childElementCount})'));
      console.error('App exception count:', failures.length);
      throw error;
    }
    assert.equal(await evaluate('document.querySelector("header img").naturalWidth > 0'), true);
    await evaluate('document.querySelector("[aria-label=\\\"Collapse sidebar\\\"]").click()');
    await until(() => evaluate('document.querySelector("[aria-label=\\\"Expand sidebar\\\"]") !== null'), 'desktop sidebar collapse');
    await evaluate('document.querySelector("[aria-label=\\\"Expand sidebar\\\"]").click()');
    await evaluate('document.querySelector("nav a[href=\\\"#/dashboard?module=artifacts\\\"]").click()');
    try {
      await until(() => evaluate('document.querySelector("main h2") && !document.querySelector("main h2").textContent.includes("Welcome") && !document.querySelector("[role=\\\"status\\\"]")'), 'live artifacts');
    } catch (error) {
      console.error('Public library diagnostic:', await evaluate('JSON.stringify({title:document.querySelector("main h2")?.textContent,status:document.querySelector("[role=\\\"status\\\"]")?.textContent,alert:document.querySelector("[role=\\\"alert\\\"]")?.textContent,hash:location.hash})'));
      throw error;
    }
    assert.equal(await evaluate('document.querySelector("[role=\\\"alert\\\"]") !== null'), false);
    assert.equal(await evaluate('document.querySelector("a[href$=\\\"/contribute/artifacts\\\"]") !== null'), true);
    await evaluate('document.querySelector("[aria-label=\\\"Grid view\\\"]").click()');
    assert.equal(await evaluate('document.querySelector("[aria-label=\\\"Grid view\\\"]").getAttribute("aria-pressed")'), 'true');
    await evaluate('document.querySelector("[aria-label=\\\"Feed view\\\"]").click()');
    await evaluate('document.querySelector("#language").value="eng";document.querySelector("#language").dispatchEvent(new Event("change",{bubbles:true}))');
    await until(() => evaluate('document.querySelector("main header p")?.textContent.startsWith("English")'), 'English library');
    console.log('PASS bundled shared screens, real public API data, desktop collapse, content views, and language change');
    await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 844, deviceScaleFactor: 1, mobile: true });
    await until(() => evaluate('document.querySelector("[aria-label=\\\"Open menu\\\"]").getClientRects().length > 0'), 'mobile viewport');
    assert.equal(await evaluate('document.querySelector("header span[title]").clientWidth >= 100'), true, 'The app name must remain visible on a narrow phone');
    await evaluate('document.querySelector("[aria-label=\\\"Open menu\\\"]").click()');
    await until(() => evaluate('document.querySelector("aside").getAttribute("aria-hidden")==="false"'), 'mobile drawer');
    await evaluate('document.querySelector("nav a[href=\\\"#/dashboard?module=proverbs\\\"]").click()');
    await until(() => evaluate('document.querySelector("aside").getAttribute("aria-hidden")==="true" && !!document.querySelector("main h2") && !document.querySelector("[role=\\\"status\\\"]")'), 'drawer navigation');
    assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true);
    await send('Network.enable');
    await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    await evaluate('location.hash="/dashboard?module=songs"');
    await until(() => evaluate('!!document.querySelector("[role=\\\"alert\\\"] button")'), 'network failure retry');
    await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    await evaluate('document.querySelector("[role=\\\"alert\\\"] button").click()');
    await until(() => evaluate('!!document.querySelector("main h2") && !document.querySelector("[role=\\\"alert\\\"]")'), 'recovered connection');
    // Exercise the actual shared chat UI while intercepting only AI requests.
    // No provider call, quota counter or conversation write occurs in this proof.
    let chatPosts = 0;
    const sentQuestions = [];
    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.method !== 'Fetch.requestPaused') return;
      const paused = message.params;
      const isPreflight = paused.request.method === 'OPTIONS';
      let payload;
      if (!isPreflight) {
        chatPosts++;
        sentQuestions.push(JSON.parse(paused.request.postData));
        payload = chatPosts === 1 ? { success: false, error: 'Chat is temporarily unavailable. Please try again shortly.' }
          : { success: true, data: { answer: chatPosts === 2 ? 'An approved answer. '.repeat(150) : 'A follow-up answer.',
            sources: [{ id: 'public-example', title: 'Reviewed proverb', module: 'Proverbs', similarity: 1 }], media: [], conversationId: null } };
      }
      void send('Fetch.fulfillRequest', { requestId: paused.requestId, responseCode: isPreflight ? 204 : chatPosts === 1 ? 503 : 200,
        responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: new URL(base).origin },
          { name: 'Access-Control-Allow-Methods', value: 'POST, OPTIONS' }, { name: 'Access-Control-Allow-Headers', value: 'Content-Type' }],
        ...(payload ? { body: Buffer.from(JSON.stringify(payload)).toString('base64') } : {}) }).catch(() => {});
    });
    await send('Fetch.enable', { patterns: [{ urlPattern: '*/api/v1/chat', requestStage: 'Request' }] });
    await evaluate('location.hash="/chatbot"');
    await until(() => evaluate('!!document.querySelector("input[aria-label=\\\"Your question\\\"]")'), 'bundled shared chat');
    assert.equal(await evaluate('document.querySelector("main form button[type=\\\"submit\\\"]").disabled'), true);
    await evaluate('document.querySelector("main input[type=\\\"checkbox\\\"]").click()');
    await evaluate('const question=document.querySelector("input[aria-label=\\\"Your question\\\"]");Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(question,"Explain a proverb");question.dispatchEvent(new Event("input",{bubbles:true}));');
    await until(() => evaluate('!document.querySelector("main form button[type=\\\"submit\\\"]").disabled'), 'question entry');
    await evaluate('document.querySelector("main form button[type=\\\"submit\\\"]").click()');
    await until(() => evaluate('document.querySelector("[role=\\\"alert\\\"]")?.textContent.includes("temporarily unavailable")'), 'visible chat failure');
    assert.equal(await evaluate('document.querySelector("input[aria-label=\\\"Your question\\\"]").value'), 'Explain a proverb');
    await evaluate('document.querySelector("main form button[type=\\\"submit\\\"]").click()');
    await until(() => evaluate('document.querySelector("main").textContent.includes("An approved answer.")'), 'successful chat retry');
    assert.equal(await evaluate('!!document.querySelector("main a[href$=\\\"/ngero/public-example\\\"]")'), true);
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
    await evaluate('const followup=document.querySelector("input[aria-label=\\\"Your question\\\"]");Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(followup,"What does it mean?");followup.dispatchEvent(new Event("input",{bubbles:true}));');
    await evaluate('document.querySelector("main form button[type=\\\"submit\\\"]").click()');
    await until(() => evaluate('document.querySelector("main").textContent.includes("A follow-up answer.")'), 'chat continuation');
    assert.equal(sentQuestions[2].allowExternalAi, true);
    assert.equal(sentQuestions[2].history.every(turn => turn.content.length <= 2000), true);
    await send('Fetch.disable');
    console.log('PASS shared chat consent, failure/retry, source links, bounded follow-up history and mobile layout (AI transport intercepted; no writes)');
    await evaluate('location.hash="/account"');
    await until(() => evaluate('document.querySelector("main h1")?.textContent === "My account"'), 'bundled account destination');
    assert.equal(await evaluate('document.querySelector("main").textContent.includes("Sign in to view your saved chats.")'), true);
    assert.equal(await evaluate('document.querySelector("nav a[href=\\\"#/dashboard\\\"]").className.includes("border-amber-400")'), false);
    assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true);
    assert.deepEqual(failures, []);
    console.log('PASS mobile drawer/navigation, account sign-in boundary, no horizontal overflow, and failed-network recovery');
  } finally {
    socket?.close(); browser.kill();
    const resolved = path.resolve(profile);
    const parent = path.resolve(os.tmpdir());
    if (path.dirname(resolved) === parent && path.basename(resolved).startsWith('luo-mobile-review-')) {
      await new Promise(resolve => setTimeout(resolve, 750));
      await fs.rm(resolved, { recursive: true, force: true, maxRetries: 3 }).catch(() => {});
    }
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
