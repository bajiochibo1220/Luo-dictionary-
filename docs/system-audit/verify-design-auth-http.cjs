// Real registration/password-login check. Only its uniquely named fixture is
// created and removed; no email is sent and no existing account is modified.
require('dotenv').config({ quiet: true });
const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const { randomUUID, randomBytes, createHash } = require('node:crypto');
const { spawn } = require('node:child_process');
const { PrismaClient } = require('@prisma/client');
async function main() {
  if (!process.argv.includes('--temporary-account')) throw new Error('Use --temporary-account.');
  const prisma = new PrismaClient();
  const marker = randomUUID(), email = `design-fixture-${marker}@example.invalid`, name = `Design fixture ${marker}`, password = randomBytes(24).toString('base64url');
  const digest = createHash('sha256').update(email).digest('hex');
  const reservation = net.createServer(); await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve));
  const port = reservation.address().port; await new Promise(resolve => reservation.close(resolve));
  const origin = `http://127.0.0.1:${port}`, jar = new Map();
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], { windowsHide: true, stdio: 'ignore', env: { ...process.env, AUTH_URL: origin, NEXTAUTH_URL: origin } });
  let languageId, passed = false, step = 'server readiness';
  const call = async (path, init = {}) => {
    const response = await fetch(origin + path, { ...init, redirect: 'manual', signal: AbortSignal.timeout(45000), headers: { ...init.headers, Cookie: [...jar].map(([key, value]) => `${key}=${value}`).join('; ') } });
    for (const cookie of response.headers.getSetCookie()) { const [pair] = cookie.split(';'); const split = pair.indexOf('='); jar.set(pair.slice(0, split), pair.slice(split + 1)); }
    return response;
  };
  try {
    let ready = false;
    for (let i = 0; i < 100; i++) { if (server.exitCode !== null) throw new Error(); try { if ((await call('/api/app-version')).ok) { ready = true; break; } } catch {} await new Promise(resolve => setTimeout(resolve, 200)); }
    assert.ok(ready);
    const language = await prisma.language.findFirst({ where: { isActive: true, code: { not: 'eng' } }, select: { id: true } }); assert.ok(language); languageId = language.id;
    step = 'registration';
    const response = await call('/api/auth/register', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, password, dateOfBirth: { day: 1, month: 1, year: 2000 }, languageId, interests: ['student'], acceptedTerms: true }) });
    assert.equal(response.status, 200);
    const registered = await response.json(); assert.equal(registered.success, true);
    const stored = await prisma.user.findUnique({ where: { email }, select: { id: true, passwordHash: true, isSuperAdmin: true, _count: { select: { languageRoles: true } } } });
    assert.ok(stored && stored.passwordHash !== password); assert.equal(stored.isSuperAdmin, false); assert.equal(stored._count.languageRoles, 0);
    assert.equal(await prisma.consentRecord.count({ where: { contributorName: name, languageId, consentType: 'platform_terms_privacy' } }), 1);
    step = 'password rejection';
    async function login(secret) {
      const csrfResponse = await call('/api/auth/csrf'); const csrf = await csrfResponse.json(); assert.equal(csrfResponse.status, 200); assert.ok(csrf.csrfToken);
      return call('/api/auth/callback/credentials', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded', 'X-Auth-Return-Redirect': '1' }, body: new URLSearchParams({ csrfToken: csrf.csrfToken, email, password: secret, callbackUrl: `${origin}/auth/continue` }) });
    }
    await login('incorrect-fixture-password');
    const checkResponse = await call('/api/auth/session'); const checkSession = await checkResponse.json(); assert.equal(checkResponse.status, 200); assert.ok(!checkSession?.user);
    step = 'password login';
    await login(password);
    const session = await (await call('/api/auth/session')).json(); assert.equal(session.user?.id, stored.id);
    step = 'role routing and personal API';
    const destination = await call('/auth/continue'); assert.equal(new URL(destination.headers.get('location'), origin).pathname, '/dashboard');
    const account = await (await call('/api/v1/account')).json(); assert.equal(account.data?.id, stored.id);
    step = 'sign out';
    const csrf = await (await call('/api/auth/csrf')).json();
    await call('/api/auth/signout', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded', 'X-Auth-Return-Redirect': '1' }, body: new URLSearchParams({ csrfToken: csrf.csrfToken, callbackUrl: origin }) });
    assert.ok(!(await (await call('/api/auth/session')).json())?.user);
    passed = true;
  } catch { throw new Error(`Real authentication verification failed at ${step}. Fixture cleanup runs below.`); }
  finally {
    server.kill(); await new Promise(resolve => server.exitCode !== null ? resolve() : server.once('exit', resolve));
    try {
      await prisma.$transaction(async tx => {
        await tx.consentRecord.deleteMany({ where: { contributorName: name, consentType: 'platform_terms_privacy', ...(languageId ? { languageId } : {}) } });
        await tx.user.deleteMany({ where: { email, name } });
        await tx.systemSetting.deleteMany({ where: { key: { in: [`rate-limit:account:register:${digest}`, `rate-limit:account:login:${digest}`] } } });
      });
      assert.equal(await prisma.user.count({ where: { email } }), 0);
      assert.equal(await prisma.consentRecord.count({ where: { contributorName: name } }), 0);
    } finally { await prisma.$disconnect(); }
  }
  if (passed) { fs.writeFileSync('docs/system-audit/design-auth-http.json', JSON.stringify({ registration: true, consentSaved: true, hashedPassword: true, noPrivilegeAssignment: true, incorrectPasswordRejected: true, realCredentialsSession: true, correctDashboard: true, ownAccountApi: true, signOut: true, fixtureRemoved: true, externalMessagesSent: false }, null, 2) + '\n'); console.log('PASS real production registration, consent, password rejection/login, account session, dashboard routing and sign-out. Temporary account, consent and rate counters removed.'); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
