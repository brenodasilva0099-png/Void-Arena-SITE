const storage = require('../storage');
const { callBot, fetchGuildBrand } = require('../services/botApi.service');
const { requireOwner, getSessionUser, isOwnerRecord } = require('../services/access.service');
const {
  normalizeTeamLimit,
  normalizeBracketData,
  normalizeBracketForResponse,
  generateBracketSlots,
  generateAdaptiveBracket,
  generateGroups,
  sanitizeTeam
} = require('../services/bracket.service');

const RESULT_CHANNEL = 'results-main';

function requireSession(req, res, next) {
  if (!req.session?.userId) return res.status(401).json({ success: false, message: 'Faça login para continuar.' });
  return next();
}

async function readUsersSafe() {
  return storage.readUsers().catch(() => []);
}

async function syncResultHubs(bracket, settings) {
  return callBot('/internal/results/sync-hubs', {
    method: 'POST',
    body: JSON.stringify({ bracket, settings, source: 'site-organized-routes' })
  }).catch((error) => ({ success: false, message: error.message, created: 0, reused: 0, errors: [{ message: error.message }] }));
}

function parseResultRecord(message = {}) {
  try {
    const raw = String(message.content || '');
    if (!raw.startsWith('RESULT_JSON:')) return null;
    const result = JSON.parse(raw.slice('RESULT_JSON:'.length));
    return { ...result, messageId: message.id, createdAt: result.createdAt || message.createdAt, updatedAt: message.updatedAt || message.createdAt };
  } catch {
    return null;
  }
}

async function readResultRecords() {
  const messages = await storage.readChatMessages({ channelId: RESULT_CHANNEL, limit: 500 });
  return messages.map(parseResultRecord).filter(Boolean);
}

function splitDiscordId(value = '') {
  const raw = String(value || '').trim();
  const mention = raw.match(/^<@!?(\d+)>$/);
  if (mention) return mention[1];
  if (/^\d{16,22}$/.test(raw)) return raw;
  return '';
}

function userDisplay(user = {}) {
  return user?.profile?.username || user?.name || user?.discordId || 'Jogador';
}

function publicUser(user = {}) {
  return {
    id: user.id,
    name: user.name,
    discordId: user.discordId || null,
    avatar: user.avatar || null,
    profile: user.profile || {},
    socials: user.socials || {},
    provider: user.provider || 'login',
    createdAt: user.createdAt || null,
    updatedAt: user.updatedAt || null
  };
}

