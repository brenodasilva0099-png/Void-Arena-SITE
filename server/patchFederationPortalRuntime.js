const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const pagesDir = path.join(ROOT, 'public', 'pages');
const cssFile = path.join(ROOT, 'public', 'css', 'federation-portal.css');
const jsFile = path.join(ROOT, 'public', 'js', 'core', 'federation-portal.js');
const dashboardFile = path.join(pagesDir, 'dashboard.html');
let changed = false;

const BUILD = '2026-07-13-frm-reference-v3';
const LOGO_SRC = '/api/brand/icon?v=frm-reference-v3';

const FEDERATION_CSS = String.raw`
:root {
  --frm-bg: #02040a;
  --frm-panel: #07101c;
  --frm-panel-2: #0a1322;
  --frm-border: rgba(142, 96, 255, .22);
  --frm-line: rgba(255,255,255,.07);
  --frm-purple: #8b5cf6;
  --frm-purple-2: #a855f7;
  --frm-text: #f8f7ff;
  --frm-muted: #9aa0b8;
  --frm-soft: rgba(139,92,246,.16);
  --frm-green: #22c55e;
}

* { box-sizing: border-box; }
html, body { margin: 0; min-height: 100%; }
body.frm-reference-page {
  color: var(--frm-text);
  background:
    radial-gradient(circle at 13% 0%, rgba(139,92,246,.15), transparent 24%),
    radial-gradient(circle at 78% 8%, rgba(139,92,246,.12), transparent 28%),
    linear-gradient(135deg, #02040a 0%, #050a13 44%, #070b18 100%);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  overflow-x: hidden;
}

.frm-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 244px minmax(0, 1fr);
}

.frm-sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  padding: 18px 14px 18px 20px;
  border-right: 1px solid rgba(142,96,255,.24);
  background: linear-gradient(180deg, rgba(4,8,16,.98), rgba(2,4,10,.96));
}

.frm-brand {
  display: flex;
  align-items: center;
  gap: 13px;
  margin: 0 0 24px;
}
.frm-brand img {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 999px;
  border: 1px solid rgba(162,119,255,.42);
  background: #000;
  box-shadow: 0 0 24px rgba(139,92,246,.55);
}
.frm-brand small {
  display: block;
  color: #d8d1ef;
  font-size: 11px;
  line-height: 1;
  letter-spacing: .06em;
}
.frm-brand strong {
  display: block;
  margin-top: 2px;
  color: #fff;
  font-size: 18px;
  letter-spacing: .05em;
  line-height: 1.1;
  white-space: nowrap;
}
.frm-brand strong span { color: var(--frm-purple-2); }
.frm-brand p {
  margin: 2px 0 0;
  color: var(--frm-muted);
  font-size: 12px;
}

.frm-nav-group { margin: 18px 0 0; }
.frm-nav-title {
  margin: 0 0 8px 4px;
  color: #b669ff;
  font-size: 12px;
  line-height: 1;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: .08em;
}
.frm-nav a {
  position: relative;
  min-height: 31px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 9px;
  border-radius: 8px;
  color: #c7c9d7;
  font-size: 13px;
  text-decoration: none;
  border: 1px solid transparent;
}
.frm-nav a span:first-child {
  width: 17px;
  color: #d7d7e8;
  text-align: center;
  opacity: .95;
}
.frm-nav a.active,
.frm-nav a:hover {
  color: #fff;
  border-color: rgba(162,119,255,.62);
  background: linear-gradient(90deg, rgba(139,92,246,.52), rgba(139,92,246,.12));
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.03), 0 0 18px rgba(139,92,246,.42);
}

.frm-main {
  min-width: 0;
  padding: 18px 18px 0 22px;
}

.frm-header {
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 12px;
}
.frm-tabs {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 26px;
  flex: 1;
  min-width: 0;
}
.frm-tabs a {
  position: relative;
  padding: 17px 0 15px;
  color: #cfd1df;
  font-size: 12px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: .08em;
  text-decoration: none;
}
.frm-tabs a.active { color: #fff; }
.frm-tabs a.active:after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  background: var(--frm-purple-2);
  box-shadow: 0 0 13px rgba(168,85,247,.9);
}
.frm-header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 0 0 auto;
}
.frm-btn {
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 18px;
  border-radius: 7px;
  border: 1px solid rgba(162,119,255,.38);
  background: rgba(8,13,24,.82);
  color: #fff;
  font-size: 12px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: .02em;
  text-decoration: none;
  white-space: nowrap;
}
.frm-btn.primary { background: linear-gradient(135deg, #8b5cf6, #5b21b6); border-color: rgba(177,133,255,.66); box-shadow: 0 0 24px rgba(139,92,246,.32); }
.frm-btn.discord { background: linear-gradient(135deg, #7c3aed, #5865f2); }
.frm-icon {
  position: relative;
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  color: #d5d7e5;
  font-size: 18px;
}
.frm-badge {
  position: absolute;
  top: 0;
  right: 0;
  min-width: 16px;
  height: 16px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: #7c3aed;
  color: #fff;
  font-size: 10px;
  font-weight: 900;
}

.frm-top-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 520px;
  gap: 16px;
}
.frm-hero,
.frm-card,
.frm-stat,
.frm-footer {
  border: 1px solid var(--frm-border);
  background: linear-gradient(180deg, rgba(7,13,24,.92), rgba(5,10,18,.94));
  border-radius: 7px;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.018);
}
.frm-hero {
  min-height: 350px;
  position: relative;
  overflow: hidden;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  align-items: center;
  padding: 44px 48px;
  background:
    radial-gradient(circle at 76% 46%, rgba(139,92,246,.55), transparent 21%),
    radial-gradient(circle at 82% 36%, rgba(168,85,247,.42), transparent 13%),
    linear-gradient(135deg, rgba(8,12,22,.98), rgba(11,8,28,.94));
}
.frm-hero:before {
  content: '';
  position: absolute;
  inset: 0;
  opacity: .58;
  background:
    radial-gradient(circle at 77% 50%, rgba(194,154,255,.35), transparent 7%),
    radial-gradient(circle at 82% 22%, rgba(96,165,250,.12), transparent 16%),
    linear-gradient(120deg, transparent 0 54%, rgba(139,92,246,.09) 55% 72%, transparent 73%);
}
.frm-hero > * { position: relative; z-index: 1; }
.frm-eyebrow {
  margin: 0 0 16px;
  color: #b669ff;
  font-size: 12px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: .08em;
}
.frm-hero h1 {
  margin: 0;
  color: #fff;
  font-size: 42px;
  line-height: 1;
  letter-spacing: .04em;
  font-weight: 800;
}
.frm-hero h1 span { color: var(--frm-purple-2); }
.frm-hero h2 {
  margin: 15px 0 0;
  color: #d8d4e8;
  font-size: 24px;
  line-height: 1.2;
  font-weight: 500;
  letter-spacing: .02em;
}
.frm-hero p {
  max-width: 610px;
  margin: 20px 0 0;
  color: #b2b6c8;
  font-size: 15px;
  line-height: 1.65;
}
.frm-hero-actions {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  max-width: 900px;
  margin-top: 46px;
}
.frm-hero-logo-wrap { display: grid; place-items: center; }
.frm-hero-logo {
  width: 260px;
  height: 260px;
  border-radius: 999px;
  object-fit: cover;
  border: 7px solid rgba(0,0,0,.38);
  box-shadow: 0 0 0 1px rgba(162,119,255,.48), 0 0 58px rgba(139,92,246,.58);
  background: #000;
}

.frm-right-stack { display: grid; grid-template-rows: 142px 178px 1fr; gap: 12px; }
.frm-card { padding: 17px 19px; overflow: hidden; }
.frm-card h2, .frm-card h3 { margin: 0; color: #fff; }
.frm-card h2 { font-size: 22px; }
.frm-card h3 { font-size: 16px; }
.frm-muted { color: var(--frm-muted); }
.frm-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 24px;
  padding: 0 11px;
  border-radius: 5px;
  color: #d3b8ff;
  background: rgba(139,92,246,.22);
  border: 1px solid rgba(139,92,246,.25);
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
}
.frm-pill.green { color: #86efac; background: rgba(34,197,94,.16); border-color: rgba(34,197,94,.25); }
.frm-season-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.frm-date-row { display: flex; justify-content: space-between; margin-top: 18px; color: #858ca3; font-size: 12px; }
.frm-progress { height: 8px; margin-top: 12px; border-radius: 999px; background: rgba(255,255,255,.09); overflow: hidden; }
.frm-progress span { display: block; width: var(--value,47%); height: 100%; background: linear-gradient(90deg, #7c3aed, #a855f7); box-shadow: 0 0 16px rgba(168,85,247,.75); }
.frm-match { display: grid; grid-template-columns: 1fr 26px 1fr 116px 76px; align-items: center; gap: 9px; padding: 9px 0; border-bottom: 1px solid var(--frm-line); }
.frm-match:last-child { border-bottom: 0; }
.frm-team { display: grid; grid-template-columns: 32px minmax(0, 1fr); align-items: center; gap: 8px; min-width: 0; }
.frm-team img, .frm-mini-logo { width: 32px; height: 32px; border-radius: 999px; object-fit: cover; border: 1px solid rgba(162,119,255,.42); }
.frm-team strong { font-size: 11px; line-height: 1.1; }
.frm-match b { color: #fff; font-size: 13px; text-align: center; }
.frm-match-info { color: #a7adbe; font-size: 11px; line-height: 1.3; }
.frm-match .frm-btn { min-height: 31px; padding: 0 12px; font-size: 11px; }
.frm-status-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 10px; }
.frm-status-grid strong { display: block; color: #fff; font-size: 20px; }
.frm-status-grid small { color: var(--frm-muted); }

.frm-stats {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}
.frm-stat {
  min-height: 95px;
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr);
  align-items: center;
  gap: 13px;
  padding: 14px 17px;
}
.frm-stat-icon {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  color: #d8c7ff;
  font-size: 24px;
  background: rgba(139,92,246,.22);
}
.frm-stat span { display: block; color: #9299ae; font-size: 11px; text-transform: uppercase; letter-spacing: .05em; }
.frm-stat strong { display: block; margin-top: 4px; color: #fff; font-size: 26px; line-height: 1; }
.frm-stat small { display: block; margin-top: 4px; color: #9aa0b8; font-size: 12px; }
.frm-stat small.green { color: #73e58b; }

.frm-lower {
  display: grid;
  grid-template-columns: 1fr 1fr 1.32fr;
  gap: 14px;
  margin-top: 14px;
}
.frm-card-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 13px; }
.frm-card-head a { color: #b669ff; text-decoration: none; font-size: 11px; font-weight: 900; text-transform: uppercase; }
.frm-list { display: grid; gap: 0; }
.frm-list-item {
  min-height: 56px;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 9px 0;
  border-bottom: 1px solid var(--frm-line);
}
.frm-list-item:last-child { border-bottom: 0; }
.frm-list-logo { width: 38px; height: 38px; border-radius: 999px; object-fit: cover; border: 1px solid rgba(162,119,255,.35); }
.frm-list-item strong { color: #fff; font-size: 13px; }
.frm-list-item small { color: #9299ae; font-size: 12px; }
.frm-rank-badge { width: 27px; height: 27px; display: grid; place-items: center; border: 1px solid rgba(245,158,11,.55); color: #fff; border-radius: 5px; font-weight: 900; }
.frm-rank-score { color: #fff; font-size: 13px; }
.frm-news { display: grid; gap: 8px; }
.frm-news article { min-height: 80px; display: grid; grid-template-columns: 142px minmax(0, 1fr) 64px; gap: 12px; padding: 8px; border-radius: 8px; background: rgba(255,255,255,.025); border: 1px solid var(--frm-line); }
.frm-news-thumb { border-radius: 6px; background: radial-gradient(circle at 30% 30%, rgba(139,92,246,.9), transparent 34%), linear-gradient(135deg, rgba(64,22,120,.85), rgba(8,14,29,.85)); }
.frm-news h4 { margin: 5px 0 3px; color: #fff; font-size: 13px; }
.frm-news p { margin: 0; color: #a7adbe; font-size: 12px; line-height: 1.35; }
.frm-news time { align-self: end; justify-self: end; color: #727a90; font-size: 11px; }

.frm-footer {
  min-height: 142px;
  display: grid;
  grid-template-columns: 1.35fr .7fr .7fr .75fr 1.15fr;
  gap: 24px;
  margin-top: 16px;
  padding: 24px 26px;
  border-radius: 0;
}
.frm-footer-brand { display: flex; align-items: center; gap: 13px; }
.frm-footer-brand img { width: 66px; height: 66px; border-radius: 999px; object-fit: cover; border: 1px solid rgba(162,119,255,.42); }
.frm-footer strong { color: #fff; font-size: 18px; letter-spacing: .04em; }
.frm-footer strong span { color: var(--frm-purple-2); }
.frm-footer p, .frm-footer a { color: #9aa0b8; font-size: 13px; line-height: 1.55; text-decoration: none; }
.frm-footer h4 { margin: 0 0 8px; color: #b669ff; font-size: 12px; text-transform: uppercase; letter-spacing: .08em; }
.frm-socials { display: flex; gap: 9px; }
.frm-socials span { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 6px; border: 1px solid var(--frm-line); background: rgba(255,255,255,.04); }
.frm-legal { color: #8a91a7; font-size: 12px; line-height: 1.6; }

@media (max-width: 1380px) {
  .frm-shell { grid-template-columns: 228px minmax(0, 1fr); }
  .frm-top-layout { grid-template-columns: 1fr; }
  .frm-right-stack { grid-template-rows: auto; }
  .frm-hero { grid-template-columns: 1fr 280px; }
  .frm-hero-logo { width: 220px; height: 220px; }
  .frm-lower { grid-template-columns: 1fr; }
}
@media (max-width: 980px) {
  .frm-shell { display: block; }
  .frm-sidebar { position: relative; height: auto; }
  .frm-header { height: auto; align-items: flex-start; flex-direction: column; }
  .frm-tabs { justify-content: flex-start; gap: 14px; }
  .frm-hero { grid-template-columns: 1fr; }
  .frm-hero-logo-wrap { display: none; }
  .frm-hero-actions, .frm-stats, .frm-footer { grid-template-columns: 1fr; }
}
`;

