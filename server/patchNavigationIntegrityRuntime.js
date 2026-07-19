const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const PAGES_DIR = path.join(PUBLIC_DIR, 'pages');
const VERSION_FILE = path.join(PUBLIC_DIR, 'navigation-integrity.json');
const BUILD = '2026-07-18-navigation-integrity-v1';

const ALIASES = new Map([
  ['/', '/pages/dashboard.html'],
  ['/index.html', '/pages/dashboard.html'],
  ['/pages/times.html', '/pages/clubes.html'],
  ['/pages/jogadores.html', '/pages/atletas.html'],
  ['/pages/recrutamento.html', '/pages/mercado.html'],
  ['/pages/home.html', '/pages/dashboard.html']
]);

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (read(file) !== content) fs.writeFileSync(file, content, 'utf8');
}

function walkHtml(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkHtml(full);
    return entry.isFile() && entry.name.toLowerCase().endsWith('.html') ? [full] : [];
  });
}

function splitReference(value = '') {
  const raw = String(value || '').trim();
  const hashIndex = raw.indexOf('#');
  const queryIndex = raw.indexOf('?');
  const indexes = [hashIndex, queryIndex].filter((index) => index >= 0);
  const cut = indexes.length ? Math.min(...indexes) : raw.length;
  return { pathname: raw.slice(0, cut), suffix: raw.slice(cut) };
}

function localPagePath(value = '', currentFile = '') {
  const raw = String(value || '').trim();
  if (!raw || raw.startsWith('#') || /^(?:https?:|mailto:|tel:|javascript:|data:)/i.test(raw)) return '';
  const { pathname } = splitReference(raw);
  if (!pathname) return '';
  if (pathname.startsWith('/')) return pathname;
  const currentPublicPath = `/${path.relative(PUBLIC_DIR, currentFile).replace(/\\/g, '/')}`;
  try { return new URL(pathname, `https://local.invalid${currentPublicPath}`).pathname; }
  catch { return ''; }
}

function normalizeLinks(file) {
  let html = read(file);
  if (!html) return { links: 0, changed: 0 };
  let links = 0;
  let changed = 0;

  html = html.replace(/(<a\b[^>]*\bhref=["'])([^"']+)(["'][^>]*>)/gi, (match, start, href, end) => {
    links += 1;
    const { pathname, suffix } = splitReference(href);
    const replacement = ALIASES.get(pathname);
    if (!replacement || replacement === pathname) return match;
    changed += 1;
    return `${start}${replacement}${suffix}${end}`;
  });

  if (changed) write(file, html);
  return { links, changed };
}

function auditTargets(files) {
  const missing = new Set();
  let links = 0;

  for (const file of files) {
    const html = read(file);
    const re = /<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi;
    let match;
    while ((match = re.exec(html))) {
      links += 1;
      const target = localPagePath(match[1], file);
      if (!target || target.startsWith('/api/') || target.startsWith('/auth/')) continue;
      if (!target.endsWith('.html') && target !== '/') continue;
      const mapped = ALIASES.get(target) || target;
      const full = path.join(PUBLIC_DIR, mapped.replace(/^\/+/, ''));
      if (!fs.existsSync(full)) missing.add(mapped);
    }
  }

  return { links, missingTargets: Array.from(missing).sort() };
}

const files = [...walkHtml(PAGES_DIR), path.join(PUBLIC_DIR, 'index.html')].filter(fs.existsSync);
let changedLinks = 0;
let scannedLinks = 0;
files.forEach((file) => {
  const result = normalizeLinks(file);
  changedLinks += result.changed;
  scannedLinks += result.links;
});
const audit = auditTargets(files);

write(VERSION_FILE, JSON.stringify({
  build: BUILD,
  scannedPages: files.length,
  scannedLinks: Math.max(scannedLinks, audit.links),
  changedLinks,
  missingTargets: audit.missingTargets,
  aliases: Object.fromEntries(ALIASES),
  updatedAt: '2026-07-18T21:41:00-03:00'
}, null, 2));

console.log(`[Navigation] ${files.length} página(s), ${Math.max(scannedLinks, audit.links)} link(s), ${changedLinks} alias(es) corrigido(s).`);
if (audit.missingTargets.length) console.warn('[Navigation] Destinos ausentes:', audit.missingTargets.join(', '));
