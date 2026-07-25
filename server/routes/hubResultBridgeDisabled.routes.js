const { removeRoutes } = require('../utils/expressRoutes');

const BUILD = 'hnl-hub-result-site-bridge-disabled-v1';

function registerHubResultBridgeDisabledRoutes(app) {
  removeRoutes(app, [
    ['post', '/internal/results/submit'],
    ['post', '/internal/results/state'],
    ['get', '/api/match-results']
  ]);

  const disabled = (_req, res) => res.status(410).json({
    success: false,
    code: 'HUB_RESULT_SITE_BRIDGE_DISABLED',
    build: BUILD,
    message: 'A integração de resultados da HUB com o site foi removida.'
  });

  app.post('/internal/results/submit', disabled);
  app.post('/internal/results/state', disabled);
  app.get('/api/match-results', (_req, res) => res.json({
    success: true,
    bridgeDisabled: true,
    build: BUILD,
    results: [],
    records: [],
    message: ''
  }));

  console.log(`[Resultados/HUB] Ponte interna e exibição no SITE removidas (${BUILD}).`);
}

module.exports = { registerHubResultBridgeDisabledRoutes, BUILD };