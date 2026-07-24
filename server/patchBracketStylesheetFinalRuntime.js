const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const PAGE_FILE = path.join(ROOT, 'public', 'pages', 'chaveamento.html');
const STYLESHEET = '/css/bracket-desktop.css';
const BUILD = '2026-07-24-bracket-stylesheet-final-v1';

function applyBracketStylesheetFinal() {
  if (!fs.existsSync(PAGE_FILE)) {
    console.warn('[Bracket/Final] Página chaveamento.html não encontrada.');
    return false;
  }

  let html = fs.readFileSync(PAGE_FILE, 'utf8');
  const before = html;

  // Remove referências duplicadas e preserva uma única versão final.
  html = html.replace(/\s*<link\b[^>]*href=["']\/css\/bracket-desktop\.css(?:\?[^"']*)?["'][^>]*>/gi, '');
  const link = `  <link rel="stylesheet" href="${STYLESHEET}?v=${BUILD}">`;
  html = html.includes('</head>')
    ? html.replace('</head>', `${link}\n</head>`)
    : `${link}\n${html}`;

  if (!/<body\b[^>]*data-page=["']chaveamento["']/i.test(html)) {
    html = html.replace(/<body\b([^>]*)>/i, (match, attrs) => {
      if (/\bdata-page=/i.test(match)) return match.replace(/\bdata-page=["'][^"']*["']/i, 'data-page="chaveamento"');
      return `<body${attrs} data-page="chaveamento">`;
    });
  }

  if (html !== before) {
    fs.writeFileSync(PAGE_FILE, html, 'utf8');
    console.log('[Bracket/Final] Stylesheet obrigatório restaurado após a reconstrução das páginas.');
    return true;
  }

  console.log('[Bracket/Final] Stylesheet obrigatório já estava correto.');
  return false;
}

applyBracketStylesheetFinal();
module.exports = { applyBracketStylesheetFinal };
