const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const pagesDir = path.join(ROOT, 'public', 'pages');
const cssFile = path.join(ROOT, 'public', 'css', 'federation-portal.css');
const jsFile = path.join(ROOT, 'public', 'js', 'core', 'federation-portal.js');
const BUILD = '2026-07-14-frm-complete-v1';
const LOGO_SRC = '/api/brand/icon?v=' + BUILD;
const CSS_HREF = '/css/federation-portal.css?v=' + BUILD;
const JS_SRC = '/js/core/federation-portal.js?v=' + BUILD;
let changed = false;

function ensureDir(file) { fs.mkdirSync(path.dirname(file), { recursive: true }); }
function read(file) { return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''; }
function writeIfChanged(file, content) { ensureDir(file); if (read(file) !== content) { fs.writeFileSync(file, content, 'utf8'); changed = true; } }

function patchCss() {
  const css = read(cssFile);
  const extra = String.raw`
/* FRM complete migration */
html, body { width: 100%; overflow-x: hidden; }
.frm-main { width: 100%; max-width: 100%; }
.frm-app-content-card { width: 100%; max-width: none; min-height: calc(100vh - 96px); overflow: visible; }
.frm-app-content-card > * { max-width: none; }
.frm-app-content-card .va-shell, .frm-app-content-card .va-sidebar, .frm-app-content-card .va-topbar, .frm-app-content-card .frm-sidebar, .frm-app-content-card .frm-header { display: none !important; }
.frm-app-content-card .va-main, .frm-app-content-card main, .frm-app-content-card .container, .frm-app-content-card .page, .frm-app-content-card .content { width: 100% !important; max-width: none !important; margin: 0 !important; }
.frm-page-hero { display: grid; grid-template-columns: minmax(0, 1fr) 210px; gap: 20px; align-items: center; margin-bottom: 14px; padding: 26px; border: 1px solid var(--frm-border); border-radius: 10px; background: radial-gradient(circle at 84% 50%, rgba(139,92,246,.35), transparent 28%), rgba(4,9,20,.86); }
.frm-page-hero h1 { margin: 0; color: #fff; font-size: clamp(30px, 4vw, 46px); letter-spacing: -.04em; }
.frm-page-hero p { margin: 10px 0 0; color: var(--frm-muted); line-height: 1.65; }
.frm-page-hero img { width: 160px; height: 160px; border-radius: 999px; object-fit: cover; justify-self: center; box-shadow: 0 0 40px rgba(139,92,246,.55); }
.frm-section-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.frm-section-grid.two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.frm-section-grid.four { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.frm-data-card { border: 1px solid var(--frm-border); border-radius: 10px; background: rgba(4,9,20,.86); padding: 18px; min-height: 132px; }
.frm-data-card h3 { margin: 0 0 8px; color: #fff; }
.frm-data-card p, .frm-data-card small { color: var(--frm-muted); }
.frm-data-card .frm-btn { margin-top: 12px; }
.frm-metric { font-size: 34px; line-height: 1; color: #fff; font-weight: 950; }
.frm-table { width: 100%; border-collapse: collapse; color: #e9e4ff; }
.frm-table th, .frm-table td { text-align: left; padding: 12px 10px; border-bottom: 1px solid var(--frm-line); }
.frm-table th { color: #c084fc; text-transform: uppercase; font-size: 11px; letter-spacing: .08em; }
.frm-toolbar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin: 0 0 12px; }
.frm-input, .frm-select, .frm-textarea { width: 100%; min-height: 40px; border: 1px solid rgba(139,92,246,.28); border-radius: 8px; background: rgba(255,255,255,.035); color: #fff; padding: 10px 12px; outline: none; }
.frm-textarea { min-height: 110px; resize: vertical; }
.frm-input::placeholder, .frm-textarea::placeholder { color: #7f87a2; }
.frm-tag { display: inline-flex; align-items: center; min-height: 24px; padding: 0 9px; border-radius: 999px; background: rgba(139,92,246,.18); color: #d7c2ff; font-size: 11px; font-weight: 850; }
.frm-status-ok { color: #86efac; }
.frm-status-warn { color: #fde68a; }
.frm-board { position: relative; min-height: 520px; border: 1px solid rgba(139,92,246,.32); border-radius: 18px; overflow: hidden; background: linear-gradient(180deg, rgba(34,107,48,.6), rgba(17,65,35,.72)); box-shadow: inset 0 0 0 2px rgba(255,255,255,.08); }
.frm-board:before { content: ''; position: absolute; inset: 28px; border: 2px solid rgba(255,255,255,.16); border-radius: 12px; pointer-events: none; }
.frm-board:after { content: ''; position: absolute; left: 50%; top: 28px; bottom: 28px; border-left: 2px solid rgba(255,255,255,.16); pointer-events: none; }
.frm-slot { position: absolute; width: 142px; min-height: 64px; transform: translate(-50%, -50%); padding: 9px; border: 1px solid rgba(255,255,255,.14); border-radius: 14px; background: rgba(5,8,18,.78); color: #fff; text-align: center; box-shadow: 0 12px 28px rgba(0,0,0,.26); }
.frm-slot input { margin-top: 6px; width: 100%; border: 0; border-radius: 8px; background: rgba(255,255,255,.08); color: #fff; padding: 7px; text-align: center; }
.frm-slot small { color: #c4b5fd; }
@media (max-width: 1100px) { .frm-section-grid, .frm-section-grid.two, .frm-section-grid.four { grid-template-columns: 1fr; } .frm-page-hero { grid-template-columns: 1fr; } .frm-page-hero img { display: none; } }
`;
  if (!css.includes('FRM complete migration')) writeIfChanged(cssFile, css + extra);
}

