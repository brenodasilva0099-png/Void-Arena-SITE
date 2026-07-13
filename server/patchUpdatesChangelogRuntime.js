const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const updatesFile = path.join(ROOT, 'public', 'pages', 'atualizacoes.html');
let changed = false;

const RELEASE_ID = 'release-2026-07-12-fluxo-estavel';
const ASSET_FIX_ID = 'release-2026-07-12-assets-css-js';
const ADMIN_ACCESS_ID = 'release-2026-07-13-admin-discord-access';
const NAV_SHELL_ID = 'release-2026-07-13-global-navigation-shell';
const HARD_ASSET_GUARD_ID = 'release-2026-07-13-hard-static-guard-v3';

const RELEASE_CARD = String.raw`
          <article class="va-card va-update-card" id="release-2026-07-12-fluxo-estavel">
            <span class="va-update-dot"></span>
            <div class="va-update-meta"><span>12/07/2026 • 11:55 BRT</span><span>Site + Bot</span><span>Fluxo estável</span></div>
            <h3>Rotas, suporte, notificações e preservação de dados estabilizados</h3>
            <p class="va-muted">Pacote de manutenção para manter dados vivos entre deploys, melhorar navegação entre páginas e registrar o fluxo de suporte/notificações no site e no Discord.</p>
            <ul class="va-update-list">
              <li class="fix">Rotas de páginas /pages/*.html ganharam camada estável com cache limpo para evitar tela branca, CSS antigo e versões mal carregadas.</li>
              <li class="site">O botão Suporte passou a ser garantido em todas as navegações e páginas com sidebar.</li>
              <li class="site">A área de Configurações ganhou notificações por cargo do Discord, com escolha entre Site + DM, somente Site ou somente DM.</li>
              <li class="bot">O histórico de mensagens por DM agora registra envios do bot e respostas dos jogadores quando a conversa é aberta/atualizada.</li>
              <li class="site">Seletores de cargos e jogadores foram melhorados com busca, cards visuais, múltipla seleção e rolagem interna.</li>
              <li class="bot">O evento Nexus cup 1ª Edição foi garantido no banco vivo com formato MD3, limite 32 e início em 18/07/2026 às 19:30.</li>
              <li class="fix">Deploys passaram a preservar o estado atual de jogadores, times, eventos, formulários, suporte, perfis, conexões, chaveamento e placar.</li>
            </ul>
          </article>
`;

const ASSET_FIX_CARD = String.raw`
          <article class="va-card va-update-card" id="release-2026-07-12-assets-css-js">
            <span class="va-update-dot"></span>
            <div class="va-update-meta"><span>12/07/2026 • 12:07 BRT</span><span>Site</span><span>Rotas/CSS/JS</span></div>
            <h3>Correção dura para CSS e JavaScript não carregarem como HTML</h3>
            <p class="va-muted">As rotas de assets foram reforçadas para evitar que CSS/JS caiam em fallback de página durante navegação entre setores.</p>
            <ul class="va-update-list">
              <li class="fix">Arquivos em /css, /js e /assets agora têm rota explícita antes de páginas, manutenção e fallback geral.</li>
              <li class="fix">CSS sempre responde como text/css e JavaScript sempre responde como application/javascript.</li>
              <li class="fix">Se um asset faltar, o servidor responde 404 limpo em texto, nunca HTML/Internal Server Error.</li>
              <li class="site">Isso protege Chaveamento, Eventos, Configurações, Jogadores, Times e demais setores contra layout cru ou VoidArena indefinido.</li>
            </ul>
          </article>
`;

const ADMIN_ACCESS_CARD = String.raw`
          <article class="va-card va-update-card" id="release-2026-07-13-admin-discord-access">
            <span class="va-update-dot"></span>
            <div class="va-update-meta"><span>13/07/2026 • 12:59 BRT</span><span>Site</span><span>Admin</span></div>
            <h3>Novo Discord ID liberado como administrador do site</h3>
            <p class="va-muted">O usuário Discord 623932415034916865 foi adicionado como administrador padrão para acessar áreas administrativas do site.</p>
            <ul class="va-update-list">
              <li class="site">A liberação foi aplicada na camada central de acesso por sessão.</li>
              <li class="site">Também foi coberta a checagem administrativa legada usada por algumas rotas antigas.</li>
              <li class="fix">A permissão é de administrador do site, sem promover o usuário a owner principal do projeto.</li>
            </ul>
          </article>
`;

const NAV_SHELL_CARD = String.raw`
          <article class="va-card va-update-card" id="release-2026-07-13-global-navigation-shell">
            <span class="va-update-dot"></span>
            <div class="va-update-meta"><span>13/07/2026 • 20:00 BRT</span><span>Site</span><span>Navegação</span></div>
            <h3>Menu e topo do site padronizados em todas as páginas</h3>
            <p class="va-muted">A navegação ganhou uma camada global para manter os mesmos botões e atalhos visíveis em todos os setores do site.</p>
            <ul class="va-update-list">
              <li class="site">Grupos, Chaveamento, Suporte, Atualizações e demais botões principais passam a aparecer de forma fixa em todas as páginas.</li>
              <li class="site">O topo agora garante botão do servidor, correio/notificações e perfil mesmo em páginas antigas ou com HTML diferente.</li>
              <li class="fix">Scripts antigos ou regras de permissão não devem mais esconder botões do menu; se faltar permissão, a página bloqueia o conteúdo sem sumir com a navegação.</li>
              <li class="fix">A melhoria prepara a base para próximos upgrades sem misturar menus diferentes entre setores.</li>
            </ul>
          </article>
`;

