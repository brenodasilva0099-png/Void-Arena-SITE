const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const PAGES = path.join(ROOT, 'public', 'pages');
const CSS = '<link rel="stylesheet" href="/css/hollow-v2-runtime.css?v=2026-09-02-1">';
const JS = '<script src="/js/core/hollow-v2-runtime.js?v=2026-09-02-1"></script>';

const TARGETS = [
  'dashboard.html',
  'competicoes.html',
  'clubes.html',
  'atletas.html',
  'rankings.html',
  'resultados.html'
];

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function write(file, content) {
  if (read(file) !== content) fs.writeFileSync(file, content, 'utf8');
}

function inject(fileName) {
  const file = path.join(PAGES, fileName);
  let html = read(file);
  if (!html) return false;

  if (!html.includes('/css/hollow-v2-runtime.css')) {
    html = html.includes('</head>') ? html.replace('</head>', `${CSS}\n</head>`) : `${CSS}\n${html}`;
  }
  if (!html.includes('/js/core/hollow-v2-runtime.js')) {
    html = html.includes('</body>') ? html.replace('</body>', `${JS}\n</body>`) : `${html}\n${JS}`;
  }

  write(file, html);
  return true;
}

const applied = TARGETS.filter(inject);
console.log(`[Hollow Nexus v2] camada final aplicada em ${applied.length}/${TARGETS.length} páginas: ${applied.join(', ')}`);

module.exports = { TARGETS, applied };
