const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, '..', 'public', 'pages', 'perfil.html');
if (!fs.existsSync(file)) process.exit(0);
let html = fs.readFileSync(file, 'utf8');
const marker = 'hnl-profile-inline-components-v1';
if (!html.includes(marker)) {
  const style = `<style id="${marker}">
  .hnl-btn{min-height:38px;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:0 14px;border:1px solid rgba(159,104,255,.30);border-radius:10px;background:#0d1425;color:#fff;text-decoration:none;font-weight:800;cursor:pointer}.hnl-btn:hover{border-color:rgba(183,128,255,.62);transform:translateY(-1px)}.hnl-btn.primary{background:linear-gradient(135deg,#9555ee,#6e35cf)}.hnl-btn.danger{background:rgba(255,74,104,.12);border-color:rgba(255,90,117,.42);color:#ffd5dc}.hnl-section-kicker{display:inline-flex;align-items:center;gap:7px;padding:6px 10px;border-radius:999px;background:rgba(155,92,246,.14);border:1px solid rgba(155,92,246,.28);font-size:12px;font-weight:800;color:#dcc8ff}.hnl-actions{display:flex;gap:8px;flex-wrap:wrap}.hnl-empty{padding:18px;border:1px dashed rgba(159,104,255,.34);border-radius:13px;color:#bcc5d8;background:rgba(255,255,255,.02)}
  </style>`;
  html = html.includes('</head>') ? html.replace('</head>', `${style}\n</head>`) : `${style}\n${html}`;
  fs.writeFileSync(file, html, 'utf8');
  console.log('[Profile] Componentes críticos internos aplicados.');
} else {
  console.log('[Profile] Componentes críticos internos já estavam aplicados.');
}
