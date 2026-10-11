const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Execute the actual TypeScript modules with isolated dependencies. Tests never
// connect to the real database, contact providers, or change account data.
exports.loader = function loader(mocks = {}) {
  mocks = { "@/lib/maintenance": { assertServiceAvailable: async () => {} }, ...mocks };
  const cache = new Map();
  function load(filename) {
    filename = path.resolve(filename);
    if (cache.has(filename)) return cache.get(filename).exports;
    const loadedModule = { exports: {} };
    cache.set(filename, loadedModule);
    const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
      fileName: filename,
    }).outputText;
    function localRequire(name) {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      if (name.startsWith('@/') || name.startsWith('.')) {
        const base = name.startsWith('@/') ? path.resolve('src', name.slice(2)) : path.resolve(path.dirname(filename), name);
        for (const candidate of [base + '.ts', base + '.tsx', path.join(base, 'index.ts')]) if (fs.existsSync(candidate)) return load(candidate);
      }
      return require(name);
    }
    new Function('require', 'module', 'exports', '__filename', '__dirname', compiled)(localRequire, loadedModule, loadedModule.exports, filename, path.dirname(filename));
    return loadedModule.exports;
  }
  return load;
};
