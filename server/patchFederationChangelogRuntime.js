const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const updatesFile = path.join(ROOT, 'public', 'pages', 'atualizacoes.html');
const FEDERATION_PORTAL_ID = 'release-2026-07-14-hollow-nexus-frm-global-v4';
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
    'Hollow Nexus FRM • Atualizado em 13/07/2026 às 23:40 BRT',
    'Hollow Nexus FRM • Atualizado em 13/07/2026 às 23:58 BRT'
  ];
  versionTexts.forEach((text) => {
    html = html.replace(
      '<span class="va-version-pill">' + text + '</span>',
      '<span class="va-version-pill">Hollow Nexus FRM • Atualizado em 14/07/2026 às 00:04 BRT</span>'
    );
  });

  [
    'Navegação global, assets blindados, tickets de suporte e dados preservados.',
    'Portal Hollow Nexus FRM integrado com dados vivos preservados.',
    'Portal Hollow Nexus FRM isolado, limpo e pronto para migração gradual.',
    'Dashboard Hollow Nexus FRM recriada pela referência visual.'
  ].forEach((text) => {
    html = html.replace(
      '<h2 class="va-update-title">' + text + '</h2>',
      '<h2 class="va-update-title">Site migrado para o shell global Hollow Nexus FRM.</h2>'
    );
  });

  html = html.replace('<span><strong>Site</strong><b>tickets/histórico</b></span>', '<span><strong>Site</strong><b>shell FRM</b></span>');
  html = html.replace('<span><strong>Site</strong><b>portal FRM</b></span>', '<span><strong>Site</strong><b>shell FRM</b></span>');
  html = html.replace('<span><strong>Site</strong><b>dashboard FRM</b></span>', '<span><strong>Site</strong><b>shell FRM</b></span>');

  if (html !== before) {
    fs.writeFileSync(updatesFile, html, 'utf8');
    changed = true;
  }
}

patchUpdatesPage();
console.log(changed ? '[Atualizacoes] Migracao global FRM registrada.' : '[Atualizacoes] Migracao global FRM ja estava registrada.');