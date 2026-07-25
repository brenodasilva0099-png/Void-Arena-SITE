const fs = require('node:fs');
const path = require('node:path');
const { removeRoutes } = require('../utils/expressRoutes');

const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');

function sendFile(res, relativePath, contentType, marker) {
  const file = path.join(PUBLIC_DIR, relativePath);
  fs.readFile(file, (error, data) => {
    if (error) {
      return res.status(404).type('text/plain; charset=utf-8').send('Asset do chat não encontrado.');
    }
    res.status(200);
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-HNL-Chat-Asset', marker);
    res.set('Content-Length', String(data.length));
    return res.end(data);
  });
}

function registerChatBridgeAssetRoutes(app) {
  removeRoutes(app, [
    ['get', '/pages/chat.html'],
    ['get', '/css/bridge-card.css'],
    ['get', '/js/pages/chat-bridge-stable.js']
  ]);

  app.get('/pages/chat.html', (_req, res) => {
    sendFile(res, 'pages/chat.html', 'text/html; charset=utf-8', 'chat-page-v1');
  });

  app.get('/css/bridge-card.css', (_req, res) => {
    sendFile(res, 'css/bridge-card.css', 'text/css; charset=utf-8', 'chat-css-v1');
  });

  app.get('/js/pages/chat-bridge-stable.js', (_req, res) => {
    sendFile(res, 'js/pages/chat-bridge-stable.js', 'application/javascript; charset=utf-8', 'chat-js-v1');
  });

  console.log('[Chat/Assets] Página, CSS e JavaScript da ponte servidos por rotas MIME dedicadas.');
}

module.exports = { registerChatBridgeAssetRoutes };
