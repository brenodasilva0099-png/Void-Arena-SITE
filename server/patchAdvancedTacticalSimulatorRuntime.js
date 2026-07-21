const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const pageFile = path.join(ROOT, 'public', 'pages', 'prancheta-tatica.html');
const updatesFile = path.join(ROOT, 'public', 'pages', 'atualizacoes.html');
const versionFile = path.join(ROOT, 'public', 'tactical-simulator-version.json');
const BUILD = '2026-07-20-tactical-simulator-v2';
let changed = false;

function read(file) { return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''; }
function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (read(file) !== content) {
    fs.writeFileSync(file, content, 'utf8');
    changed = true;
  }
}

let page = read(pageFile);
if (page) {
  page = page
    .replace(/\s*<link[^>]+tactical-simulator-v2\.css[^>]*>/gi, '')
    .replace(/\s*<script[^>]+tactical-simulator-v2\.js[^>]*><\/script>/gi, '');
  const style = `<link rel="stylesheet" href="/css/tactical-simulator-v2.css?v=${BUILD}">`;
  const script = `<script src="/js/core/tactical-simulator-v2.js?v=${BUILD}"></script>`;
  page = page.includes('</head>') ? page.replace('</head>', `${style}\n</head>`) : `${style}\n${page}`;
  page = page.includes('</body>') ? page.replace('</body>', `${script}\n</body>`) : `${page}\n${script}`;
  page = page.replace(
    'Monte a formação com jogadores reais, mova a bola e simule a progressão de um ataque.',
    'Monte a formação, encadeie passes, escolha a finalização, controle o goleiro e transforme um roteiro em animação.'
  );
  write(pageFile, page);
}

let updates = read(updatesFile);
if (updates && !updates.includes('release-2026-07-20-tactical-simulator-v2')) {
  const card = `<article class="va-card va-update-card" id="release-2026-07-20-tactical-simulator-v2"><span class="va-update-dot"></span><div class="va-update-meta"><span>20/07/2026 • 19:19 BRT</span><span>Site</span><span>Prancheta Tática</span></div><h3>Prancheta transformada em simulador de jogadas</h3><p class="va-muted">O campo ganhou marcações completas e a formação passou a aceitar sequências com deslocamento, passe, passe alto, finalização, canto do chute e reação do goleiro.</p><ul class="va-update-list"><li class="site">Gols, áreas, meia-lua, escanteios e nove zonas de finalização foram redesenhados.</li><li class="site">Jogadas podem ser montadas ação por ação com jogadores já posicionados na prancheta.</li><li class="site">Um roteiro curto em português pode ser interpretado e convertido em uma linha do tempo animada.</li><li class="site">O goleiro pode escolher um canto, tentar a defesa e produzir resultado de gol ou defesa.</li><li class="fix">A formação antiga, os jogadores arrastáveis e o salvamento local foram preservados.</li></ul></article>`;
  updates = updates.includes('<article class="va-card va-update-card"')
    ? updates.replace('<article class="va-card va-update-card"', `${card}\n<article class="va-card va-update-card"`)
    : updates.replace('</main>', `${card}\n</main>`);
  write(updatesFile, updates);
}

write(versionFile, JSON.stringify({
  build: BUILD,
  updatedAt: '2026-07-20T19:19:00-03:00',
  features: ['full-field-markings', 'manual-sequence-builder', 'natural-language-parser', 'pass-animation', 'shot-targets', 'goalkeeper-reaction', 'local-playbook']
}, null, 2));

console.log(changed ? '[Tactical Simulator] Campo e simulador avançado aplicados.' : '[Tactical Simulator] Simulador avançado já estava aplicado.');
