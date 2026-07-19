const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const PAGES = path.join(ROOT, 'public', 'pages');
const UPDATES = path.join(PAGES, 'atualizacoes.html');
const VERSION = path.join(ROOT, 'public', 'league-experience.json');
const BUILD = '2026-07-18-league-experience-v1';
const LOGO = '/assets/hollow-nexus-official.svg';
let changed = false;

function read(file) { return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''; }
function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (read(file) !== content) { fs.writeFileSync(file, content, 'utf8'); changed = true; }
}
function walkHtml(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walkHtml(full) : (entry.isFile() && entry.name.endsWith('.html') ? [full] : []);
  });
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
    ['🏆', 'Competições', '/pages/competicoes.html'], ['🎉', 'Eventos', '/pages/eventos.html'], ['⌘', 'Chaveamento', '/pages/chaveamento.html'], ['☷', 'Grupos', '/pages/grupos.html'], ['◉', 'Resultados', '/pages/resultados.html'], ['📊', 'Rankings', '/pages/rankings.html'], ['📅', 'Calendário', '/pages/calendario.html']
  ]],
  ['Clubes', [
    ['🛡️', 'Clubes Participantes', '/pages/clubes.html'], ['✚', 'Cadastrar Clube', '/pages/cadastrar-clube.html'], ['♟', 'Elencos', '/pages/elencos.html'], ['▣', 'Prancheta Tática', '/pages/prancheta-tatica.html'], ['↔', 'Transferências', '/pages/transferencias.html']
  ]],
  ['Jogadores', [
    ['👤', 'Jogadores Registrados', '/pages/atletas.html'], ['✧', 'Mercado / Recrutamento', '/pages/mercado.html'], ['🏅', 'Ranking de Jogadores', '/pages/rankings.html']
  ]],
  ['Administração', [
    ['▤', 'Formulários', '/pages/formularios.html'], ['ⓘ', 'Permissões', '/pages/permissoes.html'], ['⚙', 'Configurações', '/pages/configuracoes.html'], ['◉', 'Análise de Partidas', '/pages/analise-partidas.html']
  ]]
];

