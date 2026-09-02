const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const VERSION = '2026-09-02-2';
const CSS = `<link rel="stylesheet" href="/css/hollow-v2-runtime.css?v=${VERSION}">`;
const JS = `<script src="/js/core/hollow-v2-runtime.js?v=${VERSION}"></script>`;

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function write(file, content) {
  if (read(file) !== content) fs.writeFileSync(file, content, 'utf8');
}

function listHtmlFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...listHtmlFiles(absolute));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) found.push(absolute);
  }
  return found;
}

function inject(file) {
  let html = read(file);
  if (!html) return false;

  const cssPattern = /<link[^>]+href=["']\/css\/hollow-v2-runtime\.css(?:\?[^"']*)?["'][^>]*>/i;
  const jsPattern = /<script[^>]+src=["']\/js\/core\/hollow-v2-runtime\.js(?:\?[^"']*)?["'][^>]*><\/script>/i;

  if (cssPattern.test(html)) html = html.replace(cssPattern, CSS);
  else html = html.includes('</head>') ? html.replace('</head>', `  ${CSS}\n</head>`) : `${CSS}\n${html}`;

  if (jsPattern.test(html)) html = html.replace(jsPattern, JS);
  else html = html.includes('</body>') ? html.replace('</body>', `  ${JS}\n</body>`) : `${html}\n${JS}`;

  write(file, html);
  return true;
}

// A camada v2 precisa alcançar toda a superfície HTML servida pelo SITE,
// inclusive páginas criadas por patches anteriores durante o boot.
const TARGETS = listHtmlFiles(PUBLIC).sort();
const applied = TARGETS.filter(inject);
const relative = applied.map(file => path.relative(PUBLIC, file).replaceAll(path.sep, '/'));

console.log(`[Hollow Nexus v2] camada final aplicada em ${applied.length}/${TARGETS.length} páginas HTML.`);
console.log(`[Hollow Nexus v2] páginas: ${relative.join(', ')}`);

module.exports = { TARGETS, applied, VERSION };
