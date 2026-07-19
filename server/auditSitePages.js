const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const PAGES_DIR = path.join(PUBLIC_DIR, 'pages');
const BASE_REQUIRED = [
  '/css/league-critical.css',
  '/css/league-polish.css',
  '/js/core/league-navigation.js',
  '/js/core/league-page-integrity.js',
  '/js/core/league-auth-ui.js'
];
const EXPERIENCE_REQUIRED = [
  '/css/league-experience.css',
  '/js/core/social-icons.js',
  '/js/core/league-experience.js'
];
const LEGACY_REQUIRED = [
  '/js/core/league-polish.js'
];

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function walkHtml(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkHtml(full);
    return entry.isFile() && entry.name.toLowerCase().endsWith('.html') ? [full] : [];
  });
}

function refs(html) {
  const found = [];
  const re = /<(?:link|script|img|source)[^>]+(?:href|src)=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = re.exec(html))) found.push(String(match[1] || '').split('?')[0].split('#')[0]);
  return found;
}

function count(html, needle) {
  return html.split(needle).length - 1;
}

const files = [...walkHtml(PAGES_DIR), path.join(PUBLIC_DIR, 'index.html')].filter(fs.existsSync);
const failures = [];
const warnings = [];

for (const file of files) {
  const html = read(file);
  const relative = path.relative(ROOT, file).replace(/\\/g, '/');
  const isLeaguePage = /(?:frm-shell|data-frm-module|frm-polish-page)/i.test(html);
  const isExperiencePage = /(?:data-hnl-module|league-experience\.js)/i.test(html);

  if (isLeaguePage) {
    const requiredAssets = [...BASE_REQUIRED, ...(isExperiencePage ? EXPERIENCE_REQUIRED : LEGACY_REQUIRED)];
    for (const required of requiredAssets) {
      if (!html.includes(required)) failures.push(`${relative}: referência obrigatória ausente ${required}`);
      if (count(html, required) > 1) failures.push(`${relative}: referência duplicada ${required}`);
    }
  }

  if (/discord-brand-sync\.js|discord-auth-avatar\.(?:js|css)/i.test(html)) {
    failures.push(`${relative}: asset transitório antigo ainda referenciado`);
  }

  if (/league-auth-ui\.css/i.test(html)) {
    failures.push(`${relative}: stylesheet de autenticação não consolidado ainda referenciado`);
  }

  if (isExperiencePage && /federation-(?:polish|no-mock)\.js|league-polish\.js/i.test(html)) {
    failures.push(`${relative}: runtime legado carregado junto com a experiência nova`);
  }

  if (relative === 'public/pages/chaveamento.html') {
    if (!/<body\b[^>]*data-page=["']chaveamento["']/i.test(html)) {
      failures.push(`${relative}: marcador data-page="chaveamento" ausente; o layout visual não será ativado`);
    }
    if (!html.includes('/css/bracket-desktop.css')) {
      failures.push(`${relative}: stylesheet do chaveamento ausente`);
    }
  }


  if (relative === 'public/pages/competicoes.html') {
    if (!html.includes('id="competitionTabs"') || !html.includes('data-competition-filter="active"')) {
      failures.push(`${relative}: abas da vitrine de competições ausentes`);
    }
  }

  if (relative === 'public/pages/eventos.html') {
    for (const marker of ['hnl-cafe-event-card', '☕', 'R$ 35', 'R$ 15', 'Patente elevada']) {
      if (!html.includes(marker)) failures.push(`${relative}: instrução ou premiação do Café com Leite ausente ${marker}`);
    }
  }

  if (relative === 'public/pages/cafe-com-leite.html') {
    for (const marker of ['id="como-funciona"', 'hnl-event-steps', 'hnl-prize-grid', 'R$ 35', 'R$ 15']) {
      if (!html.includes(marker)) failures.push(`${relative}: guia do evento ausente ${marker}`);
    }
  }

  if (relative === 'public/pages/prancheta-tatica.html') {
    for (const marker of ['hnl-field-goal', 'hnl-penalty-area', 'id="attackPlan"', 'id="simulateAttack"', 'id="tacticTokenList"']) {
      if (!html.includes(marker)) failures.push(`${relative}: recurso da prancheta ausente ${marker}`);
    }
  }

  if (relative === 'public/pages/cadastrar-clube.html') {
    if (!html.includes('name="socialInstagram"') || !html.includes('name="socialWebsite"')) {
      failures.push(`${relative}: campos de redes sociais do clube ausentes`);
    }
  }

  if (relative === 'public/pages/clubes.html' && />\s*Administrar\s*</i.test(html)) {
    failures.push(`${relative}: botão global Administrar ainda presente`);
  }

  if (relative === 'public/pages/perfil.html') {
    if (!html.includes('class="frm-shell"') || html.includes('class="va-shell"')) {
      failures.push(`${relative}: perfil ainda usa a estrutura visual antiga`);
    }
    for (const marker of ['id="profilePageForm"', 'id="profileConnectionsPreview"', '/css/profile-v2.css', '/js/core/profile-api.js', '/js/pages/perfil.js']) {
      if (!html.includes(marker)) failures.push(`${relative}: conteúdo obrigatório do perfil ausente ${marker}`);
    }
  }

  if (relative === 'public/pages/configuracoes.html') {
    if (!html.includes('class="frm-shell"') || html.includes('class="va-shell"') || html.includes('/css/style.css')) {
      failures.push(`${relative}: configurações ainda usa a estrutura visual antiga`);
    }
    for (const marker of ['hnl-config-workspace', 'id="config-announcements"', 'id="config-roles"', 'id="config-voices"', '/js/pages/configuracoes.js']) {
      if (!html.includes(marker)) failures.push(`${relative}: central organizada ausente ${marker}`);
    }
  }

  for (const ref of refs(html)) {
    if (!ref.startsWith('/') || ref.startsWith('//') || ref.startsWith('/api/') || ref.startsWith('/auth/')) continue;
    const full = path.join(PUBLIC_DIR, ref.replace(/^\/+/, ''));
    if (!fs.existsSync(full)) warnings.push(`${relative}: asset local não encontrado ${ref}`);
  }
}

const experienceScript = read(path.join(PUBLIC_DIR, 'js', 'core', 'league-experience.js'));
for (const marker of ['openTeamRegistration', '/api/events/${encodeURIComponent(event.id)}/register', 'data-register-event', 'openPlayerSelector', "api('/api/league/cafe-ranking')", 'simulateAttack']) {
  if (!experienceScript.includes(marker)) failures.push(`public/js/core/league-experience.js: fluxo obrigatório ausente ${marker}`);
}

console.log(`[Page Audit] ${files.length} página(s) verificadas.`);
if (warnings.length) {
  console.warn('[Page Audit] Avisos:');
  warnings.forEach((item) => console.warn(`- ${item}`));
}
if (failures.length) {
  console.error('[Page Audit] Falhas:');
  failures.forEach((item) => console.error(`- ${item}`));
  process.exitCode = 1;
} else {
  console.log('[Page Audit] Experiência nova e páginas legadas isoladas, assets e duplicidade: OK.');
}
