const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const profileFile = path.join(ROOT, 'public', 'pages', 'perfil.html');
const updatesFile = path.join(ROOT, 'public', 'pages', 'atualizacoes.html');
const versionFile = path.join(ROOT, 'public', 'league-home-competition-profile.json');
const marker = 'hnl-profile-classic-layout-v3';
const build = '2026-07-23-profile-team-hero-v3';
let changed = false;

function read(file) { return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''; }
function write(file, content) {
  if (read(file) !== content) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content, 'utf8');
    changed = true;
  }
}

function standardizeHeroIcon(source = '') {
  const icon = '<div class="hnl-hero-icon hnl-profile-hero-icon" aria-hidden="true">👤</div>';
  const iconPattern = /<div\b[^>]*class=["'][^"']*\bhnl-hero-icon\b[^"']*["'][^>]*>[\s\S]*?<\/div>/i;
  if (iconPattern.test(source)) return source.replace(iconPattern, icon);
  return source.replace(/(<section\b[^>]*class=["'][^"']*\bfrm-page-hero\b[^"']*["'][^>]*>[\s\S]*?)(<\/section>)/i, `$1${icon}$2`);
}

let html = read(profileFile);
if (html) {
  html = html
    .replace(/\s*<link\b[^>]*href=["']\/css\/(?:style|organization)\.css(?:\?[^"']*)?["'][^>]*>/gi, '')
    .replace(/<style id="hnl-profile-inline-components-v1">[\s\S]*?<\/style>/gi, '')
    .replace(/<style id="hnl-profile-classic-layout-v[23]">[\s\S]*?<\/style>/gi, '')
    .replace(/<script\b[^>]*src=["']\/js\/pages\/perfil\.js(?:\?[^"']*)?["'][^>]*><\/script>/gi, `<script src="/js/pages/perfil.js?v=${build}"></script>`);
  html = standardizeHeroIcon(html);
  const style = `<style id="${marker}">
  .hnl-btn{min-height:38px;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:0 14px;border:1px solid rgba(159,104,255,.30);border-radius:10px;background:#0d1425;color:#fff;text-decoration:none;font-weight:800;cursor:pointer}.hnl-btn:hover{border-color:rgba(183,128,255,.62);transform:translateY(-1px)}.hnl-btn.primary{background:linear-gradient(135deg,#9555ee,#6e35cf)}.hnl-btn.danger{background:rgba(255,74,104,.12);border-color:rgba(255,90,117,.42);color:#ffd5dc}.hnl-section-kicker{display:inline-flex;align-items:center;gap:7px;padding:6px 10px;border-radius:999px;background:rgba(155,92,246,.14);border:1px solid rgba(155,92,246,.28);font-size:12px;font-weight:800;color:#dcc8ff}.hnl-actions{display:flex;gap:8px;flex-wrap:wrap}.hnl-empty{padding:18px;border:1px dashed rgba(159,104,255,.34);border-radius:13px;color:#bcc5d8;background:rgba(255,255,255,.02)}
  .hnl-profile-toolbar{padding:15px 17px!important;margin-bottom:14px!important}.hnl-profile-toolbar h2{font-size:25px!important}
  .hnl-profile-settings-layout{display:grid!important;grid-template-columns:minmax(300px,370px) minmax(0,1fr)!important;gap:16px!important;align-items:start!important;width:100%!important}
  .hnl-profile-settings-layout>.va-profile-preview-card{grid-column:1!important;order:0!important;align-self:start!important;min-width:0!important;padding:15px!important;position:sticky!important;top:78px!important}
  .hnl-profile-settings-layout>.va-profile-page-card{grid-column:2!important;order:0!important;min-width:0!important;padding:20px!important}
  .va-profile-preview-card .va-profile-banner-preview{height:118px!important;border-radius:14px!important}
  .va-profile-preview-card .va-profile-page-avatar{width:94px!important;height:94px!important;margin:-47px 0 12px 16px!important;border-width:4px!important}
  .va-profile-preview-card>h2,.va-profile-preview-card>p{text-align:left!important;margin-left:16px!important;margin-right:16px!important}
  .va-profile-preview-card>h2{font-size:29px!important;margin-top:0!important;margin-bottom:5px!important}
  .va-profile-preview-card .va-checklist{justify-content:flex-start!important;margin:11px 16px 14px!important}
  .va-profile-preview-card .va-role-panel{margin:0 16px 12px!important}.va-profile-preview-card .va-role-list{gap:5px!important}.va-profile-preview-card .va-role-chip{font-size:10px!important;padding:4px 7px!important}
  .va-profile-preview-card .va-social-card-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:7px!important}.va-profile-preview-card .va-social-card{padding:9px!important}.va-profile-preview-card .va-social-card-icon{width:31px!important;height:31px!important;flex-basis:31px!important}
  .va-profile-preview-card .va-player-stat-card{margin-top:15px!important;padding:14px!important}.va-profile-preview-card .va-stat-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:7px!important}.va-profile-preview-card .va-stat-item{padding:8px!important}.va-profile-preview-card .va-stat-item strong{font-size:18px!important}
  .va-profile-page-card>h2{font-size:27px!important;margin-top:0!important}.va-profile-page-card .va-form-grid.two{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:11px!important}
  .hnl-profile-hero-icon{width:88px!important;height:88px!important;flex:0 0 88px!important;border-radius:24px!important;display:grid!important;place-items:center!important;font-size:40px!important;line-height:1!important;background:linear-gradient(145deg,rgba(139,92,246,.22),rgba(91,33,182,.34))!important;border:1px solid rgba(183,128,255,.52)!important;box-shadow:inset 0 0 0 1px rgba(255,255,255,.035),0 16px 42px rgba(61,25,125,.28)!important;color:#f6edff!important}
  #currentTeamCard .va-current-team-card{margin:14px 16px 0!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important}
  #currentTeamCard .va-current-team-card>.va-eyebrow{display:none!important}
  #currentTeamCard .va-current-team-link{display:flex!important;align-items:center!important;gap:12px!important;color:inherit!important;text-decoration:none!important;width:max-content!important;max-width:100%!important}
  #currentTeamCard .va-current-team-logo{width:52px!important;height:52px!important;flex:0 0 52px!important;border-radius:13px!important;background:transparent!important;border:1px solid rgba(159,104,255,.28)!important;box-shadow:none!important}
  #currentTeamCard .va-current-team-content{min-width:0!important}
  #currentTeamCard .va-current-team-content h3{margin:3px 0 0!important;font-size:24px!important;line-height:1.05!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
  #currentTeamCard .va-team-tag{padding:3px 7px!important;font-size:10px!important}
  #currentTeamCard .va-current-team-link:hover h3{color:#dec9ff!important}
  #currentTeamCard .va-current-team-empty{margin:14px 16px 0!important;color:#b9c2d4!important}
  @media(max-width:760px){.hnl-profile-settings-layout{grid-template-columns:1fr!important}.hnl-profile-settings-layout>.va-profile-preview-card,.hnl-profile-settings-layout>.va-profile-page-card{grid-column:1!important;position:relative!important;top:auto!important}.hnl-profile-settings-layout>.va-profile-preview-card{order:0!important}.hnl-profile-settings-layout>.va-profile-page-card{order:1!important}.va-profile-page-card .va-form-grid.two,.va-profile-preview-card .va-social-card-grid,.va-profile-preview-card .va-stat-grid{grid-template-columns:1fr!important}.hnl-profile-hero-icon{width:72px!important;height:72px!important;flex-basis:72px!important;font-size:34px!important;border-radius:20px!important}}
  </style>`;
  html = html.includes('</head>') ? html.replace('</head>', `${style}\n</head>`) : `${style}\n${html}`;
  write(profileFile, html);
}

let updates = read(updatesFile);
if (updates && !updates.includes('release-2026-07-23-profile-team-hero')) {
  const card = `<article class="va-card va-update-card" id="release-2026-07-23-profile-team-hero"><span class="va-update-dot"></span><div class="va-update-meta"><span>23/07/2026 • 19:55 BRT</span><span>Site</span><span>Perfil</span></div><h3>Time atual e ícone do perfil refinados</h3><p class="va-muted">O perfil passou a exibir o clube atual de forma limpa e o ícone da área do jogador foi padronizado com os demais heróis da plataforma.</p><ul class="va-update-list"><li class="fix">Removidas dependências redundantes de CSS que podiam retornar HTML e gerar erros de MIME.</li><li class="site">Time atual agora mostra somente logo, tag e nome em uma linha clicável.</li><li class="site">Ícone do perfil recebeu o mesmo bloco roxo arredondado usado nas demais páginas.</li></ul></article>`;
  updates = updates.includes('<article class="va-card va-update-card"') ? updates.replace('<article class="va-card va-update-card"', `${card}\n<article class="va-card va-update-card"`) : updates.replace('</main>', `${card}\n</main>`);
  write(updatesFile, updates);
}

let version = {};
try { version = JSON.parse(read(versionFile) || '{}'); } catch { version = {}; }
write(versionFile, JSON.stringify({ ...version, build, updatedAt: '2026-07-23T19:55:00-03:00', profile: 'classic-compact-team-strip-standard-hero', removedProfileCss: ['style.css', 'organization.css'] }, null, 2));
console.log(changed ? '[Profile] Time, ícone e dependências visuais refinados.' : '[Profile] Refinamentos finais já estavam aplicados.');
