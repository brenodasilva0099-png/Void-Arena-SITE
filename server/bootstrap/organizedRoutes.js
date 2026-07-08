const { removeRoutes } = require('../utils/expressRoutes');
const { registerOrganizedRouteOverrides } = require('../routes/organized.routes');
const { registerDiscordBrandRoutes } = require('../routes/discordBrand.routes');
const storage = require('../storage');
const { callBot } = require('../services/botApi.service');
const { requireOwner } = require('../services/access.service');

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

function userPayload(user = {}) {
  return { id: user.id, name: user.name, discordId: user.discordId || '', avatar: user.avatar || null, profile: user.profile || {} };
}

function teamPayload(team = {}) {
  return { id: team.id, name: team.name, tag: team.tag || '', ownerUserId: team.ownerUserId || '', players: Array.isArray(team.players) ? team.players : [], reserves: Array.isArray(team.reserves) ? team.reserves : [], playerAccounts: team.playerAccounts || {} };
}

async function sendHubsToBot(bracket = {}, settings = {}) {
  const teams = await storage.readTeams().catch(() => []);
  const users = await storage.readUsers().catch(() => []);
  return callBot('/internal/results/sync-hubs', {
    method: 'POST',
    body: JSON.stringify({
      bracket,
      settings,
      teams: teams.map(teamPayload),
      users: users.map(userPayload),
      source: 'site-hubs-full-payload'
    })
  }).catch((error) => ({ success: false, message: error.message, created: 0, reused: 0, totalMatches: 0, errors: [{ message: error.message }] }));
}

function registerHubSyncFix(app) {
  removeRoutes(app, [['post', '/api/result-hubs/sync']]);
  app.post('/api/result-hubs/sync', requireOwner, async (_req, res) => {
    try {
      const bracket = await storage.readBracket();
      const settings = await storage.readTournamentSettings().catch(() => ({}));
      const resultHubs = await sendHubsToBot(bracket, settings);
      return res.json({ success: resultHubs.success !== false, resultHubs });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
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
  registerDiscordBrandRoutes(app);
  registerHubSyncFix(app);
  const removedCount = report.filter((item) => item.removed).length;
  console.log('Void Arena 5.1.2: ' + removedCount + ' rotas antigas substituidas pela estrutura nova.');
}

module.exports = { registerOrganizedRoutes };
