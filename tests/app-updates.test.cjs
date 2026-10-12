const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const sharp = require('sharp');
const { NextRequest } = require('next/server');
const { loader } = require('./load-ts.cjs');
const { checkAppVersion } = loader()('src/lib/app-update.ts');

test('release checks distinguish current, changed, and development builds without caching', async (t) => {
  const signal = new AbortController().signal;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/api/app-version');
    assert.equal(options.cache, 'no-store');
    assert.equal(options.signal, signal);
    return Response.json({ version: 'release-two' });
  });
  assert.equal((await checkAppVersion('release-two', signal)).available, false);
  assert.deepEqual(await checkAppVersion('release-one', signal), { version: 'release-two', available: true });
  assert.equal((await checkAppVersion('development', signal)).available, false);
  t.mock.method(globalThis, 'fetch', async () => Response.json({ version: 'development' }));
  assert.equal((await checkAppVersion('release-one')).available, false);
});

test('failed or malformed checks cannot advertise a false update', async (t) => {
  for (const result of [Response.json({}, { status: 503 }), Response.json({ version: null }), Response.json({ version: '<html>login</html>' }), new Response('<html>login</html>')]) {
    t.mock.method(globalThis, 'fetch', async () => result);
    await assert.rejects(checkAppVersion('release-one'));
  }
  t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('Offline'); });
  await assert.rejects(checkAppVersion('release-one'));
});

test('release endpoint is uncached and reachable without a valid account session', async () => {
  const { middleware } = loader({ 'next-auth/jwt': { getToken: async () => { throw new Error('Expired token'); } } })('src/middleware.ts');
  const response = await middleware(new NextRequest('https://example.com/api/app-version'));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-middleware-next'), '1');
  const { GET, dynamic } = loader()('src/app/api/app-version/route.ts');
  const versionResponse = GET();
  assert.equal(dynamic, 'force-dynamic');
  assert.match(versionResponse.headers.get('Cache-Control'), /no-store/);
  assert.match(versionResponse.headers.get('CDN-Cache-Control'), /no-store/);
  assert.deepEqual(Object.keys(await versionResponse.json()), ['version']);
});

test('each build changes the release ID and restarting preserves it for UI and server', () => {
  const constants = require('next/constants');
  const readPaths = [];
  let sequence = 0;
  const sandbox = {
    module: { exports: {} }, __dirname: process.cwd(), process: { env: { NODE_ENV: 'production' } },
    require(name) {
      if (name === 'node:crypto') return { randomUUID: () => `release-${++sequence}` };
      if (name === 'node:fs') return { readFileSync: filename => { readPaths.push(filename); return 'release-1\n'; } };
      return require(name);
    },
  };
  vm.runInNewContext(fs.readFileSync('next.config.js', 'utf8'), sandbox);
  const configure = sandbox.module.exports;
  const first = configure(constants.PHASE_PRODUCTION_BUILD);
  const second = configure(constants.PHASE_PRODUCTION_BUILD);
  assert.notEqual(first.generateBuildId(), second.generateBuildId());
  assert.equal(first.generateBuildId(), first.env.NEXT_PUBLIC_APP_VERSION);
  assert.equal(configure(constants.PHASE_PRODUCTION_SERVER).env.NEXT_PUBLIC_APP_VERSION, first.env.NEXT_PUBLIC_APP_VERSION);
  assert.ok(readPaths[0].endsWith(path.join('.next-review', 'BUILD_ID')));
  sandbox.process.env.VERCEL = '1';
  sandbox.process.env.NEXT_DIST_DIR = 'local-only';
  assert.equal(configure(constants.PHASE_PRODUCTION_BUILD).distDir, '.next');
  delete sandbox.process.env.VERCEL;
  assert.equal(configure(constants.PHASE_PRODUCTION_BUILD).distDir, 'local-only');
  assert.equal(configure(constants.PHASE_DEVELOPMENT_SERVER).env.NEXT_PUBLIC_APP_VERSION, 'development');
});

test('public and admin manifests keep their identities and use identical opaque installation icons', async () => {
  const publicManifest = JSON.parse(fs.readFileSync('public/manifest.webmanifest', 'utf8'));
  const adminManifest = JSON.parse(fs.readFileSync('public/super-admin.webmanifest', 'utf8'));
  assert.equal(publicManifest.id, '/public-app');
  assert.equal(adminManifest.id, '/super-admin-app');
  assert.deepEqual(publicManifest.icons, adminManifest.icons);
  for (const icon of publicManifest.icons) {
    const filename = path.join('public', new URL(icon.src, 'https://example.com').pathname);
    const metadata = await sharp(filename).metadata();
    assert.equal(`${metadata.width}x${metadata.height}`, icon.sizes);
    assert.equal(metadata.hasAlpha, false);
  }
  for (const size of [192, 512]) assert.deepEqual(fs.readFileSync(`public/icons/luo-heritage-${size}.png`), fs.readFileSync(`public/icons/luo-heritage-admin-${size}.png`));
  assert.deepEqual(fs.readFileSync('public/apple-touch-icon.png'), fs.readFileSync('public/icons/luo-heritage-180.png'));
});

test('Windows fallback icon has real full-color entries at native shortcut sizes', () => {
  const ico = fs.readFileSync('public/favicon.ico');
  assert.equal(ico.readUInt16LE(0), 0);
  assert.equal(ico.readUInt16LE(2), 1);
  assert.equal(ico.readUInt16LE(4), 4);
  for (let index = 0; index < 4; index++) {
    const entry = 6 + index * 16;
    const size = ico[entry] || 256;
    assert.equal(size, [16, 32, 48, 256][index]);
    assert.equal(ico.readUInt16LE(entry + 6), 32);
    const length = ico.readUInt32LE(entry + 8);
    const offset = ico.readUInt32LE(entry + 12);
    assert.ok(offset + length <= ico.length);
    if (size < 256) {
      assert.equal(ico.readInt32LE(offset + 4), size);
      assert.equal(ico.readInt32LE(offset + 8), size * 2);
      const colors = new Set();
      for (let pixel = offset + 40; pixel < offset + 40 + size * size * 4; pixel += 4) {
        assert.equal(ico[pixel + 3], 255);
        colors.add(ico.subarray(pixel, pixel + 3).toString('hex'));
      }
      assert.ok(colors.size > 20, 'Artwork preserves its colors at small sizes');
    } else assert.equal(ico.subarray(offset + 1, offset + 4).toString(), 'PNG');
  }
});