function topNav(active = '') {
  return `<nav class="frm-tabs">${topItems.map(([key, label, href]) => `<a class="${key === active ? 'active' : ''}" href="${href}">${label}</a>`).join('')}</nav>`;
}
function sideNav(activeHref = '') {
  return sideGroups.map(([title, links]) => `<div class="frm-nav-title">${title}</div>${links.map(([icon, label, href]) => `<a class="${href === activeHref ? 'active' : ''}" href="${href}"><i>${icon}</i><b>${label}</b></a>`).join('')}`).join('');
}
function footer() {
  return `<footer class="frm-footer"><div><div class="frm-footer-brand"><img src="${LOGO}" alt="Hollow Nexus League"><div><strong>the HOLLOW NEXUS <span class="frm-accent">LEAGUE</span></strong><p>Liga Comunitária de Rematch</p></div></div><p>Competições, clubes, jogadores e eventos em uma plataforma comunitária independente.</p></div><div><h4>Liga</h4><div class="hnl-footer-links"><a href="/pages/federacao.html">Sobre a Liga</a><a href="/pages/regulamento.html">Regulamento</a><a href="/pages/atualizacoes.html">Atualizações</a><a href="/pages/suporte.html">Suporte</a></div></div><div><h4>Links rápidos</h4><div class="hnl-footer-links"><a href="/pages/competicoes.html">Competições</a><a href="/pages/clubes.html">Clubes</a><a href="/pages/atletas.html">Jogadores</a><a href="/pages/cafe-com-leite.html">Café com Leite</a></div></div><div><h4>Contato</h4><div class="hnl-footer-links"><a href="/api/discord/server/open" target="_blank" rel="noopener">Discord Oficial</a><a href="/pages/suporte.html">Abrir suporte</a></div></div><div><h4>Legal</h4><p>Liga comunitária independente. Não afiliada, patrocinada ou endossada por Rematch, Sloclap ou Kepler Interactive.</p><p>© 2026 The Hollow Nexus League.</p></div></footer>`;
}
function hero(title, text, icon, kicker = 'Hollow Nexus League') {
  return `<section class="frm-page-hero"><div><span class="hnl-section-kicker">${kicker}</span><h1>${title}</h1><p>${text}</p></div><div class="hnl-hero-icon" aria-hidden="true">${icon}</div></section>`;
}
function shell({ title, tab, href, module, heroHtml, body }) {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} | Hollow Nexus League</title><link rel="icon" href="${LOGO}"><link rel="stylesheet" href="/css/league-critical.css?v=${BUILD}"><link rel="stylesheet" href="/css/league-polish.css?v=${BUILD}"><link rel="stylesheet" href="/css/league-experience.css?v=${BUILD}"><link rel="stylesheet" href="/css/league-auth-ui.css?v=${BUILD}"></head><body class="frm-polish-page" data-hnl-module="${module || ''}" data-frm-module="${module || ''}"><div class="frm-shell"><aside class="frm-sidebar"><div class="frm-brand"><img src="${LOGO}" alt="Hollow Nexus League"><div><small>the</small><strong>HOLLOW NEXUS <span>LEAGUE</span></strong><p>Liga Comunitária</p></div></div><nav class="frm-nav">${sideNav(href)}</nav></aside><main class="frm-main"><header class="frm-header">${topNav(tab)}<div class="frm-header-actions"><a class="frm-btn" data-frm-login href="/auth/discord?next=%2Fpages%2Fperfil.html">♟ Entrar / Painel</a><a class="frm-btn discord" href="/api/discord/server/open" target="_blank" rel="noopener">💬 Discord</a><a class="frm-icon" href="/pages/notificacoes.html">🔔<b class="frm-badge" data-frm-unread>0</b></a><a class="frm-icon" href="/pages/correio.html">✉<b class="frm-badge" data-frm-mail>0</b></a></div></header>${heroHtml || ''}<div id="pageStatus"></div>${body || ''}${footer()}</main></div><div class="frm-modal" id="frmModal"><div class="frm-modal-panel" id="frmModalPanel"></div></div><script src="/js/core/league-experience.js?v=${BUILD}"></script><script src="/js/core/league-auth-ui.js?v=${BUILD}"></script><script src="/js/core/league-page-integrity.js?v=${BUILD}"></script></body></html>`;
}

const pages = {
  'dashboard.html': shell({ title: 'Início', tab: 'inicio', href: '', module: 'dashboard', heroHtml: hero('the HOLLOW NEXUS <span class="frm-accent">LEAGUE</span>', 'Liga comunitária de Rematch para clubes, jogadores, competições, calendário e eventos.', '✦', 'Bem-vindo à'), body: `<section class="hnl-grid cols-4"><div class="hnl-stat"><strong data-hnl-stat="clubes">0</strong><span>Clubes participantes</span></div><div class="hnl-stat"><strong data-hnl-stat="jogadores">0</strong><span>Jogadores registrados</span></div><div class="hnl-stat"><strong data-hnl-stat="competicoes">0</strong><span>Competições ativas</span></div><div class="hnl-stat"><strong data-hnl-stat="partidas">0</strong><span>Partidas disputadas</span></div></section><section class="hnl-grid cols-2" style="margin-top:14px"><article class="hnl-card"><h2>Competições em destaque</h2><div class="hnl-grid" id="homeCompetitions"></div></article><article class="hnl-card"><h2>Ranking de clubes</h2><div class="hnl-grid" id="homeClubRanking"></div></article></section>` }),
  'competicoes.html': shell({ title: 'Competições', tab: 'competitivo', href: '/pages/competicoes.html', module: 'competitions', heroHtml: hero('Competições', 'Campeonatos oficiais da liga, inscrições, datas, formatos e detalhes.', '🏆'), body: '<section class="hnl-grid cols-3" id="competitionsList"></section>' }),
  'competicao.html': shell({ title: 'Detalhes da Competição', tab: 'competitivo', href: '/pages/competicoes.html', module: 'competition-detail', heroHtml: hero('Detalhes da Competição', 'Informações completas e edição administrativa sem redirecionar para Eventos.', '🎯'), body: '<div id="competitionDetail"></div>' }),
  'eventos.html': shell({ title: 'Eventos', tab: 'competitivo', href: '/pages/eventos.html', module: '', heroHtml: hero('Eventos Comunitários', 'Atividades sociais da comunidade ficam separadas das competições oficiais.', '🎉'), body: `<section class="hnl-grid cols-2"><article class="hnl-card"><span class="hnl-chip green">Ativo</span><h2>Café com Leite</h2><p>Partidas comunitárias com ranking individual integrado ao servidor.</p><a class="hnl-btn primary" href="/pages/cafe-com-leite.html">Abrir placar</a></article><article class="hnl-card"><span class="hnl-chip">Discord</span><h2>Próximos eventos</h2><p>Novos eventos sociais aparecerão aqui sem misturar o fluxo competitivo.</p><a class="hnl-btn" href="/api/discord/server/open" target="_blank">Abrir Discord</a></article></section>` }),
  'cafe-com-leite.html': shell({ title: 'Café com Leite', tab: 'cafe', href: '', module: 'cafe', heroHtml: hero('Café com Leite', 'Placar individual de todos os membros, ordenável por pontos, gols, passes e outras métricas.', '☕'), body: `<section class="hnl-card"><div class="hnl-filterbar"><label for="cafeSort"><strong>Ordenar por</strong></label><select class="hnl-select" id="cafeSort"><option value="points">Pontuação</option><option value="goals">Gols</option><option value="passes">Passes</option><option value="assists">Assistências</option><option value="wins">Vitórias</option><option value="matches">Jogos</option><option value="mvp">MVP</option></select><a class="hnl-btn" href="/api/discord/server/open" target="_blank">Participar pelo Discord</a></div><div id="cafeRanking"></div></section>` }),
  'calendario.html': shell({ title: 'Calendário', tab: 'competitivo', href: '/pages/calendario.html', module: 'calendar', heroHtml: hero('Calendário de Julho', 'Nexus Cup, Café com Leite e próximos compromissos da liga.', '📅'), body: `<section class="hnl-card"><div class="hnl-calendar-toolbar"><div><span class="hnl-chip">Julho de 2026</span></div><div class="hnl-actions"><a class="hnl-btn" href="/pages/competicoes.html">Competições</a><a class="hnl-btn" href="/pages/eventos.html">Eventos</a></div></div><div class="hnl-calendar" id="calendarGrid"></div></section><section class="hnl-card" id="calendarEditor" hidden style="margin-top:14px"><h2>Editar calendário</h2><div id="calendarSaveStatus"></div><form id="calendarForm" class="hnl-form-grid"><div class="hnl-field"><label>Nexus Cup 1ª Edição</label><input class="hnl-input" id="nexusCupAt" type="datetime-local"></div><div class="hnl-field"><label>Café com Leite</label><input class="hnl-input" id="cafeComLeiteAt" type="datetime-local"></div><div class="hnl-field full"><label>Observação</label><textarea class="hnl-textarea" id="calendarNote"></textarea></div><div class="hnl-actions full"><button class="hnl-btn primary">Salvar calendário</button></div></form></section>` }),
  'clubes.html': shell({ title: 'Clubes Participantes', tab: 'clubes', href: '/pages/clubes.html', module: 'clubs', heroHtml: hero('Clubes Participantes', 'Perfis públicos, elencos, capitães e ferramentas de gestão.', '🛡️'), body: `<section class="hnl-filterbar"><input class="hnl-input" id="clubSearch" placeholder="Buscar clube"><a class="hnl-btn primary" href="/pages/cadastrar-clube.html">Cadastrar clube</a></section><section class="hnl-grid cols-2" id="clubsList"></section>` }),
  'times.html': '',
  'cadastrar-clube.html': shell({ title: 'Cadastrar Clube', tab: 'clubes', href: '/pages/cadastrar-clube.html', module: 'create-club', heroHtml: hero('Cadastrar Clube', 'Crie um clube vinculado à sua conta. Você será registrado como dono, diretor e capitão inicial.', '✚'), body: `<section class="hnl-card"><div id="createClubStatus"></div><form id="createClubForm" class="hnl-form-grid"><div class="hnl-field"><label>Nome do clube</label><input class="hnl-input" name="name" required></div><div class="hnl-field"><label>Tag</label><input class="hnl-input" name="tag" maxlength="12" required></div><div class="hnl-field"><label>Região</label><input class="hnl-input" name="region"></div><div class="hnl-field"><label>Logo (URL)</label><input class="hnl-input" name="logo"></div><div class="hnl-field full"><label>Descrição</label><textarea class="hnl-textarea" name="description"></textarea></div><div class="hnl-actions full"><button class="hnl-btn primary">Criar clube</button></div></form></section>` }),
  'elencos.html': shell({ title: 'Elencos', tab: 'clubes', href: '/pages/elencos.html', module: 'clubs', heroHtml: hero('Elencos', 'Acesse os clubes e os perfis públicos de todos os jogadores vinculados.', '♟'), body: '<section class="hnl-grid cols-2" id="clubsList"></section>' }),
  'perfil-clube.html': shell({ title: 'Perfil do Clube', tab: 'clubes', href: '/pages/clubes.html', module: 'club-profile', heroHtml: hero('Perfil Público do Clube', 'Direção, capitão, elenco, conexões e administração para responsáveis.', '🏰'), body: '<div id="clubPublicProfile"></div>' }),
  'atletas.html': shell({ title: 'Jogadores Registrados', tab: 'jogadores', href: '/pages/atletas.html', module: 'players', heroHtml: hero('Jogadores Registrados', 'Perfis públicos, posições, cargos, conexões e clube atual.', '👥'), body: `<section class="hnl-filterbar"><input class="hnl-input" id="playerSearch" placeholder="Buscar jogador, posição ou clube"><a class="hnl-btn" href="/pages/mercado.html">Mercado</a></section><section class="hnl-grid cols-2" id="playersList"></section>` }),
  'jogadores.html': '',
  'perfil-jogador.html': shell({ title: 'Perfil do Jogador', tab: 'jogadores', href: '/pages/atletas.html', module: 'player-profile', heroHtml: hero('Perfil Público do Jogador', 'Avatar, clube, posições, cargos, conexões e estatísticas públicas.', '👤'), body: '<div id="playerPublicProfile"></div>' }),
  'mercado.html': shell({ title: 'Mercado / Recrutamento', tab: 'jogadores', href: '/pages/mercado.html', module: 'market', heroHtml: hero('Mercado / Recrutamento', 'Capitães e donos encontram jogadores registrados e enviam convites pelo Correio.', '🔎'), body: `<div id="marketInfo"></div><section class="hnl-grid cols-2" id="marketPlayers" style="margin-top:14px"></section>` }),
  'recrutamento.html': '',
  'transferencias.html': shell({ title: 'Transferências', tab: 'clubes', href: '/pages/transferencias.html', module: 'transfers', heroHtml: hero('Mercado de Transferências', 'Solicitações organizadas entre clubes, jogadores e responsáveis.', '↔'), body: `<section class="hnl-grid cols-2"><article class="hnl-card"><h2>Nova solicitação</h2><div id="transferStatus"></div><form id="transferForm" class="hnl-form-grid"><div class="hnl-field full"><label>Jogador</label><select class="hnl-select" name="playerId" id="transferPlayer"></select></div><div class="hnl-field"><label>Clube de origem</label><select class="hnl-select" name="fromTeamId" id="transferFrom"></select></div><div class="hnl-field"><label>Clube de destino</label><select class="hnl-select" name="toTeamId" id="transferTo"></select></div><div class="hnl-field full"><label>Observação</label><textarea class="hnl-textarea" name="note"></textarea></div><div class="hnl-actions full"><button class="hnl-btn primary">Solicitar transferência</button></div></form></article><article class="hnl-card"><h2>Histórico</h2><div class="hnl-grid" id="transferHistory"></div></article></section>` }),
  'rankings.html': shell({ title: 'Rankings', tab: 'competitivo', href: '/pages/rankings.html', module: 'rankings', heroHtml: hero('Rankings da Liga', 'Clubes e jogadores apresentados com logos, avatares e estatísticas.', '📊'), body: `<section class="hnl-card"><h2>Ranking de Clubes</h2><div class="hnl-table-wrap"><table class="hnl-table"><thead><tr><th>#</th><th>Clube</th><th>Pontos</th><th>Vitórias</th><th>Gols</th></tr></thead><tbody id="clubRanking"></tbody></table></div></section><section class="hnl-card" style="margin-top:14px"><h2>Ranking de Jogadores</h2><div class="hnl-table-wrap"><table class="hnl-table"><thead><tr><th>#</th><th>Jogador</th><th>Pontos</th><th>Gols</th><th>Passes</th></tr></thead><tbody id="playerRanking"></tbody></table></div></section>` }),
  'prancheta-tatica.html': shell({ title: 'Prancheta Tática', tab: 'clubes', href: '/pages/prancheta-tatica.html', module: 'tactics', heroHtml: hero('Prancheta Tática 5v5', 'Campo maior, jogadores editáveis, bola móvel e salvamento da formação.', '⚽'), body: `<section class="hnl-board-layout"><div class="hnl-board" id="tacticBoard"><div class="hnl-center-circle"></div></div><aside class="hnl-board-panel"><article class="hnl-card"><h2>Controles</h2><div class="hnl-actions"><button class="hnl-btn primary" id="addAlly">Adicionar jogador</button><button class="hnl-btn" id="addEnemy">Adicionar adversário</button><button class="hnl-btn" id="addBall">Adicionar bola</button></div><div class="hnl-actions" style="margin-top:10px"><button class="hnl-btn primary" id="saveTactic">Salvar formação</button><button class="hnl-btn danger" id="resetTactic">Resetar</button></div><div id="tacticStatus" style="margin-top:10px"></div></article><article class="hnl-card"><h2>Jogadores</h2><p>Clique para editar. Também é possível arrastar no campo e dar duplo clique no token.</p><div class="hnl-token-list" id="tacticTokenList"></div></article></aside></section>` }),
  'chaveamento.html': shell({ title: 'Chaveamento', tab: 'competitivo', href: '/pages/chaveamento.html', module: 'bracket', heroHtml: hero('Chaveamento', 'Estrutura competitiva dentro do visual atual da liga.', '⌘'), body: '<section id="competitiveData"></section>' }),
  'grupos.html': shell({ title: 'Grupos', tab: 'competitivo', href: '/pages/grupos.html', module: 'groups', heroHtml: hero('Fase de Grupos', 'Clubes, competições e estrutura de grupos sem retornar ao site antigo.', '☷'), body: '<section id="competitiveData"></section>' }),
  'resultados.html': shell({ title: 'Resultados', tab: 'competitivo', href: '/pages/resultados.html', module: 'results', heroHtml: hero('Resultados', 'Resultados e competições no mesmo shell visual da liga.', '◉'), body: '<section id="competitiveData"></section>' }),
  'administracao.html': shell({ title: 'Administração', tab: 'admin', href: '', module: '', heroHtml: hero('Administração', 'Acesso central às áreas administrativas do site e do bot.', '⚙'), body: `<section class="hnl-grid cols-2"><a class="hnl-card" href="/pages/formularios.html"><h2>▤ Formulários</h2><p>Inscrições e solicitações enviadas.</p></a><a class="hnl-card" href="/pages/permissoes.html"><h2>ⓘ Permissões</h2><p>Cargos e acessos do site.</p></a><a class="hnl-card" href="/pages/configuracoes.html"><h2>⚙ Configurações</h2><p>Integrações, canais e ajustes.</p></a><a class="hnl-card" href="/pages/analise-partidas.html"><h2>◉ Análise de Partidas</h2><p>Submissões e revisão da equipe.</p></a></section>` })
};
pages['times.html'] = pages['clubes.html'];
pages['jogadores.html'] = pages['atletas.html'];
pages['recrutamento.html'] = pages['mercado.html'];
Object.entries(pages).forEach(([name, html]) => write(path.join(PAGES, name), html));

