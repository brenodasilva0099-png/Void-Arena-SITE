const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const pagesDir = path.join(ROOT, 'public', 'pages');
const updatesFile = path.join(pagesDir, 'atualizacoes.html');
const versionFile = path.join(ROOT, 'public', 'league-version.json');
const cssFile = path.join(ROOT, 'public', 'css', 'federation-polish.css');
const jsFile = path.join(ROOT, 'public', 'js', 'core', 'federation-polish.js');
const BUILD = '2026-07-16-hollow-nexus-league-v1';
const RELEASE_ID = 'release-2026-07-16-hollow-nexus-league-v1';
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
function patchUpdates() {
  let html = read(updatesFile);
  if (!html) return;
  const card = String.raw`
          <article class="va-card va-update-card" id="release-2026-07-16-hollow-nexus-league-v1">
            <span class="va-update-dot"></span>
            <div class="va-update-meta"><span>16/07/2026 • 19:36 BRT</span><span>Site</span><span>Liga</span></div>
            <h3>Identidade alterada para Hollow Nexus League</h3>
            <p class="va-muted">O projeto deixou de se posicionar como federação e passa a usar identidade de liga organizadora de campeonatos, clubes e temporadas.</p>
            <ul class="va-update-list">
              <li class="site">FRM/Federação foi substituído por HNL/Hollow Nexus League na camada visual final.</li>
              <li class="site">Clubes Afiliados vira Clubes Participantes e Solicitar Afiliação vira Cadastrar Clube.</li>
              <li class="fix">O texto legal reforça que a liga é comunitária e independente, sem afiliação oficial com Rematch, Sloclap ou Kepler Interactive.</li>
              <li class="fix">Dados vivos, clubes, jogadores, eventos, ranking e inscrições foram preservados.</li>
            </ul>
          </article>
`;
  if (!html.includes(RELEASE_ID)) html = html.replace('<div class="va-timeline">', '<div class="va-timeline">' + card);
  html = rebrandHtml(html);
  write(updatesFile, html);
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
patchUpdates();
patchCss();
patchJs();
patchVersion();

console.log(changed ? '[Liga] Rebrand Hollow Nexus League aplicado.' : '[Liga] Rebrand Hollow Nexus League ja estava aplicado.');
