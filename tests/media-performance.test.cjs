const { test } = require('node:test');
const assert = require('node:assert/strict');
const { NextRequest } = require('next/server');
const { loader } = require('./load-ts.cjs');
const policy = { status: 'published', languageId: 1, consentScope: 'public_excerpt', restrictionLevel: 'public', embargoUntil: null };
function fixture(type = 'image') {
  let parent = { ...policy }, options;
  const asset = { ...policy, id: 'asset', type, format: type === 'video' ? 'mov' : 'jpg', resourceType: type, publicId: 'private-source', deliveryType: 'authenticated', url: 'https://res.cloudinary.com/original', record: parent };
  const GET = loader({
    '@/lib/auth': { auth: async () => null },
    '@/lib/db': { prisma: { mediaAsset: { findUnique: async () => ({ ...asset, record: parent }) } } },
    '@/lib/cloudinary': { configureCloudinary: async () => {}, cloudinary: { url: (_id, value) => { options = value; return 'https://res.cloudinary.com/optimized'; }, utils: { private_download_url: () => 'https://res.cloudinary.com/original' } } },
    '@/lib/audit': { logAction: async () => {} }, '@/lib/analytics': { trackEvent: async () => {} },
  })('src/app/api/media/[id]/file/route.ts').GET;
  return { get: (query = '', headers = {}) => GET(new NextRequest('http://localhost/api/media/asset/file' + query, { headers }), { params: Promise.resolve({ id: 'asset' }) }), options: () => options, withdraw: () => { parent = { ...parent, status: 'draft' }; } };
}
async function withFetch(mock, run) { const original = global.fetch; global.fetch = mock; try { await run(); } finally { global.fetch = original; } }
test('image previews resize and negotiate modern formats, and revalidate only after current permissions', async () => {
  const f = fixture(); let calls = 0;
  await withFetch(async (_url, init) => {
    calls++;
    if (init.headers['If-None-Match']) return new Response(null, { status: 304, headers: { etag: '"preview"' } });
    assert.equal(init.headers.Accept, 'image/avif');
    return new Response('small', { headers: { 'content-type': 'image/avif', etag: '"preview"' } });
  }, async () => {
    const response = await f.get('?width=320', { Accept: 'image/avif' });
    assert.equal(response.status, 200); assert.equal(await response.text(), 'small');
    assert.equal(response.headers.get('cache-control'), 'private, no-cache');
    assert.equal(f.options().transformation[0].width, 320);
    assert.equal(f.options().sign_url, true);
    assert.equal((await f.get('?width=320', { 'If-None-Match': '"preview"' })).status, 304);
    f.withdraw(); assert.equal((await f.get('?width=320', { 'If-None-Match': '"preview"' })).status, 404);
    assert.equal(calls, 2);
  });
});
test('video playback streams partial MP4 bytes and keeps seek headers', async () => {
  const f = fixture('video');
  await withFetch(async (_url, init) => {
    assert.equal(init.headers.range, 'bytes=0-3');
    return new Response('part', { status: 206, headers: { 'content-type': 'video/mp4', 'content-range': 'bytes 0-3/100', 'accept-ranges': 'bytes', 'content-length': '4' } });
  }, async () => {
    const response = await f.get('', { Range: 'bytes=0-3' });
    assert.equal(response.status, 206); assert.equal(response.headers.get('content-range'), 'bytes 0-3/100');
    assert.equal(await response.text(), 'part'); assert.equal(f.options().format, 'mp4');
    assert.equal(f.options().transformation[0].width, 1280);
  });
});
test('poster is a small JPEG and invalid sizes do not fetch storage', async () => {
  const f = fixture('video');
  await withFetch(async () => new Response('poster', { headers: { 'content-type': 'image/jpeg' } }), async () => {
    assert.equal((await f.get('?poster=1&width=320')).status, 200);
    assert.equal(f.options().format, 'jpg'); assert.equal(f.options().resource_type, 'video');
  });
  await withFetch(() => assert.fail('invalid size must not fetch'), async () => { assert.equal((await f.get('?width=999999')).status, 400); });
});
test('processing video derivative signals failure so the player can switch consistently to original bytes', async () => {
  const f = fixture('video'); let urls = [];
  await withFetch(async url => { urls.push(url); return url.endsWith('optimized') ? new Response('', { status: 423 }) : new Response('original', { headers: { 'content-type': 'video/quicktime' } }); }, async () => {
    assert.equal((await f.get()).status, 502); assert.equal(urls.length, 1);
    urls = []; assert.equal(await (await f.get('?original=1')).text(), 'original'); assert.equal(urls.length, 1);
    urls = []; const response = await f.get('?download=1'); assert.equal(urls.length, 1); assert.match(urls[0], /original$/);
    assert.match(response.headers.get('content-disposition'), /attachment/); assert.equal(response.headers.get('cache-control'), 'private, no-store');
  });
});
test('invalid video seek returns 416 and complete length instead of a server error', async () => {
  await withFetch(async () => new Response(null, { status: 416, headers: { 'content-range': 'bytes */100' } }), async () => {
    const response = await fixture('video').get('', { Range: 'bytes=999-1000' }); assert.equal(response.status, 416); assert.equal(response.headers.get('content-range'), 'bytes */100');
  });
});
test('responsive image URLs preserve poster parameters without rewriting downloads or external storage', () => {
  const { mediaThumbnail, responsiveMediaSources } = loader()('src/lib/media-preview.ts');
  assert.equal(mediaThumbnail('a/b', 'video'), '/api/media/a%2Fb/file?poster=1&width=640');
  assert.match(responsiveMediaSources('/api/media/a/file?poster=1&width=640').srcSet, /poster=1&width=320 320w/);
  assert.deepEqual(responsiveMediaSources('/api/media/a/file?download=1'), {});
  assert.deepEqual(responsiveMediaSources('https://external.test/image'), {});
});

test('audio previews stream compressed MP3 while original downloads and native previews retain original bytes',async()=>{
 const f=fixture('audio');
 await withFetch(async(url,init)=>new Response('audio',{status:init.headers.range?206:200,headers:{'content-type':'audio/mpeg',...(init.headers.range?{'content-range':'bytes 0-4/100'}:{})}}),async()=>{
  const response=await f.get('',{Range:'bytes=0-4'});assert.equal(response.status,206);assert.equal(f.options().format,'mp3');assert.equal(f.options().transformation[1].bit_rate,'128k');
  assert.equal(response.headers.get('content-range'),'bytes 0-4/100');
 });
 await withFetch(async url=>{assert.match(url,/original$/);return new Response('original',{headers:{'content-type':'audio/wav'}});},async()=>{assert.equal(await(await f.get('?original=1')).text(),'original');assert.equal(await(await f.get('?download=1')).text(),'original');});
});
