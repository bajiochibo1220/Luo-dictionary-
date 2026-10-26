// Read-only native WebView proof on the user's selected USB Android phone.
// The development app must be installed, open, and forwarded to the backend.
// No contribution, provider request, account mutation or chat write is sent.
// --storage-check additionally writes/removes a random encrypted scratch entry
// through the debug-only probe. It never reads or changes the login entry.
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const command = promisify(execFile);
const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || path.join(os.homedir(), 'AppData/Local/Android/Sdk');
const adb = path.join(sdk, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb');
async function device(args) { return (await command(adb, ['-d', ...args], { windowsHide: true, timeout: 30000 })).stdout.trim(); }
async function until(check, label) {
  const end = Date.now() + 60000;
  while (Date.now() < end) { if (await check()) return; await new Promise(resolve => setTimeout(resolve, 300)); }
  throw new Error('Timed out: ' + label);
}
async function main() {
  const reverse = await device(['reverse', '--list']);
  assert.ok(reverse.split('\n').some(line => {
    const ports = line.trim().split(/\s+/).slice(-2);
    return ports[0] === 'tcp:3000' && ports[1] === 'tcp:3000';
  }), 'Restore USB forwarding first: adb -d reverse tcp:3000 tcp:3000');
  const pid = await device(['shell', 'pidof', 'org.jooust.luoheritage.dev']);
  assert.match(pid, /^\d+$/, 'Open the development app first');
  const port = await device(['forward', 'tcp:0', 'localabstract:webview_devtools_remote_' + pid]);
  assert.match(port, /^\d+$/);
  let socket, send, evaluate, networkSimulation = false;
  const requests = [];
  try {
    let target;
    await until(async () => {
      try {
        const targets = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
        target = targets.find(item => ['https://localhost', 'http://localhost'].includes(new URL(item.url).origin));
        return !!target;
      } catch { return false; }
    }, 'development app WebView startup');
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
    let nextId = 0;
    const pending = new Map(), failures = [];
    socket.addEventListener('message', event => {
      const result = JSON.parse(event.data);
      if (result.method === 'Runtime.exceptionThrown') failures.push(result.params.exceptionDetails.text);
      if (result.method === 'Network.responseReceived') {
        const response = result.params.response;
        const pathname = new URL(response.url).pathname;
        if (['/api/v1/bootstrap', '/api/v1/library'].includes(pathname)) requests.push({ endpoint: pathname, status: response.status });
      }
      if (pending.has(result.id)) { const callback = pending.get(result.id); pending.delete(result.id); result.error ? callback.reject(new Error(result.error.message)) : callback.resolve(result.result); }
    });
    send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++nextId;
      const timeout = setTimeout(() => { pending.delete(id); reject(new Error('Inspector timeout: ' + method)); }, 15000);
      pending.set(id, { resolve: value => { clearTimeout(timeout); resolve(value); }, reject: error => { clearTimeout(timeout); reject(error); } });
      socket.send(JSON.stringify({ id, method, params }));
    });
    evaluate = async expression => {
      const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw new Error('App inspection failed');
      return result.result.value;
    };
    await send('Runtime.enable');
    if (process.argv.includes('--storage-check')) {
      assert.equal(await evaluate('window.Capacitor.isPluginAvailable("SecureAuthStorage")'), true);
      assert.equal(await evaluate('window.Capacitor.Plugins.SecureAuthStorage.checkStorage().then(result=>result.ready===true)'), true);
      console.log('PASS Android protected-storage bridge: Keystore AES-GCM encryption, committed scratch storage and decryption; no login secrets read or replaced');
      return;
    }
    if (process.argv.includes('--diagnostic')) {
      const layout = await evaluate('({welcomeShown:document.querySelector("main h2")?.textContent.includes("Welcome"),authenticated:!!document.querySelector("header button[aria-label=\\\"Open account menu\\\"]"),savedChatsShown:Array.from(document.querySelectorAll("main h2")).some(e=>e.textContent==="Saved chats"),errorShown:!!document.querySelector("main [role=\\\"alert\\\"]"),loadingShown:!!document.querySelector("main [role=\\\"status\\\"]"),visible:document.visibilityState==="visible",iconWidth:document.querySelector("header img")?.naturalWidth,iconPath:document.querySelector("header img")?.getAttribute("src"),viewportWidth:innerWidth,documentWidth:document.documentElement.scrollWidth,mainWidth:document.querySelector("main")?.clientWidth,headerBoxes:Array.from(document.querySelectorAll("header > *")).map(e=>({tag:e.tagName,left:Math.round(e.getBoundingClientRect().left),right:Math.round(e.getBoundingClientRect().right),width:Math.round(e.getBoundingClientRect().width)}))})');
      console.log(JSON.stringify(layout)); return;
    }
    await send('Network.enable');
    await until(() => evaluate('innerWidth>0&&document.visibilityState==="visible"'), 'unlock the phone and keep Luo Heritage visible');
    await evaluate('location.hash="/dashboard"');
    if (await evaluate('!!document.querySelector("main [role=\\\"alert\\\"] button")')) await evaluate('document.querySelector("main [role=\\\"alert\\\"] button").click()');
    await until(() => evaluate('document.querySelector("main h2")?.textContent.includes("Welcome")'), 'native public overview');
    assert.equal(await evaluate('document.querySelector("header img").naturalWidth>0'), true, 'Header artwork must load');
    assert.equal(await evaluate('document.querySelector("header span[title]").clientWidth>=100'), true, 'The app name must stay visible on the phone');
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'), true, 'The native layout must fit the phone viewport');
    await evaluate('document.querySelector("[aria-label=\\\"Open menu\\\"]").click()');
    await until(() => evaluate('document.querySelector("aside").getAttribute("aria-hidden")==="false"'), 'native sidebar');
    await evaluate('document.querySelector("nav a[href=\\\"#/dashboard?module=artifacts\\\"]").click()');
    await until(() => evaluate('!!document.querySelector("main h2")&&!document.querySelector("main h2").textContent.includes("Welcome")&&!document.querySelector("main [role=\\\"status\\\"]")&&!document.querySelector("main [role=\\\"alert\\\"]")'), 'native live library');
    assert.equal(await evaluate('document.querySelector("aside").getAttribute("aria-hidden")'), 'true');
    await evaluate('document.querySelector("[aria-label=\\\"Grid view\\\"]").click()');
    assert.equal(await evaluate('document.querySelector("[aria-label=\\\"Grid view\\\"]").getAttribute("aria-pressed")'), 'true');
    await evaluate('document.querySelector("#language").value="eng";document.querySelector("#language").dispatchEvent(new Event("change",{bubbles:true}))');
    await until(() => evaluate('document.querySelector("main header p")?.textContent.startsWith("English")'), 'native language change');
    console.log('PASS actual Android launch/icon, live governed library, sidebar, view/language controls and layout');
    networkSimulation = true;
    await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    await evaluate('location.hash="/dashboard?module=songs"');
    await until(() => evaluate('!!document.querySelector("main [role=\\\"alert\\\"] button")'), 'native failed-network state');
    await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    await evaluate('document.querySelector("main [role=\\\"alert\\\"] button").click()');
    await until(() => evaluate('!!document.querySelector("main h2")&&!document.querySelector("main [role=\\\"alert\\\"]")'), 'native connection recovery');
    await evaluate('location.hash="/chatbot"');
    await until(() => evaluate('!!document.querySelector("input[aria-label=\\\"Your question\\\"]")'), 'bundled native chat screen');
    assert.equal(await evaluate('document.querySelector("main form button[type=\\\"submit\\\"]").disabled'), true);
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'), true);
    await evaluate('location.hash="/account"');
    await until(() => evaluate('document.querySelector("main").textContent.includes("Sign in to view your saved chats")'), 'native anonymous account boundary');
    assert.deepEqual(failures, []);
    console.log('PASS actual Android network recovery, shared chat permission boundary and anonymous account boundary; no records modified');
    await evaluate('document.querySelector("#language").value="luo";document.querySelector("#language").dispatchEvent(new Event("change",{bubbles:true}));location.hash="/dashboard"');
  } catch (error) {
    if (requests.length) console.error('Public API responses:', JSON.stringify(requests));
    throw error;
  } finally {
    if (send && networkSimulation) await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }).catch(() => {});
    if (evaluate && !process.argv.includes('--diagnostic')) await evaluate('location.hash="/dashboard"').catch(() => {});
    socket?.close();
    await device(['forward', '--remove', 'tcp:' + port]).catch(() => {});
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
