const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const CLIENT_FILE = path.join(PUBLIC_DIR, 'js', 'core', 'league-experience.js');
const SCRIPT_TAG = '<script src="/js/core/team-invite-stable.js?v=stable-v1"></script>';

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.isFile() ? [full] : [];
  });
}

let changedPages = 0;
for (const file of walk(PUBLIC_DIR).filter((item) => item.endsWith('.html'))) {
  let source = fs.readFileSync(file, 'utf8');
  if (source.includes('/js/core/team-invite-stable.js')) continue;
  if (!source.includes('</body>')) continue;
  source = source.replace('</body>', `  ${SCRIPT_TAG}\n</body>`);
  fs.writeFileSync(file, source, 'utf8');
  changedPages += 1;
}

if (fs.existsSync(CLIENT_FILE)) {
  let client = fs.readFileSync(CLIENT_FILE, 'utf8');
  client = client
    .replace(/\$\('\[data-remove-club-member\]'\s*,\s*box\)\.forEach/g, "$$('[data-remove-club-member]', box).forEach")
    .replace(/\$\('\[data-remove-club-member\]'\)\.forEach/g, "$$('[data-remove-club-member]').forEach");
  fs.writeFileSync(CLIENT_FILE, client, 'utf8');
  new Function(client);
}

const invitePage = path.join(PUBLIC_DIR, 'pages', 'convite-time.html');
if (fs.existsSync(invitePage)) {
  const source = fs.readFileSync(invitePage, 'utf8');
  if (!source.includes('/js/core/team-invite-stable.js')) {
    throw new Error('Página de convite não recebeu o script estável.');
  }
}

console.log(`[Times/Invite Stable UI] Script estável carregado em ${changedPages} página(s); erro forEach corrigido.`);
