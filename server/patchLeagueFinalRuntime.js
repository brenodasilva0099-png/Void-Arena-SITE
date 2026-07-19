const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const PAGES = path.join(ROOT, 'public', 'pages');
const VERSION = path.join(ROOT, 'public', 'league-stable-final.json');
const UPDATES = path.join(PAGES, 'atualizacoes.html');
const BUILD = '2026-07-19-league-stable-v4';
const LOGO = '/assets/hollow-nexus-official.svg';
let changed = false;

function read(file) { return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''; }
function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (read(file) !== content) { fs.writeFileSync(file, content, 'utf8'); changed = true; }
}

const topItems = [
  ['inicio', 'Início', '/pages/dashboard.html'],
  ['competitivo', 'Competitivo', '/pages/competicoes.html'],
  ['clubes', 'Clubes', '/pages/clubes.html'],
  ['jogadores', 'Jogadores', '/pages/atletas.html'],
  ['cafe', 'Café com Leite', '/pages/cafe-com-leite.html'],
  ['admin', 'Administração', '/pages/administracao.html']
];

const sideGroups = [
  ['Competitivo', [
    ['◇', 'Eventos', '/pages/eventos.html'],
    ['⌘', 'Chaveamento', '/pages/chaveamento.html'],
    ['≡', 'Grupos', '/pages/grupos.html'],
    ['◎', 'Resultados', '/pages/resultados.html'],
    ['▥', 'Rankings', '/pages/rankings.html'],
    ['□', 'Calendário', '/pages/calendario.html']
  ]],
  ['Clubes', [
    ['+', 'Cadastrar Clube', '/pages/cadastrar-clube.html'],
    ['▱', 'Elencos', '/pages/elencos.html'],
    ['▣', 'Prancheta Tática', '/pages/prancheta-tatica.html'],
    ['↔', 'Transferências', '/pages/transferencias.html']
  ]],
  ['Jogadores', [
    ['✦', 'Mercado / Recrutamento', '/pages/mercado.html'],
    ['▥', 'Ranking de Jogadores', '/pages/rankings.html#jogadores']
  ]],
  ['Administração', [
    ['≣', 'Formulários', '/pages/formularios.html'],
    ['◌', 'Permissões', '/pages/permissoes.html'],
    ['⊙', 'Configurações', '/pages/configuracoes.html'],
    ['◎', 'Análise de Partidas', '/pages/analise-partidas.html']
  ]]
];

function topNav(active = '') {
  return `<nav class="frm-tabs">${topItems.map(([key, label, href]) => `<a class="${key === active ? 'active' : ''}" href="${href}">${label}</a>`).join('')}</nav>`;
}

function sideNav(activeHref = '') {
  return sideGroups.map(([title, links]) => `<div class="frm-nav-title">${title}</div>${links.map(([icon, label, href]) => {
    const compare = href.split('#')[0];
    return `<a class="${compare === activeHref ? 'active' : ''}" href="${href}"><i>${icon}</i><b>${label}</b></a>`;
  }).join('')}`).join('');
}

function footer() {
  return `<footer class="frm-footer"><div><div class="frm-footer-brand"><img src="${LOGO}" alt="Hollow Nexus League"><div><strong>the HOLLOW NEXUS <span class="frm-accent">LEAGUE</span></strong><p>Liga Comunitária de Rematch</p></div></div><p>Competições, clubes, jogadores e eventos em uma plataforma comunitária independente.</p></div><div><h4>Liga</h4><div class="hnl-footer-links"><a href="/pages/sobre-a-liga.html">Sobre a Liga</a><a href="/pages/regulamento.html">Regulamento</a><a href="/pages/atualizacoes.html">Atualizações</a><a href="/pages/suporte.html">Suporte</a></div></div><div><h4>Links rápidos</h4><div class="hnl-footer-links"><a href="/pages/competicoes.html">Competições</a><a href="/pages/clubes.html">Clubes</a><a href="/pages/atletas.html">Jogadores</a><a href="/pages/cafe-com-leite.html">Café com Leite</a></div></div><div><h4>Contato</h4><div class="hnl-footer-links"><a href="/api/discord/server/open" target="_blank" rel="noopener">Discord Oficial</a><a href="/pages/suporte.html">Abrir suporte</a></div></div><div><h4>Legal</h4><p>Liga comunitária independente. Não afiliada, patrocinada ou endossada por Rematch, Sloclap ou Kepler Interactive.</p><p>© 2026 The Hollow Nexus League.</p></div></footer>`;
}

