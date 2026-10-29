/* Public app shell only. Never cache account responses, API data or authenticated
 * server-rendered pages. Approved lesson text is managed separately in IndexedDB. */
const RELEASE = new URL(self.location.href).searchParams.get('v') || '1';
const CACHE = 'luo-public-shell-' + RELEASE;
const staticPath = path => path.startsWith('/_next/static/') || path.startsWith('/icons/') || path === '/install-prompt.js';
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const response = await fetch('/application', { credentials: 'omit', cache: 'reload' });
    if (!response.ok) throw new Error('Application shell unavailable');
    const html = await response.clone().text();
    await cache.put('/application', response);
    const assets = [...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"<>]+)"/g)].map(match => match[1].replaceAll('&amp;', '&'));
    await cache.addAll([...new Set(['/icons/luo-heritage-512.png', '/install-prompt.js', ...assets])]);
    // Wait for existing tabs to close: never replace unfinished work mid-session.
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith('luo-public-shell-') && key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request; const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/') || request.headers.has('Authorization')) return;
  if (request.mode === 'navigate' && url.pathname === '/application') event.respondWith((async () => {
    try { const response = await fetch(request); if (response.ok) await (await caches.open(CACHE)).put('/application', response.clone()); return response; }
    catch { return (await caches.match('/application')) || Response.error(); }
  })());
  else if (staticPath(url.pathname)) event.respondWith((async () => {
    const cached = await caches.match(request); if (cached) return cached;
    const response = await fetch(request); if (response.ok) await (await caches.open(CACHE)).put(request, response.clone()); return response;
  })());
});
