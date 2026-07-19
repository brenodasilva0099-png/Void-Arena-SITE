const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const PAGES_DIR = path.join(PUBLIC_DIR, 'pages');
const UPDATES_FILE = path.join(PAGES_DIR, 'atualizacoes.html');
const VERSION_FILE = path.join(PUBLIC_DIR, 'page-integrity.json');
const BUILD = '2026-07-18-page-integrity-v1';

const ASSETS = {
  criticalCss: `/css/league-critical.css?v=${BUILD}`,
  themeCss: `/css/league-polish.css?v=${BUILD}`,
  authCss: `/css/league-auth-ui.css?v=${BUILD}`,
  integrityJs: `/js/core/league-page-integrity.js?v=${BUILD}`,
  authJs: `/js/core/league-auth-ui.js?v=${BUILD}`
};

let changed = false;
const report = {
  build: BUILD,
  scannedPages: 0,
  changedPages: 0,
  generatedAssets: [],
  missingLocalAssets: [],
  duplicateAssetsRemoved: 0,
  updatedAt: '2026-07-18T21:28:00-03:00'
};

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (read(file) !== content) {
    fs.writeFileSync(file, content, 'utf8');
    changed = true;
    return true;
  }
  return false;
}

function walkHtml(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkHtml(full);
    return entry.isFile() && entry.name.toLowerCase().endsWith('.html') ? [full] : [];
  });
}

function ensureThemeAsset() {
  const leagueCss = path.join(PUBLIC_DIR, 'css', 'league-polish.css');
  const federationCss = path.join(PUBLIC_DIR, 'css', 'federation-polish.css');
  if (!fs.existsSync(leagueCss) && fs.existsSync(federationCss)) {
    fs.mkdirSync(path.dirname(leagueCss), { recursive: true });
    fs.copyFileSync(federationCss, leagueCss);
    report.generatedAssets.push('/css/league-polish.css');
    changed = true;
  }

  const leagueJs = path.join(PUBLIC_DIR, 'js', 'core', 'league-polish.js');
  const federationJs = path.join(PUBLIC_DIR, 'js', 'core', 'federation-polish.js');
  if (!fs.existsSync(leagueJs) && fs.existsSync(federationJs)) {
    fs.mkdirSync(path.dirname(leagueJs), { recursive: true });
    fs.copyFileSync(federationJs, leagueJs);
    report.generatedAssets.push('/js/core/league-polish.js');
    changed = true;
  }
}

function removeAssetTags(html, pattern) {
  let removed = 0;
  const next = html.replace(pattern, () => {
    removed += 1;
    return '';
  });
  report.duplicateAssetsRemoved += Math.max(0, removed - 1);
  return next;
}

