const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loader } = require('./load-ts.cjs');

test('maintenance changes take effect across workers despite previously cached settings', async () => {
  const saved = { maintenance_mode: 'on', maintenance_message: 'Scheduled work' };
  const db = { prisma: {
    $queryRaw: async () => Object.entries(saved).map(([key, value]) => ({ key, value })),
    systemSetting: { upsert: async ({ where, update }) => { saved[where.key] = update.value; } },
  } };
  let session = { user: { id: 'reader' } };
  const reader = loader({ '@/lib/db': db, './auth': { auth: async () => session } });
  const writer = loader({ '@/lib/db': db });
  const settings = reader('src/lib/settings.ts');
  const { maintenanceMessage, assertServiceAvailable } = reader('src/lib/maintenance.ts');
  await settings.getSystemSettings();
  assert.equal(await maintenanceMessage(), 'Scheduled work');
  await writer('src/lib/settings.ts').setSystemSetting('maintenance_mode', 'off');
  // This worker still has the old general cache, as on a multi-instance host.
  assert.equal((await settings.getSystemSettings()).maintenance_mode, 'on');
  assert.equal(await maintenanceMessage(), null);
  await assertServiceAvailable();
  session = null;
  assert.equal(await maintenanceMessage(), null);
  await writer('src/lib/settings.ts').setSystemSetting('maintenance_mode', 'on');
  await assert.rejects(assertServiceAvailable(), error => error.status === 503);
  session = { user: { id: 'master', isMasterSuperAdmin: true } };
  assert.equal(await maintenanceMessage(), null);
});

test('disabled maintenance allows sign-in accounts without requiring an administrator session', async () => {
  const { maintenanceMessage } = loader({
    './settings': { getSystemSettings: async options => {
      assert.equal(options.fresh, true);
      return { maintenance_mode: 'off' };
    } },
    './auth': { auth: async () => assert.fail('No session required while maintenance is off') },
  })('src/lib/maintenance.ts');
  assert.equal(await maintenanceMessage(), null);
});

test('maintenance settings accept only explicit modes, retain authorization and audit successful changes', async () => {
  let session = { user: { id: 'master', isMasterSuperAdmin: true } };
  const writes = [], audits = [];
  const { GET, PATCH } = loader({
    '@/lib/auth': { auth: async () => session },
    '@/lib/settings': {
      getSystemSettings: async options => { assert.equal(options.fresh, true); return { maintenance_mode: 'off' }; },
      setSystemSettings: async values => writes.push(values),
    },
    '@/lib/audit': { logAction: async event => audits.push(event) },
  })('src/app/api/super-admin/settings/route.ts');
  const request = mode => new Request('https://heritage.test/api/super-admin/settings', {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ maintenance_mode: mode }),
  });
  for (const mode of ['false', 'OFF', '', 'on ', true]) assert.equal((await PATCH(request(mode))).status, 400);
  assert.equal(writes.length, 0);
  assert.equal((await PATCH(request('off'))).status, 200);
  assert.deepEqual(writes, [{ maintenance_mode: 'off' }]);
  assert.equal(audits[0].userId, 'master');
  assert.equal(audits[0].action, 'settings.updated');
  assert.equal((await GET()).status, 200);
  session = { user: { id: 'reader' } };
  assert.equal((await PATCH(request('on'))).status, 403);
  assert.equal((await GET()).status, 403);
  assert.equal(writes.length, 1);
});
