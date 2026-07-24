const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const APP_FILE = path.join(__dirname, 'app.js');
const PAGE_FILE = path.join(ROOT, 'public', 'pages', 'formularios.html');
const SCRIPT_FILE = path.join(ROOT, 'public', 'js', 'formularios.js');
const BUILD = 'hnl-forms-static-v1';
const ROUTE_MARKER = 'hnl-forms-static-route-v1';
const CLIENT_MARKER = 'hnl-forms-session-v1';

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function write(file, content) {
  if (!content || read(file) === content) return false;
  fs.writeFileSync(file, content, 'utf8');
  return true;
}

if (!fs.existsSync(SCRIPT_FILE)) {
  throw new Error('public/js/formularios.js não existe; deploy bloqueado para evitar página vazia.');
}

let appSource = read(APP_FILE);
if (!appSource) throw new Error('server/app.js não encontrado para instalar a rota dos formulários.');

let appChanged = false;
if (!appSource.includes("const fs = require('node:fs');")) {
  const anchor = "const path = require('node:path');";
  if (!appSource.includes(anchor)) throw new Error('Import de path não encontrado em server/app.js.');
  appSource = appSource.replace(anchor, `${anchor}\nconst fs = require('node:fs');`);
  appChanged = true;
}

if (!appSource.includes(ROUTE_MARKER)) {
  const anchor = "  app.get(/^\\/(?:css|js|assets|uploads|images|img)\\/.+/, (req, res) => {";
  if (!appSource.includes(anchor)) throw new Error('Rota estática genérica não encontrada em server/app.js.');

  const dedicatedRoute = `  // ${ROUTE_MARKER}\n  app.get('/js/formularios.js', (_req, res) => {\n    const scriptFile = path.join(PUBLIC_DIR, 'js', 'formularios.js');\n    fs.readFile(scriptFile, (error, data) => {\n      if (error) {\n        console.error('[Formularios/Asset] Falha ao ler o JavaScript:', error.message);\n        if (res.headersSent) return res.end();\n        return res.status(500).type('text/plain; charset=utf-8').send('Falha ao carregar o módulo de formulários.');\n      }\n\n      res.status(200);\n      res.set('Content-Type', 'application/javascript; charset=utf-8');\n      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');\n      res.set('Pragma', 'no-cache');\n      res.set('Expires', '0');\n      res.set('X-Content-Type-Options', 'nosniff');\n      res.set('X-HNL-Forms-Asset', '${BUILD}');\n      res.set('Content-Length', String(data.length));\n      return res.end(data);\n    });\n  });\n\n`;

  appSource = appSource.replace(anchor, dedicatedRoute + anchor);
  appChanged = true;
}

if (appChanged) write(APP_FILE, appSource);

let pageSource = read(PAGE_FILE);
if (!pageSource) throw new Error('public/pages/formularios.html não encontrada.');
const versionedScript = `<script src="/js/formularios.js?v=${BUILD}"></script>`;
const nextPage = pageSource.replace(/<script\s+src="\/js\/formularios\.js(?:\?[^\"]*)?"\s*><\/script>/i, versionedScript);
if (!nextPage.includes(versionedScript)) {
  throw new Error('Referência ao JavaScript dos formulários não pôde ser versionada.');
}
write(PAGE_FILE, nextPage);

let scriptSource = read(SCRIPT_FILE);
if (!scriptSource) throw new Error('JavaScript dos formulários ficou vazio.');
if (!scriptSource.includes(CLIENT_MARKER)) {
  const oldBlock = `  if (response.status === 401) {\n    location.href = '/';\n    return;\n  }`;
  const newBlock = `  // ${CLIENT_MARKER}\n  if (response.status === 401) {\n    const session = await fetch('/api/auth/session?t=' + Date.now(), {\n      credentials: 'include',\n      cache: 'no-store',\n      headers: { Accept: 'application/json' }\n    }).then((result) => result.json()).catch(() => null);\n\n    if (!session?.authenticated) {\n      const next = location.pathname + location.search;\n      location.href = '/pages/login.html?next=' + encodeURIComponent(next);\n      return;\n    }\n\n    list.innerHTML = '';\n    empty.hidden = false;\n    empty.textContent = data.message || 'Sua sessão está ativa, mas os formulários ainda não responderam.';\n    return;\n  }`;

  if (!scriptSource.includes(oldBlock)) {
    throw new Error('Bloco antigo de sessão dos formulários não foi encontrado para correção segura.');
  }
  scriptSource = scriptSource.replace(oldBlock, newBlock);
  write(SCRIPT_FILE, scriptSource);
}

const finalApp = read(APP_FILE);
const finalPage = read(PAGE_FILE);
const finalScript = read(SCRIPT_FILE);
new Function(finalApp);
new Function(finalScript);

for (const marker of [ROUTE_MARKER, "app.get('/js/formularios.js'", 'application/javascript; charset=utf-8']) {
  if (!finalApp.includes(marker)) {
    throw new Error(`Rota dedicada dos formulários incompleta: ${marker}`);
  }
}
if (!finalPage.includes(`/js/formularios.js?v=${BUILD}`)) {
  throw new Error('Página de formulários não usa a versão dedicada do asset.');
}
for (const marker of ['async function loadForms()', CLIENT_MARKER, '/api/auth/session']) {
  if (!finalScript.includes(marker)) {
    throw new Error(`JavaScript dos formulários incompleto: ${marker}`);
  }
}

console.log('[Formularios/Asset] JavaScript servido por rota dedicada com MIME correto, cache desativado e sessão canônica.');