function brandHtml() {
  return `<div class="frm-brand"><img data-frm-logo src="${LOGO_SRC}" alt="Hollow Nexus FRM"/><div><small>the</small><strong>HOLLOW NEXUS <span>FRM</span></strong><p>Federação Comunitária</p></div></div>`;
}

const navSections = [
  ['Federação', [['⌂','Início','/pages/dashboard.html'],['ⓘ','Sobre a Federação','/pages/federacao.html'],['▤','Regulamento','/pages/regulamento.html'],['▧','Atualizações','/pages/atualizacoes.html'],['?','Suporte','/pages/suporte.html']]],
  ['Competitivo', [['♕','Competições','/pages/competicoes.html'],['▣','Eventos','/pages/eventos.html'],['⌘','Chaveamento','/pages/chaveamento.html'],['☷','Grupos','/pages/grupos.html'],['⊙','Resultados','/pages/resultados.html'],['⌁','Rankings','/pages/rankings.html'],['▦','Calendário','/pages/calendario.html']]],
  ['Clubes', [['♙','Clubes Afiliados','/pages/clubes.html'],['✥','Solicitar Afiliação','/pages/formularios.html'],['♧','Elencos','/pages/elencos.html'],['▣','Prancheta Tática','/pages/prancheta-tatica.html']]],
  ['Atletas', [['♟','Jogadores Registrados','/pages/atletas.html'],['✧','Mercado / Recrutamento','/pages/mercado.html'],['⊙','Ranking de Jogadores','/pages/rankings.html'],['↔','Transferências','/pages/transferencias.html']]],
  ['Administração', [['▤','Formulários','/pages/formularios.html'],['ⓘ','Permissões','/pages/permissoes.html'],['⚙','Configurações','/pages/configuracoes.html'],['◉','Análise de Partidas','/pages/analise-partidas.html']]]
];

function navHtml(activeHref = '') {
  return navSections.map(([title, links]) => `<div class="frm-nav-title">${title}</div>` + links.map(([icon, label, href]) => `<a${href === activeHref ? ' class="active"' : ''} href="${href}"><i>${icon}</i><b>${label}</b></a>`).join('')).join('');
}