function normalizeExistingPage(file) {
  let html = read(file);
  if (!html || !html.includes('frm-shell')) return;
  const before = html;
  html = html.replace(/<nav class="frm-tabs">[\s\S]*?<\/nav>/i, topNav(''));
  html = html.replace(/<nav class="frm-nav">[\s\S]*?<\/nav>/i, `<nav class="frm-nav">${sideNav('')}</nav>`);
  html = html.replace(/<footer class="frm-footer">[\s\S]*?<\/footer>/i, footer());
  if (!html.includes('/css/league-experience.css')) html = html.replace('</head>', `<link rel="stylesheet" href="/css/league-experience.css?v=${BUILD}">\n</head>`);
  if (html !== before) write(file, html);
}
walkHtml(PAGES).forEach(normalizeExistingPage);

let updates = read(UPDATES);
if (updates && !updates.includes('release-2026-07-18-league-experience')) {
  const card = `<article class="va-card va-update-card" id="release-2026-07-18-league-experience"><span class="va-update-dot"></span><div class="va-update-meta"><span>18/07/2026 • 22:47 BRT</span><span>Site</span><span>Navegação/Perfis/Clubes/Competitivo</span></div><h3>Experiência da Hollow Nexus League reorganizada</h3><p class="va-muted">Menus duplicados foram removidos, perfis públicos e gestão de clubes foram conectados aos dados reais, e as áreas competitivas passaram a usar o mesmo shell visual.</p><ul class="va-update-list"><li class="site">Topo reduzido às áreas principais e barra lateral reservada para ações e páginas secundárias.</li><li class="site">Café com Leite ganhou página própria com ranking individual e ordenação por métricas.</li><li class="fix">Cadastrar Clube não redireciona mais para Formulários; perfis públicos de clubes e jogadores ficaram acessíveis.</li><li class="fix">Prancheta tática ampliada, calendário editável, detalhes de competição e páginas de chaveamento/grupos/resultados no visual atual.</li><li class="fix">Nenhum jogador, clube, evento, inscrição ou registro existente foi sobrescrito.</li></ul></article>`;
  updates = updates.includes('<article class="va-card va-update-card"') ? updates.replace('<article class="va-card va-update-card"', `${card}\n<article class="va-card va-update-card"`) : updates.replace('</main>', `${card}\n</main>`);
  write(UPDATES, updates);
}
write(VERSION, JSON.stringify({ build: BUILD, pages: Object.keys(pages), updatedAt: '2026-07-18T22:47:00-03:00' }, null, 2));
console.log(changed ? '[League/Experience] Navegação e páginas principais reconstruídas.' : '[League/Experience] Navegação e páginas principais já estavam atualizadas.');
