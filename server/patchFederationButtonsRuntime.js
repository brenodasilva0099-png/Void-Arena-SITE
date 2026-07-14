const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const pagesDir = path.join(ROOT, 'public', 'pages');
const cssFile = path.join(ROOT, 'public', 'css', 'federation-portal.css');
const jsFile = path.join(ROOT, 'public', 'js', 'core', 'federation-portal.js');
const dashboardFile = path.join(pagesDir, 'dashboard.html');
const indexFile = path.join(ROOT, 'public', 'index.html');
const rootIndexFile = path.join(ROOT, 'index.html');
const BUILD = '2026-07-14-frm-buttons-v1';
const LOGO_SRC = '/api/brand/icon?v=' + BUILD;
const CSS_HREF = '/css/federation-portal.css?v=' + BUILD;
const JS_SRC = '/js/core/federation-portal.js?v=' + BUILD;
let changed = false;

function ensureDir(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
}

function writeIfChanged(file, content) {
  ensureDir(file);
  const before = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  if (before !== content) {
    fs.writeFileSync(file, content, 'utf8');
    changed = true;
  }
}

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function write(file, content) {
  if (read(file) !== content) {
    fs.writeFileSync(file, content, 'utf8');
    changed = true;
  }
}

function patchCss() {
  if (!fs.existsSync(cssFile)) return;
  let css = read(cssFile);
  const extra = `
/* FRM button/link hardening */
.frm-wordmark { display: inline-flex; align-items: baseline; gap: .32em; white-space: nowrap; }
.frm-wordmark .frm-the { color: #d9d1ee; font-size: .48em; line-height: 1; letter-spacing: .02em; text-transform: none; font-weight: 800; transform: translateY(-.08em); }
.frm-brand .frm-wordmark .frm-the { display: block; font-size: 11px; margin-bottom: 2px; transform: none; }
.frm-brand .frm-wordmark { display: block; }
.frm-hero h1 .frm-the { font-size: .44em; vertical-align: super; margin-right: .22em; color: #f5f0ff; letter-spacing: .01em; text-transform: none; }
.frm-header a, .frm-nav a, .frm-btn { pointer-events: auto; }
.frm-app-content-card > .va-shell, .frm-app-content-card .va-shell > .va-sidebar, .frm-app-content-card .frm-shell { display: none !important; }
.frm-app-content-card .va-card, .frm-app-content-card .va-panel, .frm-app-content-card .card { max-width: none; }
body.frm-app-shell-active { overflow-x: hidden; }
body.frm-app-shell-active .va-organized-body { background: transparent !important; }
`;
  if (!css.includes('FRM button/link hardening')) css += extra;
  write(cssFile, css);
}

function patchDashboard() {
  if (!fs.existsSync(dashboardFile)) return;
  let html = read(dashboardFile);
  html = html.replace(/href="\/css\/federation-portal\.css\?v=[^"]+"/g, `href="${CSS_HREF}"`);
  html = html.replace(/src="\/js\/core\/federation-portal\.js\?v=[^"]+"/g, `src="${JS_SRC}"`);
  html = html.replace(/\/api\/brand\/icon\?v=[^"')<\s]+/g, LOGO_SRC);
  html = html.replace(/<strong>the HOLLOW NEXUS <span>FRM<\/span><\/strong>/g, '<strong><span class="frm-wordmark"><span class="frm-the">the</span><span>HOLLOW NEXUS <span>FRM</span></span></span></strong>');
  html = html.replace(/<h1>the HOLLOW NEXUS <span>FRM<\/span><\/h1>/g, '<h1><span class="frm-the">the</span>HOLLOW NEXUS <span>FRM</span></h1>');
  html = html.replace(/href="\/pages\/dashboard\.html"/g, 'href="/pages/dashboard.html"');
  html = html.replace(/<span class="frm-icon">🔔<b class="frm-badge">3<\/b><\/span>/g, '<a class="frm-icon" href="/pages/notificacoes.html" aria-label="Notificações">🔔<b class="frm-badge">3</b></a>');
  html = html.replace(/<span class="frm-icon">✉<b class="frm-badge">5<\/b><\/span>/g, '<a class="frm-icon" href="/pages/correio.html" aria-label="Correio">✉<b class="frm-badge">5</b></a>');
  write(dashboardFile, html);
}

function redirectHtml() {
  return '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Hollow Nexus FRM</title><meta http-equiv="refresh" content="0; url=/pages/dashboard.html"><script>location.replace("/pages/dashboard.html");</script></head><body style="background:#02040a;color:#fff;font-family:system-ui">Redirecionando para Hollow Nexus FRM...</body></html>';
}

function patchHtmlPages() {
  if (!fs.existsSync(pagesDir)) return;
  for (const entry of fs.readdirSync(pagesDir)) {
    if (!entry.endsWith('.html')) continue;
    const file = path.join(pagesDir, entry);
    let html = read(file);
    if (!html) continue;
    if (!html.includes('/css/federation-portal.css')) {
      html = html.replace('</head>', `  <link rel="stylesheet" href="${CSS_HREF}" />\n</head>`);
    }
    if (!html.includes('/js/core/federation-portal.js')) {
      html = html.replace('</body>', `  <script src="${JS_SRC}"></script>\n</body>`);
    }
    html = html.replace(/href="\/"/g, 'href="/pages/dashboard.html"');
    html = html.replace(/href="\/index\.html"/g, 'href="/pages/dashboard.html"');
    write(file, html);
  }
}

patchCss();
patchDashboard();
patchHtmlPages();
writeIfChanged(indexFile, redirectHtml());
writeIfChanged(rootIndexFile, redirectHtml());

try {
  require('./patchFederationCompleteRuntime');
} catch (error) {
  console.error('[Federacao] Falha ao aplicar migracao completa FRM:', error.message);
}

console.log(changed ? '[Federacao] Botoes funcionais, the pequeno e bloqueio da versao antiga aplicados.' : '[Federacao] Botoes FRM ja estavam funcionais.');
