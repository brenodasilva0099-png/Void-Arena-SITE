const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const APP_FILE = path.join(__dirname, 'app.js');
const PUBLIC_DIR = path.join(ROOT, 'public');
const PAGES_DIR = path.join(PUBLIC_DIR, 'pages');
const UPDATES_FILE = path.join(PAGES_DIR, 'atualizacoes.html');
const BRAND_SYNC_FILE = path.join(PUBLIC_DIR, 'js', 'core', 'discord-brand-sync.js');
const BUILD = '2026-07-17-discord-login-brand-data-v1';
const UPDATE_ID = 'release-2026-07-17-discord-login-brand-panels';
const CANONICAL_SITE = 'https://hollow-nexus-league.onrender.com';
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

function patchApp() {
  let src = read(APP_FILE);
  if (!src) return;

  const helper = `function cleanPublicSiteUrl(value = '') {\n  const raw = String(value || '').trim().replace(/\\/+$/, '');\n  if (!raw) return '';\n  if (!/^https?:\\/\\//i.test(raw)) return '';\n  return raw;\n}\n\nfunction isOldRenderSiteUrl(value = '') {\n  return /void-arena-site(?:-[a-z0-9]+)?\\.onrender\\.com/i.test(String(value || ''));\n}\n\nfunction getPublicSiteUrl() {\n  const configured = cleanPublicSiteUrl(\n    process.env.CANONICAL_SITE_URL ||\n    process.env.PUBLIC_SITE_URL ||\n    process.env.SITE_PUBLIC_URL ||\n    process.env.SITE_URL ||\n    process.env.APP_URL ||\n    process.env.FRONTEND_URL ||\n    ''\n  );\n  if (configured && !isOldRenderSiteUrl(configured)) return configured;\n  return '${CANONICAL_SITE}';\n}\n\nfunction getGoogleCallbackUrl() {\n  const configured = cleanPublicSiteUrl(process.env.GOOGLE_CALLBACK_URL || '');\n  if (configured && !isOldRenderSiteUrl(configured)) return configured;\n  return getPublicSiteUrl() + '/auth/google/callback';\n}\n\nfunction getDiscordCallbackUrl() {\n  const configured = cleanPublicSiteUrl(process.env.DISCORD_CALLBACK_URL || '');\n  if (configured && !isOldRenderSiteUrl(configured)) return configured;\n  return getPublicSiteUrl() + '/auth/discord/callback';\n}\n`;

  src = src.replace(
    /function getGoogleCallbackUrl\(\) \{[\s\S]*?\}\n\nfunction getDiscordCallbackUrl\(\) \{[\s\S]*?\}\n/,
    helper
  );

  const botDefaultOld = "const BOT_API_URL = String(process.env.BOT_API_URL || 'http://localhost:3002').replace(/\\/$/, '');";
  const botDefaultNew = "const BOT_API_URL = String(process.env.BOT_API_URL || process.env.BOT_PUBLIC_URL || 'http://localhost:3002').replace(/\\/$/, '');";
  if (src.includes(botDefaultOld)) src = src.replace(botDefaultOld, botDefaultNew);

  const brandFetchOld = "const botUrl = String(process.env.BOT_API_URL || 'https://void-arena-bot.onrender.com').replace(/\\/$/, '');";
  const brandFetchNew = "const botUrl = String(process.env.BOT_API_URL || process.env.BOT_PUBLIC_URL || 'https://void-arena-bot.onrender.com').replace(/\\/$/, '');";
  if (src.includes(brandFetchOld)) src = src.replace(brandFetchOld, brandFetchNew);

  if (!src.includes("app.get('/api/public/site-url'")) {
    const anchor = "  app.get('/api/health', async (_req, res) => {";
    const block = `  app.get('/api/public/site-url', (_req, res) => {\n    return res.json({\n      success: true,\n      siteUrl: getPublicSiteUrl(),\n      discordCallbackUrl: getDiscordCallbackUrl(),\n      build: '${BUILD}'\n    });\n  });\n\n`;
    if (src.includes(anchor)) src = src.replace(anchor, block + anchor);
  }

  write(APP_FILE, src);
}

function walkHtml(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walkHtml(full) : (entry.isFile() && entry.name.endsWith('.html') ? [full] : []);
  });
}

function patchHtml(file) {
  let html = read(file);
  if (!html) return;
  html = html.replace(/https:\/\/void-arena-site(?:-[a-z0-9]+)?\.onrender\.com/gi, CANONICAL_SITE);
  html = html.replace(/<meta name="discord-brand-sync-build" content="[^"]*"\s*\/?>/g, '');
  if (html.includes('</head>') && !html.includes('discord-brand-sync-build')) {
    html = html.replace('</head>', `  <meta name="discord-brand-sync-build" content="${BUILD}">\n</head>`);
  }
  if (html.includes('</body>') && !html.includes('/js/core/discord-brand-sync.js')) {
    html = html.replace('</body>', '  <script src="/js/core/discord-brand-sync.js"></script>\n</body>');
  }
  write(file, html);
}

