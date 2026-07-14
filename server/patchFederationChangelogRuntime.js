const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const updatesFile = path.join(ROOT, 'public', 'pages', 'atualizacoes.html');
const FEDERATION_PORTAL_ID = 'release-2026-07-13-hollow-nexus-frm-reference-v3';
let changed = false;

const FEDERATION_PORTAL_CARD = String.raw`
          <article class="va-card va-update-card" id="release-2026-07-13-hollow-nexus-frm-reference-v3">
            <span class="va-update-dot"></span>
            <div class="va-update-meta"><span>13/07/2026 • 23:58 BRT</span><span>Site</span><span>Federação</span></div>
            <h3>Dashboard Hollow Nexus FRM recriada pela imagem de referência</h3>
            <p class="va-muted">A home principal foi reconstruída do zero para seguir a estrutura visual da referência aprovada, sem misturar o layout novo nas páginas antigas.</p>
            <ul class="va-update-list">
              <li class="site">Sidebar, topo, hero, coluna direita, estatísticas, listas inferiores e rodapé foram montados na mesma ordem da imagem.</li>
              <li class="site">A página usa somente /css/federation-portal.css e /js/core/federation-portal.js, sem depender do layout antigo.</li>
              <li class="site">A logo oficial do servidor/bot continua sendo usada via /api/brand/icon.</li>
              <li class="fix">Jogadores, clubes, eventos, tickets, formulários e histórico não foram alterados.</li>
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
    'Void Arena 5.1.3 • Atualizado em 13/07/2026 às 20:20 BRT',
    'Hollow Nexus FRM • Atualizado em 13/07/2026 às 23:28 BRT',
    'Hollow Nexus FRM • Atualizado em 13/07/2026 às 23:40 BRT'
  ];
  versionTexts.forEach((text) => {
    html = html.replace(
      '<span class="va-version-pill">' + text + '</span>',
      '<span class="va-version-pill">Hollow Nexus FRM • Atualizado em 13/07/2026 às 23:58 BRT</span>'
    );
  });

  [
    'Navegação global, assets blindados, tickets de suporte e dados preservados.',
    'Portal Hollow Nexus FRM integrado com dados vivos preservados.',
    'Portal Hollow Nexus FRM isolado, limpo e pronto para migração gradual.'
  ].forEach((text) => {
    html = html.replace(
      '<h2 class="va-update-title">' + text + '</h2>',
      '<h2 class="va-update-title">Dashboard Hollow Nexus FRM recriada pela referência visual.</h2>'
    );
  });

  html = html.replace('<span><strong>Site</strong><b>tickets/histórico</b></span>', '<span><strong>Site</strong><b>dashboard FRM</b></span>');
  html = html.replace('<span><strong>Site</strong><b>portal FRM</b></span>', '<span><strong>Site</strong><b>dashboard FRM</b></span>');

  if (html !== before) {
    fs.writeFileSync(updatesFile, html, 'utf8');
    changed = true;
  }
}

patchUpdatesPage();
console.log(changed ? '[Atualizacoes] Dashboard FRM de referencia registrada.' : '[Atualizacoes] Dashboard FRM de referencia ja estava registrada.');
