const storage = require('./storage');

const BOT_API_URL = String(process.env.BOT_API_URL || 'http://localhost:3002').replace(/\/$/, '');
const BOT_API_KEY = process.env.BOT_API_KEY || process.env.INTERNAL_API_TOKEN || '';
const OWNER_DISCORD_ID = '1235713276277559326';
const OWNER_EMAILS = new Set([
  'abyss.projectdev@gmail.com',
  'brenodasilva0099@gmail.com',
  ...String(process.env.OWNER_EMAILS || '').split(','),
  ...String(process.env.ADMIN_EMAILS || '').split(',')
].map((item) => String(item || '').trim().toLowerCase()).filter(Boolean));
const OWNER_IDS = new Set([
  OWNER_DISCORD_ID,
  ...String(process.env.OWNER_DISCORD_IDS || '').split(','),
  ...String(process.env.ADMIN_DISCORD_IDS || '').split(',')
].map((item) => String(item || '').trim()).filter(Boolean));

function botHeaders(extra = {}) {
  return {
    'Content-Type': 'application/json',
    ...(BOT_API_KEY ? { 'x-bot-api-key': BOT_API_KEY, 'x-internal-token': BOT_API_KEY } : {}),
    ...extra
  };
}

async function callBot(pathname, options = {}) {
  const response = await fetch(`${BOT_API_URL}${pathname}`, {
    ...options,
    headers: botHeaders(options.headers || {})
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    throw new Error(data.message || `Falha na ponte com o bot (${response.status}).`);
  }
  return data;
}

async function isOwnerSession(req) {
  if (!req.session?.userId) return false;
  const user = await storage.findUserById(req.session.userId).catch(() => null);
  if (!user) return false;
  const email = String(user.email || '').trim().toLowerCase();
  const discordId = String(user.discordId || '').trim();
  const userId = String(user.id || '').trim();
  return OWNER_EMAILS.has(email) || OWNER_IDS.has(discordId) || OWNER_IDS.has(userId);
}

function requireOwnerFix(req, res, next) {
  isOwnerSession(req).then((ok) => {
    if (!ok) return res.status(403).json({ success: false, message: 'Apenas o administrador pode usar essa função.' });
    return next();
  }).catch((error) => res.status(500).json({ success: false, message: error.message }));
}

function removeRoute(app, method, path) {
  const stack = app?._router?.stack;
  if (!Array.isArray(stack)) return;
  const lower = String(method || '').toLowerCase();
  for (let index = stack.length - 1; index >= 0; index -= 1) {
    const layer = stack[index];
    const route = layer?.route;
    if (route?.path === path && route.methods?.[lower]) {
      stack.splice(index, 1);
    }
  }
}

function normalizeBracketData(data = {}) {
  const fill = (items, size) => {
    const arr = Array.isArray(items) ? items.slice(0, size) : [];
    while (arr.length < size) arr.push(null);
    return arr.map((item) => typeof item === 'string' ? item : (item?.id || null));
  };
  const fillProgress = (items, size) => {
    const arr = Array.isArray(items) ? items.slice(0, size) : [];
    while (arr.length < size) arr.push(1);
    return arr.map((value) => {
      const number = Number(value);
      return Number.isFinite(number) && number > 0 ? Math.floor(number) : 1;
    });
  };
  return {
    slots: fill(data.slots, 16),
    quarters: fill(data.quarters, 8),
    semis: fill(data.semis, 4),
    finals: fill(data.finals, 2),
    matchProgress: {
      slots: fillProgress(data.matchProgress?.slots, 16),
      quarters: fillProgress(data.matchProgress?.quarters, 8),
      semis: fillProgress(data.matchProgress?.semis, 4),
      finals: fillProgress(data.matchProgress?.finals, 2)
    },
    generatedAt: data.generatedAt || null,
    updatedAt: data.updatedAt || null
  };
}

function sanitizeTeam(team = {}) {
  return {
    id: team.id,
    name: team.name || 'Time',
    tag: team.tag || '',
    logo: team.logo || '',
    players: Array.isArray(team.players) ? team.players : [],
    reserves: Array.isArray(team.reserves) ? team.reserves : [],
    playerAccounts: team.playerAccounts || {},
    ownerUserId: team.ownerUserId || '',
    createdAt: team.createdAt || null,
    updatedAt: team.updatedAt || null
  };
}

function normalizeBracketForResponse(bracket = {}, teams = []) {
  const byId = new Map(teams.map((team) => [team.id, sanitizeTeam(team)]));
  const normalized = normalizeBracketData(bracket);
  const mapSlots = (items) => items.map((id) => id ? (byId.get(id) || { id, name: 'Time removido', tag: '---' }) : null);
  return {
    ...normalized,
    slots: mapSlots(normalized.slots),
    quarters: mapSlots(normalized.quarters),
    semis: mapSlots(normalized.semis),
    finals: mapSlots(normalized.finals)
  };
}

function shuffle(items = []) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateBracketSlots(teams = [], size = 16) {
  const picked = shuffle(teams).slice(0, size);
  const slots = Array(size).fill(null);
  picked.forEach((team, index) => { slots[index] = team?.id || null; });
  return slots;
}

function generateGroups(teams = [], settings = {}) {
  const count = Math.max(1, Number(settings.groupCount || 2) || 2);
  const groups = Array.from({ length: count }, (_, index) => ({ name: `Grupo ${String.fromCharCode(65 + index)}`, teams: [] }));
  teams.forEach((team, index) => groups[index % count].teams.push(sanitizeTeam(team)));
  return groups;
}

async function syncResultHubs(bracket, settings) {
  return callBot('/internal/results/sync-hubs', {
    method: 'POST',
    body: JSON.stringify({ bracket, settings, source: 'site-final-fix' })
  }).catch((error) => ({ success: false, message: error.message }));
}

async function guildBrand() {
  try {
    const response = await fetch(`${BOT_API_URL}/public/guild-brand?t=${Date.now()}`, { headers: { Accept: 'application/json' } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) return null;
    return data.guild || null;
  } catch {
    return null;
  }
}

function applyFinalFixes(app) {
  removeRoute(app, 'get', '/api/bot');
  removeRoute(app, 'put', '/api/tournament/settings');
  removeRoute(app, 'post', '/api/bracket/generate');
  removeRoute(app, 'put', '/api/bracket');
  removeRoute(app, 'get', '/api/owner/role-permissions');
  removeRoute(app, 'put', '/api/owner/role-permissions');

  app.get('/api/bot', async (_req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const guild = await guildBrand();
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
      avatar: guild?.icon || '/assets/abyss-profile.png',
      guildIcon: guild?.icon || null,
      fetchedAt: new Date().toISOString()
    });
  });

  app.put('/api/tournament/settings', requireOwnerFix, async (req, res) => {
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

  app.post('/api/bracket/generate', requireOwnerFix, async (_req, res) => {
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

  app.put('/api/bracket', requireOwnerFix, async (req, res) => {
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

  app.get('/api/owner/role-permissions', requireOwnerFix, async (_req, res) => {
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

  app.put('/api/owner/role-permissions', requireOwnerFix, async (req, res) => {
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

  console.log('✅ Void Arena finalFixes aplicado: admin, brand, permissões e chaveamento.');
}

module.exports = { applyFinalFixes };
