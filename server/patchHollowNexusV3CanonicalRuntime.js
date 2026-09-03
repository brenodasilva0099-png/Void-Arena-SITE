const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const TEMPLATE = path.join(__dirname, 'templates', 'dashboard-v4.html');
const TARGET = path.join(ROOT, 'public', 'pages', 'dashboard.html');
const BUILD = '2026-09-02-home-v4-reference-1';

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function withVersion(html, asset) {
  const escaped = asset.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(${escaped})(?:\\?[^\"']*)?`, 'g');
  return html.replace(re, `$1?v=${BUILD}`);
}

let html = read(TEMPLATE);
if (!html) throw new Error('Template canônico da Home V4 não encontrado.');

[
  '/css/hollow-v2-runtime.css',
  '/css/hollow-v2-final.css',
  '/css/hollow-v2-audit-fixes.css',
  '/css/hollow-home-v4.css',
  '/js/core/hollow-v2-runtime.js',
  '/js/core/hollow-v2-final.js',
  '/js/core/hollow-v2-audit-fixes.js',
  '/js/pages/dashboard-v4.js',
  '/assets/hollow-nexus-season-stage.svg'
].forEach((asset) => { html = withVersion(html, asset); });

fs.writeFileSync(TARGET, html, 'utf8');
console.log('[Hollow Nexus V4] Home canônica restaurada após todos os patches legados.');

module.exports = { BUILD, TARGET, TEMPLATE };
