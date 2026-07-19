const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const PAGES = path.join(ROOT, 'public', 'pages');
const UPDATES = path.join(PAGES, 'atualizacoes.html');
const VERSION = path.join(ROOT, 'public', 'league-experience.json');
const BUILD = '2026-07-19-league-experience-v5';
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
    ['♕', 'Competições', '/pages/competicoes.html'], ['◇', 'Eventos', '/pages/eventos.html'], ['⌘', 'Chaveamento', '/pages/chaveamento.html'], ['≡', 'Grupos', '/pages/grupos.html'], ['◎', 'Resultados', '/pages/resultados.html'], ['▥', 'Rankings', '/pages/rankings.html'], ['□', 'Calendário', '/pages/calendario.html']
  ]],
  ['Clubes', [
    ['◈', 'Clubes Participantes', '/pages/clubes.html'], ['+', 'Cadastrar Clube', '/pages/cadastrar-clube.html'], ['▱', 'Elencos', '/pages/elencos.html'], ['▣', 'Prancheta Tática', '/pages/prancheta-tatica.html'], ['↔', 'Transferências', '/pages/transferencias.html']
  ]],
  ['Jogadores', [
    ['♙', 'Jogadores Registrados', '/pages/atletas.html'], ['✦', 'Mercado / Recrutamento', '/pages/mercado.html'], ['▥', 'Ranking de Jogadores', '/pages/rankings.html']
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
function pageKeyForModule(module = '') {
  return ({ bracket: 'chaveamento', groups: 'grupos', results: 'resultados' })[module] || module;
}
function shell({ title, tab, href, module, heroHtml, body, extraHead = '', extraScripts = '' }) {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} | Hollow Nexus League</title><link rel="icon" href="${LOGO}">${extraHead}<script src="/js/core/league-navigation.js?v=${BUILD}"></script><link rel="stylesheet" href="/css/league-critical.css?v=${BUILD}"><link rel="stylesheet" href="/css/league-polish.css?v=${BUILD}"><link rel="stylesheet" href="/css/league-experience.css?v=${BUILD}"></head><body class="frm-polish-page" data-page="${pageKeyForModule(module)}" data-hnl-module="${module || ''}" data-frm-module="${module || ''}"><div class="frm-shell"><aside class="frm-sidebar"><div class="frm-brand"><img src="${LOGO}" alt="Hollow Nexus League"><div><small>the</small><strong>HOLLOW NEXUS <span>LEAGUE</span></strong><p>Liga Comunitária</p></div></div><nav class="frm-nav">${sideNav(href)}</nav></aside><main class="frm-main"><header class="frm-header">${topNav(tab)}<div class="frm-header-actions"><a class="frm-btn" data-frm-login href="/auth/discord?next=%2Fpages%2Fperfil.html">♟ Entrar / Painel</a><a class="frm-btn discord" href="/api/discord/server/open" target="_blank" rel="noopener">💬 Discord</a><a class="frm-icon" href="/pages/notificacoes.html">🔔<b class="frm-badge" data-frm-unread>0</b></a><a class="frm-icon" href="/pages/correio.html">✉<b class="frm-badge" data-frm-mail>0</b></a></div></header>${heroHtml || ''}<div id="pageStatus"></div>${body || ''}${footer()}</main></div><div class="frm-modal" id="frmModal"><div class="frm-modal-panel" id="frmModalPanel"></div></div><script src="/js/core/social-icons.js?v=${BUILD}"></script><script src="/js/core/league-experience.js?v=${BUILD}"></script>${extraScripts}<script src="/js/core/league-auth-ui.js?v=${BUILD}"></script><script src="/js/core/league-page-integrity.js?v=${BUILD}"></script></body></html>`;
}

const profileHead = '<link rel="stylesheet" href="/css/style.css"><link rel="stylesheet" href="/css/organization.css"><link rel="stylesheet" href="/css/arena-pages.css"><link rel="stylesheet" href="/css/profile-v2.css">';
const profileScripts = '<script src="/js/core/profile-api.js"></script><script src="/js/pages/perfil.js"></script>';
const profileBody = `<section class="hnl-profile-toolbar"><div><h2>Perfil e conexões</h2><p>Edite seus dados públicos, conexões, time atual e informações competitivas.</p></div><button id="profileLogoutBtn" class="hnl-btn danger" type="button">Sair da conta</button></section>
<section class="hnl-profile-settings-layout">
  <article class="va-card va-profile-preview-card"><div id="profileBannerPreview" class="va-profile-banner-preview"></div><div class="va-profile-page-avatar" id="profileAvatarPreview">?</div><h2 id="profilePreviewName">Perfil</h2><p class="va-muted" id="profilePreviewMeta">Carregando...</p><div class="va-checklist"><span>👤 Público</span><span>🛡️ Times</span><span>📊 Rankings</span><span>🎮 Resultados</span></div><div id="currentTeamCard"></div><h3>Conexões</h3><div id="profileConnectionsPreview" class="va-connections-grid va-social-card-grid"></div><div id="playerStatsCard"></div></article>
  <article class="va-card va-profile-page-card">
    <h2>Configurações do perfil</h2><p>Esses dados ficam salvos no seu usuário e aparecem nos perfis públicos quando disponíveis.</p>
    <form id="profilePageForm" class="va-form-grid two">
      <label>Nome público<input name="username" maxlength="60"></label><label>Nome real<input name="realName" maxlength="80"></label>
      <label>País / região<select name="country"><option value="">Selecionar</option><option>Brasil</option><option>Portugal</option><option>Argentina</option><option>Chile</option><option>Uruguai</option><option>Paraguai</option><option>Bolívia</option><option>Peru</option><option>Colômbia</option><option>México</option><option>Estados Unidos</option><option>Europa</option><option>LATAM</option><option>Outro</option></select></label>
      <label>Posição principal<select name="primaryPosition"><option value="">Selecionar</option><option>Fixo</option><option>Ala Defensivo</option><option>Ala Ofensivo</option><option>Meio</option><option>Pivô</option><option>Goleiro</option><option>Atacante</option><option>Ponta Direita</option><option>Ponta Esquerda</option><option>Lateral Direito</option><option>Lateral Esquerdo</option></select></label>
      <label>Posição secundária<select name="secondaryPosition"><option value="">Selecionar</option><option>Fixo</option><option>Ala Defensivo</option><option>Ala Ofensivo</option><option>Meio</option><option>Pivô</option><option>Goleiro</option><option>Atacante</option><option>Ponta Direita</option><option>Ponta Esquerda</option><option>Lateral Direito</option><option>Lateral Esquerdo</option></select></label>
      <label>Banner do perfil<input name="banner" maxlength="1200" placeholder="URL da imagem do banner"></label>
      <label>Região competitiva<select name="region"><option value="">Selecionar</option><option>Brasil</option><option>LATAM Sul</option><option>LATAM Norte</option><option>NA</option><option>EU</option><option>Global</option><option>Europa</option><option>Ásia Nordeste</option><option>Ásia Sudeste</option><option>Austrália</option><option>Oriente Médio</option><option>África do Sul</option><option>América do Sul</option><option>Turquia</option><option>EUA Central</option><option>EUA Leste</option><option>EUA Oeste</option><option>Outro</option></select></label>
      <label>Fuso horário<select name="timezone"><option value="">Selecionar timezone</option><option value="America/Sao_Paulo">(UTC-3) America - Sao Paulo</option><option value="America/Argentina/Buenos_Aires">(UTC-3) America - Buenos Aires</option><option value="America/Santiago">(UTC-4) America - Santiago</option><option value="America/Bogota">(UTC-5) America - Bogota</option><option value="America/Mexico_City">(UTC-6) America - Mexico City</option><option value="America/New_York">(UTC-5) America - New York</option><option value="Europe/Lisbon">(UTC+0) Europe - Lisbon</option><option value="Europe/Madrid">(UTC+1) Europe - Madrid</option><option value="UTC">UTC</option></select></label>
      <label>Discord<input name="discord" maxlength="180" placeholder="Seu @, ID ou link do perfil/servidor"></label><label>Steam<input name="steam" maxlength="180"></label><label>Xbox / Gamertag<input name="xboxGamertag" maxlength="180"></label><label>TikTok<input name="tiktok" maxlength="180"></label><label>YouTube<input name="youtube" maxlength="180"></label><label>Twitter/X<input name="twitter" maxlength="180"></label><label>Spotify<input name="spotify" maxlength="240"></label><label>Riot ID<input name="riot" maxlength="160"></label><label>EA ID<input name="ea" maxlength="160"></label><label>PSN<input name="psn" maxlength="160"></label><label class="wide">Bio<textarea name="bio" maxlength="220"></textarea></label>
    </form>
    <div class="va-actions"><button id="saveProfileBtn" class="va-btn primary" type="button">Salvar perfil</button><a class="va-btn" href="/pages/dashboard.html">Cancelar</a><button id="profileLogoutBtnBottom" class="va-btn danger" type="button">Sair da conta</button><button id="deleteLocalAccountBtn" class="va-btn danger" type="button" hidden>Excluir conta local</button></div><div id="profileStatus" class="va-status">Carregando...</div>
  </article>
</section>`;

const configHead = '<link rel="stylesheet" href="/css/organization.css">';
const configScripts = `<script src="/js/core/api.js?v=${BUILD}"></script><script src="/js/pages/configuracoes.js?v=${BUILD}"></script><script>
document.addEventListener('click', function (event) {
  const trigger = event.target.closest('[data-config-open]');
  if (!trigger) return;
  const target = document.getElementById(trigger.getAttribute('data-config-open') || '');
  if (!target) return;
  if (target.tagName === 'DETAILS') target.open = true;
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
});
</script>`;
const configBody = `<section class="hnl-config-overview" id="config-system">
  <article class="hnl-card hnl-config-status-card">
    <div class="hnl-config-card-head"><div><span class="hnl-config-number">01</span><h2>Saúde do sistema</h2><p>Veja SITE, BOT e banco remoto sem misturar com as ferramentas de manutenção.</p></div><span class="hnl-config-card-icon" aria-hidden="true">◉</span></div>
    <div id="systemStatusList" class="va-list hnl-config-list"></div>
    <div class="hnl-actions"><button id="reloadConfigBtn" class="hnl-btn primary" type="button">Recarregar status</button><a class="hnl-btn" href="/pages/permissoes.html">Abrir permissões</a></div>
    <div id="configStatus" class="va-status">Carregando...</div>
  </article>
  <article class="hnl-card hnl-config-backup-card">
    <div class="hnl-config-card-head"><div><span class="hnl-config-number">02</span><h2>Backups</h2><p>Consulte o último ponto seguro antes de criar ou restaurar uma cópia.</p></div><span class="hnl-config-card-icon" aria-hidden="true">↻</span></div>
    <div id="backupSummary" class="va-list hnl-config-list"></div>
    <div class="hnl-actions"><button id="createBackupBtn" class="hnl-btn primary" type="button">Salvar backup agora</button><button id="restoreBackupBtn" class="hnl-btn danger" type="button">Restaurar último</button></div>
    <div id="backupStatus" class="va-status">Aguardando...</div>
  </article>
</section>

<section class="hnl-config-workspace">
  <aside class="hnl-config-index" aria-label="Atalhos das configurações">
    <span class="hnl-section-kicker">Central administrativa</span>
    <h2>Ferramentas</h2>
    <p>Abra somente a área que pretende usar. As demais ficam recolhidas para manter a tela limpa.</p>
    <button type="button" data-config-open="config-announcements"><span>03</span><b>Avisos do site</b><small>Correios e navegador</small></button>
    <button type="button" data-config-open="config-roles"><span>04</span><b>Mensagens por cargo</b><small>Site e DM Discord</small></button>
    <button type="button" data-config-open="config-voices"><span>05</span><b>Calls privadas</b><small>Listar e remover calls</small></button>
    <div class="hnl-config-integrations"><strong>Integrações ativas</strong><span>✓ Site conectado</span><span>✓ Ponte com o BOT</span><span>✓ Backup pelo GitHub</span><span>✓ Permissões por cargo</span></div>
  </aside>

  <div class="hnl-config-stack">
    <details class="hnl-settings-panel" id="config-announcements" open>
      <summary><span class="hnl-config-number">03</span><div><h2>Avisos do site</h2><p>Envie uma mensagem geral para os Correios e controle os alertas do navegador.</p></div><b class="hnl-settings-toggle" aria-hidden="true">+</b></summary>
      <div class="hnl-settings-content">
        <form id="siteAnnouncementForm" class="va-form-grid two hnl-config-form">
          <label>Título do aviso<input name="title" maxlength="120" placeholder="Ex: Nova função disponível" value="Aviso da Hollow Nexus League" required></label>
          <label>Mensagem<textarea name="message" maxlength="1000" rows="4" placeholder="Digite o aviso que os jogadores verão nos Correios..." required></textarea></label>
          <div class="hnl-actions wide"><button class="hnl-btn primary" type="submit">Enviar para os Correios</button><button id="openInboxPreviewBtn" class="hnl-btn" type="button">Ver meus Correios</button><button id="enableBrowserNotificationsBtn" class="hnl-btn" type="button">Ativar alerta do navegador</button></div>
        </form>
        <div id="announcementStatus" class="va-status">Aguardando mensagem.</div>
        <div class="hnl-config-history"><h3>Últimos avisos</h3><div id="announcementList" class="va-list"></div></div>
      </div>
    </details>

    <details class="hnl-settings-panel" id="config-roles">
      <summary><span class="hnl-config-number">04</span><div><h2>Notificações por cargo do Discord</h2><p>Escolha cargos e envie pelo site, por DM no Discord ou pelos dois canais.</p></div><b class="hnl-settings-toggle" aria-hidden="true">+</b></summary>
      <div class="hnl-settings-content">
        <form id="roleNotificationForm" class="va-form-grid two hnl-config-form">
          <label class="wide">Cargos do Discord
            <select name="roleIds" id="roleNotifyRoles" multiple size="8" style="display:none"></select>
            <div class="va-role-picker">
              <div class="va-role-picker-head"><span>Selecionar cargos</span><small id="roleNotifyRoleCount">0 selecionado(s)</small></div>
              <input id="roleNotifyRoleSearch" class="va-player-picker-search" placeholder="Buscar cargo por nome ou servidor..." autocomplete="off">
              <div id="roleNotifyRoleCards" class="va-role-picker-cards"><div class="va-role-card skeleton">Carregando cargos...</div></div>
              <small class="va-muted">Clique nos cards para marcar ou desmarcar vários cargos.</small>
            </div>
          </label>
          <label>Modo de envio<select name="deliveryMode"><option value="both">Site + DM Discord</option><option value="site">Somente site / Correios</option><option value="discord">Somente DM Discord</option></select></label>
          <label>Título<input name="title" maxlength="120" value="Aviso da Hollow Nexus League" required></label>
          <label class="wide">Mensagem<textarea name="message" maxlength="1200" rows="5" placeholder="Digite a mensagem para os usuários dos cargos selecionados..." required></textarea></label>
          <div class="hnl-actions wide"><button class="hnl-btn primary" type="submit">Enviar por cargo</button><button id="reloadRoleNotifyBtn" class="hnl-btn" type="button">Atualizar cargos e histórico</button></div>
        </form>
        <div id="roleNotificationStatus" class="va-status">Carregando cargos...</div>
        <div class="hnl-config-two-columns">
          <section class="hnl-config-subpanel"><h3>Histórico de envios</h3><div id="roleNotificationHistory" class="va-list"></div></section>
          <section class="hnl-config-subpanel"><h3>Conversa e respostas</h3><p class="va-muted">Selecione um jogador do servidor ou informe um Discord ID.</p>
            <div class="va-player-picker">
              <div class="va-player-picker-head"><span>Jogadores do servidor</span><small id="dmHistoryPlayerCount">Carregando...</small></div>
              <input id="dmHistoryPlayerSearch" class="va-player-picker-search" placeholder="Buscar nome, Discord ID ou cargo..." autocomplete="off">
              <select id="dmHistoryPlayerSelect" size="8" style="display:none"><option value="">Carregando jogadores...</option></select>
              <div id="dmHistoryPlayerCards" class="va-player-picker-cards"><div class="va-player-card skeleton">Carregando jogadores...</div></div>
            </div>
            <div class="hnl-config-id-row"><input id="dmHistoryDiscordId" class="hnl-input" placeholder="Discord ID manual"><button id="loadDmHistoryBtn" class="hnl-btn" type="button">Ver conversa</button><button id="dmHistoryRefreshBtn" class="hnl-btn" type="button">Atualizar</button></div>
            <div id="dmHistoryList" class="va-list"></div>
          </section>
        </div>
      </div>
    </details>

    <details class="hnl-settings-panel" id="config-voices">
      <summary><span class="hnl-config-number">05</span><div><h2>Calls privadas dos times</h2><p>Consulte as calls criadas pelo chaveamento antes de remover canais.</p></div><b class="hnl-settings-toggle" aria-hidden="true">+</b></summary>
      <div class="hnl-settings-content">
        <form id="matchVoicesForm" class="va-form-grid two hnl-config-form">
          <label>Categoria das calls<input name="categoryId" value="1523133579570184194" placeholder="ID da categoria Discord"></label>
          <div class="hnl-actions"><button id="loadMatchVoicesBtn" class="hnl-btn primary" type="button">Carregar calls</button><button id="deleteMatchVoicesBtn" class="hnl-btn danger" type="button">Apagar selecionadas</button><button id="clearAllMatchVoicesBtn" class="hnl-btn danger" type="button">Apagar todas</button></div>
        </form>
        <div id="matchVoiceStatus" class="va-status">Aguardando carregamento das calls.</div>
        <div id="matchVoiceList" class="va-list"></div>
      </div>
    </details>
  </div>
</section>`;

const pages = {
  'dashboard.html': shell({ title: 'Início', tab: 'inicio', href: '', module: 'dashboard', heroHtml: hero('the HOLLOW NEXUS <span class="frm-accent">LEAGUE</span>', 'Liga comunitária de Rematch para clubes, jogadores, competições, calendário e eventos.', '✨', 'Bem-vindo à'), body: `<section class="hnl-grid cols-4"><div class="hnl-stat"><strong data-hnl-stat="clubes">0</strong><span>Clubes participantes</span></div><div class="hnl-stat"><strong data-hnl-stat="jogadores">0</strong><span>Jogadores registrados</span></div><div class="hnl-stat"><strong data-hnl-stat="competicoes">0</strong><span>Competições ativas</span></div><div class="hnl-stat"><strong data-hnl-stat="partidas">0</strong><span>Partidas disputadas</span></div></section><section class="hnl-grid cols-2" style="margin-top:14px"><article class="hnl-card"><h2>Competições em destaque</h2><div class="hnl-grid" id="homeCompetitions"></div></article><article class="hnl-card"><h2>Ranking de clubes</h2><div class="hnl-grid" id="homeClubRanking"></div></article></section>` }),
  'perfil.html': shell({ title: 'Meu Perfil', tab: 'jogadores', href: '', module: 'profile-settings', heroHtml: hero('Meu perfil', 'Seu perfil público, conexões, time atual e configurações em um só lugar.', '👤', 'Área do jogador'), body: profileBody, extraHead: profileHead, extraScripts: profileScripts }),
  'competicoes.html': shell({ title: 'Competições', tab: 'competitivo', href: '/pages/competicoes.html', module: 'competitions', heroHtml: hero('Competições', 'Campeonatos oficiais da liga, inscrições, datas, formatos e detalhes.', '♕'), body: `<section class="hnl-subtabs" id="competitionTabs" aria-label="Filtrar competições"><button class="hnl-subtab active" type="button" data-competition-filter="active">Ativa</button><button class="hnl-subtab" type="button" data-competition-filter="upcoming">Próximas</button><button class="hnl-subtab" type="button" data-competition-filter="finished">Encerradas</button></section><section class="hnl-competition-summary"><div class="hnl-stat"><strong data-competition-stat="active">0</strong><span>Em andamento/inscrições</span></div><div class="hnl-stat"><strong data-competition-stat="registered">0</strong><span>Clubes inscritos</span></div><div class="hnl-stat"><strong data-competition-stat="slots">0</strong><span>Vagas disponíveis</span></div></section><section class="hnl-grid" id="competitionsList"></section>` }),
  'competicao.html': shell({ title: 'Detalhes da Competição', tab: 'competitivo', href: '/pages/competicoes.html', module: 'competition-detail', heroHtml: hero('Detalhes da Competição', 'Informações completas e edição administrativa sem redirecionar para Eventos.', '🎯'), body: '<div id="competitionDetail"></div>' }),
  'eventos.html': shell({ title: 'Eventos', tab: 'competitivo', href: '/pages/eventos.html', module: '', heroHtml: hero('Eventos Comunitários', 'Atividades sociais da comunidade ficam separadas das competições oficiais.', '🎉'), body: `<section class="hnl-grid"><article class="hnl-card hnl-cafe-event-card"><div class="hnl-cafe-event-head"><div><span class="hnl-chip green">Ativo</span><h2><span aria-hidden="true">☕</span> Café com Leite</h2><p>Partidas comunitárias abertas com ranking individual integrado ao servidor.</p></div><div class="hnl-cafe-event-cup" aria-hidden="true">☕</div></div><div class="hnl-event-steps"><div><strong>1. Entre no Discord</strong><span>Acesse o servidor e acompanhe os avisos do evento.</span></div><div><strong>2. Participe da fila</strong><span>Confirme presença e aguarde a organização dos times.</span></div><div><strong>3. Jogue e pontue</strong><span>A staff valida jogos, gols, passes, assistências e MVP.</span></div></div><div class="hnl-prize-grid"><div class="gold"><strong>🥇 R$ 35</strong><span>Primeiro colocado</span></div><div class="silver"><strong>🥈 R$ 15</strong><span>Segundo colocado</span></div><div class="bronze"><strong>🥉 Patente elevada</strong><span>Começa a próxima temporada uma patente acima das patentes iniciais.</span></div></div><div class="hnl-actions"><a class="hnl-btn primary" href="/pages/cafe-com-leite.html#como-funciona">Ver instruções e placar</a><a class="hnl-btn" href="/api/discord/server/open" target="_blank" rel="noopener">Participar pelo Discord</a></div></article><article class="hnl-card"><span class="hnl-chip">Discord</span><h2>Próximos eventos</h2><p>Novos eventos sociais aparecerão aqui sem misturar o fluxo competitivo.</p><a class="hnl-btn" href="/api/discord/server/open" target="_blank" rel="noopener">Abrir Discord</a></article></section>` }),
  'cafe-com-leite.html': shell({ title: 'Café com Leite', tab: 'cafe', href: '', module: 'cafe', heroHtml: hero('Café com Leite', 'Evento comunitário com partidas organizadas no Discord e ranking individual por desempenho.', '☕'), body: `<section class="hnl-card hnl-cafe-guide" id="como-funciona"><div class="hnl-console-head"><div><span class="hnl-chip green">Evento ativo</span><h2>☕ Como funciona o Café com Leite</h2><p>Um evento leve para jogar com a comunidade, formar equipes equilibradas e somar pontos individuais durante a temporada.</p></div><a class="hnl-btn primary" href="/api/discord/server/open" target="_blank" rel="noopener">Participar pelo Discord</a></div><div class="hnl-event-steps"><div><strong>1. Entre no servidor</strong><span>Use sua conta do Discord vinculada ao site para acompanhar a organização.</span></div><div><strong>2. Entre na fila</strong><span>Confirme a participação no canal do Café com Leite e aguarde a montagem dos times.</span></div><div><strong>3. Dispute as partidas</strong><span>Siga as orientações da staff e jogue as partidas anunciadas.</span></div><div><strong>4. Confira o placar</strong><span>Resultados, gols, passes, assistências, vitórias e MVP alimentam o ranking abaixo.</span></div></div><div class="hnl-prize-grid"><div class="gold"><strong>🥇 R$ 35</strong><span>Premiação do primeiro colocado.</span></div><div class="silver"><strong>🥈 R$ 15</strong><span>Premiação do segundo colocado.</span></div><div class="bronze"><strong>🥉 Vantagem de patente</strong><span>Ao iniciar a nova temporada, o terceiro colocado começa uma patente acima das patentes iniciais.</span></div></div><p class="hnl-notice">A classificação final considera os dados validados pela organização. Casos de empate seguem os critérios divulgados pela staff no Discord.</p></section><section class="hnl-card" style="margin-top:14px"><div class="hnl-filterbar"><label for="cafeSort"><strong>Ordenar por</strong></label><select class="hnl-select" id="cafeSort"><option value="points">Pontuação</option><option value="goals">Gols</option><option value="passes">Passes</option><option value="assists">Assistências</option><option value="wins">Vitórias</option><option value="matches">Jogos</option><option value="mvp">MVP</option></select><a class="hnl-btn" href="/api/discord/server/open" target="_blank" rel="noopener">Participar pelo Discord</a></div><div id="cafeRanking"></div></section>` }),
  'calendario.html': shell({ title: 'Calendário', tab: 'competitivo', href: '/pages/calendario.html', module: 'calendar', heroHtml: hero('Calendário de Julho', 'Nexus Cup, Café com Leite e próximos compromissos da liga.', '📅'), body: `<section class="hnl-card"><div class="hnl-calendar-toolbar"><div><span class="hnl-chip">Julho de 2026</span></div><div class="hnl-actions"><a class="hnl-btn" href="/pages/competicoes.html">Competições</a><a class="hnl-btn" href="/pages/eventos.html">Eventos</a></div></div><div class="hnl-calendar" id="calendarGrid"></div></section><section class="hnl-card" id="calendarEditor" hidden style="margin-top:14px"><h2>Editar calendário</h2><div id="calendarSaveStatus"></div><form id="calendarForm" class="hnl-form-grid"><div class="hnl-field"><label>Nexus Cup 1ª Edição</label><input class="hnl-input" id="nexusCupAt" type="datetime-local"></div><div class="hnl-field"><label>Café com Leite</label><input class="hnl-input" id="cafeComLeiteAt" type="datetime-local"></div><div class="hnl-field full"><label>Observação</label><textarea class="hnl-textarea" id="calendarNote"></textarea></div><div class="hnl-actions full"><button class="hnl-btn primary">Salvar calendário</button></div></form></section>` }),
  'clubes.html': shell({ title: 'Clubes Participantes', tab: 'clubes', href: '/pages/clubes.html', module: 'clubs', heroHtml: hero('Clubes Participantes', 'Perfis públicos, elencos, capitães e conexões oficiais.', '◈'), body: `<section class="hnl-filterbar"><input class="hnl-input" id="clubSearch" placeholder="Buscar clube"><a class="hnl-btn primary" href="/pages/cadastrar-clube.html">Cadastrar clube</a></section><section class="hnl-grid cols-2" id="clubsList"></section>` }),
  'times.html': '',
  'cadastrar-clube.html': shell({ title: 'Cadastrar Clube', tab: 'clubes', href: '/pages/cadastrar-clube.html', module: 'create-club', heroHtml: hero('Cadastrar Clube', 'Crie um clube vinculado à sua conta. Você será registrado como diretor e capitão inicial.', '+'), body: `<section class="hnl-card"><div id="createClubStatus"></div><form id="createClubForm" class="hnl-form-grid"><div class="hnl-field"><label>Nome do clube</label><input class="hnl-input" name="name" required></div><div class="hnl-field"><label>Tag</label><input class="hnl-input" name="tag" maxlength="12" required></div><div class="hnl-field"><label>Região</label><input class="hnl-input" name="region"></div><div class="hnl-field"><label>Logo (URL)</label><input class="hnl-input" name="logo"></div><div class="hnl-field full"><label>Descrição</label><textarea class="hnl-textarea" name="description"></textarea></div><div class="hnl-field full"><h2>Conexões públicas</h2><p class="frm-muted">Esses links aparecerão no perfil público do clube.</p></div><div class="hnl-field"><label>Discord</label><input class="hnl-input" name="socialDiscord" placeholder="https://discord.gg/..."></div><div class="hnl-field"><label>Instagram</label><input class="hnl-input" name="socialInstagram" placeholder="https://instagram.com/..."></div><div class="hnl-field"><label>X / Twitter</label><input class="hnl-input" name="socialTwitter" placeholder="https://x.com/..."></div><div class="hnl-field"><label>TikTok</label><input class="hnl-input" name="socialTiktok" placeholder="https://tiktok.com/@..."></div><div class="hnl-field"><label>YouTube</label><input class="hnl-input" name="socialYoutube" placeholder="https://youtube.com/@..."></div><div class="hnl-field"><label>Twitch</label><input class="hnl-input" name="socialTwitch" placeholder="https://twitch.tv/..."></div><div class="hnl-field full"><label>Site</label><input class="hnl-input" name="socialWebsite" placeholder="https://..."></div><div class="hnl-actions full"><button class="hnl-btn primary">Criar clube</button></div></form></section>` }),
  'elencos.html': shell({ title: 'Elencos', tab: 'clubes', href: '/pages/elencos.html', module: 'clubs', heroHtml: hero('Elencos', 'Acesse os clubes e os perfis públicos de todos os jogadores vinculados.', '♟'), body: '<section class="hnl-grid cols-2" id="clubsList"></section>' }),
  'perfil-clube.html': shell({ title: 'Perfil do Clube', tab: 'clubes', href: '/pages/clubes.html', module: 'club-profile', heroHtml: hero('Perfil Público do Clube', 'Direção, capitão, elenco, conexões e edição exclusiva da liderança.', '◈'), body: '<div id="clubPublicProfile"></div>' }),
  'atletas.html': shell({ title: 'Jogadores Registrados', tab: 'jogadores', href: '/pages/atletas.html', module: 'players', heroHtml: hero('Jogadores Registrados', 'Perfis públicos, posições, cargos, conexões e clube atual.', '👥'), body: `<section class="hnl-filterbar"><input class="hnl-input" id="playerSearch" placeholder="Buscar jogador, posição ou clube"><a class="hnl-btn" href="/pages/mercado.html">Mercado</a></section><section class="hnl-grid cols-2" id="playersList"></section>` }),
  'jogadores.html': '',
  'perfil-jogador.html': shell({ title: 'Perfil do Jogador', tab: 'jogadores', href: '/pages/atletas.html', module: 'player-profile', heroHtml: hero('Perfil Público do Jogador', 'Avatar, clube, posições, cargos, conexões e estatísticas públicas.', '👤'), body: '<div id="playerPublicProfile"></div>' }),
  'mercado.html': shell({ title: 'Mercado / Recrutamento', tab: 'jogadores', href: '/pages/mercado.html', module: 'market', heroHtml: hero('Mercado / Recrutamento', 'Capitães e donos encontram jogadores registrados e enviam convites pelo Correio.', '🔎'), body: `<div id="marketInfo"></div><section class="hnl-grid cols-2" id="marketPlayers" style="margin-top:14px"></section>` }),
  'recrutamento.html': '',
  'transferencias.html': shell({ title: 'Transferências', tab: 'clubes', href: '/pages/transferencias.html', module: 'transfers', heroHtml: hero('Mercado de Transferências', 'Solicitações organizadas entre clubes, jogadores e responsáveis.', '↔'), body: `<section class="hnl-grid cols-2"><article class="hnl-card"><h2>Nova solicitação</h2><div id="transferStatus"></div><form id="transferForm" class="hnl-form-grid"><div class="hnl-field full"><label>Jogador</label><select class="hnl-select" name="playerId" id="transferPlayer"></select></div><div class="hnl-field"><label>Clube de origem</label><select class="hnl-select" name="fromTeamId" id="transferFrom"></select></div><div class="hnl-field"><label>Clube de destino</label><select class="hnl-select" name="toTeamId" id="transferTo"></select></div><div class="hnl-field full"><label>Observação</label><textarea class="hnl-textarea" name="note"></textarea></div><div class="hnl-actions full"><button class="hnl-btn primary">Solicitar transferência</button></div></form></article><article class="hnl-card"><h2>Histórico</h2><div class="hnl-grid" id="transferHistory"></div></article></section>` }),
  'rankings.html': shell({ title: 'Rankings', tab: 'competitivo', href: '/pages/rankings.html', module: 'rankings', heroHtml: hero('Rankings da Liga', 'Clubes e jogadores apresentados com logos, avatares e estatísticas.', '📊'), body: `<section class="hnl-card"><h2>Ranking de Clubes</h2><div class="hnl-table-wrap"><table class="hnl-table"><thead><tr><th>#</th><th>Clube</th><th>Pontos</th><th>Vitórias</th><th>Gols</th></tr></thead><tbody id="clubRanking"></tbody></table></div></section><section class="hnl-card" style="margin-top:14px"><h2>Ranking de Jogadores</h2><div class="hnl-table-wrap"><table class="hnl-table"><thead><tr><th>#</th><th>Jogador</th><th>Pontos</th><th>Gols</th><th>Passes</th></tr></thead><tbody id="playerRanking"></tbody></table></div></section>` }),
  'prancheta-tatica.html': shell({ title: 'Prancheta Tática', tab: 'clubes', href: '/pages/prancheta-tatica.html', module: 'tactics', heroHtml: hero('Prancheta Tática 5v5', 'Monte a formação com jogadores reais, mova a bola e simule a progressão de um ataque.', '⚽'), body: `<section class="hnl-board-layout"><div class="hnl-board" id="tacticBoard"><div class="hnl-field-goal left" aria-hidden="true"></div><div class="hnl-field-goal right" aria-hidden="true"></div><div class="hnl-penalty-area left" aria-hidden="true"></div><div class="hnl-penalty-area right" aria-hidden="true"></div><div class="hnl-goal-area left" aria-hidden="true"></div><div class="hnl-goal-area right" aria-hidden="true"></div><div class="hnl-penalty-spot left" aria-hidden="true"></div><div class="hnl-penalty-spot right" aria-hidden="true"></div><div class="hnl-center-circle"><span></span></div></div><aside class="hnl-board-panel"><article class="hnl-card"><h2>Controles</h2><p>Adicione uma posição e escolha um jogador do site, do servidor ou do seu time.</p><div class="hnl-actions"><button class="hnl-btn primary" id="addAlly" type="button">Selecionar jogador aliado</button><button class="hnl-btn" id="addEnemy" type="button">Selecionar adversário</button><button class="hnl-btn" id="addBall" type="button">Adicionar bola</button></div><div class="hnl-field" style="margin-top:12px"><label for="attackPlan">Plano da simulação</label><select class="hnl-select" id="attackPlan"><option value="formation">Construção pela formação</option><option value="upper">Ataque pela ala superior</option><option value="lower">Ataque pela ala inferior</option><option value="direct">Ataque direto</option></select></div><div class="hnl-actions" style="margin-top:10px"><button class="hnl-btn accent" id="simulateAttack" type="button">▶ Simular ataque</button><button class="hnl-btn primary" id="saveTactic" type="button">Salvar formação</button><button class="hnl-btn danger" id="resetTactic" type="button">Resetar</button></div><div id="tacticStatus" style="margin-top:10px"></div></article><article class="hnl-card"><h2>Jogadores da formação</h2><p>Use os botões abaixo para trocar cada círculo por um avatar real. Os jogadores continuam arrastáveis no campo.</p><div class="hnl-token-list" id="tacticTokenList"></div></article></aside></section>` }),
  'chaveamento.html': shell({ title: 'Chaveamento', tab: 'competitivo', href: '/pages/chaveamento.html', module: 'bracket', heroHtml: hero('Chaveamento', 'Estrutura competitiva dentro do visual atual da liga.', '⌘'), body: '<section id="competitiveData"></section>' }),
  'grupos.html': shell({ title: 'Grupos', tab: 'competitivo', href: '/pages/grupos.html', module: 'groups', heroHtml: hero('Fase de Grupos', 'Clubes, competições e estrutura de grupos sem retornar ao site antigo.', '☷'), body: '<section id="competitiveData"></section>' }),
  'resultados.html': shell({ title: 'Resultados', tab: 'competitivo', href: '/pages/resultados.html', module: 'results', heroHtml: hero('Resultados', 'Resultados e competições no mesmo shell visual da liga.', '◉'), body: '<section id="competitiveData"></section>' }),
  'configuracoes.html': shell({ title: 'Configurações', tab: 'admin', href: '/pages/configuracoes.html', module: 'config', heroHtml: hero('Central de Configurações', 'Saúde do sistema, backups e comunicação organizados em uma única central administrativa.', '⚙'), body: configBody, extraHead: configHead, extraScripts: configScripts }),
  'administracao.html': shell({ title: 'Administração', tab: 'admin', href: '', module: '', heroHtml: hero('Administração', 'Acesso central às áreas administrativas do site e do bot.', '⚙'), body: `<section class="hnl-grid cols-2"><a class="hnl-card" href="/pages/formularios.html"><h2>▤ Formulários</h2><p>Inscrições e solicitações enviadas.</p></a><a class="hnl-card" href="/pages/permissoes.html"><h2>ⓘ Permissões</h2><p>Cargos e acessos do site.</p></a><a class="hnl-card" href="/pages/configuracoes.html"><h2>⚙ Configurações</h2><p>Integrações, canais e ajustes.</p></a><a class="hnl-card" href="/pages/analise-partidas.html"><h2>◉ Análise de Partidas</h2><p>Submissões e revisão da equipe.</p></a></section>` })
};
pages['times.html'] = pages['clubes.html'];
pages['jogadores.html'] = pages['atletas.html'];
pages['recrutamento.html'] = pages['mercado.html'];
const heroEmojis = {
  'dashboard.html': '✨', 'perfil.html': '👤', 'competicoes.html': '🏆', 'competicao.html': '🏆',
  'eventos.html': '🎉', 'cafe-com-leite.html': '☕', 'calendario.html': '📅', 'clubes.html': '🛡️',
  'times.html': '🛡️', 'cadastrar-clube.html': '🏗️', 'elencos.html': '👥', 'perfil-clube.html': '🛡️',
  'atletas.html': '👥', 'jogadores.html': '👥', 'perfil-jogador.html': '👤', 'mercado.html': '🤝',
  'recrutamento.html': '🤝', 'transferencias.html': '🔄', 'rankings.html': '📊', 'prancheta-tatica.html': '⚽',
  'chaveamento.html': '🧩', 'grupos.html': '🗂️', 'resultados.html': '📌', 'configuracoes.html': '⚙️', 'administracao.html': '🛠️'
};
function applyHeroEmoji(name, html) {
  const emoji = heroEmojis[name];
  return emoji ? html.replace(/(<div class="hnl-hero-icon"[^>]*>)[\s\S]*?(<\/div>)/i, `$1${emoji}$2`) : html;
}
Object.entries(pages).forEach(([name, html]) => write(path.join(PAGES, name), applyHeroEmoji(name, html)));

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