function headerHtml(active = 'inicio') {
  const tabs = [['inicio','Início','/pages/dashboard.html'],['federacao','Federação','/pages/federacao.html'],['competitivo','Competitivo','/pages/competicoes.html'],['clubes','Clubes','/pages/clubes.html'],['atletas','Atletas','/pages/atletas.html'],['admin','Administração','/pages/administracao.html']];
  return `<header class="frm-header"><nav class="frm-tabs">${tabs.map(([key,label,href]) => `<a class="${key === active ? 'active' : ''}" href="${href}">${label}</a>`).join('')}</nav><div class="frm-header-actions"><a class="frm-btn" href="/pages/perfil.html">♙ Entrar / Painel</a><a class="frm-btn discord" href="/api/discord/server/open" target="_blank" rel="noopener noreferrer">💬 Discord</a><a class="frm-icon" href="/pages/notificacoes.html">🔔<b class="frm-badge">3</b></a><a class="frm-icon" href="/pages/correio.html">✉<b class="frm-badge">5</b></a></div></header>`;
}

function pageShell({ title, active = 'inicio', activeHref = '', heroTitle, heroText, content, script = '' }) {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><title>${title} | Hollow Nexus FRM</title><link rel="icon" href="${LOGO_SRC}"/><link rel="stylesheet" href="${CSS_HREF}"/></head><body class="frm-reference-page"><div class="frm-shell"><aside class="frm-sidebar">${brandHtml()}<nav class="frm-nav" data-frm-static-nav="1">${navHtml(activeHref)}</nav></aside><main class="frm-main">${headerHtml(active)}<section class="frm-page-hero"><div><p class="frm-eyebrow">Hollow Nexus FRM</p><h1>${heroTitle}</h1><p>${heroText}</p></div><img data-frm-logo src="${LOGO_SRC}" alt="Hollow Nexus FRM"/></section>${content}<footer class="frm-footer"><div><div class="frm-footer-brand"><img data-frm-logo src="${LOGO_SRC}"/><div><strong><span class="frm-the">the</span> HOLLOW NEXUS <span>FRM</span></strong><p>Federação Comunitária de Rematch</p></div></div><p>Elevando o cenário competitivo de Rematch.</p></div><div><h4>Links rápidos</h4><p><a href="/pages/regulamento.html">Regulamento</a></p><p><a href="/pages/termos.html">Termos de Uso</a></p></div><div><h4>Contato</h4><p>Discord Oficial</p><p><a href="/pages/suporte.html">Suporte</a></p></div><div><h4>Legal</h4><p class="frm-legal">Projeto comunitário independente. Não afiliado, patrocinado ou endossado pela Sloclap, Kepler Interactive ou Rematch.</p></div></footer></main></div><script src="${JS_SRC}"></script>${script}</body></html>`;
}

function apiScript(kind) {
  return `<script>(function(){
const logo='${LOGO_SRC}';
const el=(id)=>document.getElementById(id);
const get=(url)=>fetch(url,{credentials:'include',cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject(new Error(String(r.status))));
const arr=(data,keys)=>{for(const k of keys){if(Array.isArray(data&&data[k]))return data[k];} return Array.isArray(data)?data:[];};
function safe(v,f='-'){return String(v||f).replace(/[<>]/g,'');}
async function load(){try{
 if('${kind}'==='clubes'||'${kind}'==='elencos'){const data=await get('/api/teams'); const teams=arr(data,['teams','items']); el('countA').textContent=teams.length||'0'; el('list').innerHTML=teams.map((t,i)=>'<article class="frm-data-card"><h3>'+(safe(t.name||t.teamName,'Clube'))+'</h3><p>Tag: '+safe(t.tag||t.acronym,'HNX')+'</p><p>Capitão: '+safe(t.captainName||t.ownerName||t.captain,'A definir')+'</p><span class="frm-tag">'+safe(t.status,'Afiliado')+'</span><a class="frm-btn" href="/pages/times.html">Gerenciar clube</a></article>').join('') || '<article class="frm-data-card"><h3>Cadastro aberto</h3><p>Nenhum clube listado ainda. Use Solicitar Afiliação para iniciar o registro oficial.</p><a class="frm-btn primary" href="/pages/formularios.html">Solicitar afiliação</a></article>'; }
 if('${kind}'==='atletas'||'${kind}'==='mercado'){const data=await get('/api/players'); const players=arr(data,['players','users','items']); el('countA').textContent=players.length||'0'; el('list').innerHTML=players.slice(0,60).map((p,i)=>'<article class="frm-data-card"><h3>'+(safe(p.displayName||p.name||p.username,'Atleta'))+'</h3><p>Posição: '+safe(p.position||p.role,'Livre')+'</p><p>Clube: '+safe(p.teamName||p.team,'Sem clube')+'</p><span class="frm-tag">'+safe(p.status,'Ativo')+'</span><a class="frm-btn" href="/pages/jogadores.html">Ver perfil</a></article>').join('') || '<article class="frm-data-card"><h3>Registro de atletas</h3><p>A área está pronta para receber jogadores registrados pelo site e Discord.</p><a class="frm-btn primary" href="/pages/recrutamento.html">Abrir recrutamento</a></article>'; }
 if('${kind}'==='competicoes'||'${kind}'==='calendario'){const data=await get('/api/events'); const events=arr(data,['events','tournaments','items']); el('countA').textContent=events.length||'0'; el('list').innerHTML=events.map(ev=>'<article class="frm-data-card"><h3>'+safe(ev.name||ev.title,'Competição')+'</h3><p>Formato: '+safe(ev.matchFormat||ev.format||ev.mode,'MD3')+'</p><p>Início: '+safe(ev.startAt||ev.date,'A definir')+'</p><span class="frm-tag">'+safe(ev.status,'Aberta')+'</span><a class="frm-btn" href="/pages/eventos.html">Abrir evento</a></article>').join('') || '<article class="frm-data-card"><h3>Calendário competitivo</h3><p>Nenhuma competição ativa encontrada. Cadastre eventos para aparecerem aqui automaticamente.</p><a class="frm-btn primary" href="/pages/eventos.html">Gerenciar eventos</a></article>'; }
}catch(e){el('list').innerHTML='<article class="frm-data-card"><h3>Área funcional</h3><p>Não consegui carregar a API agora, mas os atalhos oficiais continuam disponíveis para operar esta área.</p><a class="frm-btn primary" href="/pages/dashboard.html">Voltar ao portal</a></article>';}}
load();})();</script>`;
}

function createDataPage(file, cfg, kind) {
  const content = `<section class="frm-section-grid four"><article class="frm-data-card"><span class="frm-tag">Total</span><div class="frm-metric" id="countA">...</div><p>${cfg.metric}</p></article><article class="frm-data-card"><h3>${cfg.actionTitle}</h3><p>${cfg.actionText}</p><a class="frm-btn primary" href="${cfg.actionHref}">${cfg.actionButton}</a></article><article class="frm-data-card"><h3>Status oficial</h3><p>Esta área usa a estrutura FRM e preserva a operação antiga por trás.</p><span class="frm-tag">Ativo</span></article><article class="frm-data-card"><h3>Integração</h3><p>Quando houver dados vivos, a lista abaixo é preenchida pela API do site.</p><span class="frm-tag">Site + Bot</span></article></section><section class="frm-section-grid" id="list" style="margin-top:12px"></section>`;
  writeIfChanged(path.join(pagesDir, file), pageShell({ title: cfg.title, active: cfg.active, activeHref: cfg.activeHref, heroTitle: cfg.heroTitle, heroText: cfg.heroText, content, script: apiScript(kind) }));
}

function createStaticPages() {
  createDataPage('clubes.html', { title:'Clubes Afiliados', active:'clubes', activeHref:'/pages/clubes.html', heroTitle:'Clubes Afiliados', heroText:'Central oficial dos clubes da federação, com status, capitão, elenco e acesso à gestão.', metric:'clubes na base', actionTitle:'Afiliar clube', actionText:'Abra o formulário de afiliação para registrar um novo clube na federação.', actionHref:'/pages/formularios.html', actionButton:'Solicitar afiliação' }, 'clubes');
  createDataPage('elencos.html', { title:'Elencos', active:'clubes', activeHref:'/pages/elencos.html', heroTitle:'Elencos Oficiais', heroText:'Visualização dos elencos e composição dos clubes para organização competitiva.', metric:'clubes com elenco', actionTitle:'Gerenciar times', actionText:'Use a área operacional antiga já preservada para editar elenco, escudo e capitão.', actionHref:'/pages/times.html', actionButton:'Gerenciar elenco' }, 'elencos');
  createDataPage('atletas.html', { title:'Atletas Registrados', active:'atletas', activeHref:'/pages/atletas.html', heroTitle:'Atletas Registrados', heroText:'Registro oficial de jogadores, posições, clubes e situação competitiva dentro da Hollow Nexus FRM.', metric:'atletas encontrados', actionTitle:'Recrutamento', actionText:'Abra o mercado de jogadores para buscar atletas livres ou oportunidades.', actionHref:'/pages/mercado.html', actionButton:'Abrir mercado' }, 'atletas');
  createDataPage('mercado.html', { title:'Mercado / Recrutamento', active:'atletas', activeHref:'/pages/mercado.html', heroTitle:'Mercado e Recrutamento', heroText:'Área para capitães encontrarem jogadores, atletas livres e movimentações competitivas.', metric:'atletas consultados', actionTitle:'Formulário de recrutamento', actionText:'Use o fluxo existente para registrar interesse, posição e disponibilidade.', actionHref:'/pages/recrutamento.html', actionButton:'Abrir recrutamento' }, 'mercado');
  createDataPage('competicoes.html', { title:'Competições', active:'competitivo', activeHref:'/pages/competicoes.html', heroTitle:'Competições Oficiais', heroText:'Ligas, copas, torneios abertos e eventos especiais organizados pela federação.', metric:'competições listadas', actionTitle:'Eventos operacionais', actionText:'Abra a área de eventos para inscrições, formatos, limite de equipes e administração.', actionHref:'/pages/eventos.html', actionButton:'Gerenciar eventos' }, 'competicoes');
  createDataPage('calendario.html', { title:'Calendário', active:'competitivo', activeHref:'/pages/calendario.html', heroTitle:'Calendário Oficial', heroText:'Agenda competitiva da temporada com partidas, inscrições, finais e eventos especiais.', metric:'eventos no calendário', actionTitle:'Ver eventos', actionText:'Acesse a área de eventos para detalhes, inscrições e datas oficiais.', actionHref:'/pages/eventos.html', actionButton:'Abrir eventos' }, 'calendario');

  writeIfChanged(path.join(pagesDir, 'administracao.html'), pageShell({ title:'Administração', active:'admin', activeHref:'/pages/administracao.html', heroTitle:'Administração FRM', heroText:'Painel de acesso rápido para gestão da federação, permissões, formulários, tickets, configurações e análise.', content:`<section class="frm-section-grid"><article class="frm-data-card"><h3>Formulários</h3><p>Valide inscrições, afiliações e pedidos de jogadores.</p><a class="frm-btn primary" href="/pages/formularios.html">Abrir formulários</a></article><article class="frm-data-card"><h3>Permissões</h3><p>Gerencie admins, cargos e acesso às áreas restritas.</p><a class="frm-btn primary" href="/pages/permissoes.html">Abrir permissões</a></article><article class="frm-data-card"><h3>Configurações</h3><p>Configure notificações, cargos, site, Discord e rotinas.</p><a class="frm-btn primary" href="/pages/configuracoes.html">Abrir configurações</a></article><article class="frm-data-card"><h3>Suporte</h3><p>Veja tickets e registros do histórico de suporte.</p><a class="frm-btn" href="/pages/suporte.html">Abrir suporte</a></article><article class="frm-data-card"><h3>Análise de Partidas</h3><p>Central de análise e revisão competitiva.</p><a class="frm-btn" href="/pages/analise-partidas.html">Abrir análise</a></article><article class="frm-data-card"><h3>Atualizações</h3><p>Histórico oficial de mudanças do site e bot.</p><a class="frm-btn" href="/pages/atualizacoes.html">Ver changelog</a></article></section>` }));

  writeIfChanged(path.join(pagesDir, 'notificacoes.html'), pageShell({ title:'Notificações', active:'admin', activeHref:'/pages/notificacoes.html', heroTitle:'Notificações', heroText:'Central de avisos da federação, mensagens por cargo, alertas administrativos e comunicações para jogadores.', content:`<section class="frm-section-grid"><article class="frm-data-card"><h3>Alertas do site</h3><p>Receba avisos sobre eventos, tickets, inscrições e permissões.</p><span class="frm-tag">Ativo</span></article><article class="frm-data-card"><h3>Notificações por cargo</h3><p>Administração pode enviar avisos por cargos do Discord usando Configurações.</p><a class="frm-btn primary" href="/pages/configuracoes.html">Configurar</a></article><article class="frm-data-card"><h3>Correio</h3><p>Acesse mensagens internas, histórico e comunicados.</p><a class="frm-btn" href="/pages/correio.html">Abrir correio</a></article></section>` }));

  writeIfChanged(path.join(pagesDir, 'correio.html'), pageShell({ title:'Correio', active:'admin', activeHref:'/pages/correio.html', heroTitle:'Correio FRM', heroText:'Caixa de mensagens, comunicados e histórico de conversas entre federação, bot e jogadores.', content:`<section class="frm-section-grid"><article class="frm-data-card"><h3>Chat geral</h3><p>Abra o chat do site para mensagens públicas e histórico.</p><a class="frm-btn primary" href="/pages/chat.html">Abrir chat</a></article><article class="frm-data-card"><h3>Suporte</h3><p>Tickets e registros de atendimento dos jogadores.</p><a class="frm-btn" href="/pages/suporte.html">Abrir suporte</a></article><article class="frm-data-card"><h3>DMs do bot</h3><p>Mensagens enviadas pelo bot e respostas dos jogadores ficam conectadas ao histórico quando disponíveis.</p><a class="frm-btn" href="/pages/configuracoes.html">Ver notificações</a></article></section>` }));

  writeIfChanged(path.join(pagesDir, 'transferencias.html'), pageShell({ title:'Transferências', active:'atletas', activeHref:'/pages/transferencias.html', heroTitle:'Transferências', heroText:'Organize movimentações de atletas entre clubes, janela de mercado, solicitações e histórico disciplinar.', content:`<section class="frm-section-grid"><article class="frm-data-card"><h3>Janela atual</h3><p>Status: aberta para solicitações manuais via formulário.</p><span class="frm-tag">Aberta</span></article><article class="frm-data-card"><h3>Solicitar transferência</h3><p>Use formulários para registrar troca de clube, entrada ou saída de elenco.</p><a class="frm-btn primary" href="/pages/formularios.html">Abrir solicitação</a></article><article class="frm-data-card"><h3>Mercado</h3><p>Consulte atletas livres e recrutamento.</p><a class="frm-btn" href="/pages/mercado.html">Abrir mercado</a></article></section>` }));

  writeIfChanged(path.join(pagesDir, 'federacao.html'), pageShell({ title:'Sobre a Federação', active:'federacao', activeHref:'/pages/federacao.html', heroTitle:'Sobre a Federação', heroText:'A Hollow Nexus FRM organiza clubes, atletas, competições, rankings e regulamentos para o cenário comunitário de Rematch.', content:`<section class="frm-section-grid"><article class="frm-data-card"><h3>Missão</h3><p>Dar estrutura, calendário, regras e identidade para o competitivo comunitário.</p></article><article class="frm-data-card"><h3>Clubes afiliados</h3><p>Times passam a operar como clubes dentro de uma temporada oficial.</p><a class="frm-btn" href="/pages/clubes.html">Ver clubes</a></article><article class="frm-data-card"><h3>Comissão</h3><p>Administração, suporte, validações e regulamento em um só ecossistema.</p><a class="frm-btn" href="/pages/administracao.html">Administração</a></article></section>` }));

  writeIfChanged(path.join(pagesDir, 'regulamento.html'), pageShell({ title:'Regulamento', active:'federacao', activeHref:'/pages/regulamento.html', heroTitle:'Regulamento Oficial', heroText:'Regras base da federação para competições, conduta, inscrições, WO, transferências e organização competitiva.', content:`<section class="frm-section-grid two"><article class="frm-data-card"><h3>Partidas</h3><p>Formato oficial definido por evento. Para Nexus Cup, MD3 com limite de equipes e horários registrados no evento.</p></article><article class="frm-data-card"><h3>Conduta</h3><p>Fake, smurf, toxicidade, abuso de falhas ou desrespeito podem gerar advertência, suspensão ou remoção.</p></article><article class="frm-data-card"><h3>Clubes</h3><p>Clubes devem manter capitão responsável, elenco válido e comunicação ativa com a federação.</p></article><article class="frm-data-card"><h3>WO e atrasos</h3><p>Casos são avaliados pela staff conforme prova, horário, comunicação e impacto na rodada.</p></article></section>` }));

  writeIfChanged(path.join(pagesDir, 'termos.html'), pageShell({ title:'Termos de Uso', active:'federacao', activeHref:'/pages/termos.html', heroTitle:'Termos de Uso', heroText:'Condições de uso da plataforma comunitária Hollow Nexus FRM.', content:`<section class="frm-section-grid"><article class="frm-data-card"><h3>Uso comunitário</h3><p>O site é uma plataforma comunitária independente para organização de competições de Rematch.</p></article><article class="frm-data-card"><h3>Responsabilidade</h3><p>Jogadores e clubes devem manter dados corretos, respeitar regras e preservar ambiente competitivo saudável.</p></article><article class="frm-data-card"><h3>Independência</h3><p>Projeto não oficial, sem afiliação, patrocínio ou endosso da Sloclap, Kepler Interactive ou Rematch.</p></article></section>` }));

  writeIfChanged(path.join(pagesDir, 'privacidade.html'), pageShell({ title:'Privacidade', active:'federacao', activeHref:'/pages/privacidade.html', heroTitle:'Privacidade', heroText:'Como a federação usa dados de login, perfis, clubes, inscrições e suporte.', content:`<section class="frm-section-grid"><article class="frm-data-card"><h3>Dados de perfil</h3><p>Usados para identificar jogadores, clubes, capitães e participação em eventos.</p></article><article class="frm-data-card"><h3>Dados de suporte</h3><p>Tickets e históricos são usados para resolver problemas e manter rastreabilidade administrativa.</p></article><article class="frm-data-card"><h3>Preservação</h3><p>Deploys não devem apagar dados vivos; a base atual sempre tem prioridade sobre backups antigos.</p></article></section>` }));

  writeIfChanged(path.join(pagesDir, 'prancheta-tatica.html'), pageShell({ title:'Prancheta Tática 5v5', active:'clubes', activeHref:'/pages/prancheta-tatica.html', heroTitle:'Prancheta Tática 5v5', heroText:'Monte formações Rematch com exatamente cinco jogadores por lado, incluindo goleiro, sem sexto titular.', content:`<section class="frm-section-grid two"><article class="frm-data-card"><h3>Configuração</h3><p>Preencha os cinco jogadores do seu time e os cinco do adversário. A formação fica salva neste navegador para consulta rápida.</p><div class="frm-toolbar"><button class="frm-btn primary" id="saveBoard">Salvar prancheta</button><button class="frm-btn" id="clearBoard">Limpar</button></div><p id="boardStatus" class="frm-muted">Limite fixo: 5 jogadores por equipe.</p></article><article class="frm-data-card"><h3>Formações rápidas</h3><p><span class="frm-tag">1 GOL</span> <span class="frm-tag">1 DEF</span> <span class="frm-tag">2 MEI/ALA</span> <span class="frm-tag">1 ATA</span></p><p>Use as posições no campo para planejar pressão, cobertura e ataque.</p></article></section><section class="frm-board" id="tacticalBoard"><div class="frm-slot" style="left:18%;top:50%"><strong>Goleiro</strong><small>Seu time</small><input data-board="home-gol" placeholder="Nome"/></div><div class="frm-slot" style="left:32%;top:50%"><strong>Defensor</strong><small>Seu time</small><input data-board="home-def" placeholder="Nome"/></div><div class="frm-slot" style="left:43%;top:28%"><strong>Ala / Meia</strong><small>Seu time</small><input data-board="home-ala1" placeholder="Nome"/></div><div class="frm-slot" style="left:43%;top:72%"><strong>Ala / Meia</strong><small>Seu time</small><input data-board="home-ala2" placeholder="Nome"/></div><div class="frm-slot" style="left:50%;top:50%"><strong>Atacante</strong><small>Seu time</small><input data-board="home-ata" placeholder="Nome"/></div><div class="frm-slot" style="left:82%;top:50%"><strong>Goleiro</strong><small>Adversário</small><input data-board="away-gol" placeholder="Nome"/></div><div class="frm-slot" style="left:68%;top:50%"><strong>Defensor</strong><small>Adversário</small><input data-board="away-def" placeholder="Nome"/></div><div class="frm-slot" style="left:57%;top:28%"><strong>Ala / Meia</strong><small>Adversário</small><input data-board="away-ala1" placeholder="Nome"/></div><div class="frm-slot" style="left:57%;top:72%"><strong>Ala / Meia</strong><small>Adversário</small><input data-board="away-ala2" placeholder="Nome"/></div><div class="frm-slot" style="left:50%;top:50%"><strong>Atacante</strong><small>Adversário</small><input data-board="away-ata" placeholder="Nome"/></div></section>`, script:`<script>(function(){const key='frm-tactical-board-v1';const inputs=[...document.querySelectorAll('[data-board]')];try{const saved=JSON.parse(localStorage.getItem(key)||'{}');inputs.forEach(i=>i.value=saved[i.dataset.board]||'');}catch(e){}document.getElementById('saveBoard')?.addEventListener('click',()=>{const data={};inputs.forEach(i=>data[i.dataset.board]=i.value.trim());localStorage.setItem(key,JSON.stringify(data));document.getElementById('boardStatus').textContent='Prancheta salva localmente com 5 jogadores por lado.';});document.getElementById('clearBoard')?.addEventListener('click',()=>{inputs.forEach(i=>i.value='');localStorage.removeItem(key);document.getElementById('boardStatus').textContent='Prancheta limpa.';});})();</script>` }));
}

function patchFederationJsLinks() {
  let js = read(jsFile);
  if (!js) return;
  const replacements = [
    ['/pages/eventos.html\',\'COMPETITIVO', '/pages/competicoes.html\',\'COMPETITIVO'],
    ['/pages/times.html\',\'CLUBES', '/pages/clubes.html\',\'CLUBES'],
    ['/pages/jogadores.html\',\'ATLETAS', '/pages/atletas.html\',\'ATLETAS']
  ];
  for (const [from, to] of replacements) js = js.replaceAll(from, to);
  if (!js.includes('FRM complete no legacy')) {
    js += String.raw`
(function(){
  document.addEventListener('click', function(ev){
    const a = ev.target && ev.target.closest && ev.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href') || '';
    if (href === '/' || href === '/index.html') { ev.preventDefault(); location.href = '/pages/dashboard.html'; }
  }, true);
})();
// FRM complete no legacy
`;
  }
  writeIfChanged(jsFile, js);
}

function patchExistingHtml() {
  if (!fs.existsSync(pagesDir)) return;
  for (const entry of fs.readdirSync(pagesDir)) {
    if (!entry.endsWith('.html')) continue;
    const file = path.join(pagesDir, entry);
    let html = read(file);
    if (!html) continue;
    html = html.replace(/href="\/"/g, 'href="/pages/dashboard.html"');
    html = html.replace(/href="\/index\.html"/g, 'href="/pages/dashboard.html"');
    if (!html.includes('/css/federation-portal.css')) html = html.replace('</head>', `  <link rel="stylesheet" href="${CSS_HREF}" />\n</head>`);
    if (!html.includes('/js/core/federation-portal.js')) html = html.replace('</body>', `  <script src="${JS_SRC}"></script>\n</body>`);
    writeIfChanged(file, html);
  }
}

patchCss();
createStaticPages();
patchFederationJsLinks();
patchExistingHtml();

console.log(changed ? '[Federacao] Migracao completa FRM aplicada: paginas, funcoes, tela cheia e sem remendos.' : '[Federacao] Migracao completa FRM ja estava aplicada.');
