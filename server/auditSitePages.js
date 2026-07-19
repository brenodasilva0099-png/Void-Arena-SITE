const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const PAGES_DIR = path.join(PUBLIC_DIR, 'pages');
const REQUIRED = [
  '/css/league-critical.css',
  '/css/league-polish.css',
  '/css/league-auth-ui.css',
  '/js/core/league-page-integrity.js',
  '/js/core/league-auth-ui.js'
];

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function walkHtml(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkHtml(full);
    return entry.isFile() && entry.name.toLowerCase().endsWith('.html') ? [full] : [];
  });
}

function refs(html) {
  const found = [];
  const re = /<(?:link|script|img|source)[^>]+(?:href|src)=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = re.exec(html))) found.push(String(match[1] || '').split('?')[0].split('#')[0]);
  return found;
}

function count(html, needle) {
  return html.split(needle).length - 1;
}

const files = [...walkHtml(PAGES_DIR), path.join(PUBLIC_DIR, 'index.html')].filter(fs.existsSync);
const failures = [];
const warnings = [];

for (const file of files) {
  const html = read(file);
  const relative = path.relative(ROOT, file).replace(/\\/g, '/');
  const isLeaguePage = /(?:frm-shell|data-frm-module|frm-polish-page)/i.test(html);

  if (isLeaguePage) {
    for (const required of REQUIRED) {
      if (!html.includes(required)) failures.push(`${relative}: referência obrigatória ausente ${required}`);
      if (count(html, required) > 1) failures.push(`${relative}: referência duplicada ${required}`);
    }
  }

  if (/discord-brand-sync\.js|discord-auth-avatar\.(?:js|css)/i.test(html)) {
    failures.push(`${relative}: asset transitório antigo ainda referenciado`);
  }

  for (const ref of refs(html)) {
    if (!ref.startsWith('/') || ref.startsWith('//') || ref.startsWith('/api/') || ref.startsWith('/auth/')) continue;
    const full = path.join(PUBLIC_DIR, ref.replace(/^\/+/, ''));
    if (!fs.existsSync(full)) warnings.push(`${relative}: asset local não encontrado ${ref}`);
  }
}

console.log(`[Page Audit] ${files.length} página(s) verificadas.`);
if (warnings.length) {
  console.warn('[Page Audit] Avisos:');
  warnings.forEach((item) => console.warn(`- ${item}`));
}
if (failures.length) {
  console.error('[Page Audit] Falhas:');
  failures.forEach((item) => console.error(`- ${item}`));
  process.exitCode = 1;
} else {
  console.log('[Page Audit] CSS/JS canônicos, duplicidade e referências antigas: OK.');
}
