const storage = require('../storage');
const { getSessionUser, isOwnerRecord } = require('../services/access.service');
const { callBot } = require('../services/botApi.service');
const { removeRoutes } = require('../utils/expressRoutes');
const { normalizeBracketForResponse } = require('../services/bracket.service');

const RESULT_CHANNEL = 'results-main';
const RANKING_CHANNELS = ['frm-ranking-settings', 'league-ranking-settings'];
const CAFE_CHANNELS = ['cafe-com-leite-queue', 'league-cafe-com-leite-queue'];
const TRANSFER_CHANNEL = 'league-transfer-requests';
const FALLBACK_LOGO = '/assets/hollow-nexus-official.svg';

function text(value = '', max = 500) {
  return String(value || '').trim().slice(0, max);
}

function number(value = 0) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeKey(value = '') {
  return String(value || '').trim().toLocaleLowerCase('pt-BR');
}

function safeImage(value = '') {
  if (value && typeof value === 'object') return safeImage(value.url || value.src || value.href || value.data || value.base64 || '');
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,/i.test(raw)) return raw.slice(0, 9000000);
  if (/^https?:\/\//i.test(raw)) return raw.slice(0, 4000);
  if (/^\/(assets|uploads|images|img|public)\//i.test(raw)) return raw.slice(0, 1800);
  const found = raw.match(/https?:\/\/[^\s"'<>]+/i);
  return found ? found[0].slice(0, 4000) : '';
}

function teamLogo(team = {}) {
  const values = [team.logo, team.logoUrl, team.logoURL, team.teamLogo, team.teamLogoUrl, team.badge, team.badgeUrl, team.escudo, team.image, team.imageUrl, team.avatar, team.icon, team.logoOriginal];
  for (const value of values) {
    const resolved = safeImage(value);
    if (resolved) return resolved;
  }
  return FALLBACK_LOGO;
}

function displayName(user = {}) {
  return user?.profile?.username || user?.profile?.displayName || user?.name || user?.username || user?.discordId || 'Jogador';
}

function statsOf(user = {}) {
  const stats = user.playerStats || user.stats || {};
  return {
    points: number(stats.points ?? stats.vap ?? stats.cafePoints),
    matches: number(stats.matches ?? stats.played ?? stats.cafeMatches),
    wins: number(stats.wins ?? stats.cafeWins),
    losses: number(stats.losses),
    goals: number(stats.goals ?? stats.cafeGoals),
    assists: number(stats.assists ?? stats.cafeAssists),
    passes: number(stats.passes ?? stats.cafePasses),
    interceptions: number(stats.interceptions),
    defenses: number(stats.defenses),
    mvp: number(stats.mvp ?? stats.cafeMvp)
  };
}

function publicUser(user = {}) {
  return {
    id: user.id || '',
    userId: user.id || '',
    discordId: user.discordId || '',
    name: displayName(user),
    avatar: safeImage(user.avatar) || '',
    provider: user.provider || '',
    profile: user.profile || {},
    socials: user.socials || {},
    roles: Array.isArray(user.roles) ? user.roles : [],
    stats: statsOf(user),
    createdAt: user.createdAt || null,
    updatedAt: user.updatedAt || null
  };
}

function userIdentityValues(user = {}) {
  return [user.id, user.discordId, user.name, user.profile?.username, user.profile?.displayName]
    .map(normalizeKey)
    .filter(Boolean);
}

function teamIdentityValues(team = {}) {
  return [team.id, team.name, team.tag].map(normalizeKey).filter(Boolean);
}

function canManageTeam(user = null, team = {}) {
  if (!user) return false;
  if (isOwnerRecord(user)) return true;
  const userId = String(user.id || '').trim();
  const discordId = String(user.discordId || '').trim();
  const storedUserIds = [team.ownerUserId, team.directorUserId, team.captainUserId].map((value) => String(value || '').trim()).filter(Boolean);
  const storedDiscordIds = [team.ownerDiscordId, team.directorDiscordId, team.captainDiscordId].map((value) => String(value || '').trim()).filter(Boolean);
  if (userId && storedUserIds.includes(userId)) return true;
  if (discordId && storedDiscordIds.includes(discordId)) return true;
  if (storedUserIds.length || storedDiscordIds.length) return false;
  const names = new Set([user.name, user.discordTag, user.profile?.username, user.profile?.displayName].map(normalizeKey).filter(Boolean));
  return [team.ownerName, team.directorName, team.captainName].map(normalizeKey).filter(Boolean).some((name) => names.has(name));
}

function currentTeamForUser(user = {}, teams = []) {
  const identities = new Set(userIdentityValues(user));
  return teams.find((team) => [team.ownerUserId, team.directorUserId, team.captainUserId, team.ownerDiscordId, team.directorDiscordId, team.captainDiscordId]
    .map(normalizeKey).some((value) => value && identities.has(value))) || teams.find((team) => {
      const entries = [
        ...(Array.isArray(team.playerDetails) ? team.playerDetails : []),
        ...(Array.isArray(team.reserveDetails) ? team.reserveDetails : []),
        ...(Array.isArray(team.players) ? team.players : []),
        ...(Array.isArray(team.reserves) ? team.reserves : []),
        ...(Array.isArray(team.playerAccounts?.players) ? team.playerAccounts.players : []),
        ...(Array.isArray(team.playerAccounts?.reserves) ? team.playerAccounts.reserves : [])
      ];
      return entries.some((entry) => {
        const values = typeof entry === 'string' ? [entry] : [entry.id, entry.userId, entry.discordId, entry.name];
        return values.map(normalizeKey).some((value) => value && identities.has(value));
      });
    }) || null;
}

function rosterEntries(team = {}, users = []) {
  const byId = new Map(users.map((user) => [String(user.id || ''), user]).filter(([id]) => id));
  const byDiscord = new Map(users.map((user) => [String(user.discordId || ''), user]).filter(([id]) => id));
  const details = [
    ...(Array.isArray(team.playerDetails) ? team.playerDetails.map((item) => ({ ...item, rosterRole: 'Titular' })) : []),
    ...(Array.isArray(team.reserveDetails) ? team.reserveDetails.map((item) => ({ ...item, rosterRole: 'Reserva' })) : [])
  ];
  if (!details.length) {
    (Array.isArray(team.players) ? team.players : []).forEach((name, index) => details.push({ name, discordId: team.playerAccounts?.players?.[index] || '', rosterRole: 'Titular' }));
    (Array.isArray(team.reserves) ? team.reserves : []).forEach((name, index) => details.push({ name, discordId: team.playerAccounts?.reserves?.[index] || '', rosterRole: 'Reserva' }));
  }
  return details.map((entry, index) => {
    const user = byId.get(String(entry.userId || entry.id || '')) || byDiscord.get(String(entry.discordId || entry.account || '')) || null;
    const resolved = user ? publicUser(user) : {
      id: entry.id || entry.userId || entry.discordId || `${team.id || 'team'}_${index}`,
      userId: entry.userId || entry.id || '',
      discordId: entry.discordId || '',
      name: entry.name || `Jogador ${index + 1}`,
      avatar: safeImage(entry.avatar) || '',
      profile: entry.profile || {},
      socials: entry.socials || {},
      roles: [],
      stats: {}
    };
    return {
      ...resolved,
      rosterRole: entry.rosterRole || entry.type || 'Titular',
      isCaptain: Boolean(entry.isCaptain)
        || (team.captainUserId && String(team.captainUserId) === String(resolved.id || ''))
        || (team.captainDiscordId && String(team.captainDiscordId) === String(resolved.discordId || ''))
    };
  });
}

function publicTeam(team = {}, users = [], viewer = null) {
  const roster = rosterEntries(team, users);
  return {
    ...team,
    id: team.id || '',
    name: team.name || team.teamName || 'Clube',
    tag: team.tag || '',
    logo: teamLogo(team),
    logoOriginal: team.logo || '',
    description: team.description || '',
    region: team.region || '',
    ownerUserId: team.ownerUserId || '',
    ownerName: team.ownerName || '',
    ownerDiscordId: team.ownerDiscordId || '',
    directorUserId: team.directorUserId || team.ownerUserId || '',
    directorName: team.directorName || team.ownerName || '',
    directorDiscordId: team.directorDiscordId || team.ownerDiscordId || '',
    captainUserId: team.captainUserId || '',
    captainName: team.captainName || team.ownerName || '',
    captainDiscordId: team.captainDiscordId || '',
    socials: team.socials || {},
    roster,
    playerDetails: roster.filter((player) => player.rosterRole !== 'Reserva'),
    reserveDetails: roster.filter((player) => player.rosterRole === 'Reserva'),
    rosterCount: roster.length,
    canManage: canManageTeam(viewer, team)
  };
}

async function safeRead(label, task, fallback) {
  try {
    return { value: await task(), error: '' };
  } catch (error) {
    return { value: fallback, error: `${label}: ${error.message}` };
  }
}

async function snapshot(req = null) {
  const [teamsResult, usersResult, eventsResult, bracketResult, settingsResult, viewerResult] = await Promise.all([
    safeRead('clubes', () => storage.readTeams(), []),
    safeRead('jogadores', () => storage.readUsers(), []),
    safeRead('competições', () => storage.readEvents(), []),
    safeRead('chaveamento', () => storage.readBracket(), {}),
    safeRead('configurações', () => storage.readTournamentSettings(), {}),
    req ? safeRead('sessão', () => getSessionUser(req), null) : Promise.resolve({ value: null, error: '' })
  ]);
  const errors = [teamsResult.error, usersResult.error, eventsResult.error, bracketResult.error, settingsResult.error, viewerResult.error].filter(Boolean);
  return {
    teams: teamsResult.value,
    users: usersResult.value,
    events: eventsResult.value,
    bracket: bracketResult.value,
    settings: settingsResult.value,
    viewer: viewerResult.value,
    degraded: errors.length > 0,
    errors
  };
}

function parseJson(message = {}) {
  try { return { id: message.id || '', createdAt: message.createdAt || null, updatedAt: message.updatedAt || null, ...JSON.parse(message.content || '{}') }; }
  catch { return null; }
}

function parseResult(message = {}) {
  try {
    const raw = String(message.content || '');
    if (!raw.startsWith('RESULT_JSON:')) return null;
    return { id: message.id || '', ...JSON.parse(raw.slice('RESULT_JSON:'.length)) };
  } catch {
    return null;
  }
}

async function readRankingSettings() {
  const groups = await Promise.all(RANKING_CHANNELS.map((channelId) => storage.readChatMessages({ channelId, limit: 500 }).catch(() => [])));
  const map = new Map();
  groups.flat().map(parseJson).filter(Boolean).forEach((item) => {
    if (item.targetType && item.targetId) map.set(`${item.targetType}:${item.targetId}`, item);
  });
  return map;
}

function settingFor(map, type, item = {}) {
  const keys = [item.id, item.discordId, item.name, item.tag].map((value) => String(value || '')).filter(Boolean);
  for (const key of keys) {
    const setting = map.get(`${type}:${key}`);
    if (setting) return setting;
  }
  return {};
}

async function buildCafeRanking() {
  const [usersResult, messages, discordData] = await Promise.all([
    safeRead('jogadores', () => storage.readUsers(), []),
    Promise.all(CAFE_CHANNELS.map((channelId) => storage.readChatMessages({ channelId, limit: 1000 }).catch(() => []))),
    callBot('/internal/discord/members/all?limit=1000', { method: 'GET' }).catch(() => ({ members: [] }))
  ]);
  const users = usersResult.value.filter((user) => !user.deletedAt && !user.hiddenFromPlayersDirectory);
  const byDiscord = new Map(users.map((user) => [String(user.discordId || ''), user]).filter(([id]) => id));
  const participation = new Map();
  messages.flat().map(parseJson).filter(Boolean).filter((item) => item.status !== 'deleted').forEach((entry) => {
    [entry.userId, entry.discordId, entry.name].map(normalizeKey).filter(Boolean).forEach((key) => participation.set(key, (participation.get(key) || 0) + 1));
  });
  const records = new Map();
  const put = (record = {}) => {
    const key = String(record.discordId || record.id || record.name || '').trim();
    if (!key) return;
    records.set(key, { ...(records.get(key) || {}), ...record });
  };
  (Array.isArray(discordData.members) ? discordData.members : []).forEach((member) => {
    const discordId = String(member.id || member.discordId || '').trim();
    const linked = byDiscord.get(discordId) || null;
    put({
      id: linked?.id || discordId,
      discordId,
      name: linked ? displayName(linked) : (member.name || member.username || 'Membro'),
      avatar: safeImage(linked?.avatar || member.avatar) || '',
      profile: linked?.profile || {},
      roles: Array.isArray(member.roles) ? member.roles : [],
      user: linked,
      registered: Boolean(linked)
    });
  });
  users.forEach((user) => put({ id: user.id || user.discordId || '', discordId: user.discordId || '', name: displayName(user), avatar: safeImage(user.avatar) || '', profile: user.profile || {}, roles: user.roles || [], user, registered: true }));
  const ranking = Array.from(records.values()).map((record) => {
    const base = statsOf(record.user || {});
    const keys = record.user ? userIdentityValues(record.user) : [record.id, record.discordId, record.name].map(normalizeKey).filter(Boolean);
    const participations = keys.reduce((best, key) => Math.max(best, participation.get(key) || 0), 0);
    return {
      id: record.id || '',
      discordId: record.discordId || '',
      name: record.name || 'Membro',
      avatar: record.avatar || '',
      profile: record.profile || {},
      roles: record.roles || [],
      registered: Boolean(record.registered),
      participations,
      points: number(base.points) + participations,
      matches: number(base.matches) + participations,
      wins: number(base.wins),
      goals: number(base.goals),
      assists: number(base.assists),
      passes: number(base.passes),
      mvp: number(base.mvp),
      profileUrl: record.registered ? `/pages/perfil-jogador.html?id=${encodeURIComponent(record.id || record.discordId || '')}` : ''
    };
  }).sort((a, b) => b.points - a.points || b.goals - a.goals || b.passes - a.passes || String(a.name).localeCompare(String(b.name), 'pt-BR'));
  return { ranking, source: discordData.members?.length ? 'discord-members-and-site' : 'site-users-fallback', degraded: Boolean(usersResult.error), errors: usersResult.error ? [usersResult.error] : [] };
}

function registerLeagueStableRoutes(app) {
  removeRoutes(app, [
    ['get', '/api/league/overview'],
    ['get', '/api/league/clubs'],
    ['get', '/api/league/clubs/:teamId'],
    ['get', '/api/league/players'],
    ['get', '/api/league/players/:playerId'],
    ['get', '/api/league/competitions'],
    ['get', '/api/league/rankings'],
    ['get', '/api/league/bracket'],
    ['get', '/api/league/groups'],
    ['get', '/api/league/cafe-ranking'],
    ['get', '/api/league/transfers'],
    ['post', '/api/league/transfers'],
    ['get', '/api/teams'],
    ['get', '/api/players'],
    ['get', '/api/match-results']
  ]);

  app.get('/api/league/overview', async (req, res) => {
    const data = await snapshot(req);
    const clubs = data.teams.map((team) => publicTeam(team, data.users, data.viewer));
    const players = data.users.filter((user) => !user.deletedAt && !user.hiddenFromPlayersDirectory).map((user) => {
      const team = currentTeamForUser(user, data.teams);
      return { ...publicUser(user), team: team ? { id: team.id || '', name: team.name || '', tag: team.tag || '', logo: teamLogo(team) } : null };
    });
    const resultMessages = await storage.readChatMessages({ channelId: RESULT_CHANNEL, limit: 500 }).catch(() => []);
    const results = resultMessages.map(parseResult).filter(Boolean);
    return res.json({ success: true, degraded: data.degraded, errors: data.errors, teams: clubs, clubs, players, users: players, events: data.events, bracket: normalizeBracketForResponse(data.bracket || {}, data.teams, data.users), settings: data.settings, stats: { clubes: clubs.length, jogadores: players.length, atletas: players.length, competicoes: data.events.length, partidas: results.length } });
  });

  app.get('/api/league/clubs', async (req, res) => {
    const data = await snapshot(req);
    return res.json({ success: true, degraded: data.degraded, errors: data.errors, clubs: data.teams.map((team) => publicTeam(team, data.users, data.viewer)) });
  });

  app.get('/api/teams', async (req, res) => {
    const data = await snapshot(req);
    return res.json({ success: true, degraded: data.degraded, errors: data.errors, teams: data.teams.map((team) => publicTeam(team, data.users, data.viewer)), bracket: normalizeBracketForResponse(data.bracket || {}, data.teams, data.users) });
  });

  app.get('/api/league/clubs/:teamId', async (req, res) => {
    const data = await snapshot(req);
    const id = decodeURIComponent(String(req.params.teamId || '')).trim().toLocaleLowerCase('pt-BR');
    const team = data.teams.find((item) => teamIdentityValues(item).includes(id));
    if (!team) return res.status(404).json({ success: false, message: 'Clube não encontrado.' });
    return res.json({ success: true, degraded: data.degraded, errors: data.errors, club: publicTeam(team, data.users, data.viewer) });
  });

  const playersHandler = async (req, res) => {
    const data = await snapshot(req);
    const players = data.users.filter((user) => !user.deletedAt && !user.hiddenFromPlayersDirectory).map((user) => {
      const team = currentTeamForUser(user, data.teams);
      return {
        ...publicUser(user),
        team: team ? { id: team.id || '', name: team.name || '', tag: team.tag || '', logo: teamLogo(team) } : null,
        profileUrl: `/pages/perfil-jogador.html?id=${encodeURIComponent(user.id || user.discordId || '')}`,
        canManageCurrentTeam: Boolean(team && canManageTeam(data.viewer, team))
      };
    }).sort((a, b) => String(a.name).localeCompare(String(b.name), 'pt-BR'));
    return res.json({ success: true, degraded: data.degraded, errors: data.errors, players });
  };
  app.get('/api/league/players', playersHandler);
  app.get('/api/players', playersHandler);

  app.get('/api/league/players/:playerId', async (req, res) => {
    const data = await snapshot(req);
    const id = decodeURIComponent(String(req.params.playerId || '')).trim().toLocaleLowerCase('pt-BR');
    const user = data.users.find((item) => [item.id, item.discordId, item.name, item.profile?.username, item.profile?.displayName].some((value) => normalizeKey(value) === id));
    if (!user || user.deletedAt || user.hiddenFromPlayersDirectory) return res.status(404).json({ success: false, message: 'Jogador não encontrado.' });
    const team = currentTeamForUser(user, data.teams);
    const roleData = user.discordId ? await callBot(`/internal/discord/member-roles/${encodeURIComponent(user.discordId)}`, { method: 'GET' }).catch(() => ({ roles: [] })) : { roles: [] };
    return res.json({ success: true, degraded: data.degraded, errors: data.errors, player: { ...publicUser(user), roles: Array.isArray(roleData.roles) ? roleData.roles : [], team: team ? publicTeam(team, data.users, null) : null } });
  });

  app.get('/api/league/competitions', async (_req, res) => {
    const eventsResult = await safeRead('competições', () => storage.readEvents(), []);
    const competitions = eventsResult.value.filter((event) => !['deleted', 'hidden', 'archived'].includes(String(event.status || '').toLowerCase()));
    return res.json({ success: true, degraded: Boolean(eventsResult.error), errors: eventsResult.error ? [eventsResult.error] : [], competitions, events: competitions });
  });

  app.get('/api/league/rankings', async (req, res) => {
    const [data, settings, cafe] = await Promise.all([snapshot(req), readRankingSettings(), buildCafeRanking()]);
    const clubs = data.teams.map((team) => {
      const setting = settingFor(settings, 'club', team);
      return { ...publicTeam(team, data.users, data.viewer), points: number(setting.points ?? team.points), wins: number(setting.wins ?? team.wins), losses: number(setting.losses ?? team.losses), goals: number(setting.goals ?? team.goals) };
    }).sort((a, b) => b.points - a.points || b.wins - a.wins || b.goals - a.goals || String(a.name).localeCompare(String(b.name), 'pt-BR'));
    const players = cafe.ranking.map((player) => {
      const setting = settingFor(settings, 'player', player);
      return { ...player, points: number(setting.points ?? player.points), wins: number(setting.wins ?? player.wins), losses: number(setting.losses ?? player.losses), goals: number(setting.goals ?? player.goals) };
    }).sort((a, b) => b.points - a.points || b.wins - a.wins || b.goals - a.goals || String(a.name).localeCompare(String(b.name), 'pt-BR'));
    return res.json({ success: true, degraded: data.degraded || cafe.degraded, errors: [...data.errors, ...cafe.errors], clubs, players });
  });

  app.get('/api/league/cafe-ranking', async (_req, res) => {
    const data = await buildCafeRanking();
    return res.json({ success: true, ...data, memberCount: data.ranking.length, metrics: ['points', 'goals', 'passes', 'assists', 'wins', 'matches', 'mvp'] });
  });

  const bracketHandler = async (req, res) => {
    const data = await snapshot(req);
    const bracket = normalizeBracketForResponse(data.bracket || {}, data.teams, data.users);
    return res.json({ success: true, degraded: data.degraded, errors: data.errors, teams: data.teams.map((team) => publicTeam(team, data.users, data.viewer)), events: data.events, settings: data.settings, bracket, groups: bracket.groups || [], groupStandings: bracket.groupStandings || {} });
  };
  app.get('/api/league/bracket', bracketHandler);
  app.get('/api/league/groups', bracketHandler);

  app.get('/api/match-results', async (_req, res) => {
    const messages = await storage.readChatMessages({ channelId: RESULT_CHANNEL, limit: 500 }).catch(() => []);
    const results = messages.map(parseResult).filter(Boolean).sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
    return res.json({ success: true, results });
  });

  app.get('/api/league/transfers', async (req, res) => {
    const [messages, viewer] = await Promise.all([storage.readChatMessages({ channelId: TRANSFER_CHANNEL, limit: 500 }).catch(() => []), getSessionUser(req).catch(() => null)]);
    return res.json({ success: true, authenticated: Boolean(viewer), transfers: messages.map(parseJson).filter(Boolean).reverse() });
  });

  app.post('/api/league/transfers', async (req, res) => {
    const viewer = await getSessionUser(req).catch(() => null);
    if (!viewer) return res.status(401).json({ success: false, message: 'Entre com Discord para solicitar transferência.' });
    const data = await snapshot(req);
    const fromTeam = data.teams.find((team) => String(team.id || '') === String(req.body?.fromTeamId || '')) || null;
    const toTeam = data.teams.find((team) => String(team.id || '') === String(req.body?.toTeamId || '')) || null;
    const player = data.users.find((user) => [user.id, user.discordId].some((value) => String(value || '') === String(req.body?.playerId || ''))) || null;
    if (!toTeam || !canManageTeam(viewer, toTeam)) return res.status(403).json({ success: false, message: 'Você só pode solicitar transferência para um clube que administra.' });
    if (!player) return res.status(400).json({ success: false, message: 'Selecione um jogador válido.' });
    const createdAt = new Date().toISOString();
    const payload = { type: 'league_transfer_request', status: 'pending', player: { id: player.id || '', discordId: player.discordId || '', name: displayName(player) }, fromTeam: fromTeam ? { id: fromTeam.id || '', name: fromTeam.name || '' } : null, toTeam: { id: toTeam.id || '', name: toTeam.name || '' }, note: text(req.body?.note, 800), requestedBy: { id: viewer.id || '', discordId: viewer.discordId || '', name: displayName(viewer) }, createdAt };
    const saved = await storage.saveChatMessage({ channelId: TRANSFER_CHANNEL, source: 'system', authorId: viewer.id || '', authorName: displayName(viewer), authorAvatar: viewer.avatar || '', content: JSON.stringify(payload), attachments: [], createdAt });
    return res.status(201).json({ success: true, transfer: { id: saved.id || '', ...payload } });
  });

  console.log('[League/Stable] Rotas públicas, rankings, chaveamento, grupos e compatibilidade registradas.');
}

module.exports = { registerLeagueStableRoutes };
