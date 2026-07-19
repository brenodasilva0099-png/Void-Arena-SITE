const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const profileFile = path.join(ROOT, 'public', 'pages', 'perfil.html');
const updatesFile = path.join(ROOT, 'public', 'pages', 'atualizacoes.html');
const versionFile = path.join(ROOT, 'public', 'league-home-competition-profile.json');
const marker = 'hnl-profile-classic-layout-v2';
let changed = false;

function read(file) { return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''; }
function write(file, content) {
  if (read(file) !== content) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content, 'utf8');
    changed = true;
  }
}

let html = read(profileFile);
if (html) {
  html = html.replace(/<style id="hnl-profile-inline-components-v1">[\s\S]*?<\/style>/gi, '');
  html = html.replace(/<style id="hnl-profile-classic-layout-v2">[\s\S]*?<\/style>/gi, '');
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
  .va-profile-preview-card .va-current-team-card{margin:14px 0 0!important}.va-profile-preview-card>h3{margin:16px 0 9px!important;font-size:20px!important}
  .va-profile-preview-card .va-social-card-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:7px!important}.va-profile-preview-card .va-social-card{padding:9px!important}.va-profile-preview-card .va-social-card-icon{width:31px!important;height:31px!important;flex-basis:31px!important}
  .va-profile-preview-card .va-player-stat-card{margin-top:15px!important;padding:14px!important}.va-profile-preview-card .va-stat-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:7px!important}.va-profile-preview-card .va-stat-item{padding:8px!important}.va-profile-preview-card .va-stat-item strong{font-size:18px!important}
  .va-profile-page-card>h2{font-size:27px!important;margin-top:0!important}.va-profile-page-card .va-form-grid.two{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:11px!important}
  @media(max-width:760px){.hnl-profile-settings-layout{grid-template-columns:1fr!important}.hnl-profile-settings-layout>.va-profile-preview-card,.hnl-profile-settings-layout>.va-profile-page-card{grid-column:1!important;position:relative!important;top:auto!important}.hnl-profile-settings-layout>.va-profile-preview-card{order:0!important}.hnl-profile-settings-layout>.va-profile-page-card{order:1!important}.va-profile-page-card .va-form-grid.two,.va-profile-preview-card .va-social-card-grid,.va-profile-preview-card .va-stat-grid{grid-template-columns:1fr!important}}
  </style>`;
  html = html.includes('</head>') ? html.replace('</head>', `${style}\n</head>`) : `${style}\n${html}`;
  write(profileFile, html);
}

let updates = read(updatesFile);
if (updates && !updates.includes('release-2026-07-19-profile-classic-layout')) {
  const card = `<article class="va-card va-update-card" id="release-2026-07-19-profile-classic-layout"><span class="va-update-dot"></span><div class="va-update-meta"><span>19/07/2026 • 16:12 BRT</span><span>Site</span><span>Perfil</span></div><h3>Estrutura compacta anterior do perfil restaurada</h3><p class="va-muted">O preview do jogador voltou para a coluna esquerda e o formulário permaneceu na coluna direita, evitando o cartão horizontal excessivamente grande.</p><ul class="va-update-list"><li class="fix">Banner, avatar, cargos, time, conexões e estatísticas novamente agrupados em uma coluna compacta.</li><li class="site">Configurações do perfil novamente visíveis ao lado em telas de computador.</li><li class="fix">O perfil só empilha as colunas em telas realmente pequenas.</li><li class="fix">O fallback interno continua ativo para impedir novos erros de MIME nos estilos.</li></ul></article>`;
  updates = updates.includes('<article class="va-card va-update-card"') ? updates.replace('<article class="va-card va-update-card"', `${card}\n<article class="va-card va-update-card"`) : updates.replace('</main>', `${card}\n</main>`);
  write(updatesFile, updates);
}

let version = {};
try { version = JSON.parse(read(versionFile) || '{}'); } catch { version = {}; }
write(versionFile, JSON.stringify({ ...version, build: '2026-07-19-profile-classic-layout-v2', updatedAt: '2026-07-19T16:12:00-03:00', profile: 'classic-compact-two-column-safe-inline' }, null, 2));
console.log(changed ? '[Profile] Estrutura compacta anterior restaurada.' : '[Profile] Estrutura compacta anterior já estava aplicada.');