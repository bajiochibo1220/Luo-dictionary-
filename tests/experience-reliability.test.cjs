const test = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { loader } = require('./load-ts.cjs');
const tick = () => new Promise(resolve => setImmediate(resolve));
function harness(mocks = {}) {
  const values = [], effects = [], jobs = []; let cursor = 0;
  const load = loader({ react: { ...React,
    useState(initial) { const i = cursor++; if (!(i in values)) values[i] = initial; return [values[i], next => { values[i] = typeof next === 'function' ? next(values[i]) : next; }]; },
    useRef(initial) { const i = cursor++; return values[i] ??= { current: initial }; },
    useEffect(callback, dependencies) { const i = cursor++; const previous = effects[i]; if (!previous || dependencies.some((value, j) => !Object.is(value, previous.dependencies[j]))) jobs.push(() => { previous?.cleanup?.(); effects[i] = { dependencies, cleanup: callback() }; }); },
  }, ...mocks });
  return { load, render(callback) { cursor = 0; const tree = callback(); jobs.splice(0).forEach(job => job()); return tree; } };
}
function find(node, predicate) { if (!node || typeof node !== 'object') return; if (predicate(node)) return node; for (const child of React.Children.toArray(node.props?.children)) { const found = find(child, predicate); if (found) return found; } }
const sourceData = { capabilities: { ocr: true, describe: true, transcribe: false, illustrate: false }, assets: [{ id: 'image-a', title: 'Approved image A', type: 'image' }, { id: 'image-b', title: 'Approved image B', type: 'image' }], stories: [] };
const change = value => ({ target: { value, checked: value } });

test('navigation cancellation does not remove a request deadline', async () => {
  const { requestSignal } = loader()('src/lib/api-request-timeout.ts');
  const controller = new AbortController();
  const signal = requestSignal(controller.signal, 10);
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.equal(signal.aborted, true); assert.equal(signal.reason.name, 'TimeoutError');
  assert.equal(controller.signal.aborted, false);
  const cancelled = requestSignal(controller.signal, 1000);
  controller.abort('screen changed');
  assert.equal(cancelled.aborted, true); assert.equal(cancelled.reason, 'screen changed');
  assert.equal(requestSignal(controller.signal, 1000), controller.signal);
});

test('older clients combine cancellation and deadlines without AbortSignal.any', async () => {
  const original = AbortSignal.any;
  try {
    AbortSignal.any = undefined;
    const { requestSignal } = loader()('src/lib/api-request-timeout.ts');
    const controller = new AbortController(); const signal = requestSignal(controller.signal, 10);
    await new Promise(resolve => setTimeout(resolve, 30));
    assert.equal(signal.reason.name, 'TimeoutError');
    const other = new AbortController(); const cancelled = requestSignal(other.signal, 1000);
    other.abort('cancelled'); assert.equal(cancelled.reason, 'cancelled');
  } finally { AbortSignal.any = original; }
});

test('AI citations resolve stored module codes as well as display names', () => {
  const { publicSourceHref, applicationScreenHref } = loader()('src/lib/app-navigation.ts');
  assert.equal(publicSourceHref('luo', { id: 'record', module: 'oral_histories' }), '/luo/sigana/record');
  assert.equal(publicSourceHref('luo', { id: 'record', module: 'heritage_sites' }), '/luo/piny-luo/record');
  assert.equal(publicSourceHref('luo', { id: 'record', module: 'Cultural-Artifacts' }), '/luo/gik-luo/record');
  assert.equal(applicationScreenHref('/classrooms?languageId=1'), '/courses?languageId=1');
});

test('guests receive sign-in actions before AI source requests or tutor submission', () => {
  for (const [file, component] of [['ai-tools-workspace', 'AiToolsWorkspace'], ['tutor-workspace', 'TutorWorkspace']]) {
    const h = harness(); let calls = 0;
    const workspace = h.load(`src/components/shared/${file}.tsx`)[component];
    const signIn = () => {};
    const tree = h.render(() => workspace({ request: () => { calls++; }, languageId: 1, signedIn: false, onSignIn: signIn }));
    assert.equal(calls, 0); assert.equal(tree.props.onSignIn, signIn);
    assert.equal(find(tree, node => node.type === 'form'), undefined);
  }
});

test('AI media drafts prevent duplicate sends and clear consent and results when the source changes', async () => {
  const h = harness(); const { AiToolsWorkspace } = h.load('src/components/shared/ai-tools-workspace.tsx');
  let resolve, posts = 0;
  const request = async (_path, init) => { if (!init) return sourceData; posts++; return new Promise(done => { resolve = done; }); };
  const render = () => h.render(() => AiToolsWorkspace({ request, languageId: 1 }));
  render(); await tick(); let tree = render();
  find(tree, node => node.type === 'select' && node.props.required).props.onChange(change('image-a'));
  tree = render(); find(tree, node => node.type === 'input').props.onChange(change(true)); tree = render();
  const submit = find(tree, node => node.type === 'form').props.onSubmit;
  submit({ preventDefault() {} }); submit({ preventDefault() {} });
  assert.equal(posts, 1);
  resolve({ text: 'Draft from A' }); await tick(); tree = render();
  assert.ok(find(tree, node => node.type === 'p' && node.props.children === 'Draft from A'));
  find(tree, node => node.type === 'select' && node.props.required).props.onChange(change('image-b')); tree = render();
  assert.equal(find(tree, node => node.type === 'input').props.checked, false);
  assert.equal(find(tree, node => node.type === 'p' && node.props.children === 'Draft from A'), undefined);
  assert.equal(find(tree, node => node.type === 'form').props.children.at(-1).props.disabled, true);
});

