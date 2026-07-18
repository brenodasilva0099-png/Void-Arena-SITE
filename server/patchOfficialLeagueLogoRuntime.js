const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const PAGES_DIR = path.join(PUBLIC_DIR, 'pages');
const LEAGUE_ROUTES_FILE = path.join(__dirname, 'routes', 'league.routes.js');
const BRAND_SYNC_FILE = path.join(PUBLIC_DIR, 'js', 'core', 'discord-brand-sync.js');
const UPDATES_FILE = path.join(PAGES_DIR, 'atualizacoes.html');
const VERSION_FILE = path.join(PUBLIC_DIR, 'official-brand.json');
const BUILD = '2026-07-18-official-brand-v1';
const OFFICIAL_LOGO = '/assets/hollow-nexus-official.svg';
let changed = false;

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (read(file) !== content) {
    fs.writeFileSync(file, content, 'utf8');
    changed = true;
  }
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : (entry.isFile() && entry.name.endsWith('.html') ? [full] : []);
  });
}

function patchLeagueRoutes() {
  let src = read(LEAGUE_ROUTES_FILE);
  if (!src) return;

  src = src.replace(
    /const DEFAULT_LOGO = '[^']*';/,
    `const DEFAULT_LOGO = '${OFFICIAL_LOGO}';`
  );

  src = src.replace(
    /icon:\s*clean\(guild\.icon\s*\|\|\s*process\.env\.LEAGUE_LOGO_URL\s*\|\|\s*process\.env\.PUBLIC_LOGO_URL\s*\|\|\s*''\)/,
    "icon: clean(process.env.LEAGUE_LOGO_URL || process.env.PUBLIC_LOGO_URL || DEFAULT_LOGO)"
  );

  write(LEAGUE_ROUTES_FILE, src);
}

function officialBrandSyncSource() {
  return `(function(){
  const BUILD='${BUILD}';
  const OFFICIAL_LOGO='${OFFICIAL_LOGO}';
  function isLogoCandidate(img){
    const src=String(img.getAttribute('src')||'');
    const alt=String(img.getAttribute('alt')||'');
    const cls=String(img.className||'');
    return /hollow|void|logo|brand|server|nexus|api\\/brand/i.test(src+' '+alt+' '+cls);
  }
  async function sync(){
    let icon=OFFICIAL_LOGO;
    let name='Hollow Nexus League';
    try{
      const res=await fetch('/api/brand?t='+Date.now(),{headers:{Accept:'application/json'},cache:'no-store'});
      const data=await res.json().catch(()=>({}));
      if(res.ok){
        icon=String(data.icon||data.logo||data.brand?.icon||OFFICIAL_LOGO);
        name=String(data.brand?.name||data.name||name);
      }
    }catch{}
    document.querySelectorAll('img').forEach((img)=>{
      if(isLogoCandidate(img)){
        img.src=icon;
        img.alt=name;
      }
    });
    document.querySelectorAll('link[rel="icon"],link[rel="shortcut icon"],link[rel="apple-touch-icon"]').forEach((link)=>{
      link.href=icon;
    });
    document.documentElement.dataset.officialBrand=BUILD;
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',sync);
  else sync();
})();
`;
}

function patchHtml(file) {
  let html = read(file);
  if (!html) return;

  html = html.replace(/<link\s+rel="icon"[^>]*>/gi, `<link rel="icon" href="${OFFICIAL_LOGO}?v=${BUILD}">`);
  html = html.replace(/<link\s+rel="shortcut icon"[^>]*>/gi, `<link rel="shortcut icon" href="${OFFICIAL_LOGO}?v=${BUILD}">`);
  html = html.replace(/<link\s+rel="apple-touch-icon"[^>]*>/gi, `<link rel="apple-touch-icon" href="${OFFICIAL_LOGO}?v=${BUILD}">`);
  html = html.replace(/src="(?:\/assets\/hollow-nexus\.png|\/assets\/logo\.png|\/api\/brand\/icon[^"]*)"/g, `src="${OFFICIAL_LOGO}?v=${BUILD}"`);
  html = html.replace(/<meta name="official-brand-build" content="[^"]*"\s*\/?>/g, '');

  if (html.includes('</head>')) {
    html = html.replace('</head>', `<meta name="official-brand-build" content="${BUILD}">\n</head>`);
  }

  write(file, html);
}

function insertUpdate(html, card) {
  if (html.includes('<article class="va-card va-update-card"')) {
    return html.replace('<article class="va-card va-update-card"', card + '\n          <article class="va-card va-update-card"');
  }
  if (html.includes('</main>')) return html.replace('</main>', card + '\n</main>');
  return html + card;
}

function patchUpdates() {
  let html = read(UPDATES_FILE);
  if (!html) return;

  const id = 'release-2026-07-18-official-league-logo';
  if (!html.includes(id)) {
    const card = `
          <article class="va-card va-update-card" id="${id}">
            <span class="va-update-dot"></span>
            <div class="va-update-meta"><span>18/07/2026 • 17:48 BRT</span><span>Site</span><span>Marca oficial</span></div>
            <h3>Logo oficial da Hollow Nexus aplicada em todo o site</h3>
            <p class="va-muted">A marca roxa enviada pela administração passa a ser a fonte padrão de logo, favicon e ícone da interface.</p>
            <ul class="va-update-list">
              <li class="site">Sidebar, destaque principal, rodapé e favicons usam o mesmo asset oficial.</li>
              <li class="fix">A sincronização automática deixa de substituir a marca pela imagem antiga do servidor.</li>
              <li class="fix">A alteração é exclusivamente visual e não modifica jogadores, clubes, eventos ou demais dados.</li>
            </ul>
          </article>
`;
    html = insertUpdate(html, card);
  }

  write(UPDATES_FILE, html);
}

patchLeagueRoutes();
write(BRAND_SYNC_FILE, officialBrandSyncSource());
[...walk(PAGES_DIR), path.join(PUBLIC_DIR, 'index.html')].forEach(patchHtml);
patchUpdates();
write(VERSION_FILE, JSON.stringify({
  build: BUILD,
  logo: OFFICIAL_LOGO,
  source: 'official-local-asset',
  updatedAt: '2026-07-18T17:48:00-03:00'
}, null, 2));

console.log(changed
  ? '[Brand] Logo oficial e favicons da League aplicados.'
  : '[Brand] Logo oficial e favicons da League ja estavam aplicados.');
