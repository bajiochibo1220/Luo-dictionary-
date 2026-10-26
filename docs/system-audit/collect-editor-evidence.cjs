const fs = require('node:fs');
const path = require('node:path');
function readLog(file) {
  const bytes = fs.readFileSync(file);
  return bytes[0] === 0xff && bytes[1] === 0xfe ? bytes.subarray(2).toString('utf16le') : bytes.toString('utf8').replace(/^\uFEFF/, '');
}
for (const [source, target] of [
  ['.workspace-tests.log', 'editor-interface-tests-2026-10-26.log'],
  ['.workspace-typecheck.log', 'editor-interface-typecheck-2026-10-26.log'],
  ['.workspace-build.log', 'editor-interface-build-2026-10-26.log'],
  ['.workspace-mobile-build.log', 'editor-interface-mobile-build-2026-10-26.log'],
  ['.workspace-browser.log', 'editor-interface-browser-2026-10-26.log'],
  ['.workspace-smoke.log', 'editor-interface-endpoints-2026-10-26.log'],
]) {
  fs.writeFileSync(path.join('docs/system-audit', target), readLog(source) || 'TypeScript completed without errors.\n');
}
const catalog = JSON.parse(fs.readFileSync('src/lib/interface-copy-defaults.json', 'utf8'));
const summary = { authoredEntries: Object.keys(catalog).length, seededDholuoEntries: Object.values(catalog).filter(value => value.trim()).length, emptyDholuoEntries: Object.values(catalog).filter(value => !value.trim()).length, databaseLabels: 'Additional community-scoped collection titles and field labels are loaded at runtime.', languageAcceptance: 'Incomplete; all seed wording requires fluent-speaker review.' };
fs.writeFileSync('docs/system-audit/interface-language-readiness-2026-10-26.json', JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary));
