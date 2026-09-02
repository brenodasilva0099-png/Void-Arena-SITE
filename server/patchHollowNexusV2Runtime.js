const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const PAGES = path.join(PUBLIC, 'pages');
const VERSION = '2026-09-02-7';
const CSS = `<link rel="stylesheet" href="/css/hollow-v2-runtime.css?v=${VERSION}">`;
const FINAL_CSS = `<link rel="stylesheet" href="/css/hollow-v2-final.css?v=${VERSION}">`;
const AUDIT_CSS = `<link rel="stylesheet" href="/css/hollow-v2-audit-fixes.css?v=${VERSION}">`;
const JS = `<script src="/js/core/hollow-v2-runtime.js?v=${VERSION}"></script>`;
const FINAL_JS = `<script src="/js/core/hollow-v2-final.js?v=${VERSION}"></script>`;
const AUDIT_JS = `<script src="/js/core/hollow-v2-audit-fixes.js?v=${VERSION}"></script>`;

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
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

function redirectHtml(target, label) {
  return `<!doctype html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<meta http-equiv="refresh" content="0;url=${target}">\n<title>${label} | Hollow Nexus</title>\n<style>html,body{margin:0;min-height:100%;background:#04050a;color:#fff;font-family:system-ui,sans-serif}body{display:grid;place-items:center}.box{padding:24px;text-align:center}a{color:#b878ff}</style>\n</head>\n<body><div class="box">Abrindo a versão atual de <strong>${label}</strong>…<br><a href="${target}">Continuar</a></div><script>location.replace(${JSON.stringify(target)});</script></body>\n</html>\n`;
}

const CANONICAL_ALIASES = {
  'competicoes.html': ['/pages/eventos.html', 'Competições'],
  'clubes.html': ['/pages/times.html', 'Clubes'],
  'atletas.html': ['/pages/jogadores.html', 'Jogadores'],
  'partidas.html': ['/pages/resultados.html', 'Partidas'],
  'cafe-com-leite.html': ['/pages/placar.html', 'Café com Leite'],
  'administracao.html': ['/pages/painel-completo.html', 'Administração']
};
for (const [fileName, [target, label]] of Object.entries(CANONICAL_ALIASES)) {
  write(path.join(PAGES, fileName), redirectHtml(target, label));
}

function polishLegacyVisibleStrings() {
  const apiFile = path.join(PUBLIC, 'js', 'core', 'api.js');
  let api = read(apiFile);
  if (api) {
    api = api
      .replace('© 2026 Void Arena / Hollow Nexus.', '© 2026 Hollow Nexus League.')
      .replace("first.title||'Void Arena'", "first.title||'Hollow Nexus'")
      .replaceAll('Correios da Arena', 'Central de Notificações')
      .replaceAll('📰 Atualizações', 'Atualizações')
      .replaceAll('👤 Jogadores', 'Jogadores')
      .replaceAll('🤝 Recrutamento', 'Recrutamento')
      .replaceAll('🏅 Pontuação', 'Pontuação')
      .replaceAll('🎮 Placar', 'Placar')
      .replaceAll('🔐 Privacidade', 'Privacidade');
    write(apiFile, api);
  }

  const indexFile = path.join(PUBLIC, 'index.html');
  let index = read(indexFile);
  if (index) {
    index = index
      .replaceAll('Hollow Nexus Tournament', 'Hollow Nexus League')
      .replaceAll('alt="Perfil Void Arena"', 'alt="Hollow Nexus League"');
    write(indexFile, index);
  }
}
polishLegacyVisibleStrings();

function upsertTag(html, pattern, tag, closingTag) {
  if (pattern.test(html)) return html.replace(pattern, tag);
  return html.includes(closingTag) ? html.replace(closingTag, `  ${tag}\n${closingTag}`) : `${tag}\n${html}`;
}

function inject(file) {
  let html = read(file);
  if (!html) return false;

  const cssPattern = /<link[^>]+href=["']\/css\/hollow-v2-runtime\.css(?:\?[^"']*)?["'][^>]*>/i;
  const finalCssPattern = /<link[^>]+href=["']\/css\/hollow-v2-final\.css(?:\?[^"']*)?["'][^>]*>/i;
  const auditCssPattern = /<link[^>]+href=["']\/css\/hollow-v2-audit-fixes\.css(?:\?[^"']*)?["'][^>]*>/i;
  const jsPattern = /<script[^>]+src=["']\/js\/core\/hollow-v2-runtime\.js(?:\?[^"']*)?["'][^>]*><\/script>/i;
  const finalJsPattern = /<script[^>]+src=["']\/js\/core\/hollow-v2-final\.js(?:\?[^"']*)?["'][^>]*><\/script>/i;
  const auditJsPattern = /<script[^>]+src=["']\/js\/core\/hollow-v2-audit-fixes\.js(?:\?[^"']*)?["'][^>]*><\/script>/i;

  html = upsertTag(html, cssPattern, CSS, '</head>');
  html = upsertTag(html, finalCssPattern, FINAL_CSS, '</head>');
  html = upsertTag(html, auditCssPattern, AUDIT_CSS, '</head>');
  html = upsertTag(html, jsPattern, JS, '</body>');
  html = upsertTag(html, finalJsPattern, FINAL_JS, '</body>');
  html = upsertTag(html, auditJsPattern, AUDIT_JS, '</body>');

  write(file, html);
  return true;
}

const TARGETS = listHtmlFiles(PUBLIC).sort();
const applied = TARGETS.filter(inject);
const relative = applied.map(file => path.relative(PUBLIC, file).replaceAll(path.sep, '/'));

console.log(`[Hollow Nexus v2] camada final aplicada em ${applied.length}/${TARGETS.length} páginas HTML.`);
console.log(`[Hollow Nexus v2] aliases canônicos: ${Object.keys(CANONICAL_ALIASES).join(', ')}`);
console.log(`[Hollow Nexus v2] páginas: ${relative.join(', ')}`);

module.exports = { TARGETS, applied, VERSION, CANONICAL_ALIASES };
