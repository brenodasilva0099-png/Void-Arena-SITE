const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const VERSION = '2026-09-03-v4-unified-final-1';
const CSS_ASSET = '/css/hollow-v4-unified.css';
const JS_ASSET = '/js/core/hollow-v4-unified.js';

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}
function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (read(file) !== content) fs.writeFileSync(file, content, 'utf8');
}
function walkHtml(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walkHtml(absolute));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) files.push(absolute);
  }
  return files;
}
function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function upsertCss(html, asset) {
  const pattern = new RegExp(`<link[^>]+href=["']${escapeRegex(asset)}(?:\\?[^"']*)?["'][^>]*>`, 'i');
  const tag = `<link rel="stylesheet" href="${asset}?v=${VERSION}">`;
  if (pattern.test(html)) return html.replace(pattern, tag);
  return html.includes('</head>') ? html.replace('</head>', `  ${tag}\n</head>`) : `${tag}\n${html}`;
}
function upsertJs(html, asset) {
  const pattern = new RegExp(`<script[^>]+src=["']${escapeRegex(asset)}(?:\\?[^"']*)?["'][^>]*><\\/script>`, 'i');
  const tag = `<script src="${asset}?v=${VERSION}"></script>`;
  if (pattern.test(html)) return html.replace(pattern, tag);
  return html.includes('</body>') ? html.replace('</body>', `  ${tag}\n</body>`) : `${html}\n${tag}`;
}
function addBodyClass(html, className) {
  return html.replace(/<body([^>]*)>/i, (match, attrs) => {
    const classMatch = attrs.match(/class=["']([^"']*)["']/i);
    if (classMatch) {
      const classes = new Set(classMatch[1].split(/\s+/).filter(Boolean));
      classes.add(className);
      return match.replace(classMatch[0], `class="${[...classes].join(' ')}"`);
    }
    return `<body${attrs} class="${className}">`;
  });
}
function normalizeVisibleBranding(html) {
  return html
    .replaceAll('Void Arena', 'Hollow Nexus')
    .replaceAll('Federação Hollow Nexus', 'Hollow Nexus League')
    .replaceAll('Correios da Arena', 'Central de Notificações');
}
function patch(file) {
  let html = read(file);
  if (!html) return false;
  html = addBodyClass(html, 'hn4-unified-page');
  html = upsertCss(html, CSS_ASSET);
  html = upsertJs(html, JS_ASSET);
  html = normalizeVisibleBranding(html);
  write(file, html);
  return true;
}

const files = walkHtml(PUBLIC).sort();
const changed = files.filter(patch);
console.log(`[Hollow Nexus V4/Unified] camada final aplicada em ${changed.length}/${files.length} páginas HTML.`);

module.exports = {
  VERSION,
  CSS_ASSET,
  JS_ASSET,
  files,
  changed
};
