// Read-only local response timings. Uses an isolated, short-lived staff session;
// never prints identifiers, cookies, credentials, or page content.
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { encode } = require('next-auth/jwt');
const prisma = new PrismaClient();
const base = process.env.SMOKE_BASE_URL || 'http://localhost:3017';

async function main() {
  if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Use a local server');
  const user = await prisma.user.findFirst({ where: { status: 'active', isMasterSuperAdmin: true }, select: { id: true, isSuperAdmin: true, isMasterSuperAdmin: true } });
  if (!user) throw new Error('An active master administrator is needed for timing staff pages');
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error('Local session configuration is missing');
  const token = await encode({ secret, salt: 'authjs.session-token', maxAge: 600, token: { id: user.id, sub: user.id, isSuperAdmin: user.isSuperAdmin, isMasterSuperAdmin: user.isMasterSuperAdmin } });
  for (const pathname of ['/login', '/dashboard', '/dashboard?module=proverbs', '/contribute/proverbs', '/admin/dashboard', '/super-admin/dashboard']) {
    const timings = [];
    for (let attempt = 0; attempt < 2; attempt++) {
      const started = performance.now();
      const response = await fetch(base + pathname, { headers: pathname === '/login' ? {} : { Cookie: 'authjs.session-token=' + token }, redirect: 'manual', signal: AbortSignal.timeout(120_000) });
      const html = await response.text();
      if (response.status !== 200 || html.includes('Something went wrong')) throw new Error('Page failed: ' + pathname + ' (HTTP ' + response.status + ')');
      timings.push(Math.round(performance.now() - started));
    }
    console.log(JSON.stringify({ pathname, firstMs: timings[0], repeatMs: timings[1] }));
  }
}

main().catch(error => { console.error('Loading check failed:', error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
