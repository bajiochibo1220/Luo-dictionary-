// Production-server smoke test. Reads public metadata and checks anonymous
// access denial; never submits credentials or writes repository records.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { spawn } = require('node:child_process');
async function main() {
  const server = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', '3413'], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = ''; server.stdout.on('data', bytes => output += bytes); server.stderr.on('data', bytes => output += bytes);
  const origin = 'http://127.0.0.1:3413';
  try {
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      try { const response = await fetch(`${origin}/api/branding`, { signal: AbortSignal.timeout(5000) }); if (response.ok) { ready = true; break; } } catch {}
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    assert.ok(ready, 'Production server must start and serve public branding.');
    const branding = await (await fetch(`${origin}/api/branding`)).json();
    assert.ok(branding.data.jooust_logo_url && branding.data.nrf_logo_url);
    const copyResponse = await fetch(`${origin}/api/interface-copy?community=luo`, { signal: AbortSignal.timeout(45000) });
    const copy = await copyResponse.json();
    assert.equal(copyResponse.status, 200, JSON.stringify(copy));
    assert.ok(copy.data.catalog.Home.local && copy.data.catalog.Home.english);
    assert.ok(copy.data.catalog.Dictionary, 'Database collection titles must join the interface catalog.');
    assert.equal((await fetch(`${origin}/api/interface-copy?community=eng`)).status, 400);
    assert.equal((await fetch(`${origin}/api/interface-copy`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ community: 'luo', entries: [{ source: 'Home', local: 'Dala', english: 'Home' }] }) })).status, 401);
    const admin = await fetch(`${origin}/admin/dashboard`, { redirect: 'manual' });
    assert.ok([302, 303, 307].includes(admin.status)); assert.ok(admin.headers.get('location').includes('/login'));
    const result = { publicBranding: true, publicCommunityCatalog: true, catalogEntries: Object.keys(copy.data.catalog).length, seededOrSavedLocalEntries: Object.values(copy.data.catalog).filter(entry => entry.local.trim()).length, englishCommunityRejected: true, anonymousCatalogWriteDenied: true, anonymousAdminDashboardDenied: true, databaseWrites: false };
    fs.writeFileSync('docs/system-audit/interface-endpoint-verification-2026-10-26.json', JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result));
  } catch (error) { console.error(output.slice(-3000)); throw error; }
  finally { server.kill(); }
}
main().catch(error => { console.error(error.stack); process.exitCode = 1; });
