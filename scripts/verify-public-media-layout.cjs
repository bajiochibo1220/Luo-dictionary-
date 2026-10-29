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
  { id: 'mixed', title: 'Wach mar oganda', englishTitle: 'Community voices', summary: 'Fictional layout sample: original media stays together, with the item description and actions beside it.', bodyText: 'meaning: Fictional full meaning.\n\ncounty: Fictional place.\n\nusage: Complete detail marker.', moduleCode: 'oral_histories', moduleName: 'Oral Histories', transcriptCount: 216, isProvisional: true, media: [{ id: 'image', type: 'image', url: base + '/api/media/image/file' }, { id: 'video', type: 'video', url: base + '/api/media/video/file', thumbnailUrl: base + '/api/media/image/file' }, { id: 'audio', type: 'audio', url: base + '/api/media/audio/file' }, { id: 'document', type: 'document', url: base + '/api/media/document/file' }] },
  { id: 'recording', title: 'Wende mag oganda', englishTitle: 'Community song', summary: 'Another fictional recording card, kept close to the previous item.', moduleCode: 'songs', moduleName: 'Traditional Songs', transcriptCount: 0, media: [{ id: 'audio2', type: 'audio', url: base + '/api/media/audio2/file' }] },
  { id: 'text', title: 'A long fictional title that stays readable when the navigation is expanded', summary: 'A text-only item should not reserve an empty media column.', moduleCode: 'oral_histories', moduleName: 'Oral Histories', media: [] },
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
    for (const [width, height] of [[1440,950], [1366,950], [1024,950], [768,950], [390,844], [320,568], [844,390]]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 768 });
      for (const route of ['/dashboard', '/dashboard?module=oral_histories']) {
        await evaluate(`location.hash=${JSON.stringify(route)}`);
        const cardSelector = route.includes('?') ? '.library-feed-card' : '.discovery-card';
        await until(`document.querySelectorAll(${JSON.stringify(cardSelector)}).length===3`, route);
        const states = width >= 1024 ? ['collapsed', 'expanded'] : ['responsive'];
        for (const state of states) {
          if (state !== 'responsive') { const button = state === 'collapsed' ? 'Collapse sidebar' : 'Expand sidebar'; await evaluate(`document.querySelector('button[aria-label=${JSON.stringify(button)}]')?.click()`); }
          await delay(400); await evaluate('document.querySelector("main").scrollTop=0');
          const metrics = await evaluate(`(()=>{const main=document.querySelector('main'),card=document.querySelector(${JSON.stringify(cardSelector)}),media=card.querySelector('.immersive-media'),caption=card.querySelector('.social-card-caption'),actions=card.querySelector('.social-card-actions');const a=media.getBoundingClientRect(),b=caption.getBoundingClientRect(),c=card.getBoundingClientRect(),d=actions.getBoundingClientRect();return{viewport:innerWidth,page:document.documentElement.scrollWidth,content:main.scrollWidth,available:main.clientWidth,paneHeight:main.clientHeight,cardWidth:c.width,cardHeight:c.height,mediaWidth:a.width,mediaHeight:a.height,captionInside:b.left>=c.left&&b.right<=c.right&&b.top>=c.top&&b.bottom<=c.bottom,actionsInside:d.left>=c.left&&d.right<=c.right&&d.top>=c.top&&d.bottom<=c.bottom,audio:card.querySelectorAll('audio').length,video:card.querySelectorAll('video').length,images:card.querySelectorAll('.public-media-gallery img').length,players:card.querySelectorAll('audio,video').length};})()`);
          report.viewports.push({ route, width, height, state, ...metrics });
          assert.ok(metrics.page <= metrics.viewport + 1 && metrics.content <= metrics.available + 2, 'No overflow: ' + JSON.stringify(metrics));
          assert.equal(metrics.players, 2); assert.equal(metrics.images, 1);
          assert.ok(Math.abs(metrics.cardHeight-metrics.paneHeight)<=2, 'Card fills the reading pane: '+JSON.stringify(metrics));
          assert.ok(Math.abs(metrics.mediaWidth-metrics.cardWidth)<=2 && Math.abs(metrics.mediaHeight-metrics.cardHeight)<=2,'Media fills its entire card');
          assert.equal(metrics.captionInside,true); assert.equal(metrics.actionsInside,true);
          const preview = cardSelector + ' .social-card-description';
          assert.equal(await evaluate(`getComputedStyle(document.querySelector(${JSON.stringify(preview + ' .social-description-text')})).webkitLineClamp`), width < 768 || height < 500 ? '1' : '2');
          await evaluate(`document.querySelector(${JSON.stringify(preview + ' button')}).click()`);
          assert.equal(await evaluate(`document.querySelector(${JSON.stringify(preview)}).dataset.expanded==='true'&&!document.querySelector('dialog')`), true, 'More expands inside the card');
          assert.equal(await evaluate(`getComputedStyle(document.querySelector(${JSON.stringify(preview + ' button')})).textDecorationLine.includes('underline')`),true);
          await evaluate(`document.querySelector(${JSON.stringify(preview + ' button')}).click()`);
          assert.equal(await evaluate(`document.querySelector(${JSON.stringify(preview)}).dataset.expanded`),'false');
          assert.equal(await evaluate(`(()=>{const button=document.querySelector(${JSON.stringify(cardSelector)}).querySelector('button[aria-label="Next attachment"]');const r=button.getBoundingClientRect();return document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.closest('button')===button;})()`),true,'Attachment navigation is not covered by action buttons');
          if ([1440,390,320].includes(width) && state !== 'expanded') { const shot = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(`docs/system-audit/screenshots/social-${route.includes('?') ? 'collection' : 'discovery'}-${width}.png`, Buffer.from(shot.data, 'base64')); }
        }
      }
    }
    console.log('PASS '+report.viewports.length+' full-height layouts');
    report.interactions.push('Inline underlined more/less controls expand and restore one-line phone and two-line desktop previews across every tested layout');
    await send('Emulation.setDeviceMetricsOverride', {width:390,height:844,deviceScaleFactor:1,mobile:true});
    await evaluate('location.hash="/dashboard"'); await until('!!document.querySelector(".discovery-card")', 'return to discovery');
    await until('document.querySelector(".public-media-gallery img").complete', 'media dimensions loaded');
    for (const shape of [{width:360,height:960},{width:1280,height:360}]) {
      const dimensions = await evaluate(`new Promise(resolve=>{const image=document.querySelector('.public-media-gallery img');image.removeAttribute('srcset');image.onload=()=>{const style=getComputedStyle(image);resolve({naturalWidth:image.naturalWidth,naturalHeight:image.naturalHeight,fit:style.objectFit,background:style.backgroundColor,width:image.clientWidth,height:image.clientHeight,frameWidth:image.closest('.public-media-asset').clientWidth});};image.src='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="${shape.width}" height="${shape.height}"><rect width="100%" height="100%" fill="#d9b968"/><text x="8" y="28">FULL FRAME</text></svg>');})`);
      assert.equal(dimensions.fit,'contain'); assert.equal(dimensions.background,'rgb(0, 0, 0)');
      assert.equal(dimensions.naturalWidth,shape.width); assert.equal(dimensions.naturalHeight,shape.height);
      assert.ok(dimensions.width<=dimensions.frameWidth+1 && dimensions.height>0);
    }
    await evaluate(`document.querySelector('.discovery-card button[aria-label="Next attachment"]').click()`);
    await until('document.querySelector(".social-media-count").textContent==="2 / 4" && document.querySelector("video").readyState>=1','video attachment visible');
    const videoStyle=await evaluate(`({fit:getComputedStyle(document.querySelector('video')).objectFit,background:getComputedStyle(document.querySelector('video')).backgroundColor,controls:document.querySelector('video').controls})`);
    assert.deepEqual(videoStyle,{fit:'contain',background:'rgb(0, 0, 0)',controls:true});
    report.interactions.push('Portrait and panoramic images and video keep their full frames with black unused space');

    const itemDownload = await evaluate('document.querySelector(".discovery-card .public-item-download").href');
    assert.equal(new URL(itemDownload).origin, base); assert.equal(new URL(itemDownload).searchParams.get('id'), 'mixed');
    await evaluate(`document.querySelector('.social-card-actions button[aria-label^="Save "]').click()`); await until(`!!document.querySelector('.social-card-actions button[aria-label^="Saved "]')`, 'saved feedback'); assert.equal(saveCalls, 1);
    report.interactions.push('Save uses one API request and confirms the saved state');
    await evaluate('document.querySelector("video").play()');
    await evaluate(`document.querySelector('.discovery-card .social-card-actions button[aria-label="Explore this item"]').click()`);
    await until('!!document.querySelector("dialog .public-transcript-reader")','transcript reader available');
    await evaluate(`document.querySelector('dialog .public-transcript-reader').scrollIntoView({block:'center',behavior:'instant'})`);
    await until('document.querySelectorAll("dialog .public-transcript-text > div").length===216', 'all conversation turns');
    assert.equal(await evaluate('document.querySelector("dialog").textContent.includes("Conversation turn 216.")'), true);
    assert.equal(await evaluate('document.querySelector("dialog").textContent.includes("Complete detail marker.") && document.querySelector("dialog").textContent.includes("Fictional layout sample:")'),true,'Explore retains the full body and overview');
    assert.equal(await evaluate(`document.querySelectorAll('dialog nav[aria-label="More from this collection"] button').length`),1);
    assert.equal(await evaluate('document.querySelector("video").paused'),true,'Explore pauses background playback');
    const transcriptDownload = await evaluate('document.querySelector("dialog a[download^=transcript]").href');
    assert.match(decodeURIComponent(transcriptDownload), /Conversation turn 216\./);
    assert.equal(await evaluate('document.querySelector("dialog").scrollWidth<=document.querySelector("dialog").clientWidth'), true);
    await evaluate(`const s=document.querySelector('dialog select');s.value='eng';s.dispatchEvent(new Event('change',{bubbles:true}));`);
    await until(`document.querySelector('dialog').textContent.includes('An English transcript has not been uploaded')`, 'missing English wording');
    assert.equal(await evaluate('document.querySelector("dialog").textContent.includes("Conversation turn 216.")'), false);
    const shot = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync('docs/system-audit/screenshots/social-transcript-mobile.png', Buffer.from(shot.data, 'base64'));
    await evaluate('document.querySelector("dialog > button").click()'); await until('!document.querySelector("dialog")', 'close item');
    await evaluate(`document.querySelector('.discovery-card .social-card-actions button[aria-label="Explore this item"]').click()`);
    await until('!!document.querySelector("dialog nav button")','related collection item');
    await evaluate('document.querySelector("dialog nav button").click()');
    await until('!!document.querySelector("dialog[open]") && document.querySelector("dialog").textContent.includes("A text-only item")','related details open');
    await evaluate('document.querySelector("dialog > button").click()'); await until('!document.querySelector("dialog")','close related details');
    report.interactions.push('Explore preserves usage, meaning, place and overview; related collection buttons open complete details');
    report.interactions.push('Full 216-turn reader, complete text download, honest English fallback and dialog dismissal');
    await evaluate('document.querySelector("video").play()'); assert.equal(await evaluate('document.querySelector("video").paused'), false);
    await evaluate(`document.querySelector('.discovery-card button[aria-label="Next attachment"]').click()`);
    await until('document.querySelector(".social-media-count").textContent==="3 / 4"', 'audio attachment');
    assert.equal(await evaluate('document.querySelector("video").paused'),true);
    await evaluate(`document.querySelectorAll('audio')[0].play()`);
    await evaluate(`document.querySelectorAll('.discovery-card')[1].scrollIntoView({block:'start',behavior:'instant'})`);
    await until('document.querySelectorAll("audio")[0].paused', 'offscreen audio pauses');
    await evaluate(`document.querySelectorAll('audio')[1].play()`);
    assert.equal(await evaluate('document.querySelectorAll("audio")[1].paused'),false);
    await evaluate(`document.querySelectorAll('.discovery-card')[0].scrollIntoView({block:'start',behavior:'instant'})`);
    await until('document.querySelectorAll("audio")[1].paused', 'next card audio pauses');
    await evaluate(`document.querySelector('.discovery-card button[aria-label="Next attachment"]').click()`);
    await until('document.querySelector(".social-media-count").textContent==="4 / 4"', 'document attachment');
    assert.equal(await evaluate('!document.querySelector(".discovery-card .media-document").inert'),true);
    await evaluate(`document.querySelector('.discovery-card button[aria-label="Hide details"]').click()`);
    await until('!document.querySelector(".discovery-card").querySelector(".social-card-caption")','details hide');
    await evaluate(`document.querySelector('.discovery-card button[aria-label="Show details"]').click()`);
    await until('!!document.querySelector(".discovery-card").querySelector(".social-card-caption")','details restore');
    report.interactions.push('Horizontal attachment paging preserves video/audio/document access; sliding or scrolling away pauses playback; details toggle restores overlays');
    assert.deepEqual(report.unexpectedApis, []); assert.deepEqual(report.runtimeErrors, []);
    report.readingRequests = readingCalls; report.completedAt = new Date().toISOString();
    console.log(JSON.stringify({ checkedLayouts: report.viewports.length, interactions: report.interactions, runtimeErrors: report.runtimeErrors, liveWrites: 0 }));
    await send('Browser.close').catch(() => {});
  } finally {
    fs.writeFileSync('docs/system-audit/social-feed-browser-2026-10-29.json', JSON.stringify(report, null, 2));
    socket?.close(); browser.kill();
  }
}
main().catch(error => { console.error(error.stack); process.exitCode = 1; });
