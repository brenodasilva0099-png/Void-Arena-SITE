const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const PAGES_DIR = path.join(PUBLIC_DIR, 'pages');
const LEAGUE_JS = path.join(PUBLIC_DIR, 'js', 'core', 'league-polish.js');
const NO_MOCK_JS = path.join(PUBLIC_DIR, 'js', 'core', 'federation-no-mock.js');
const UPDATES_FILE = path.join(PAGES_DIR, 'atualizacoes.html');
const VERSION_FILE = path.join(PUBLIC_DIR, 'stable-auth-ui.json');
const BUILD = '2026-07-18-stable-auth-ui-v1';
const CSS = `/css/league-auth-ui.css?v=${BUILD}`;
const JS = `/js/core/league-auth-ui.js?v=${BUILD}`;
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

function walkHtml(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory()
      ? walkHtml(full)
      : (entry.isFile() && entry.name.endsWith('.html') ? [full] : []);
  });
}

function patchLeagueJs() {
  let js = read(LEAGUE_JS);
  if (!js) return;

  const stableSetup = `async function setupTop(){
    try {
      const session = await api('/api/auth/session');
      if (!session.authenticated || !session.user) return;
      const n = await api('/api/notifications');
      $$('[data-frm-unread],[data-frm-mail]').forEach((b) => { b.textContent = String(n.unread || 0); });
    } catch {}
  }`;

  js = js.replace(/async function setupTop\(\)\{[\s\S]*?\n  \}/, () => stableSetup);
  js = js.replace(/\/api\/federation\//g, '/api/league/');
  js = js.replace(/\/api\/federation/g, '/api/league');
  write(LEAGUE_JS, js);
}

function patchNoMockJs() {
  let js = read(NO_MOCK_JS);
  if (!js) return;

  const profileNoop = "async function profileButton(){return;}";
  const notificationSafe = "async function notificationBadges(){try{const s=await api('/api/auth/session');if(!s.authenticated){$$('[data-frm-unread],[data-frm-mail]').forEach(b=>b.textContent='0');return;}const n=await api('/api/notifications');$$('[data-frm-unread],[data-frm-mail]').forEach(b=>b.textContent=String(n.unread||0));}catch{$$('[data-frm-unread],[data-frm-mail]').forEach(b=>b.textContent='0');}}";

  js = js.replace(/async function profileButton\(\)\{[\s\S]*?\}/, profileNoop);
  js = js.replace(/async function notificationBadges\(\)\{[\s\S]*?\}/, notificationSafe);
  js = js.replace(/\/api\/federation\//g, '/api/league/');
  js = js.replace(/\/api\/federation/g, '/api/league');
  write(NO_MOCK_JS, js);
}

function patchHtml(file) {
  let html = read(file);
  if (!html) return;

  html = html.replace(/\s*<script[^>]+discord-brand-sync\.js[^>]*><\/script>/gi, '');
  html = html.replace(/\s*<script[^>]+discord-auth-avatar\.js[^>]*><\/script>/gi, '');
  html = html.replace(/\s*<link[^>]+discord-auth-avatar\.css[^>]*>/gi, '');
  html = html.replace(/\s*<script[^>]+league-auth-ui\.js[^>]*><\/script>/gi, '');
  html = html.replace(/\s*<link[^>]+league-auth-ui\.css[^>]*>/gi, '');
  html = html.replace(/\s*<meta name="discord-brand-sync-build"[^>]*>/gi, '');
  html = html.replace(/\s*<meta name="stable-auth-ui-build"[^>]*>/gi, '');

  if (html.includes('</head>')) {
    html = html.replace('</head>', `  <link rel="stylesheet" href="${CSS}">\n  <meta name="stable-auth-ui-build" content="${BUILD}">\n</head>`);
  }

  if (html.includes('</body>')) {
    html = html.replace('</body>', `  <script src="${JS}"></script>\n</body>`);
  }

  write(file, html);
}

function insertUpdate(html, card) {
  if (html.includes('<article class="va-card va-update-card"')) {
    return html.replace('<article class="va-card va-update-card"', `${card}\n          <article class="va-card va-update-card"`);
  }
  if (html.includes('</main>')) return html.replace('</main>', `${card}\n</main>`);
  return html + card;
}

function patchUpdates() {
  let html = read(UPDATES_FILE);
  if (!html || html.includes('release-2026-07-18-stable-auth-ui')) return;

  const card = `
          <article class="va-card va-update-card" id="release-2026-07-18-stable-auth-ui">
            <span class="va-update-dot"></span>
            <div class="va-update-meta"><span>18/07/2026 • 18:30 BRT</span><span>Site</span><span>Login/MIME/Sessão</span></div>
            <h3>Login Discord e avatar estabilizados com assets reais</h3>
            <p class="va-muted">A interface de autenticação deixou de depender de JavaScript gerado apenas no boot e passou a usar arquivos versionados e servidos com MIME correto.</p>
            <ul class="va-update-list">
              <li class="fix">O script quebrado discord-brand-sync.js foi removido das páginas, eliminando o erro 500 e o bloqueio por MIME text/html.</li>
              <li class="site">O botão Entrar/Painel consulta /api/auth/session e vira um avatar circular somente quando a sessão Discord está autenticada.</li>
              <li class="fix">As chamadas antecipadas a /api/me e /api/notifications foram removidas quando o visitante ainda está deslogado.</li>
              <li class="fix">O callback OAuth salva a sessão e cookies persistentes antes de redirecionar, sem alterar jogadores, clubes, eventos ou demais dados.</li>
            </ul>
          </article>`;

  write(UPDATES_FILE, insertUpdate(html, card));
}

patchLeagueJs();
patchNoMockJs();
[...walkHtml(PAGES_DIR), path.join(PUBLIC_DIR, 'index.html')].forEach(patchHtml);
patchUpdates();
write(VERSION_FILE, JSON.stringify({
  build: BUILD,
  authEndpoint: '/api/auth/session',
  js: JS,
  css: CSS,
  updatedAt: '2026-07-18T18:30:00-03:00'
}, null, 2));

console.log(changed
  ? '[Auth/UI] Assets estáveis, MIME, sessão e avatar corrigidos.'
  : '[Auth/UI] Assets estáveis, MIME, sessão e avatar já estavam corrigidos.');
