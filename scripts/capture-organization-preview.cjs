// Screenshot fictional SSR previews with the locally installed Chrome.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { pathToFileURL } = require('node:url');
const { spawn } = require('node:child_process');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function main() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'heritage-layout-'));
  const browser = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--disable-extensions', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let socket;
  try {
    const portFile = path.join(profile, 'DevToolsActivePort');
    for (let attempt = 0; attempt < 100 && !fs.existsSync(portFile); attempt++) await delay(100);
    const port = fs.readFileSync(portFile, 'utf8').split('\n')[0];
    const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    let id = 0;
    const pending = new Map();
    socket.onmessage = event => {
      const message = JSON.parse(event.data);
      if (pending.has(message.id)) { const callback = pending.get(message.id); pending.delete(message.id); callback(message); }
    };
    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const messageId = ++id;
        const timeout = setTimeout(() => { pending.delete(messageId); reject(new Error(`${method} timed out`)); }, 15000);
        pending.set(messageId, result => { clearTimeout(timeout); result.error ? reject(new Error(result.error.message)) : resolve(result.result); });
        socket.send(JSON.stringify({ id: messageId, method, params }));
      });
    }
    await send('Page.enable');
    const discovery = process.argv.includes('--discovery');
    const views = discovery ? [['discovery', 'desktop', 1440, 1100], ['discovery', 'mobile', 390, 1000]] : [['content', 'desktop', 1440, 1100], ['review', 'mobile', 390, 1300]];
    for (const [area, device, width, height] of views) {
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: device === 'mobile' });
      await send('Page.navigate', { url: pathToFileURL(path.resolve(discovery ? 'docs/system-audit/discovery-preview.html' : `docs/system-audit/organization-${area}-preview.html`)).href });
      await delay(750);
      const metrics = await send('Runtime.evaluate', { expression: 'JSON.stringify({ viewport: innerWidth, page: document.documentElement.scrollWidth, firstCardTop: document.querySelector(".discovery-card")?.getBoundingClientRect().top, titles: [...document.querySelectorAll(".review-item-title, .discovery-card h2")].map(node => Math.round(node.getBoundingClientRect().width)) })', returnByValue: true });
      const layout = JSON.parse(metrics.result.value);
      if (layout.page > layout.viewport) throw new Error(`${area} overflows its ${width}px viewport: ${JSON.stringify(layout)}`);
      if (layout.titles.some(value => value < 180)) throw new Error(`Review titles are too narrow: ${JSON.stringify(layout)}`);
      if (discovery && layout.firstCardTop >= 600) throw new Error('Cultural content is too far below the first screen.');
      const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      fs.writeFileSync(`docs/system-audit/${discovery ? area : `organization-${area}`}-${device}.png`, Buffer.from(screenshot.data, 'base64'));
      console.log(`${area} ${device}: ${JSON.stringify(layout)}`);
    }
    await send('Browser.close').catch(() => {});
  } finally { socket?.close(); browser.kill(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
