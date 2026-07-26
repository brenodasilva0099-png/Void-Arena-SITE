const fs = require('node:fs');
const path = require('node:path');

const pagesDir = path.join(__dirname, '..', 'public', 'pages');
const adminChatLink = '<a href="/pages/chat.html" data-admin-only hidden><i>💬</i><b>Chat Discord</b></a>';

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function write(file, content) {
  if (read(file) !== content) fs.writeFileSync(file, content, 'utf8');
}

if (!fs.existsSync(pagesDir)) {
  console.warn('[Admin/Chat] Pasta de páginas ausente; navegação não alterada.');
  return;
}

let changed = 0;
for (const name of fs.readdirSync(pagesDir).filter((entry) => entry.endsWith('.html'))) {
  const file = path.join(pagesDir, name);
  let html = read(file);
  if (!html) continue;

  // Remove versões antigas do chat na seção Comunicação para evitar duplicação.
  html = html.replace(/<div class="frm-nav-title">Comunicação<\/div>\s*<a[^>]*href="\/pages\/chat\.html"[^>]*>[\s\S]*?<\/a>/g, '');
  html = html.replace(/<a[^>]*href="\/pages\/chat\.html"[^>]*data-admin-only[^>]*>[\s\S]*?<\/a>/g, '');

  const formsPattern = /(<a[^>]*href="\/pages\/formularios\.html"[^>]*>)/;
  if (formsPattern.test(html)) {
    html = html.replace(formsPattern, `${adminChatLink}$1`);
  } else {
    const adminTitle = /(<div class="frm-nav-title"[^>]*data-admin-section[^>]*>Administração<\/div>)/;
    if (adminTitle.test(html)) html = html.replace(adminTitle, `$1${adminChatLink}`);
  }

  if (name === 'chat.html') {
    html = html.replace(/<a href="\/pages\/chat\.html" data-admin-only hidden>/, '<a class="active" href="/pages/chat.html" data-admin-only hidden>');
  }

  if (read(file) !== html) {
    write(file, html);
    changed += 1;
  }
}

console.log(`[Admin/Chat] Chat Discord colocado acima de Formulários em ${changed} página(s), sem duplicar o menu.`);