const FEDERATION_JS = String.raw`(function () {
  var logo = '/api/brand/icon?v=frm-reference-v3';
  var fallback = '/assets/hollow-nexus.png';
  document.querySelectorAll('[data-frm-logo]').forEach(function (img) {
    img.src = logo;
    img.onerror = function () {
      if (img.src.indexOf(fallback) < 0) img.src = fallback;
    };
  });
})();`;

const DASHBOARD_HTML = String.raw`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>the Hollow Nexus FRM | Federação Comunitária de Rematch</title>
  <link rel="icon" href="/api/brand/icon?v=frm-reference-v3" />
  <link rel="stylesheet" href="/css/federation-portal.css?v=2026-07-13-frm-reference-v3" />
</head>
<body class="frm-reference-page">
  <div class="frm-shell">
    <aside class="frm-sidebar">
      <div class="frm-brand">
        <img data-frm-logo src="/api/brand/icon?v=frm-reference-v3" alt="Hollow Nexus FRM" />
        <div><small>the</small><strong>HOLLOW NEXUS <span>FRM</span></strong><p>Federação Comunitária de Rematch</p></div>
      </div>
      <nav class="frm-nav">
        <div class="frm-nav-group"><div class="frm-nav-title">Federação</div><a class="active" href="/pages/dashboard.html"><span>⌂</span>Início</a><a href="/pages/federacao.html"><span>ⓘ</span>Sobre a Federação</a><a href="/pages/regulamento.html"><span>▤</span>Regulamento</a><a href="/pages/atualizacoes.html"><span>▧</span>Atualizações</a><a href="/pages/suporte.html"><span>?</span>Suporte</a></div>
        <div class="frm-nav-group"><div class="frm-nav-title">Competitivo</div><a href="/pages/eventos.html"><span>♕</span>Competições</a><a href="/pages/eventos.html"><span>▣</span>Eventos</a><a href="/pages/chaveamento.html"><span>⌘</span>Chaveamento</a><a href="/pages/grupos.html"><span>☷</span>Grupos</a><a href="/pages/resultados.html"><span>◉</span>Resultados</a><a href="/pages/rankings.html"><span>⌁</span>Rankings</a><a href="/pages/eventos.html"><span>▥</span>Calendário</a></div>
        <div class="frm-nav-group"><div class="frm-nav-title">Clubes</div><a href="/pages/times.html"><span>♙</span>Clubes Afiliados</a><a href="/pages/formularios.html"><span>◈</span>Solicitar Afiliação</a><a href="/pages/times.html"><span>♧</span>Elencos</a><a href="/pages/prancheta-tatica.html"><span>▩</span>Prancheta Tática</a></div>
        <div class="frm-nav-group"><div class="frm-nav-title">Atletas</div><a href="/pages/jogadores.html"><span>♙</span>Jogadores Registrados</a><a href="/pages/recrutamento.html"><span>♧</span>Mercado / Recrutamento</a><a href="/pages/rankings.html"><span>◎</span>Ranking de Jogadores</a></div>
        <div class="frm-nav-group"><div class="frm-nav-title">Administração</div><a href="/pages/formularios.html"><span>▤</span>Formulários</a><a href="/pages/permissoes.html"><span>ⓘ</span>Permissões</a><a href="/pages/configuracoes.html"><span>⚙</span>Configurações</a><a href="/pages/analise-partidas.html"><span>♧</span>Análise de Partidas</a></div>
      </nav>
    </aside>

    <main class="frm-main">
      <header class="frm-header">
        <nav class="frm-tabs"><a class="active" href="/pages/dashboard.html">Início</a><a href="/pages/federacao.html">Federação⌄</a><a href="/pages/eventos.html">Competitivo⌄</a><a href="/pages/times.html">Clubes⌄</a><a href="/pages/jogadores.html">Atletas⌄</a><a href="/pages/configuracoes.html">Administração⌄</a></nav>
        <div class="frm-header-actions"><a class="frm-btn" href="/pages/perfil.html">♙ Entrar / Painel</a><a class="frm-btn discord" href="/api/discord/server/open" target="_blank" rel="noopener noreferrer">💬 Discord</a><span class="frm-icon">🔔<b class="frm-badge">3</b></span><span class="frm-icon">✉<b class="frm-badge">5</b></span></div>
      </header>

      <section class="frm-top-layout">
        <article class="frm-hero">
          <div><p class="frm-eyebrow">Bem-vindo à</p><h1>the HOLLOW NEXUS <span>FRM</span></h1><h2>Federação Comunitária de Rematch</h2><p>Organizamos, regulamentamos e elevamos o cenário competitivo.<br />Uma federação. Muitos clubes. Um objetivo: o topo.</p><div class="frm-hero-actions"><a class="frm-btn primary" href="/pages/formularios.html">♙ Afiliar Clube</a><a class="frm-btn" href="/pages/eventos.html">♕ Ver Competições</a><a class="frm-btn" href="/pages/rankings.html">⌁ Ranking Oficial</a><a class="frm-btn" href="/pages/regulamento.html">▤ Regulamento</a></div></div>
          <div class="frm-hero-logo-wrap"><img class="frm-hero-logo" data-frm-logo src="/api/brand/icon?v=frm-reference-v3" alt="Hollow Nexus FRM" /></div>
        </article>

        <aside class="frm-right-stack">
          <article class="frm-card"><div class="frm-season-head"><div><p class="frm-eyebrow">Temporada atual</p><h2>Temporada 1 - 2025</h2></div><span class="frm-pill">Em andamento</span></div><div class="frm-date-row"><span>⌚ Início: 01/05/2025</span><span>◴ Término: 31/08/2025</span></div><div class="frm-progress" style="--value:47%"><span></span></div></article>
          <article class="frm-card"><div class="frm-card-head"><p class="frm-eyebrow">Próximas Partidas</p><a href="/pages/eventos.html">Ver Calendário</a></div><div class="frm-match"><div class="frm-team"><img data-frm-logo src="/api/brand/icon?v=frm-reference-v3"/><strong>Hollow Nexus FC</strong></div><b>VS</b><div class="frm-team"><img data-frm-logo src="/api/brand/icon?v=frm-reference-v3"/><strong>Revenant Strikes</strong></div><div class="frm-match-info">Hoje • 21:30<br/>Liga Hollow Nexus<br/>Rodada 7</div><a class="frm-btn" href="/pages/eventos.html">Assistir</a></div><div class="frm-match"><div class="frm-team"><img data-frm-logo src="/api/brand/icon?v=frm-reference-v3"/><strong>Void Legacy</strong></div><b>VS</b><div class="frm-team"><img data-frm-logo src="/api/brand/icon?v=frm-reference-v3"/><strong>Noctis Club</strong></div><div class="frm-match-info">Amanhã • 20:00<br/>Liga Hollow Nexus<br/>Rodada 8</div><a class="frm-btn" href="/pages/eventos.html">Assistir</a></div><div class="frm-match"><div class="frm-team"><img data-frm-logo src="/api/brand/icon?v=frm-reference-v3"/><strong>Death Seekers</strong></div><b>VS</b><div class="frm-team"><img data-frm-logo src="/api/brand/icon?v=frm-reference-v3"/><strong>Prime Elite</strong></div><div class="frm-match-info">25/06 • 22:00<br/>Copa Hollow Nexus<br/>Oitavas</div><a class="frm-btn" href="/pages/eventos.html">Assistir</a></div></article>
          <article class="frm-card"><p class="frm-eyebrow">Status da Federação</p><div class="frm-status-grid"><div><small>Progresso da Temporada</small><strong>312 <span class="frm-muted">/ 650</span></strong><div class="frm-progress" style="--value:48%"><span></span></div></div><div><small>Gols marcados</small><strong>1.247</strong><p class="frm-muted">Média: 4,0 por partida</p></div></div></article>
        </aside>
      </section>

      <section class="frm-stats"><article class="frm-stat"><div class="frm-stat-icon">♧</div><div><span>Clubes Afiliados</span><strong>24</strong><small class="green">+3 este mês</small></div></article><article class="frm-stat"><div class="frm-stat-icon">♙</div><div><span>Atletas Registrados</span><strong>127</strong><small class="green">+12 este mês</small></div></article><article class="frm-stat"><div class="frm-stat-icon">♕</div><div><span>Competições Ativas</span><strong>4</strong><small>2 ligas, 2 copas</small></div></article><article class="frm-stat"><div class="frm-stat-icon">▩</div><div><span>Partidas Disputadas</span><strong>312</strong><small class="green">+28 esta semana</small></div></article><article class="frm-stat"><div class="frm-stat-icon">⚽</div><div><span>Gols Marcados</span><strong>1.247</strong><small>Média: 4,0 por partida</small></div></article></section>

      <section class="frm-lower">
        <article class="frm-card"><div class="frm-card-head"><p class="frm-eyebrow">Competições em Destaque</p><a href="/pages/eventos.html">Ver Todas</a></div><div class="frm-list"><div class="frm-list-item"><img class="frm-list-logo" data-frm-logo src="/api/brand/icon?v=frm-reference-v3"/><div><strong>Liga Hollow Nexus</strong><br/><small>Fase de Grupos · Rodada 7</small></div><span class="frm-pill">Em andamento</span></div><div class="frm-list-item"><img class="frm-list-logo" data-frm-logo src="/api/brand/icon?v=frm-reference-v3"/><div><strong>Copa Hollow Nexus</strong><br/><small>Oitavas de Final</small></div><span class="frm-pill">Em andamento</span></div><div class="frm-list-item"><img class="frm-list-logo" data-frm-logo src="/api/brand/icon?v=frm-reference-v3"/><div><strong>Supercopa HNX</strong><br/><small>Final · 23/06</small></div><span class="frm-pill">Em breve</span></div><div class="frm-list-item"><img class="frm-list-logo" data-frm-logo src="/api/brand/icon?v=frm-reference-v3"/><div><strong>Torneio de Novatos</strong><br/><small>Inscrições Abertas</small></div><span class="frm-pill green">Inscrições</span></div></div></article>
        <article class="frm-card"><div class="frm-card-head"><p class="frm-eyebrow">Ranking de Clubes</p><a href="/pages/rankings.html">Ver Ranking Completo</a></div><div class="frm-list"><div class="frm-list-item"><b class="frm-rank-badge">1</b><div><strong>Hollow Nexus FC</strong></div><span class="frm-rank-score">127&nbsp;&nbsp;&nbsp;6</span></div><div class="frm-list-item"><b class="frm-rank-badge">2</b><div><strong>Revenant Strikes</strong></div><span class="frm-rank-score">118&nbsp;&nbsp;&nbsp;6</span></div><div class="frm-list-item"><b class="frm-rank-badge">3</b><div><strong>Void Legacy</strong></div><span class="frm-rank-score">105&nbsp;&nbsp;&nbsp;6</span></div><div class="frm-list-item"><b class="frm-rank-badge">4</b><div><strong>Noctis Club</strong></div><span class="frm-rank-score">98&nbsp;&nbsp;&nbsp;6</span></div><div class="frm-list-item"><b class="frm-rank-badge">5</b><div><strong>Prime Elite</strong></div><span class="frm-rank-score">92&nbsp;&nbsp;&nbsp;6</span></div></div></article>
        <article class="frm-card"><div class="frm-card-head"><p class="frm-eyebrow">Últimas Notícias</p><a href="/pages/atualizacoes.html">Ver Todas</a></div><div class="frm-news"><article><div class="frm-news-thumb"></div><div><span class="frm-pill">Comunicado</span><h4>Novo regulamento da temporada 1</h4><p>Atualizações importantes sobre inscrições, transferências e penalizações.</p></div><time>2 horas atrás</time></article><article><div class="frm-news-thumb"></div><div><span class="frm-pill">Competição</span><h4>Resultados da Rodada 6</h4><p>Confira todos os resultados da última rodada.</p></div><time>5 horas atrás</time></article><article><div class="frm-news-thumb"></div><div><span class="frm-pill">Federação</span><h4>Novos clubes afiliados</h4><p>Confira os 3 novos clubes que se juntaram à federação.</p></div><time>2 dias atrás</time></article></div></article>
      </section>

      <footer class="frm-footer"><div><div class="frm-footer-brand"><img data-frm-logo src="/api/brand/icon?v=frm-reference-v3"/><div><strong>the HOLLOW NEXUS <span>FRM</span></strong><p>Federação Comunitária de Rematch</p></div></div><p>Elevando o cenário competitivo de Rematch.</p></div><div><h4>Links rápidos</h4><p><a href="/pages/regulamento.html">Regulamento</a></p><p><a href="/pages/termos.html">Termos de Uso</a></p></div><div><h4>Contato</h4><p>contato@hollownexusfrm.com</p><p>Discord Oficial</p><p><a href="/pages/suporte.html">Suporte</a></p></div><div><h4>Redes sociais</h4><div class="frm-socials"><span>💬</span><span>𝕏</span><span>◎</span><span>▶</span></div></div><div><p class="frm-legal">Projeto comunitário independente.<br/>Não afiliado, patrocinado ou endossado pela Sloclap, Kepler Interactive ou Rematch.</p><p class="frm-legal">© 2025 The Hollow Nexus FRM. Todos os direitos reservados.</p></div></footer>
    </main>
  </div>
  <script src="/js/core/federation-portal.js?v=2026-07-13-frm-reference-v3"></script>
</body>
</html>`;

function ensureDir(file) { fs.mkdirSync(path.dirname(file), { recursive: true }); }
function writeFileIfChanged(file, content) {
  ensureDir(file);
  const before = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  if (before !== content) {
    fs.writeFileSync(file, content, 'utf8');
    changed = true;
  }
}

writeFileIfChanged(cssFile, FEDERATION_CSS);
writeFileIfChanged(jsFile, FEDERATION_JS);
writeFileIfChanged(dashboardFile, DASHBOARD_HTML);

console.log(changed ? '[Federacao] Dashboard FRM recriada 1:1 pela imagem de referencia.' : '[Federacao] Dashboard FRM 1:1 ja estava aplicada.');
