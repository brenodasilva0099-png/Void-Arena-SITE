const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const pagesDir = path.join(ROOT, 'public', 'pages');
const cssFile = path.join(ROOT, 'public', 'css', 'federation-portal.css');
const jsFile = path.join(ROOT, 'public', 'js', 'core', 'federation-portal.js');
const dashboardFile = path.join(pagesDir, 'dashboard.html');
let changed = false;

const BUILD = '2026-07-13-frm-v1';
const CSS_HREF = '/css/federation-portal.css?v=' + BUILD;
const JS_SRC = '/js/core/federation-portal.js?v=' + BUILD;

const FEDERATION_CSS = String.raw`
:root {
  --frm-bg: #05060d;
  --frm-bg-2: #080912;
  --frm-panel: rgba(10, 12, 24, .82);
  --frm-panel-2: rgba(13, 15, 30, .9);
  --frm-border: rgba(167, 139, 250, .22);
  --frm-border-strong: rgba(167, 139, 250, .42);
  --frm-purple: #8b5cf6;
  --frm-purple-2: #a855f7;
  --frm-cyan: #22d3ee;
  --frm-green: #22c55e;
  --frm-text: #f8f7ff;
  --frm-muted: #a8a0c5;
  --frm-soft: rgba(139, 92, 246, .15);
  --frm-glow: 0 0 32px rgba(139, 92, 246, .32);
}

body.va-organized-body,
body.frm-federation-body {
  min-height: 100vh;
  color: var(--frm-text);
  background:
    radial-gradient(circle at 18% 0%, rgba(139, 92, 246, .22), transparent 36%),
    radial-gradient(circle at 80% 10%, rgba(34, 211, 238, .10), transparent 32%),
    linear-gradient(135deg, #03040b, #070815 46%, #0b0920);
}

.va-shell {
  display: grid;
  grid-template-columns: 292px minmax(0, 1fr);
  min-height: 100vh;
}

.va-sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  overflow: auto;
  padding: 18px 18px 22px;
  border-right: 1px solid rgba(167, 139, 250, .18);
  background:
    radial-gradient(circle at 40% 0%, rgba(139, 92, 246, .18), transparent 40%),
    rgba(4, 5, 12, .88);
  backdrop-filter: blur(22px);
}

.va-brand,
.frm-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 72px;
  margin-bottom: 18px;
}

.va-brand img,
.frm-brand-logo,
[data-frm-logo] {
  width: 58px;
  height: 58px;
  border-radius: 18px;
  object-fit: cover;
  border: 1px solid rgba(167, 139, 250, .45);
  box-shadow: 0 0 28px rgba(139, 92, 246, .45);
  background: #05050a;
}

.va-brand small,
.frm-brand small {
  display: block;
  color: var(--frm-muted);
  text-transform: uppercase;
  letter-spacing: .16em;
  font-size: 10px;
  font-weight: 900;
}

.va-brand strong,
.frm-brand strong {
  display: block;
  color: #fff;
  font-size: 17px;
  letter-spacing: .02em;
}

.va-nav[data-frm-shell="1"] {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.va-nav[data-frm-shell="1"] .va-nav-title {
  margin: 17px 0 7px;
  color: #b986ff;
  text-transform: uppercase;
  letter-spacing: .13em;
  font-size: 11px;
  font-weight: 950;
}

.va-nav[data-frm-shell="1"] a {
  display: flex;
  align-items: center;
  min-height: 38px;
  gap: 10px;
  padding: 9px 11px;
  border-radius: 12px;
  border: 1px solid transparent;
  color: #d6d0ea;
  text-decoration: none;
  font-weight: 750;
  font-size: 14px;
  transition: .18s ease;
}

.va-nav[data-frm-shell="1"] a:hover,
.va-nav[data-frm-shell="1"] a.active {
  color: #fff;
  background: linear-gradient(90deg, rgba(139, 92, 246, .35), rgba(139, 92, 246, .08));
  border-color: rgba(167, 139, 250, .42);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.035), 0 0 18px rgba(139, 92, 246, .20);
  transform: translateX(2px);
}

.frm-new-pill {
  margin-left: auto;
  padding: 2px 7px;
  border-radius: 999px;
  background: linear-gradient(135deg, #8b5cf6, #6d28d9);
  color: #fff;
  font-size: 9px;
  font-weight: 950;
}

.va-main {
  min-width: 0;
  padding: 22px 26px 0;
}

.va-topbar,
.frm-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 18px;
  padding: 14px 18px;
  border: 1px solid rgba(167, 139, 250, .18);
  border-radius: 22px;
  background: rgba(6, 8, 18, .72);
  backdrop-filter: blur(18px);
}

.frm-top-tabs {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
}

.frm-top-tabs a {
  padding: 10px 13px;
  border-radius: 12px;
  color: #d6d0ea;
  text-decoration: none;
  font-size: 13px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: .05em;
}

.frm-top-tabs a.active,
.frm-top-tabs a:hover {
  color: #fff;
  background: rgba(139, 92, 246, .18);
  box-shadow: inset 0 -2px 0 #8b5cf6;
}

.va-topbar-tools,
.frm-header-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

.frm-btn,
.va-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  min-height: 42px;
  padding: 10px 15px;
  border-radius: 12px;
  border: 1px solid rgba(167,139,250,.25);
  background: rgba(10, 12, 24, .82);
  color: #fff;
  text-decoration: none;
  font-weight: 900;
  cursor: pointer;
}

.frm-btn.primary,
.va-btn.primary {
  border-color: rgba(167,139,250,.55);
  background: linear-gradient(135deg, #7c3aed, #5b21b6);
  box-shadow: 0 0 24px rgba(124, 58, 237, .35);
}

.frm-btn.discord {
  background: linear-gradient(135deg, #5865f2, #6d28d9);
}

.va-user-pill,
.va-mail-pill,
.va-server-pill {
  border: 1px solid rgba(167,139,250,.28) !important;
  background: rgba(10, 12, 24, .82) !important;
  color: #fff !important;
}

.frm-home {
  display: grid;
  gap: 16px;
}

.frm-layout-grid {
  display: grid;
  grid-template-columns: minmax(0, 2.15fr) minmax(330px, .85fr);
  gap: 16px;
}

.frm-hero,
.frm-card,
.frm-stat,
.frm-footer {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(167,139,250,.18);
  background:
    linear-gradient(180deg, rgba(14,16,32,.92), rgba(8,10,22,.88));
  border-radius: 22px;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.02);
}

.frm-hero {
  min-height: 350px;
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) 340px;
  align-items: center;
  padding: 34px 40px;
  background:
    radial-gradient(circle at 77% 45%, rgba(139, 92, 246, .45), transparent 28%),
    radial-gradient(circle at 25% 0%, rgba(34, 211, 238, .12), transparent 32%),
    linear-gradient(135deg, rgba(7,8,18,.96), rgba(12, 8, 32, .96));
}

.frm-hero:before {
  content: "";
  position: absolute;
  inset: 0;
  opacity: .42;
  background:
    radial-gradient(circle at 75% 40%, rgba(168, 85, 247, .48), transparent 17%),
    linear-gradient(120deg, transparent 0 35%, rgba(139,92,246,.08) 36% 62%, transparent 63% 100%);
  pointer-events: none;
}

.frm-hero > * {
  position: relative;
  z-index: 1;
}

.frm-eyebrow,
.va-eyebrow {
  margin: 0 0 8px;
  color: #b986ff;
  text-transform: uppercase;
  letter-spacing: .13em;
  font-size: 12px;
  font-weight: 950;
}

.frm-hero h1 {
  margin: 0;
  color: #fff;
  font-size: clamp(34px, 4.2vw, 64px);
  letter-spacing: -.06em;
  line-height: .95;
}

.frm-hero h1 span {
  color: #9b5cff;
  text-shadow: 0 0 28px rgba(139,92,246,.55);
}

.frm-hero h2 {
  margin: 14px 0 0;
  color: #ded8f7;
  font-size: clamp(20px, 2vw, 30px);
  letter-spacing: .03em;
  text-transform: uppercase;
}

.frm-hero p {
  max-width: 640px;
  margin: 18px 0 0;
  color: var(--frm-muted);
  line-height: 1.7;
}

.frm-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 28px;
}

.frm-hero-logo-wrap {
  display: grid;
  place-items: center;
}

.frm-hero-logo {
  width: min(290px, 78%);
  aspect-ratio: 1;
  border-radius: 44px;
  border: 1px solid rgba(167,139,250,.38);
  box-shadow: 0 0 60px rgba(139,92,246,.5), inset 0 0 0 1px rgba(255,255,255,.04);
  background: rgba(0,0,0,.32);
  padding: 8px;
  object-fit: cover;
}

.frm-side-stack,
.frm-lower-grid {
  display: grid;
  gap: 16px;
}

.frm-card {
  padding: 20px;
}

.frm-card h3,
.frm-card h2 {
  margin: 0;
  color: #fff;
}

.frm-muted,
.va-muted {
  color: var(--frm-muted);
}

.frm-season-progress,
.frm-bar {
  height: 9px;
  border-radius: 999px;
  background: rgba(255,255,255,.08);
  overflow: hidden;
  margin-top: 13px;
}

.frm-season-progress span,
.frm-bar span {
  display: block;
  height: 100%;
  width: var(--value, 50%);
  border-radius: inherit;
  background: linear-gradient(90deg, #7c3aed, #a855f7, #22d3ee);
  box-shadow: 0 0 18px rgba(139,92,246,.45);
}

.frm-match {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 28px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 12px 0;
  border-top: 1px solid rgba(255,255,255,.06);
}

.frm-match strong {
  color: #fff;
  font-size: 13px;
}

.frm-match small {
  color: var(--frm-muted);
}

.frm-stats {
  display: grid;
  grid-template-columns: repeat(5, minmax(150px, 1fr));
  gap: 12px;
}

.frm-stat {
  padding: 18px;
  display: flex;
  align-items: center;
  gap: 14px;
}

.frm-stat-icon {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border-radius: 16px;
  background: rgba(139,92,246,.18);
  color: #d8c4ff;
  font-size: 24px;
}

.frm-stat span {
  display: block;
  color: var(--frm-muted);
  text-transform: uppercase;
  letter-spacing: .08em;
  font-size: 11px;
  font-weight: 900;
}

.frm-stat strong {
  display: block;
  margin-top: 2px;
  color: #fff;
  font-size: 26px;
  letter-spacing: -.04em;
}

.frm-stat small {
  display: block;
  color: #67e8f9;
}

.frm-lower-grid {
  grid-template-columns: 1fr 1fr 1.2fr;
}

.frm-list {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}

.frm-list-item {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 11px;
  border: 1px solid rgba(255,255,255,.07);
  border-radius: 14px;
  background: rgba(255,255,255,.025);
}

.frm-list-logo {
  width: 42px;
  height: 42px;
  border-radius: 13px;
  object-fit: cover;
  border: 1px solid rgba(167,139,250,.25);
}

.frm-pill {
  display: inline-flex;
  align-items: center;
  min-height: 25px;
  padding: 4px 9px;
  border-radius: 999px;
  background: rgba(139,92,246,.22);
  color: #d9c5ff;
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
}

.frm-pill.green {
  background: rgba(34,197,94,.16);
  color: #86efac;
}

.frm-news {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}

.frm-news article {
  display: grid;
  grid-template-columns: 118px minmax(0, 1fr);
  gap: 12px;
  padding: 10px;
  border: 1px solid rgba(255,255,255,.07);
  border-radius: 15px;
  background: rgba(255,255,255,.025);
}

.frm-news-thumb {
  min-height: 76px;
  border-radius: 12px;
  background:
    radial-gradient(circle at 50% 50%, rgba(139,92,246,.7), transparent 42%),
    linear-gradient(135deg, rgba(139,92,246,.25), rgba(34,211,238,.10));
}

.frm-footer {
  margin-top: 18px;
  padding: 24px;
  display: grid;
  grid-template-columns: 1.4fr .75fr .75fr 1fr;
  gap: 24px;
  border-radius: 22px 22px 0 0;
}

.frm-footer-brand {
  display: flex;
  gap: 14px;
  align-items: center;
}

.frm-footer h4 {
  margin: 0 0 8px;
  color: #c4a6ff;
  text-transform: uppercase;
  letter-spacing: .1em;
  font-size: 12px;
}

.frm-footer a,
.frm-footer p {
  color: var(--frm-muted);
}

.frm-legal-note {
  font-size: 12px;
  line-height: 1.6;
}

@media (max-width: 1240px) {
  .va-shell { grid-template-columns: 250px minmax(0, 1fr); }
  .frm-layout-grid { grid-template-columns: 1fr; }
  .frm-hero { grid-template-columns: 1fr; }
  .frm-hero-logo-wrap { display: none; }
  .frm-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .frm-lower-grid { grid-template-columns: 1fr; }
  .frm-footer { grid-template-columns: 1fr 1fr; }
}

@media (max-width: 760px) {
  .va-shell { display: block; }
  .va-sidebar { position: relative; height: auto; }
  .va-main { padding: 16px; }
  .frm-top-tabs { display: none; }
  .frm-stats { grid-template-columns: 1fr; }
  .frm-footer { grid-template-columns: 1fr; }
}
`;

