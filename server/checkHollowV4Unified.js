const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const PAGES = path.join(PUBLIC, 'pages');

require('./patchHollowNexusV4UnifiedRuntime');

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
const htmlFiles = walkHtml(PUBLIC);
const requiredAssets = ['/css/hollow-v4-unified.css', '/js/core/hollow-v4-unified.js'];
const forbiddenVisible = ['Void Arena', 'Federação Hollow Nexus', 'Correios da Arena'];

for (const file of htmlFiles) {
  const html = read(file);
  const relative = path.relative(ROOT, file).replaceAll(path.sep, '/');
  if (!/class=["'][^"']*hn4-unified-page/i.test(html)) failures.push(`${relative}: classe hn4-unified-page ausente`);
  for (const asset of requiredAssets) {
    if (!html.includes(asset)) failures.push(`${relative}: asset V4 final ausente ${asset}`);
  }
  for (const forbidden of forbiddenVisible) {
    if (html.includes(forbidden)) failures.push(`${relative}: branding legado visível (${forbidden})`);
  }
}

const boot = read(path.join(ROOT, 'server', 'bootSite.js'));
const homeIndex = boot.indexOf("require('./patchHollowNexusV3CanonicalRuntime')");
const unifiedIndex = boot.indexOf("require('./patchHollowNexusV4UnifiedRuntime')");
if (homeIndex < 0 || unifiedIndex < 0 || unifiedIndex <= homeIndex) {
  failures.push('server/bootSite.js: a camada V4 unificada precisa rodar depois da Home canônica');
}

const packageJson = JSON.parse(read(path.join(ROOT, 'package.json')) || '{}');
if (packageJson.scripts?.start !== 'node server/bootSite.js') {
  failures.push('package.json: start de produção voltou a executar checks mutáveis antes do boot');
}

const unifiedJs = read(path.join(PUBLIC, 'js', 'core', 'hollow-v4-unified.js'));
for (const marker of ['hn4-mega-menu', 'hn4-global-footer', 'hn4-context-line', 'Explorar toda a plataforma']) {
  if (!unifiedJs.includes(marker)) failures.push(`hollow-v4-unified.js: recurso ausente ${marker}`);
}

const unifiedCss = read(path.join(PUBLIC, 'css', 'hollow-v4-unified.css'));
for (const marker of ['hn4-mega-menu', 'hn4-global-footer', 'hn4-unified-secondary', 'legacy-sidebar']) {
  if (!unifiedCss.includes(marker)) failures.push(`hollow-v4-unified.css: estilo ausente ${marker}`);
}

const mainPages = ['eventos.html', 'times.html', 'jogadores.html', 'rankings.html', 'resultados.html'];
for (const fileName of mainPages) {
  const html = read(path.join(PAGES, fileName));
  if (!html) failures.push(`public/pages/${fileName}: página principal ausente após auditoria`);
}

if (failures.length) {
  console.error('[Hollow Nexus V4 Unified Audit] Falhas:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`[Hollow Nexus V4 Unified Audit] ${htmlFiles.length} página(s) cobertas pela camada final; menu Mais, rodapé, branding, ordem do boot e start de produção: OK.`);
