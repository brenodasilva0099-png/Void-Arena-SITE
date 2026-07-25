const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, '..', 'public', 'js', 'core', 'league-experience.js');
if (!fs.existsSync(file)) process.exit(0);

let source = fs.readFileSync(file, 'utf8');
let changed = false;

if (!source.includes("const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));")) {
  throw new Error('Helper de coleção $$ ausente em league-experience.js.');
}

const before = source;
source = source.replace(/(?<!\$)\$\(([^\n;]+?)\)\.forEach\(/g, '$$($1).forEach(');
if (source !== before) changed = true;

if (/((?<!\$)\$\([^\n;]+?\)\.forEach\()/.test(source)) {
  throw new Error('Ainda existe querySelector simples sendo usado com forEach.');
}

if (changed) fs.writeFileSync(file, source, 'utf8');
new Function(fs.readFileSync(file, 'utf8'));
console.log(changed
  ? '[Profile/Collection] querySelector simples trocado por coleção antes do forEach.'
  : '[Profile/Collection] Uso de coleções no perfil já estava correto.');