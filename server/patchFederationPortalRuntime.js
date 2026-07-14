const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const pagesDir = path.join(ROOT, 'public', 'pages');
const cssFile = path.join(ROOT, 'public', 'css', 'federation-portal.css');
const jsFile = path.join(ROOT, 'public', 'js', 'core', 'federation-portal.js');
const dashboardFile = path.join(pagesDir, 'dashboard.html');
let changed = false;

const BUILD = '2026-07-13-frm-v2-clean';
const CSS_HREF = '/css/federation-portal.css?v=' + BUILD;
const JS_SRC = '/js/core/federation-portal.js?v=' + BUILD;
const LOGO_SRC = '/api/brand/icon?v=frm-clean-v2';

const FEDERATION_CSS = String.raw`
:root {
  --frm-bg: #03040a;
  --frm-bg-soft: #070817;
  --frm-card: rgba(9, 12, 26, .86);
  --frm-card-2: rgba(12, 15, 32, .94);
  --frm-border: rgba(162, 119, 255, .18);
  --frm-border-strong: rgba(162, 119, 255, .42);
  --frm-purple: #8b5cf6;
  --frm-purple-2: #a855f7;
  --frm-cyan: #22d3ee;
  --frm-green: #22c55e;
  --frm-text: #f8f7ff;
  --frm-muted: #a9a1c7;
  --frm-line: rgba(255,255,255,.07);
  --frm-glow: 0 0 36px rgba(139,92,246,.34);
}

* { box-sizing: border-box; }
html, body { margin: 0; min-height: 100%; }
body.frm-clean-page {
  min-height: 100vh;
  color: var(--frm-text);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background:
    radial-gradient(circle at 15% 0%, rgba(139, 92, 246, .22), transparent 30%),
    radial-gradient(circle at 83% 6%, rgba(168, 85, 247, .16), transparent 28%),
    linear-gradient(135deg, #03040a, #070815 48%, #0a071c);
  overflow-x: hidden;
}

a { color: inherit; }
.frm-shell { display: grid; grid-template-columns: 258px minmax(0, 1fr); min-height: 100vh; }
.frm-sidebar {
  position: sticky; top: 0; height: 100vh; overflow: auto;
  padding: 18px 16px 22px;
  border-right: 1px solid rgba(162,119,255,.17);
  background: linear-gradient(180deg, rgba(4,5,12,.96), rgba(6,7,18,.88));
  box-shadow: inset -1px 0 0 rgba(255,255,255,.03);
}
.frm-brand { display: flex; align-items: center; gap: 12px; min-height: 64px; margin-bottom: 18px; }
.frm-logo {
  width: 58px; height: 58px; border-radius: 18px; object-fit: cover;
  border: 1px solid rgba(162,119,255,.45); background: #05050b; box-shadow: var(--frm-glow);
}
.frm-brand small { display: block; color: var(--frm-muted); text-transform: uppercase; letter-spacing: .14em; font-size: 10px; font-weight: 900; }
.frm-brand strong { display: block; color: #fff; font-size: 16px; letter-spacing: .02em; }
.frm-brand span, .frm-accent { color: var(--frm-purple-2); }
.frm-nav-title { margin: 18px 0 8px; color: #b986ff; text-transform: uppercase; letter-spacing: .13em; font-size: 11px; font-weight: 950; }
.frm-nav { display: grid; gap: 4px; }
.frm-nav a {
  display: flex; align-items: center; gap: 10px; min-height: 38px; padding: 9px 11px;
  border-radius: 12px; color: #d8d1ee; text-decoration: none; font-size: 14px; font-weight: 750;
  border: 1px solid transparent; transition: .18s ease;
}
.frm-nav a:hover, .frm-nav a.active {
  color: #fff; background: linear-gradient(90deg, rgba(139,92,246,.36), rgba(139,92,246,.08));
  border-color: rgba(162,119,255,.42); box-shadow: 0 0 18px rgba(139,92,246,.18); transform: translateX(2px);
}
.frm-nav b { font: inherit; }
.frm-new { margin-left: auto; padding: 2px 7px; border-radius: 999px; background: linear-gradient(135deg, #8b5cf6, #6d28d9); color: #fff; font-size: 9px; font-weight: 950; }
.frm-join-card { margin-top: 18px; padding: 14px; border: 1px solid rgba(162,119,255,.28); border-radius: 16px; background: rgba(139,92,246,.1); }
.frm-join-card strong { display: block; color: #d8b4fe; margin-bottom: 6px; }
.frm-join-card p { margin: 0 0 12px; color: var(--frm-muted); font-size: 13px; line-height: 1.45; }

.frm-main { min-width: 0; padding: 18px 22px 0; }
.frm-header {
  display: grid; grid-template-columns: minmax(0,1fr) auto; align-items: center; gap: 18px;
  min-height: 62px; padding: 10px 14px; margin-bottom: 16px;
  border: 1px solid rgba(162,119,255,.15); border-radius: 22px;
  background: rgba(5,7,16,.74); backdrop-filter: blur(18px);
}
.frm-tabs { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; justify-content: center; }
.frm-tabs a { padding: 10px 13px; border-radius: 12px; text-decoration: none; color: #ded8f7; font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: .05em; }
.frm-tabs a.active, .frm-tabs a:hover { color: #fff; background: rgba(139,92,246,.16); box-shadow: inset 0 -2px 0 var(--frm-purple); }
.frm-actions-top { display: flex; align-items: center; gap: 10px; }
.frm-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 40px; padding: 10px 15px;
  border-radius: 12px; border: 1px solid rgba(162,119,255,.30); background: rgba(10,12,24,.78); color: #fff; text-decoration: none;
  font-weight: 900; font-size: 13px; white-space: nowrap;
}
.frm-btn.primary { border-color: rgba(162,119,255,.58); background: linear-gradient(135deg, #7c3aed, #5b21b6); box-shadow: 0 0 25px rgba(124,58,237,.36); }
.frm-btn.discord { background: linear-gradient(135deg, #5865f2, #6d28d9); }
.frm-icon-btn { width: 42px; padding: 0; }

.frm-grid-top { display: grid; grid-template-columns: minmax(0, 2.1fr) minmax(330px, .9fr); gap: 16px; }
.frm-card, .frm-hero, .frm-stat, .frm-footer {
  border: 1px solid var(--frm-border); border-radius: 22px; background: linear-gradient(180deg, rgba(11,14,30,.93), rgba(7,9,20,.88));
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.02); overflow: hidden;
}
.frm-hero {
  min-height: 356px; display: grid; grid-template-columns: minmax(0,1.25fr) 330px; align-items: center; gap: 20px;
  padding: 38px 42px; position: relative;
  background:
    radial-gradient(circle at 78% 45%, rgba(139,92,246,.48), transparent 27%),
    radial-gradient(circle at 35% 5%, rgba(34,211,238,.09), transparent 30%),
    linear-gradient(135deg, rgba(8,10,24,.98), rgba(13,8,35,.96));
}
.frm-hero:before {
  content: ""; position: absolute; inset: 0; opacity: .44; pointer-events: none;
  background: radial-gradient(circle at 78% 42%, rgba(168,85,247,.5), transparent 14%), linear-gradient(120deg, transparent 0 34%, rgba(139,92,246,.08) 35% 62%, transparent 63% 100%);
}
.frm-hero > * { position: relative; z-index: 1; }
.frm-eyebrow { margin: 0 0 9px; color: #b986ff; text-transform: uppercase; letter-spacing: .14em; font-size: 12px; font-weight: 950; }
.frm-hero h1 { margin: 0; color: #fff; font-size: clamp(40px, 4.8vw, 72px); letter-spacing: -.065em; line-height: .95; }
.frm-hero h2 { margin: 14px 0 0; color: #ded8f7; text-transform: uppercase; letter-spacing: .03em; font-size: clamp(19px, 2vw, 28px); }
.frm-hero p { max-width: 640px; margin: 18px 0 0; color: var(--frm-muted); line-height: 1.7; font-size: 15px; }
.frm-hero-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 28px; }
.frm-hero-logo-wrap { display: grid; place-items: center; }
.frm-hero-logo { width: min(285px, 78%); aspect-ratio: 1; border-radius: 44px; object-fit: cover; border: 1px solid rgba(162,119,255,.42); background: rgba(0,0,0,.42); padding: 8px; box-shadow: 0 0 60px rgba(139,92,246,.48), inset 0 0 0 1px rgba(255,255,255,.04); }
.frm-side { display: grid; gap: 16px; }
.frm-card { padding: 18px; }
.frm-card h2, .frm-card h3 { margin: 0; color: #fff; }
.frm-muted { color: var(--frm-muted); }
.frm-pill { display: inline-flex; padding: 5px 9px; border-radius: 999px; background: rgba(139,92,246,.18); color: #d8b4fe; border: 1px solid rgba(162,119,255,.25); font-size: 11px; font-weight: 900; text-transform: uppercase; }
.frm-pill.green { background: rgba(34,197,94,.13); color: #86efac; border-color: rgba(34,197,94,.25); }
.frm-progress { height: 8px; border-radius: 999px; background: rgba(255,255,255,.08); overflow: hidden; margin: 13px 0; }
.frm-progress span { display: block; width: var(--value, 48%); height: 100%; background: linear-gradient(90deg, #8b5cf6, #a855f7); box-shadow: 0 0 18px rgba(168,85,247,.55); }
.frm-match { display: grid; grid-template-columns: minmax(0,1fr) auto minmax(0,1fr) auto; gap: 10px; align-items: center; padding: 12px 0; border-top: 1px solid var(--frm-line); }
.frm-match:first-of-type { border-top: 0; }
.frm-match strong { font-size: 13px; }
.frm-match b { color: #fff; }

.frm-stats { display: grid; grid-template-columns: repeat(5, minmax(0,1fr)); gap: 12px; margin: 14px 0; }
.frm-stat { padding: 16px; display: flex; align-items: center; gap: 13px; min-height: 94px; }
.frm-stat-icon { width: 48px; height: 48px; border-radius: 15px; display: grid; place-items: center; background: rgba(139,92,246,.18); color: #d8b4fe; font-size: 23px; }
.frm-stat span { display: block; color: var(--frm-muted); text-transform: uppercase; letter-spacing: .06em; font-size: 11px; font-weight: 850; }
.frm-stat strong { display: block; margin-top: 3px; color: #fff; font-size: 25px; }
.frm-stat small { color: #86efac; }
.frm-lower { display: grid; grid-template-columns: 1fr 1fr 1.15fr; gap: 16px; }
.frm-list { display: grid; gap: 9px; margin-top: 14px; }
.frm-list-item { display: grid; grid-template-columns: 46px minmax(0,1fr) auto; align-items: center; gap: 11px; padding: 11px; border-radius: 15px; border: 1px solid rgba(255,255,255,.07); background: rgba(255,255,255,.026); }
.frm-list-logo { width: 42px; height: 42px; border-radius: 13px; object-fit: cover; border: 1px solid rgba(162,119,255,.32); }
.frm-news { display: grid; gap: 10px; margin-top: 14px; }
.frm-news article { display: grid; grid-template-columns: 112px minmax(0,1fr); gap: 12px; padding: 10px; border-radius: 15px; border: 1px solid rgba(255,255,255,.07); background: rgba(255,255,255,.026); }
.frm-news-thumb { min-height: 76px; border-radius: 12px; background: radial-gradient(circle at 50% 50%, rgba(139,92,246,.72), transparent 42%), linear-gradient(135deg, rgba(139,92,246,.26), rgba(34,211,238,.1)); }
.frm-news h4 { margin: 8px 0 4px; }
.frm-footer { margin-top: 18px; padding: 24px; display: grid; grid-template-columns: 1.35fr .75fr .75fr 1fr; gap: 24px; border-radius: 22px 22px 0 0; }
.frm-footer-brand { display: flex; align-items: center; gap: 14px; }
.frm-footer h4 { margin: 0 0 8px; color: #c4a6ff; text-transform: uppercase; letter-spacing: .1em; font-size: 12px; }
.frm-footer p { color: var(--frm-muted); line-height: 1.55; }
.frm-footer a { color: var(--frm-muted); text-decoration: none; }
.frm-legal { font-size: 12px; }

@media (max-width: 1280px) {
  .frm-shell { grid-template-columns: 245px minmax(0,1fr); }
  .frm-grid-top { grid-template-columns: 1fr; }
  .frm-hero { grid-template-columns: 1fr; }
  .frm-hero-logo-wrap { display: none; }
  .frm-stats { grid-template-columns: repeat(2, minmax(0,1fr)); }
  .frm-lower { grid-template-columns: 1fr; }
  .frm-footer { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 760px) {
  .frm-shell { display: block; }
  .frm-sidebar { position: relative; height: auto; }
  .frm-main { padding: 14px; }
  .frm-header { grid-template-columns: 1fr; }
  .frm-tabs { justify-content: flex-start; }
  .frm-stats, .frm-footer { grid-template-columns: 1fr; }
}
`;