test('a media response from a previous language cannot overwrite the current workspace', async () => {
  const h = harness(); const { AiToolsWorkspace } = h.load('src/components/shared/ai-tools-workspace.tsx');
  let resolve, languageId = 1;
  const request = async (_path, init) => init ? new Promise(done => { resolve = done; }) : sourceData;
  const render = () => h.render(() => AiToolsWorkspace({ request, languageId }));
  render(); await tick(); let tree = render();
  find(tree, node => node.type === 'select' && node.props.required).props.onChange(change('image-a'));
  tree = render(); find(tree, node => node.type === 'input').props.onChange(change(true)); tree = render();
  find(tree, node => node.type === 'form').props.onSubmit({ preventDefault() {} });
  languageId = 3; render(); await tick(); resolve({ text: 'Outdated draft' }); await tick(); tree = render();
  assert.equal(find(tree, node => node.type === 'p' && node.props.children === 'Outdated draft'), undefined);
  assert.equal(find(tree, node => node.type === 'input').props.checked, false);
});

test('tutor retries after a provider error and ignores duplicate submissions', async () => {
  const h = harness(); const { TutorWorkspace } = h.load('src/components/shared/tutor-workspace.tsx');
  let calls = 0, reject;
  const request = async () => { calls++; if (calls === 1) return new Promise((_resolve, fail) => { reject = fail; }); return { text: 'Recovered feedback', sources: [{ id: 'source', title: 'Reviewed source', href: '/luo/ngero/source' }] }; };
  const render = () => h.render(() => TutorWorkspace({ request, languageId: 1 }));
  render(); let tree = render(); find(tree, node => node.type === 'input' && node.props.type === 'checkbox').props.onChange(change(true)); tree = render();
  let submit = find(tree, node => node.type === 'form').props.onSubmit;
  submit({ preventDefault() {} }); submit({ preventDefault() {} }); assert.equal(calls, 1);
  reject(new Error('Provider temporarily unavailable')); await tick(); tree = render();
  assert.match(find(tree, node => node.props.role === 'alert').props.children, /temporarily unavailable/);
  submit = find(tree, node => node.type === 'form').props.onSubmit; submit({ preventDefault() {} }); await tick(); tree = render();
  assert.equal(calls, 2); assert.equal(find(tree, node => node.props.href === '/luo/ngero/source').props.children, 'Reviewed source');
});

test('the installation prompt waits, can be dismissed, and handles a consumed browser event', async () => {
  const previousWindow = global.window;
  const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  const storage = new Map(), listeners = new Map(), timers = [];
  global.window = { matchMedia: () => ({ matches: false }), addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name), setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; }, clearTimeout() {} };
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) } });
  try {
    const h = harness({ './app-updates': { useAppUpdates: () => null } });
    const { InstallAppPrompt } = h.load('src/components/pwa/install-app-prompt.tsx');
    const render = () => h.render(() => InstallAppPrompt());
    assert.equal(render(), null);
    listeners.get('beforeinstallprompt')({ preventDefault() {}, prompt: async () => {}, userChoice: Promise.resolve({ outcome: 'dismissed' }) });
    assert.equal(render(), null); assert.equal(timers.at(-1).ms, 20000);
    timers.at(-1).fn(); let tree = render();
    find(tree, node => node.props['aria-label'] === 'Dismiss installation prompt').props.onClick();
    assert.equal(render(), null); assert.equal(storage.get('heritage-install-dismissed'), 'true');
    storage.clear();
    const h2 = harness({ './app-updates': { useAppUpdates: () => null } });
    const SecondPrompt = h2.load('src/components/pwa/install-app-prompt.tsx').InstallAppPrompt;
    const second = () => h2.render(() => SecondPrompt()); second();
    listeners.get('beforeinstallprompt')({ preventDefault() {}, prompt: async () => { throw new Error('Event already used'); } });
    second(); timers.at(-1).fn(); tree = second();
    find(tree, node => node.type === 'button' && !node.props['aria-label']).props.onClick();
    await tick(); assert.equal(second(), null);
    assert.equal(storage.get('heritage-install-dismissed'), 'true');
  } finally {
    global.window = previousWindow;
    if (storageDescriptor) Object.defineProperty(globalThis, 'sessionStorage', storageDescriptor); else delete globalThis.sessionStorage;
  }
});
