const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loader } = require('./load-ts.cjs');

test('environment storage credentials override legacy saved settings and saved values remain a fallback', async () => {
  const keys = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  try {
    Object.assign(process.env, {CLOUDINARY_CLOUD_NAME:'environment-cloud',CLOUDINARY_API_KEY:'environment-key',CLOUDINARY_API_SECRET:'environment-secret'});
    const configurations = [];
    const { configureCloudinary } = loader({ cloudinary: { v2: { config: value => configurations.push(value) } }, './settings': { getSystemSettings: async () => ({ cloudinary_cloud_name: 'saved-cloud', cloudinary_api_key: 'saved-key', cloudinary_api_secret: 'saved-secret' }) } })('src/lib/cloudinary.ts');
    assert.deepEqual(await configureCloudinary(), {cloudName:'environment-cloud',apiKey:'environment-key',apiSecret:'environment-secret'});
    for (const key of keys) delete process.env[key];
    assert.deepEqual(await configureCloudinary(), { cloudName: 'saved-cloud', apiKey: 'saved-key', apiSecret: 'saved-secret' });
  } finally { for(const key of keys) if(previous[key] === undefined) delete process.env[key]; else process.env[key]=previous[key]; }
});

test('email configuration builds the provider request and never sends during tests', async () => {
  const originalFetch = global.fetch;
  const requests = [];
  global.fetch = async (url, options) => { requests.push({ url, options }); return new Response('', { status: 202 }); };
  try {
    for (const provider of ['SendGrid', 'Resend']) {
      const { sendSystemEmail } = loader({ './settings': { getSystemSettings: async () => ({ smtp_provider: provider, smtp_from: 'verified@example.test', smtp_password: 'test-key' }) } })('src/lib/email.ts');
      await sendSystemEmail('recipient@example.test', 'Test', 'Test body');
      const request = requests.at(-1);
      assert.equal(request.options.headers.Authorization, 'Bearer test-key');
      assert.equal(JSON.parse(request.options.body).subject, 'Test');
      assert.equal(request.url, provider === 'SendGrid' ? 'https://api.sendgrid.com/v3/mail/send' : 'https://api.resend.com/emails');
    }
    global.fetch = async () => new Response('', { status: 401 });
    const { sendSystemEmail } = loader({ './settings': { getSystemSettings: async () => ({ smtp_provider: 'Resend', smtp_from: 'verified@example.test', smtp_password: 'test-key' }) } })('src/lib/email.ts');
    await assert.rejects(sendSystemEmail('recipient@example.test', 'Test', 'Test body'), error => error.status === 502 && !error.message.includes('test-key'));
    await assert.rejects(sendSystemEmail('invalid', 'Test', 'Test body'), error => error.status === 400);
  } finally { global.fetch = originalFetch; }
});

test('settings writes use the schema timestamp field and batch changes atomically', async () => {
  let transaction = false;
  const upserts = [];
  const { setSystemSetting, setSystemSettings } = loader({ '@/lib/db': { prisma: { systemSetting: { upsert: input => { upserts.push(input); return Promise.resolve(input); } }, $transaction: async operations => { transaction = true; return Promise.all(operations); } } } })('src/lib/settings.ts');
  await setSystemSetting('maintenance_mode', 'off');
  assert.deepEqual(upserts[0], { where: { key: 'maintenance_mode' }, create: { key: 'maintenance_mode', value: 'off' }, update: { value: 'off' } });
  await setSystemSettings({ cloudinary_cloud_name: 'cloud', cloudinary_api_key: 'key' });
  assert.equal(transaction, true);
  assert.equal(upserts.length, 3);
});

test('database snapshot enumerates every table in one consistent transaction', async () => {
  let saved;
  let written;
  let isolation;
  const contents = '[{"sizeBytes":9223372036854775807,"passwordHash":"fixture"}]';
  const { createDatabaseBackup } = loader({
    './db': { prisma: {
      $transaction: async (callback, options) => {
        isolation = options.isolationLevel;
        let calls = 0;
        return callback({ $queryRaw: async () => ++calls === 1 ? [{ name: 'users' }, { name: 'media_assets' }, { name: 'system_settings' }] : [], $queryRawUnsafe: async () => [{ rows: contents }] });
      },
      backup: { create: async ({ data }) => { saved = data; return { id: 'backup', ...data }; } },
    } },
    'fs/promises': { mkdir: async () => {}, writeFile: async (_path, value, options) => { written = value; assert.equal(options.flag, 'wx'); assert.equal(options.mode, 0o600); }, unlink: async () => {} },
  })('src/lib/database-backup.ts');
  await createDatabaseBackup();
  assert.equal(isolation, 'RepeatableRead');
  const snapshot = JSON.parse(written);
  assert.deepEqual(Object.keys(snapshot.tables), ['users', 'media_assets', 'system_settings']);
  assert.equal(snapshot.tables.media_assets, contents);
  assert.equal(saved.sizeBytes, BigInt(Buffer.byteLength(written)));
  assert.match(saved.checksum, /^[a-f0-9]{64}$/);
});
