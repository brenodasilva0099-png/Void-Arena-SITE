const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const PAGES_DIR = path.join(PUBLIC_DIR, 'pages');
const VERSION_FILE = path.join(PUBLIC_DIR, 'page-integrity.json');
const BUILD = '2026-07-19-page-integrity-v3';

let changed = false;
const report = {
  build: BUILD,
  scannedPages: 0,
  changedPages: 0,
  experiencePages: 0,
  legacyPages: 0,
  generatedAssets: [],
  missingLocalAssets: [],
  duplicateAssetsRemoved: 0,
  updatedAt: '2026-07-19T10:12:00-03:00'
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

function ensureCopiedAsset(target, source, publicPath) {
  if (fs.existsSync(target) || !fs.existsSync(source)) return;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  report.generatedAssets.push(publicPath);
  changed = true;
}

function ensureThemeAssets() {
  ensureCopiedAsset(
    path.join(PUBLIC_DIR, 'css', 'league-polish.css'),
    path.join(PUBLIC_DIR, 'css', 'federation-polish.css'),
    '/css/league-polish.css'
  );
  ensureCopiedAsset(
    path.join(PUBLIC_DIR, 'js', 'core', 'league-polish.js'),
    path.join(PUBLIC_DIR, 'js', 'core', 'federation-polish.js'),
    '/js/core/league-polish.js'
  );
}

function removeTags(html, pattern) {
  let removed = 0;
  const next = html.replace(pattern, () => {
    removed += 1;
    return '';
  });
  report.duplicateAssetsRemoved += Math.max(0, removed - 1);
  return next;
}

function isExperiencePage(html = '') {
  return /(?:data-hnl-module|league-experience\.js|league-experience\.css)/i.test(html);
}

function normalizePage(file) {
  let html = read(file);
  if (!html) return;
  const before = html;
  const experience = isExperiencePage(html);
  report.scannedPages += 1;
  if (experience) report.experiencePages += 1;
  else report.legacyPages += 1;

  html = html
    .replace(/\/css\/federation-polish\.css(?:\?[^"']*)?/gi, '/css/league-polish.css')
    .replace(/\/js\/core\/federation-polish\.js(?:\?[^"']*)?/gi, '/js/core/league-polish.js')
    .replace(/\/api\/federation\//gi, '/api/league/')
    .replace(/\/api\/federation\b/gi, '/api/league')
    .replace(/\/assets\/logo\.png/gi, '/assets/hollow-nexus-official.svg')
    .replace(/\/assets\/hollow-nexus-official-brand(?:\?[^"']*)?/gi, '/assets/hollow-nexus-official.svg');

  html = removeTags(html, /\s*<script[^>]+(?:discord-brand-sync|discord-auth-avatar|federation-portal|federation-polish|federation-no-mock|league-polish|league-experience|league-page-integrity|league-auth-ui)\.js[^>]*><\/script>/gi);
  html = removeTags(html, /\s*<link[^>]+(?:discord-auth-avatar|federation-polish|league-critical|league-polish|league-experience|league-auth-ui)\.css[^>]*>/gi);
  html = html.replace(/\s*<meta name="page-integrity-build"[^>]*>/gi, '');

  const styles = [
    `/css/league-critical.css?v=${BUILD}`,
    `/css/league-polish.css?v=${BUILD}`,
    ...(experience ? [`/css/league-experience.css?v=${BUILD}`] : []),
    `/css/league-auth-ui.css?v=${BUILD}`
  ];
  const scripts = [
    ...(experience ? [`/js/core/league-experience.js?v=${BUILD}`] : [`/js/core/league-polish.js?v=${BUILD}`]),
    `/js/core/league-auth-ui.js?v=${BUILD}`,
    `/js/core/league-page-integrity.js?v=${BUILD}`
  ];

  const headInjection = [
    ...styles.map((href) => `  <link rel="stylesheet" href="${href}">`),
    `  <meta name="page-integrity-build" content="${BUILD}">`
  ].join('\n');
  if (html.includes('</head>')) html = html.replace('</head>', `${headInjection}\n</head>`);
  else html = `${headInjection}\n${html}`;

  const bodyInjection = scripts.map((src) => `  <script src="${src}"></script>`).join('\n');
  if (html.includes('</body>')) html = html.replace('</body>', `${bodyInjection}\n</body>`);
  else html += `\n${bodyInjection}`;

  if (/(?:class="[^"]*frm-shell|data-frm-module=|data-hnl-module=)/i.test(html)) {
    html = html.replace(/<body([^>]*)>/i, (match, attrs) => {
      if (/class="[^"]*frm-polish-page/i.test(match)) return match;
      if (/class="/i.test(match)) return match.replace(/class="([^"]*)"/i, 'class="$1 frm-polish-page"');
      return `<body${attrs} class="frm-polish-page">`;
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
    localAssetReferences(read(file)).forEach((asset) => {
      const full = path.join(PUBLIC_DIR, asset.replace(/^\/+/, ''));
      if (!fs.existsSync(full)) missing.add(asset);
    });
  });
  report.missingLocalAssets = Array.from(missing).sort();
}

ensureThemeAssets();
const pages = [...walkHtml(PAGES_DIR), path.join(PUBLIC_DIR, 'index.html')].filter(fs.existsSync);
pages.forEach(normalizePage);
auditLocalAssets(pages);
write(VERSION_FILE, JSON.stringify(report, null, 2));

console.log(changed
  ? `[Integrity] ${report.scannedPages} página(s) verificadas; ${report.changedPages} normalizada(s), sem misturar runtime novo e legado.`
  : `[Integrity] ${report.scannedPages} página(s) já estavam normalizadas.`);
if (report.missingLocalAssets.length) console.warn('[Integrity] Assets locais ausentes:', report.missingLocalAssets.join(', '));
