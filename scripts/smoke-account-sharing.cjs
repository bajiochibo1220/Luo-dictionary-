// Read-only verification of shared personal APIs using existing local accounts.
// No passwords, session tokens, identities or chat text are printed.
require('dotenv').config();
const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');
const { encode } = require('next-auth/jwt');
const prisma = new PrismaClient();
const base = process.env.SMOKE_BASE_URL || 'http://localhost:3000';

async function main() {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  assert.ok(secret, 'Local session secret required');
  const users = await prisma.user.findMany({ where: { status: 'active' }, take: 2, select: { id: true, sessionVersion: true } });
  assert.ok(users.length, 'An existing active account is required');
  const secure = new URL(base).protocol === 'https:';
  const cookie = secure ? '__Secure-authjs.session-token' : 'authjs.session-token';
  const read = async (url, headers = {}) => {
    const response = await fetch(base + url, { headers, signal: AbortSignal.timeout(30000) });
    return { response, body: await response.json() };
  };
  const anonymous = await read('/api/v1/account/conversations');
  assert.equal(anonymous.response.status, 401);
  const preflight = await fetch(base + '/api/v1/account', { method: 'OPTIONS', headers: { Origin: 'capacitor://localhost', 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'authorization' }, signal: AbortSignal.timeout(30000) });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), 'capacitor://localhost');
  assert.equal(preflight.headers.get('Access-Control-Allow-Credentials'), null);
  const deniedPreflight = await fetch(base + '/api/v1/account', { method: 'OPTIONS', headers: { Origin: 'https://untrusted.example' }, signal: AbortSignal.timeout(30000) });
  assert.equal(deniedPreflight.status, 403);
  let detailChecks = 0;
  for (const user of users) {
    const token = await encode({ secret, salt: cookie, maxAge: 300, token: { sub: user.id, id: user.id, sessionVersion: user.sessionVersion } });
    const headers = { Cookie: `${cookie}=${token}` };
    const account = await read('/api/v1/account', headers);
    assert.equal(account.response.status, 200);
    assert.ok(account.body.data.id === user.id, 'The API retains the existing account identity');
    assert.ok(!Object.hasOwn(account.body.data, 'passwordHash'), 'No password field');
    assert.match(account.response.headers.get('Cache-Control'), /no-store/);
    const legacy = await read('/api/conversations', headers);
    const versioned = await read('/api/v1/account/conversations?userId=untrusted-client-value', headers);
    assert.equal(legacy.response.status, 200);
    assert.equal(versioned.response.status, 200);
    assert.ok(JSON.stringify(legacy.body.data) === JSON.stringify(versioned.body.data), 'Web and versioned clients read the same personal history');
    if (versioned.body.data.length) {
      const chatId = encodeURIComponent(versioned.body.data[0].id);
      const legacyDetail = await read('/api/conversations/' + chatId, headers);
      const appDetail = await read('/api/v1/account/conversations/' + chatId, headers);
      assert.equal(legacyDetail.response.status, 200);
      assert.equal(appDetail.response.status, 200);
      assert.deepEqual(legacyDetail.body.data, appDetail.body.data, 'Saved messages match between web and native-capable APIs');
      assert.match(appDetail.response.headers.get('Cache-Control'), /private.*no-store/);
      assert.ok(appDetail.body.data.messages.length <= 100, 'Saved-message responses are bounded');
      const anonymousDetail = await read('/api/v1/account/conversations/' + chatId);
      assert.equal(anonymousDetail.response.status, 401);
      detailChecks++;
    }
    const rejectedBearer = await read('/api/v1/account', { ...headers, Authorization: 'Bearer lh_native_' + 'x'.repeat(43) });
    assert.equal(rejectedBearer.response.status, 401, 'An invalid native token cannot use the browser cookie instead');
    const page = await fetch(base + '/account', { headers, signal: AbortSignal.timeout(30000) });
    assert.equal(page.status, 200);
    const html = await page.text();
    assert.ok(html.includes('My account') && html.includes('Saved chats'), 'Shared account/history screen is served');
    const chatPage = await fetch(base + '/chatbot', { headers, signal: AbortSignal.timeout(30000) });
    assert.equal(chatPage.status, 200);
    assert.ok((await chatPage.text()).includes('Allow AI processing for this chat'), 'Shared chat renders its processing-permission choice');
    console.log('PASS existing account identity, shared saved-chat history and private no-store response');
  }
  console.log(`PASS shared account/chat screens, explicit native preflight, rejected bearer fallback and anonymous history denial; ${detailChecks} existing saved-message comparisons; no records modified`);
}

main().catch(error => { console.error('Account/history smoke check failed: '+error.name+(typeof error.actual==='number'?' status '+error.actual+' expected '+error.expected:' at line '+(error.stack?.match(/smoke-account-sharing\.cjs:(\d+):/)?.[1]||'unknown'))); process.exitCode = 1; }).finally(() => prisma.$disconnect());