const FEDERATION_JS = String.raw`(function () {
  const VA = window.VoidArena || {};
  window.VoidArena = VA;
  if (VA.__hollowNexusFederationPortal) return;
  VA.__hollowNexusFederationPortal = true;

  const LOGO = '/api/brand/icon?v=frm-2026-07-13';
  const FALLBACK_LOGO = '/assets/hollow-nexus.png';
  const DISCORD_OPEN = '/api/discord/server/open';

  const NAV = [
    ['FEDERAÇÃO', [
      ['dashboard', '/pages/dashboard.html', '🏠', 'Início'],
      ['federacao', '/pages/federacao.html', '◎', 'Sobre a Federação'],
      ['regulamento', '/pages/regulamento.html', '▣', 'Regulamento'],
      ['atualizacoes', '/pages/atualizacoes.html', '▱', 'Atualizações'],
      ['suporte', '/pages/suporte.html', '🛟', 'Suporte']
    ]],
    ['COMPETITIVO', [
      ['competicoes', '/pages/eventos.html', '🏆', 'Competições'],
      ['eventos', '/pages/eventos.html', '📅', 'Eventos'],
      ['chaveamento', '/pages/chaveamento.html', '🧩', 'Chaveamento'],
      ['grupos', '/pages/grupos.html', '⛓', 'Grupos'],
      ['resultados', '/pages/resultados.html', '📌', 'Resultados'],
      ['rankings', '/pages/rankings.html', '📊', 'Rankings']
    ]],
    ['CLUBES', [
      ['clubes', '/pages/times.html', '🛡️', 'Clubes Afiliados'],
      ['afiliacao', '/pages/formularios.html', '📥', 'Solicitar Afiliação'],
      ['elencos', '/pages/times.html', '👥', 'Elencos'],
      ['prancheta', '/pages/prancheta-tatica.html', '🎯', 'Prancheta Tática', 'NOVO']
    ]],
    ['ATLETAS', [
      ['atletas', '/pages/jogadores.html', '👤', 'Jogadores Registrados'],
      ['mercado', '/pages/recrutamento.html', '🤝', 'Mercado / Recrutamento'],
      ['ranking-jogadores', '/pages/rankings.html', '🥇', 'Ranking de Jogadores'],
      ['transferencias', '/pages/recrutamento.html', '🔁', 'Transferências']
    ]],
    ['ADMINISTRAÇÃO', [
      ['formularios', '/pages/formularios.html', '📋', 'Formulários'],
      ['permissoes', '/pages/permissoes.html', '⚙️', 'Permissões'],
      ['config', '/pages/configuracoes.html', '🔧', 'Configurações'],
      ['analise', '/pages/analise-partidas.html', '🎥', 'Análise de Partidas']
    ]]
  ];

  const TOP = [
    ['dashboard', '/pages/dashboard.html', 'INÍCIO'],
    ['federacao', '/pages/federacao.html', 'FEDERAÇÃO'],
    ['competicoes', '/pages/eventos.html', 'COMPETITIVO'],
    ['clubes', '/pages/times.html', 'CLUBES'],
    ['atletas', '/pages/jogadores.html', 'ATLETAS'],
    ['config', '/pages/configuracoes.html', 'ADMINISTRAÇÃO']
  ];

  function pageKey() {
    const page = String(document.body && document.body.dataset && document.body.dataset.page || '').trim();
    if (page) return alias(page);
    const file = String(location.pathname.split('/').pop() || '').replace(/\.html$/i, '');
    return alias(file || 'dashboard');
  }

  function alias(key) {
    return ({
      times: 'clubes',
      jogadores: 'atletas',
      recrutamento: 'mercado',
      configuracoes: 'config',
      'analise-partidas': 'analise',
      calendario: 'eventos',
      competicoes: 'competicoes',
      'prancheta-tatica': 'prancheta'
    })[key] || key;
  }

  function setLogo(img) {
    if (!img) return;
    img.src = LOGO;
    img.onerror = function () {
      if (img.src.indexOf(FALLBACK_LOGO) < 0) img.src = FALLBACK_LOGO;
    };
  }

  function brand() {
    document.body.classList.add('frm-federation-body');
    document.querySelectorAll('.va-brand, .frm-brand').forEach(function (box) {
      box.classList.add('frm-brand');
      box.innerHTML = '<img data-frm-logo src="' + LOGO + '" alt="Hollow Nexus FRM" /><div><small>Federação</small><strong>the HOLLOW NEXUS <span>FRM</span></strong></div>';
      setLogo(box.querySelector('img'));
    });
    document.querySelectorAll('[data-server-icon], [data-frm-logo]').forEach(setLogo);
    document.querySelectorAll('[data-server-name]').forEach(function (el) { el.textContent = 'Hollow Nexus FRM'; });
    document.title = document.title.replace('Void Arena', 'Hollow Nexus FRM');
  }

  function buildNav() {
    const current = pageKey();
    document.querySelectorAll('.va-nav').forEach(function (nav) {
      const html = NAV.map(function (section) {
        return '<div class="va-nav-title">' + section[0] + '</div>' + section[1].map(function (item) {
          const key = item[0], href = item[1], icon = item[2], label = item[3], pill = item[4];
          const active = key === current ? ' active' : '';
          return '<a data-nav-key="' + key + '" href="' + href + '" class="' + active.trim() + '"><span>' + icon + '</span><b>' + label + '</b>' + (pill ? '<em class="frm-new-pill">' + pill + '</em>' : '') + '</a>';
        }).join('');
      }).join('');
      if (nav.dataset.frmShell !== '1' || nav.innerHTML !== html) {
        nav.innerHTML = html;
        nav.dataset.frmShell = '1';
      }
      nav.querySelectorAll('[data-nav-key]').forEach(function (link) {
        link.hidden = false;
        link.removeAttribute('hidden');
        link.classList.toggle('active', link.dataset.navKey === current);
      });
    });
  }

  function topbar() {
    const current = pageKey();
    document.querySelectorAll('.va-topbar').forEach(function (tb) {
      tb.classList.add('frm-topbar');
      let tabs = tb.querySelector(':scope > .frm-top-tabs');
      if (!tabs) {
        tabs = document.createElement('nav');
        tabs.className = 'frm-top-tabs';
        tb.insertBefore(tabs, tb.firstChild);
      }
      tabs.innerHTML = TOP.map(function (item) {
        return '<a class="' + (item[0] === current ? 'active' : '') + '" href="' + item[1] + '">' + item[2] + '</a>';
      }).join('');

      let tools = tb.querySelector(':scope > .va-topbar-tools, :scope > .frm-header-actions');
      if (!tools) {
        tools = document.createElement('div');
        tools.className = 'va-topbar-tools frm-header-actions';
        tb.appendChild(tools);
      }
      tools.classList.add('frm-header-actions');

      if (!tools.querySelector('[data-frm-panel-login]')) {
        const panel = document.createElement('a');
        panel.href = '/pages/perfil.html';
        panel.className = 'frm-btn';
        panel.setAttribute('data-frm-panel-login', '1');
        panel.textContent = '👤 ENTRAR / PAINEL';
        tools.insertBefore(panel, tools.firstChild || null);
      }

      if (!tools.querySelector('[data-frm-discord]')) {
        const discord = document.createElement('a');
        discord.href = DISCORD_OPEN;
        discord.target = '_blank';
        discord.rel = 'noopener noreferrer';
        discord.className = 'frm-btn discord';
        discord.setAttribute('data-frm-discord', '1');
        discord.textContent = '💬 DISCORD';
        tools.insertBefore(discord, tools.children[1] || null);
      }
    });
  }

  function footer() {
    const main = document.querySelector('.va-main');
    if (!main || main.querySelector(':scope > .frm-footer')) return;
    const f = document.createElement('footer');
    f.className = 'frm-footer';
    f.innerHTML = '<div><div class="frm-footer-brand"><img data-frm-logo src="' + LOGO + '" class="frm-brand-logo" alt="Hollow Nexus FRM" /><div><strong>the HOLLOW NEXUS <span>FRM</span></strong><p>Federação Comunitária de Rematch</p></div></div><p class="frm-muted">Elevando o cenário competitivo de Rematch.</p></div><div><h4>Links rápidos</h4><p><a href="/pages/regulamento.html">Regulamento</a></p><p><a href="/pages/termos.html">Termos de Uso</a></p><p><a href="/pages/privacidade.html">Privacidade</a></p></div><div><h4>Contato</h4><p>Discord Oficial</p><p><a href="/pages/suporte.html">Suporte</a></p></div><div><h4>Legal</h4><p class="frm-legal-note">Projeto comunitário independente. Não afiliado, patrocinado ou endossado pela Sloclap, Kepler Interactive ou Rematch.</p></div>';
    main.appendChild(f);
    f.querySelectorAll('[data-frm-logo]').forEach(setLogo);
  }

  function numberText(value, fallback) {
    const n = Number(value || 0);
    if (!Number.isFinite(n) || n <= 0) return fallback;
    return new Intl.NumberFormat('pt-BR').format(n);
  }

  async function fetchJson(path) {
    const res = await fetch(path, { credentials: 'include', cache: 'no-store' });
    if (!res.ok) throw new Error(String(res.status));
    return res.json();
  }

  function getArray(data, keys) {
    for (const key of keys) {
      if (Array.isArray(data && data[key])) return data[key];
    }
    if (Array.isArray(data)) return data;
    return [];
  }

  async function hydrateStats() {
    if (!document.querySelector('[data-frm-stat]')) return;
    const results = await Promise.allSettled([
      fetchJson('/api/players'),
      fetchJson('/api/teams'),
      fetchJson('/api/events'),
      fetchJson('/api/rankings')
    ]);
    const players = results[0].status === 'fulfilled' ? getArray(results[0].value, ['players', 'users', 'items']) : [];
    const teams = results[1].status === 'fulfilled' ? getArray(results[1].value, ['teams', 'items']) : [];
    const events = results[2].status === 'fulfilled' ? getArray(results[2].value, ['events', 'tournaments', 'items']) : [];

    const map = {
      clubes: numberText(teams.length, '24'),
      atletas: numberText(players.length, '127'),
      competicoes: numberText(events.length, '4')
    };
    Object.keys(map).forEach(function (key) {
      document.querySelectorAll('[data-frm-stat="' + key + '"]').forEach(function (el) { el.textContent = map[key]; });
    });
  }

  function boot() {
    brand();
    buildNav();
    topbar();
    footer();
    hydrateStats().catch(function () {});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();

  setTimeout(boot, 150);
  setTimeout(boot, 600);
  setTimeout(boot, 1600);
  VA.applyFederationPortal = boot;
})();`;