function enrichTeam(team = {}, users = []) {
  const usersById = new Map(users.map((user) => [String(user.id || ''), user]));
  const usersByDiscord = new Map(users.map((user) => [String(user.discordId || ''), user]).filter(([id]) => id));
  const owner = usersById.get(String(team.ownerUserId || '')) || null;
  const safe = sanitizeTeam(team, usersById);
  const mapPlayer = (name, account, type, index) => {
    const discordId = splitDiscordId(account || name);
    const user = discordId ? usersByDiscord.get(discordId) : usersById.get(String(account || ''));
    return {
      id: user?.id || '',
      name: String(name || userDisplay(user) || `Jogador ${index + 1}`).trim(),
      account: String(account || '').trim(),
      discordId: user?.discordId || discordId || '',
      avatar: user?.avatar || '',
      profile: user?.profile || {},
      type,
      isCaptain: Boolean(owner && user && String(owner.id) === String(user.id)) || (!owner && index === 0 && type === 'player')
    };
  };
  const accounts = team.playerAccounts || {};
  const players = (Array.isArray(team.players) ? team.players : []).map((item, index) => mapPlayer(item, accounts.players?.[index] || '', 'player', index));
  const reserves = (Array.isArray(team.reserves) ? team.reserves : []).map((item, index) => mapPlayer(item, accounts.reserves?.[index] || '', 'reserve', index));
  return {
    ...safe,
    ownerName: owner ? userDisplay(owner) : (safe.ownerName || safe.captainName || players.find((p) => p.isCaptain)?.name || 'não definido'),
    ownerAvatar: owner?.avatar || safe.ownerAvatar || '',
    captainName: owner ? userDisplay(owner) : (safe.captainName || players.find((p) => p.isCaptain)?.name || 'não definido'),
    captainDiscordId: owner?.discordId || players.find((p) => p.isCaptain)?.discordId || '',
    playerDetails: players,
    reserveDetails: reserves
  };
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

  app.get('/api/dashboard/snapshot', requireSession, async (_req, res) => {
    const [teams, bracket, events, users, settings, results] = await Promise.all([
      storage.readTeams(),
      storage.readBracket(),
      storage.readEvents(),
      storage.readUsers(),
      storage.readTournamentSettings().catch(() => ({})),
      readResultRecords().catch(() => [])
    ]);
    return res.json({
      success: true,
      generatedAt: new Date().toISOString(),
      teams: teams.map((team) => enrichTeam(team, users)),
      bracket: normalizeBracketForResponse(bracket, teams, users),
      events,
      users: users.map(publicUser),
      settings,
      results: results.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
    });
  });

  app.get('/api/teams', requireSession, async (_req, res) => {
    const [teams, users, bracket] = await Promise.all([storage.readTeams(), storage.readUsers(), storage.readBracket()]);
    const enriched = teams.map((team) => enrichTeam(team, users));
    return res.json({ success: true, teams: enriched, bracket: normalizeBracketForResponse(bracket, teams, users) });
  });

  app.get('/api/teams/:teamId/public', requireSession, async (req, res) => {
    const [teams, users] = await Promise.all([storage.readTeams(), storage.readUsers()]);
    const team = teams.find((item) => String(item.id) === String(req.params.teamId));
    if (!team) return res.status(404).json({ success: false, message: 'Time não encontrado.' });
    return res.json({ success: true, team: enrichTeam(team, users) });
  });

  app.get('/api/users/:userId/public', requireSession, async (req, res) => {
    const users = await storage.readUsers();
    const user = users.find((item) => String(item.id) === String(req.params.userId) || String(item.discordId || '') === String(req.params.userId));
    if (!user) return res.status(404).json({ success: false, message: 'Jogador não encontrado.' });
    return res.json({ success: true, user: publicUser(user) });
  });

  app.get('/api/match-results', requireSession, async (_req, res) => {
    const results = await readResultRecords();
    return res.json({
      success: true,
      results: results.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
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
        teamLimit: normalizeTeamLimit(req.body.teamLimit || 16),
        groupCount: [2, 4, 5, 6, 7, 8].includes(Number(req.body.groupCount)) ? Number(req.body.groupCount) : 4,
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
      const [teams, users, settings] = await Promise.all([storage.readTeams(), storage.readUsers(), storage.readTournamentSettings()]);
      if (!teams.length) return res.status(400).json({ success: false, message: 'Cadastre pelo menos um time antes de gerar.' });
      const limit = normalizeTeamLimit(settings.teamLimit || 16);
      const selectedTeams = teams.slice(0, limit);
      const groups = generateGroups(selectedTeams, settings);
      const generated = generateAdaptiveBracket(selectedTeams, limit);
      const bracket = await storage.writeBracket({
        slotSize: generated.slotSize,
        teamLimit: limit,
        slots: generated.slots,
        round16: generated.round16,
        quarters: [],
        semis: [],
        finals: [],
        matchProgress: {},
        generatedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      const resultHubs = await syncResultHubs(bracket, settings);
      return res.json({ success: true, bracket: normalizeBracketForResponse(bracket, teams, users), groups, resultHubs, settings: { ...settings, teamLimit: limit } });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

  app.put('/api/bracket', requireOwner, async (req, res) => {
    try {
      const [teams, users, existing, settings] = await Promise.all([storage.readTeams(), storage.readUsers(), storage.readBracket(), storage.readTournamentSettings()]);
      const normalized = normalizeBracketData(req.body || {});
      const bracket = await storage.writeBracket({
        ...normalized,
        generatedAt: existing.generatedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      const resultHubs = await syncResultHubs(bracket, settings);
      return res.json({ success: true, bracket: normalizeBracketForResponse(bracket, teams, users), resultHubs });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

  app.post('/api/result-hubs/sync', requireOwner, async (_req, res) => {
    try {
      const [bracket, settings] = await Promise.all([
        storage.readBracket(),
        storage.readTournamentSettings().catch(() => ({}))
      ]);
      const resultHubs = await syncResultHubs(bracket, settings);
      return res.json({ success: resultHubs.success !== false, resultHubs });
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
