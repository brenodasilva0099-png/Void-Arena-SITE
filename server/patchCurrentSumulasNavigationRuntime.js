const fs = require('node:fs');
const path = require('node:path');

const PAGES_DIR = path.join(__dirname, '..', 'public', 'pages');
const SUMULAS_HREF = '/pages/sumulas.html';
const SUMULAS_LINK = `<a href="${SUMULAS_HREF}"><i>▤</i><b>Súmulas</b></a>`;
let changed = 0;

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function normalizeNav(nav, active) {
  let next = nav.replace(/<a\b[^>]*href=["']\/pages\/sumulas\.html["'][^>]*>[\s\S]*?<\/a>/gi, '');
  const link = active ? SUMULAS_LINK.replace('<a ', '<a class="active" ') : SUMULAS_LINK;
  if (/<a\b[^>]*href=["']\/pages\/resultados\.html["'][^>]*>[\s\S]*?<\/a>/i.test(next)) {
    next = next.replace(/(<a\b[^>]*href=["']\/pages\/resultados\.html["'][^>]*>[\s\S]*?<\/a>)/i, `$1${link}`);
  } else if (/<div class="frm-nav-title">Competitivo<\/div>/i.test(next)) {
    next = next.replace(/(<div class="frm-nav-title">Competitivo<\/div>)/i, `$1${link}`);
  }
  return next;
}

if (fs.existsSync(PAGES_DIR)) {
  for (const name of fs.readdirSync(PAGES_DIR).filter((entry) => entry.endsWith('.html'))) {
    const file = path.join(PAGES_DIR, name);
    let html = read(file);
    if (!html || !html.includes('class="frm-shell"')) continue;
    const before = html;
    html = html.replace(/<nav class="frm-nav">[\s\S]*?<\/nav>/i, (nav) => normalizeNav(nav, name === 'sumulas.html'));
    if (html !== before) {
      fs.writeFileSync(file, html, 'utf8');
      changed += 1;
    }
  }
}

console.log(`[League/Súmulas] Botão inserido no menu atual em ${changed} página(s).`);
