// Inspect the real login/registration pages without entering credentials,
// submitting registration, authorizing an app or contacting an OAuth provider.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const base = process.env.AUTH_SMOKE_ORIGIN || 'http://localhost:3000';
const approval = '/mobile-auth?challenge=' + 'c'.repeat(43) + '&state=' + 's'.repeat(43);
async function until(check, label) {
  console.log("CHECK " + label);
  const end = Date.now() + 60000;
  while (Date.now() < end) { if (await check()) return; await new Promise(resolve => setTimeout(resolve, 300)); }
  throw new Error('Timed out: ' + label);
}
async function main() {
  assert.ok(['http://localhost:3000', 'http://127.0.0.1:3000', 'http://127.0.0.1:3100'].includes(base), 'Use the local review backend');
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'luo-auth-review-'));
  const port = await new Promise((resolve, reject) => {
    const server = require('node:net').createServer(); server.on('error', reject);
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
    const pending = new Map(), failures = [];
    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.method === 'Runtime.exceptionThrown') failures.push(message.params.exceptionDetails.text);
      const callback = pending.get(message.id);
      if (callback) { pending.delete(message.id); message.error ? callback.reject(new Error(message.error.message)) : callback.resolve(message.result); }
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const sequence = ++id;
      const timer = setTimeout(() => { pending.delete(sequence); reject(new Error('Inspector timeout: ' + method)); }, 60000);
      pending.set(sequence, { resolve: result => { clearTimeout(timer); resolve(result); }, reject: error => { clearTimeout(timer); reject(error); } });
      socket.send(JSON.stringify({ id: sequence, method, params }));
    });
    const evaluate = async expression => {
      const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw new Error('Form inspection failed');
      return result.result.value;
    };
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 800, deviceScaleFactor: 1, mobile: true });
    await send('Page.navigate', { url: base + '/login?' + new URLSearchParams({ callbackUrl: approval }) });
    await until(() => evaluate('document.querySelector("h1")?.textContent.includes("Welcome back")&&!!document.querySelector("input[name=password]")'), 'login form');
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'), true);
    const loginButtons = await evaluate('Array.from(document.querySelectorAll("button")).map(button=>button.textContent).join(" ")');
    assert.match(loginButtons,/Google/);assert.doesNotMatch(loginButtons,/Microsoft|Apple|phone|OTP/i);
    assert.ok(await evaluate('Array.from(document.querySelectorAll("a")).some(link=>link.getAttribute("href")?.startsWith("/account-recovery"))'));
    await fs.mkdir(path.join(process.cwd(),'docs/system-audit/screenshots'),{recursive:true});
    const screen=await send('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(process.cwd(),'docs/system-audit/screenshots/login-mobile.png'),Buffer.from(screen.data,'base64'));
    const registration = await evaluate('Array.from(document.querySelectorAll("a")).find(e=>e.textContent.includes("Create new account"))?.getAttribute("href")');
    assert.equal(new URL(registration, base).searchParams.get('callbackUrl'), approval);
    await evaluate('Array.from(document.querySelectorAll("a")).find(e=>e.textContent.includes("Create new account")).click()');
    await until(() => evaluate('document.querySelector("h1")?.textContent.includes("Get started")&&!!document.querySelector("input[name=name]")'), 'registration form');
    assert.equal(await evaluate('new URL(location.href).searchParams.get("callbackUrl")'), approval);
    const login = await evaluate('Array.from(document.querySelectorAll("a")).find(e=>e.textContent.trim()==="Sign in")?.getAttribute("href")');
    assert.equal(new URL(login, base).searchParams.get('callbackUrl'), approval);
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'), true);
    await evaluate('Array.from(document.querySelectorAll("a")).find(e=>e.textContent.trim()==="Sign in").click()');
    await until(() => evaluate('document.querySelector("h1")?.textContent.includes("Welcome back")&&!!document.querySelector("input[name=password]")'), 'return to login');
    assert.equal(await evaluate('new URL(location.href).searchParams.get("callbackUrl")'), approval);
    await send('Page.navigate', { url: base + '/login?' + new URLSearchParams({ callbackUrl: 'https://example.invalid/redirect' }) });
    await until(() => evaluate('document.querySelector("h1")?.textContent.includes("Welcome back")&&!!document.querySelector("input[name=password]")'), 'unsafe callback login');
    assert.equal(await evaluate('Array.from(document.querySelectorAll("a")).find(e=>e.textContent.includes("Create new account"))?.getAttribute("href")'), '/register');
    await send('Page.navigate',{url:base+'/account-recovery'});
    await until(()=>evaluate('document.querySelector("h1")?.textContent.includes("Reset password")&&!!document.querySelector("input[name=email]")'),'password recovery screen');
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);
    assert.deepEqual(failures, []);
    console.log('PASS real login/register links retain app approval, reject external returns and fit a 360px screen; no credentials submitted or accounts created');
  } finally {
    socket?.close(); browser.kill();
    const resolved = path.resolve(profile), parent = path.resolve(os.tmpdir());
    if (path.dirname(resolved) === parent && path.basename(resolved).startsWith('luo-auth-review-')) {
      await new Promise(resolve => setTimeout(resolve, 750));
      await fs.rm(resolved, { recursive: true, force: true, maxRetries: 3 }).catch(() => {});
    }
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