function hero(title, text, icon, kicker = 'Hollow Nexus League') {
  return `<section class="frm-page-hero"><div><span class="hnl-section-kicker">${kicker}</span><h1>${title}</h1><p>${text}</p></div><div class="hnl-hero-icon" aria-hidden="true">${icon}</div></section>`;
}

function shell({ title, tab = '', href = '', module = '', heroHtml = '', body = '' }) {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} | Hollow Nexus League</title><link rel="icon" href="${LOGO}"><script src="/js/core/league-navigation.js?v=${BUILD}"></script><link rel="stylesheet" href="/css/league-critical.css?v=${BUILD}"><link rel="stylesheet" href="/css/league-polish.css?v=${BUILD}"><link rel="stylesheet" href="/css/league-experience.css?v=${BUILD}"></head><body class="frm-polish-page" data-hnl-module="${module}" data-frm-module="${module}"><div class="frm-shell"><aside class="frm-sidebar"><div class="frm-brand"><img src="${LOGO}" alt="Hollow Nexus League"><div><small>the</small><strong>HOLLOW NEXUS <span>LEAGUE</span></strong><p>Liga Comunitária</p></div></div><nav class="frm-nav">${sideNav(href)}</nav></aside><main class="frm-main"><header class="frm-header">${topNav(tab)}<div class="frm-header-actions"><a class="frm-btn" data-frm-login href="/auth/discord?next=%2Fpages%2Fperfil.html">♟ Entrar / Painel</a><a class="frm-btn discord" href="/api/discord/server/open" target="_blank" rel="noopener">💬 Discord</a><a class="frm-icon" href="/pages/notificacoes.html">🔔<b class="frm-badge" data-frm-unread>0</b></a><a class="frm-icon" href="/pages/correio.html">✉<b class="frm-badge" data-frm-mail>0</b></a></div></header>${heroHtml}<div id="pageStatus"></div>${body}${footer()}</main></div><div class="frm-modal" id="frmModal"><div class="frm-modal-panel" id="frmModalPanel"></div></div><script src="/js/core/social-icons.js?v=${BUILD}"></script><script src="/js/core/league-experience.js?v=${BUILD}"></script><script src="/js/core/league-auth-ui.js?v=${BUILD}"></script><script src="/js/core/league-page-integrity.js?v=${BUILD}"></script></body></html>`;
}

const pageState = {
  'dashboard.html': ['inicio', ''],
  'competicoes.html': ['competitivo', ''],
  'competicao.html': ['competitivo', ''],
  'eventos.html': ['competitivo', '/pages/eventos.html'],
  'chaveamento.html': ['competitivo', '/pages/chaveamento.html'],
  'grupos.html': ['competitivo', '/pages/grupos.html'],
  'resultados.html': ['competitivo', '/pages/resultados.html'],
  'rankings.html': ['competitivo', '/pages/rankings.html'],
  'calendario.html': ['competitivo', '/pages/calendario.html'],
  'clubes.html': ['clubes', ''],
  'times.html': ['clubes', ''],
  'cadastrar-clube.html': ['clubes', '/pages/cadastrar-clube.html'],
  'elencos.html': ['clubes', '/pages/elencos.html'],
  'perfil-clube.html': ['clubes', ''],
  'prancheta-tatica.html': ['clubes', '/pages/prancheta-tatica.html'],
  'transferencias.html': ['clubes', '/pages/transferencias.html'],
  'atletas.html': ['jogadores', ''],
  'jogadores.html': ['jogadores', ''],
  'perfil-jogador.html': ['jogadores', ''],
  'perfil.html': ['jogadores', ''],
  'mercado.html': ['jogadores', '/pages/mercado.html'],
  'recrutamento.html': ['jogadores', '/pages/mercado.html'],
  'cafe-com-leite.html': ['cafe', ''],
  'administracao.html': ['admin', '']
};

function ensureTag(html, tag, before = '</head>') {
  if (html.includes(tag)) return html;
  return html.includes(before) ? html.replace(before, `${tag}\n${before}`) : `${tag}\n${html}`;
}

function replaceExperienceNavigation(file, tab, href) {
  let html = read(file);
  if (!html || !html.includes('frm-shell')) return;
  const before = html;
  html = html.replace(/<nav class="frm-tabs">[\s\S]*?<\/nav>/i, topNav(tab));
  html = html.replace(/<nav class="frm-nav">[\s\S]*?<\/nav>/i, `<nav class="frm-nav">${sideNav(href)}</nav>`);
  html = html.replace(/<footer class="frm-footer">[\s\S]*?<\/footer>/i, footer());
  html = html.replaceAll('/pages/federacao.html', '/pages/sobre-a-liga.html');
  html = html.replaceAll('/assets/logo.png', LOGO);
  if (html !== before) write(file, html);
}

for (const [name, [tab, href]] of Object.entries(pageState)) replaceExperienceNavigation(path.join(PAGES, name), tab, href);

function replaceBodySection(name, marker, replacement) {
  const file = path.join(PAGES, name);
  let html = read(file);
  if (!html) return;
  const before = html;
  html = html.replace(marker, replacement);
  if (html !== before) write(file, html);
}

const bracketBody = `<section class="hnl-card hnl-competition-console"><div class="hnl-console-head"><div><h2>Controle do torneio</h2><p>Gere, edite e sincronize o chaveamento oficial sem sair do visual da liga.</p></div><div class="hnl-actions"><button id="generateBracketBtn" class="hnl-btn primary" type="button">Gerar automático</button><button id="reloadBracketBtn" class="hnl-btn" type="button">Recarregar</button><button id="syncHubsBtn" class="hnl-btn" type="button">Sincronizar HUBs</button><button id="openManualEditorBtn" class="hnl-btn" type="button">Editar posições</button><a class="hnl-btn" href="/pages/grupos.html">Fase de grupos</a></div></div><div id="bracketStatus" class="hnl-notice">Carregando...</div></section><section class="hnl-card" id="bracketConfigCard" style="margin-top:14px"><div class="hnl-console-head"><div><h2>Configuração rápida</h2><p>Defina evento, origem dos clubes, formato, limite e grupos.</p></div><button id="saveSettingsBtn" class="hnl-btn primary" type="button">Salvar modelo</button></div><div id="activeEventStatus" class="hnl-notice">Selecione um evento para vincular chaveamento, HUBs e resultados.</div><form id="tournamentSettingsForm" class="hnl-form-grid" style="margin-top:12px"><div class="hnl-field"><label>Evento ativo</label><select name="activeEventId" class="hnl-select"><option value="">Sem evento fixo</option></select></div><div class="hnl-field"><label>Origem dos clubes</label><select name="teamSource" class="hnl-select"><option value="all">Todos os clubes cadastrados</option><option value="registered">Apenas inscritos/aprovados</option></select></div><div class="hnl-field"><label>Nome do torneio</label><input name="tournamentName" class="hnl-input" maxlength="60"></div><div class="hnl-field"><label>Formato</label><select name="matchFormat" class="hnl-select"><option>MD1</option><option>MD2</option><option>MD3</option><option>MD5</option></select></div><div class="hnl-field"><label>Estrutura</label><select name="structure" class="hnl-select"><option value="single_elimination">Mata-mata</option><option value="groups">Grupos</option><option value="groups_playoffs">Grupos + playoffs</option></select></div><div class="hnl-field"><label>Limite de clubes</label><select name="teamLimit" class="hnl-select"><option value="4">4</option><option value="8">8</option><option value="12">12</option><option value="16">16</option><option value="20">20</option><option value="24">24</option><option value="28">28</option><option value="32">32</option></select></div><div class="hnl-field"><label>Quantidade de grupos</label><select name="groupCount" class="hnl-select"><option value="2">2</option><option value="4">4</option><option value="8">8</option></select></div><div class="hnl-field"><label>Categoria Discord</label><input name="discordMatchCategoryId" class="hnl-input" placeholder="Categoria padrão"></div><label class="hnl-field full hnl-check"><input name="autoCreateMatchChannels" type="checkbox"><span>Criar canais privados automaticamente no Discord</span></label></form></section><section class="hnl-card hnl-bracket-surface" style="margin-top:14px"><div class="hnl-console-head"><div><h2>Chaveamento oficial</h2><p id="bracketMiniStatus">Carregando estrutura...</p></div></div><div id="adaptiveBracket" class="va-adaptive-bracket"></div></section><div id="manualBracketModal" class="va-modal-shell" hidden><div class="va-modal-card"><div class="va-modal-head"><div><p class="va-eyebrow">Editor seguro</p><h2>Editar posições do chaveamento</h2></div><button id="closeManualEditorBtn" class="va-modal-close" type="button">×</button></div><div id="manualEditorBody" class="va-manual-grid"></div><div class="hnl-actions"><button id="saveManualEditorBtn" class="hnl-btn primary" type="button">Salvar posições</button><button id="cancelManualEditorBtn" class="hnl-btn" type="button">Cancelar</button></div><div id="manualEditorStatus" class="hnl-notice"></div></div></div>`;

const groupsBody = `<section class="hnl-card"><div class="hnl-console-head"><div><h2>Controle dos grupos</h2><p>Sorteie, reorganize e salve a classificação usando P/V/E/D/G e pontos automáticos.</p></div><div class="hnl-actions"><a class="hnl-btn" href="/pages/chaveamento.html">Abrir chaveamento</a><button id="reloadGroupsBtn" class="hnl-btn" type="button">Recarregar</button></div></div><form id="groupsControlForm" class="hnl-form-grid"><div class="hnl-field"><label>Quantidade de grupos</label><select name="groupCount" class="hnl-select"><option value="2">2 grupos</option><option value="4" selected>4 grupos</option><option value="8">8 grupos</option></select></div><div class="hnl-field"><label>Origem do sorteio</label><select name="source" class="hnl-select"><option value="bracket">Clubes do chaveamento atual</option><option value="all">Todos os clubes cadastrados</option></select></div><div class="hnl-field"><label>Limite de clubes</label><select name="teamLimit" class="hnl-select"><option value="4">4</option><option value="8">8</option><option value="12">12</option><option value="16" selected>16</option><option value="20">20</option><option value="24">24</option><option value="28">28</option><option value="32">32</option></select></div></form><div class="hnl-actions" style="margin-top:12px"><button id="drawGroupsBtn" class="hnl-btn primary" type="button">🎲 Sortear grupos</button><button id="editGroupsBtn" class="hnl-btn" type="button">⚙ Editar organização</button><button id="saveGroupsBtn" class="hnl-btn" type="button">💾 Salvar pontuação</button></div><div id="groupsStatus" class="hnl-notice" style="margin-top:12px">Carregando...</div></section><section class="hnl-card" id="groupsEditorCard" hidden style="margin-top:14px"><div class="hnl-console-head"><div><h2>Editar organização</h2><p>Troque os clubes de grupo antes de salvar.</p></div></div><div id="groupsEditor"></div><div class="hnl-actions" style="margin-top:12px"><button id="saveOrganizationBtn" class="hnl-btn primary" type="button">Salvar organização</button><button id="closeEditorBtn" class="hnl-btn" type="button">Fechar</button></div></section><section class="hnl-card" style="margin-top:14px"><div class="hnl-console-head"><div><h2>Tabelas dos grupos</h2><p>PTS = vitória × 3 + empate. A classificação é reordenada automaticamente.</p></div></div><div id="groupsBoard" class="va-groups-board"></div></section>`;

replaceBodySection('chaveamento.html', /<section id="competitiveData"><\/section>/i, bracketBody);
replaceBodySection('grupos.html', /<section id="competitiveData"><\/section>/i, groupsBody);
replaceBodySection('resultados.html', /<section id="competitiveData"><\/section>/i, '<section class="hnl-grid" id="resultsList"></section>');

function addPageAsset(name, tag, before = '</head>') {
  const file = path.join(PAGES, name);
  let html = read(file);
  if (!html) return;
  const next = ensureTag(html, tag, before);
  if (next !== html) write(file, next);
}

['chaveamento.html', 'grupos.html'].forEach((name) => addPageAsset(name, '<link rel="stylesheet" href="/css/organization.css?v=2026-07-19">'));
addPageAsset('chaveamento.html', '<link rel="stylesheet" href="/css/bracket-desktop.css?v=2026-07-19">');
addPageAsset('chaveamento.html', '<link rel="stylesheet" href="/css/mobile-chaveamento.css?v=2026-07-19">');
addPageAsset('chaveamento.html', '<script src="/js/core/api.js?v=2026-07-19"></script>', '</body>');
addPageAsset('chaveamento.html', '<script src="/js/pages/chaveamento.js?v=2026-07-19"></script>', '</body>');
addPageAsset('chaveamento.html', '<script src="/js/pages/chaveamento-autosync-fix.js?v=2026-07-19"></script>', '</body>');
addPageAsset('grupos.html', '<script src="/js/core/api.js?v=2026-07-19"></script>', '</body>');
addPageAsset('grupos.html', '<script src="/js/pages/grupos.js?v=2026-07-19"></script>', '</body>');

const staticPages = {
  'sobre-a-liga.html': shell({ title: 'Sobre a Liga', tab: '', href: '', heroHtml: hero('Sobre a Hollow Nexus League', 'Uma liga comunitária independente para organizar competições, temporadas, clubes e rankings de Rematch.', '✦'), body: '<section class="hnl-grid cols-2"><article class="hnl-card"><h2>O que fazemos</h2><p>Organizamos campeonatos, eventos, chaveamentos, grupos, resultados e rankings para a comunidade.</p></article><article class="hnl-card"><h2>Posicionamento</h2><p>A Hollow Nexus League é comunitária e independente; não atua como federação oficial do jogo.</p></article></section>' }),
  'regulamento.html': shell({ title: 'Regulamento', tab: '', href: '', heroHtml: hero('Regulamento da Liga', 'Regras gerais de convivência, inscrições, competições e validação de resultados.', '📜'), body: '<section class="hnl-card"><h2>Princípios gerais</h2><p>Respeito entre participantes, uso de informações verdadeiras, cumprimento dos horários e envio de provas quando solicitado.</p><h2>Competições</h2><p>Formato, limite de clubes, inscrições e critérios de desempate são definidos em cada competição.</p><h2>Resultados</h2><p>Resultados devem ser enviados pelos responsáveis e podem ser revisados pela administração.</p></section>' }),
  'notificacoes.html': shell({ title: 'Notificações', tab: '', href: '', module: 'notifications', heroHtml: hero('Notificações', 'Convites, avisos e atualizações vinculadas à sua conta.', '🔔'), body: '<section class="hnl-grid" id="notificationsPage"></section>' }),
  'correio.html': shell({ title: 'Correio', tab: '', href: '', module: 'mail', heroHtml: hero('Correio da Liga', 'Convites de clubes e mensagens importantes da plataforma.', '✉'), body: '<section class="hnl-grid" id="mailPage"></section>' })
};
staticPages['federacao.html'] = staticPages['sobre-a-liga.html'];
const staticHeroEmojis = { 'sobre-a-liga.html': '🌀', 'federacao.html': '🌀', 'regulamento.html': '📜', 'notificacoes.html': '🔔', 'correio.html': '✉️' };
Object.entries(staticPages).forEach(([name, html]) => {
  const emoji = staticHeroEmojis[name];
  const output = emoji ? html.replace(/(<div class="hnl-hero-icon"[^>]*>)[\s\S]*?(<\/div>)/i, `$1${emoji}$2`) : html;
  write(path.join(PAGES, name), output);
});

let cafe = read(path.join(PAGES, 'cafe-com-leite.html'));
if (cafe && !cafe.includes('id="cafeMetricButtons"')) {
  cafe = cafe.replace('<div id="cafeRanking"></div>', '<div class="hnl-metric-buttons" id="cafeMetricButtons"></div><div class="hnl-filterbar"><input class="hnl-input" id="cafeSearch" placeholder="Buscar membro"><button class="hnl-btn" id="cafeDirection" type="button">Maior primeiro</button></div><div id="cafeRanking"></div>');
  write(path.join(PAGES, 'cafe-com-leite.html'), cafe);
}

let updates = read(UPDATES);
if (updates && !updates.includes('release-2026-07-19-league-stable-v2')) {
  const card = `<article class="va-card va-update-card" id="release-2026-07-19-league-stable-v2"><span class="va-update-dot"></span><div class="va-update-meta"><span>19/07/2026 • 10:12 BRT</span><span>Site</span><span>Estabilidade/Competitivo/Clubes</span></div><h3>Experiência League consolidada sem runtimes duplicados</h3><p class="va-muted">A navegação foi desduplicada, as rotas públicas foram estabilizadas e os módulos completos de chaveamento, grupos, rankings, Café com Leite e prancheta foram restaurados no visual atual.</p><ul class="va-update-list"><li class="fix">Páginas novas não carregam mais JavaScript legado junto com a experiência League.</li><li class="site">Chaveamento recuperou configuração, geração, edição de posições e sincronização das HUBs.</li><li class="site">Grupos recuperaram sorteio, organização manual, P/V/E/D/G e persistência de pontos.</li><li class="fix">Logos em URL e base64 deixam de ser truncadas; listas públicas usam rotas que não derrubam a página quando o BOT está acordando.</li><li class="site">Prancheta ampliada e Café com Leite com filtros de ordenação mais claros.</li></ul></article>`;
  updates = updates.includes('<article class="va-card va-update-card"') ? updates.replace('<article class="va-card va-update-card"', `${card}\n<article class="va-card va-update-card"`) : updates.replace('</main>', `${card}\n</main>`);
  write(UPDATES, updates);
}

write(VERSION, JSON.stringify({ build: BUILD, updatedAt: '2026-07-19T10:12:00-03:00', modules: ['navigation', 'public-routes', 'bracket', 'groups', 'rankings', 'cafe-com-leite', 'tactical-board', 'club-logos'] }, null, 2));
console.log(changed ? '[League/Final] Navegação, páginas competitivas e aliases consolidados.' : '[League/Final] Experiência final já estava consolidada.');
