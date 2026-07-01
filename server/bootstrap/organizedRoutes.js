const { removeRoutes } = require('../utils/expressRoutes');
const { registerOrganizedRouteOverrides } = require('../routes/organized.routes');
const storage = require('../storage');

function parseResultRecord(message = {}) {
  try {
    const raw = String(message.content || '');
    if (!raw.startsWith('RESULT_JSON:')) return null;
    const result = JSON.parse(raw.slice('RESULT_JSON:'.length));
    return {
      ...result,
      messageId: message.id,
      createdAt: result.createdAt || message.createdAt,
      updatedAt: message.updatedAt || message.createdAt
    };
  } catch {
    return null;
  }
}

function registerPublicResultRoutes(app) {
  app.get('/api/match-results', async (_req, res) => {
    const messages = await storage.readChatMessages({ channelId: 'results-main', limit: 500 }).catch(() => []);
    const results = messages
      .map(parseResultRecord)
      .filter(Boolean)
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
    return res.json({ success: true, results });
  });
}

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

  registerPublicResultRoutes(app);
  registerOrganizedRouteOverrides(app);
  const removedCount = report.filter((item) => item.removed).length;
  console.log('Void Arena 5.1.2: ' + removedCount + ' rotas antigas substituidas pela estrutura nova.');
}

module.exports = { registerOrganizedRoutes };
