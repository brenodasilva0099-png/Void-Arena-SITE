const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, '..', 'public', 'js', 'core', 'league-navigation.js');
if (!fs.existsSync(file)) throw new Error('league-navigation.js não encontrado.');

let source = fs.readFileSync(file, 'utf8');
let changed = false;
const MARKER = 'hnl-navigation-no-page-prefetch-v1';

if (!source.includes(MARKER)) {
  source = source.replace("  'use strict';", `  'use strict';\n  const NAVIGATION_BUILD = '${MARKER}';`);
  changed = true;
}

const nextPrefetch = source.replace(
  /  function prefetch\(target\) \{[\s\S]*?\n  \}\n\n  function startNavigation/,
  `  function prefetch() {
    // Pré-carregamento de HTML removido: páginas são abertas somente no clique.
    return NAVIGATION_BUILD;
  }

  function startNavigation`
);
if (nextPrefetch !== source) {
  source = nextPrefetch;
  changed = true;
}

for (const listener of [
  "  document.addEventListener('pointerover', (event) => prefetch(event.target), { passive: true });\n",
  "  document.addEventListener('focusin', (event) => prefetch(event.target));\n"
]) {
  if (source.includes(listener)) {
    source = source.replace(listener, '');
    changed = true;
  }
}

if (source.includes("fetch(item.url.href")) throw new Error('[Navigation] Prefetch de páginas ainda está ativo.');
if (/addEventListener\(['"](?:pointerover|focusin)['"][\s\S]{0,100}prefetch/.test(source)) {
  throw new Error('[Navigation] Listener de prefetch ainda está ativo.');
}
if (!source.includes(MARKER)) throw new Error('[Navigation] Marcador final ausente.');

if (changed) fs.writeFileSync(file, source, 'utf8');
new Function(fs.readFileSync(file, 'utf8'));
console.log('[Navigation] Prefetch automático de HTML desativado; navegação somente por clique.');