const HARD_ASSET_GUARD_CARD = String.raw`
          <article class="va-card va-update-card" id="release-2026-07-13-hard-static-guard-v3">
            <span class="va-update-dot"></span>
            <div class="va-update-meta"><span>13/07/2026 • 20:11 BRT</span><span>Site</span><span>CSS/JS</span></div>
            <h3>Blindagem final para CSS/JS nunca caírem como página HTML</h3>
            <p class="va-muted">O carregamento de assets foi endurecido no guard principal do servidor, que fica antes das páginas, API e fallback geral.</p>
            <ul class="va-update-list">
              <li class="fix">Pedidos para /css, /js, /assets, /uploads, /images e /img agora são resolvidos diretamente no arquivo físico.</li>
              <li class="fix">Se organization.css ou qualquer JS existir, o servidor entrega com o MIME correto; se faltar, retorna 404 em texto limpo.</li>
              <li class="fix">Isso impede que Times, Suporte, Chaveamento, Grupos ou qualquer setor carreguem layout cru por receber HTML no lugar de CSS.</li>
              <li class="site">O arquivo de guard passou a entrar no npm check para validar sintaxe antes do deploy.</li>
            </ul>
          </article>
`;

function patchUpdatesPage() {
  if (!fs.existsSync(updatesFile)) return;
  let html = fs.readFileSync(updatesFile, 'utf8');
  const before = html;

  if (!html.includes(HARD_ASSET_GUARD_ID)) {
    html = html.replace('<div class="va-timeline">', '<div class="va-timeline">' + HARD_ASSET_GUARD_CARD);
  }

  if (!html.includes(NAV_SHELL_ID)) {
    html = html.replace('<div class="va-timeline">', '<div class="va-timeline">' + NAV_SHELL_CARD);
  }

  if (!html.includes(ADMIN_ACCESS_ID)) {
    html = html.replace('<div class="va-timeline">', '<div class="va-timeline">' + ADMIN_ACCESS_CARD);
  }

  if (!html.includes(ASSET_FIX_ID)) {
    html = html.replace('<div class="va-timeline">', '<div class="va-timeline">' + ASSET_FIX_CARD);
  }

  if (!html.includes(RELEASE_ID)) {
    html = html.replace('<div class="va-timeline">', '<div class="va-timeline">' + RELEASE_CARD);
  }

  const versionTexts = [
    'Void Arena 5.1.3 • Atual',
    'Void Arena 5.1.3 • Atualizado em 12/07/2026 às 11:55 BRT',
    'Void Arena 5.1.3 • Atualizado em 12/07/2026 às 12:07 BRT',
    'Void Arena 5.1.3 • Atualizado em 13/07/2026 às 12:59 BRT',
    'Void Arena 5.1.3 • Atualizado em 13/07/2026 às 20:00 BRT'
  ];
  versionTexts.forEach((text) => {
    html = html.replace(
      '<span class="va-version-pill">' + text + '</span>',
      '<span class="va-version-pill">Void Arena 5.1.3 • Atualizado em 13/07/2026 às 20:11 BRT</span>'
    );
  });

  [
    'Painel mais organizado, chat com menções e histórico público de mudanças.',
    'Rotas estáveis, suporte global, notificações por cargo e preservação de dados vivos.',
    'Rotas estáveis, assets protegidos, suporte global e preservação de dados vivos.',
    'Rotas estáveis, assets protegidos, suporte global e permissões administrativas atualizadas.',
    'Navegação global, assets protegidos, suporte fixo e dados preservados.'
  ].forEach((text) => {
    html = html.replace(
      '<h2 class="va-update-title">' + text + '</h2>',
      '<h2 class="va-update-title">Navegação global, assets blindados, suporte fixo e dados preservados.</h2>'
    );
  });

  html = html.replace(
    '<p class="va-muted">Esta página centraliza as mudanças para jogadores, capitães e staff saberem o que entrou sem precisar procurar em mensagens soltas.</p>',
    '<p class="va-muted">Esta página registra as mudanças do site e do bot com data e horário para jogadores, capitães e staff acompanharem o que entrou em cada atualização.</p>'
  );

  html = html.replace('<span><strong>Site</strong><b>novas áreas</b></span>', '<span><strong>Site</strong><b>assets blindados</b></span>');
  html = html.replace('<span><strong>Site</strong><b>rotas estáveis</b></span>', '<span><strong>Site</strong><b>assets blindados</b></span>');
  html = html.replace('<span><strong>Site</strong><b>assets protegidos</b></span>', '<span><strong>Site</strong><b>assets blindados</b></span>');
  html = html.replace('<span><strong>Site</strong><b>navegação global</b></span>', '<span><strong>Site</strong><b>assets blindados</b></span>');
  html = html.replace('<span><strong>Bot</strong><b>filas/calls/placar</b></span>', '<span><strong>Bot</strong><b>dados preservados</b></span>');
  html = html.replace('<span><strong>Jogadores</strong><b>perfil e recrutamento</b></span>', '<span><strong>Jogadores</strong><b>cargos e DMs</b></span>');
  html = html.replace('<span><strong>Admin</strong><b>permissões e validação</b></span>', '<span><strong>Admin</strong><b>acesso atualizado</b></span>');
  html = html.replace('<span><strong>Admin</strong><b>suporte/notificações</b></span>', '<span><strong>Admin</strong><b>acesso atualizado</b></span>');

  if (html !== before) {
    fs.writeFileSync(updatesFile, html, 'utf8');
    changed = true;
  }
}

patchUpdatesPage();
console.log(changed ? '[Atualizacoes] Changelog de 13/07/2026 atualizado.' : '[Atualizacoes] Changelog de 13/07/2026 ja estava atualizado.');
