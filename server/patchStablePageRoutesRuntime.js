const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const appFile = path.join(__dirname, 'app.js');
const pagesDir = path.join(ROOT, 'public', 'pages');
const BUILD_VERSION = process.env.RENDER_GIT_COMMIT || process.env.VOID_ARENA_ASSET_VERSION || '2026-07-12-stable-nav';
let changed = false;

function patchAppRoutes() {
  if (!fs.existsSync(appFile)) return;
  let src = fs.readFileSync(appFile, 'utf8');
  if (src.includes('function voidArenaPageFallbackHtml')) return;

  const helper = String.raw`
function voidArenaPageFallbackHtml(pageName = 'pagina') {
  const safePage = String(pageName || 'pagina').replace(/[<>&"']/g, '');
  return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Void Arena</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#070711;color:#f8f7ff;font-family:Inter,system-ui,sans-serif}.card{width:min(92vw,560px);padding:30px;border:1px solid rgba(139,92,246,.35);border-radius:24px;background:rgba(15,14,35,.92);box-shadow:0 24px 80px rgba(0,0,0,.42)}h1{margin:0 0 10px;font-size:30px}p{color:#c9c4e8;line-height:1.55}.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}a,button{border:1px solid rgba(167,139,250,.35);background:rgba(124,58,237,.18);color:#fff;border-radius:12px;padding:10px 14px;font-weight:800;text-decoration:none;cursor:pointer}</style></head><body><main class="card"><h1>Carregando página da Arena</h1><p>A página ' + safePage + ' não respondeu corretamente nesta tentativa. Recarregue a página; se o Render ainda estiver subindo, aguarde alguns segundos.</p><div class="actions"><button onclick="location.reload()">Recarregar</button><a href="/pages/dashboard.html">Ir para início</a><a href="/pages/suporte.html">Abrir suporte</a></div></main></body></html>';
}
`;

  const route = String.raw`
  app.get('/pages/:pageFile', (req, res, next) => {
    const pageFile = path.basename(String(req.params.pageFile || ''));
    if (!/^[a-z0-9-]+\.html$/i.test(pageFile)) return next();
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('X-Void-Arena-Page-Route', 'stable-pages-v1');
    return res.sendFile(path.join(PUBLIC_DIR, 'pages', pageFile), (error) => {
      if (!error) return;
      console.error('[Pages] Falha ao servir /pages/' + pageFile + ':', error.message);
      if (!res.headersSent) return res.status(error.statusCode || 500).send(voidArenaPageFallbackHtml(pageFile));
    });
  });
`;

  src = src.replace('function createServer({ client }) {', helper + '\nfunction createServer({ client }) {');
  src = src.replace('  app.use(express.static(PUBLIC_DIR));', route + '\n  app.use(express.static(PUBLIC_DIR, {\n    etag: true,\n    maxAge: 0,\n    setHeaders(res, filePath) {\n      if (/\\.(?:html|css|js|mjs|map)$/i.test(filePath)) {\n        res.setHeader(\'Cache-Control\', \'no-store, no-cache, must-revalidate, proxy-revalidate\');\n      }\n      res.setHeader(\'X-Void-Arena-Static\', \'stable-v1\');\n    }\n  }));');

  fs.writeFileSync(appFile, src, 'utf8');
  changed = true;
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

console.log(changed ? '[Rotas] Paginas/CSS/JS estabilizados com cache limpo.' : '[Rotas] Paginas/CSS/JS ja estavam estabilizados.');
