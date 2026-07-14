const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const pagesDir = path.join(ROOT, 'public', 'pages');
const cssFile = path.join(ROOT, 'public', 'css', 'federation-portal.css');
const jsFile = path.join(ROOT, 'public', 'js', 'core', 'federation-portal.js');
const dashboardFile = path.join(pagesDir, 'dashboard.html');
const indexFile = path.join(ROOT, 'public', 'index.html');
const rootIndexFile = path.join(ROOT, 'index.html');
const BUILD = '2026-07-14-frm-buttons-v1';
const LOGO_SRC = '/api/brand/icon?v=' + BUILD;
const CSS_HREF = '/css/federation-portal.css?v=' + BUILD;
const JS_SRC = '/js/core/federation-portal.js?v=' + BUILD;
let changed = false;

function ensureDir(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
}

function writeIfChanged(file, content) {
  ensureDir(file);
  const before = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  if (before !== content) {
    fs.writeFileSync(file, content, 'utf8');
    changed = true;
  }
}

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function write(file, content) {
  if (read(file) !== content) {
    fs.writeFileSync(file, content, 'utf8');
    changed = true;
  }
}

function patchCss() {
  if (!fs.existsSync(cssFile)) return;
  let css = read(cssFile);
  const extra = `
/* FRM button/link hardening */
.frm-wordmark { display: inline-flex; align-items: baseline; gap: .32em; white-space: nowrap; }
.frm-wordmark .frm-the { color: #d9d1ee; font-size: .48em; line-height: 1; letter-spacing: .02em; text-transform: none; font-weight: 800; transform: translateY(-.08em); }
.frm-brand .frm-wordmark .frm-the { display: block; font-size: 11px; margin-bottom: 2px; transform: none; }
.frm-brand .frm-wordmark { display: block; }
.frm-hero h1 .frm-the { font-size: .44em; vertical-align: super; margin-right: .22em; color: #f5f0ff; letter-spacing: .01em; text-transform: none; }
.frm-header a, .frm-nav a, .frm-btn { pointer-events: auto; }
.frm-app-content-card > .va-shell, .frm-app-content-card .va-shell > .va-sidebar, .frm-app-content-card .frm-shell { display: none !important; }
.frm-app-content-card .va-card, .frm-app-content-card .va-panel, .frm-app-content-card .card { max-width: none; }
body.frm-app-shell-active { overflow-x: hidden; }
body.frm-app-shell-active .va-organized-body { background: transparent !important; }
`;
  if (!css.includes('FRM button/link hardening')) css += extra;
  write(cssFile, css);
}