const FEDERATION_JS = String.raw`(function(){
  const LOGO = '/api/brand/icon?v=frm-clean-v2';
  const FALLBACK = '/assets/hollow-nexus.png';
  function setLogo(img){ if(!img) return; img.onerror=function(){ if(img.src.indexOf(FALLBACK)<0) img.src=FALLBACK; }; img.src=LOGO; }
  function byKeys(data, keys){ for(const key of keys){ if(Array.isArray(data && data[key])) return data[key]; } return Array.isArray(data) ? data : []; }
  async function json(path){ const res = await fetch(path, {credentials:'include', cache:'no-store'}); if(!res.ok) throw new Error(String(res.status)); return res.json(); }
  async function hydrate(){
    document.querySelectorAll('[data-frm-logo]').forEach(setLogo);
    const stats = document.querySelectorAll('[data-frm-stat]');
    if(!stats.length) return;
    const results = await Promise.allSettled([json('/api/teams'), json('/api/players'), json('/api/events')]);
    const teams = results[0].status === 'fulfilled' ? byKeys(results[0].value, ['teams','items']) : [];
    const players = results[1].status === 'fulfilled' ? byKeys(results[1].value, ['players','users','items']) : [];
    const events = results[2].status === 'fulfilled' ? byKeys(results[2].value, ['events','tournaments','items']) : [];
    const fmt = new Intl.NumberFormat('pt-BR');
    const map = { clubes: teams.length ? fmt.format(teams.length) : '24', atletas: players.length ? fmt.format(players.length) : '127', competicoes: events.length ? fmt.format(events.length) : '4' };
    Object.keys(map).forEach(function(key){ document.querySelectorAll('[data-frm-stat="'+key+'"]').forEach(function(el){ el.textContent = map[key]; }); });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ hydrate().catch(function(){}); }, {once:true});
  else hydrate().catch(function(){});
})();`;

