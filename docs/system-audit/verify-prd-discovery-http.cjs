// Exercises the built server through HTTP. Reads public data only; no writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const { spawn } = require('node:child_process');
async function main() {
  const reservation = net.createServer();
  await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve));
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], { windowsHide: true, stdio: 'ignore' });
  const origin = `http://127.0.0.1:${port}`;
  const results = [];
  const read = path => fetch(origin + path, { redirect: 'manual', signal: AbortSignal.timeout(45000) });
  try {
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      if (server.exitCode !== null) throw new Error('Production server exited before readiness.');
      try { const response = await read('/api/app-version'); if (response.ok) { ready = true; break; } } catch {}
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    assert.ok(ready, 'Production server must become ready.');
    for (const [path, target] of [
      ['/explore?subject=Fishing%20traditions', '/application#/explore?subject=Fishing%20traditions'],
      ['/explore?subject=unknown', '/application#/explore'],
    ]) {
      const response = await read(path);
      // Next may stream the async page shell before resolving searchParams.
      // Its documented HTML redirect is still navigable without client JS.
      if (response.status === 200) {
        const body = await response.text();
        assert.ok(body.includes('id="__next-page-redirect"') && body.includes(`url=${target}`), 'Streamed response must contain the expected redirect target.');
        results.push({ path, status: response.status, target, redirectMode: 'html-refresh' });
      } else {
        assert.equal(response.status, 307);
        assert.equal(response.headers.get('location'), target);
        results.push({ path, status: response.status, target, redirectMode: 'http-location' });
      }
    }
    assert.equal((await read('/application')).status, 200);
    results.push({ path: '/application', status: 200 });
    const invalid = await read('/api/v1/library?language=luo&module=subjects&subject=unknown');
    assert.equal(invalid.status, 400);
    results.push({ path: 'invalid-subject', status: invalid.status });
    const languageResponse = await read('/api/languages');
    const languages = await languageResponse.json();
    assert.ok(languageResponse.ok);
    const language = languages.data.find(item => item.code !== 'eng');
    assert.ok(language, 'An active community must be configured.');
    const collection = await read(`/api/v1/library?${new URLSearchParams({ language: language.code, module: 'subjects', subject: 'Fishing traditions' })}`);
    const payload = await collection.json();
    assert.equal(collection.status, 200);
    assert.equal(payload.success, true);
    assert.equal(payload.data.subject, 'Fishing traditions');
    assert.ok(Array.isArray(payload.data.items));
    results.push({ path: 'public-subject-library', status: collection.status, typedItems: true });
    const account = await read('/api/v1/account');
    assert.equal(account.status, 401);
    results.push({ path: '/api/v1/account', status: account.status });
    fs.writeFileSync('docs/system-audit/prd-discovery-http.json', JSON.stringify({ productionBuild: true, accountWrites: false, contentWrites: false, results }, null, 2) + '\n');
    console.log('PASS production HTTP: public app, valid/invalid discovery redirects, subject validation, real public subject retrieval and protected account 401. No account or content writes.');
  } finally {
    server.kill();
    await new Promise(resolve => { if (server.exitCode !== null) resolve(); else server.once('exit', resolve); });
  }
}
main().catch(error => { console.error(error instanceof assert.AssertionError ? error.message : 'Production HTTP verification failed; local server stopped.'); process.exitCode = 1; });
