const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const pagesDir = path.join(ROOT, 'public', 'pages');
const BUILD = '2026-07-15-polish-authoritative-v1';
const POLISH_CSS = '/css/federation-polish.css?v=' + BUILD;
const POLISH_JS = '/js/core/federation-polish.js?v=' + BUILD;
let changed = false;

function read(file) { return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''; }
function write(file, html) { if (read(file) !== html) { fs.writeFileSync(file, html, 'utf8'); changed = true; } }
function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : (entry.isFile() && entry.name.endsWith('.html') ? [full] : []);
  });
}
function normalizePage(file) {
  let html = read(file);
  if (!html) return;
  const before = html;
  html = html.replace(/<link[^>]+href=["'][^"']*\/css\/federation-portal\.css\?v=[^"']+["'][^>]*>\s*/g, '');
  html = html.replace(/<script[^>]+src=["'][^"']*\/js\/core\/federation-portal\.js\?v=[^"']+["'][^>]*><\/script>\s*/g, '');
  html = html.replace(/<link[^>]+href=["'][^"']*\/css\/federation-polish\.css\?v=[^"']+["'][^>]*>\s*/g, '');
  html = html.replace(/<script[^>]+src=["'][^"']*\/js\/core\/federation-polish\.js\?v=[^"']+["'][^>]*><\/script>\s*/g, '');
  if (html.includes('</head>')) html = html.replace('</head>', '  <link rel="stylesheet" href="' + POLISH_CSS + '" />\n</head>');
  if (html.includes('</body>')) html = html.replace('</body>', '  <script src="' + POLISH_JS + '"></script>\n</body>');
  if (html !== before) write(file, html);
}

walk(pagesDir).forEach(normalizePage);
console.log(changed ? '[Federacao] Portal antigo desativado; polish final virou camada autoritativa.' : '[Federacao] Portal antigo ja apontava para polish final.');
