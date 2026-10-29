// Fictional content only: production discovery reads the public library API.
const fs = require('node:fs');
const path = require('node:path');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { loader } = require('../tests/load-ts.cjs');
const Link = ({ children, ...props }) => React.createElement('a', props, children);
const image = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="650" viewBox="0 0 1200 650"><rect width="1200" height="650" fill="#d6c5a4"/><path d="M0 480Q280 150 620 410T1200 290V650H0" fill="#3c6b5e"/><path d="M0 580Q350 300 710 520T1200 400V650H0" fill="#234c42"/><circle cx="930" cy="170" r="74" fill="#eebc69"/><path d="M100 90h150m-75-75v150M75 65l100 100L275 65" fill="none" stroke="#af8957" stroke-width="3" opacity=".4"/><text x="45" y="610" fill="#f9e8c4" font-size="18" font-family="Arial">SAMPLE IMAGE - LAYOUT PREVIEW ONLY</text></svg>');
const items = [
  { id: 'demo-story', title: 'Stories shared across generations', summary: 'Sample content for the layout preview. Community stories appear here with their original titles, descriptions and attached media.', moduleCode: 'folktales', moduleName: 'Folktales', media: [{ id: 'demo-image', type: 'image', url: image }] },
  { id: 'demo-recording', title: 'Voices from the community', summary: 'Sample recording card. Visitors can listen directly, then open the full item for translations and downloads.', moduleCode: 'oral_histories', moduleName: 'Oral histories', media: [{ id: 'demo-audio', type: 'audio', url: '/sample-audio-not-supplied' }] },
  { id: 'demo-riddle', title: 'A riddle to think about', summary: 'Sample text card. Riddles, proverbs and dictionary words appear alongside pictures and recordings.', moduleCode: 'riddles', moduleName: 'Riddles', media: [] },
];
const categories = [{ code: 'folktales', name: 'Folktales' }, { code: 'oral_histories', name: 'Oral histories' }, { code: 'riddles', name: 'Riddles' }, { code: 'songs', name: 'Songs' }, { code: 'artifacts', name: 'Artifacts' }, { code: 'dictionary', name: 'Dictionary' }];
let index = 0;
const { DiscoveryFeed } = loader({ react: { ...React, useState: initial => { const current = index++; return React.useState(current === 4 ? { items, categories } : current === 5 ? false : current === 13 ? categories : initial); } } })('src/components/shared/discovery-feed.tsx');
const html = renderToStaticMarkup(React.createElement(DiscoveryFeed, { request: async () => {}, languageCode: 'luo', languageName: 'Dholuo', Link }));
const cssDirectory = '.next-organization/static/css';
const css = fs.readdirSync(cssDirectory).filter(name => name.endsWith('.css')).map(name => fs.readFileSync(path.join(cssDirectory, name), 'utf8')).join('\n') + '\n' + fs.readFileSync('src/app/globals.css', 'utf8').split('/* Public discovery:')[1].split('\n').slice(1).join('\n');
const logo = 'data:image/png;base64,' + fs.readFileSync('public/icons/luo-heritage-192.png').toString('base64');
fs.writeFileSync('docs/system-audit/discovery-preview.html', `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Public discovery - sample content</title><style>${css}</style></head><body style="margin:0;background:#eee5d5;font-family:Arial,sans-serif"><header style="display:flex;align-items:center;gap:12px;background:#5c3a1c;color:#fff8eb;padding:10px 16px"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 6h18M3 12h18M3 18h18"/></svg><img src="${logo}" alt="" width="36" height="36"><span style="font-family:Georgia,serif;flex:1">Luo Heritage</span><span style="font-size:12px">Dholuo</span><span style="font-size:12px">Sign in</span></header>${html}</body></html>`);
console.log('Created the public discovery preview with fictional records.');
