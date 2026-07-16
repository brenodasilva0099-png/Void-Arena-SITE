const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const pagesDir = path.join(ROOT, 'public', 'pages');
const versionFile = path.join(ROOT, 'public', 'league-version.json');
const cssFile = path.join(ROOT, 'public', 'css', 'federation-polish.css');
const jsFile = path.join(ROOT, 'public', 'js', 'core', 'federation-polish.js');
const BUILD = '2026-07-16-hollow-nexus-league-v1';
let changed = false;

function read(file) { return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''; }
function write(file, content) { fs.mkdirSync(path.dirname(file), { recursive: true }); if (read(file) !== content) { fs.writeFileSync(file, content, 'utf8'); changed = true; } }
function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : (entry.isFile() && entry.name.endsWith('.html') ? [full] : []);
  });
}
function replaceAll(text, from, to) { return text.split(from).join(to); }
function rebrandHtml(html) {
  const replacements = [
    ['the HOLLOW NEXUS FRM', 'the HOLLOW NEXUS LEAGUE'],
    ['the HOLLOW NEXUS <span class="frm-accent">FRM</span>', 'the HOLLOW NEXUS <span class="frm-accent">LEAGUE</span>'],
    ['HOLLOW NEXUS <span>FRM</span>', 'HOLLOW NEXUS <span>LEAGUE</span>'],
    ['Hollow Nexus FRM', 'Hollow Nexus League'],
    ['HOLLOW NEXUS FRM', 'HOLLOW NEXUS LEAGUE'],
    ['The Hollow Nexus FRM', 'The Hollow Nexus League'],
    ['FRM', 'HNL'],
    ['Federação Comunitária de Rematch', 'Liga comunitária de Rematch'],
    ['Federação Comunitária', 'Liga Comunitária'],
    ['Federação comunitária', 'Liga comunitária'],
    ['Federação', 'Liga'],
    ['federação', 'liga'],
    ['Sobre a Liga', 'Sobre a Liga'],
    ['Status da Liga', 'Status da Liga'],
    ['Clubes Afiliados', 'Clubes Participantes'],
    ['clubes afiliados', 'clubes participantes'],
    ['Solicitar Afiliação', 'Cadastrar Clube'],
    ['Solicitar afiliação', 'Cadastrar clube'],
    ['Afiliação', 'Cadastro de Clube'],
    ['afiliação', 'cadastro de clube'],
    ['Atletas Registrados', 'Jogadores Registrados'],
    ['Atletas registrados', 'Jogadores registrados'],
    ['Atletas', 'Jogadores'],
    ['atletas', 'jogadores']
  ];
  let out = html;
  replacements.forEach(([from, to]) => { out = replaceAll(out, from, to); });
  out = out.replace(/<meta name="frm-build" content="[^"]*"\/>/, '<meta name="league-build" content="' + BUILD + '"/>');
  if (!out.includes('league-build') && out.includes('</head>')) out = out.replace('</head>', '  <meta name="league-build" content="' + BUILD + '"/>\n</head>');
  out = out.replace(/Projeto comunitário independente\. Não afiliado, patrocinado ou endossado pela Sloclap, Kepler Interactive ou Rematch\./g, 'Liga comunitária independente. Não afiliada, patrocinada ou endossada por Rematch, Sloclap ou Kepler Interactive.');
  out = out.replace(/Projeto comunitário independente\. Não afiliado, patrocinado ou endossado por Rematch, Sloclap ou Kepler Interactive\./g, 'Liga comunitária independente. Não afiliada, patrocinada ou endossada por Rematch, Sloclap ou Kepler Interactive.');
  return out;
}
function patchPage(file) {
  const html = read(file);
  if (!html) return;
  const next = rebrandHtml(html);
  if (next !== html) write(file, next);
}

function patchCss() {
  let css = read(cssFile);
  const block = '\n/* HNL league rebrand v1 */\n.frm-brand strong::after{content:""}.frm-tag{letter-spacing:.08em}.frm-league-note{color:var(--frm-muted);font-size:13px}.frm-page-hero h1 .frm-the{text-transform:none}.frm-footer .frm-socials span{color:#fff}\n';
  if (!css.includes('HNL league rebrand v1')) css += block;
  write(cssFile, css);
}
function patchJs() {
  let js = read(jsFile);
  if (!js) return;
  js = js.replace(/Hollow Nexus FRM/g, 'Hollow Nexus League')
    .replace(/HOLLOW NEXUS FRM/g, 'HOLLOW NEXUS LEAGUE')
    .replace(/Federação/g, 'Liga')
    .replace(/federação/g, 'liga')
    .replace(/Clubes Afiliados/g, 'Clubes Participantes')
    .replace(/Solicitar Afiliação/g, 'Cadastrar Clube')
    .replace(/Atletas/g, 'Jogadores')
    .replace(/atletas/g, 'jogadores')
    .replace(/frm-polish-full-safe-v2/g, 'hollow-nexus-league-v1');
  write(jsFile, js);
}
function patchVersion() {
  write(versionFile, JSON.stringify({
    build: BUILD,
    layer: 'hollow-nexus-league',
    brand: 'the HOLLOW NEXUS LEAGUE',
    acronym: 'HNL',
    positioning: 'Liga comunitária de Rematch para clubes, competições e temporadas.',
    updatedAt: '2026-07-16T19:36:00-03:00'
  }, null, 2));
}

walk(pagesDir).forEach(patchPage);
patchCss();
patchJs();
patchVersion();

console.log(changed ? '[Liga] Rebrand Hollow Nexus League aplicado.' : '[Liga] Rebrand Hollow Nexus League ja estava aplicado.');
