// Idempotent source migration: authored JSX text becomes a React translation
// boundary. Cultural records, form values and API payloads are never rewritten.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const defaultsPath = 'src/lib/interface-copy-defaults.json';
const catalog = JSON.parse(fs.readFileSync(defaultsPath, 'utf8'));
const entities = { amp: '&', apos: "'", quot: '"', lt: '<', gt: '>', nbsp: ' ', mdash: '—', ndash: '–', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', hellip: '…' };
const decode = text => text.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (whole, code) => code[0] === '#' ? String.fromCodePoint(parseInt(code.slice(code[1]?.toLowerCase() === 'x' ? 2 : 1), code[1]?.toLowerCase() === 'x' ? 16 : 10)) : entities[code] ?? whole);
function jsxText(text) {
  const lines = text.replace(/\r/g, '').split('\n');
  return decode(lines.map((line, index) => {
    let result = line.replace(/\t/g, ' ');
    if (index) result = result.replace(/^ +/, '');
    if (index !== lines.length - 1) result = result.replace(/ +$/, '');
    return result;
  }).filter(Boolean).join(' '));
}
function register(value) { const key = value.replace(/\s+/g, ' ').trim(); if (key && /[a-zA-Z]{2}/.test(key) && !Object.hasOwn(catalog, key)) catalog[key] = ''; }
function walk(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : entry.name.endsWith('.tsx') ? [path.join(dir, entry.name)] : []); }
let files = 0, entries = 0;
for (const filename of [...walk('src/components'), ...walk('src/app').filter(file => !file.includes(`${path.sep}api${path.sep}`))]) {
  if (/interface-language|interface-copy-editor/.test(filename)) continue;
  const raw = fs.readFileSync(filename, 'utf8');
  const original = raw.replace(/^\uFEFF/, '');
  const source = ts.createSourceFile(filename, original, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const edits = [], imports = new Set();
  function replace(node, text) { edits.push({ start: node.getStart(source), end: node.end, text }); }
  function visit(node) {
    if (ts.isPropertyAssignment(node) && ['label', 'title', 'description', 'helpText'].includes(node.name.getText(source)) && ts.isStringLiteral(node.initializer)) register(node.initializer.text);
    if (ts.isCallExpression(node) && /^toast\.(success|error|warning|info|message)$/.test(node.expression.getText(source)) && node.arguments.length && !ts.isJsxElement(node.arguments[0]) && !ts.isJsxSelfClosingElement(node.arguments[0])) {
      const message = node.arguments[0];
      function collect(child) { if (ts.isStringLiteral(child)) register(child.text); ts.forEachChild(child, collect); }
      collect(message); imports.add('InterfaceText');
      replace(message, `<InterfaceText source={${message.getText(source)}} />`);
      return;
    }
    if (ts.isJsxText(node)) {
      const text = jsxText(node.getFullText(source));
      if (text.trim() && /[a-zA-Z]{2}/.test(text)) {
        register(text);
        const parent = node.parent;
        const tag = ts.isJsxElement(parent) ? parent.openingElement.tagName.getText(source) : '';
        if (!['option', 'InterfaceOption', 'script', 'style', 'title'].includes(tag)) {
          imports.add('InterfaceText');
          // JSXText includes indentation: replace using pos, not getStart.
          edits.push({ start: node.pos, end: node.end, text: `<InterfaceText source=${JSON.stringify(text)} />` }); entries++;
        }
      }
      return;
    }
    if (ts.isJsxExpression(node) && node.expression && !ts.isJsxAttribute(node.parent)) {
      const expression = node.expression;
      const isLiteral = value => ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value);
      if ((isLiteral(expression) && expression.text.trim() && /[a-zA-Z]{2}/.test(expression.text)) || (ts.isConditionalExpression(expression) && isLiteral(expression.whenTrue) && isLiteral(expression.whenFalse))) {
        if (isLiteral(expression)) register(expression.text);
        else { register(expression.whenTrue.text); register(expression.whenFalse.text); }
        imports.add('InterfaceText'); replace(node, `<InterfaceText source={${expression.getText(source)}} />`); return;
      }
    }
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(source);
      if (tag === 'InterfaceText') {
        const attr = node.attributes.properties.find(attr => ts.isJsxAttribute(attr) && attr.name.getText(source) === 'source');
        if (attr?.initializer && ts.isStringLiteral(attr.initializer)) register(decode(attr.initializer.text));
      }
      const controls = { input: 'InterfaceInput', textarea: 'InterfaceTextarea', select: 'InterfaceSelect', button: 'InterfaceButton', option: 'InterfaceOption' };
      const hasTextAttribute = node.attributes.properties.some(attr => ts.isJsxAttribute(attr) && ['placeholder', 'title', 'aria-label'].includes(attr.name.getText(source)) && attr.initializer && ts.isStringLiteral(attr.initializer));
      for (const attr of node.attributes.properties) {
        if (ts.isJsxAttribute(attr) && ['placeholder', 'title', 'aria-label', 'alt'].includes(attr.name.getText(source)) && attr.initializer && ts.isStringLiteral(attr.initializer)) register(decode(attr.initializer.text));
      }
      if (controls[tag] && (hasTextAttribute || tag === 'option')) {
        imports.add(controls[tag]); replace(node.tagName, controls[tag]);
        if (ts.isJsxOpeningElement(node) && ts.isJsxElement(node.parent)) replace(node.parent.closingElement.tagName, controls[tag]);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  if (!edits.length && original === raw) continue;
  let output = original;
  for (const edit of edits.sort((a, b) => b.start - a.start)) output = output.slice(0, edit.start) + edit.text + output.slice(edit.end);
  // Existing imports are updated on subsequent runs without introducing duplicates.
  const importPattern = /import \{ ([^}]+) \} from "@\/components\/shared\/interface-language";\r?\n/;
  const existing = output.match(importPattern);
  if (existing) { existing[1].split(',').map(s => s.trim()).forEach(s => imports.add(s)); output = output.replace(importPattern, ''); }
  const importLine = `import { ${[...imports].sort().join(', ')} } from "@/components/shared/interface-language";\n`;
  const outputSource = ts.createSourceFile(filename, output, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const directive = outputSource.statements.find(statement => ts.isExpressionStatement(statement) && ts.isStringLiteral(statement.expression) && statement.expression.text === 'use client');
  if (directive) {
    output = '"use client";\n' + importLine + output.slice(0, directive.getStart(outputSource)) + output.slice(directive.end);
  } else output = importLine + output;
  fs.writeFileSync(filename, output); files++;
}
fs.writeFileSync(defaultsPath, JSON.stringify(Object.fromEntries(Object.entries(catalog).sort(([a], [b]) => a.localeCompare(b))), null, 2) + '\n');
console.log(JSON.stringify({ files, textBoundaries: entries, catalogEntries: Object.keys(catalog).length }));
