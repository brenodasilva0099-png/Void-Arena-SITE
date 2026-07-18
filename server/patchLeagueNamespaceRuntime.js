const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const INDEX_FILE = path.join(ROOT, 'site', 'index.js');
const PUBLIC_DIR = path.join(ROOT, 'public');
const PAGES_DIR = path.join(PUBLIC_DIR, 'pages');
const FED_JS = path.join(PUBLIC_DIR, 'js', 'core', 'federation-polish.js');
const LEAGUE_JS = path.join(PUBLIC_DIR, 'js', 'core', 'league-polish.js');
const FED_CSS = path.join(PUBLIC_DIR, 'css', 'federation-polish.css');
const LEAGUE_CSS = path.join(PUBLIC_DIR, 'css', 'league-polish.css');
const UPDATES_FILE = path.join(PAGES_DIR, 'atualizacoes.html');
const VERSION_FILE = path.join(PUBLIC_DIR, 'league-namespace.json');
const BUILD = '2026-07-18-league-runtime-hotfix-v2';
const LOGO = '/api/brand/icon?v=' + BUILD;
let changed = false;

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (read(file) !== content) {
    fs.writeFileSync(file, content, 'utf8');
    changed = true;
  }
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : (entry.isFile() && entry.name.endsWith('.html') ? [full] : []);
  });
}

function patchIndex() {
  let src = read(INDEX_FILE);
  if (!src) return;

  if (!src.includes('registerLeagueRoutes')) {
    src = src.replace(
      "const { registerDiscordServerLinkRoutes } = require('../server/routes/discordServerLink.routes');",
      "const { registerDiscordServerLinkRoutes } = require('../server/routes/discordServerLink.routes');\nconst { registerLeagueRoutes } = require('../server/routes/league.routes');"
    );
    src = src.replace(
      'registerDiscordServerLinkRoutes(app);',
      'registerDiscordServerLinkRoutes(app);\nregisterLeagueRoutes(app);'
    );
  }

  write(INDEX_FILE, src);
}

function loginSetupSource() {
  return `async function setupTop(){
    const loginHref = '/auth/discord?next=%2Fpages%2Fperfil.html';
    const loginEls = Array.from(document.querySelectorAll('[data-frm-login],a[href="/pages/perfil.html"]'));

    loginEls.forEach((a) => {
      a.href = loginHref;
      a.dataset.discordLogin = '${BUILD}';
    });

    if (!document.documentElement.dataset.hnlLoginGuard) {
      document.documentElement.dataset.hnlLoginGuard = '${BUILD}';
      document.addEventListener('click', (event) => {
        const target = event.target && event.target.closest ? event.target.closest('[data-frm-login]') : null;
        if (!target || target.dataset.loggedIn === '1') return;
        event.preventDefault();
        event.stopImmediatePropagation();
        window.location.assign(loginHref);
      }, true);
    }

    let logged = false;
    try {
      const me = await api('/api/me');
      logged = true;
      const u = me.user || {};
      loginEls.forEach((a) => {
        a.href = '/pages/perfil.html';
        a.dataset.loggedIn = '1';
        a.innerHTML = '<img class="frm-profile-avatar" src="' + esc(img(u.avatar)) + '" alt="Perfil"/>';
        a.classList.remove('frm-btn');
        a.title = 'Abrir perfil';
      });
    } catch {}

    if (!logged) return;

    try {
      const n = await api('/api/notifications');
      Array.from(document.querySelectorAll('[data-frm-unread],[data-frm-mail]')).forEach((b) => {
        b.textContent = String(n.unread || 0);
      });
    } catch {}
  }`;
}