const DASHBOARD_HTML = String.raw`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Hollow Nexus FRM | Federação Comunitária de Rematch</title>
  <link rel="icon" href="/api/brand/icon?v=frm-2026-07-13" />
  <link rel="stylesheet" href="/css/style.css" />
  <link rel="stylesheet" href="/css/organization.css" />
  <link rel="stylesheet" href="/css/arena-pages.css" />
  <link rel="stylesheet" href="/css/site-cleanup.css" />
  <link rel="stylesheet" href="/css/federation-portal.css?v=2026-07-13-frm-v1" />
</head>
<body class="va-organized-body frm-federation-body" data-page="dashboard">
  <div class="va-shell">
    <aside class="va-sidebar">
      <div class="va-brand frm-brand">
        <img data-frm-logo src="/api/brand/icon?v=frm-2026-07-13" alt="Hollow Nexus FRM" />
        <div><small>Federação</small><strong>the HOLLOW NEXUS <span>FRM</span></strong></div>
      </div>
      <nav class="va-nav"></nav>
    </aside>
    <main class="va-main">
      <header class="va-topbar frm-topbar">
        <nav class="frm-top-tabs"></nav>
        <div class="va-topbar-tools frm-header-actions">
          <a class="frm-btn" data-frm-panel-login href="/pages/perfil.html">👤 ENTRAR / PAINEL</a>
          <a class="frm-btn discord" data-frm-discord href="/api/discord/server/open" target="_blank" rel="noopener noreferrer">💬 DISCORD</a>
          <a class="va-user-pill va-user-avatar-link" href="/pages/perfil.html" aria-label="Abrir perfil"><span class="va-user-pill-avatar">?</span></a>
        </div>
      </header>

      <section class="frm-home">
        <div class="frm-layout-grid">
          <article class="frm-hero">
            <div>
              <p class="frm-eyebrow">Bem-vindo à</p>
              <h1>the HOLLOW NEXUS <span>FRM</span></h1>
              <h2>Federação Comunitária de Rematch</h2>
              <p>Organizamos, regulamentamos e elevamos o cenário competitivo. Uma federação. Muitos clubes. Um objetivo: o topo.</p>
              <div class="frm-actions">
                <a class="frm-btn primary" href="/pages/formularios.html">👥 AFILIAR CLUBE</a>
                <a class="frm-btn" href="/pages/eventos.html">🏆 VER COMPETIÇÕES</a>
                <a class="frm-btn" href="/pages/rankings.html">📊 RANKING OFICIAL</a>
                <a class="frm-btn" href="/pages/regulamento.html">📄 REGULAMENTO</a>
              </div>
            </div>
            <div class="frm-hero-logo-wrap">
              <img class="frm-hero-logo" data-frm-logo src="/api/brand/icon?v=frm-2026-07-13" alt="Logo Hollow Nexus FRM" />
            </div>
          </article>

          <aside class="frm-side-stack">
            <article class="frm-card">
              <p class="frm-eyebrow">Temporada atual</p>
              <h2>Temporada 1 - 2026</h2>
              <p class="frm-muted">Status: <span class="frm-pill">Em andamento</span></p>
              <div class="frm-season-progress" style="--value: 48%"><span></span></div>
              <p class="frm-muted">Progresso competitivo inicial da federação.</p>
            </article>
            <article class="frm-card">
              <p class="frm-eyebrow">Próximas partidas</p>
              <div class="frm-match"><strong>Hollow Nexus FC</strong><b>VS</b><strong>Rival Club</strong><a class="frm-btn" href="/pages/eventos.html">VER</a></div>
              <div class="frm-match"><strong>Void Legacy</strong><b>VS</b><strong>Noctis Club</strong><a class="frm-btn" href="/pages/eventos.html">VER</a></div>
              <div class="frm-match"><strong>Prime Elite</strong><b>VS</b><strong>Death Squad</strong><a class="frm-btn" href="/pages/eventos.html">VER</a></div>
            </article>
          </aside>
        </div>

        <div class="frm-stats">
          <article class="frm-stat"><div class="frm-stat-icon">🛡️</div><div><span>Clubes afiliados</span><strong data-frm-stat="clubes">24</strong><small>estrutura oficial</small></div></article>
          <article class="frm-stat"><div class="frm-stat-icon">👥</div><div><span>Atletas registrados</span><strong data-frm-stat="atletas">127</strong><small>perfis ativos</small></div></article>
          <article class="frm-stat"><div class="frm-stat-icon">🏆</div><div><span>Competições ativas</span><strong data-frm-stat="competicoes">4</strong><small>ligas e copas</small></div></article>
          <article class="frm-stat"><div class="frm-stat-icon">🧩</div><div><span>Partidas disputadas</span><strong>312</strong><small>histórico oficial</small></div></article>
          <article class="frm-stat"><div class="frm-stat-icon">⚽</div><div><span>Gols marcados</span><strong>1.247</strong><small>média 4,0 por partida</small></div></article>
        </div>

        <div class="frm-lower-grid">
          <article class="frm-card">
            <p class="frm-eyebrow">Competições em destaque</p>
            <h3>Circuito Hollow Nexus</h3>
            <div class="frm-list">
              <div class="frm-list-item"><img class="frm-list-logo" data-frm-logo src="/api/brand/icon?v=frm-2026-07-13" /><div><strong>Liga Hollow Nexus</strong><br><small class="frm-muted">Fase de grupos</small></div><span class="frm-pill">Em andamento</span></div>
              <div class="frm-list-item"><img class="frm-list-logo" data-frm-logo src="/api/brand/icon?v=frm-2026-07-13" /><div><strong>Copa Hollow Nexus</strong><br><small class="frm-muted">Oitavas de final</small></div><span class="frm-pill">Em andamento</span></div>
              <div class="frm-list-item"><img class="frm-list-logo" data-frm-logo src="/api/brand/icon?v=frm-2026-07-13" /><div><strong>Supercopa HNX</strong><br><small class="frm-muted">Final</small></div><span class="frm-pill">Em breve</span></div>
              <div class="frm-list-item"><img class="frm-list-logo" data-frm-logo src="/api/brand/icon?v=frm-2026-07-13" /><div><strong>Torneio de Novatos</strong><br><small class="frm-muted">Inscrições abertas</small></div><span class="frm-pill green">Inscrições</span></div>
            </div>
          </article>

          <article class="frm-card">
            <p class="frm-eyebrow">Ranking de clubes</p>
            <h3>Top 5 oficial</h3>
            <div class="frm-list">
              <div class="frm-list-item"><b>1</b><div><strong>Hollow Nexus FC</strong><br><small class="frm-muted">6 jogos</small></div><span>127 pts</span></div>
              <div class="frm-list-item"><b>2</b><div><strong>Revenant Strike</strong><br><small class="frm-muted">6 jogos</small></div><span>118 pts</span></div>
              <div class="frm-list-item"><b>3</b><div><strong>Void Legacy</strong><br><small class="frm-muted">6 jogos</small></div><span>105 pts</span></div>
              <div class="frm-list-item"><b>4</b><div><strong>Noctis Club</strong><br><small class="frm-muted">6 jogos</small></div><span>98 pts</span></div>
              <div class="frm-list-item"><b>5</b><div><strong>Prime Elite</strong><br><small class="frm-muted">6 jogos</small></div><span>92 pts</span></div>
            </div>
          </article>

          <article class="frm-card">
            <p class="frm-eyebrow">Últimas notícias</p>
            <h3>Comunicados oficiais</h3>
            <div class="frm-news">
              <article><div class="frm-news-thumb"></div><div><span class="frm-pill">Comunicado</span><h4>Novo regulamento da temporada</h4><p class="frm-muted">Atualizações importantes sobre inscrições, transferências e penalizações.</p></div></article>
              <article><div class="frm-news-thumb"></div><div><span class="frm-pill">Competição</span><h4>Resultados da rodada</h4><p class="frm-muted">Confira os resultados oficiais da última rodada.</p></div></article>
              <article><div class="frm-news-thumb"></div><div><span class="frm-pill">Federação</span><h4>Novos clubes afiliados</h4><p class="frm-muted">Acompanhe os clubes que chegaram à federação.</p></div></article>
            </div>
          </article>
        </div>
      </section>
    </main>
  </div>
  <script src="/js/core/api.js"></script>
  <script src="/js/core/global-navigation-shell.js"></script>
  <script src="/js/core/federation-portal.js?v=2026-07-13-frm-v1"></script>
  <script src="/js/pages/dashboard.js"></script>
</body>
</html>`;

