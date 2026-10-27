// Read-only browser checks against a local production server. Sessions are
// short-lived, signed locally, and always refreshed against existing accounts.
// No passwords, cookies, account identifiers, or personal content are printed.
require('dotenv').config();
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const { PrismaClient } = require('@prisma/client');
const { encode } = require('next-auth/jwt');
const prisma = new PrismaClient();
const base = process.env.SMOKE_BASE_URL || 'http://localhost:3017';
const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

async function until(check, description, timeout = 45_000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    try { const value = await check(); if (value) return value; } catch { /* page transition */ }
    await delay(250);
  }
  throw new Error(`Timed out: ${description}`);
}

async function main() {
  const updatesOnly = process.argv.includes('--updates');
  const entryOnly = process.argv.includes('--entry') || updatesOnly;
  const interactions = process.argv.includes('--interactions');
  if (interactions) console.log('CHECK read-only session preparation');
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!entryOnly) assert.ok(secret, 'Session secret is required');
  const users = entryOnly ? [] : await until(() => prisma.user.findMany({ where: { status: 'active' }, select: { id: true, name: true, email: true, isSuperAdmin: true, isMasterSuperAdmin: true, languageRoles: { include: { language: true } } } }), 'active account database query', 60_000);
  const administrator = users.find(user => user.isMasterSuperAdmin);
  if (!entryOnly) assert.ok(administrator, 'An active master administrator is required');
  const cookieFor = async user => encode({ secret, salt: 'authjs.session-token', maxAge: 600, token: { sub: user.id, id: user.id, name: user.name, email: user.email, isSuperAdmin: user.isSuperAdmin || user.isMasterSuperAdmin, isMasterSuperAdmin: user.isMasterSuperAdmin, languageRoles: user.languageRoles.map(role => ({ languageId: role.languageId, languageCode: role.language.code, languageName: role.language.name, role: role.role })) } });
  if (process.argv.includes('--forms')) {
    const headers = { Cookie: 'authjs.session-token=' + await cookieFor(administrator) };
    for (const moduleCode of ['dictionary', 'proverbs', 'riddles', 'songs', 'folktales', 'oral_histories', 'artifacts', 'heritage_sites']) {
      const response = await fetch(base + '/contribute/' + moduleCode, { headers, redirect: 'manual', signal: AbortSignal.timeout(60_000) });
      const html = await response.text();
      assert.equal(response.status, 200, 'Contribution page ' + moduleCode);
      assert.ok(html.includes('id="contribution-title"') && html.includes('Save private draft') && html.includes('type="submit"'), 'Structured form renders for ' + moduleCode);
      console.log('PASS structured contribution form: ' + moduleCode);
    }
    const hub = await fetch(base + '/contribute', { headers, signal: AbortSignal.timeout(60_000) });
    const html = await hub.text();
    assert.equal(hub.status, 200);
    assert.equal(html.includes('href="/contribute/chatbot"'), false);
    assert.equal(html.includes('href="/contribute/audio_visual"'), false);
    console.log('PASS contribution hub excludes tools without contribution forms');
    return;
  }
  if (interactions) console.log('CHECK isolated Chrome startup');
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'luolingua-review-'));
  const debugPort = await new Promise((resolve, reject) => {
    const server = require('node:net').createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => { const port = server.address().port; server.close(() => resolve(port)); });
  });
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let websocket;
  let captureFailure;
  try {
    const target = await until(async () => (await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json()).find(item => item.type === 'page'), 'Chrome startup');
    websocket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { websocket.addEventListener('open', resolve, { once: true }); websocket.addEventListener('error', reject, { once: true }); });
    let sequence = 0;
    const pending = new Map();
    websocket.addEventListener('message', event => { const message = JSON.parse(event.data); const callback = pending.get(message.id); if (callback) { pending.delete(message.id); message.error ? callback.reject(new Error(message.error.message)) : callback.resolve(message.result); } });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      if (websocket.readyState !== WebSocket.OPEN) return reject(new Error('Browser connection is unavailable'));
      const id = ++sequence;
      const timer = setTimeout(() => { pending.delete(id); reject(new Error('Browser command timed out: ' + method)); }, 120_000);
      pending.set(id, { resolve: value => { clearTimeout(timer); resolve(value); }, reject: error => { clearTimeout(timer); reject(error); } });
      websocket.send(JSON.stringify({ id, method, params }));
    });
    websocket.addEventListener('close', () => { for (const callback of pending.values()) callback.reject(new Error('Browser connection closed')); pending.clear(); });
    const evaluate = async expression => { const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw new Error('Browser evaluation failed: ' + (result.exceptionDetails.exception?.description?.split('\n')[0] || result.exceptionDetails.text)); return result.result.value; };
    captureFailure = async () => { const shot = await send('Page.captureScreenshot', { format: 'png' }); await fs.writeFile(path.join(os.tmpdir(), 'luolingua-navigation-failure.png'), Buffer.from(shot.data, 'base64')); };
    await send('Page.enable');
    await send('Runtime.enable');
    // Run the legacy control-selector checks in English; bilingual rendering
    // is covered separately and translated accessible names remain localized.
    await send('Page.addScriptToEvaluateOnNewDocument', { source: 'try { localStorage.setItem("heritage-interface", JSON.stringify({community:"luo",local:false})); } catch {}' });
    await send('Network.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1365, height: 768, deviceScaleFactor: 1, mobile: false });
    const setAccount = async user => { await send('Network.clearBrowserCookies'); await send('Network.setCookie', { name: 'authjs.session-token', value: await cookieFor(user), url: base, httpOnly: true, sameSite: 'Lax' }); };
    const loadPage = async (pathname, ready, timeout = 90_000) => {
      // Redirected routes may end at the same URL as the previous document.
      // Wait for a new document instead of accepting the previous page's DOM.
      const marker = 'navigation-' + Date.now() + '-' + Math.random();
      await evaluate(`window.__smokePreviousDocument = ${JSON.stringify(marker)}`);
      await send('Page.navigate', { url: base + pathname });
      await until(() => evaluate(`window.__smokePreviousDocument !== ${JSON.stringify(marker)} && document.readyState === 'complete' && (${ready})`), pathname, timeout);
    };
    const navigate = async pathname => { await loadPage(pathname, `location.pathname === ${JSON.stringify(pathname)} && !!document.querySelector('button[aria-label="Open account menu"]')`); await delay(750); };
    const openMenu = async () => { await until(async () => { if (await evaluate(`document.querySelector('button[aria-label="Open account menu"]').getAttribute('aria-expanded') === 'true'`)) return true; await evaluate(`document.querySelector('button[aria-label="Open account menu"]').click()`); await delay(400); return await evaluate(`document.querySelector('button[aria-label="Open account menu"]').getAttribute('aria-expanded') === 'true'`); }, 'account menu hydration'); };
    const clickMenuLink = async pathname => { await evaluate(`document.querySelector('button[aria-label="Open account menu"]').parentElement.querySelector('a[href=${JSON.stringify(pathname)}]').click()`); await until(() => evaluate(`location.pathname === ${JSON.stringify(pathname)} && !!document.querySelector('button[aria-label="Open account menu"]')`), 'menu navigation'); await delay(750); };
    const clickVisible = async selector => {
      const point = await evaluate(`(() => {
        const element = document.querySelector(${JSON.stringify(selector)});
        if (!element) return null;
        element.scrollIntoView({ block: 'center' });
        const rect = element.getBoundingClientRect();
        const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
        const hit = document.elementFromPoint(x, y);
        return { x, y, reachable: hit === element || element.contains(hit), blocker: hit?.tagName };
      })()`);
      assert.ok(point, 'Control exists: ' + selector);
      assert.equal(point.reachable, true, 'Control is reachable by mouse: ' + selector + ' (hit ' + point.blocker + ')');
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 });
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 });
    };
    if (updatesOnly) {
      await loadPage('/mobile-apps', `location.pathname === '/mobile-apps' && document.body.textContent.includes('Check for updates')`);
      const errors = [];
      websocket.addEventListener('message', event => { const message = JSON.parse(event.data); if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text); });
      const current = await evaluate(`document.querySelector('meta[name="app-version"]')?.content`);
      assert.ok(current && current !== 'development', 'Production build has a release ID');
      assert.equal(await evaluate(`fetch('/api/app-version', {cache:'no-store'}).then(r => r.json()).then(r => r.version)`), current, 'Server and page share the release ID');
      const browserManifest = await send('Page.getAppManifest');
      assert.equal(browserManifest.errors.length, 0, 'Chrome accepts the installation manifest');
      assert.equal(JSON.parse(browserManifest.data).name, 'Luo Heritage');
      const checkSelector = 'button';
      const clickCheck = async () => {
        await until(() => evaluate(`(() => { const button = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Check for updates')); return !!button && !!Object.keys(button).find(key => key.startsWith('__reactProps$')); })()`), 'update controls hydrated');
        await evaluate(`document.querySelector('[data-smoke-check]')?.removeAttribute('data-smoke-check'); [...document.querySelectorAll(${JSON.stringify(checkSelector)})].find(b => b.textContent.includes('Check for updates')).setAttribute('data-smoke-check', '')`);
        await clickVisible('[data-smoke-check]');
      };
      await clickCheck();
      await until(() => evaluate(`document.querySelector('[role="status"]')?.textContent.includes('latest version')`), 'current release confirmation');
      assert.equal(await evaluate(`!!document.querySelector('[aria-label="App update"]')`), false);
      console.log('PASS release ID survives server startup; manual check confirms latest release');
      await evaluate(`(() => {
        const originalFetch = window.fetch.bind(window);
        window.__smokeRelease = { mode: 'error', version: 'smoke-next-release', calls: 0 };
        window.fetch = async (input, options) => {
          if (String(input) === '/api/app-version') {
            window.__smokeRelease.calls++;
            return window.__smokeRelease.mode === 'error' ? new Response('{}', {status:503}) : Response.json({ version: window.__smokeRelease.version });
          }
          return originalFetch(input, options);
        };
      })()`);
      await clickCheck();
      await until(() => evaluate(`document.querySelector('[role="status"]')?.textContent.includes('Couldn’t check')`), 'failed check feedback');
      assert.equal(await evaluate(`!!document.querySelector('[aria-label="App update"]')`), false, 'Failure never announces a false update');
      await evaluate(`Object.defineProperty(navigator, 'onLine', { configurable:true, get: () => false })`);
      await clickCheck();
      await until(() => evaluate(`document.querySelector('[role="status"]')?.textContent.includes('Couldn’t check')`), 'offline check feedback');
      await evaluate(`Object.defineProperty(navigator, 'onLine', { configurable:true, get: () => true }); window.__smokeRelease.mode = 'success'; window.__smokeRelease.version = ${JSON.stringify(current)}`);
      await clickCheck();
      await until(() => evaluate(`document.querySelector('[role="status"]')?.textContent.includes('latest version')`), 'recovery after failed and offline checks');
      console.log('PASS failed/offline checks recover without false alerts or stuck controls');
      await evaluate(`window.__smokeRelease.version = 'smoke-next-release'; window.__smokeUnsavedWork = 'keep-my-work'; window.dispatchEvent(new Event('focus'))`);
      await until(() => evaluate(`!!document.querySelector('[aria-label="App update"]')`), 'background release alert');
      assert.equal(await evaluate(`window.__smokeUnsavedWork`), 'keep-my-work', 'Release detection never automatically reloads work');
      await evaluate(`document.querySelector('[aria-label="App update"] button').setAttribute('data-smoke-later', '')`);
      await clickVisible('[data-smoke-later]');
      await until(() => evaluate(`!document.querySelector('[aria-label="App update"]')`), 'Later hides alert');
      await evaluate(`window.dispatchEvent(new Event('focus'))`);
      await delay(400);
      assert.equal(await evaluate(`!!document.querySelector('[aria-label="App update"]')`), false, 'Same dismissed release stays quiet');
      await clickCheck();
      await until(() => evaluate(`!!document.querySelector('[aria-label="App update"]')`), 'manual check reopens available update');
      console.log('PASS background alert, Later, and manual recheck preserve unfinished work');
      await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
      const geometry = await evaluate(`(() => { const box = document.querySelector('[aria-label="App update"]').getBoundingClientRect(); return { left:box.left, right:box.right, bottom:box.bottom, width:innerWidth, height:innerHeight, overflow:document.documentElement.scrollWidth > innerWidth }; })()`);
      assert.ok(geometry.left >= 0 && geometry.right <= geometry.width && geometry.bottom <= geometry.height);
      assert.equal(geometry.overflow, false);
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      await fs.writeFile(path.join(os.tmpdir(), 'luo-heritage-update-mobile-review.png'), Buffer.from(shot.data, 'base64'));
      await evaluate(`document.querySelector('[aria-label="App update"] button:last-child').setAttribute('data-smoke-update', '')`);
      await clickVisible('[data-smoke-update]');
      await until(() => evaluate(`window.__smokeUnsavedWork === undefined && document.readyState === 'complete' && document.body.textContent.includes('Check for updates')`), 'Update now reloads the current page');
      await clickCheck();
      await until(() => evaluate(`document.querySelector('[role="status"]')?.textContent.includes('latest version')`), 'updated page has current release');
      assert.equal(await evaluate(`!!document.querySelector('[aria-label="App update"]')`), false);
      assert.equal(errors.length, 0, 'No browser runtime exceptions');
      console.log('PASS phone notice fits; Update now reloads and removes the obsolete alert');
      return;
    }
    if (entryOnly) {
      for (const pathname of ['/', '/luo', '/eng']) {
        await loadPage(pathname, `location.pathname === '/login' && document.querySelector('h1')?.textContent.trim() === 'Welcome back' && !!document.querySelector('input[type="password"]')`);
        assert.equal(await evaluate(`document.body.textContent.includes('Misawa!')`), false);
        assert.equal(await evaluate(`document.body.textContent.includes('Every language')`), true);
        console.log('PASS first-load route ' + pathname + ': current login screen, no old landing');
      }
      await delay(750);
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      await fs.writeFile(path.join(os.tmpdir(), 'luolingua-login-entry-review.png'), Buffer.from(shot.data, 'base64'));
      await until(async () => { if (await evaluate(`location.pathname === '/register' && !!document.querySelector('input[type="password"]')`)) return true; await evaluate(`document.querySelector('a[href="/register"]')?.click()`); await delay(300); return await evaluate(`location.pathname === '/register' && !!document.querySelector('input[type="password"]')`); }, 'registration navigation');
      assert.equal(await evaluate(`document.body.textContent.includes('Every language')`), true);
      console.log('PASS current registration screen reachable from login');
      await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
      for (const pathname of ['/login', '/register']) {
        await loadPage(pathname, `location.pathname === ${JSON.stringify(pathname)} && !!document.querySelector('main input[type="password"]') && !!document.querySelector('main img[src="/icons/luo-heritage.svg"]')?.closest('main')?.querySelector('h1')`);
        const geometry = await evaluate(`(() => { const image = document.querySelector('main img[src="/icons/luo-heritage.svg"]'); const main = image.closest('main'); const logo = image.getBoundingClientRect(); const heading = main.querySelector('h1').getBoundingClientRect(); return { separate: logo.bottom < heading.top, width: logo.width, fits: document.documentElement.scrollWidth <= innerWidth }; })()`);
        assert.equal(geometry.separate, true, 'Phone branding does not cover the form');
        assert.equal(geometry.fits, true);
        assert.ok(geometry.width >= 56);
        assert.equal(await evaluate('document.title'), 'Luo Heritage');
        console.log('PASS phone ' + pathname + ': new branding, clear form spacing, and no overflow');
      }
      return;
    }
    await setAccount(administrator);
    if (process.argv.includes('--dashboard-capture')) {
      for (const pathname of ['/dashboard', '/admin/dashboard', '/super-admin/dashboard']) {
        await loadPage(pathname, `location.pathname === ${JSON.stringify(pathname)} && !!document.querySelector('.heritage-canvas h1')`, 120_000);
        await until(() => evaluate(`(() => { const control = document.querySelector('select[aria-label="Interface language"]'); return !!control && Object.keys(control).some(key => key.startsWith('__reactProps$')); })()`), 'language control hydration');
        await evaluate(`(() => { const control = document.querySelector('select[aria-label="Interface language"]'); control.value = 'luo:local'; control.dispatchEvent(new Event('change', {bubbles:true})); })()`);
        await until(() => evaluate(`document.documentElement.lang === 'luo' && !!document.querySelector('.interface-text-pair [lang="en"][contenteditable="false"]')`), 'Dholuo with English help');
        for (const width of [1365, 390, 320]) {
          await send('Emulation.setDeviceMetricsOverride', { width, height: width > 767 ? 900 : 844, deviceScaleFactor: 1, mobile: width < 768 });
          await delay(500);
          assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, pathname + ' bilingual view fits ' + width);
          const shot = await send('Page.captureScreenshot', {format:'png'});
          await fs.writeFile(path.join(os.tmpdir(), 'luo-bilingual-' + pathname.replaceAll('/', '-') + '-' + width + '.png'), Buffer.from(shot.data, 'base64'));
        }
        console.log('PASS loaded bilingual dashboard, noneditable English help and 1365/390/320px widths: ' + pathname);
      }
      return;
    }
    if (process.argv.includes('--appearance')) {
      let exceptions = 0;
      websocket.addEventListener('message', event => { if (JSON.parse(event.data).method === 'Runtime.exceptionThrown') exceptions++; });
      const visible = id => evaluate(`(() => { const element = document.getElementById(${JSON.stringify(id)}); return !!element && getComputedStyle(element).display !== 'none' && element.getBoundingClientRect().left >= -1 && !element.inert; })()`);
      const screenshot = async name => { const shot = await send('Page.captureScreenshot', { format: 'png' }); await fs.writeFile(path.join(os.tmpdir(), name), Buffer.from(shot.data, 'base64')); };
      const desktopToggle = async id => {
        await until(() => visible(id), 'expanded ' + id);
        const before = await evaluate('document.querySelector("main").getBoundingClientRect().left');
        await clickVisible('button[aria-label="Collapse sidebar"]');
        await until(async () => !(await visible(id)), 'collapsed ' + id);
        assert.ok(await evaluate('document.querySelector("main").getBoundingClientRect().left') < before, 'Content uses the freed sidebar space');
        await send('Page.reload');
        await until(() => evaluate(`!!document.querySelector('button[aria-label="Expand sidebar"]')`), 'saved collapse preference');
        assert.equal(await visible(id), false);
        await clickVisible('button[aria-label="Expand sidebar"]');
        await until(() => visible(id), 'restored ' + id);
        console.log('PASS ' + id + ': collapse, extra content space, reload persistence, and expand');
      };
      const mobileDrawer = async id => {
        for (const width of [320, 390]) {
          await send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: true });
          await delay(500);
          const geometry = await evaluate(`(() => { const button = document.querySelector('button[aria-label="Open menu"]'), logo = document.querySelector('header a img[alt=""]'); const a = button.getBoundingClientRect(), b = logo.getBoundingClientRect(); return { separate: a.right <= b.left, width: b.width, normalFlow: getComputedStyle(button).position !== 'fixed', fits: document.documentElement.scrollWidth <= innerWidth }; })()`);
          assert.equal(geometry.separate, true, 'Menu and logo do not overlap');
          assert.equal(geometry.normalFlow, true, 'Menu belongs to the header layout');
          assert.equal(geometry.fits, true, 'Phone view does not overflow');
          assert.ok(geometry.width >= 44, 'Prominent phone logo');
          await clickVisible('button[aria-label="Open menu"]');
          await until(() => visible(id), 'mobile drawer open');
          assert.equal(await evaluate(`document.getElementById(${JSON.stringify(id)}).contains(document.activeElement)`), true);
          assert.equal(await evaluate(`document.getElementById(${JSON.stringify(id)}).getAttribute('aria-modal')`), 'true');
          await evaluate(`(() => { const panel = document.getElementById(${JSON.stringify(id)}); const links = [...panel.querySelectorAll('a[href], button:not([disabled])')].filter(element => element.getClientRects().length); links[0].focus(); })()`);
          await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', modifiers: 8 });
          await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', modifiers: 8 });
          assert.equal(await evaluate(`document.getElementById(${JSON.stringify(id)}).contains(document.activeElement)`), true, 'Keyboard focus stays in the drawer');
          await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' });
          await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape' });
          await until(() => evaluate(`document.querySelector('button[aria-label="Open menu"]').getAttribute('aria-expanded') === 'false'`), 'Escape closes drawer');
          assert.equal(await evaluate(`document.getElementById(${JSON.stringify(id)}).inert`), true, 'Hidden navigation cannot take focus');
          assert.equal(await evaluate(`document.activeElement === document.querySelector('button[aria-label="Open menu"]')`), true, 'Focus returns to the menu button');
          await delay(350);
        }
        await screenshot(id + '-mobile-review.png');
        console.log('PASS ' + id + ': separate menu/logo, 320/390px widths, mobile drawer, focus trap, Escape, and focus restoration');
        await send('Emulation.setDeviceMetricsOverride', { width: 1365, height: 768, deviceScaleFactor: 1, mobile: false });
        await delay(500);
      };
      await navigate('/dashboard');
      assert.equal(await evaluate('document.title'), 'Luo Heritage');
      await desktopToggle('public-sidebar');
      const previousWidth = await evaluate('document.getElementById("public-sidebar").getBoundingClientRect().width');
      await evaluate(`document.querySelector('[aria-label="Resize sidebar"]').focus()`);
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight' });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight' });
      await until(() => evaluate(`document.getElementById('public-sidebar').getBoundingClientRect().width === ${Math.min(420, previousWidth + 16)}`), 'sidebar keyboard resize');
      await screenshot('public-sidebar-desktop-review.png');
      await clickVisible('button[aria-label="Collapse sidebar"]');
      await mobileDrawer('public-sidebar');
      assert.equal(await visible('public-sidebar'), false, 'Desktop collapse is independent of the mobile drawer');
      await clickVisible('button[aria-label="Expand sidebar"]');
      await until(() => visible('public-sidebar'), 'public sidebar restored');
      assert.equal(await evaluate('document.getElementById("public-sidebar").getBoundingClientRect().width'), Math.min(420, previousWidth + 16), 'Expansion restores the resized width');
      await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
      await delay(500);
      await clickVisible('button[aria-label="Open menu"]');
      await until(() => visible('public-sidebar'), 'public drawer open for navigation');
      await evaluate(`(() => { const group = document.querySelector('aside a[href="/dashboard?module=dictionary"]').closest('details'); if (group && !group.open) group.querySelector('summary').click(); })()`);
      await clickVisible('aside a[href="/dashboard?module=dictionary"]');
      await until(() => evaluate(`location.search.includes('module=dictionary') && document.querySelector('button[aria-label="Open menu"]').getAttribute('aria-expanded') === 'false'`), 'module navigation closes drawer');
      await send('Emulation.setDeviceMetricsOverride', { width: 1365, height: 768, deviceScaleFactor: 1, mobile: false });
      await navigate('/admin/dashboard');
      await desktopToggle('admin-sidebar');
      await mobileDrawer('admin-sidebar');
      await screenshot('admin-sidebar-desktop-review.png');
      await navigate('/super-admin/dashboard');
      await desktopToggle('admin-sidebar');
      const regularAdmin = users.find(user => !user.isSuperAdmin && !user.isMasterSuperAdmin && user.languageRoles.some(role => role.role === 'language_admin'));
      if (regularAdmin) { await setAccount(regularAdmin); await navigate('/admin/dashboard'); await desktopToggle('admin-sidebar'); }
      assert.equal(exceptions, 0, 'No uncaught browser errors');
      console.log('PASS branding, resized sidebar, public navigation, regular admin, and super admin controls; no browser exceptions');
      return;
    }
    if (process.argv.includes('--interactions')) {
      console.log('CHECK physical contribution and account menu controls');
      let exceptions = 0;
      websocket.addEventListener('message', event => { const message = JSON.parse(event.data); if (message.method === 'Runtime.exceptionThrown') exceptions++; });
      const timed = async (description, action, ready) => {
        const started = Date.now();
        await action();
        await until(() => evaluate(ready), description, 120_000);
        console.log('PASS ' + description + ': ' + (Date.now() - started) + ' ms');
      };
      const proverbsReady = `location.search.includes('module=proverbs') && !!document.querySelector('button[aria-label="Open account menu"]') && !!document.querySelector('.blink-contribute')`;
      await timed('proverbs page', () => loadPage('/dashboard?module=proverbs', proverbsReady), proverbsReady);
      await evaluate('document.fonts.ready');
      await until(() => evaluate(`(() => { const link = document.querySelector('.blink-contribute'); return Object.keys(link).some(key => key.startsWith('__reactProps$') && typeof link[key]?.onClick === 'function'); })()`), 'contribution link hydration');
      await clickVisible('.blink-contribute');
      await until(() => evaluate(`document.body.textContent.includes('Open contribution form') || (location.pathname === '/contribute/proverbs' && !!document.querySelector('input')) || !!document.querySelector('[aria-label="Loading page"]')`), 'contribution click', 20_000);
      if (await evaluate(`location.pathname !== '/contribute/proverbs'`)) {
        if (await evaluate(`document.body.textContent.includes('Open contribution form')`)) await clickVisible('.fixed .max-w-lg button.bg-stone-900');
      }
      await until(() => evaluate(`location.pathname === '/contribute/proverbs' && !!document.querySelector('input') && document.body.textContent.includes('Save private draft')`), 'proverbs contribution form', 120_000);
      console.log('PASS contribution button opens the working structured form');
      await clickVisible('form button[type="submit"]');
      await until(() => evaluate(`document.body.textContent.includes('Title is required')`), 'empty contribution validation');
      console.log('PASS empty contribution reports validation without submitting');
      for (const pathname of ['/dashboard', '/admin/dashboard', '/super-admin/dashboard', '/dashboard']) {
        await clickVisible('button[aria-label="Open account menu"]');
        await until(() => evaluate(`document.querySelector('button[aria-label="Open account menu"]').getAttribute('aria-expanded') === 'true'`), 'open menu');
        await timed('physical menu navigation to ' + pathname, () => clickVisible('button[aria-label="Open account menu"] ~ div a[href="' + pathname + '"]'), `location.pathname === ${JSON.stringify(pathname)} && !!document.querySelector('button[aria-label="Open account menu"]') && !document.querySelector('[role="status"][aria-live="polite"]')`);
        await delay(750);
      }
      await timed('physical sidebar navigation to dictionary', () => clickVisible('aside a[href="/dashboard?module=dictionary"]'), `location.search.includes('module=dictionary') && !!document.querySelector('.blink-contribute') && !document.querySelector('[role="status"][aria-live="polite"]')`);
      assert.equal(exceptions, 0, 'No uncaught browser exceptions during interactions');
      assert.equal(await evaluate(`getComputedStyle(document.body).fontFamily.includes('Inter')`), true);
      await evaluate('document.fonts.ready');
      assert.equal(await evaluate(`document.fonts.check('16px Inter') && document.fonts.check('24px Lora')`), true);
      assert.equal(await evaluate(`['Inter', 'Lora'].every(name => [...document.fonts].some(face => face.family.includes(name) && face.status === 'loaded'))`), true);
      console.log('PASS bundled Inter and Lora fonts load with the existing theme');
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      await fs.writeFile(path.join(os.tmpdir(), 'luolingua-interactions-review.png'), Buffer.from(shot.data, 'base64'));
      console.log('PASS no browser exceptions during contribution and dashboard switching');
      return;
    }
    await navigate('/super-admin/dashboard');
    await openMenu();
    await clickMenuLink('/dashboard');
    assert.equal(await evaluate(`!!document.querySelector('a[href="/dashboard?module=dictionary"]')`), true);
    console.log('PASS master administrator: View public site opens the public module dashboard');
    assert.equal(await evaluate("getComputedStyle(document.querySelector('header')).display"), 'flex');
    assert.equal(await evaluate("document.documentElement.scrollWidth <= innerWidth"), true);
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await delay(500);
    assert.equal(await evaluate("document.documentElement.scrollWidth <= innerWidth"), true);
    console.log('PASS desktop and mobile public dashboard: CSS loaded and no page overflow');
    await send('Emulation.setDeviceMetricsOverride', { width: 1365, height: 768, deviceScaleFactor: 1, mobile: false });
    await delay(750);
    const screenshot = await send('Page.captureScreenshot', { format: 'png' });
    await fs.writeFile(path.join(os.tmpdir(), 'luolingua-public-review.png'), Buffer.from(screenshot.data, 'base64'));
    await openMenu();
    await clickMenuLink('/admin/dashboard');
    console.log('PASS public account menu: return to administrator dashboard');
    await openMenu();
    await clickMenuLink('/super-admin/dashboard');
    console.log('PASS administrator account menu: return to super administrator dashboard');

    if (process.argv.includes('--quick')) {
      const token = await cookieFor(administrator);
      for (const moduleCode of ['dictionary', 'proverbs', 'riddles', 'songs', 'folktales', 'oral_histories', 'artifacts', 'heritage_sites']) {
        const response = await fetch(base + '/dashboard?module=' + moduleCode, { headers: { Cookie: 'authjs.session-token=' + token }, redirect: 'manual' });
        assert.equal(response.status, 200, 'Public module ' + moduleCode);
        await response.text();
      }
      console.log('PASS all eight public module dashboards: HTTP 200');
      await navigate('/super-admin/system');
      await until(() => evaluate(`!!document.querySelector('input[placeholder="Luo Heritage"]')`), 'settings input');
      await evaluate(`document.querySelector('input[placeholder="Luo Heritage"]').focus()`);
      await send('Input.insertText', { text: '!' });
      await delay(300);
      assert.equal(await evaluate(`document.activeElement === document.querySelector('input[placeholder="Luo Heritage"]')`), true);
      console.log('PASS settings input retains focus after typing; no settings saved');
      return;
    }
    for (const role of ['super_admin', 'language_admin', 'uploader', 'publisher', 'content_editor', 'cultural_expert']) {
      const user = users.find(user => !user.isMasterSuperAdmin && (role === 'super_admin' ? user.isSuperAdmin : user.languageRoles.some(item => item.role === role)));
      if (!user) { console.log(`SKIP live ${role}: no active sample account; covered by regression tests`); continue; }
      await setAccount(user);
      await navigate('/admin/dashboard');
      await openMenu();
      await clickMenuLink('/dashboard');
      console.log(`PASS ${role}: administrator to public dashboard`);
    }
    const masterToken = await cookieFor(administrator);
    const adminPages = ['/admin/dashboard', '/admin/content', '/admin/validation-queue', '/admin/review-queue', '/admin/editor-queue', '/admin/published-history', '/admin/review-history', '/admin/media', '/admin/transcripts', '/admin/users', '/admin/translations', '/admin/analytics', '/admin/ai-monitoring', '/admin/audit-logs', '/super-admin/dashboard', '/super-admin/admins', '/super-admin/languages', '/super-admin/backup', '/super-admin/system', '/dashboard', '/profile', '/my-submissions', '/contribute'];
    for (const pathname of adminPages) {
      const response = await fetch(base + pathname, { headers: { Cookie: 'authjs.session-token=' + masterToken }, redirect: 'manual' });
      assert.equal(response.status, 200, 'Administrator page ' + pathname);
      await response.text();
    }
    console.log('PASS 23 signed-in administrator/public pages: HTTP 200');
    for (const [pathname, destination] of [['/', '/login'], ['/luo', '/'], ['/eng', '/']]) {
      const response = await fetch(base + pathname, { redirect: 'manual' });
      // A loading boundary can commit HTML before the server resolves auth;
      // Next then emits the redirect inside that stream instead of HTTP 307.
      if (pathname === '/' && response.status === 200) {
        const html = await response.text();
        assert.ok(html.includes('NEXT_REDIRECT') && html.includes('url=/login'), 'Streamed anonymous login redirect');
        continue;
      }
      assert.equal(response.status, 307, 'Retired landing ' + pathname);
      assert.equal(new URL(response.headers.get('location'), base).pathname, destination);
    }
    console.log('PASS anonymous entry routes: current login replaces the retired landing screen');
    const publicPages = ['/luo/muma', '/luo/ngero', '/luo/ngeche', '/luo/sigana', '/luo/sigana/folktales', '/luo/wende', '/luo/gik-luo', '/luo/piny-luo', '/luo/search', '/chatbot', '/about', '/privacy', '/terms', '/login', '/register', '/mobile-apps'];
    for (const pathname of publicPages) {
      const response = await fetch(base + pathname, { redirect: 'manual' });
      assert.equal(response.status, 200, 'Public page ' + pathname);
      await response.text();
    }
    console.log('PASS 16 anonymous public pages: HTTP 200');
    const reader = users.find(user => !user.isSuperAdmin && !user.isMasterSuperAdmin && !user.languageRoles.some(role => ['language_admin', 'uploader', 'publisher', 'content_editor', 'cultural_expert'].includes(role.role)));
    if (reader) {
      const token = await cookieFor(reader);
      const response = await fetch(base + '/api/users', { headers: { Cookie: `authjs.session-token=${token}` }, redirect: 'manual' });
      assert.equal(response.status, 403);
      console.log('PASS live ordinary account: user-directory access is forbidden');
    }
    await send('Network.clearBrowserCookies');
    const unauthenticated = await fetch(base + '/api/users', { redirect: 'manual' });
    assert.equal(unauthenticated.status, 401);
    assert.equal((await unauthenticated.json()).error, 'Unauthorized');
    console.log('PASS live anonymous request: protected API returns JSON 401');
  } catch (error) {
    if (captureFailure) await Promise.race([captureFailure().catch(() => {}), delay(3000)]);
    throw error;
  } finally {
    websocket?.close();
    chrome.kill();
    await delay(500);
    // This directory was created by mkdtemp solely for this run.
    const resolved = path.resolve(profile);
    if (path.dirname(resolved) === path.resolve(os.tmpdir()) && path.basename(resolved).startsWith('luolingua-review-')) await fs.rm(resolved, { recursive: true, force: true }).catch(() => {});
  }
}
main().catch(error => { console.error('Navigation smoke check failed:', error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
