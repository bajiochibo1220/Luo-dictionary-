// Read-only local backend boundary checks. Dummy renewal credentials never
// identify an existing user/session. No grant, login or content write is made.
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const origin = 'http://127.0.0.1:3000';
async function request(path, init = {}) {
  return fetch(origin + path, { ...init, credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(40000) });
}
async function main() {
  const response = await request('/api/v1/native/refresh', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'capacitor://localhost' },
    body: JSON.stringify({ refreshToken: 'invalid' }),
  });
  assert.equal(response.status, 400, 'Middleware must reach the renewal handler');
  assert.equal(response.headers.get('access-control-allow-origin'), 'capacitor://localhost');
  assert.match(response.headers.get('cache-control'), /no-store/);
  const token = 'lh_refresh_' + randomBytes(16).toString('base64url') + '.' + randomBytes(32).toString('base64url');
  const invalid = await request('/api/v1/native/refresh', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: token }),
  });
  assert.equal(invalid.status, 401, 'Unknown renewal credentials must be denied');
  const preflight = await request('/api/v1/native/refresh', { method: 'OPTIONS', headers: { Origin: 'https://unrelated.invalid' } });
  assert.equal(preflight.status, 403);
  assert.equal((await request('/api/v1/account')).status, 401);
  assert.equal((await request('/api/v1/native/refresh/other')).status, 401);
  const bootstrap = await request('/api/v1/bootstrap?language=luo');
  assert.equal(bootstrap.status, 200);
  assert.equal((await bootstrap.json()).data.apiVersion, 1);
  console.log('PASS live local backend: bootstrap, exact renewal route, payload/credential rejection, private cache policy, native origin boundary and anonymous account denial; no sessions or research records created');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
