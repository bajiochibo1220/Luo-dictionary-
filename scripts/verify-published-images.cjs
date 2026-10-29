// Read-only public projection and actual image bytes. No account/content writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3100';
const report = { accountOrContentWrites: 0, pages: 0, images: [], failures: [] };
async function run() {
  assert.match(base, /^http:\/\/(localhost|127\.0\.0\.1):\d+$/);
  const assets = new Map(); let cursor;
  do {
    const params = new URLSearchParams({ language: 'eng', module: 'audio_visual', dictionary: 'end' });
    if (cursor) params.set('records', cursor);
    const response = await fetch(base + '/api/v1/library?' + params, { signal: AbortSignal.timeout(60000) });
    assert.equal(response.status, 200);
    const body = await response.json(); assert.ok(body.success && body.data?.items);
    for (const item of body.data.items) for (const asset of item.media) if (asset.type === 'image') assets.set(asset.id, asset.url);
    cursor = body.data.continuation?.records; report.pages++;
    assert.ok(report.pages <= 10, 'Pagination must terminate');
  } while (cursor);
  const queue = [...assets];
  async function check(url) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
      const bytes = (await response.arrayBuffer()).byteLength;
      const mime = response.headers.get('content-type') || '';
      return { status: response.status, bytes, mime, delivered: response.ok && mime.startsWith('image/') && bytes > 0 };
    } catch (error) { return { delivered: false, error: error.name }; }
  }
  await Promise.all(Array.from({ length: 2 }, async () => {
    while (queue.length) {
      const [id, address] = queue.shift(); const url = new URL(address, base);
      assert.equal(url.origin, base); assert.ok(url.pathname.startsWith('/api/media/'));
      url.searchParams.set('width', '320'); const preview = await check(url);
      const result = { id, preview };
      if (!preview.delivered) { url.searchParams.set('original', '1'); result.original = await check(url); }
      report.images.push(result);
      if (!preview.delivered && !result.original?.delivered) report.failures.push(id);
    }
  }));
  report.completedAt = new Date().toISOString();
  assert.ok(report.images.length > 0); assert.deepEqual(report.failures, []);
  console.log(JSON.stringify({ images: report.images.length, pages: report.pages, failures: report.failures.length, accountOrContentWrites: 0 }));
}
run().catch(error => { report.error = error.message; console.error(error.message); process.exitCode = 1; }).finally(() => fs.writeFileSync('docs/system-audit/published-images-2026-10-30.json', JSON.stringify(report, null, 2)));