function normalizePage(file) {
  let html = read(file);
  if (!html) return;
  const before = html;
  report.scannedPages += 1;

  html = html
    .replace(/\/css\/federation-polish\.css(?:\?[^"']*)?/gi, '/css/league-polish.css')
    .replace(/\/js\/core\/federation-polish\.js(?:\?[^"']*)?/gi, '/js/core/league-polish.js')
    .replace(/\/api\/federation\//gi, '/api/league/')
    .replace(/\/api\/federation\b/gi, '/api/league');

  html = removeAssetTags(html, /\s*<script[^>]+(?:discord-brand-sync|discord-auth-avatar|league-page-integrity|league-auth-ui)\.js[^>]*><\/script>/gi);
  html = removeAssetTags(html, /\s*<link[^>]+(?:discord-auth-avatar|league-critical|league-polish|league-auth-ui)\.css[^>]*>/gi);
  html = html.replace(/\s*<meta name="page-integrity-build"[^>]*>/gi, '');

  const headInjection = [
    `  <link rel="stylesheet" href="${ASSETS.criticalCss}">`,
    `  <link rel="stylesheet" href="${ASSETS.themeCss}">`,
    `  <link rel="stylesheet" href="${ASSETS.authCss}">`,
    `  <meta name="page-integrity-build" content="${BUILD}">`
  ].join('\n');

  if (html.includes('</head>')) html = html.replace('</head>', `${headInjection}\n</head>`);
  else html = `${headInjection}\n${html}`;

  const bodyInjection = [
    `  <script src="${ASSETS.integrityJs}"></script>`,
    `  <script src="${ASSETS.authJs}"></script>`
  ].join('\n');

  if (html.includes('</body>')) html = html.replace('</body>', `${bodyInjection}\n</body>`);
  else html += `\n${bodyInjection}`;

  if (/(?:class="[^"]*frm-shell|data-frm-module=)/i.test(html)) {
    html = html.replace(/<body([^>]*)>/i, (match, attrs) => {
      if (/class="[^"]*frm-polish-page/i.test(match)) return match;
      if (/class="/i.test(match)) return match.replace(/class="([^"]*)"/i, 'class="$1 frm-polish-page hnl-page-loading"');
      return `<body${attrs} class="frm-polish-page hnl-page-loading">`;
    });
  }

  if (html !== before) {
    write(file, html);
    report.changedPages += 1;
  }
}

function localAssetReferences(html) {
  const refs = [];
  const re = /<(?:link|script|img|source)[^>]+(?:href|src)=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = re.exec(html))) {
    const value = String(match[1] || '').trim();
    if (!value.startsWith('/') || value.startsWith('//')) continue;
    if (value.startsWith('/api/') || value.startsWith('/auth/')) continue;
    refs.push(value.split('?')[0].split('#')[0]);
  }
  return refs;
}

function auditLocalAssets(files) {
  const missing = new Set();
  files.forEach((file) => {
    const html = read(file);
    localAssetReferences(html).forEach((asset) => {
      const full = path.join(PUBLIC_DIR, asset.replace(/^\/+/, ''));
      if (!fs.existsSync(full)) missing.add(asset);
    });
  });
  report.missingLocalAssets = Array.from(missing).sort();
}

function insertUpdate() {
  let html = read(UPDATES_FILE);
  if (!html || html.includes('release-2026-07-18-page-integrity')) return;
  const card = `
          <article class="va-card va-update-card" id="release-2026-07-18-page-integrity">
            <span class="va-update-dot"></span>
            <div class="va-update-meta"><span>18/07/2026 • 21:28 BRT</span><span>Site</span><span>CSS/JS/Navegação</span></div>
            <h3>Integridade visual aplicada em todas as páginas</h3>
            <p class="va-muted">Todas as páginas agora recebem a mesma ordem de CSS e JavaScript depois dos patches, com fallback visual permanente e recuperação automática de estilos.</p>
            <ul class="va-update-list">
              <li class="fix">CSS crítico físico mantém sidebar, conteúdo, cards e responsividade utilizáveis mesmo se o tema principal atrasar.</li>
              <li class="fix">Referências duplicadas, antigas ou geradas de autenticação e identidade são removidas antes da versão canônica ser inserida.</li>
              <li class="site">A navegação entre páginas executa verificação de estilo e recupera folhas que falharem sem depender de recarregar o servidor.</li>
              <li class="fix">A auditoria percorre todos os HTMLs e lista assets locais ausentes, sem alterar jogadores, clubes, eventos ou qualquer dado vivo.</li>
            </ul>
          </article>`;
  if (html.includes('<article class="va-card va-update-card"')) html = html.replace('<article class="va-card va-update-card"', `${card}\n          <article class="va-card va-update-card"`);
  else if (html.includes('</main>')) html = html.replace('</main>', `${card}\n</main>`);
  else html += card;
  write(UPDATES_FILE, html);
}

ensureThemeAsset();
const pages = [...walkHtml(PAGES_DIR), path.join(PUBLIC_DIR, 'index.html')].filter(fs.existsSync);
pages.forEach(normalizePage);
auditLocalAssets(pages);
insertUpdate();
write(VERSION_FILE, JSON.stringify(report, null, 2));

console.log(changed
  ? `[Integrity] ${report.scannedPages} página(s) verificadas; ${report.changedPages} normalizada(s).`
  : `[Integrity] ${report.scannedPages} página(s) já estavam normalizadas.`);
if (report.missingLocalAssets.length) {
  console.warn('[Integrity] Assets locais ausentes:', report.missingLocalAssets.join(', '));
}
