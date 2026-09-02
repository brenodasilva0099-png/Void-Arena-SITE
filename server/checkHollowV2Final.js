const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const PAGES = path.join(PUBLIC, 'pages');

require('./patchHollowNexusV2Runtime');

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

const failures = [];
const requiredAssets = [
  '/css/hollow-v2-runtime.css',
  '/css/hollow-v2-final.css',
  '/css/hollow-v2-audit-fixes.css',
  '/js/core/hollow-v2-runtime.js',
  '/js/core/hollow-v2-final.js',
  '/js/core/hollow-v2-audit-fixes.js'
];

const htmlFiles = walkHtml(PUBLIC);
for (const file of htmlFiles) {
  const html = read(file);
  const relative = path.relative(ROOT, file).replaceAll(path.sep, '/');
  for (const asset of requiredAssets) {
    if (!html.includes(asset)) failures.push(`${relative}: camada V2 ausente ${asset}`);
  }
}

const aliases = {
  'competicoes.html': '/pages/eventos.html',
  'clubes.html': '/pages/times.html',
  'atletas.html': '/pages/jogadores.html',
  'partidas.html': '/pages/resultados.html',
  'cafe-com-leite.html': '/pages/placar.html',
  'administracao.html': '/pages/painel-completo.html'
};
for (const [fileName, target] of Object.entries(aliases)) {
  const html = read(path.join(PAGES, fileName));
  if (!html.includes(`location.replace(${JSON.stringify(target)})`)) {
    failures.push(`public/pages/${fileName}: alias não aponta para ${target}`);
  }
}

const fixesJs = read(path.join(PUBLIC, 'js', 'core', 'hollow-v2-audit-fixes.js'));
for (const marker of [
  '/api/access/me',
  '/api/notifications',
  'hn2-notifications',
  'data-hn-access-key',
  'hn2-access-denied',
  'HOLLOW NEXUS LEAGUE'
]) {
  if (!fixesJs.includes(marker)) failures.push(`hollow-v2-audit-fixes.js: recurso ausente ${marker}`);
}

const fixesCss = read(path.join(PUBLIC, 'css', 'hollow-v2-audit-fixes.css'));
for (const marker of ['hn-v2-login', 'hn2-notifications', 'hn2-access-denied', 'hn2-avatar-dot img']) {
  if (!fixesCss.includes(marker)) failures.push(`hollow-v2-audit-fixes.css: estilo ausente ${marker}`);
}

const api = read(path.join(PUBLIC, 'js', 'core', 'api.js'));
for (const forbidden of [
  '© 2026 Void Arena / Hollow Nexus.',
  "first.title||'Void Arena'",
  'Correios da Arena',
  '📰 Atualizações',
  '👤 Jogadores',
  '🤝 Recrutamento',
  '🏅 Pontuação',
  '🎮 Placar',
  '🔐 Privacidade'
]) {
  if (api.includes(forbidden)) failures.push(`public/js/core/api.js: branding/ícone legado ainda visível ${forbidden}`);
}

const index = read(path.join(PUBLIC, 'index.html'));
for (const forbidden of ['Hollow Nexus Tournament', 'Perfil Void Arena']) {
  if (index.includes(forbidden)) failures.push(`public/index.html: branding antigo ainda presente ${forbidden}`);
}

if (failures.length) {
  console.error('[Hollow Nexus V2 Final Audit] Falhas:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`[Hollow Nexus V2 Final Audit] ${htmlFiles.length} página(s) cobertas, aliases, acesso, notificações, login e branding: OK.`);
