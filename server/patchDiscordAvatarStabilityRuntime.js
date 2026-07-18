const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const PAGES_DIR = path.join(PUBLIC_DIR, 'pages');
const AUTH_JS_FILE = path.join(PUBLIC_DIR, 'js', 'core', 'discord-auth-avatar.js');
const BUILD = '2026-07-18-discord-avatar-session-v2';
let changed = false;

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (read(file) !== content) {
    fs.writeFileSync(file, content, 'utf8');
    changed = true;
  }
}

function walkHtml(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory()
      ? walkHtml(full)
      : (entry.isFile() && entry.name.endsWith('.html') ? [full] : []);
  });
}

function patchAuthJs() {
  let js = read(AUTH_JS_FILE);
  if (!js) return;

  js = js.replace(
    /  let observerTimer=0;\n  const observer=new MutationObserver\(\(\)=>\{[\s\S]*?\n  \}\);\n\n/,
    ''
  );

  js = js.replace(
    /  function start\(\)\{\n    sync\(\);\n    observer\.observe\(document\.body,\{childList:true,subtree:true\}\);\n    window\.addEventListener\('focus',sync\);\n    document\.addEventListener\('visibilitychange',\(\)=>\{if\(!document\.hidden\) sync\(\);\}\);\n    setTimeout\(sync,900\);\n  \}/,
    "  function start(){\n    sync();\n    window.addEventListener('focus',sync);\n    document.addEventListener('visibilitychange',()=>{if(!document.hidden) sync();});\n    setTimeout(sync,900);\n    setTimeout(sync,2500);\n  }"
  );

  js = js.replace(/const BUILD='[^']*';/, `const BUILD='${BUILD}';`);
  write(AUTH_JS_FILE, js);
}

function patchHtml(file) {
  let html = read(file);
  if (!html) return;
  html = html.replace(/\/js\/core\/discord-auth-avatar\.js\?v=[^"']+/g, `/js/core/discord-auth-avatar.js?v=${BUILD}`);
  html = html.replace(/\/css\/discord-auth-avatar\.css\?v=[^"']+/g, `/css/discord-auth-avatar.css?v=${BUILD}`);
  write(file, html);
}

patchAuthJs();
[...walkHtml(PAGES_DIR), path.join(PUBLIC_DIR, 'index.html')].forEach(patchHtml);

console.log(changed
  ? '[Discord/Auth] Sincronizacao do avatar estabilizada sem loop de DOM.'
  : '[Discord/Auth] Sincronizacao do avatar ja estava estabilizada.');