function cleanJs(js) {
  let out = js || '';
  out = out.replace(/\/api\/federation\//g, '/api/league/');
  out = out.replace(/\/api\/federation/g, '/api/league');
  out = out.replace(/Hollow Nexus FRM/g, 'Hollow Nexus League');
  out = out.replace(/Hollow Nexus Tournament/g, 'Hollow Nexus League');
  out = out.replace(/Federação Comunitária/g, 'Liga Comunitária');
  out = out.replace(/Federação/g, 'Liga');
  out = out.replace(/federação/g, 'liga');
  out = out.replace(/\bFRM\b/g, 'HNL');
  out = out.replace(/Atletas/g, 'Jogadores');
  out = out.replace(/Atleta/g, 'Jogador');
  out = out.replace(/atletas/g, 'jogadores');
  out = out.replace(/atleta/g, 'jogador');
  out = out.replace(/const logo = '[^']*';/, "const logo = '" + LOGO + "';");

  // A função de substituição preserva os dois cifrões do helper $$.
  // Usar uma string de substituição transformava $$ em $, causando loginEls.forEach is not a function.
  out = out.replace(/async function setupTop\(\)\{[\s\S]*?\n  \}/, () => loginSetupSource());

  if (!out.includes('HNL_LEAGUE_NAMESPACE')) {
    out += '\n/* HNL_LEAGUE_NAMESPACE ' + BUILD + ' */\n';
  }

  return out;
}

function balancedVisualCss() {
  return `
/* HNL visual balance ${BUILD} */
:root{
  --frm-bg:#080b16;
  --frm-card:#111827;
  --frm-card2:#172033;
  --frm-muted:#c2c8d6;
  --frm-line:rgba(255,255,255,.11);
}
body.frm-polish-page{
  background:
    radial-gradient(circle at 18% 0%,rgba(139,92,246,.22),transparent 36%),
    radial-gradient(circle at 82% 18%,rgba(59,130,246,.13),transparent 34%),
    linear-gradient(135deg,#080b16,#0c1120 48%,#11152a)!important;
}
.frm-sidebar{background:rgba(9,12,24,.96)!important}
.frm-main{background:linear-gradient(180deg,rgba(15,20,36,.42),rgba(8,11,22,.14))}
.frm-card,.frm-stat,.frm-footer,.frm-modal-panel{background:rgba(16,24,39,.92)!important}
.frm-page-hero{background:radial-gradient(circle at 84% 50%,rgba(139,92,246,.38),transparent 30%),linear-gradient(116deg,rgba(15,23,42,.97),rgba(31,22,58,.95))!important}
.frm-nav a{color:#e1e5ef}
.frm-card p,.frm-muted,.frm-footer p,.frm-footer a{color:#c2c8d6}
`;
}

function patchAssets() {
  const js = read(FED_JS);
  if (js) {
    const leagueJs = cleanJs(js);
    write(FED_JS, leagueJs);
    write(LEAGUE_JS, leagueJs);
  }

  const css = read(FED_CSS);
  if (css) {
    // Classes frm-* são identificadores técnicos usados no HTML.
    // Elas permanecem por compatibilidade; somente a identidade visível virou League/HNL.
    write(LEAGUE_CSS, css + balancedVisualCss());
  }
}

function patchHtml(file) {
  let html = read(file);
  if (!html) return;

  html = html.replace(/\/js\/core\/federation-polish\.js(\?[^"']*)?/g, '/js/core/league-polish.js?v=' + BUILD);
  html = html.replace(/\/js\/core\/league-polish\.js(\?[^"']*)?/g, '/js/core/league-polish.js?v=' + BUILD);
  html = html.replace(/\/css\/federation-polish\.css(\?[^"']*)?/g, '/css/league-polish.css?v=' + BUILD);
  html = html.replace(/\/css\/league-polish\.css(\?[^"']*)?/g, '/css/league-polish.css?v=' + BUILD);
  html = html.replace(/\/api\/federation\//g, '/api/league/');
  html = html.replace(/\/api\/federation/g, '/api/league');
  html = html.replace(/https:\/\/void-arena-site(?:-[a-z0-9]+)?\.onrender\.com/gi, 'https://hollow-nexus-league.onrender.com');
  html = html.replace(/Hollow Nexus FRM/g, 'Hollow Nexus League');
  html = html.replace(/Hollow Nexus Tournament/g, 'Hollow Nexus League');
  html = html.replace(/Federação Comunitária/g, 'Liga Comunitária');
  html = html.replace(/Federação/g, 'Liga');
  html = html.replace(/federação/g, 'liga');
  html = html.replace(/\bFRM\b/g, 'HNL');
  html = html.replace(/Atletas/g, 'Jogadores');
  html = html.replace(/Atleta/g, 'Jogador');
  html = html.replace(/atletas/g, 'jogadores');
  html = html.replace(/atleta/g, 'jogador');
  html = html.replace(/Afiliar Clube/g, 'Cadastrar Clube');
  html = html.replace(/Solicitar Afiliação/g, 'Cadastrar Clube');
  html = html.replace(/Clubes Afiliados/g, 'Clubes Participantes');
  html = html.replace(/data-frm-login\s+href="\/pages\/perfil\.html"/g, 'data-frm-login href="/auth/discord?next=%2Fpages%2Fperfil.html"');
  html = html.replace(/href="\/pages\/perfil\.html"\s+aria-label="Abrir perfil"/g, 'href="/auth/discord?next=%2Fpages%2Fperfil.html" aria-label="Entrar com Discord"');
  html = html.replace(/<link\s+rel="icon"[^>]*>/gi, '<link rel="icon" href="' + LOGO + '">');
  html = html.replace(/src="(?:\/assets\/hollow-nexus\.png|\/assets\/logo\.png|\/api\/brand\/icon[^"]*)"/g, 'src="' + LOGO + '"');

  html = html.replace(/<meta name="league-namespace-build" content="[^"]*"\s*\/?>/g, '');
  if (html.includes('</head>')) {
    html = html.replace('</head>', '<meta name="league-namespace-build" content="' + BUILD + '">\n</head>');
  }

  write(file, html);
}

function insertUpdate(html, card) {
  if (html.includes('<article class="va-card va-update-card"')) {
    return html.replace('<article class="va-card va-update-card"', card + '\n          <article class="va-card va-update-card"');
  }
  if (html.includes('</main>')) return html.replace('</main>', card + '\n</main>');
  return html + card;
}

function patchUpdates() {
  let html = read(UPDATES_FILE);
  if (!html) return;

  const hotfixId = 'release-2026-07-18-league-runtime-hotfix';
  if (!html.includes(hotfixId)) {
    const card = `
          <article class="va-card va-update-card" id="${hotfixId}">
            <span class="va-update-dot"></span>
            <div class="va-update-meta"><span>18/07/2026 • 17:40 BRT</span><span>Site</span><span>Hotfix visual/login</span></div>
            <h3>Layout League restaurado e login Discord estabilizado</h3>
            <p class="va-muted">Correção da folha de estilos League que havia alterado identificadores técnicos do HTML e deixado a página sem formatação.</p>
            <ul class="va-update-list">
              <li class="fix">As classes técnicas frm-* foram preservadas para compatibilidade, restaurando sidebar, cards, cabeçalho, logo e responsividade.</li>
              <li class="site">O visual recebeu contraste mais equilibrado e superfícies um pouco mais claras sem abandonar a identidade roxa e escura.</li>
              <li class="fix">O erro loginEls.forEach is not a function foi eliminado e o botão Entrar/Painel volta a abrir o OAuth Discord.</li>
              <li class="fix">Jogadores, clubes, eventos, rankings e demais dados existentes não foram sobrescritos.</li>
            </ul>
          </article>
`;
    html = insertUpdate(html, card);
  }

  write(UPDATES_FILE, html);
}

patchIndex();
patchAssets();
[...walk(PAGES_DIR), path.join(PUBLIC_DIR, 'index.html')].forEach(patchHtml);
patchUpdates();
write(VERSION_FILE, JSON.stringify({
  build: BUILD,
  namespace: 'league',
  logo: LOGO,
  visual: 'balanced-dark',
  updatedAt: '2026-07-18T17:40:00-03:00'
}, null, 2));

console.log(changed
  ? '[League] CSS, login, identidade e visual restaurados.'
  : '[League] CSS, login, identidade e visual ja estavam restaurados.');
