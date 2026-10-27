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
    if (process.argv.includes('--branding')) {
      await fs.mkdir(path.join(process.cwd(), 'docs/system-audit/screenshots'), {recursive:true});
      for (const route of ['/login', '/register']) {
        await send('Page.navigate', {url:base+route});
        await until(() => evaluate(`location.pathname===${JSON.stringify(route)} && !!document.querySelector('.auth-form-content input') && !!document.querySelector('.auth-introduction .auth-logo-image')?.naturalWidth`), route+' institutional logo loaded');
        for (const width of [1366, 390, 320]) {
          await send('Emulation.setDeviceMetricsOverride', {width,height:900,deviceScaleFactor:1,mobile:width<768});
          await evaluate('scrollTo(0,0);document.fonts.ready');
          const geometry = await evaluate(`(()=>{const logo=document.querySelector('.auth-logo-image'), form=document.querySelector('.auth-form-surface'), brand=document.querySelector('.auth-brand img');const a=logo.getBoundingClientRect(),b=form.getBoundingClientRect(),c=brand.getBoundingClientRect();return{logoWidth:a.width,naturalWidth:logo.naturalWidth,logoBottom:a.bottom,formTop:b.top,separate:innerWidth>=768?a.right<=b.left:a.bottom<=b.top,opaque:getComputedStyle(logo).opacity==='1',clean:!form.querySelector('[data-institution-background]'),fits:document.documentElement.scrollWidth<=innerWidth,brandWidth:c.width};})()`);
          assert.equal(geometry.separate,true,route+' logo is outside the form at '+width);
          assert.equal(geometry.clean,true);assert.equal(geometry.opaque,true);assert.equal(geometry.fits,true);
          assert.ok(geometry.logoWidth>=(width>=768?300:160));assert.ok(geometry.brandWidth>=64);
          if(width<768)assert.ok(geometry.logoBottom<700,'Phone logo is visible before the form');
          const shot=await send('Page.captureScreenshot',{format:'png'});
          await fs.writeFile(path.join(process.cwd(),'docs/system-audit/screenshots',route.slice(1)+'-logo-'+width+'.png'),Buffer.from(shot.data,'base64'));
          console.log('PASS '+route+' '+width+'px: clear '+Math.round(geometry.logoWidth)+'px logo (source '+geometry.naturalWidth+'px), separate form, no overflow');
        }
      }
      assert.deepEqual(failures,[]);
      return;
    }
    await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 800, deviceScaleFactor: 1, mobile: true });
    await send('Page.navigate', { url: base + '/login?' + new URLSearchParams({ callbackUrl: approval }) });
    await until(() => evaluate('document.querySelector("h1")?.textContent.includes("Welcome back")&&!!document.querySelector("input[name=password]")'), 'login form');
    await evaluate('localStorage.setItem("heritage-interface", JSON.stringify({community:"luo",local:false})); const selector=document.querySelector("select[aria-label=\\"Interface language\\"]"); selector.value="luo:eng"; selector.dispatchEvent(new Event("change",{bubbles:true}));');
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'), true);
    const loginButtons = await evaluate('Array.from(document.querySelectorAll("button")).map(button=>button.textContent).join(" ")');
    assert.match(loginButtons,/Google/);assert.doesNotMatch(loginButtons,/Microsoft|Apple|phone|OTP/i);
    assert.ok(await evaluate('Array.from(document.querySelectorAll("a")).some(link=>link.getAttribute("href")?.startsWith("/forgot-password"))'));
    await fs.mkdir(path.join(process.cwd(),'docs/system-audit/screenshots'),{recursive:true});
    const screen=await send('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(process.cwd(),'docs/system-audit/screenshots/login-mobile.png'),Buffer.from(screen.data,'base64'));
    const registration = await evaluate('Array.from(document.querySelectorAll("a")).find(e=>e.textContent.includes("Create new account"))?.getAttribute("href")');
    assert.equal(new URL(registration, base).searchParams.get('callbackUrl'), approval);
    await evaluate('Array.from(document.querySelectorAll("a")).find(e=>e.textContent.includes("Create new account")).click()');
    await until(() => evaluate('document.querySelector("h1")?.textContent.includes("Get started")&&!!document.querySelector("input[name=name]")'), 'registration form');
    assert.equal(await evaluate('new URL(location.href).searchParams.get("callbackUrl")'), approval);
    const login = await evaluate('Array.from(document.querySelectorAll("a")).find(e=>e.getAttribute("href")?.startsWith("/login"))?.getAttribute("href")');
    assert.equal(new URL(login, base).searchParams.get('callbackUrl'), approval);
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'), true);
    await evaluate('Array.from(document.querySelectorAll("a")).find(e=>e.getAttribute("href")?.startsWith("/login")).click()');
    await until(() => evaluate('document.querySelector("h1")?.textContent.includes("Welcome back")&&!!document.querySelector("input[name=password]")'), 'return to login');
    assert.equal(await evaluate('new URL(location.href).searchParams.get("callbackUrl")'), approval);
    await send('Page.navigate', { url: base + '/login?' + new URLSearchParams({ callbackUrl: 'https://example.invalid/redirect' }) });
    await until(() => evaluate('location.search.includes("example.invalid")&&document.querySelector("h1")?.textContent.includes("Welcome back")&&!!document.querySelector("input[name=password]")&&!!document.querySelector("a[href=\\"/register\\"]")'), 'unsafe callback login');
    assert.equal(await evaluate('Array.from(document.querySelectorAll("a")).find(e=>e.textContent.includes("Create new account"))?.getAttribute("href")'), '/register');
    await send('Page.navigate',{url:base+'/forgot-password'});
    await until(()=>evaluate('document.querySelector("h1")?.textContent.includes("Reset password")&&!!document.querySelector("input[name=email]")'),'password recovery screen');
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);
    assert.equal(await evaluate('!!document.querySelector("select:not([aria-label=\\"Interface language\\"]),a[href=\\"/login\\"],a[href=\\"/register\\"]")'),false);
    assert.doesNotMatch(await evaluate('document.querySelector(".auth-form-content").textContent'),/Delete account|Verify email/);
    await until(()=>evaluate(`(()=>{const form=document.querySelector('.auth-form-content form');return !!form&&Object.keys(form).some(key=>key.startsWith('__reactProps$')&&typeof form[key]?.onSubmit==='function');})()`),'reset form hydration');
    const resetScreen=await send('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(process.cwd(),'docs/system-audit/screenshots/password-reset-email-mobile.png'),Buffer.from(resetScreen.data,'base64'));
    await evaluate(`window.resetCalls=[];window.realFetch=window.fetch;window.fetch=async(url,init)=>{if(url==='/api/auth/password-reset'){window.resetCalls.push(JSON.parse(init.body));return new Response(JSON.stringify({success:true,message:'Test reset response'}),{status:200,headers:{'Content-Type':'application/json'}});}return window.realFetch(url,init);};document.querySelector('input[name=email]').focus();`);
    await send('Input.insertText',{text:'browser-fixture@example.invalid'});
    await evaluate('document.querySelector(".auth-form-content form").requestSubmit()');
    await until(()=>evaluate('!!document.querySelector("input[name=code]")'),'reset code step');
    assert.deepEqual(await evaluate('window.resetCalls.map(call=>call.action)'),['request']);
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);
    const codeScreen=await send('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(process.cwd(),'docs/system-audit/screenshots/password-reset-code-mobile.png'),Buffer.from(codeScreen.data,'base64'));
    await evaluate(`for(const [name,value]of Object.entries({code:'123456',password:'browser-password-123',confirmation:'different-password-123'})){const input=document.querySelector('input[name='+name+']');input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));}document.querySelector('.auth-form-content form').requestSubmit();`);
    await until(()=>evaluate('document.querySelector("[role=alert]")?.textContent.includes("passwords do not match")'),'password confirmation mismatch');
    assert.equal(await evaluate('window.resetCalls.length'),1);
    await evaluate(`document.querySelector('input[name=confirmation]').value='browser-password-123';document.querySelector('.auth-form-content form').requestSubmit();`);
    await until(()=>evaluate('!document.querySelector("input[name=code]")&&!!document.querySelector("a[href=\\"/login\\"]")'),'reset success');
    assert.deepEqual(await evaluate('window.resetCalls.map(call=>call.action)'),['request','complete']);
    await evaluate('window.fetch=window.realFetch');
    assert.deepEqual(failures, []);
    console.log('PASS login/register links retain app approval and reject external returns; reset-only form sends code, checks password confirmation and completes at 360px; reset delivery is mocked, no emails sent or accounts changed');
  } finally {
    socket?.close(); browser.kill();
    const resolved = path.resolve(profile), parent = path.resolve(os.tmpdir());
    if (path.dirname(resolved) === parent && path.basename(resolved).startsWith('luo-auth-review-')) {
      await new Promise(resolve => setTimeout(resolve, 750));
      await fs.rm(resolved, { recursive: true, force: true, maxRetries: 3 }).catch(() => {});
    }
  }
}
main().catch(error => { console.error(error.stack); process.exitCode = 1; });
