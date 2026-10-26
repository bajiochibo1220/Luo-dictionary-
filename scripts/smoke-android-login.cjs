// Open the user's app-owned login/registration browser tab. Inspect form
// presence only; never read credentials, create an account or approve sign-in.
const assert = require('node:assert/strict');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const command = promisify(execFile);
const adb = path.join(process.env.ANDROID_HOME || 'D:/Android/Sdk', 'platform-tools/adb.exe');
const intent = process.argv.includes('--register') ? 'register' : 'login';
async function device(args) { return (await command(adb, ['-d', ...args], { windowsHide: true, timeout: 30000 })).stdout.trim(); }
async function until(check, label) {
  const end = Date.now() + 60000;
  while (Date.now() < end) { if (await check()) return; await new Promise(resolve => setTimeout(resolve, 300)); }
  throw new Error('Timed out: ' + label);
}
async function inspect(target) {
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  let id = 0;
  const pending = new Map();
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data), callback = pending.get(message.id);
    if (callback) { pending.delete(message.id); message.error ? callback.reject(new Error(message.error.message)) : callback.resolve(message.result); }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const sequence = ++id;
    const timer = setTimeout(() => { pending.delete(sequence); reject(new Error('Inspector timeout: ' + method)); }, 15000);
    pending.set(sequence, { resolve: result => { clearTimeout(timer); resolve(result); }, reject: error => { clearTimeout(timer); reject(error); } });
    socket.send(JSON.stringify({ id: sequence, method, params }));
  });
  return { close: () => socket.close(), evaluate: async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error('App form inspection failed');
    return result.result.value;
  } };
}
async function main() {
  const reverse = await device(['reverse', '--list']);
  assert.ok(reverse.split('\n').some(line => line.trim().split(/\s+/).slice(-2).join(' ') === 'tcp:3000 tcp:3000'), 'Restore USB forwarding first');
  const pid = await device(['shell', 'pidof', 'org.jooust.luoheritage.dev']);
  assert.match(pid, /^\d+$/, 'Open Luo Heritage first');
  const ports = [], inspectors = [];
  async function forward(name) { const value = await device(['forward', 'tcp:0', 'localabstract:' + name]); assert.match(value, /^\d+$/); ports.push(value); return value; }
  async function targets(port) { return (await (await fetch('http://127.0.0.1:' + port + '/json/list')).json()); }
  try {
    const appPort = await forward('webview_devtools_remote_' + pid);
    const appTarget = (await targets(appPort)).find(item => new URL(item.url).origin === 'https://localhost');
    assert.ok(appTarget, 'Inspect only the development app WebView');
    const app = await inspect(appTarget); inspectors.push(app);
    await until(() => app.evaluate('innerWidth>0&&document.visibilityState==="visible"'), 'keep the phone unlocked and app visible');
    assert.equal(await app.evaluate('document.querySelector("header span[title]").clientWidth>=100'), true);
    assert.equal(await app.evaluate('document.documentElement.scrollWidth<=innerWidth'), true);
    assert.equal(await app.evaluate('window.Capacitor.isPluginAvailable("DevelopmentConnection")'), true, 'Native debug gate must be registered');
    assert.equal(await app.evaluate('window.Capacitor.Plugins.DevelopmentConnection.canUseUsbAuth().then(result=>result.enabled)'), true, 'USB login must be explicitly enabled in this debug build');
    const label = intent === 'register' ? 'Create account' : 'Sign in';
    assert.equal(await app.evaluate(`!!document.querySelector('header button[aria-label="${label}"]')`), true, 'The app must be signed out for this form-opening check');
    await app.evaluate(`document.querySelector('header button[aria-label="${label}"]').click()`);
    await until(() => app.evaluate('document.visibilityState==="hidden"'), 'system browser opens from the app');
    const browserPort = await forward('chrome_devtools_remote');
    let browserTarget;
    await until(async () => {
      try {
        browserTarget = (await targets(browserPort)).find(item => {
          const url = new URL(item.url);
          return url.origin === 'http://localhost:3000' && ['/login', '/register', '/mobile-auth'].includes(url.pathname)
            && (url.pathname === '/mobile-auth' ? url.searchParams.has('state') : (url.searchParams.get('callbackUrl') || '').startsWith('/mobile-auth?'));
        });
        return !!browserTarget;
      } catch { return false; }
    }, 'app-owned browser sign-in tab');
    const browser = await inspect(browserTarget); inspectors.push(browser);
    let state;
    await until(async () => {
      state = await browser.evaluate('({visible:document.visibilityState==="visible",login:document.querySelector("h1")?.textContent.includes("Welcome back")&&!!document.querySelector("input[name=password]"),registration:document.querySelector("h1")?.textContent.includes("Get started")&&!!document.querySelector("input[name=name]"),approval:document.querySelector("h1")?.textContent.includes("Continue to Luo Heritage"),fits:document.documentElement.scrollWidth<=innerWidth})');
      return state.visible && (state.login || state.registration || state.approval);
    }, 'existing web form or signed-in approval screen');
    assert.equal(state.fits, true);
    assert.ok(state.approval || (intent === 'register' ? state.registration : state.login));
    console.log('PASS Android ' + label + ' opens ' + (state.approval ? 'the existing browser account approval' : intent === 'register' ? 'the web registration form' : 'the web login form') + '; phone form fits; no credentials read or submitted');
  } finally {
    inspectors.forEach(value => value.close());
    for (const port of ports) await device(['forward', '--remove', 'tcp:' + port]).catch(() => {});
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
