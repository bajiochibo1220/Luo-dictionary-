// Render the real shared collection component with fixture data and verify it
// in local headless Chrome. No accounts, providers or database are contacted.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { loader } = require('../../tests/load-ts.cjs');

async function main() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'heritage-layout-'));
  const css = await require('postcss')([require('@tailwindcss/postcss')()]).process(fs.readFileSync('src/app/globals.css', 'utf8'), { from: path.resolve('src/app/globals.css') });
  const { PaginatedLibrary } = loader()('src/components/shared/paginated-library.tsx');
  const Link = ({ href, className, children }) => React.createElement('a', { href, className }, children);
  const props = { initial: { title: 'Muma', baseName: 'Dictionary', languageName: 'Dholuo', languageCode: 'luo', languageId: 1, moduleCode: 'dictionary', items: Array.from({ length: 18 }, (_, id) => ({ id: String(id), title: `Community knowledge ${id + 1}`, summary: 'Preserving language and living memory for everyone.', media: [] })) }, request: async () => {}, Link };
  const markup = renderToStaticMarkup(React.createElement(PaginatedLibrary, props));
  const headerLoader = loader({
    'next/navigation': { useRouter: () => ({}) },
    'next-auth/react': { signOut: () => {} },
    './navigation-link': { NavigationLink: Link },
  });
  const { AppTopbar } = headerLoader('src/components/layout/app-topbar.tsx');
  const { AdminTopbar } = headerLoader('src/components/layout/admin-topbar.tsx');
  const { SharedApplication } = headerLoader('src/components/shared/application.tsx');
  const applicationHeader = isNative => renderToStaticMarkup(React.createElement(SharedApplication, { adapters: {
    apiOrigin: 'https://fixture.example.test', artwork: '/icons/luo-heritage-512.png',
    nativeSession: { isNative }, featureFetch: fetch,
  } })).match(/<header[\s\S]*?<\/header>/)[0];
  const account = { userInitial: 'F', userName: 'Fixture', userEmail: 'fixture@example.test', userImage: null };
  const headers = [
    ['web-application', applicationHeader(false)],
    ['packaged-application', applicationHeader(true)],
    ['public', renderToStaticMarkup(React.createElement(AppTopbar, { ...account, isAdmin: false, languageCode: 'luo', stats: { uploads: 0, approved: 0, pending: 0 } }))],
    ['language-admin', renderToStaticMarkup(React.createElement(AdminTopbar, { ...account, isSuperAdmin: false, isMasterSuperAdmin: false, notificationCount: 0, languages: [{ id: 1, code: 'luo', nativeName: 'Dholuo', isActive: true }], selectedLanguageId: 1, selectedCultureId: 1 }))],
    ['super-admin', renderToStaticMarkup(React.createElement(AdminTopbar, { ...account, isSuperAdmin: true, isMasterSuperAdmin: true, notificationCount: 0, languages: [{ id: 1, code: 'luo', nativeName: 'Dholuo', isActive: true }], selectedLanguageId: 1, selectedCultureId: 1 }))],
  ];
  const filename = path.join(directory, 'library.html');
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--remote-debugging-port=9337', `--user-data-dir=${path.join(directory, 'profile')}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let socket;
  try {
    let tabs;
    for (let retry = 0; retry < 60; retry++) {
      try { tabs = await (await fetch('http://127.0.0.1:9337/json')).json(); break; } catch { await new Promise(resolve => setTimeout(resolve, 250)); }
    }
    if (!tabs?.length) throw new Error('Local Chrome did not start.');
    socket = new WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    let nextId = 0;
    const pending = new Map();
    socket.onmessage = event => { const value = JSON.parse(event.data); const callback = pending.get(value.id); if (callback) { pending.delete(value.id); value.error ? callback.reject(new Error(value.error.message)) : callback.resolve(value.result); } };
    const command = (method, params = {}) => new Promise((resolve, reject) => { const id = ++nextId; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
    const evaluate = async expression => (await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result.value;
    const results = [];
    for (const [workspace, masthead] of headers) {
    fs.writeFileSync(filename, `<!doctype html><html lang="en"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css.css}</style><body><div class="flex h-dvh flex-col overflow-hidden">${masthead}<main class="min-h-0 flex-1 overflow-y-auto bg-[#b89a68]">${markup}</main></div></body></html>`);
    for (const width of [320, 360, 390, 768, 1440]) {
      await command('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: width < 768 });
      await command('Page.navigate', { url: pathToFileURL(filename).href });
      for (let retry = 0; retry < 30; retry++) { if (await evaluate('!!document.querySelector("[data-sticky-controls]")')) break; await new Promise(resolve => setTimeout(resolve, 100)); }
      const before = await evaluate('document.querySelector("[data-sticky-controls]").getBoundingClientRect().top');
      await evaluate('document.querySelector("main").scrollTop = 600; new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
      const measured = await evaluate(`(() => { const bar = document.querySelector('[data-sticky-controls]'); const rect = bar.getBoundingClientRect(); const main = document.querySelector('main'); return {width: innerWidth, top: rect.top, height: rect.height, scrolled: main.scrollTop, pageOverflow: document.documentElement.scrollWidth > innerWidth, filterTops: [...bar.querySelectorAll('[aria-label="Content type"] button')].map(button => button.getBoundingClientRect().top), searchVisible: !!bar.querySelector('[role="search"]')}; })()`);
      if (Math.abs(before - measured.top) > 1 || measured.pageOverflow || measured.scrolled < 100 || !measured.searchVisible || new Set(measured.filterTops).size !== 1 || width < 768 && measured.height > 220) throw new Error(`Mobile toolbar failed: ${JSON.stringify({ before, ...measured })}`);
      results.push({ workspace, before, ...measured });
      if (width === 360 || width === 1440 && workspace === 'public') {
        const screenshot = await command('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(`docs/system-audit/screenshots/${workspace === 'public' ? 'public-library' : workspace}-${width}-2026-10-26.png`, Buffer.from(screenshot.data, 'base64'));
      }
      process.stdout.write(`PASS ${workspace} ${width}px: toolbar ${Math.round(measured.height)}px, top stays ${measured.top}px, no page overflow\n`);
    }
    }
    fs.writeFileSync('docs/system-audit/public-library-layout-2026-10-26.json', JSON.stringify({ fixture: true, results }, null, 2));
  } finally { socket?.close(); chrome.kill(); }
}
main().catch(error => { process.stderr.write(`${error.stack}\n`); process.exitCode = 1; });