function sidebar(active = 'inicio') {
  const sections = [
    ['FEDERAÇÃO', [
      ['inicio','🏠','Início','/pages/dashboard.html'],
      ['federacao','◎','Sobre a Federação','/pages/federacao.html'],
      ['regulamento','▣','Regulamento','/pages/regulamento.html'],
      ['atualizacoes','▱','Atualizações','/pages/atualizacoes.html'],
      ['suporte','🛟','Suporte','/pages/suporte.html']
    ]],
    ['COMPETITIVO', [
      ['competicoes','🏆','Competições','/pages/eventos.html'],
      ['eventos','📅','Eventos','/pages/eventos.html'],
      ['chaveamento','🧩','Chaveamento','/pages/chaveamento.html'],
      ['grupos','⛓','Grupos','/pages/grupos.html'],
      ['resultados','📌','Resultados','/pages/resultados.html'],
      ['rankings','📊','Rankings','/pages/rankings.html']
    ]],
    ['CLUBES', [
      ['clubes','🛡️','Clubes Afiliados','/pages/times.html'],
      ['afiliacao','📥','Solicitar Afiliação','/pages/formularios.html'],
      ['elencos','👥','Elencos','/pages/times.html'],
      ['prancheta','🎯','Prancheta Tática','/pages/prancheta-tatica.html','NOVO']
    ]],
    ['ATLETAS', [
      ['atletas','👤','Jogadores Registrados','/pages/jogadores.html'],
      ['mercado','🤝','Mercado / Recrutamento','/pages/recrutamento.html'],
      ['ranking-jogadores','🥇','Ranking de Jogadores','/pages/rankings.html'],
      ['transferencias','🔁','Transferências','/pages/recrutamento.html']
    ]],
    ['ADMINISTRAÇÃO', [
      ['formularios','📋','Formulários','/pages/formularios.html'],
      ['permissoes','⚙️','Permissões','/pages/permissoes.html'],
      ['config','🔧','Configurações','/pages/configuracoes.html'],
      ['analise','🎥','Análise de Partidas','/pages/analise-partidas.html']
    ]]
  ];
  return '<aside class="frm-sidebar"><div class="frm-brand"><img class="frm-logo" data-frm-logo src="' + LOGO_SRC + '" alt="Hollow Nexus FRM"/><div><small>Federação</small><strong>the HOLLOW NEXUS <span>FRM</span></strong></div></div><nav class="frm-nav">' + sections.map(function(section){
    return '<div class="frm-nav-title">' + section[0] + '</div>' + section[1].map(function(item){
      return '<a class="' + (item[0] === active ? 'active' : '') + '" href="' + item[3] + '"><span>' + item[1] + '</span><b>' + item[2] + '</b>' + (item[4] ? '<em class="frm-new">' + item[4] + '</em>' : '') + '</a>';
    }).join('');
  }).join('') + '</nav><div class="frm-join-card"><strong>Junte-se à Federação</strong><p>Faça parte da maior comunidade competitiva de Rematch.</p><a class="frm-btn primary" href="/pages/formularios.html">Afiliar Clube</a></div></aside>';
}

