const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const updatesFile = path.join(root, 'public', 'pages', 'atualizacoes.html');
const versionFile = path.join(root, 'public', 'league-experience-final.json');
const releaseId = 'release-2026-07-18-league-experience-final';
let changed = false;

function read(file) { return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''; }
function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (read(file) !== content) { fs.writeFileSync(file, content, 'utf8'); changed = true; }
}

let html = read(updatesFile);
if (html && !html.includes(releaseId)) {
  const card = `<article class="va-card va-update-card" id="${releaseId}"><span class="va-update-dot"></span><div class="va-update-meta"><span>18/07/2026 • 23:08 BRT</span><span>Site + Bot</span><span>Vistoria final</span></div><h3>Experiência da liga revisada em conjunto</h3><p class="va-muted">Menus, perfis públicos, gestão de clubes, recrutamento, rankings, calendário, competições e prancheta receberam uma camada única e compatível com os dados atuais.</p><ul class="va-update-list"><li class="site">Topo reduzido às áreas principais e links institucionais movidos ao rodapé.</li><li class="site">Perfis de jogadores e clubes passaram a conectar elenco, cargos, conexões e responsáveis.</li><li class="fix">Clubes antigos sem IDs podem recuperar a gestão por correspondência restrita do responsável.</li><li class="site">Café com Leite, calendário, competição detalhada, transferências e prancheta ganharam fluxos próprios.</li><li class="fix">Nexus Cup marcada para 25/07/2026 às 19:30 e Café com Leite para 26/07/2026 às 00:00.</li><li class="fix">Os registros vivos existentes foram preservados.</li></ul></article>`;
  if (html.includes('<article class="va-card va-update-card"')) html = html.replace('<article class="va-card va-update-card"', `${card}\n<article class="va-card va-update-card"`);
  else if (html.includes('</main>')) html = html.replace('</main>', `${card}\n</main>`);
  else html += card;
  write(updatesFile, html);
}

write(versionFile, JSON.stringify({
  build: '2026-07-18-league-experience-final-v1',
  nexusCupAt: '2026-07-25T19:30:00-03:00',
  cafeComLeiteAt: '2026-07-26T00:00:00-03:00',
  liveDataPreserved: true,
  updatedAt: '2026-07-18T23:08:00-03:00'
}, null, 2));

console.log(changed ? '[League/Experience] Vistoria final registrada.' : '[League/Experience] Vistoria final ja registrada.');