function ensureDir(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
}

function writeFileIfChanged(file, content) {
  ensureDir(file);
  const before = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  if (before !== content) {
    fs.writeFileSync(file, content, 'utf8');
    changed = true;
  }
}

function injectAssetTags(html) {
  let next = html;
  if (!next.includes('/css/federation-portal.css')) {
    next = next.replace('</head>', '  <link rel="stylesheet" href="' + CSS_HREF + '" />\n</head>');
  }
  if (!next.includes('/js/core/federation-portal.js')) {
    if (next.includes('</body>')) {
      next = next.replace('</body>', '  <script src="' + JS_SRC + '"></script>\n</body>');
    }
  }
  return next;
}

function patchHtmlPage(file) {
  if (!file.endsWith('.html')) return;
  if (path.resolve(file) === path.resolve(dashboardFile)) return;
  const before = fs.readFileSync(file, 'utf8');
  const after = injectAssetTags(before);
  if (after !== before) {
    fs.writeFileSync(file, after, 'utf8');
    changed = true;
  }
}

function simplePage(title, key, heading, body, actionHref, actionText) {
  return '<!DOCTYPE html>\n<html lang="pt-BR">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>' + title + ' | Hollow Nexus FRM</title>\n  <link rel="icon" href="/api/brand/icon?v=frm-2026-07-13" />\n  <link rel="stylesheet" href="/css/style.css" />\n  <link rel="stylesheet" href="/css/organization.css" />\n  <link rel="stylesheet" href="/css/site-cleanup.css" />\n  <link rel="stylesheet" href="' + CSS_HREF + '" />\n</head>\n<body class="va-organized-body frm-federation-body" data-page="' + key + '">\n  <div class="va-shell">\n    <aside class="va-sidebar"><div class="va-brand frm-brand"><img data-frm-logo src="/api/brand/icon?v=frm-2026-07-13" alt="Hollow Nexus FRM" /><div><small>Federação</small><strong>the HOLLOW NEXUS <span>FRM</span></strong></div></div><nav class="va-nav"></nav></aside>\n    <main class="va-main">\n      <header class="va-topbar frm-topbar"><nav class="frm-top-tabs"></nav><div class="va-topbar-tools frm-header-actions"></div></header>\n      <section class="frm-home"><article class="frm-hero"><div><p class="frm-eyebrow">Hollow Nexus FRM</p><h1>' + heading + '</h1><h2>Federação Comunitária de Rematch</h2><p>' + body + '</p><div class="frm-actions"><a class="frm-btn primary" href="' + actionHref + '">' + actionText + '</a><a class="frm-btn" href="/pages/dashboard.html">Voltar ao portal</a></div></div><div class="frm-hero-logo-wrap"><img class="frm-hero-logo" data-frm-logo src="/api/brand/icon?v=frm-2026-07-13" alt="Logo Hollow Nexus FRM" /></div></article></section>\n    </main>\n  </div>\n  <script src="/js/core/api.js"></script>\n  <script src="/js/core/global-navigation-shell.js"></script>\n  <script src="' + JS_SRC + '"></script>\n</body>\n</html>';
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

writeFileIfChanged(cssFile, FEDERATION_CSS);
writeFileIfChanged(jsFile, FEDERATION_JS);
writeFileIfChanged(dashboardFile, DASHBOARD_HTML);
writeFileIfChanged(path.join(pagesDir, 'federacao.html'), simplePage('Sobre a Federação', 'federacao', 'Sobre a Federação', 'A Hollow Nexus FRM organiza clubes, atletas, competições, rankings e regulamentos para estruturar o cenário comunitário de Rematch.', '/pages/formularios.html', 'Solicitar afiliação'));
writeFileIfChanged(path.join(pagesDir, 'regulamento.html'), simplePage('Regulamento', 'regulamento', 'Regulamento Oficial', 'Central de regras da federação: inscrições, partidas, WO, transferências, conduta, punições e organização competitiva.', '/pages/termos.html', 'Ver termos atuais'));
writeFileIfChanged(path.join(pagesDir, 'prancheta-tatica.html'), simplePage('Prancheta Tática', 'prancheta', 'Prancheta Tática 5v5', 'Área preparada para montar formações de Rematch com exatamente cinco jogadores por lado, incluindo goleiro, sem permitir sexto titular.', '/pages/times.html', 'Gerenciar elenco'));

walk(pagesDir).forEach(patchHtmlPage);

console.log(changed ? '[Federacao] Portal Hollow Nexus FRM integrado como estrutura principal.' : '[Federacao] Portal Hollow Nexus FRM ja estava integrado.');