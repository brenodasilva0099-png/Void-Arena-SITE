const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, '..', 'public', 'js', 'core', 'league-experience.js');
if (!fs.existsSync(file)) process.exit(0);

let source = fs.readFileSync(file, 'utf8');
let changed = false;

const hasCollectionHelper = source.includes("const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));");
if (!hasCollectionHelper) {
  console.warn('[Profile/Collection] Helper $$ não encontrado; patch ignorado sem bloquear o SITE.');
  process.exit(0);
}

// Corrige apenas chamadas simples reais como $('seletor').forEach(...).
// Usa callback para não confundir os cifrões especiais da string de substituição.
const before = source;
source = source.replace(/(^|[^\w$])\$\(([^\n;()]+)\)\.forEach\(/gm, (_match, prefix, selector) => `${prefix}$$(${selector}).forEach(`);
changed = source !== before;

if (changed) fs.writeFileSync(file, source, 'utf8');

// O único bloqueio permitido aqui é sintaxe JavaScript realmente inválida.
new Function(fs.readFileSync(file, 'utf8'));

const remainingSimpleCalls = (source.match(/(^|[^\w$])\$\(([^\n;()]+)\)\.forEach\(/gm) || []).length;
if (remainingSimpleCalls) {
  console.warn('[Profile/Collection] Ocorrências ambíguas preservadas para não interromper o SITE.', { remainingSimpleCalls });
}

console.log(changed
  ? '[Profile/Collection] Chamadas simples corrigidas sem bloquear o boot.'
  : '[Profile/Collection] Validação tolerante concluída; nenhuma correção necessária.');
