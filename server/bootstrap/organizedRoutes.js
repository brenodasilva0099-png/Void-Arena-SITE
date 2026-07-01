const { removeRoutes } = require('../utils/expressRoutes');
const { registerOrganizedRouteOverrides } = require('../routes/organized.routes');

function registerOrganizedRoutes(app) {
  const legacyFallback = String.fromCharCode(42);
  const report = removeRoutes(app, [
    ['get', legacyFallback],
    ['get', '/api/bot'],
    ['get', '/api/dashboard/snapshot'],
    ['get', '/api/teams'],
    ['get', '/api/match-results'],
    ['put', '/api/tournament/settings'],
    ['post', '/api/bracket/generate'],
    ['put', '/api/bracket'],
    ['get', '/api/owner/role-permissions'],
    ['put', '/api/owner/role-permissions'],
    ['post', '/internal/results/submit'],
    ['post', '/internal/results/state']
  ]);

  registerOrganizedRouteOverrides(app);
  const removedCount = report.filter((item) => item.removed).length;
  console.log('Void Arena 5.1.2: ' + removedCount + ' rotas antigas substituidas pela estrutura nova.');
}

module.exports = { registerOrganizedRoutes };
