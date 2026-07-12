const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const cssFile = path.join(ROOT, 'public/css/organization.css');
let changed = false;

function patchCss() {
  if (!fs.existsSync(cssFile)) return;
  let css = fs.readFileSync(cssFile, 'utf8');
  if (css.includes('/* Void Arena - polimento final dos cargos por notificacao */')) return;

  css += [
    '',
    '/* Void Arena - polimento final dos cargos por notificacao */',
    '#roleNotificationForm { align-items: start; }',
    '#roleNotificationForm select[name="deliveryMode"] { min-height: 58px !important; height: 58px !important; padding: 0 16px !important; display: flex; align-items: center; }',
    '#roleNotificationForm label:has(select[name="deliveryMode"]) { align-self: start; }',
    '#roleNotificationForm textarea[name="message"] { min-height: 122px; }',
    '.va-role-picker { min-width: 0; }',
    '.va-role-picker-head { margin-bottom: 2px; }',
    '.va-role-picker-cards { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px; max-height: 292px; overflow-y: auto; overflow-x: hidden; padding: 2px 6px 2px 0; scrollbar-gutter: stable; }',
    '.va-role-card { position: relative; grid-template-columns: 12px minmax(0, 1fr); min-height: 68px; padding: 13px 98px 13px 12px; overflow: hidden; }',
    '.va-role-card strong { font-size: 13px; line-height: 1.2; max-width: 100%; }',
    '.va-role-card small { font-size: 10px; line-height: 1.25; max-width: 100%; opacity: .72; }',
    '.va-role-card em { position: absolute; top: 10px; right: 10px; max-width: 82px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; border: 1px solid rgba(167, 139, 250, .35); border-radius: 999px; padding: 5px 7px; background: rgba(124, 58, 237, .14); color: #ddd6fe; font-size: 9px; line-height: 1; }',
    '.va-role-card.active em { color: #86efac; border-color: rgba(34, 197, 94, .4); background: rgba(22, 163, 74, .13); }',
    '.va-role-dot { align-self: center; }',
    '.va-role-card.active::after { content: "✓"; position: absolute; right: 12px; bottom: 9px; width: 18px; height: 18px; display: grid; place-items: center; border-radius: 999px; background: rgba(34, 211, 238, .18); color: #67e8f9; font-size: 12px; font-weight: 950; }',
    '.va-role-card.skeleton, .va-role-card.empty { min-height: 58px; padding-right: 12px; }',
    '@media (max-width: 1120px) { .va-role-picker-cards { grid-template-columns: 1fr; } }',
    '@media (min-width: 1440px) { .va-role-picker-cards { grid-template-columns: repeat(3, minmax(0, 1fr)); } }',
    ''
  ].join('\n');

  fs.writeFileSync(cssFile, css, 'utf8');
  changed = true;
}

patchCss();
console.log(changed ? 'Patch aplicado: cargos por notificacao polidos.' : 'Patch ignorado: cargos por notificacao ja polidos.');
