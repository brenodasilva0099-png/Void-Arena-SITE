const storage = require('../storage');
const { callBot } = require('../services/botApi.service');
const { getSessionUser, isAdminRecord, isOwnerRecord } = require('../services/access.service');
const { removeRoutes } = require('../utils/expressRoutes');

const CALENDAR_CHANNEL = 'league-calendar-settings';
const CAFE_CHANNELS = ['league-cafe-com-leite-queue', 'cafe-com-leite-queue'];
const TRANSFER_CHANNEL = 'league-transfer-requests';

function clean(value = '', max = 500) {
  return String(value || '').trim().slice(0, max);
}

function number(value = 0) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function nameOf(user = {}) {
  return user?.profile?.username || user?.profile?.displayName || user?.name || user?.username || user?.discordId || 'Jogador';
}

function publicUser(user = {}) {
  const stats = user.playerStats || user.stats || {};
  return {
    id: user.id || '',
    userId: user.id || '',
    discordId: user.discordId || '',
    name: nameOf(user),
    avatar: user.avatar || '',
    provider: user.provider || '',
    profile: user.profile || {},
    socials: user.socials || {},
    roles: Array.isArray(user.roles) ? user.roles : [],
    stats: {
      matches: number(stats.matches ?? stats.played),
      wins: number(stats.wins),
      losses: number(stats.losses),
      goals: number(stats.goals),
      assists: number(stats.assists),
      passes: number(stats.passes),
      interceptions: number(stats.interceptions),
      defenses: number(stats.defenses),
      mvp: number(stats.mvp),
      points: number(stats.points ?? stats.vap ?? stats.cafePoints)
    },
    createdAt: user.createdAt || null,
    updatedAt: user.updatedAt || null
  };
}

function teamLogo(team = {}) {
  return clean(team.logo || team.logoUrl || team.logoURL || team.teamLogo || team.badge || team.escudo || team.image || team.avatar || '', 4000);
}

function canManageTeam(user = null, team = {}) {
  if (!user) return false;
  if (isOwnerRecord(user)) return true;
  const userId = String(user.id || '');
  const discordId = String(user.discordId || '');
  return [team.ownerUserId, team.directorUserId, team.captainUserId].some((value) => value && String(value) === userId)
    || [team.ownerDiscordId, team.directorDiscordId, team.captainDiscordId].some((value) => value && String(value) === discordId);
}

function teamIdentityValues(team = {}) {
  return [team.id, team.name, team.tag].map((value) => String(value || '').trim().toLowerCase()).filter(Boolean);
}

function userIdentityValues(user = {}) {
  return [user.id, user.discordId, user.name, user.profile?.username].map((value) => String(value || '').trim().toLowerCase()).filter(Boolean);
}

