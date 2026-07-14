const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const updatesFile = path.join(ROOT, 'public', 'pages', 'atualizacoes.html');
const FEDERATION_PORTAL_ID = 'release-2026-07-14-hollow-nexus-frm-global-v4';
const FEDERATION_BUTTONS_ID = 'release-2026-07-14-frm-buttons-links-v1';
const FEDERATION_COMPLETE_ID = 'release-2026-07-14-frm-complete-v1';
let changed = false;

const FEDERATION_PORTAL_CARD = String.raw`
          <article class="va-card va-update-card" id="release-2026-07-14-hollow-nexus-frm-global-v4">
            <span class="va-update-dot"></span>
            <div class="va-update-meta"><span>14/07/2026 • 00:04 BRT</span><span>Site</span><span>Federação</span></div>
            <h3>Site migrado para o shell global Hollow Nexus FRM</h3>
            <p class="va-muted">A dashboard segue a referência visual e as páginas antigas passam a abrir dentro da nova estrutura da federação.</p>
            <ul class="va-update-list">
              <li class="site">A dashboard mantém a estrutura 1:1 da referência com sidebar, topo, hero, cards, rankings, notícias e rodapé.</li>
              <li class="site">As páginas antigas agora recebem CSS/JS do portal FRM e são renderizadas dentro do novo shell visual.</li>
              <li class="site">O conteúdo funcional antigo é preservado como miolo da página, mantendo formulários, times, atletas, eventos, suporte e administração.</li>
              <li class="fix">A migração altera a casca visual sem apagar banco de dados, jogadores, clubes, eventos, tickets ou histórico.</li>
            </ul>
          </article>
`;

const FEDERATION_BUTTONS_CARD = String.raw`
          <article class="va-card va-update-card" id="release-2026-07-14-frm-buttons-links-v1">
            <span class="va-update-dot"></span>
            <div class="va-update-meta"><span>14/07/2026 • 00:14 BRT</span><span>Site</span><span>Navegação</span></div>
            <h3>Botões do portal FRM normalizados e versão antiga bloqueada</h3>
            <p class="va-muted">A navegação foi endurecida para manter todos os botões apontando para páginas funcionais dentro do visual Hollow Nexus FRM.</p>
            <ul class="va-update-list">
              <li class="site">O nome da marca passou a exibir o “the” pequeno no topo, sidebar, hero e páginas de base.</li>
              <li class="site">Foram garantidas páginas funcionais para calendário, correio, notificações, termos e privacidade.</li>
              <li class="fix">Links para /, /index.html e atalhos antigos são redirecionados para /pages/dashboard.html.</li>
              <li class="fix">As páginas antigas continuam com o miolo funcional, mas não devem mais levar o usuário para a casca visual antiga.</li>
            </ul>
          </article>
`;

const FEDERATION_COMPLETE_CARD = String.raw`
          <article class="va-card va-update-card" id="release-2026-07-14-frm-complete-v1">
            <span class="va-update-dot"></span>
            <div class="va-update-meta"><span>14/07/2026 • 00:24 BRT</span><span>Site</span><span>Federação completa</span></div>
            <h3>Migração completa das áreas FRM sem páginas vazias</h3>
            <p class="va-muted">As áreas novas foram transformadas em páginas próprias, funcionais e proporcionais, evitando remendos do site antigo.</p>
            <ul class="va-update-list">
              <li class="site">Clubes, Elencos, Atletas, Mercado, Competições e Calendário ganharam hubs FRM com carregamento de dados reais quando a API estiver disponível.</li>
              <li class="site">Administração, Correio, Notificações, Transferências, Federação, Regulamento, Termos e Privacidade ganharam páginas completas com ações úteis.</li>
              <li class="site">A Prancheta Tática virou uma área 5v5 funcional com slots para cinco jogadores por lado e salvamento local.</li>
              <li class="fix">O CSS foi reforçado para tela cheia, sem overflow horizontal e sem vazamento de sidebar/topbar antiga dentro do novo shell.</li>
              <li class="fix">A mudança preserva banco de dados, jogadores, clubes, eventos, tickets, perfis e histórico.</li>
            </ul>
          </article>
`;

