const fs = require('node:fs');
const path = require('node:path');
const { removeRoutes } = require('../utils/expressRoutes');

const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');

function sendScript(res, relativePath, marker) {
  const file = path.join(PUBLIC_DIR, relativePath);
  fs.readFile(file, (error, data) => {
    if (error) {
      return res.status(404).type('text/plain; charset=utf-8').send('Script do perfil não encontrado.');
    }
    res.status(200);
    res.set('Content-Type', 'application/javascript; charset=utf-8');
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-HNL-Profile-Asset', marker);
    res.set('Content-Length', String(data.length));
    return res.end(data);
  });
}

function registerProfileAssetsStableRoutes(app) {
  removeRoutes(app, [
    ['get', '/js/core/social-icons.js'],
    ['get', '/js/core/league-experience.js']
  ]);

  app.get('/js/core/social-icons.js', (_req, res) => {
    sendScript(res, 'js/core/social-icons.js', 'social-icons-v1');
  });

  app.get('/js/core/league-experience.js', (_req, res) => {
    sendScript(res, 'js/core/league-experience.js', 'league-experience-v1');
  });

  console.log('[Profile/Assets] Social icons e League Experience servidos com MIME JavaScript dedicado.');
}

module.exports = { registerProfileAssetsStableRoutes };