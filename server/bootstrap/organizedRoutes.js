const { removeRoutes } = require('../utils/expressRoutes');
const { registerOrganizedRouteOverrides } = require('../routes/organized.routes');

function registerOrganizedRoutes(app) {
  removeRoutes(app, [
    ['get', '/api/bot'],
    ['get', '/api/dashboard/snapshot'],
    ['get', '/api/teams'],
    ['get', '/api/match-results'],
    ['put', '/api/tournament/settings'],
    ['post', '/api/bracket/generate'],
    ['put', '/api/bracket'],
    ['get', '/api/owner/role-permissions'],
    ['put', '/api/owner/role-permissions']
  ]);

  registerOrganizedRouteOverrides(app);
  console.log('✅ Void Arena 5.1: estrutura nova assumiu as rotas principais.');
}

module.exports = { registerOrganizedRoutes };
