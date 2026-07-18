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
const BUILD = '2026-07-17-league-namespace-logo-v1';
const LOGO = '/api/brand/icon?v=' + BUILD;
let changed = false;

function read(file) { return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''; }
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
    src = src.replace('registerDiscordServerLinkRoutes(app);', 'registerDiscordServerLinkRoutes(app);\nregisterLeagueRoutes(app);');
  }
  write(INDEX_FILE, src);
}

function loginSetupSource() {
  return `async function setupTop(){
    const loginHref = '/auth/discord?next=%2Fpages%2Fperfil.html';
    const loginEls = $$('[data-frm-login],a[href="/pages/perfil.html"]');
    loginEls.forEach(a => { a.href = loginHref; a.dataset.discordLogin = '${BUILD}'; });
    let logged = false;
    try {
      const me = await api('/api/me');
      logged = true;
      const u = me.user || {};
      loginEls.forEach(a => { a.href = '/pages/perfil.html'; a.dataset.loggedIn = '1'; a.innerHTML = '<img class="frm-profile-avatar" src="' + esc(img(u.avatar)) + '" alt="Perfil"/>'; a.classList.remove('frm-btn'); a.title = 'Abrir perfil'; });
    } catch {}
    if (!logged) return;
    try {
      const n = await api('/api/notifications');
      $$('[data-frm-unread],[data-frm-mail]').forEach(b => b.textContent = String(n.unread || 0));
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
  out = out.replace(/async function setupTop\(\)\{[\s\S]*?\n  \}/, loginSetupSource());
  if (!out.includes('HNL_LEAGUE_NAMESPACE')) out += '\n/* HNL_LEAGUE_NAMESPACE ' + BUILD + ' */\n';
  return out;
}

function patchAssets() {
  const js = read(FED_JS);
  if (js) {
    const leagueJs = cleanJs(js);
    write(FED_JS, leagueJs);
    write(LEAGUE_JS, leagueJs);
  }
  const css = read(FED_CSS);
  if (css) write(LEAGUE_CSS, css.replace(/federation/gi, 'league').replace(/frm/gi, 'hnl'));
}

function patchHtml(file) {
  let html = read(file);
  if (!html) return;
  html = html.replace(/\/js\/core\/federation-polish\.js(\?[^"']*)?/g, '/js/core/league-polish.js?v=' + BUILD);
  html = html.replace(/\/css\/federation-polish\.css(\?[^"']*)?/g, '/css/league-polish.css?v=' + BUILD);
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
  if (html.includes('</head>') && !html.includes('league-namespace-build')) html = html.replace('</head>', '<meta name="league-namespace-build" content="' + BUILD + '">\n</head>');
  write(file, html);
}

function patchUpdates() {
  let html = read(UPDATES_FILE);
  if (!html || html.includes('release-2026-07-17-league-namespace-logo')) return;
  const card = `
          <article class="va-card va-update-card" id="release-2026-07-17-league-namespace-logo">
            <span class="va-update-dot"></span>
            <div class="va-update-meta"><span>17/07/2026 • 23:10 BRT</span><span>Site</span><span>League/Logo/Login</span></div>
            <h3>Namespace League, login Discord e logo oficial consolidados</h3>
            <p class="va-muted">A camada HNL passa a usar rotas /api/league, assets league-polish e favicon/logo vindos da marca oficial do servidor, mantendo compatibilidade com os dados antigos.</p>
            <ul class="va-update-list">
              <li class="site">O botão Entrar/Painel é forçado para o OAuth Discord quando o usuário ainda não está logado.</li>
              <li class="site">O frontend passa a chamar /api/league/overview, /api/league/ranking-settings e demais rotas League.</li>
              <li class="fix">Logo e favicon agora usam /api/brand/icon, sincronizando com a logo atual do servidor/bot quando disponível.</li>
              <li class="fix">As rotas antigas Federation/FRM continuam como compatibilidade para preservar dados e histórico.</li>
            </ul>
          </article>
`;
  if (html.includes('<article class="va-card va-update-card"')) html = html.replace('<article class="va-card va-update-card"', card + '\n          <article class="va-card va-update-card"');
  else if (html.includes('</main>')) html = html.replace('</main>', card + '\n</main>');
  else html += card;
  write(UPDATES_FILE, html);
}

patchIndex();
patchAssets();
[...walk(PAGES_DIR), path.join(PUBLIC_DIR, 'index.html')].forEach(patchHtml);
patchUpdates();
write(VERSION_FILE, JSON.stringify({ build: BUILD, namespace: 'league', logo: LOGO, updatedAt: '2026-07-17T23:10:00-03:00' }, null, 2));

console.log(changed ? '[League] Namespace, login e logo oficial aplicados.' : '[League] Namespace, login e logo oficial ja estavam aplicados.');
