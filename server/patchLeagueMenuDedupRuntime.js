const fs = require('node:fs');
const path = require('node:path');

const pages = path.join(__dirname, '..', 'public', 'pages');
if (!fs.existsSync(pages)) process.exit(0);
let changed = 0;
for (const name of fs.readdirSync(pages)) {
  if (!name.endsWith('.html')) continue;
  const file = path.join(pages, name);
  let html = fs.readFileSync(file, 'utf8');
  if (!html.includes('frm-shell')) continue;
  const before = html;
  html = html
    .replace(/<a[^>]+href="\/pages\/competicoes\.html"[^>]*><i>[^<]*<\/i><b>Competições<\/b><\/a>/gi, '')
    .replace(/<a[^>]+href="\/pages\/clubes\.html"[^>]*><i>[^<]*<\/i><b>Clubes Participantes<\/b><\/a>/gi, '')
    .replace(/<a[^>]+href="\/pages\/atletas\.html"[^>]*><i>[^<]*<\/i><b>Jogadores Registrados<\/b><\/a>/gi, '')
    .replace(/<a[^>]+href="\/pages\/rankings\.html#jogadores"[^>]*><i>[^<]*<\/i><b>Ranking de Jogadores<\/b><\/a>/gi, '');
  if (html !== before) {
    fs.writeFileSync(file, html, 'utf8');
    changed += 1;
  }
}
console.log(`[League/Menu] Duplicações removidas em ${changed} página(s).`);
