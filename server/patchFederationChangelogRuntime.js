const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const updatesFile = path.join(ROOT, 'public', 'pages', 'atualizacoes.html');
const FEDERATION_PORTAL_ID = 'release-2026-07-13-hollow-nexus-frm-portal';
let changed = false;

const FEDERATION_PORTAL_CARD = String.raw`
          <article class="va-card va-update-card" id="release-2026-07-13-hollow-nexus-frm-portal">
            <span class="va-update-dot"></span>
            <div class="va-update-meta"><span>13/07/2026 • 23:28 BRT</span><span>Site</span><span>Federação</span></div>
            <h3>Hollow Nexus FRM integrada como estrutura principal do site</h3>
            <p class="va-muted">O site recebeu a primeira versão do portal visual da Federação Comunitária de Rematch, mantendo os dados vivos preservados.</p>
            <ul class="va-update-list">
              <li class="site">A home/dashboard foi migrada para o visual Hollow Nexus FRM com hero, cards de temporada, competições, ranking e notícias.</li>
              <li class="site">A logo oficial do servidor passou a ser usada como identidade principal no topo, sidebar, hero e rodapé.</li>
              <li class="site">O menu foi reorganizado em Federação, Competitivo, Clubes, Atletas e Administração.</li>
              <li class="site">Foram criadas páginas base para Sobre a Federação, Regulamento e Prancheta Tática 5v5.</li>
              <li class="fix">A mudança altera a estrutura visual sem apagar jogadores, clubes, eventos, tickets, perfis ou histórico.</li>
            </ul>
          </article>
`;

function patchUpdatesPage() {
  if (!fs.existsSync(updatesFile)) return;
  let html = fs.readFileSync(updatesFile, 'utf8');
  const before = html;

  if (!html.includes(FEDERATION_PORTAL_ID)) {
    html = html.replace('<div class="va-timeline">', '<div class="va-timeline">' + FEDERATION_PORTAL_CARD);
  }

  const versionTexts = [
    'Void Arena 5.1.3 • Atual',
    'Void Arena 5.1.3 • Atualizado em 13/07/2026 às 20:20 BRT'
  ];
  versionTexts.forEach((text) => {
    html = html.replace(
      '<span class="va-version-pill">' + text + '</span>',
      '<span class="va-version-pill">Hollow Nexus FRM • Atualizado em 13/07/2026 às 23:28 BRT</span>'
    );
  });

  html = html.replace(
    '<h2 class="va-update-title">Navegação global, assets blindados, tickets de suporte e dados preservados.</h2>',
    '<h2 class="va-update-title">Portal Hollow Nexus FRM integrado com dados vivos preservados.</h2>'
  );

  html = html.replace('<span><strong>Site</strong><b>tickets/histórico</b></span>', '<span><strong>Site</strong><b>portal FRM</b></span>');

  if (html !== before) {
    fs.writeFileSync(updatesFile, html, 'utf8');
    changed = true;
  }
}

patchUpdatesPage();
console.log(changed ? '[Atualizacoes] Portal Hollow Nexus FRM registrado.' : '[Atualizacoes] Portal Hollow Nexus FRM ja estava registrado.');