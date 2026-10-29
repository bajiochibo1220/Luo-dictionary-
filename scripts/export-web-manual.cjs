// Export the reviewed, self-contained HTML manual using installed Chrome.
// No account, application server or remote website is accessed.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const stem = path.join(root, 'docs', 'LUO_HERITAGE_WEB_USER_MANUAL');

// Read Chrome's uncompressed page tree and named destinations. These refer to
// the actual printed pages, so the contents does not use estimated page numbers.
function inspectPDF(bytes) {
  assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
  const content = bytes.toString('latin1');
  const objects = new Map(Array.from(content.matchAll(/(?:^|\n)(\d+) 0 obj\s*([\s\S]*?)\s*endobj/g), match => [Number(match[1]), match[2]]));
  const catalog = Array.from(objects.values()).find(value => /\/Type\s*\/Catalog\b/.test(value));
  assert.ok(catalog, 'PDF catalog missing');
  const pageIds = [];
  function visit(id) {
    const value = objects.get(id);
    assert.ok(value, 'PDF page object missing');
    if (/\/Type\s*\/Page\b/.test(value)) pageIds.push(id);
    else {
      const children = value.match(/\/Kids\s*\[([^\]]*)\]/);
      assert.ok(children, 'PDF page tree missing');
      for (const child of children[1].matchAll(/(\d+) 0 R/g)) visit(Number(child[1]));
    }
  }
  visit(Number(catalog.match(/\/Pages (\d+) 0 R/)[1]));
  const destinations = objects.get(Number(catalog.match(/\/Dests (\d+) 0 R/)[1]));
  const sectionPages = Object.fromEntries(Array.from(destinations.matchAll(/\/([\w-]+)\s*\[(\d+) 0 R \/XYZ/g), match => {
    const number = pageIds.indexOf(Number(match[2])) + 1;
    assert.ok(number > 0, 'Contents destination missing its page');
    return [match[1], number];
  }));
  assert.equal(Object.keys(sectionPages).length, 18);
  for (const destination of content.matchAll(/\/Dest \/([\w-]+)/g)) {
    assert.ok(sectionPages[destination[1]], 'Broken printed contents link');
  }
  assert.ok(/\/Outlines \d+ 0 R/.test(catalog), 'PDF navigation outline missing');
  assert.ok(pageIds.length >= 10 && pageIds.length <= 60, 'Unexpected manual page count');
  return { pages: pageIds.length, sectionPages };
}

async function until(check, label) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error('Timed out: ' + label);
}

async function main() {
  await fs.access(stem + '.html');
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'luo-web-manual-'));
  const port = await new Promise((resolve, reject) => {
    const server = require('node:net').createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const number = server.address().port;
      server.close(() => resolve(number));
    });
  });
  const browser = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--disable-background-networking', '--remote-debugging-address=127.0.0.1',
    '--remote-debugging-port=' + port, '--user-data-dir=' + profile, 'about:blank',
  ], { windowsHide: true, stdio: 'ignore' });
  let socket, startupError;
  browser.on('error', error => { startupError = error; });
  try {
    let target;
    await until(async () => {
      if (startupError) throw startupError;
      try {
        target = (await (await fetch('http://127.0.0.1:' + port + '/json/list')).json())
          .find(item => item.type === 'page');
        return !!target;
      } catch { return false; }
    }, 'browser startup');
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true });
      socket.addEventListener('error', reject, { once: true });
    });
    let id = 0;
    const pending = new Map();
    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      const callback = pending.get(message.id);
      if (callback) {
        pending.delete(message.id);
        if (message.error) callback.reject(new Error(message.error.message));
        else callback.resolve(message.result);
      }
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const sequence = ++id;
      const timer = setTimeout(() => {
        pending.delete(sequence);
        reject(new Error('Browser timeout: ' + method));
      }, 30000);
      pending.set(sequence, {
        resolve: result => { clearTimeout(timer); resolve(result); },
        reject: error => { clearTimeout(timer); reject(error); },
      });
      socket.send(JSON.stringify({ id: sequence, method, params }));
    });
    const evaluate = async expression => {
      const value = await send('Runtime.evaluate', { expression, returnByValue: true });
      assert.ok(!value.exceptionDetails, value.exceptionDetails?.exception?.description || 'Document inspection failed');
      return value.result.value;
    };
    await send('Page.enable');
    await send('Network.enable');
    await send('Network.setBlockedURLs', { urls: ['http://*', 'https://*'] });
    await send('Page.navigate', { url: pathToFileURL(stem + '.html').href });
    await until(() => evaluate('document.readyState === "complete" && document.querySelector(".brand img")?.naturalWidth === 512'), 'manual and embedded logo');
    const sections = await evaluate('Array.from(document.querySelectorAll("h2")).filter(e => /^\\d+\\./.test(e.textContent)).length');
    assert.equal(sections, 18, 'Expected all eighteen manual sections');
    assert.equal(await evaluate('Array.from(document.querySelectorAll("a")).filter(e => e.hash).every(e => document.getElementById(e.hash.slice(1)))'), true, 'Contents links must work');
    assert.equal(await evaluate('document.body.innerText.includes("THIS MANUAL IS FOR THE WEB APPLICATION ONLY.") && document.body.innerText.includes("Packaged Android and iOS clients share the main application interface.")'), true);
    for (const width of [360, 794, 1200]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height: 1123, deviceScaleFactor: 1, mobile: false });
      assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, 'Manual must fit at ' + width + 'px');
    }
    const preview = path.join(os.tmpdir(), 'luo-web-manual-preview.png');
    await send('Emulation.setDeviceMetricsOverride', { width: 794, height: 1123, deviceScaleFactor: 1, mobile: false });
    await fs.writeFile(preview, Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
    const printOptions = {
      printBackground: true, preferCSSPageSize: true,
      displayHeaderFooter: false, generateTaggedPDF: true,
      generateDocumentOutline: true,
    };
    const initial = inspectPDF(Buffer.from((await send('Page.printToPDF', printOptions)).data, 'base64'));
    await evaluate(`(() => {
      const pages = ${JSON.stringify(initial.sectionPages)};
      const style = document.createElement('style');
      style.textContent = '.toc-line{display:flex;gap:12px;align-items:baseline}.toc-line a{flex:1}.toc-page{font-variant-numeric:tabular-nums;color:#665441}';
      document.head.append(style);
      for (const link of document.querySelectorAll('a')) {
        if (!pages[link.hash.slice(1)]) continue;
        link.parentElement.classList.add('toc-line');
        const page = document.createElement('span');
        page.className = 'toc-page';
        page.textContent = String(pages[link.hash.slice(1)]);
        link.after(page);
      }
    })()`);
    const bytes = Buffer.from((await send('Page.printToPDF', printOptions)).data, 'base64');
    const { pages, sectionPages } = inspectPDF(bytes);
    assert.deepEqual(sectionPages, initial.sectionPages, 'Contents page numbers changed after typesetting');
    assert.ok(bytes.length > 50000, 'PDF appears incomplete');
    await fs.writeFile(stem + '.pdf', bytes);
    console.log(JSON.stringify({
      pdf: stem + '.pdf', pages, bytes: bytes.length, preview,
      checked: '18 sections, linked contents with verified PDF page numbers, navigation outline, embedded logo, web-only notices, and layout at 360/794/1200px',
    }, null, 2));
  } finally {
    socket?.close();
    browser.kill();
    const resolved = path.resolve(profile);
    assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith('luo-web-manual-'));
    await new Promise(resolve => setTimeout(resolve, 750));
    await fs.rm(resolved, { recursive: true, force: true, maxRetries: 3 }).catch(() => {});
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
