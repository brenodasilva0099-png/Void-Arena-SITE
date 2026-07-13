const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const pagesDir = path.join(ROOT, 'public', 'pages');
const navScriptFile = path.join(ROOT, 'public', 'js', 'core', 'global-navigation-shell.js');
let changed = false;

const NAV_SCRIPT = String.raw`(function () {
  const VA = window.VoidArena || {};
  window.VoidArena = VA;
  const SERVER_OPEN_URL = '/api/discord/server/open';
  const SERVER_ICON = '/api/brand/icon?v=2';
  const NAV_SECTIONS = [
    ['Principal', [
      ['atualizacoes', '/pages/atualizacoes.html', '📰 Atualizações'],
      ['dashboard', '/pages/dashboard.html', '🏠 Início'],
      ['perfil', '/pages/perfil.html', '👤 Perfil'],
      ['eventos', '/pages/eventos.html', '🏆 Eventos'],
      ['times', '/pages/times.html', '🛡️ Times'],
      ['grupos', '/pages/grupos.html', '🧬 Grupos'],
      ['chaveamento', '/pages/chaveamento.html', '🧩 Chaveamento'],
      ['resultados', '/pages/resultados.html', '📌 Resultados'],
      ['rankings', '/pages/rankings.html', '📊 Rankings']
    ]],
    ['Jogadores', [
      ['jogadores', '/pages/jogadores.html', '👥 Jogadores'],
      ['recrutamento', '/pages/recrutamento.html', '🤝 Recrutamento'],
      ['pontuacao', '/pages/pontuacao.html', '🏅 Pontuação'],
      ['placar', '/pages/placar.html', '🎮 Placar']
    ]],
    ['Comunicação', [
      ['chat', '/pages/chat.html', '💬 Chat'],
      ['scrims', '/pages/scrims.html', '⚔️ Scrims'],
      ['estatisticas', '/pages/estatisticas.html', '📈 Estatísticas'],
      ['analise', '/pages/analise-partidas.html', '🎥 Análise de Partidas'],
      ['suporte', '/pages/suporte.html', '🛟 Suporte']
    ]],
    ['Admin', [
      ['formularios', '/pages/formularios.html', '📋 Formulários'],
      ['permissoes', '/pages/permissoes.html', '⚙️ Permissões'],
      ['config', '/pages/configuracoes.html', '🔧 Configurações'],
      ['termos', '/pages/termos.html', '📜 Termos'],
      ['privacidade', '/pages/privacidade.html', '🔐 Privacidade']
    ]]
  ];

  function activeKey() {
    const page = String(document.body?.dataset?.page || '').trim();
    if (page) return page;
    const file = String(location.pathname.split('/').pop() || '').replace(/\.html$/i, '');
    const aliases = { configuracoes: 'config', analise-partidas: 'analise' };
    return aliases[file] || file || 'dashboard';
  }

  function ensureStyle() {
    if (document.getElementById('va-global-navigation-shell-style')) return;
    const style = document.createElement('style');
    style.id = 'va-global-navigation-shell-style';
    style.textContent = `
      .va-nav[data-global-shell="1"] { gap: 6px; }
      .va-nav[data-global-shell="1"] .va-nav-title { margin-top: 14px; }
      .va-nav[data-global-shell="1"] .va-nav-title:first-child { margin-top: 0; }
      .va-nav[data-global-shell="1"] a[hidden] { display: flex !important; }
      .va-nav[data-global-shell="1"] a.active { border-color: rgba(167,139,250,.55); background: rgba(124,58,237,.2); color: #fff; }
      .va-topbar-tools { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
      .va-server-pill { min-height: 42px; display: inline-flex; align-items: center; gap: 9px; padding: 8px 12px; border-radius: 999px; border: 1px solid rgba(167,139,250,.32); background: rgba(15,14,35,.72); color: #f8f7ff; text-decoration: none; font-weight: 800; box-shadow: inset 0 0 0 1px rgba(255,255,255,.03); }
      .va-server-pill img { width: 24px; height: 24px; border-radius: 999px; object-fit: cover; box-shadow: 0 0 18px rgba(139,92,246,.35); }
      .va-server-pill small { display:block; color:#a7a0c7; font-size:10px; line-height:1; text-transform:uppercase; letter-spacing:.08em; }
      .va-server-pill strong { display:block; font-size:12px; line-height:1.1; max-width:130px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .va-mail-pill, .va-user-pill { flex: 0 0 auto; }
      @media (max-width: 720px) { .va-server-pill strong { max-width: 96px; } .va-topbar-tools { width: 100%; justify-content: flex-start; } }
    `;
    document.head.appendChild(style);
  }

  function buildNav(nav) {
    if (!nav) return;
    const current = activeKey();
    const html = NAV_SECTIONS.map(([title, items]) => {
      const links = items.map(([key, href, label]) => {
        const active = key === current ? ' active' : '';
        return '<a data-nav-key="' + key + '" href="' + href + '" class="' + active.trim() + '">' + label + '</a>';
      }).join('');
      return '<div class="va-nav-title">' + title + '</div>' + links;
    }).join('');
    if (nav.dataset.globalShell !== '1' || nav.innerHTML !== html) {
      nav.innerHTML = html;
      nav.dataset.globalShell = '1';
    }
    nav.querySelectorAll('[data-nav-key]').forEach((link) => {
      link.hidden = false;
      link.removeAttribute('hidden');
      link.classList.toggle('active', link.dataset.navKey === current);
    });
  }

  function ensureTopbarTools() {
    const topbar = document.querySelector('.va-topbar');
    if (!topbar) return null;
    let tools = topbar.querySelector(':scope > .va-topbar-tools');
    if (!tools) {
      tools = document.createElement('div');
      tools.className = 'va-topbar-tools';
      const existingPills = Array.from(topbar.querySelectorAll(':scope > .va-user-pill, :scope > .va-mail-pill, :scope > .va-server-pill'));
      topbar.appendChild(tools);
      existingPills.forEach((pill) => tools.appendChild(pill));
    }
    return tools;
  }

  function ensureServerButton(tools) {
    if (!tools) return;
    let button = tools.querySelector('.va-server-pill');
    if (!button) {
      button = document.createElement('a');
      button.className = 'va-server-pill';
      button.href = SERVER_OPEN_URL;
      button.target = '_blank';
      button.rel = 'noopener noreferrer';
      button.title = 'Abrir servidor Hollow Nexus no Discord';
      button.innerHTML = '<img data-server-icon src="' + SERVER_ICON + '" alt="Servidor" /><span><small>Servidor</small><strong data-server-name>Hollow Nexus</strong></span>';
      tools.insertBefore(button, tools.firstChild || null);
    }
  }

  function ensureMailButton(tools) {
    if (!tools) return;
    let mail = tools.querySelector('.va-mail-pill');
    if (!mail) {
      mail = document.createElement('button');
      mail.type = 'button';
      mail.className = 'va-mail-pill';
      mail.title = 'Notificações';
      mail.innerHTML = '📬';
      mail.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        if (window.VoidArena && typeof window.VoidArena.openNotifications === 'function') window.VoidArena.openNotifications();
      });
      tools.appendChild(mail);
    }
  }

  function ensureProfileButton(tools) {
    if (!tools) return;
    let profile = tools.querySelector('.va-user-pill');
    if (!profile) {
      profile = document.createElement('a');
      profile.className = 'va-user-pill va-user-avatar-link is-clickable is-compact is-avatar-only';
      profile.href = '/pages/perfil.html';
      profile.setAttribute('aria-label', 'Abrir perfil');
      profile.innerHTML = '<span class="va-user-pill-avatar">?</span>';
      tools.appendChild(profile);
    }
  }

  function normalizeTopbar() {
    const tools = ensureTopbarTools();
    if (!tools) return;
    ensureServerButton(tools);
    ensureMailButton(tools);
    ensureProfileButton(tools);
  }

  function applyShell() {
    ensureStyle();
    document.querySelectorAll('.va-nav').forEach(buildNav);
    normalizeTopbar();
  }

  function boot() {
    applyShell();
    setTimeout(applyShell, 80);
    setTimeout(applyShell, 350);
    setTimeout(applyShell, 1200);
    if (!VA.__globalNavigationShellObserver) {
      VA.__globalNavigationShellObserver = new MutationObserver(() => applyShell());
      VA.__globalNavigationShellObserver.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'class'] });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
  VA.applyGlobalNavigationShell = applyShell;
})();`;

function ensureDir(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
}

function writeNavScript() {
  ensureDir(navScriptFile);
  const before = fs.existsSync(navScriptFile) ? fs.readFileSync(navScriptFile, 'utf8') : '';
  if (before !== NAV_SCRIPT) {
    fs.writeFileSync(navScriptFile, NAV_SCRIPT, 'utf8');
    changed = true;
  }
}

function patchHtml(file) {
  if (!file.endsWith('.html')) return;
  const before = fs.readFileSync(file, 'utf8');
  if (before.includes('/js/core/global-navigation-shell.js')) return;
  let after = before;
  const tag = '  <script src="/js/core/global-navigation-shell.js"></script>\n';
  if (after.includes('<script src="/js/core/api.js')) {
    after = after.replace(/(\s*<script src="\/js\/core\/api\.js[^>]*><\/script>\s*)/, '$1' + tag);
  } else if (after.includes('</body>')) {
    after = after.replace('</body>', tag + '</body>');
  }
  if (after !== before) {
    fs.writeFileSync(file, after, 'utf8');
    changed = true;
  }
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

writeNavScript();
walk(pagesDir).forEach(patchHtml);
console.log(changed ? '[Navegacao] Shell global de menu/topbar aplicado.' : '[Navegacao] Shell global de menu/topbar ja estava aplicado.');