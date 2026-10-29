// Real shared UI and CSS, fictional content, intercepted APIs: no live writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3100';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const report = { viewports: [], interactions: [], runtimeErrors: [], unexpectedApis: [], liveWrites: 0 };
const languages = [{ id: 1, code: 'luo', name: 'Luo', nativeName: 'Dholuo' }, { id: 2, code: 'eng', name: 'English', nativeName: 'English' }];
const modules = ['oral_histories', 'songs', 'folktales'].map(code => ({ code, baseName: code === 'songs' ? 'Traditional Songs' : code === 'folktales' ? 'Folktales' : 'Oral Histories', title: code, href: `/dashboard?module=${code}`, contributionHref: `/contribute/${code}` }));
const account = { id: 'layout-reader', name: 'Layout reader', email: 'reader@example.invalid', image: null, profileTypes: [], isSuperAdmin: false, isMasterSuperAdmin: false, languageRoles: [] };
const illustration = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="960" height="600"><rect width="960" height="600" fill="#e0ebdf"/><circle cx="760" cy="130" r="70" fill="#f0c777"/><path d="M0 360Q250 160 500 360T960 260V600H0" fill="#5c8f7c"/><path d="M0 450Q400 340 960 490V600H0" fill="#184f4b"/><text x="50" y="550" fill="white" font-family="Arial" font-size="28">FICTIONAL MEDIA — LAYOUT CHECK</text></svg>');
let videoBytes = '', videoPromise, saveCalls = 0, readingCalls = 0;
const items = () => [
  { id: 'mixed', title: 'Wach mar oganda', englishTitle: 'Community voices', summary: 'Fictional layout sample: original media stays together, with the item description and actions beside it.', moduleCode: 'oral_histories', moduleName: 'Oral Histories', transcriptCount: 216, isProvisional: true, media: [{ id: 'image', type: 'image', url: base + '/api/media/image/file' }, { id: 'video', type: 'video', url: base + '/api/media/video/file', thumbnailUrl: base + '/api/media/image/file' }, { id: 'audio', type: 'audio', url: base + '/api/media/audio/file' }, { id: 'document', type: 'document', url: base + '/api/media/document/file' }] },
  { id: 'recording', title: 'Wende mag oganda', englishTitle: 'Community song', summary: 'Another fictional recording card, kept close to the previous item.', moduleCode: 'songs', moduleName: 'Traditional Songs', transcriptCount: 0, media: [{ id: 'audio2', type: 'audio', url: base + '/api/media/audio2/file' }] },
  { id: 'text', title: 'A long fictional title that stays readable when the navigation is expanded', summary: 'A text-only item should not reserve an empty media column.', moduleCode: 'folktales', moduleName: 'Folktales', media: [] },
];
const reading = id => ({ id, title: 'Fictional complete interview', sourceLanguageCode: 'luo', sourceLanguageName: 'Dholuo', sourceText: '', englishText: '', transcripts: Array.from({ length: 216 }, (_, i) => ({ id: `segment-${i + 1}`, text: `Conversation turn ${i + 1}. Fictional source text for a full-reader check.`, languageCode: 'luo', role: i % 2 ? 'Respondent' : 'Interviewer' })) });
const wav = Buffer.alloc(44 + 8000 * 2 * 8);
wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(wav.length - 44, 40);
async function main() {
  assert.ok(/^http:\/\/(?:localhost|127\.0\.0\.1):\d+$/.test(base), 'Use a local app');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'luo-media-layout-'));
  const browser = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--autoplay-policy=no-user-gesture-required', '--remote-debugging-port=0', `--user-data-dir=${directory}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let socket;
  try {
    for (let i = 0; i < 150 && !fs.existsSync(path.join(directory, 'DevToolsActivePort')); i++) await delay(100);
    const port = fs.readFileSync(path.join(directory, 'DevToolsActivePort'), 'utf8').split('\n')[0];
    const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    let sequence = 0; const pending = new Map();
    const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++sequence; const timeout = setTimeout(() => { pending.delete(id); reject(new Error(method + ' timed out')); }, 120000); pending.set(id, message => { clearTimeout(timeout); message.error ? reject(new Error(message.error.message)) : resolve(message.result); }); socket.send(JSON.stringify({ id, method, params })); });
    const evaluate = async expression => { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
    const until = async (expression, label) => { const deadline = Date.now() + 90000; while (Date.now() < deadline) { if (await evaluate(expression)) return; await delay(200); } throw new Error('Timed out: ' + label); };
    async function payload(url, method) {
      if (url.pathname === '/api/v1/bootstrap') return { apiVersion: 1, app: { name: 'Luo Heritage', tagline: 'Heritage', version: 'audit', icon: '/icons/luo-heritage-512.png', manifest: '/application.webmanifest' }, selectedLanguage: languages[0], languages, modules, routes: {}, contentFilters: [], contentViews: [] };
      if (url.pathname === '/api/v1/library') {
        if (!videoBytes) { videoPromise ??= evaluate(`new Promise(resolve=>{const c=document.createElement('canvas');c.width=640;c.height=360;const ctx=c.getContext('2d');const paint=()=>{ctx.fillStyle='#164e49';ctx.fillRect(0,0,640,360);ctx.fillStyle='#f1d393';ctx.font='24px Arial';ctx.fillText('FICTIONAL VIDEO — LAYOUT CHECK',40,180);};paint();const stream=c.captureStream(5),r=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8'}),chunks=[];r.ondataavailable=e=>chunks.push(e.data);r.onstop=()=>{stream.getTracks().forEach(t=>t.stop());const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.readAsDataURL(new Blob(chunks,{type:'video/webm'}));};r.start();const timer=setInterval(paint,100);setTimeout(()=>{clearInterval(timer);r.stop();},800);})`); videoBytes = await videoPromise; }
        const code = url.searchParams.get('module') || 'discover';
        return { title: 'Community collection', baseName: 'Community collection', moduleCode: code, languageCode: 'luo', languageName: 'Dholuo', languageId: 1, canContribute: false, items: items(), categories: modules.map(m => ({ code: m.code, name: m.baseName })), limits: { records: 12, dictionaryEntries: 6 }, continuation: { records: null, dictionary: null } };
      }
      if (url.pathname === '/api/auth/session') return { user: account, expires: new Date(Date.now() + 3600000).toISOString() };
      if (url.pathname === '/api/v1/account') return account;
      if (url.pathname === '/api/v1/account/conversations') return [];
      if (url.pathname === '/api/languages') return languages;
      if (url.pathname === '/api/interface-copy') return { catalog: {} };
      if (url.pathname === '/api/branding' || url.pathname === '/api/v1/activity') return {};
      if (url.pathname === '/api/app-version') return { version: 'development' };
      if (url.pathname === '/api/v1/reading') { readingCalls++; return reading(url.searchParams.get('id')); }
      if (url.pathname === '/api/v1/saved' && method === 'POST') { saveCalls++; return {}; }
      report.unexpectedApis.push(url.pathname); return {};
    }
    socket.onmessage = event => {
      const message = JSON.parse(event.data);
      if (pending.has(message.id)) { const callback = pending.get(message.id); pending.delete(message.id); callback(message); }
      if (message.method === 'Runtime.exceptionThrown') report.runtimeErrors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
      if (message.method === 'Fetch.requestPaused') void (async () => {
        const p = message.params, url = new URL(p.request.url);
        if (/^\/api\/media\/audio2?\/file$/.test(url.pathname)) return send('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'audio/wav' }, { name: 'Accept-Ranges', value: 'bytes' }], body: wav.toString('base64') });
        if (url.pathname === '/api/media/video/file') return send('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'video/webm' }], body: videoBytes });
        if (url.pathname === '/api/media/image/file') return send('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'image/svg+xml' }], body: Buffer.from(decodeURIComponent(illustration.slice(illustration.indexOf(',') + 1))).toString('base64') });
        const data = await payload(url, p.request.method), raw = ['/api/auth/session', '/api/app-version'].includes(url.pathname);
        await send('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Cache-Control', value: 'no-store' }], body: Buffer.from(JSON.stringify(raw ? data : { success: true, data })).toString('base64') });
      })().catch(error => { if (!/Invalid InterceptionId/.test(error.message)) report.runtimeErrors.push(error.message); });
    };
    await send('Runtime.enable'); await send('Page.enable'); await send('Fetch.enable', { patterns: [{ urlPattern: '*/api/*' }] });
    await send('Page.navigate', { url: base + '/application#/dashboard' });
    await until('document.querySelectorAll(".discovery-card").length===3', 'discovery');
    assert.equal(readingCalls, 0, 'Browsing cards must not load every conversation');
    fs.mkdirSync('docs/system-audit/screenshots', { recursive: true });
    for (const width of [1440, 1366, 1024, 768, 390, 320]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height: 950, deviceScaleFactor: 1, mobile: width < 768 });
      for (const route of ['/dashboard', '/dashboard?module=oral_histories']) {
        await evaluate(`location.hash=${JSON.stringify(route)}`);
        const cardSelector = route.includes('?') ? '.library-feed-card' : '.discovery-card';
        await until(`document.querySelectorAll(${JSON.stringify(cardSelector)}).length===3`, route);
        const states = width >= 1024 ? ['collapsed', 'expanded'] : ['responsive'];
        for (const state of states) {
          if (state !== 'responsive') { const button = state === 'collapsed' ? 'Collapse sidebar' : 'Expand sidebar'; await evaluate(`document.querySelector('button[aria-label=${JSON.stringify(button)}]')?.click()`); }
          await delay(400); await evaluate('document.querySelector("main").scrollTop=0');
          const metrics = await evaluate(`(()=>{const main=document.querySelector('main'),card=document.querySelector(${JSON.stringify(cardSelector)}),media=card.querySelector('.public-media-gallery'),detail=card.querySelector('.discovery-card-body,.library-item-details'),heading=card.querySelector('.discovery-card-heading,.library-item-heading'),category=heading.querySelector('.discovery-card-category,.library-item-category');const a=media.getBoundingClientRect(),b=detail.getBoundingClientRect();return{viewport:innerWidth,page:document.documentElement.scrollWidth,content:main.scrollWidth,available:main.clientWidth,cardWidth:card.clientWidth,mediaWidth:a.width,detailsWidth:b.width,sideBySide:a.right<=b.left+2,headerRow:Math.abs(heading.querySelector('h2,h3').getBoundingClientRect().top-category.getBoundingClientRect().top)<15,detailsHeight:b.height,audio:card.querySelectorAll('audio').length,video:card.querySelectorAll('video').length,images:card.querySelectorAll('.public-media-gallery img').length,players:card.querySelectorAll('audio,video').length};})()`);
          report.viewports.push({ route, width, state, ...metrics });
          assert.ok(metrics.page <= metrics.viewport + 1 && metrics.content <= metrics.available + 2, 'No overflow: ' + JSON.stringify(metrics));
          assert.equal(metrics.players, 2); assert.equal(metrics.images, 1);
          if (metrics.cardWidth >= 832) { assert.equal(metrics.sideBySide, true); assert.ok(metrics.mediaWidth / metrics.detailsWidth > 2, 'Media occupies most of the desktop row'); }
          if (width < 768) { assert.equal(metrics.headerRow, true, 'Title and category share a row'); assert.ok(metrics.detailsHeight < (route.includes('?') ? 500 : 220), 'Phone metadata stays compact'); }
          if ([1440,390,320].includes(width) && state !== 'expanded') { const shot = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(`docs/system-audit/screenshots/public-${route.includes('?') ? 'collection' : 'discovery'}-${width}.png`, Buffer.from(shot.data, 'base64')); }
        }
      }
    }
    await evaluate('location.hash="/dashboard"'); await until('!!document.querySelector(".discovery-card")', 'return to discovery');
    await until('document.querySelector(".public-media-gallery img").complete && document.querySelector("video").readyState>=1', 'media dimensions loaded');
    for (const shape of [{width:360,height:960},{width:1280,height:360}]) {
      const dimensions = await evaluate(`new Promise(resolve=>{const image=document.querySelector('.public-media-gallery img');image.removeAttribute('srcset');image.onload=()=>{const style=getComputedStyle(image);resolve({naturalWidth:image.naturalWidth,naturalHeight:image.naturalHeight,fit:style.objectFit,background:style.backgroundColor,width:image.clientWidth,height:image.clientHeight,frameWidth:image.closest('.public-media-asset').clientWidth});};image.src='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="${shape.width}" height="${shape.height}"><rect width="100%" height="100%" fill="#d9b968"/><text x="8" y="28">FULL FRAME</text></svg>');})`);
      assert.equal(dimensions.fit,'contain'); assert.equal(dimensions.background,'rgb(0, 0, 0)');
      assert.equal(dimensions.naturalWidth,shape.width); assert.equal(dimensions.naturalHeight,shape.height);
      assert.ok(dimensions.width<=dimensions.frameWidth+1 && dimensions.height>0);
    }
    const videoStyle=await evaluate(`({fit:getComputedStyle(document.querySelector('video')).objectFit,background:getComputedStyle(document.querySelector('video')).backgroundColor,controls:document.querySelector('video').controls})`);
    assert.deepEqual(videoStyle,{fit:'contain',background:'rgb(0, 0, 0)',controls:true});
    report.interactions.push('Portrait and panoramic images and video keep their full frames with black unused space');

    const itemDownload = await evaluate('document.querySelector(".discovery-card .public-item-download").href');
    assert.equal(new URL(itemDownload).origin, base); assert.equal(new URL(itemDownload).searchParams.get('id'), 'mixed');
    await evaluate(`document.querySelector('.discovery-card-actions button[aria-label^="Save "]').click()`); await until(`!!document.querySelector('.discovery-card-actions button[aria-label^="Saved "]')`, 'saved feedback'); assert.equal(saveCalls, 1);
    report.interactions.push('Save uses one API request and confirms the saved state');
    await evaluate(`document.querySelector('.discovery-card-actions button').click()`);
    await until('document.querySelectorAll("dialog .public-transcript-text > div").length===216', 'all conversation turns');
    assert.equal(await evaluate('document.querySelector("dialog").textContent.includes("Conversation turn 216.")'), true);
    const transcriptDownload = await evaluate('document.querySelector("dialog a[download^=transcript]").href');
    assert.match(decodeURIComponent(transcriptDownload), /Conversation turn 216\./);
    assert.equal(await evaluate('document.querySelector("dialog").scrollWidth<=document.querySelector("dialog").clientWidth'), true);
    await evaluate(`const s=document.querySelector('dialog select');s.value='eng';s.dispatchEvent(new Event('change',{bubbles:true}));`);
    await until(`document.querySelector('dialog').textContent.includes('An English transcript has not been uploaded')`, 'missing English wording');
    assert.equal(await evaluate('document.querySelector("dialog").textContent.includes("Conversation turn 216.")'), false);
    const shot = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync('docs/system-audit/screenshots/public-transcript-mobile.png', Buffer.from(shot.data, 'base64'));
    await evaluate('document.querySelector("dialog > button").click()'); await until('!document.querySelector("dialog")', 'close item');
    report.interactions.push('Full 216-turn reader, complete text download, honest English fallback and dialog dismissal');
    await evaluate('document.querySelector("video").play()'); assert.equal(await evaluate('document.querySelector("video").paused'), false); await evaluate('document.querySelector("video").pause()');
    report.interactions.push('Attached video plays with native controls');
    await evaluate(`document.querySelectorAll('audio')[0].play()`); await evaluate(`document.querySelectorAll('audio')[1].play()`);
    assert.equal(await evaluate('document.querySelectorAll("audio")[0].paused&&!document.querySelectorAll("audio")[1].paused'), true);
    report.interactions.push('Starting another recording pauses the first player');
    assert.deepEqual(report.unexpectedApis, []); assert.deepEqual(report.runtimeErrors, []);
    report.readingRequests = readingCalls; report.completedAt = new Date().toISOString();
    console.log(JSON.stringify({ checkedLayouts: report.viewports.length, interactions: report.interactions, runtimeErrors: report.runtimeErrors, liveWrites: 0 }));
    await send('Browser.close').catch(() => {});
  } finally {
    fs.writeFileSync('docs/system-audit/public-media-browser-2026-10-29.json', JSON.stringify(report, null, 2));
    socket?.close(); browser.kill();
  }
}
main().catch(error => { console.error(error.stack); process.exitCode = 1; });
