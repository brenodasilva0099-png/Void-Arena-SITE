const fs = require('node:fs');
const path = require('node:path');

const files = [
  path.join(__dirname, '..', 'public', 'js', 'pages', 'chaveamento.js'),
  path.join(__dirname, '..', 'public', 'js', 'pages', 'grupos.js')
];
let changed = 0;
for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let source = fs.readFileSync(file, 'utf8');
  const before = source;
  source = source.replaceAll("'/api/dashboard/snapshot'", "'/api/league/bracket'");
  source = source.replaceAll('"/api/dashboard/snapshot"', '"/api/league/bracket"');
  source = source.replace(
    "VoidArena.bootLayout('chaveamento').then(load).catch((error) => setStatus(`❌ ${error.message}`, 'err'));",
    "Promise.resolve().then(load).catch((error) => setStatus(`❌ ${error.message}`, 'err'));"
  );
  source = source.replace(
    "VoidArena.bootLayout('grupos').then(() => { load(); setInterval(() => load({ silent: true }), 20000); }).catch((error) => setStatus(`❌ ${error.message}`, 'err'));",
    "Promise.resolve().then(() => { load(); setInterval(() => load({ silent: true }), 20000); }).catch((error) => setStatus(`❌ ${error.message}`, 'err'));"
  );
  if (source !== before) {
    fs.writeFileSync(file, source, 'utf8');
    changed += 1;
  }
}
console.log(`[Competitivo] ${changed} script(s) conectado(s) às rotas estáveis de chaveamento e grupos.`);