function header(active = 'inicio') {
  const tabs = [
    ['inicio','INÍCIO','/pages/dashboard.html'],
    ['federacao','FEDERAÇÃO','/pages/federacao.html'],
    ['competitivo','COMPETITIVO','/pages/eventos.html'],
    ['clubes','CLUBES','/pages/times.html'],
    ['atletas','ATLETAS','/pages/jogadores.html'],
    ['admin','ADMINISTRAÇÃO','/pages/configuracoes.html']
  ];
  return '<header class="frm-header"><nav class="frm-tabs">' + tabs.map(function(tab){ return '<a class="' + (tab[0] === active ? 'active' : '') + '" href="' + tab[2] + '">' + tab[1] + '</a>'; }).join('') + '</nav><div class="frm-actions-top"><a class="frm-btn" href="/pages/perfil.html">👤 ENTRAR / PAINEL</a><a class="frm-btn discord" href="/api/discord/server/open" target="_blank" rel="noopener noreferrer">💬 DISCORD</a><a class="frm-btn frm-icon-btn" href="/pages/suporte.html">🔔</a></div></header>';
}

const DASHBOARD_HTML = String.raw`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Hollow Nexus FRM | Federação Comunitária de Rematch</title>
  <link rel="icon" href="/api/brand/icon?v=frm-clean-v2" />
  <link rel="stylesheet" href="/css/federation-portal.css?v=2026-07-13-frm-v2-clean" />
</head>
<body class="frm-clean-page">
  <div class="frm-shell">
    ${sidebar('inicio')}
    <main class="frm-main">
      ${header('inicio')}
      <section class="frm-grid-top">
        <article class="frm-hero">
          <div>
            <p class="frm-eyebrow">Bem-vindo à</p>
            <h1>the HOLLOW NEXUS <span>FRM</span></h1>
            <h2>Federação Comunitária de Rematch</h2>
            <p>Organizamos, regulamentamos e elevamos o cenário competitivo. Uma federação. Muitos clubes. Um objetivo: o topo.</p>
            <div class="frm-hero-actions">
              <a class="frm-btn primary" href="/pages/formularios.html">👥 AFILIAR CLUBE</a>
              <a class="frm-btn" href="/pages/eventos.html">🏆 VER COMPETIÇÕES</a>
              <a class="frm-btn" href="/pages/rankings.html">📊 RANKING OFICIAL</a>
              <a class="frm-btn" href="/pages/regulamento.html">📄 REGULAMENTO</a>
            </div>
          </div>
          <div class="frm-hero-logo-wrap"><img class="frm-hero-logo" data-frm-logo src="/api/brand/icon?v=frm-clean-v2" alt="Hollow Nexus FRM" /></div>
        </article>
        <aside class="frm-side">
          <article class="frm-card"><p class="frm-eyebrow">Temporada atual</p><h2>Temporada 1 - 2026</h2><p class="frm-muted">Status: <span class="frm-pill">Em andamento</span></p><div class="frm-progress" style="--value:48%"><span></span></div><p class="frm-muted">Progresso inicial do circuito oficial da federação.</p></article>
          <article class="frm-card"><p class="frm-eyebrow">Próximas partidas</p><div class="frm-match"><strong>Hollow Nexus FC</strong><b>VS</b><strong>Rival Club</strong><a class="frm-btn" href="/pages/eventos.html">VER</a></div><div class="frm-match"><strong>Void Legacy</strong><b>VS</b><strong>Noctis Club</strong><a class="frm-btn" href="/pages/eventos.html">VER</a></div><div class="frm-match"><strong>Prime Elite</strong><b>VS</b><strong>Death Squad</strong><a class="frm-btn" href="/pages/eventos.html">VER</a></div></article>
        </aside>
      </section>
      <section class="frm-stats">
        <article class="frm-stat"><div class="frm-stat-icon">🛡️</div><div><span>Clubes afiliados</span><strong data-frm-stat="clubes">24</strong><small>estrutura oficial</small></div></article>
        <article class="frm-stat"><div class="frm-stat-icon">👥</div><div><span>Atletas registrados</span><strong data-frm-stat="atletas">127</strong><small>perfis ativos</small></div></article>
        <article class="frm-stat"><div class="frm-stat-icon">🏆</div><div><span>Competições ativas</span><strong data-frm-stat="competicoes">4</strong><small>ligas e copas</small></div></article>
        <article class="frm-stat"><div class="frm-stat-icon">🧩</div><div><span>Partidas disputadas</span><strong>312</strong><small>histórico oficial</small></div></article>
        <article class="frm-stat"><div class="frm-stat-icon">⚽</div><div><span>Gols marcados</span><strong>1.247</strong><small>média 4,0 por partida</small></div></article>
      </section>
      <section class="frm-lower">
        <article class="frm-card"><p class="frm-eyebrow">Competições em destaque</p><h3>Circuito Hollow Nexus</h3><div class="frm-list"><div class="frm-list-item"><img class="frm-list-logo" data-frm-logo src="/api/brand/icon?v=frm-clean-v2"/><div><strong>Liga Hollow Nexus</strong><br><small class="frm-muted">Fase de grupos</small></div><span class="frm-pill">Em andamento</span></div><div class="frm-list-item"><img class="frm-list-logo" data-frm-logo src="/api/brand/icon?v=frm-clean-v2"/><div><strong>Copa Hollow Nexus</strong><br><small class="frm-muted">Oitavas de final</small></div><span class="frm-pill">Em andamento</span></div><div class="frm-list-item"><img class="frm-list-logo" data-frm-logo src="/api/brand/icon?v=frm-clean-v2"/><div><strong>Supercopa HNX</strong><br><small class="frm-muted">Final</small></div><span class="frm-pill">Em breve</span></div><div class="frm-list-item"><img class="frm-list-logo" data-frm-logo src="/api/brand/icon?v=frm-clean-v2"/><div><strong>Torneio de Novatos</strong><br><small class="frm-muted">Inscrições abertas</small></div><span class="frm-pill green">Inscrições</span></div></div></article>
        <article class="frm-card"><p class="frm-eyebrow">Ranking de clubes</p><h3>Top 5 oficial</h3><div class="frm-list"><div class="frm-list-item"><b>1</b><div><strong>Hollow Nexus FC</strong><br><small class="frm-muted">6 jogos</small></div><span>127 pts</span></div><div class="frm-list-item"><b>2</b><div><strong>Revenant Strike</strong><br><small class="frm-muted">6 jogos</small></div><span>118 pts</span></div><div class="frm-list-item"><b>3</b><div><strong>Void Legacy</strong><br><small class="frm-muted">6 jogos</small></div><span>105 pts</span></div><div class="frm-list-item"><b>4</b><div><strong>Noctis Club</strong><br><small class="frm-muted">6 jogos</small></div><span>98 pts</span></div><div class="frm-list-item"><b>5</b><div><strong>Prime Elite</strong><br><small class="frm-muted">6 jogos</small></div><span>92 pts</span></div></div></article>
        <article class="frm-card"><p class="frm-eyebrow">Últimas notícias</p><h3>Comunicados oficiais</h3><div class="frm-news"><article><div class="frm-news-thumb"></div><div><span class="frm-pill">Comunicado</span><h4>Novo regulamento da temporada</h4><p class="frm-muted">Atualizações sobre inscrições, transferências e penalizações.</p></div></article><article><div class="frm-news-thumb"></div><div><span class="frm-pill">Competição</span><h4>Resultados da rodada</h4><p class="frm-muted">Confira os resultados oficiais da última rodada.</p></div></article><article><div class="frm-news-thumb"></div><div><span class="frm-pill">Federação</span><h4>Novos clubes afiliados</h4><p class="frm-muted">Acompanhe os clubes que chegaram à federação.</p></div></article></div></article>
      </section>
      <footer class="frm-footer"><div><div class="frm-footer-brand"><img class="frm-logo" data-frm-logo src="/api/brand/icon?v=frm-clean-v2"/><div><strong>the HOLLOW NEXUS <span class="frm-accent">FRM</span></strong><p>Federação Comunitária de Rematch</p></div></div><p>Elevando o cenário competitivo de Rematch.</p></div><div><h4>Links rápidos</h4><p><a href="/pages/regulamento.html">Regulamento</a></p><p><a href="/pages/termos.html">Termos de Uso</a></p><p><a href="/pages/privacidade.html">Privacidade</a></p></div><div><h4>Contato</h4><p>Discord Oficial</p><p><a href="/pages/suporte.html">Suporte</a></p></div><div><h4>Legal</h4><p class="frm-legal">Projeto comunitário independente. Não afiliado, patrocinado ou endossado pela Sloclap, Kepler Interactive ou Rematch.</p></div></footer>
    </main>
  </div>
  <script src="/js/core/federation-portal.js?v=2026-07-13-frm-v2-clean"></script>
</body>
</html>`;

