const test = require('node:test');
const assert = require('node:assert/strict');
const { loader } = require('./load-ts.cjs');

for (const [platform, unavailable] of [['web', false], ['android', false], ['ios', false], ['android', true], ['ios', true]]) {
  test(`fresh ${platform} startup ${unavailable ? 'recovers from unavailable storage/origin' : 'announces guest access'} and cleans up listeners`, async () => {
    const events = [], listeners = [], timers = new Set(); let removed = 0;
    const previous = global.window;
    global.window = { addEventListener() {}, removeEventListener() {}, setInterval(fn) { timers.add(fn); return fn; }, clearInterval(id) { timers.delete(id); } };
    try {
      const { createNativeSession } = loader({
        '@capacitor/core': { Capacitor: { isNativePlatform: () => platform !== 'web', getPlatform: () => platform }, registerPlugin: () => ({}) },
        '@capacitor/app': { App: { addListener: async (name, callback) => { listeners.push({ name, callback }); return { remove() { removed++; } }; }, getLaunchUrl: async () => null } },
        '@capacitor/browser': { Browser: {} },
        '@/lib/native-login-client': { createNativeLoginClient: () => ({ initialize: async () => { if (unavailable) throw new Error('Synthetic startup failure'); }, resume: async () => {}, accessToken: () => null }) },
      })('clients/mobile/src/native-session.ts');
      const session = createNativeSession('https://example.invalid');
      session.subscribe((value, reason) => events.push({ value, reason }));
      const errors = [];
      const disconnect = await session.connect(message => errors.push(message));
      assert.deepEqual(events, [{ value: null, reason: 'restore' }]);
      assert.deepEqual(errors, unavailable ? ['Synthetic startup failure'] : []);
      disconnect();
      assert.equal(timers.size, 0);
      assert.equal(removed, platform === 'web' ? 0 : 2);
    } finally { global.window = previous; }
  });
}
