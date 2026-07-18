const fs = require('node:fs');
const path = require('node:path');
const storage = require('../storage');

const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');
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
  ['get', '/api/notifications']
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

function registerRouteAuditRoutes(app) {
  app.get('/api/health/routes', async (_req, res) => {
    const routes = EXPECTED_ROUTES.map(([method, routePath]) => ({
      method: method.toUpperCase(),
      path: routePath,
      registered: routeExists(app, method, routePath)
    }));

    const assets = [
      assetStatus('js/core/league-auth-ui.js'),
      assetStatus('css/league-auth-ui.css'),
      assetStatus('assets/hollow-nexus-official.svg')
    ];

    let botStorage = { available: false, target: botTarget(), database: null, message: '' };
    try {
      const database = await storage.readDatabaseStatus();
      botStorage = { available: true, target: botTarget(), database, message: '' };
    } catch (error) {
      botStorage = { available: false, target: botTarget(), database: null, message: error.message };
    }

    const missingRoutes = routes.filter((item) => !item.registered);
    const missingAssets = assets.filter((item) => !item.exists);
    const status = missingRoutes.length || missingAssets.length || !botStorage.available ? 'degraded' : 'ok';

    return res.json({
      success: true,
      service: 'Hollow Nexus League SITE',
      status,
      checkedAt: new Date().toISOString(),
      routes,
      assets,
      botStorage,
      summary: {
        expectedRoutes: routes.length,
        registeredRoutes: routes.length - missingRoutes.length,
        missingRoutes: missingRoutes.map((item) => item.path),
        missingAssets: missingAssets.map((item) => item.path)
      }
    });
  });

  console.log('[Routes] Auditoria de rotas, assets e storage registrada em /api/health/routes.');
}

module.exports = { registerRouteAuditRoutes, routeExists };
