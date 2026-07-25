const { removeRoutes } = require('../utils/expressRoutes');

const BUILD = 'hnl-hub-result-site-bridge-disabled-v1';

function registerHubResultBridgeDisabledRoutes(app) {
  removeRoutes(app, [
    ['post', '/internal/results/submit'],
    ['post', '/internal/results/state']
  ]);

  const disabled = (_req, res) => res.status(410).json({
    success: false,
    code: 'HUB_RESULT_SITE_BRIDGE_DISABLED',
    build: BUILD,
    message: 'A integração de resultados da HUB com o site foi removida.'
  });

  app.post('/internal/results/submit', disabled);
  app.post('/internal/results/state', disabled);

  console.log(`[Resultados/HUB] Ponte interna para o SITE removida (${BUILD}).`);
}

module.exports = { registerHubResultBridgeDisabledRoutes, BUILD };