function patchUpdatesPage() {
  if (!fs.existsSync(updatesFile)) return;
  let html = fs.readFileSync(updatesFile, 'utf8');
  const before = html;

  if (!html.includes(FEDERATION_COMPLETE_ID)) {
    html = html.replace('<div class="va-timeline">', '<div class="va-timeline">' + FEDERATION_COMPLETE_CARD);
  }

  if (!html.includes(FEDERATION_BUTTONS_ID)) {
    html = html.replace('<div class="va-timeline">', '<div class="va-timeline">' + FEDERATION_BUTTONS_CARD);
  }

  if (!html.includes(FEDERATION_PORTAL_ID)) {
    html = html.replace('<div class="va-timeline">', '<div class="va-timeline">' + FEDERATION_PORTAL_CARD);
  }

  const versionTexts = [
    'Void Arena 5.1.3 • Atual',
    'Void Arena 5.1.3 • Atualizado em 13/07/2026 às 20:20 BRT',
    'Hollow Nexus FRM • Atualizado em 13/07/2026 às 23:28 BRT',
    'Hollow Nexus FRM • Atualizado em 13/07/2026 às 23:40 BRT',
    'Hollow Nexus FRM • Atualizado em 13/07/2026 às 23:58 BRT',
    'Hollow Nexus FRM • Atualizado em 14/07/2026 às 00:04 BRT',
    'Hollow Nexus FRM • Atualizado em 14/07/2026 às 00:14 BRT'
  ];
  versionTexts.forEach((text) => {
    html = html.replace(
      '<span class="va-version-pill">' + text + '</span>',
      '<span class="va-version-pill">Hollow Nexus FRM • Atualizado em 14/07/2026 às 00:24 BRT</span>'
    );
  });

  [
    'Navegação global, assets blindados, tickets de suporte e dados preservados.',
    'Portal Hollow Nexus FRM integrado com dados vivos preservados.',
    'Portal Hollow Nexus FRM isolado, limpo e pronto para migração gradual.',
    'Dashboard Hollow Nexus FRM recriada pela referência visual.',
    'Site migrado para o shell global Hollow Nexus FRM.',
    'Botões funcionais no shell Hollow Nexus FRM.'
  ].forEach((text) => {
    html = html.replace(
      '<h2 class="va-update-title">' + text + '</h2>',
      '<h2 class="va-update-title">Migração completa Hollow Nexus FRM com páginas funcionais.</h2>'
    );
  });

  html = html.replace('<span><strong>Site</strong><b>tickets/histórico</b></span>', '<span><strong>Site</strong><b>FRM completo</b></span>');
  html = html.replace('<span><strong>Site</strong><b>portal FRM</b></span>', '<span><strong>Site</strong><b>FRM completo</b></span>');
  html = html.replace('<span><strong>Site</strong><b>dashboard FRM</b></span>', '<span><strong>Site</strong><b>FRM completo</b></span>');
  html = html.replace('<span><strong>Site</strong><b>shell FRM</b></span>', '<span><strong>Site</strong><b>FRM completo</b></span>');
  html = html.replace('<span><strong>Site</strong><b>botões FRM</b></span>', '<span><strong>Site</strong><b>FRM completo</b></span>');

  if (html !== before) {
    fs.writeFileSync(updatesFile, html, 'utf8');
    changed = true;
  }
}

patchUpdatesPage();
try {
  require('./patchFederationButtonsRuntime');
} catch (error) {
  console.error('[Federacao] Falha ao aplicar patch de botoes FRM:', error.message);
}
console.log(changed ? '[Atualizacoes] Migracao completa FRM registrada.' : '[Atualizacoes] Migracao completa FRM ja estava registrada.');
