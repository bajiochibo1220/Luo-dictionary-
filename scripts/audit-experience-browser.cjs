// Exercise the production bundle. Every API request is intercepted: no live writes.
require('dotenv').config({ quiet: true });
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3017';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const modules = ['dictionary', 'oral_histories', 'riddles', 'folktales', 'songs', 'artifacts', 'heritage_sites', 'audio_visual', 'research'].map(code => ({ code, title: code.replaceAll('_', ' '), baseName: code.replaceAll('_', ' '), href: `/dashboard?module=${code}`, contributionHref: `/contribute/${code}` }));
const account = { id: 'synthetic-audit-user', name: 'Synthetic audit account', email: 'audit@example.invalid', image: null, profileTypes: [], isSuperAdmin: true, isMasterSuperAdmin: true, languageRoles: [] };
const languages = [{ id: 1, code: 'luo', name: 'Luo', nativeName: 'Dholuo' }, { id: 2, code: 'eng', name: 'English', nativeName: 'English' }];
const item = { id: '11111111-1111-4111-8111-111111111111', title: 'Synthetic published story for responsive auditing', summary: 'Synthetic content. A long source reference: https://example.invalid/' + 'a'.repeat(180), bodyText: 'Synthetic complete story for interface checks only.', englishTitle: 'Synthetic English title', englishSummary: 'Synthetic English summary', kind: 'cultural', moduleCode: 'oral_histories', moduleName: 'Oral histories', media: [] };
const report = { apiTransport: 'synthetic; all intercepted', routes: [], layoutIssues: [], runtimeErrors: [], unknownApi: [], interactions: [] };
let activeRoute = '', width = 390, tutorCalls = 0, chatCalls = 0, mediaCalls = 0, guestMode = false;
function fixture(url, method) {
  const pathname = url.pathname;
  if (pathname === '/api/auth/session') return guestMode ? null : { user: { id: account.id, name: account.name, email: account.email }, expires: new Date(Date.now() + 3600000).toISOString() };
  if (pathname === '/api/v1/bootstrap') return { apiVersion: 1, app: { name: 'Luo Heritage', tagline: 'Heritage', version: 'audit', icon: '/icons/luo-heritage-512.png', manifest: '/application.webmanifest' }, selectedLanguage: languages[0], languages, modules, routes: {}, contentFilters: [], contentViews: [] };
  if (pathname === '/api/v1/library') { const code = url.searchParams.get('module'); return { title: 'Synthetic collection', baseName: 'Synthetic collection', moduleCode: code === 'audio_visual' ? 'all' : code, languageId: 1, languageCode: 'luo', languageName: 'Dholuo', canContribute: true, items: [item], categories: modules.map(entry => ({ code: entry.code, name: entry.baseName })), limits: { records: 12, dictionaryEntries: 6 }, continuation: { records: null, dictionary: null } }; }
  if (pathname === '/api/v1/account') return account;
  if (pathname === '/api/v1/account/conversations') return [];
  if (pathname === '/api/v1/account/settings') return { account, sessions: [], notifications: [] };
  if (pathname === '/api/languages') return languages;
  if (pathname === '/api/interface-copy') return { catalog: {} };
  if (pathname === '/api/branding' || pathname === '/api/v1/activity') return {};
  if (pathname === '/api/v1/learning') return { items: [], states: [], next: null, canEdit: false, canReview: false, canPublish: false };
  if (pathname === '/api/v1/education') return { items: [], next: null, canEdit: false, canReview: false, canPublish: false, canCreateClass: false };
  if (pathname === '/api/v1/saved') return { items: [] };
  if (pathname === '/api/v1/places') return { places: [], bounded: false };
  if (pathname === '/api/v1/knowledge') return { nodes: [], edges: [], truncated: false };
  if (pathname === '/api/v1/ai-tools' && method === 'POST') { mediaCalls++; return { text: 'Synthetic image draft', draft: true }; }
  if (pathname === '/api/v1/ai-tools') return { capabilities: { ocr: true, describe: true, transcribe: false, illustrate: false }, assets: [{ id: item.id, type: 'image', title: 'Synthetic approved image' }], stories: [] };
  if (pathname === '/api/v1/tutor') { tutorCalls++; return { text: 'Synthetic tutor feedback', sources: [] }; }
  if (pathname === '/api/v1/chat') { chatCalls++; return { languageCode: chatCalls === 1 ? 'eng' : 'luo', translation: chatCalls === 1 ? 'Synthetic Dholuo translation' : 'Synthetic English translation', answer: 'Synthetic cultural answer', sources: [{ id: item.id, title: item.title, module: 'oral_histories', similarity: 1 }], media: [], conversationId: null }; }
  if (['/api/users', '/api/super-admin/admins', '/api/super-admin/backup', '/api/audit-logs'].includes(pathname)) return [];
  if (['/api/analytics', '/api/ai/monitoring', '/api/super-admin/settings'].includes(pathname)) return {};
  if (pathname === '/api/content') return [{ ...item, status: 'submitted', languageId: 1, contributorId: 'other-uploader', language: languages[0], module: { code: 'oral_histories', baseName: 'Oral histories' }, canDelete: true }];
  if (pathname === '/api/v1/contributions') return { language: languages[0], englishLanguageId: 2, modules: [{ id: 1, code: 'oral_histories', title: 'Oral histories', fields: [] }], submissions: [] };
  if (pathname === '/api/v1/research') return { items: [], next: null };
  if (pathname === '/api/app-version') return { version: process.env.NEXT_PUBLIC_APP_VERSION || 'development' };
  if (pathname === '/api/nrf/corpus') return { items: [], next: null };
  return undefined;
}
async function main() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'heritage-experience-'));
  const browser = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let socket;
  try {
    for (let i = 0; i < 100 && !fs.existsSync(path.join(profile, 'DevToolsActivePort')); i++) await delay(100);
    const port = fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0];
    const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    let sequence = 0; const pending = new Map();
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++sequence; const timeout = setTimeout(() => { pending.delete(id); reject(new Error(method + ' timed out')); }, 120000);
      pending.set(id, message => { clearTimeout(timeout); message.error ? reject(new Error(message.error.message)) : resolve(message.result); });
      socket.send(JSON.stringify({ id, method, params }));
    });
    socket.onmessage = event => {
      const message = JSON.parse(event.data);
      if (pending.has(message.id)) { const callback = pending.get(message.id); pending.delete(message.id); callback(message); }
      if (message.method === 'Runtime.exceptionThrown') report.runtimeErrors.push({ route: activeRoute, width, message: message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text });
      if (message.method === 'Fetch.requestPaused') {
        const paused = message.params, url = new URL(paused.request.url);
        let payload = fixture(url, paused.request.method); const raw = ['/api/auth/session', '/api/app-version'].includes(url.pathname);
        const code = payload === undefined ? 503 : 200;
        if (payload === undefined) { report.unknownApi.push(url.pathname); payload = { error: 'Synthetic audit fixture is not defined for this endpoint', success: false }; }
        void send('Fetch.fulfillRequest', { requestId: paused.requestId, responseCode: code, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Cache-Control', value: 'no-store' }], body: Buffer.from(JSON.stringify(raw || code !== 200 ? payload : { success: true, data: payload })).toString('base64') }).catch(() => {});
      }
    };
    const evaluate = async expression => { const response = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (response.exceptionDetails) throw new Error((response.exceptionDetails.exception?.description || response.exceptionDetails.text) + ' Expression: ' + expression.slice(0, 180)); return response.result.value; };
    const until = async (expression, label) => { const deadline = Date.now() + 150000; while (Date.now() < deadline) { if (await evaluate(expression)) return; await delay(200); } throw new Error('Timed out: ' + label); };
    await send('Runtime.enable'); await send('Page.enable'); await send('Fetch.enable', { patterns: [{ urlPattern: '*/api/*' }] });
    await send('Page.navigate', { url: base + '/application#/dashboard' });
    await until('!!document.querySelector(".discovery-card")', 'discovery hydration');
    if (process.argv.includes('--diagnose')) {
      await send('Emulation.setDeviceMetricsOverride', { width: 320, height: 900, deviceScaleFactor: 1, mobile: true });
      for (const route of ['/research', '/workspace']) {
        await evaluate(`location.hash=${JSON.stringify(route)}`); await delay(800);
        const expression = `(() => {const main=document.querySelector('main');return {main:main.scrollWidth,navs:Array.from(main.querySelectorAll('nav')).map(el=>({class:el.className,client:el.clientWidth,scroll:el.scrollWidth,position:getComputedStyle(el).position,overflow:getComputedStyle(el).overflowX})),headers:Array.from(main.querySelectorAll('header')).map(el=>({width:el.clientWidth,scroll:el.scrollWidth}))};})()`;
        const before = await evaluate(expression);
        await evaluate(`document.querySelectorAll('main nav').forEach(el=>el.style.position='relative')`);
        const after = await evaluate(expression);
        console.log(JSON.stringify({route,before,after}));
      }
      await send('Browser.close').catch(()=>{}); return;
    }
    const routes = ['/dashboard', '/explore', '/dashboard?module=oral_histories', '/dashboard?module=audio_visual', '/learn', '/courses', '/research', '/places', '/knowledge', '/tutor', '/ai-tools', '/saved', '/account', '/settings', '/contribute', '/my-submissions', '/help', '/chatbot', '/workspace'];
    const capture = async name => { const result = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(`docs/system-audit/experience-${name}-${width}.png`, Buffer.from(result.data, 'base64')); };
    for (const targetWidth of [320, 390, 768, 1024, 1440]) {
      width = targetWidth;
      await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 });
      for (const route of routes) {
        activeRoute = route; await evaluate(`location.hash=${JSON.stringify(route)}`); await delay(450);
        if (await evaluate(`(() => {const dismiss=document.querySelector('button[aria-label="Dismiss installation prompt"]');if(!dismiss)return false;dismiss.click();return true;})()`)) report.interactions.push('Installation prompt can be dismissed while browsing');
        await until(`!Array.from(document.querySelectorAll('main [role=status]')).some(el=>/Loading|Bringing the collection/i.test(el.textContent))`, 'loaded route ' + route);
        if (route === '/dashboard') await until('!!document.querySelector(".discovery-card")', 'loaded discovery');
        const metrics = await evaluate(`(() => { const main=document.querySelector('main'); return { page:document.documentElement.scrollWidth, viewport:innerWidth, content:main?.scrollWidth, available:main?.clientWidth, heading:main?.querySelector('h1,h2')?.textContent?.slice(0,100), alert:main?.querySelector('[role=alert]')?.textContent?.slice(0,120) }; })()`);
        report.routes.push({ route, width, ...metrics });
        if ([390,1440].includes(width) && ['/dashboard','/workspace','/research','/tutor','/ai-tools'].includes(route)) await capture(route.slice(1));
        if (metrics.page > metrics.viewport + 1 || metrics.content > metrics.available + 2) report.layoutIssues.push({ route, width, ...metrics, offenders: await evaluate(`Array.from(document.querySelectorAll('main *')).filter(el=>el.getBoundingClientRect().right>innerWidth+2 && getComputedStyle(el).position!=='absolute').slice(0,12).map(el=>({tag:el.tagName,className:el.className,text:el.textContent.slice(0,90),width:el.clientWidth,scroll:el.scrollWidth}))`) });
      }
    }
    // Inspect every available staff section, without submitting any admin form.
    for (const targetWidth of [320, 390, 768, 1024, 1440]) {
      width = targetWidth; await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 });
      await evaluate('location.hash="/workspace"'); await delay(250);
      for (const tab of ['Edit system text','Users','Staff','Languages','Analytics','AI activity','History','System','Backups']) {
        activeRoute = '/workspace:' + tab;
        await evaluate(`document.querySelector('nav[aria-label="Staff workspace sections"] button[aria-label=${JSON.stringify(tab)}]').click()`); await delay(250);
        const metrics = await evaluate(`(() => {const main=document.querySelector('main');return {page:document.documentElement.scrollWidth,viewport:innerWidth,content:main.scrollWidth,available:main.clientWidth};})()`);
        report.routes.push({ route: activeRoute, width, ...metrics });
        if (metrics.page > metrics.viewport + 1 || metrics.content > metrics.available + 2) report.layoutIssues.push({ route: activeRoute, width, ...metrics, offenders: await evaluate(`Array.from(document.querySelectorAll('main *')).filter(el=>el.getBoundingClientRect().right>innerWidth+2 && getComputedStyle(el).position!=='absolute').slice(0,12).map(el=>({tag:el.tagName,className:el.className,text:el.textContent.slice(0,90),width:el.clientWidth,scroll:el.scrollWidth}))`) });
      }
    }
    width = 390; await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: true });
    await evaluate('location.hash="/dashboard"'); await delay(250);
    await evaluate(`document.querySelector('button[aria-label="Open menu"]').click()`);
    await until('document.querySelector("aside[aria-label=Navigation]")?.getAttribute("aria-hidden")==="false"', 'mobile menu opens');
    await evaluate('document.dispatchEvent(new KeyboardEvent("keydown", {key:"Escape",bubbles:true}))');
    await until('document.querySelector("aside[aria-label=Navigation]")?.getAttribute("aria-hidden")==="true"', 'mobile menu closes');
    report.interactions.push('Mobile navigation opens and closes with Escape');
    await evaluate('location.hash="/ai-tools"'); await until(`!!document.querySelector('main select[required] option[value="${item.id}"]')`, 'approved image choices');
    await evaluate(`(() => {const select=document.querySelector('main select[required]'); Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(select,${JSON.stringify(item.id)}); select.dispatchEvent(new Event('change',{bubbles:true}));})()`); await delay(100);
    await evaluate('document.querySelector("main form input[type=checkbox]").click()'); await delay(100);
    await evaluate('document.querySelector("main form").requestSubmit()');
    await until('document.querySelector("main").textContent.includes("Synthetic image draft")', 'AI image draft'); assert.equal(mediaCalls, 1);
    report.interactions.push('AI image tools submit an approved source and display a draft');
    await evaluate('location.hash="/tutor"'); await until('!!document.querySelector("main textarea")', 'tutor form');
    await evaluate(`(() => { const input=document.querySelector('main textarea'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input,'Synthetic test question'); input.dispatchEvent(new Event('input',{bubbles:true})); document.querySelector('main form input[type=checkbox]').click(); })()`);
    await delay(100); await evaluate('document.querySelector("main form").requestSubmit()');
    await until('document.querySelector("main").textContent.includes("Synthetic tutor feedback")', 'tutor response'); assert.equal(tutorCalls, 1);
    report.interactions.push('Tutor submits and displays feedback');
    await evaluate('location.hash="/chatbot"'); await until(`!!document.querySelector('textarea[aria-label="Your question"]')`, 'chat form');
    await evaluate(`(() => { const input=document.querySelector('textarea[aria-label="Your question"]'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input,'Synthetic cultural question'); input.dispatchEvent(new Event('input',{bubbles:true})); document.querySelector('.chat-composer input[type=checkbox]').click(); })()`);
    await delay(100); await evaluate('document.querySelector(".chat-composer form").requestSubmit()');
    await until('document.querySelector("main").textContent.includes("Synthetic cultural answer")', 'chat response'); assert.equal(chatCalls, 1);
    report.interactions.push('Cultural chat submits and displays an answer');
    assert.equal(await evaluate('document.querySelector(".chat-translation").open'), false);
    assert.equal(await evaluate('document.querySelector(".chat-translation summary").textContent.includes("See translation in Dholuo")'), true);
    await evaluate('document.querySelector(".chat-translation summary").click()');
    assert.equal(await evaluate('document.querySelector(".chat-translation").open && document.querySelector(".chat-translation p").lang === "luo"'), true);
    await evaluate(`(() => {const input=document.querySelector('textarea');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input,'Amos uru');input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    await delay(100); await evaluate('document.querySelector(".chat-composer form").requestSubmit()');
    await until('document.querySelectorAll(".chat-translation").length===2', 'Dholuo answer translation');
    assert.equal(await evaluate('document.querySelectorAll(".chat-translation summary")[1].textContent.includes("See translation in English")'), true);
    await evaluate('document.querySelectorAll(".chat-translation summary")[1].click()');
    assert.equal(await evaluate('document.querySelectorAll(".chat-translation p")[1].lang'), 'en');
    report.interactions.push('Both answer languages expose the opposite translation in an initially collapsed dropdown');

    report.sourceLinkWorks = await evaluate('!!document.querySelector("main details a[href*=sigana]")');
    const { applicationScreenHref } = require('../tests/load-ts.cjs').loader()('src/lib/app-navigation.ts');
    const hashLinks = await evaluate(`Array.from(document.querySelectorAll('a[href^="#/"]')).map(link=>link.getAttribute('href').slice(1))`);
    report.invalidNavigation = [...new Set(hashLinks.filter(href=>!applicationScreenHref(href)))];
    guestMode = true;
    await send('Page.navigate', { url: base + '/application?audit=guest#/dashboard' }); await until('!!document.querySelector(".discovery-card")', 'guest discovery');
    report.interactions.push('Public discovery renders without an account');
    await evaluate(`document.querySelector('button[aria-label="Open menu"]').click()`);
    assert.equal(await evaluate('document.querySelector("aside").textContent.includes("Install the app")'), true);
    await evaluate(`window.auditInstallCalls=0;const event=new Event('beforeinstallprompt',{cancelable:true});event.prompt=async()=>{window.auditInstallCalls++};event.userChoice=Promise.resolve({outcome:'accepted'});window.dispatchEvent(event);`);
    await until(`Array.from(document.querySelectorAll('aside button')).some(button=>button.textContent.includes('Install the app'))`, 'sidebar install button');
    await evaluate(`Array.from(document.querySelectorAll('aside button')).find(button=>button.textContent.includes('Install the app')).click()`);
    assert.equal(await evaluate('window.auditInstallCalls'), 1);
    await evaluate(`window.dispatchEvent(new Event('appinstalled'))`);
    await until('!document.querySelector("aside").textContent.includes("Install the app")', 'installed app control hides');
    await evaluate('document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}))');
    report.interactions.push('Install lives in the sidebar, invokes the browser once and hides after installation');

    for (const route of ['/tutor','/ai-tools','/saved','/settings','/account','/workspace','/contribute']) {
      activeRoute = 'guest:' + route; await evaluate(`location.hash=${JSON.stringify(route)}`); await delay(250);
      await until('!!document.querySelector("main button") && document.querySelector("main").textContent.includes("Sign in")', 'guest sign-in action ' + route);
      report.interactions.push('Guest receives a sign-in action for ' + route);
    }
    await send('Page.navigate', {url:base+'/application?audit=mobile-entry'});
    await until('location.pathname === "/register" && !!document.querySelector("form")', 'mobile registration first');
    assert.equal(await evaluate(`!!document.querySelector('a[href="/application#/dashboard"]')`), true);
    await evaluate(`document.querySelector('a[href="/application#/dashboard"]').click()`);
    await until('!!document.querySelector(".discovery-card")', 'explicit guest library browsing');
    report.interactions.push('Phone entry opens registration and Browse the public library opens guest discovery');
    report.completedAt = new Date().toISOString();
    report.unknownApi = [...new Set(report.unknownApi)];
    fs.writeFileSync('docs/system-audit/experience-browser-2026-10-29.json', JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ routesChecked: report.routes.length, layoutIssues: report.layoutIssues, runtimeErrors: report.runtimeErrors, unknownApi: report.unknownApi, interactions: report.interactions, sourceLinkWorks: report.sourceLinkWorks, invalidNavigation: report.invalidNavigation }));
    await send('Browser.close').catch(() => {});
    if (report.layoutIssues.length || report.runtimeErrors.length || !report.sourceLinkWorks || report.invalidNavigation.length || report.unknownApi.length) process.exitCode = 1;
  } finally { if (!process.argv.includes('--diagnose')) fs.writeFileSync('docs/system-audit/experience-browser-2026-10-29.json', JSON.stringify(report, null, 2)); socket?.close(); browser.kill(); }
}
main().catch(error => { report.auditError = error.message; fs.writeFileSync('docs/system-audit/experience-browser-2026-10-29.json', JSON.stringify(report, null, 2)); console.error(error.message); process.exitCode = 1; });