function shellPage(title, active, heading, text, buttonHref, buttonText) {
  return '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><title>' + title + ' | Hollow Nexus FRM</title><link rel="icon" href="' + LOGO_SRC + '"/><link rel="stylesheet" href="' + CSS_HREF + '"/></head><body class="frm-clean-page"><div class="frm-shell">' + sidebar(active) + '<main class="frm-main">' + header(active) + '<article class="frm-hero"><div><p class="frm-eyebrow">Hollow Nexus FRM</p><h1>' + heading + '</h1><h2>Federação Comunitária de Rematch</h2><p>' + text + '</p><div class="frm-hero-actions"><a class="frm-btn primary" href="' + buttonHref + '">' + buttonText + '</a><a class="frm-btn" href="/pages/dashboard.html">Voltar ao portal</a></div></div><div class="frm-hero-logo-wrap"><img class="frm-hero-logo" data-frm-logo src="' + LOGO_SRC + '" alt="Hollow Nexus FRM"/></div></article><footer class="frm-footer"><div><div class="frm-footer-brand"><img class="frm-logo" data-frm-logo src="' + LOGO_SRC + '"/><div><strong>the HOLLOW NEXUS <span class="frm-accent">FRM</span></strong><p>Federação Comunitária de Rematch</p></div></div></div><div><h4>Links</h4><p><a href="/pages/dashboard.html">Portal</a></p><p><a href="/pages/eventos.html">Competições</a></p></div><div><h4>Contato</h4><p>Discord Oficial</p><p>Suporte</p></div><div><h4>Legal</h4><p class="frm-legal">Projeto comunitário independente. Não afiliado oficialmente à Sloclap, Kepler Interactive ou Rematch.</p></div></footer></main></div><script src="' + JS_SRC + '"></script></body></html>';
}

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
writeFileIfChanged(path.join(pagesDir, 'federacao.html'), shellPage('Sobre a Federação', 'federacao', 'Sobre a Federação', 'A Hollow Nexus FRM organiza clubes, atletas, competições, rankings e regulamentos para estruturar o cenário comunitário de Rematch.', '/pages/formularios.html', 'Solicitar afiliação'));
writeFileIfChanged(path.join(pagesDir, 'regulamento.html'), shellPage('Regulamento', 'federacao', 'Regulamento Oficial', 'Central de regras da federação: inscrições, partidas, WO, transferências, conduta, punições e organização competitiva.', '/pages/termos.html', 'Ver termos atuais'));
writeFileIfChanged(path.join(pagesDir, 'prancheta-tatica.html'), shellPage('Prancheta Tática', 'prancheta', 'Prancheta Tática 5v5', 'Área preparada para montar formações de Rematch com exatamente cinco jogadores por lado, incluindo goleiro, sem permitir sexto titular.', '/pages/times.html', 'Gerenciar elenco'));

console.log(changed ? '[Federacao] Portal FRM v2 clean aplicado sem tocar nas paginas antigas.' : '[Federacao] Portal FRM v2 clean ja estava aplicado.');
