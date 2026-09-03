const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const PAGES = path.join(PUBLIC, 'pages');
const BUILD = '2026-09-03-v4-full-pages-2';

const MAIN_PAGES = [
  'eventos.html',
  'times.html',
  'jogadores.html',
  'rankings.html',
  'resultados.html'
];
const EXCLUDE_SECONDARY = new Set([
  'dashboard.html',
  ...MAIN_PAGES,
  'competicoes.html',
  'clubes.html',
  'atletas.html',
  'partidas.html',
  'cafe-com-leite.html',
  'administracao.html'
]);

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}
function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (read(file) !== content) fs.writeFileSync(file, content, 'utf8');
}
function listHtmlFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listHtmlFiles(absolute));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) out.push(absolute);
  }
  return out;
}
function versioned(asset) {
  return `${asset}?v=${BUILD}`;
}
function upsertCss(html, asset) {
  const escaped = asset.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`<link[^>]+href=["']${escaped}(?:\\?[^"']*)?["'][^>]*>`, 'i');
  const tag = `<link rel="stylesheet" href="${versioned(asset)}">`;
  if (pattern.test(html)) return html.replace(pattern, tag);
  return html.includes('</head>') ? html.replace('</head>', `  ${tag}\n</head>`) : `${tag}\n${html}`;
}
function upsertJs(html, asset) {
  const escaped = asset.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`<script[^>]+src=["']${escaped}(?:\\?[^"']*)?["'][^>]*><\\/script>`, 'i');
  const tag = `<script src="${versioned(asset)}"></script>`;
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
function mainPolish(html) {
  let out = addBodyClass(html, 'hn4-section-page');
  out = upsertCss(out, '/css/hollow-v2-runtime.css');
  out = upsertCss(out, '/css/hollow-v2-final.css');
  out = upsertCss(out, '/css/hollow-v2-audit-fixes.css');
  out = upsertCss(out, '/css/hollow-pages-v4.css');
  out = upsertJs(out, '/js/core/hollow-v2-runtime.js');
  out = upsertJs(out, '/js/core/hollow-v2-final.js');
  out = upsertJs(out, '/js/core/hollow-v2-audit-fixes.js');
  out = upsertJs(out, '/js/core/hollow-pages-v4.js');
  return out.replaceAll('Void Arena', 'Hollow Nexus');
}
function secondaryPolish(html) {
  let out = addBodyClass(html, 'hn4-secondary-page');
  out = upsertCss(out, '/css/hollow-v2-runtime.css');
  out = upsertCss(out, '/css/hollow-v2-final.css');
  out = upsertCss(out, '/css/hollow-v2-audit-fixes.css');
  out = upsertCss(out, '/css/hollow-secondary-v4.css');
  out = upsertJs(out, '/js/core/hollow-v2-runtime.js');
  out = upsertJs(out, '/js/core/hollow-v2-final.js');
  out = upsertJs(out, '/js/core/hollow-v2-audit-fixes.js');
  return out
    .replaceAll('Void Arena', 'Hollow Nexus')
    .replaceAll('Correios da Arena', 'Central de Notificações')
    .replaceAll('Federação Hollow Nexus', 'Hollow Nexus League');
}

// Capture the committed V4 pages before any legacy runtime patch can mutate public/pages.
const capturedMainPages = new Map();
for (const fileName of MAIN_PAGES) {
  const file = path.join(PAGES, fileName);
  const html = read(file);
  if (!html || !html.includes('hn4-page')) {
    throw new Error(`Página V4 canônica inválida antes do boot: ${fileName}`);
  }
  capturedMainPages.set(fileName, html);
}

function restoreMainPages() {
  for (const [fileName, html] of capturedMainPages) {
    write(path.join(PAGES, fileName), mainPolish(html));
  }
  console.log(`[Hollow Nexus V4] ${capturedMainPages.size} páginas principais restauradas após os patches legados.`);
}

function polishSecondaryPages() {
  let changed = 0;
  for (const file of listHtmlFiles(PAGES)) {
    const fileName = path.basename(file).toLowerCase();
    if (EXCLUDE_SECONDARY.has(fileName)) continue;
    const html = read(file);
    if (!html || /http-equiv=["']refresh["']/i.test(html)) continue;
    write(file, secondaryPolish(html));
    changed += 1;
  }
  console.log(`[Hollow Nexus V4] linguagem visual secundária aplicada em ${changed} páginas auxiliares.`);
  return changed;
}

module.exports = {
  BUILD,
  MAIN_PAGES,
  restoreMainPages,
  polishSecondaryPages
};
