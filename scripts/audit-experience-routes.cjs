// Anonymous GET requests against the local production server. No form submissions.
const fs = require('node:fs');
const base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3017';
const pages = ['/', '/application', '/explore', '/login', '/register', '/account-recovery', '/help', '/about', '/privacy', '/terms', '/mobile-apps', '/chatbot', '/luo', '/luo/sigana', '/luo/muma', '/luo/ngeche', '/luo/ngero', '/luo/wende', '/luo/gik-luo', '/luo/piny-luo'];
const protectedPages = ['/account', '/settings', '/tutor', '/ai-tools', '/workspace', '/admin/content', '/admin/validation-queue', '/admin/review-queue', '/super-admin/system'];
const results = [];
async function check(path, protectedPage) {
  const start = Date.now();
  try {
    const response = await fetch(base + path, { redirect: 'manual', signal: AbortSignal.timeout(60000) });
    const location = response.headers.get('location');
    // Consume the stream to catch server-side render failures too.
    const body = await response.text();
    // Next can start streaming before an authenticated layout redirects.
    const streamedRedirect = body.match(/NEXT_REDIRECT;[^;]+;(\/login(?:\?[^;]*)?);30[2378];/);
    const loginRedirect = [302, 303, 307, 308].includes(response.status) && /login/.test(location || '');
    const pass = protectedPage ? loginRedirect || !!streamedRedirect : response.status === 200 || [307, 308].includes(response.status);
    const renderFailure = response.status === 200 && /<title>(?:500|Internal Server Error)/i.test(body);
    results.push({ path, protectedPage, status: response.status, redirect: location ? new URL(location, base).pathname : streamedRedirect ? '/login' : null, pass: pass && !renderFailure, ms: Date.now() - start });
  } catch (error) { results.push({ path, protectedPage, pass: false, detail: error.name, ms: Date.now() - start }); }
}
async function main() {
  const tasks = [...pages.map(path => [path, false]), ...protectedPages.map(path => [path, true])];
  for (let i = 0; i < tasks.length; i += 3) await Promise.all(tasks.slice(i, i + 3).map(([path, protectedPage]) => check(path, protectedPage)));
  fs.writeFileSync('docs/system-audit/experience-routes-2026-10-29.json', JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ checked: results.length, failures: results.filter(item => !item.pass) }));
  if (results.some(item => !item.pass)) process.exitCode = 1;
}
main().catch(error => { console.error(error.name); process.exitCode = 1; });
