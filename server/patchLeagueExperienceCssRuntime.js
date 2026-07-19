const fs = require('node:fs');
const path = require('node:path');
require('./patchLeagueMenuDedupRuntime');

const file = path.join(__dirname, '..', 'public', 'css', 'league-experience.css');
if (!fs.existsSync(file)) process.exit(0);
let css = fs.readFileSync(file, 'utf8');
const marker = '/* HNL stable visual v2 */';
if (!css.includes(marker)) {
  css += `

${marker}
.hnl-board-layout{display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:16px!important;width:100%!important}
.hnl-board{width:100%!important;min-height:720px!important;aspect-ratio:16/9!important;max-height:none!important}
.hnl-board-panel{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:14px!important}
.hnl-board-panel .hnl-card{height:100%}
.hnl-token-list{max-height:440px!important;grid-template-columns:repeat(2,minmax(0,1fr))}
.hnl-select option,.hnl-select optgroup{background:#11182a!important;color:#fff!important}
.hnl-metric-buttons{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 14px}
.hnl-console-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:14px}
.hnl-console-head h2{margin:0 0 5px}.hnl-console-head p{margin:0;color:var(--hnl-muted)}
.hnl-bracket-surface{overflow-x:auto;min-height:620px}.hnl-bracket-surface .va-adaptive-bracket{min-width:1080px}
.hnl-check{display:flex!important;align-items:center;gap:10px}.hnl-check input{width:18px;height:18px}
.hnl-table-person{padding:0!important;border:0!important;background:transparent!important;grid-template-columns:44px minmax(0,1fr)!important}
.hnl-table-person .hnl-avatar,.hnl-table-person .hnl-club-logo{width:44px;height:44px}
.hnl-profile-row small{display:block;color:var(--hnl-muted);margin-top:3px}
.frm-footer-brand img{object-fit:contain!important}
.va-model-team img,.va-inline-team-logo img,.va-group-logo img{object-fit:cover}
.frm-main{min-width:0}.frm-shell{min-width:0}
@media(min-width:1500px){.hnl-board{min-height:820px!important}.hnl-token{width:82px;height:82px}.hnl-token.ball{width:42px;height:42px}}
@media(max-width:900px){.hnl-board{min-height:620px!important;aspect-ratio:auto!important}.hnl-board-panel{grid-template-columns:1fr!important}.hnl-token-list{grid-template-columns:1fr}.hnl-bracket-surface .va-adaptive-bracket{min-width:920px}}
@media(max-width:600px){.hnl-board{min-height:520px!important}.hnl-token{width:58px;height:58px}.hnl-board:before{inset:18px}.hnl-board:after{top:18px;bottom:18px}.hnl-center-circle{width:120px;height:120px}}
`;
  fs.writeFileSync(file, css, 'utf8');
  console.log('[League/CSS] Prancheta, tabelas, seletor e competitivo ampliados.');
} else {
  console.log('[League/CSS] Ajustes visuais finais já aplicados.');
}