function patchDashboard() {
  if (!fs.existsSync(dashboardFile)) return;
  let html = read(dashboardFile);
  html = html.replace(/href="\/css\/federation-portal\.css\?v=[^"]+"/g, `href="${CSS_HREF}"`);
  html = html.replace(/src="\/js\/core\/federation-portal\.js\?v=[^"]+"/g, `src="${JS_SRC}"`);
  html = html.replace(/\/api\/brand\/icon\?v=[^"')<\s]+/g, LOGO_SRC);
  html = html.replace(/<strong>the HOLLOW NEXUS <span>FRM<\/span><\/strong>/g, '<strong><span class="frm-wordmark"><span class="frm-the">the</span><span>HOLLOW NEXUS <span>FRM</span></span></span></strong>');
  html = html.replace(/<h1>the HOLLOW NEXUS <span>FRM<\/span><\/h1>/g, '<h1><span class="frm-the">the</span>HOLLOW NEXUS <span>FRM</span></h1>');
  html = html.replace(/href="\/pages\/dashboard\.html"/g, 'href="/pages/dashboard.html"');
  html = html.replace(/<span class="frm-icon">🔔<b class="frm-badge">3<\/b><\/span>/g, '<a class="frm-icon" href="/pages/notificacoes.html" aria-label="Notificações">🔔<b class="frm-badge">3</b></a>');
  html = html.replace(/<span class="frm-icon">✉<b class="frm-badge">5<\/b><\/span>/g, '<a class="frm-icon" href="/pages/correio.html" aria-label="Correio">✉<b class="frm-badge">5</b></a>');
  write(dashboardFile, html);
}

function redirectHtml() {
  return '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Hollow Nexus FRM</title><meta http-equiv="refresh" content="0; url=/pages/dashboard.html"><script>location.replace("/pages/dashboard.html");</script></head><body style="background:#02040a;color:#fff;font-family:system-ui">Redirecionando para Hollow Nexus FRM...</body></html>';
}

function shellPage(title, activeKey, heading, text, primaryHref, primaryText) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} | Hollow Nexus FRM</title>
  <link rel="icon" href="${LOGO_SRC}" />
  <link rel="stylesheet" href="${CSS_HREF}" />
</head>
<body class="frm-reference-page">
  <div class="frm-shell">
    <aside class="frm-sidebar">
      <div class="frm-brand"><img data-frm-logo src="${LOGO_SRC}" alt="Hollow Nexus FRM"/><div><small>the</small><strong>HOLLOW NEXUS <span>FRM</span></strong><p>Federação Comunitária</p></div></div>
      <nav class="frm-nav" data-frm-static-nav="1">
        <div class="frm-nav-title">Federação</div>
        <a href="/pages/dashboard.html"><i>⌂</i><b>Início</b></a>
        <a href="/pages/federacao.html"><i>ⓘ</i><b>Sobre a Federação</b></a>
        <a href="/pages/regulamento.html"><i>▤</i><b>Regulamento</b></a>
        <a href="/pages/atualizacoes.html"><i>▧</i><b>Atualizações</b></a>
        <a href="/pages/suporte.html"><i>?</i><b>Suporte</b></a>
        <div class="frm-nav-title">Competitivo</div>
        <a href="/pages/eventos.html"><i>♕</i><b>Competições</b></a>
        <a href="/pages/chaveamento.html"><i>⌘</i><b>Chaveamento</b></a>
        <a href="/pages/grupos.html"><i>☷</i><b>Grupos</b></a>
        <a href="/pages/resultados.html"><i>⊙</i><b>Resultados</b></a>
        <a href="/pages/rankings.html"><i>⌁</i><b>Rankings</b></a>
        <a href="/pages/calendario.html"><i>▦</i><b>Calendário</b></a>
        <div class="frm-nav-title">Clubes</div>
        <a href="/pages/times.html"><i>♙</i><b>Clubes Afiliados</b></a>
        <a href="/pages/formularios.html"><i>✥</i><b>Solicitar Afiliação</b></a>
        <a href="/pages/prancheta-tatica.html"><i>▣</i><b>Prancheta Tática</b></a>
        <div class="frm-nav-title">Atletas</div>
        <a href="/pages/jogadores.html"><i>♟</i><b>Jogadores Registrados</b></a>
        <a href="/pages/recrutamento.html"><i>✧</i><b>Mercado / Recrutamento</b></a>
        <div class="frm-nav-title">Administração</div>
        <a href="/pages/formularios.html"><i>▤</i><b>Formulários</b></a>
        <a href="/pages/permissoes.html"><i>ⓘ</i><b>Permissões</b></a>
        <a href="/pages/configuracoes.html"><i>⚙</i><b>Configurações</b></a>
      </nav>
    </aside>
    <main class="frm-main">
      <header class="frm-header"><nav class="frm-tabs"><a class="${activeKey === 'inicio' ? 'active' : ''}" href="/pages/dashboard.html">Início</a><a class="${activeKey === 'federacao' ? 'active' : ''}" href="/pages/federacao.html">Federação</a><a class="${activeKey === 'competitivo' ? 'active' : ''}" href="/pages/eventos.html">Competitivo</a><a class="${activeKey === 'clubes' ? 'active' : ''}" href="/pages/times.html">Clubes</a><a class="${activeKey === 'atletas' ? 'active' : ''}" href="/pages/jogadores.html">Atletas</a><a class="${activeKey === 'admin' ? 'active' : ''}" href="/pages/configuracoes.html">Administração</a></nav><div class="frm-header-actions"><a class="frm-btn" href="/pages/perfil.html">♙ Entrar / Painel</a><a class="frm-btn discord" href="/api/discord/server/open" target="_blank" rel="noopener noreferrer">💬 Discord</a><a class="frm-icon" href="/pages/notificacoes.html">🔔<b class="frm-badge">3</b></a><a class="frm-icon" href="/pages/correio.html">✉<b class="frm-badge">5</b></a></div></header>
      <article class="frm-hero"><div><p class="frm-eyebrow">Hollow Nexus FRM</p><h1><span class="frm-the">the</span>${heading}</h1><h2>Federação Comunitária de Rematch</h2><p>${text}</p><div class="frm-hero-actions"><a class="frm-btn primary" href="${primaryHref}">${primaryText}</a><a class="frm-btn" href="/pages/dashboard.html">Voltar ao portal</a></div></div><div class="frm-hero-logo-wrap"><img class="frm-hero-logo" data-frm-logo src="${LOGO_SRC}" alt="Hollow Nexus FRM"/></div></article>
    </main>
  </div>
  <script src="${JS_SRC}"></script>
</body>
</html>`;
}

const guaranteedPages = [
  ['federacao.html', 'Sobre a Federação', 'federacao', 'HOLLOW NEXUS <span>FRM</span>', 'A Hollow Nexus FRM organiza clubes, atletas, competições, rankings e regulamentos para estruturar o cenário comunitário de Rematch.', '/pages/formularios.html', 'Solicitar afiliação'],
  ['regulamento.html', 'Regulamento', 'federacao', 'REGULAMENTO <span>OFICIAL</span>', 'Central de regras da federação: inscrições, partidas, WO, transferências, conduta, punições e organização competitiva.', '/pages/termos.html', 'Ver termos atuais'],
  ['prancheta-tatica.html', 'Prancheta Tática', 'clubes', 'PRANCHETA <span>TÁTICA</span>', 'Área preparada para montar formações de Rematch com exatamente cinco jogadores por lado, incluindo goleiro, sem permitir sexto titular.', '/pages/times.html', 'Gerenciar elenco'],
  ['calendario.html', 'Calendário', 'competitivo', 'CALENDÁRIO <span>OFICIAL</span>', 'Agenda oficial da federação para partidas, rodadas, inscrições, reuniões e eventos especiais.', '/pages/eventos.html', 'Ver competições'],
  ['notificacoes.html', 'Notificações', 'inicio', 'NOTIFICAÇÕES <span>FRM</span>', 'Central de avisos da federação para jogadores, capitães e administração.', '/pages/suporte.html', 'Abrir suporte'],
  ['correio.html', 'Correio', 'inicio', 'CORREIO <span>FRM</span>', 'Caixa de mensagens e comunicados internos da federação.', '/pages/chat.html', 'Abrir chat'],
  ['termos.html', 'Termos de Uso', 'federacao', 'TERMOS <span>DE USO</span>', 'Termos oficiais de uso da plataforma Hollow Nexus FRM e Void Arena.', '/pages/regulamento.html', 'Voltar ao regulamento'],
  ['privacidade.html', 'Privacidade', 'federacao', 'PRIVACIDADE <span>FRM</span>', 'Política de privacidade e uso de dados da comunidade.', '/pages/regulamento.html', 'Voltar ao regulamento']
];

function ensurePages() {
  for (const [file, title, active, heading, text, href, button] of guaranteedPages) {
    const target = path.join(pagesDir, file);
    if (!fs.existsSync(target) || ['federacao.html','regulamento.html','prancheta-tatica.html'].includes(file)) {
      writeIfChanged(target, shellPage(title, active, heading, text, href, button));
    }
  }
}

function patchJs() {
  if (!fs.existsSync(jsFile)) return;
  let js = read(jsFile);
  const addon = `
(function(){
  var dashboard = '/pages/dashboard.html';
  function fixWordmarks(){
    document.querySelectorAll('.frm-brand strong').forEach(function(el){
      if (el.dataset.smallThe === '1') return;
      var text = el.textContent || '';
      if (/^the\s+hollow nexus\s+frm$/i.test(text.trim())) {
        el.innerHTML = '<span class="frm-wordmark"><span class="frm-the">the</span><span>HOLLOW NEXUS <span>FRM</span></span></span>';
        el.dataset.smallThe = '1';
      }
    });
    document.querySelectorAll('.frm-hero h1').forEach(function(el){
      if (el.dataset.smallThe === '1') return;
      var html = el.innerHTML;
      html = html.replace(/^the\s+/i, '<span class="frm-the">the</span>');
      el.innerHTML = html;
      el.dataset.smallThe = '1';
    });
  }
  function fixLinks(){
    document.querySelectorAll('a[href="/"],a[href="/index.html"],a[href="index.html"],a[href="../index.html"]').forEach(function(a){ a.href = dashboard; });
    document.querySelectorAll('a[href="#"],button[data-href="#"]').forEach(function(a){
      if ((a.textContent || '').toLowerCase().includes('discord')) a.setAttribute('href','/api/discord/server/open');
    });
    document.querySelectorAll('[data-frm-logo],[data-server-icon]').forEach(function(img){ if (img && img.tagName === 'IMG') img.src='${LOGO_SRC}'; });
  }
  function bootFixes(){ fixWordmarks(); fixLinks(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootFixes, { once:true }); else bootFixes();
  setTimeout(bootFixes, 200); setTimeout(bootFixes, 900); setTimeout(bootFixes, 1800);
})();
`;
  if (!js.includes('function fixWordmarks')) js += addon;
  write(jsFile, js);
}

function patchHtmlPages() {
  if (!fs.existsSync(pagesDir)) return;
  for (const entry of fs.readdirSync(pagesDir)) {
    if (!entry.endsWith('.html')) continue;
    const file = path.join(pagesDir, entry);
    let html = read(file);
    if (!html) continue;
    if (!html.includes('/css/federation-portal.css')) {
      html = html.replace('</head>', `  <link rel="stylesheet" href="${CSS_HREF}" />\n</head>`);
    }
    if (!html.includes('/js/core/federation-portal.js')) {
      html = html.replace('</body>', `  <script src="${JS_SRC}"></script>\n</body>`);
    }
    html = html.replace(/href="\/"/g, 'href="/pages/dashboard.html"');
    html = html.replace(/href="\/index\.html"/g, 'href="/pages/dashboard.html"');
    write(file, html);
  }
}

patchCss();
patchDashboard();
ensurePages();
patchJs();
patchHtmlPages();
writeIfChanged(indexFile, redirectHtml());
writeIfChanged(rootIndexFile, redirectHtml());

console.log(changed ? '[Federacao] Botoes funcionais, the pequeno e bloqueio da versao antiga aplicados.' : '[Federacao] Botoes FRM ja estavam funcionais.');
