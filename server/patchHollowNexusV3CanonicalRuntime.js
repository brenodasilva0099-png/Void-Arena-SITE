const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const TEMPLATE = path.join(__dirname, 'templates', 'dashboard-v3.html');
const TARGET = path.join(ROOT, 'public', 'pages', 'dashboard.html');
const BUILD = '2026-09-02-home-v3-canonical-1';

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function withVersion(html, asset) {
  const escaped = asset.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(${escaped})(?:\\?[^\"']*)?`, 'g');
  return html.replace(re, `$1?v=${BUILD}`);
}

let html = read(TEMPLATE);
if (!html) throw new Error('Template canônico da Home V3 não encontrado.');

[
  '/css/hollow-v2-runtime.css',
  '/css/hollow-v2-final.css',
  '/css/hollow-home-v3.css',
  '/js/core/hollow-v2-runtime.js',
  '/js/core/hollow-v2-final.js',
  '/js/pages/dashboard-v3.js'
].forEach((asset) => { html = withVersion(html, asset); });

if (!html.includes('/css/hollow-v2-audit-fixes.css')) {
  html = html.replace('</head>', `  <link rel="stylesheet" href="/css/hollow-v2-audit-fixes.css?v=${BUILD}" />\n</head>`);
}
if (!html.includes('/js/core/hollow-v2-audit-fixes.js')) {
  html = html.replace('</body>', `  <script src="/js/core/hollow-v2-audit-fixes.js?v=${BUILD}"></script>\n</body>`);
}

fs.writeFileSync(TARGET, html, 'utf8');
console.log('[Hollow Nexus V3] Home canônica restaurada após todos os patches legados.');

module.exports = { BUILD, TARGET, TEMPLATE };
