const fs = require('node:fs');
const path = require('node:path');
const storage = require('../storage');

const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');
const PAGES_DIR = path.join(PUBLIC_DIR, 'pages');
const PAGE_INTEGRITY_FILE = path.join(PUBLIC_DIR, 'page-integrity.json');
const NAVIGATION_INTEGRITY_FILE = path.join(PUBLIC_DIR, 'navigation-integrity.json');
const EXPECTED_ROUTES = [
  ['get', '/api/health'],
  ['get', '/api/auth/session'],
  ['get', '/auth/discord'],
  ['get', '/auth/discord/callback'],
  ['get', '/api/bot'],
  ['get', '/api/teams'],
  ['get', '/api/players'],
  ['get', '/api/league/overview'],
  ['get', '/api/league/news'],
  ['get', '/api/notifications'],
  ['get', '/api/health/routes'],
  ['get', '/api/health/pages']
];

function botTarget() {
  const raw = String(process.env.BOT_API_URL || process.env.BOT_PUBLIC_URL || '').trim();
  if (!raw) return '';
  try { return new URL(raw).origin; }
  catch { return raw.replace(/[?#].*$/, '').replace(/\/+$/, ''); }
}

function routeStack(app) {
  return app?._router?.stack || app?.router?.stack || [];
}

function routeExists(app, method, routePath) {
  const lower = String(method || '').toLowerCase();
  return routeStack(app).some((layer) => {
    const route = layer?.route;
    const paths = Array.isArray(route?.path) ? route.path : [route?.path];
    return paths.includes(routePath) && Boolean(route?.methods?.[lower]);
  });
}

function assetStatus(relativePath) {
  const fullPath = path.join(PUBLIC_DIR, relativePath.replace(/^\/+/, ''));
  try {
    const stat = fs.statSync(fullPath);
    return { path: `/${relativePath.replace(/^\/+/, '')}`, exists: stat.isFile(), bytes: stat.size };
  } catch {
    return { path: `/${relativePath.replace(/^\/+/, '')}`, exists: false, bytes: 0 };
  }
}

function walkHtml(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkHtml(full);
    return entry.isFile() && entry.name.toLowerCase().endsWith('.html') ? [full] : [];
  });
}

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return null; }
}

function readIntegrityManifest() {
  return readJson(PAGE_INTEGRITY_FILE);
}

function readNavigationManifest() {
  return readJson(NAVIGATION_INTEGRITY_FILE);
}

function registerRouteAuditRoutes(app) {
  app.get('/api/health/pages', (_req, res) => {
    const pages = [...walkHtml(PAGES_DIR), path.join(PUBLIC_DIR, 'index.html')].filter(fs.existsSync);
    const manifest = readIntegrityManifest();
    const navigation = readNavigationManifest();
    const requiredAssets = [
      assetStatus('css/league-critical.css'),
      assetStatus('css/league-polish.css'),
      assetStatus('css/league-auth-ui.css'),
      assetStatus('js/core/league-page-integrity.js'),
      assetStatus('js/core/league-auth-ui.js'),
      assetStatus('js/core/league-polish.js')
    ];
    const missingAssets = requiredAssets.filter((item) => !item.exists);
    const missingLocalAssets = Array.isArray(manifest?.missingLocalAssets) ? manifest.missingLocalAssets : [];
    const missingTargets = Array.isArray(navigation?.missingTargets) ? navigation.missingTargets : [];
    const status = !manifest || !navigation || missingAssets.length || missingLocalAssets.length || missingTargets.length ? 'degraded' : 'ok';

    return res.json({
      success: true,
      service: 'Hollow Nexus League page integrity',
      status,
      checkedAt: new Date().toISOString(),
      pageCount: pages.length,
      manifest,
      navigation,
      requiredAssets,
      summary: {
        normalizedPages: Number(manifest?.scannedPages || 0),
        scannedLinks: Number(navigation?.scannedLinks || 0),
        changedLinks: Number(navigation?.changedLinks || 0),
        missingAssets: missingAssets.map((item) => item.path),
        missingLocalAssets,
        missingTargets
      }
    });
  });

  app.get('/api/health/routes', async (_req, res) => {
    const routes = EXPECTED_ROUTES.map(([method, routePath]) => ({
      method: method.toUpperCase(),
      path: routePath,
      registered: routeExists(app, method, routePath)
    }));

    const assets = [
      assetStatus('js/core/league-auth-ui.js'),
      assetStatus('js/core/league-page-integrity.js'),
      assetStatus('js/core/league-polish.js'),
      assetStatus('css/league-auth-ui.css'),
      assetStatus('css/league-critical.css'),
      assetStatus('css/league-polish.css'),
      assetStatus('assets/hollow-nexus-official.svg')
    ];

    let botStorage = { available: false, target: botTarget(), database: null, message: '' };
    try {
      const database = await storage.readDatabaseStatus();
      botStorage = { available: true, target: botTarget(), database, message: '' };
    } catch (error) {
      botStorage = { available: false, target: botTarget(), database: null, message: error.message };
    }

    const pageIntegrity = readIntegrityManifest();
    const navigationIntegrity = readNavigationManifest();
    const missingRoutes = routes.filter((item) => !item.registered);
    const missingAssets = assets.filter((item) => !item.exists);
    const missingTargets = Array.isArray(navigationIntegrity?.missingTargets) ? navigationIntegrity.missingTargets : [];
    const status = missingRoutes.length || missingAssets.length || missingTargets.length || !botStorage.available ? 'degraded' : 'ok';

    return res.json({
      success: true,
      service: 'Hollow Nexus League SITE',
      status,
      checkedAt: new Date().toISOString(),
      routes,
      assets,
      botStorage,
      pageIntegrity,
      navigationIntegrity,
      summary: {
        expectedRoutes: routes.length,
        registeredRoutes: routes.length - missingRoutes.length,
        missingRoutes: missingRoutes.map((item) => item.path),
        missingAssets: missingAssets.map((item) => item.path),
        missingTargets
      }
    });
  });

  console.log('[Routes] Auditoria de rotas, páginas, navegação, assets e storage registrada.');
}

module.exports = { registerRouteAuditRoutes, routeExists };
