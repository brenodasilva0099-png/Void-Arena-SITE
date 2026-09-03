const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const PAGES = path.join(ROOT, 'public', 'pages');
const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

const required = {
  'dashboard.html': ['hn4-home', 'HNL', 'SEASON 01'],
  'eventos.html': ['hn4-page', '<h1>Competições</h1>'],
  'times.html': ['hn4-page', '<h1>Clubes</h1>'],
  'jogadores.html': ['hn4-page', '<h1>Jogadores</h1>'],
  'rankings.html': ['hn4-page', '<h1>Rankings</h1>'],
  'resultados.html': ['hn4-page', '<h1>Partidas</h1>']
};

const forbiddenByFile = {
  'eventos.html': ['Eventos Comunitários'],
  'times.html': ['Clubes Participantes'],
  'jogadores.html': ['Jogadores Registrados'],
  'rankings.html': ['Rankings da Liga']
};

const failures = [];
for (const [fileName, markers] of Object.entries(required)) {
  const file = path.join(PAGES, fileName);
  if (!fs.existsSync(file)) {
    failures.push(`${fileName}: arquivo canônico ausente`);
    continue;
  }
  const html = fs.readFileSync(file, 'utf8');
  for (const marker of markers) {
    if (!html.includes(marker)) failures.push(`${fileName}: marcador V4 ausente ${marker}`);
  }
  for (const forbidden of forbiddenByFile[fileName] || []) {
    if (html.includes(forbidden)) failures.push(`${fileName}: conteúdo visual legado reapareceu (${forbidden})`);
  }
}

const start = String(packageJson.scripts?.start || '');
if (start !== 'node server/bootSite.js') {
  failures.push(`package.json: produção deve iniciar somente pelo bootSite.js; encontrado "${start}"`);
}

if (failures.length) {
  console.error('[Hollow Nexus V4 Source Audit] Falhas:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`[Hollow Nexus V4 Source Audit] ${Object.keys(required).length} páginas canônicas protegidas antes dos patches legados; start de produção não executa checks mutáveis.`);
