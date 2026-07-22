const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const pageFile = path.join(ROOT, 'public', 'pages', 'prancheta-tatica.html');
const versionFile = path.join(ROOT, 'public', 'tactical-simulator-version.json');
const BUILD = '2026-07-22-tactical-simulator-v6';
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
    /Monte a formação[^<]*ataque\./,
    'Monte a formação, escolha jogadores do site ou servidor, encadeie passes, finalize e controle a reação do goleiro.'
  );
  write(pageFile, page);
}

write(versionFile, JSON.stringify({
  build: BUILD,
  updatedAt: '2026-07-22T17:20:00-03:00',
  fixes: ['automatic-pass-receiver', 'goalkeeper-role-fallback', 'missing-ball-recovery', 'preflight-sequence-validation', 'chained-sentence-parser'],
  features: ['automatic-field-focus', 'playback-countdown', 'quick-tutorial', 'interpretation-feedback', 'manual-sequence-builder', 'natural-language-parser', 'local-playbook', 'goalkeeper-ai-levels', 'goalkeeper-side-priority', 'manual-goalkeeper-defense', 'isolated-goalkeeper-test']
}, null, 2));

console.log(changed
  ? '[Tactical Simulator] Simulador v6 aplicado com inteligência, direção e teste de defesa do goleiro.'
  : '[Tactical Simulator] Simulador v6 já estava aplicado.');
