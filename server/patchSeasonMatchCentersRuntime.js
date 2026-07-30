const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PAGES_DIR = path.join(ROOT, "public", "pages");
const BUILD = "2026-07-30-season-match-centers-v2";

const CSS_TAG = `<link rel="stylesheet" href="/css/season-match-centers.css?v=${BUILD}" data-season-match-centers-style="1">`;
const JS_TAG = `<script src="/js/core/season-match-centers.js?v=${BUILD}" defer data-season-match-centers-script="1"></script>`;

const seasonCenterMarkup = `
<section class="hnl-season-center" id="seasonCenter" aria-labelledby="seasonCenterTitle">
  <div class="hnl-center-heading">
    <div>
      <span class="hnl-center-kicker">Visão oficial da liga</span>
      <h2 id="seasonCenterTitle">Central da Temporada</h2>
      <p>Competição atual, último campeão, líderes e o próximo passo da sua conta em um só lugar.</p>
    </div>
    <span class="hnl-state-chip is-loading" id="seasonStateBadge">Carregando temporada</span>
  </div>
  <div class="hnl-season-layout">
    <div class="hnl-center-panel hnl-season-overview" id="seasonOverview" aria-live="polite">
      <div class="hnl-center-skeleton"></div>
    </div>
    <div class="hnl-center-panel hnl-season-leaders" id="seasonLeaders" aria-live="polite">
      <div class="hnl-center-skeleton"></div>
    </div>
    <aside class="hnl-center-panel hnl-season-action" id="seasonNextAction" aria-live="polite">
      <div class="hnl-center-skeleton"></div>
    </aside>
  </div>
</section>
<section class="hnl-home-match-center" id="homeMatchCenter" aria-labelledby="homeMatchCenterTitle">
  <div class="hnl-center-heading is-compact">
    <div>
      <span class="hnl-center-kicker">Acompanhamento oficial</span>
      <h2 id="homeMatchCenterTitle">Central da Partida</h2>
      <p>Placar, súmula, comprovante e validação sem precisar procurar em várias telas.</p>
    </div>
    <a class="hnl-center-link" href="/pages/resultados.html">Abrir central completa <span aria-hidden="true">→</span></a>
  </div>
  <div id="homeMatchSummary" aria-live="polite">
    <div class="hnl-center-skeleton is-short"></div>
  </div>
</section>`;

const matchCenterMarkup = `
<section class="hnl-match-center-page" id="matchCenter" aria-labelledby="matchCenterTitle">
  <div class="hnl-center-heading">
    <div>
      <span class="hnl-center-kicker">Resultados e validação</span>
      <h2 id="matchCenterTitle">Central da Partida</h2>
      <p>Acompanhe o confronto, os participantes, a comprovação da súmula e o resultado oficial.</p>
    </div>
    <span class="hnl-state-chip is-loading" id="matchCenterBadge">Carregando partidas</span>
  </div>
  <div class="hnl-official-podium-wrap" id="officialSeasonPodium" aria-live="polite">
    <div class="hnl-center-skeleton"></div>
  </div>
  <div class="hnl-match-spotlight" id="matchCenterSpotlight" aria-live="polite">
    <div class="hnl-center-skeleton"></div>
  </div>
  <div class="hnl-validation-wrap">
    <div class="hnl-validation-heading">
      <div>
        <span class="hnl-center-kicker">Fluxo de confirmação</span>
        <h3>Da partida ao resultado oficial</h3>
      </div>
      <p>O status muda conforme o capitão envia os dados e a organização valida a súmula.</p>
    </div>
    <div class="hnl-validation-pipeline" id="matchValidationPipeline" aria-live="polite"></div>
  </div>
  <div class="hnl-match-history">
    <div class="hnl-center-heading is-compact">
      <div>
        <span class="hnl-center-kicker">Histórico</span>
        <h3>Partidas registradas</h3>
      </div>
    </div>
    <div class="hnl-match-history-list" id="matchResultsHistory" aria-live="polite">
      <div class="hnl-center-skeleton is-short"></div>
    </div>
  </div>
</section>`;

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function writeIfChanged(file, next) {
  const current = read(file);
  if (current === next) return false;
  fs.writeFileSync(file, next);
  return true;
}

function addAssetTags(html) {
  let next = html;
  if (!next.includes('data-season-match-centers-style="1"')) {
    next = next.replace("</head>", `  ${CSS_TAG}\n</head>`);
  }
  if (!next.includes('data-season-match-centers-script="1"')) {
    next = next.replace("</body>", `  ${JS_TAG}\n</body>`);
  }
  return next;
}

function insertBeforeFooter(html, markup) {
  const footer = /<footer\s+class="frm-footer"/i;
  if (footer.test(html)) return html.replace(footer, `${markup}\n<footer class="frm-footer"`);
  return html.replace("</main>", `${markup}\n</main>`);
}

function patchDashboard(html) {
  let next = addAssetTags(html);
  if (next.includes('id="seasonCenter"')) return next;

  const mainGrid = '<section class="hnl-grid cols-2" style="margin-top:14px">';
  if (next.includes(mainGrid)) {
    return next.replace(mainGrid, `${seasonCenterMarkup}\n${mainGrid}`);
  }
  return insertBeforeFooter(next, seasonCenterMarkup);
}

function patchResults(html) {
  let next = addAssetTags(html);
  if (next.includes('id="matchCenter"')) return next;
  return insertBeforeFooter(next, matchCenterMarkup);
}

function run() {
  const targets = [
    ["dashboard.html", patchDashboard],
    ["resultados.html", patchResults]
  ];

  let changed = 0;
  targets.forEach(([name, patcher]) => {
    const file = path.join(PAGES_DIR, name);
    if (!fs.existsSync(file)) return;
    const current = read(file);
    const next = patcher(current);
    if (writeIfChanged(file, next)) changed += 1;
  });

  console.log(
    `[Season/Match Centers] Central da Temporada e Central da Partida aplicadas (${changed} página(s) atualizada(s)).`
  );
}

run();
