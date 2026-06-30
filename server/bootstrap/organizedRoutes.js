const { removeRoutes } = require('../utils/expressRoutes');
const { registerOrganizedRouteOverrides } = require('../routes/organized.routes');

function registerOrganizedRoutes(app) {
  // O app legado ainda registra rotas antigas dentro de server/app.js.
  // Nesta etapa 5.0, removemos só as rotas críticas e registramos versões organizadas.
  removeRoutes(app, [
    ['get', '/api/bot'],
    ['put', '/api/tournament/settings'],
    ['post', '/api/bracket/generate'],
    ['put', '/api/bracket'],
    ['get', '/api/owner/role-permissions'],
    ['put', '/api/owner/role-permissions']
  ]);

  registerOrganizedRouteOverrides(app);
  console.log('✅ Void Arena 5.0: rotas organizadas aplicadas.');
}

module.exports = { registerOrganizedRoutes };
