const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const dashboardFile = path.join(ROOT, 'public', 'pages', 'dashboard.html');
const themeFile = path.join(ROOT, 'public', 'css', 'league-experience.css');
const updatesFile = path.join(ROOT, 'public', 'pages', 'atualizacoes.html');
const versionFile = path.join(ROOT, 'public', 'dashboard-competition-highlight.json');
const BUILD = '2026-07-23-dashboard-competition-v3';
const THEME_MARKER = 'hnl-dashboard-experience-inline-v1';
const STYLE_MARKER = 'hnl-dashboard-competition-highlight-v3';
let changed = false;

function read(file) { return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''; }
function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (read(file) !== content) {
    fs.writeFileSync(file, content, 'utf8');
    changed = true;
  }
}

function replaceDashboardHeroIcon(source = '') {
  return source.replace(
    /<div\b[^>]*class=["'][^"']*\bhnl-hero-icon\b[^"']*["'][^>]*>[\s\S]*?<\/div>/i,
    '<div class="hnl-hero-icon" aria-hidden="true">🏟️</div>'
  );
}

function replaceDashboardHeroTitle(source = '') {
  const title = '<h1 class="hnl-home-brand-title"><span class="hnl-home-brand-the">the</span><span class="hnl-home-brand-main">HOLLOW NEXUS <span class="frm-accent">LEAGUE</span></span></h1>';
  return source.replace(
    /(<section\b[^>]*class=["'][^"']*\bfrm-page-hero\b[^"']*["'][^>]*>[\s\S]*?)<h1[^>]*>[\s\S]*?<\/h1>/i,
    `$1${title}`
  );
}

let html = read(dashboardFile);
if (html) {
  const themeCss = read(themeFile).trim();
  html = html
    .replace(/\s*<link\b[^>]*href=["']\/css\/league-experience\.css(?:\?[^"']*)?["'][^>]*>/gi, '')
    .replace(new RegExp(`<style id=["']${THEME_MARKER}["']>[\\s\\S]*?<\\/style>`, 'gi'), '')
    .replace(/<style id=["']hnl-dashboard-competition-highlight-v[123]["']>[\s\S]*?<\/style>/gi, '')
    .replace(/\s*<script\b[^>]*src=["']\/js\/core\/dashboard-competition-highlight\.js(?:\?[^"']*)?["'][^>]*><\/script>/gi, '');
  html = replaceDashboardHeroIcon(html);
  html = replaceDashboardHeroTitle(html);

  const themeStyle = themeCss
    ? `<style id="${THEME_MARKER}">\n${themeCss}\n</style>`
    : '';
  const style = `<style id="${STYLE_MARKER}">
  .hnl-home-competition-panel{align-self:start!important;overflow:hidden!important;background:radial-gradient(circle at 92% 5%,rgba(155,92,246,.18),transparent 30%),linear-gradient(180deg,rgba(20,29,47,.98),rgba(13,20,35,.98))!important}
  .hnl-home-competition-panel>h2{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 14px!important;font-size:25px!important}.hnl-home-competition-panel>h2:after{content:'DESTAQUE';display:inline-flex;align-items:center;min-height:25px;padding:0 9px;border-radius:999px;background:rgba(155,92,246,.13);border:1px solid rgba(181,126,255,.32);color:#d8c2ff;font-size:9px;font-weight:950;letter-spacing:.09em}
  .hnl-home-competition-list{display:grid!important;gap:11px!important}
  .hnl-home-comp-card{position:relative;overflow:hidden;padding:15px;border:1px solid rgba(159,104,255,.22);border-radius:14px;background:rgba(8,13,25,.48);box-shadow:inset 0 0 0 1px rgba(255,255,255,.02)}
  .hnl-home-comp-card.is-featured{padding:18px;background:radial-gradient(circle at 100% 0,rgba(150,82,238,.25),transparent 34%),linear-gradient(145deg,rgba(25,34,56,.98),rgba(26,20,52,.96));border-color:rgba(181,126,255,.43);box-shadow:0 16px 36px rgba(3,5,14,.22),inset 0 0 0 1px rgba(255,255,255,.025)}
  .hnl-home-comp-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.hnl-home-comp-status{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.hnl-home-comp-status .hnl-chip{display:inline-flex;align-items:center;min-height:25px;padding:0 9px;border-radius:999px;border:1px solid rgba(159,104,255,.28);background:rgba(155,92,246,.12);color:#dbc5ff;font-size:10px;font-weight:900}.hnl-home-comp-status .hnl-chip.green{border-color:rgba(34,197,94,.32);background:rgba(34,197,94,.12);color:#83efad}
  .hnl-home-comp-mark{width:42px;height:42px;flex:0 0 42px;border-radius:12px;display:grid;place-items:center;background:rgba(155,92,246,.15);border:1px solid rgba(181,126,255,.35);color:#e6d6ff;font-size:22px}.is-featured .hnl-home-comp-mark{width:50px;height:50px;flex-basis:50px;border-radius:14px;font-size:27px}
  .hnl-home-comp-card h3{margin:12px 0 7px!important;font-size:clamp(21px,2vw,28px)!important;line-height:1.1;letter-spacing:-.035em}.hnl-home-comp-description{margin:0 0 14px!important;color:#b9c4da!important;line-height:1.5;font-size:13px}
  .hnl-home-comp-meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:12px}.hnl-home-comp-meta span{min-width:0;padding:10px 11px;border-radius:11px;border:1px solid rgba(255,255,255,.065);background:rgba(4,8,18,.26)}.hnl-home-comp-meta small,.hnl-home-comp-meta strong{display:block}.hnl-home-comp-meta small{margin-bottom:4px;color:#8794ad;font-size:9px;font-weight:900;letter-spacing:.075em;text-transform:uppercase}.hnl-home-comp-meta strong{overflow:hidden;text-overflow:ellipsis;color:#f8f7ff;font-size:12px;white-space:nowrap}
  .hnl-home-comp-progress{margin-top:13px}.hnl-home-comp-progress>div:first-child{display:flex;align-items:center;justify-content:space-between;gap:12px;color:#b9c4d9;font-size:11px;font-weight:800}.hnl-home-comp-progress strong{color:#fff}.hnl-home-comp-track{height:7px;margin-top:7px;overflow:hidden;border-radius:999px;background:rgba(255,255,255,.085)}.hnl-home-comp-track i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#8b5cf6,#b469ff,#6edbff);box-shadow:0 0 16px rgba(155,92,246,.48)}
  .hnl-home-comp-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:14px}.hnl-home-comp-actions .hnl-btn{min-height:36px;display:inline-flex;align-items:center;justify-content:center;padding:0 12px;border:1px solid rgba(159,104,255,.3);border-radius:9px;background:#0d1425;color:#fff;text-decoration:none;font-size:11px;font-weight:900}.hnl-home-comp-actions .hnl-btn.primary{background:linear-gradient(135deg,#9555ee,#7138d0);border-color:rgba(190,139,255,.5)}.hnl-home-comp-actions .hnl-btn:hover{transform:translateY(-1px);border-color:rgba(196,151,255,.65)}.hnl-home-comp-all{margin-left:auto;color:#bfa5ee;text-decoration:none;font-size:11px;font-weight:850}.hnl-home-comp-all:hover{color:#fff}
  .hnl-home-comp-loading,.hnl-home-comp-empty{display:grid;gap:5px;padding:22px;border:1px dashed rgba(159,104,255,.3);border-radius:13px;background:rgba(255,255,255,.02);color:#bbc5d8}.hnl-home-comp-empty strong{color:#fff}
  .frm-page-hero .hnl-hero-icon{font-family:Inter,system-ui,sans-serif!important;font-size:64px!important;line-height:1!important}
  .frm-page-hero .hnl-home-brand-title{display:grid!important;gap:0!important;margin:0!important;line-height:1!important;letter-spacing:0!important}
  .hnl-home-brand-the{display:block;font-size:clamp(12px,1vw,16px)!important;line-height:1!important;font-weight:900;letter-spacing:.04em;text-transform:lowercase;color:#fff;margin:0 0 5px 2px}
  .hnl-home-brand-main{display:block;font-size:clamp(34px,4vw,54px)!important;line-height:.98!important;font-weight:950;letter-spacing:-.045em;white-space:nowrap}
  #homeClubRanking .hnl-profile-row,#homeCompetitions .hnl-profile-row{min-width:0}.hnl-club-logo{display:block!important;max-width:54px!important;max-height:54px!important}
  @media(max-width:760px){.hnl-home-comp-meta{grid-template-columns:1fr}.hnl-home-comp-all{width:100%;margin-left:0}.hnl-home-competition-panel>h2{font-size:22px!important}.hnl-home-brand-main{font-size:clamp(28px,9vw,40px)!important;white-space:normal}.hnl-home-brand-the{font-size:12px!important}}
  </style>`;
  const script = `<script src="/js/core/dashboard-competition-highlight.js?v=${BUILD}"></script>`;
  const injectedStyles = [themeStyle, style].filter(Boolean).join('\n');
  html = html.includes('</head>') ? html.replace('</head>', `${injectedStyles}\n</head>`) : `${injectedStyles}\n${html}`;
  html = html.includes('</body>') ? html.replace('</body>', `${script}\n</body>`) : `${html}\n${script}`;
  write(dashboardFile, html);
}

let updates = read(updatesFile);
if (updates && !updates.includes('release-2026-07-23-dashboard-brand-the')) {
  const card = `<article class="va-card va-update-card" id="release-2026-07-23-dashboard-brand-the"><span class="va-update-dot"></span><div class="va-update-meta"><span>23/07/2026 • 21:39 BRT</span><span>Site</span><span>Início/Marca</span></div><h3>Assinatura da marca refinada na página inicial</h3><p class="va-muted">A palavra “the” agora aparece pequena acima de HOLLOW NEXUS LEAGUE, seguindo o mesmo padrão visual apresentado na identidade da barra lateral.</p><ul class="va-update-list"><li class="site">Hierarquia tipográfica da marca ajustada no herói da Home.</li><li class="site">Título permanece responsivo em telas menores.</li></ul></article>`;
  updates = updates.includes('<article class="va-card va-update-card"')
    ? updates.replace('<article class="va-card va-update-card"', `${card}\n<article class="va-card va-update-card"`)
    : updates.replace('</main>', `${card}\n</main>`);
  write(updatesFile, updates);
}

write(versionFile, JSON.stringify({
  build: BUILD,
  updatedAt: '2026-07-23T21:39:00-03:00',
  dashboardCompetition: 'featured-card-status-meta-progress-actions',
  dashboardTheme: 'league-experience-inline-no-network-dependency',
  dashboardHeroIcon: '🏟️',
  dashboardBrandTitle: 'small-the-above-hollow-nexus-league',
  removedDashboardStylesheetRequest: '/css/league-experience.css'
}, null, 2));

console.log(changed
  ? '[Dashboard] Marca da Home refinada com “the” pequeno acima do título.'
  : '[Dashboard] Refinamento da marca já estava aplicado.');