function patchBrandSync() {
  const js = `(function(){\n  const BUILD='${BUILD}';\n  const FALLBACK_SITE='${CANONICAL_SITE}';\n  function setAttr(el,name,value){ if(el && value) el.setAttribute(name,value); }\n  function isLogoCandidate(img){\n    const src=String(img.getAttribute('src')||'');\n    const alt=String(img.getAttribute('alt')||'');\n    const cls=String(img.className||'');\n    return /hollow|void|logo|brand|server|nexus/i.test(src+' '+alt+' '+cls);\n  }\n  function normalizeUrl(value){ return String(value||'').trim(); }\n  async function getJson(url){\n    const res=await fetch(url+(url.includes('?')?'&':'?')+'t='+Date.now(),{headers:{Accept:'application/json'},cache:'no-store'});\n    if(!res.ok) throw new Error('HTTP '+res.status);\n    return res.json();\n  }\n  async function syncBrand(){\n    try{\n      const data=await getJson('/api/bot');\n      const icon=normalizeUrl(data.guildIcon||data.avatar||'');\n      const name=normalizeUrl(data.guildName||data.serverName||data.displayName||data.name||'Hollow Nexus League');\n      if(icon){\n        document.querySelectorAll('img').forEach((img)=>{ if(isLogoCandidate(img)) { img.src=icon; img.alt=name; } });\n        document.querySelectorAll('link[rel="icon"],link[rel="shortcut icon"],link[rel="apple-touch-icon"]').forEach((link)=>setAttr(link,'href',icon));\n      }\n      document.querySelectorAll('[data-discord-server-name]').forEach((el)=>{ el.textContent=name; });\n      document.documentElement.dataset.discordBrandSync=BUILD;\n    }catch(error){\n      document.documentElement.dataset.discordBrandSync='failed';\n    }\n  }\n  async function syncSiteUrl(){\n    try{\n      const data=await getJson('/api/public/site-url');\n      const base=normalizeUrl(data.siteUrl)||FALLBACK_SITE;\n      document.querySelectorAll('a[href*="void-arena-site"]').forEach((a)=>{\n        try{ const old=new URL(a.href); a.href=base+old.pathname+old.search+old.hash; }catch{}\n      });\n    }catch{}\n  }\n  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>{ syncBrand(); syncSiteUrl(); });\n  else { syncBrand(); syncSiteUrl(); }\n})();\n`;
  write(BRAND_SYNC_FILE, js);
}

function patchUpdatesPage() {
  let html = read(UPDATES_FILE);
  if (!html || html.includes(UPDATE_ID)) return;
  const card = String.raw`
          <article class="va-card va-update-card" id="release-2026-07-17-discord-login-brand-panels">
            <span class="va-update-dot"></span>
            <div class="va-update-meta"><span>17/07/2026 • 22:05 BRT</span><span>Site + Bot</span><span>Discord/Render</span></div>
            <h3>Login Discord, logo do servidor e painéis públicos ajustados para o novo link</h3>
            <p class="va-muted">Camada de correção para a migração do Render para https://hollow-nexus-league.onrender.com, mantendo dados vivos e atualizando fluxos que ainda apontavam para o serviço antigo.</p>
            <ul class="va-update-list">
              <li class="site">O callback do Discord passa a ignorar URLs antigas do Render e usar o link público atual da Hollow Nexus League.</li>
              <li class="site">A logo/favico do site agora tenta sincronizar automaticamente com o ícone do servidor retornado pelo bot.</li>
              <li class="bot">Painéis e mensagens do bot para formulários, partidas/treinos e placar passam a ser revisados e atualizados com o novo link do site.</li>
              <li class="fix">A revisão preserva jogadores, clubes, rankings, eventos, inscrições e histórico; ela troca somente links, painéis e camada visual de integração.</li>
            </ul>
          </article>
`;
  if (html.includes('<article class="va-card va-update-card"')) {
    html = html.replace('<article class="va-card va-update-card"', card + '\n          <article class="va-card va-update-card"');
  } else if (html.includes('</main>')) {
    html = html.replace('</main>', card + '\n</main>');
  } else {
    html += card;
  }
  write(UPDATES_FILE, html);
}

patchApp();
patchBrandSync();
patchUpdatesPage();
[...walkHtml(PAGES_DIR), path.join(PUBLIC_DIR, 'index.html')].forEach(patchHtml);

console.log(changed ? '[Discord/Login] Login, URL publica e logo Discord corrigidos.' : '[Discord/Login] Login, URL publica e logo Discord ja estavam corrigidos.');
