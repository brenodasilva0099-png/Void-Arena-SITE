const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const pagesDir = path.join(ROOT, 'public', 'pages');
const coreApiFile = path.join(ROOT, 'public', 'js', 'core', 'api.js');
const assetsApiFile = path.join(ROOT, 'public', 'assets', 'api.js');
let changed = false;

const SUPPORT_LINK_HTML = '<a data-nav-key="suporte" href="/pages/suporte.html">🛟 Suporte</a>';

function writeIfChanged(file, before, after) {
  if (before === after) return false;
  fs.writeFileSync(file, after, 'utf8');
  changed = true;
  return true;
}

function patchNavArray(file) {
  if (!fs.existsSync(file)) return;
  const before = fs.readFileSync(file, 'utf8');
  if (before.includes("'suporte','/pages/suporte.html'") || before.includes("'suporte', '/pages/suporte.html'")) return;

  let after = before;
  const compactNeedle = "['pontuacao','placar','/pages/placar.html','🎮 Placar'],";
  const spacedNeedle = "['pontuacao', 'placar', '/pages/placar.html', '🎮 Placar'],";
  const compactInsert = compactNeedle + "['placar','suporte','/pages/suporte.html','🛟 Suporte'],";
  const spacedInsert = spacedNeedle + "['placar', 'suporte', '/pages/suporte.html', '🛟 Suporte'],";

  if (after.includes(compactNeedle)) after = after.replace(compactNeedle, compactInsert);
  else if (after.includes(spacedNeedle)) after = after.replace(spacedNeedle, spacedInsert);

  writeIfChanged(file, before, after);
}

function patchHtmlSidebar(file) {
  if (!fs.existsSync(file) || !file.endsWith('.html')) return;
  const before = fs.readFileSync(file, 'utf8');
  if (!before.includes('class="va-nav"') || before.includes('data-nav-key="suporte"')) return;

  let after = before;
  const placarRegex = /(<a\s+[^>]*data-nav-key=["']placar["'][^>]*>[^<]*<\/a>)/;
  const privacidadeRegex = /(<a\s+[^>]*data-nav-key=["']privacidade["'][^>]*>[^<]*<\/a>)/;
  const termosRegex = /(<a\s+[^>]*data-nav-key=["']termos["'][^>]*>[^<]*<\/a>)/;

  if (placarRegex.test(after)) after = after.replace(placarRegex, '$1\n    ' + SUPPORT_LINK_HTML);
  else if (privacidadeRegex.test(after)) after = after.replace(privacidadeRegex, SUPPORT_LINK_HTML + '\n    $1');
  else if (termosRegex.test(after)) after = after.replace(termosRegex, SUPPORT_LINK_HTML + '\n    $1');
  else after = after.replace('</nav>', '    ' + SUPPORT_LINK_HTML + '\n</nav>');

  writeIfChanged(file, before, after);
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

patchNavArray(coreApiFile);
patchNavArray(assetsApiFile);
walk(pagesDir).forEach(patchHtmlSidebar);

console.log(changed ? '[Suporte] Link de suporte garantido em todas as navegacoes.' : '[Suporte] Link de suporte ja estava global.');
