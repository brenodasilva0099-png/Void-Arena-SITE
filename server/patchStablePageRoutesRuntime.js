const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const appFile = path.join(__dirname, 'app.js');
const pagesDir = path.join(ROOT, 'public', 'pages');
const BUILD_VERSION = process.env.RENDER_GIT_COMMIT || process.env.VOID_ARENA_ASSET_VERSION || '2026-07-12-stable-nav-v2';
let changed = false;

function patchAppRoutes() {
  if (!fs.existsSync(appFile)) return;
  let src = fs.readFileSync(appFile, 'utf8');
  let next = src;

  if (!next.includes('function voidArenaAssetContentType')) {
    const helper = String.raw`
function voidArenaAssetContentType(filePath = '') {
  const clean = String(filePath || '').toLowerCase().split('?')[0];
  if (clean.endsWith('.css')) return 'text/css; charset=utf-8';
  if (clean.endsWith('.js') || clean.endsWith('.mjs')) return 'application/javascript; charset=utf-8';
  if (clean.endsWith('.json') || clean.endsWith('.map')) return 'application/json; charset=utf-8';
  if (clean.endsWith('.svg')) return 'image/svg+xml';
  if (clean.endsWith('.png')) return 'image/png';
  if (clean.endsWith('.jpg') || clean.endsWith('.jpeg')) return 'image/jpeg';
  if (clean.endsWith('.webp')) return 'image/webp';
  if (clean.endsWith('.gif')) return 'image/gif';
  if (clean.endsWith('.ico')) return 'image/x-icon';
  if (clean.endsWith('.woff')) return 'font/woff';
  if (clean.endsWith('.woff2')) return 'font/woff2';
  return 'application/octet-stream';
}

function voidArenaPageFallbackHtml(pageName = 'pagina') {
  const safePage = String(pageName || 'pagina').replace(/[<>&"']/g, '');
  return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Void Arena</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#070711;color:#f8f7ff;font-family:Inter,system-ui,sans-serif}.card{width:min(92vw,560px);padding:30px;border:1px solid rgba(139,92,246,.35);border-radius:24px;background:rgba(15,14,35,.92);box-shadow:0 24px 80px rgba(0,0,0,.42)}h1{margin:0 0 10px;font-size:30px}p{color:#c9c4e8;line-height:1.55}.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}a,button{border:1px solid rgba(167,139,250,.35);background:rgba(124,58,237,.18);color:#fff;border-radius:12px;padding:10px 14px;font-weight:800;text-decoration:none;cursor:pointer}</style></head><body><main class="card"><h1>Carregando página da Arena</h1><p>A página ' + safePage + ' não respondeu corretamente nesta tentativa. Recarregue a página; se o Render ainda estiver subindo, aguarde alguns segundos.</p><div class="actions"><button onclick="location.reload()">Recarregar</button><a href="/pages/dashboard.html">Ir para início</a><a href="/pages/suporte.html">Abrir suporte</a></div></main></body></html>';
}
`;
    next = next.replace('function createServer({ client }) {', helper + '\nfunction createServer({ client }) {');
  }

  if (!next.includes("X-Void-Arena-Asset-Route', 'hard-assets-v2")) {
    const assetRoute = String.raw`
  app.get(/^\/(?:css|js|assets|uploads|images|img)\/.+/, (req, res) => {
    const cleanPath = path.normalize(String(req.path || '').replace(/^\/+/, ''));
    if (!cleanPath || cleanPath.startsWith('..') || path.isAbsolute(cleanPath)) {
      return res.status(400).type('text/plain; charset=utf-8').send('Asset inválido.');
    }
    const fullPath = path.join(PUBLIC_DIR, cleanPath);
    res.set('Cache-Control', /\.(?:css|js|mjs|map|html)$/i.test(cleanPath) ? 'no-store, no-cache, must-revalidate, proxy-revalidate' : 'public, max-age=60, must-revalidate');
    res.set('X-Void-Arena-Asset-Route', 'hard-assets-v2');
    res.type(voidArenaAssetContentType(cleanPath));
    return res.sendFile(fullPath, (error) => {
      if (!error) return;
      console.error('[Assets] Falha ao servir ' + req.path + ':', error.message);
      if (!res.headersSent) {
        const status = Number(error.statusCode || error.status || 404) === 404 ? 404 : 500;
        return res.status(status).type('text/plain; charset=utf-8').send(status === 404 ? 'Asset não encontrado.' : 'Falha ao carregar asset.');
      }
    });
  });
`;
    next = next.replace("  app.get('/api/maintenance', async (_req, res) => {", assetRoute + "\n  app.get('/api/maintenance', async (_req, res) => {");
  }

  if (!next.includes("X-Void-Arena-Page-Route', 'stable-pages-v2")) {
    const pageRoute = String.raw`
  app.get('/pages/:pageFile', (req, res, nextRoute) => {
    const pageFile = path.basename(String(req.params.pageFile || ''));
    if (!/^[a-z0-9-]+\.html$/i.test(pageFile)) return nextRoute();
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('X-Void-Arena-Page-Route', 'stable-pages-v2');
    return res.sendFile(path.join(PUBLIC_DIR, 'pages', pageFile), (error) => {
      if (!error) return;
      console.error('[Pages] Falha ao servir /pages/' + pageFile + ':', error.message);
      if (!res.headersSent) return res.status(error.statusCode || error.status || 500).send(voidArenaPageFallbackHtml(pageFile));
    });
  });
`;
    next = next.replace('  app.use(express.static(PUBLIC_DIR));', pageRoute + '\n  app.use(express.static(PUBLIC_DIR, {\n    etag: true,\n    maxAge: 0,\n    fallthrough: true,\n    setHeaders(res, filePath) {\n      if (/\\.(?:html|css|js|mjs|map)$/i.test(filePath)) {\n        res.setHeader(\'Cache-Control\', \'no-store, no-cache, must-revalidate, proxy-revalidate\');\n      }\n      res.setHeader(\'X-Void-Arena-Static\', \'stable-v2\');\n    }\n  }));');
  }

  if (next !== src) {
    fs.writeFileSync(appFile, next, 'utf8');
    changed = true;
  }
}

function versionPublicPages() {
  if (!fs.existsSync(pagesDir)) return;
  const version = encodeURIComponent(String(BUILD_VERSION).slice(0, 48));
  for (const entry of fs.readdirSync(pagesDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.html')) continue;
    const file = path.join(pagesDir, entry.name);
    const before = fs.readFileSync(file, 'utf8');
    let after = before;
    after = after.replace(/(href="\/(?:css)\/[^"?#]+\.css)(?:\?v=[^"#]*)?/g, `$1?v=${version}`);
    after = after.replace(/(src="\/(?:js|assets)\/[^"?#]+\.js)(?:\?v=[^"#]*)?/g, `$1?v=${version}`);
    if (after !== before) {
      fs.writeFileSync(file, after, 'utf8');
      changed = true;
    }
  }
}

patchAppRoutes();
versionPublicPages();

console.log(changed ? '[Rotas] Assets CSS/JS e paginas estabilizados com cache limpo.' : '[Rotas] Assets CSS/JS e paginas ja estavam estabilizados.');
