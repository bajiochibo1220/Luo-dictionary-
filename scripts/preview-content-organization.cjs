// Render the actual workspace components with fictional content for visual QA.
const fs = require('node:fs');
const path = require('node:path');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { loader } = require('../tests/load-ts.cjs');
const Link = ({ children, href, className }) => React.createElement('a', { href, className }, children);
const load = loader({
  'next/link': { __esModule: true, default: Link },
  'next/navigation': { useRouter: () => ({ refresh() {} }) },
});
const { ContentTable } = load('src/components/admin/content-table.tsx');
const { ReviewQueueList } = load('src/components/admin/review-queue-list.tsx');
const records = [
  ['1', 'Traditional woven basket', 'artifacts', 'Artifacts', 'submitted', true],
  ['2', 'Ceremonial clay pot', 'artifacts', 'Artifacts', 'needs_edit', false],
  ['3', 'A riddle about the evening sky', 'riddles', 'Riddles', 'submitted', false],
].map(([id, title, code, baseName, status, hasPublicVersion]) => ({
  id, title, status, hasPublicVersion, validatorId: null, createdAt: '2026-10-29',
  language: { code: 'luo', nativeName: 'Dholuo' }, module: { code, baseName },
  editLanguageId: 1, englishLanguageId: 2, canModerate: true, canEdit: true,
  canDelete: true, canCultureReview: true, canForward: true, canFinalReview: false,
  canPublish: false, canEarlyPublish: false,
}));
const output = path.resolve('docs/system-audit');
const cssDirectory = path.resolve('.next-organization/static/css');
const css = fs.readdirSync(cssDirectory).filter(name => name.endsWith('.css')).map(name => fs.readFileSync(path.join(cssDirectory, name), 'utf8')).join('\n') + '\n' + fs.readFileSync('src/app/globals.css', 'utf8').split('/* Content organization */')[1];
for (const [name, title, component] of [
  ['content', 'Content', React.createElement(ContentTable, { records, canDelete: true, canBulkWorkflow: true })],
  ['review', 'Review & edit', React.createElement(ReviewQueueList, { items: records.map(record => ({ ...record, module: record.module.baseName, language: record.language.nativeName })) })],
]) {
  const html = renderToStaticMarkup(component);
  fs.writeFileSync(path.join(output, `organization-${name}-preview.html`), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title} layout preview</title><style>${css}</style></head><body style="margin:0;font-family:Arial,sans-serif;background:#f4f7f6;color:#292524"><header style="padding:20px 24px;background:#143c42;color:white;font:600 20px Georgia,serif">Luo Heritage <span style="font:12px Arial;margin-left:16px">Admin workspace</span></header><main style="max-width:1200px;margin:auto;padding:24px 16px"><h1 style="font:30px Georgia,serif;margin-bottom:8px">${title}</h1><p style="font:14px Arial;color:#57534e;margin-bottom:24px">Choose a content area, then find and manage the items you need.</p>${html}</main></body></html>`);
}
console.log('Created content and review layout previews using fictional records.');