function rosterEntries(team = {}, users = []) {
  const byId = new Map(users.map((user) => [String(user.id || ''), user]).filter(([id]) => id));
  const byDiscord = new Map(users.map((user) => [String(user.discordId || ''), user]).filter(([id]) => id));
  const details = [
    ...(Array.isArray(team.playerDetails) ? team.playerDetails.map((item) => ({ ...item, rosterRole: 'Titular' })) : []),
    ...(Array.isArray(team.reserveDetails) ? team.reserveDetails.map((item) => ({ ...item, rosterRole: 'Reserva' })) : [])
  ];
  if (!details.length) {
    (Array.isArray(team.players) ? team.players : []).forEach((playerName, index) => details.push({ name: playerName, discordId: team.playerAccounts?.players?.[index] || '', rosterRole: 'Titular' }));
    (Array.isArray(team.reserves) ? team.reserves : []).forEach((playerName, index) => details.push({ name: playerName, discordId: team.playerAccounts?.reserves?.[index] || '', rosterRole: 'Reserva' }));
  }
  return details.map((entry, index) => {
    const user = byId.get(String(entry.userId || entry.id || '')) || byDiscord.get(String(entry.discordId || entry.account || '')) || null;
    const resolved = user ? publicUser(user) : {
      id: entry.id || entry.userId || entry.discordId || `${team.id || 'team'}_${index}`,
      userId: entry.userId || entry.id || '',
      discordId: entry.discordId || '',
      name: entry.name || `Jogador ${index + 1}`,
      avatar: entry.avatar || '',
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
    id: team.id || '',
    name: team.name || team.teamName || 'Clube',
    tag: team.tag || '',
    logo: teamLogo(team),
    description: team.description || '',
    region: team.region || '',
    status: team.status || 'participating',
    ownerUserId: team.ownerUserId || '',
    ownerName: team.ownerName || '',
    ownerDiscordId: team.ownerDiscordId || '',
    directorUserId: team.directorUserId || '',
    directorName: team.directorName || team.ownerName || '',
    directorDiscordId: team.directorDiscordId || '',
    captainUserId: team.captainUserId || '',
    captainName: team.captainName || team.ownerName || '',
    captainDiscordId: team.captainDiscordId || '',
    socials: team.socials || {},
    roster,
    playerDetails: roster.filter((player) => player.rosterRole !== 'Reserva'),
    reserveDetails: roster.filter((player) => player.rosterRole === 'Reserva'),
    rosterCount: roster.length,
    canManage: canManageTeam(viewer, team),
    createdAt: team.createdAt || null,
    updatedAt: team.updatedAt || null
  };
}

function currentTeamForUser(user = {}, teams = []) {
  const identities = new Set(userIdentityValues(user));
  return teams.find((team) => [team.ownerUserId, team.directorUserId, team.captainUserId, team.ownerDiscordId, team.directorDiscordId, team.captainDiscordId]
    .map((value) => String(value || '').trim().toLowerCase()).some((value) => identities.has(value)))
    || teams.find((team) => {
      const raw = [
        ...(Array.isArray(team.playerDetails) ? team.playerDetails : []),
        ...(Array.isArray(team.reserveDetails) ? team.reserveDetails : []),
        ...(Array.isArray(team.players) ? team.players : []),
        ...(Array.isArray(team.reserves) ? team.reserves : []),
        ...(Array.isArray(team.playerAccounts?.players) ? team.playerAccounts.players : []),
        ...(Array.isArray(team.playerAccounts?.reserves) ? team.playerAccounts.reserves : [])
      ];
      return raw.some((entry) => {
        const values = typeof entry === 'string' ? [entry] : [entry.id, entry.userId, entry.discordId, entry.name];
        return values.map((value) => String(value || '').trim().toLowerCase()).some((value) => identities.has(value));
      });
    }) || null;
}

async function rolesFor(discordId = '') {
  const id = clean(discordId, 40);
  if (!id) return [];
  try {
    const data = await callBot(`/internal/discord/member-roles/${encodeURIComponent(id)}`, { method: 'GET' });
    return (Array.isArray(data.roles) ? data.roles : []).map((role) => ({ id: role.id || '', name: role.name || '', guildId: role.guildId || '', guildName: role.guildName || '' })).filter((role) => role.id && role.name).slice(0, 20);
  } catch {
    return [];
  }
}

function parseJsonMessage(message = {}) {
  try { return { id: message.id || '', createdAt: message.createdAt || null, updatedAt: message.updatedAt || null, ...JSON.parse(message.content || '{}') }; }
  catch { return null; }
}

async function readCalendarSettings() {
  const messages = await storage.readChatMessages({ channelId: CALENDAR_CHANNEL, limit: 40 }).catch(() => []);
  const latest = messages.map(parseJsonMessage).filter(Boolean).reverse().find((item) => item.type === 'league_calendar_settings');
  return {
    month: '2026-07',
    nexusCupAt: latest?.nexusCupAt || '2026-07-25T19:30:00-03:00',
    cafeComLeiteAt: latest?.cafeComLeiteAt || '2026-07-26T00:00:00-03:00',
    note: latest?.note || '',
    updatedAt: latest?.updatedAt || latest?.createdAt || null,
    updatedBy: latest?.updatedBy || ''
  };
}

async function saveCalendarSettings(payload = {}, viewer = {}) {
  const createdAt = new Date().toISOString();
  const content = {
    type: 'league_calendar_settings',
    nexusCupAt: clean(payload.nexusCupAt, 48) || '2026-07-25T19:30:00-03:00',
    cafeComLeiteAt: clean(payload.cafeComLeiteAt, 48) || '2026-07-26T00:00:00-03:00',
    note: clean(payload.note, 500),
    updatedAt: createdAt,
    updatedBy: nameOf(viewer)
  };
  await storage.saveChatMessage({ channelId: CALENDAR_CHANNEL, source: 'system', authorId: viewer.id || '', authorName: nameOf(viewer), authorAvatar: viewer.avatar || '', content: JSON.stringify(content), attachments: [], createdAt });
  return content;
}

function cafeStats(user = {}, participations = 0) {
  const base = user.playerStats || user.stats || {};
  return {
    points: number(base.cafePoints ?? base.points ?? base.vap) + participations,
    matches: number(base.cafeMatches ?? base.matches ?? base.played) + participations,
    wins: number(base.cafeWins ?? base.wins),
    goals: number(base.cafeGoals ?? base.goals),
    assists: number(base.cafeAssists ?? base.assists),
    passes: number(base.cafePasses ?? base.passes),
    mvp: number(base.cafeMvp ?? base.mvp)
  };
}

function registerLeagueExperienceRoutes(app) {
  removeRoutes(app, [
    ['get', '/api/league/viewer'],
    ['get', '/api/league/players'],
    ['get', '/api/league/players/:playerId'],
    ['get', '/api/league/clubs/:teamId'],
    ['get', '/api/league/cafe-ranking'],
    ['get', '/api/league/calendar'],
    ['put', '/api/league/calendar'],
    ['get', '/api/league/competitions/:eventId'],
    ['put', '/api/league/competitions/:eventId'],
    ['get', '/api/league/transfers']
  ]);

  app.get('/api/league/viewer', async (req, res) => {
    const viewer = await getSessionUser(req).catch(() => null);
    if (!viewer) return res.json({ success: true, authenticated: false, viewer: null, viewerTeams: [], isAdmin: false });
    const teams = await storage.readTeams().catch(() => []);
    const users = await storage.readUsers().catch(() => []);
    const isAdmin = await isAdminRecord(viewer).catch(() => false);
    return res.json({ success: true, authenticated: true, viewer: publicUser(viewer), viewerTeams: teams.filter((team) => canManageTeam(viewer, team)).map((team) => publicTeam(team, users, viewer)), isAdmin });
  });

  app.get('/api/league/players', async (req, res) => {
    const [users, teams, viewer] = await Promise.all([storage.readUsers().catch(() => []), storage.readTeams().catch(() => []), getSessionUser(req).catch(() => null)]);
    const players = users.filter((user) => !user.deletedAt && !user.hiddenFromPlayersDirectory).map((user) => {
      const team = currentTeamForUser(user, teams);
      return { ...publicUser(user), team: team ? { id: team.id || '', name: team.name || '', tag: team.tag || '', logo: teamLogo(team) } : null, profileUrl: `/pages/perfil-jogador.html?id=${encodeURIComponent(user.id || user.discordId || '')}`, canManageCurrentTeam: Boolean(team && canManageTeam(viewer, team)) };
    }).sort((a, b) => String(a.name).localeCompare(String(b.name), 'pt-BR'));
    return res.json({ success: true, players });
  });

  app.get('/api/league/players/:playerId', async (req, res) => {
    const [users, teams] = await Promise.all([storage.readUsers().catch(() => []), storage.readTeams().catch(() => [])]);
    const id = decodeURIComponent(String(req.params.playerId || '')).trim();
    const user = users.find((item) => [item.id, item.discordId, item.name, item.profile?.username].some((value) => String(value || '').trim().toLowerCase() === id.toLowerCase()));
    if (!user || user.deletedAt || user.hiddenFromPlayersDirectory) return res.status(404).json({ success: false, message: 'Jogador não encontrado.' });
    const team = currentTeamForUser(user, teams);
    const roles = await rolesFor(user.discordId);
    return res.json({ success: true, player: { ...publicUser(user), roles, team: team ? publicTeam(team, users, null) : null } });
  });

  app.get('/api/league/clubs/:teamId', async (req, res) => {
    const [teams, users, viewer] = await Promise.all([storage.readTeams().catch(() => []), storage.readUsers().catch(() => []), getSessionUser(req).catch(() => null)]);
    const id = decodeURIComponent(String(req.params.teamId || '')).trim().toLowerCase();
    const team = teams.find((item) => teamIdentityValues(item).includes(id));
    if (!team) return res.status(404).json({ success: false, message: 'Clube não encontrado.' });
    return res.json({ success: true, club: publicTeam(team, users, viewer) });
  });

  app.get('/api/league/cafe-ranking', async (_req, res) => {
    const users = await storage.readUsers().catch(() => []);
    const messageGroups = await Promise.all(CAFE_CHANNELS.map((channelId) => storage.readChatMessages({ channelId, limit: 500 }).catch(() => [])));
    const participation = new Map();
    messageGroups.flat().map(parseJsonMessage).filter(Boolean).filter((item) => item.status !== 'deleted').forEach((entry) => {
      const key = String(entry.userId || entry.discordId || entry.name || '').trim().toLowerCase();
      if (key) participation.set(key, (participation.get(key) || 0) + 1);
    });
    const ranking = users.filter((user) => !user.deletedAt && !user.hiddenFromPlayersDirectory).map((user) => {
      const keys = userIdentityValues(user);
      const participations = keys.reduce((max, key) => Math.max(max, participation.get(key) || 0), 0);
      return { ...publicUser(user), ...cafeStats(user, participations), participations, profileUrl: `/pages/perfil-jogador.html?id=${encodeURIComponent(user.id || user.discordId || '')}` };
    }).sort((a, b) => b.points - a.points || b.goals - a.goals || b.passes - a.passes || String(a.name).localeCompare(String(b.name), 'pt-BR'));
    return res.json({ success: true, ranking, metrics: ['points', 'goals', 'passes', 'assists', 'wins', 'matches', 'mvp'] });
  });

  app.get('/api/league/calendar', async (req, res) => {
    const [settings, events, viewer] = await Promise.all([readCalendarSettings(), storage.readEvents().catch(() => []), getSessionUser(req).catch(() => null)]);
    const nexus = events.find((event) => /nexus\s*cup/i.test(String(event.name || event.title || ''))) || null;
    const isAdmin = viewer ? await isAdminRecord(viewer).catch(() => false) : false;
    return res.json({ success: true, settings, isAdmin, events: [
      ...(nexus ? [{ id: nexus.id || '', type: 'competition', title: nexus.name || nexus.title || 'Nexus Cup 1ª Edição', startsAt: settings.nexusCupAt || nexus.startAt || '', href: `/pages/competicao.html?id=${encodeURIComponent(nexus.id || '')}` }] : [{ id: 'nexus-cup-1-edicao', type: 'competition', title: 'Nexus Cup 1ª Edição', startsAt: settings.nexusCupAt, href: '/pages/competicoes.html' }]),
      { id: 'cafe-com-leite', type: 'community', title: 'Café com Leite', startsAt: settings.cafeComLeiteAt, href: '/pages/cafe-com-leite.html' }
    ] });
  });

  app.put('/api/league/calendar', async (req, res) => {
    const viewer = await getSessionUser(req).catch(() => null);
    if (!viewer || !(await isAdminRecord(viewer).catch(() => false))) return res.status(403).json({ success: false, message: 'Apenas a administração pode editar o calendário.' });
    try {
      const settings = await saveCalendarSettings(req.body || {}, viewer);
      const events = await storage.readEvents().catch(() => []);
      const nexus = events.find((event) => /nexus\s*cup/i.test(String(event.name || event.title || '')));
      if (nexus && settings.nexusCupAt) await storage.saveTournamentEvent({ ...nexus, startAt: settings.nexusCupAt, updatedAt: new Date().toISOString() });
      return res.json({ success: true, settings });
    } catch (error) { return res.status(400).json({ success: false, message: error.message }); }
  });

  app.get('/api/league/competitions/:eventId', async (req, res) => {
    const events = await storage.readEvents().catch(() => []);
    const id = decodeURIComponent(String(req.params.eventId || '')).trim().toLowerCase();
    const event = events.find((item) => [item.id, item.name, item.title].some((value) => String(value || '').trim().toLowerCase() === id));
    if (!event) return res.status(404).json({ success: false, message: 'Competição não encontrada.' });
    return res.json({ success: true, competition: event });
  });

  app.put('/api/league/competitions/:eventId', async (req, res) => {
    const viewer = await getSessionUser(req).catch(() => null);
    if (!viewer || !(await isAdminRecord(viewer).catch(() => false))) return res.status(403).json({ success: false, message: 'Apenas a administração pode editar competições.' });
    try {
      const events = await storage.readEvents().catch(() => []);
      const event = events.find((item) => String(item.id || '') === String(req.params.eventId || ''));
      if (!event) return res.status(404).json({ success: false, message: 'Competição não encontrada.' });
      const next = {
        ...event,
        name: clean(req.body?.name || req.body?.title || event.name || event.title, 100),
        title: clean(req.body?.title || req.body?.name || event.title || event.name, 100),
        description: clean(req.body?.description ?? event.description, 1200),
        matchFormat: clean(req.body?.matchFormat || event.matchFormat, 20),
        mode: clean(req.body?.mode || event.mode, 80),
        structure: clean(req.body?.structure || event.structure, 80),
        teamLimit: Math.max(2, number(req.body?.teamLimit || event.teamLimit || 16)),
        startAt: clean(req.body?.startAt || event.startAt, 48),
        status: clean(req.body?.status || event.status, 32),
        updatedAt: new Date().toISOString()
      };
      const saved = await storage.saveTournamentEvent(next);
      return res.json({ success: true, competition: saved });
    } catch (error) { return res.status(400).json({ success: false, message: error.message }); }
  });

  app.get('/api/league/transfers', async (req, res) => {
    const [messages, viewer] = await Promise.all([storage.readChatMessages({ channelId: TRANSFER_CHANNEL, limit: 200 }).catch(() => []), getSessionUser(req).catch(() => null)]);
    const isAdmin = viewer ? await isAdminRecord(viewer).catch(() => false) : false;
    return res.json({ success: true, transfers: messages.map(parseJsonMessage).filter(Boolean).reverse(), isAdmin });
  });

  console.log('[League/Experience] Rotas de perfis públicos, clubes, Café com Leite, calendário e competições registradas.');
}

module.exports = { registerLeagueExperienceRoutes };
