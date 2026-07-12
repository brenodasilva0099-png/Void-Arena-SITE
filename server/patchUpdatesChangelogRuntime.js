const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const updatesFile = path.join(ROOT, 'public', 'pages', 'atualizacoes.html');
let changed = false;

const RELEASE_ID = 'release-2026-07-12-fluxo-estavel';
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

function patchUpdatesPage() {
  if (!fs.existsSync(updatesFile)) return;
  let html = fs.readFileSync(updatesFile, 'utf8');
  const before = html;

  if (!html.includes(RELEASE_ID)) {
    html = html.replace('<div class="va-timeline">', '<div class="va-timeline">' + RELEASE_CARD);
  }

  html = html.replace(
    '<span class="va-version-pill">Void Arena 5.1.3 • Atual</span>',
    '<span class="va-version-pill">Void Arena 5.1.3 • Atualizado em 12/07/2026 às 11:55 BRT</span>'
  );

  html = html.replace(
    '<h2 class="va-update-title">Painel mais organizado, chat com menções e histórico público de mudanças.</h2>',
    '<h2 class="va-update-title">Rotas estáveis, suporte global, notificações por cargo e preservação de dados vivos.</h2>'
  );

  html = html.replace(
    '<p class="va-muted">Esta página centraliza as mudanças para jogadores, capitães e staff saberem o que entrou sem precisar procurar em mensagens soltas.</p>',
    '<p class="va-muted">Esta página registra as mudanças do site e do bot com data e horário para jogadores, capitães e staff acompanharem o que entrou em cada atualização.</p>'
  );

  html = html.replace(
    '<span><strong>Site</strong><b>novas áreas</b></span>',
    '<span><strong>Site</strong><b>rotas estáveis</b></span>'
  );
  html = html.replace(
    '<span><strong>Bot</strong><b>filas/calls/placar</b></span>',
    '<span><strong>Bot</strong><b>dados preservados</b></span>'
  );
  html = html.replace(
    '<span><strong>Jogadores</strong><b>perfil e recrutamento</b></span>',
    '<span><strong>Jogadores</strong><b>cargos e DMs</b></span>'
  );
  html = html.replace(
    '<span><strong>Admin</strong><b>permissões e validação</b></span>',
    '<span><strong>Admin</strong><b>suporte/notificações</b></span>'
  );

  if (html !== before) {
    fs.writeFileSync(updatesFile, html, 'utf8');
    changed = true;
  }
}

patchUpdatesPage();
console.log(changed ? '[Atualizacoes] Changelog de 12/07/2026 registrado.' : '[Atualizacoes] Changelog de 12/07/2026 ja estava registrado.');
