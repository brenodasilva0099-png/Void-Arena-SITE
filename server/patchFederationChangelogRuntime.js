const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const updatesFile = path.join(ROOT, 'public', 'pages', 'atualizacoes.html');
const FEDERATION_PORTAL_ID = 'release-2026-07-13-hollow-nexus-frm-portal-v2-clean';
let changed = false;

const FEDERATION_PORTAL_CARD = String.raw`
          <article class="va-card va-update-card" id="release-2026-07-13-hollow-nexus-frm-portal-v2-clean">
            <span class="va-update-dot"></span>
            <div class="va-update-meta"><span>13/07/2026 • 23:40 BRT</span><span>Site</span><span>Federação</span></div>
            <h3>Portal Hollow Nexus FRM recriado em estrutura limpa</h3>
            <p class="va-muted">O portal da federação foi isolado em uma home limpa, seguindo a estrutura visual aprovada, sem misturar o layout novo por cima das páginas antigas.</p>
            <ul class="va-update-list">
              <li class="site">A dashboard principal agora usa uma estrutura própria com sidebar, topo, hero, temporada, competições, ranking, notícias e rodapé.</li>
              <li class="site">A logo oficial do servidor continua sendo usada como identidade principal do portal.</li>
              <li class="site">As páginas base de Federação, Regulamento e Prancheta Tática continuam criadas no padrão novo.</li>
              <li class="fix">A injeção global nas páginas antigas foi removida para evitar layout quebrado durante a migração.</li>
              <li class="fix">Jogadores, clubes, eventos, tickets, perfis e histórico seguem preservados.</li>
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
    'Hollow Nexus FRM • Atualizado em 13/07/2026 às 23:28 BRT'
  ];
  versionTexts.forEach((text) => {
    html = html.replace(
      '<span class="va-version-pill">' + text + '</span>',
      '<span class="va-version-pill">Hollow Nexus FRM • Atualizado em 13/07/2026 às 23:40 BRT</span>'
    );
  });

  [
    'Navegação global, assets blindados, tickets de suporte e dados preservados.',
    'Portal Hollow Nexus FRM integrado com dados vivos preservados.'
  ].forEach((text) => {
    html = html.replace(
      '<h2 class="va-update-title">' + text + '</h2>',
      '<h2 class="va-update-title">Portal Hollow Nexus FRM limpo, isolado e pronto para migração por etapas.</h2>'
    );
  });

  html = html.replace('<span><strong>Site</strong><b>tickets/histórico</b></span>', '<span><strong>Site</strong><b>portal FRM limpo</b></span>');
  html = html.replace('<span><strong>Site</strong><b>portal FRM</b></span>', '<span><strong>Site</strong><b>portal FRM limpo</b></span>');

  if (html !== before) {
    fs.writeFileSync(updatesFile, html, 'utf8');
    changed = true;
  }
}

patchUpdatesPage();
console.log(changed ? '[Atualizacoes] Portal Hollow Nexus FRM v2 limpo registrado.' : '[Atualizacoes] Portal Hollow Nexus FRM v2 limpo ja estava registrado.');
