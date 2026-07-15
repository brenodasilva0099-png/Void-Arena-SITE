const fs = require('node:fs');
const path = require('node:path');

const jsFile = path.join(__dirname, '..', 'public', 'js', 'core', 'federation-polish.js');
fs.mkdirSync(path.dirname(jsFile), { recursive: true });

const marker = 'FRM_FINAL_JS_SAFE_V1';
let js = fs.existsSync(jsFile) ? fs.readFileSync(jsFile, 'utf8') : '';

if (!js.includes(marker)) {
  js += '\n/* ' + marker + ' */\n';
  fs.writeFileSync(jsFile, js, 'utf8');
  console.log('[Federacao] JS final safe aplicado.');
} else {
  console.log('[Federacao] JS final safe ja estava aplicado.');
}
