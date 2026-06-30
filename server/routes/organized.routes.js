const storage = require('../storage');
const { callBot, fetchGuildBrand } = require('../services/botApi.service');
const { requireOwner } = require('../services/access.service');
const {
  normalizeBracketData,
  normalizeBracketForResponse,
  generateBracketSlots,
  generateGroups
} = require('../services/bracket.service');

async function syncResultHubs(bracket, settings) {
  return callBot('/internal/results/sync-hubs', {
    method: 'POST',
    body: JSON.stringify({ bracket, settings, source: 'site-organized-routes' })
  }).catch((error) => ({ success: false, message: error.message }));
}

function registerOrganizedRouteOverrides(app) {
  app.get('/api/brand/server', async (_req, res) => {
    const guild = await fetchGuildBrand();
    const serverName = guild?.name || 'Hollow Nexus';
    return res.json({
      success: true,
      server: {
        id: guild?.id || null,
        name: serverName,
        icon: guild?.icon || null,
        fallbackIcon: '/assets/hollow-nexus.png'
      },
      fetchedAt: new Date().toISOString()
    });
  });

  app.get('/api/bot', async (_req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const guild = await fetchGuildBrand();
    const serverName = guild?.name || 'Hollow Nexus';
    return res.json({
      success: true,
      online: true,
      name: serverName,
      displayName: serverName,
      serverName,
      guildName: serverName,
      applicationName: null,
      username: 'Void Arena',
      tag: serverName,
      id: guild?.id || null,
      guildId: guild?.id || null,
      guilds: guild ? 1 : 0,
      avatar: guild?.icon || '/assets/hollow-nexus.png',
      guildIcon: guild?.icon || null,
      fetchedAt: new Date().toISOString()
    });
  });

  app.put('/api/tournament/settings', requireOwner, async (req, res) => {
    try {
      const allowedFormats = new Set(['MD1', 'MD2', 'MD3', 'MD5']);
      const allowedStructures = new Set(['single_elimination', 'groups', 'groups_playoffs']);
      const payload = {
        tournamentName: String(req.body.tournamentName || 'Rematch Championship').trim().slice(0, 60),
        matchFormat: allowedFormats.has(String(req.body.matchFormat)) ? String(req.body.matchFormat) : 'MD1',
        structure: allowedStructures.has(String(req.body.structure)) ? String(req.body.structure) : 'single_elimination',
        teamLimit: [4, 8, 16, 32].includes(Number(req.body.teamLimit)) ? Number(req.body.teamLimit) : 16,
        groupCount: [2, 4, 8].includes(Number(req.body.groupCount)) ? Number(req.body.groupCount) : 4,
        autoCreateMatchChannels: req.body.autoCreateMatchChannels !== false,
        discordMatchCategoryId: String(req.body.discordMatchCategoryId || '').trim()
      };
      const settings = await storage.writeTournamentSettings(payload);
      return res.json({ success: true, settings });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

  app.post('/api/bracket/generate', requireOwner, async (_req, res) => {
    try {
      const [teams, settings] = await Promise.all([storage.readTeams(), storage.readTournamentSettings()]);
      if (!teams.length) return res.status(400).json({ success: false, message: 'Cadastre pelo menos um time antes de gerar.' });
      const selectedTeams = teams.slice(0, settings.teamLimit || 16);
      const groups = generateGroups(selectedTeams, settings);
      const slots = generateBracketSlots(selectedTeams, settings.teamLimit || 16);
      const bracket = await storage.writeBracket({
        slots,
        quarters: [],
        semis: [],
        finals: [],
        matchProgress: {},
        generatedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      const resultHubs = await syncResultHubs(bracket, settings);
      return res.json({ success: true, bracket: normalizeBracketForResponse(bracket, teams), groups, resultHubs, settings });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

  app.put('/api/bracket', requireOwner, async (req, res) => {
    try {
      const [teams, existing, settings] = await Promise.all([storage.readTeams(), storage.readBracket(), storage.readTournamentSettings()]);
      const normalized = normalizeBracketData(req.body || {});
      const bracket = await storage.writeBracket({
        ...normalized,
        generatedAt: existing.generatedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      const resultHubs = await syncResultHubs(bracket, settings);
      return res.json({ success: true, bracket: normalizeBracketForResponse(bracket, teams), resultHubs });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

  app.get('/api/owner/role-permissions', requireOwner, async (_req, res) => {
    try {
      const [permissionsData, mentions] = await Promise.all([
        callBot('/internal/storage/readRolePermissions', { method: 'POST', body: JSON.stringify({ args: [] }) }).then((data) => data.result || {}),
        callBot('/internal/discord/mentions', { method: 'GET' }).catch(() => ({ roles: [] }))
      ]);
      return res.json({ success: true, permissions: permissionsData || {}, roles: Array.isArray(mentions.roles) ? mentions.roles : [] });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

  app.put('/api/owner/role-permissions', requireOwner, async (req, res) => {
    try {
      const permissions = req.body?.permissions && typeof req.body.permissions === 'object' ? req.body.permissions : {};
      const saved = await callBot('/internal/storage/writeRolePermissions', {
        method: 'POST',
        body: JSON.stringify({ args: [permissions] })
      });
      return res.json({ success: true, permissions: saved.result || permissions });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

  app.get('/api/bot/internal-health', requireOwner, async (_req, res) => {
    try {
      const data = await callBot('/internal/health', { method: 'GET' });
      return res.json(data);
    } catch (error) {
      return res.status(503).json({ success: false, message: error.message });
    }
  });

  app.get('/api/backups/github/latest', requireOwner, async (_req, res) => {
    try {
      const data = await callBot('/internal/backup/github/latest', { method: 'GET' });
      return res.json(data);
    } catch (error) {
      return res.status(503).json({ success: false, message: error.message });
    }
  });

  app.post('/api/backups/github/export', requireOwner, async (req, res) => {
    try {
      const data = await callBot('/internal/backup/github/export', {
        method: 'POST',
        body: JSON.stringify({ reason: req.body?.reason || 'site-manual' })
      });
      return res.json(data);
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  app.post('/api/backups/github/restore-latest', requireOwner, async (_req, res) => {
    try {
      const data = await callBot('/internal/backup/github/restore-latest', { method: 'POST', body: '{}' });
      return res.json(data);
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });

}

module.exports = { registerOrganizedRouteOverrides };
