const storage = require('../storage');
const { callBot } = require('../services/botApi.service');

function requireSession(req, res, next) {
  if (!req.session?.userId) return res.status(401).json({ success: false, message: 'Faça login para continuar.' });
  return next();
}

function clean(value = '', max = 500) { return String(value || '').trim().slice(0, max); }
function normalizeIdentity(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}
function extractDiscordId(value = '') {
  const raw = String(value || '').trim();
  const mention = raw.match(/^<@!?(\d{16,22})>$/);
  if (mention) return mention[1];
  return /^\d{16,22}$/.test(raw) ? raw : '';
}
function addIdentity(target, value) {
  if (value == null) return;
  if (Array.isArray(value)) {
    value.forEach((item) => addIdentity(target, item));
    return;
  }
  if (typeof value === 'object') {
    ['id', 'userId', 'discordId', 'account', 'discord', 'name', 'username', 'displayName', 'captainName', 'ownerName'].forEach((key) => addIdentity(target, value[key]));
    return;
  }
  const normalized = normalizeIdentity(value);
  if (normalized) target.add(normalized);
  const discordId = extractDiscordId(value);
  if (discordId) target.add(normalizeIdentity(discordId));
}
function identitySet(...values) {
  const identities = new Set();
  values.forEach((value) => addIdentity(identities, value));
  return identities;
}
function intersects(left = new Set(), right = new Set()) {
  for (const value of left) if (right.has(value)) return true;
  return false;
}
function normalizeSocials(raw = {}) {
  return {
    site: clean(raw.site, 180), discord: clean(raw.discord, 180), instagram: clean(raw.instagram, 180), twitch: clean(raw.twitch, 180),
    tiktok: clean(raw.tiktok, 180), youtube: clean(raw.youtube, 180), twitter: clean(raw.twitter, 180), steam: clean(raw.steam, 180),
    xbox: clean(raw.xbox, 180), spotify: clean(raw.spotify, 240), riot: clean(raw.riot, 160), ea: clean(raw.ea, 160), psn: clean(raw.psn, 160)
  };
}
function normalizeProfile(raw = {}) {
  return {
    username: clean(raw.username, 60), realName: clean(raw.realName, 80), country: clean(raw.country, 80), region: clean(raw.region, 80),
    timezone: clean(raw.timezone, 80), primaryPosition: clean(raw.primaryPosition, 60), secondaryPosition: clean(raw.secondaryPosition, 60),
    competitiveRegion: clean(raw.competitiveRegion || raw.region, 80), banner: clean(raw.banner, 1200), discordBanner: clean(raw.discordBanner, 1200),
    bannerSource: clean(raw.bannerSource, 40), bio: clean(raw.bio, 220), steamId: clean(raw.steamId, 80), xboxGamertag: clean(raw.xboxGamertag, 80)
  };
}
function publicRole(role = {}) {
  return {
    id: role.id || '',
    name: clean(role.name || '', 80),
    guildId: role.guildId || '',
    guildName: role.guildName || ''
  };
}
function filterPublicRoles(roles = []) {
  const blocked = new Set(['everyone', '@everyone']);
  return (Array.isArray(roles) ? roles : [])
    .map(publicRole)
    .filter((role) => role.id && role.name && !blocked.has(String(role.name).toLowerCase()))
    .slice(0, 12);
}
async function readDiscordRoles(discordId = '') {
  const safeId = String(discordId || '').trim();
  if (!safeId) return [];
  try {
    const data = await callBot(`/internal/discord/member-roles/${encodeURIComponent(safeId)}`, { method: 'GET' });
    return filterPublicRoles(data.roles || []);
  } catch {
    return [];
  }
}
function publicUser(user = {}, roles = []) { return { id: user.id || '', name: user.name || '', discordId: user.discordId || '', provider: user.provider || '', avatar: user.avatar || '', profile: normalizeProfile(user.profile || {}), socials: normalizeSocials(user.socials || {}), roles: filterPublicRoles(roles), createdAt: user.createdAt || null, updatedAt: user.updatedAt || null, canDeleteAccount: !user.discordId && String(user.provider || '').toLowerCase() !== 'discord' }; }
function userIdentities(user = {}) {
  return identitySet(user.id, user.discordId, user.name, user.profile?.username, user.socials?.discord);
}
function playerMatchesUser(player = {}, user = {}) {
  const userIds = userIdentities(user);
  const playerIds = typeof player === 'object'
    ? identitySet(player.id, player.userId, player.discordId, player.account, player.discord, player.name, player.username, player.displayName)
    : identitySet(player);
  return intersects(userIds, playerIds);
}
function teamOwnerMatchesUser(team = {}, user = {}) {
  const ownerIds = identitySet(
    team.ownerUserId,
    team.ownerId,
    team.captainUserId,
    team.captainId,
    team.captainDiscordId,
    team.ownerDiscordId,
    team.captainName,
    team.ownerName,
    team.captain,
    team.owner
  );
  return intersects(userIdentities(user), ownerIds);
}
function teamRosterEntries(team = {}) {
  const entries = [
    ...(Array.isArray(team.playerDetails) ? team.playerDetails : []),
    ...(Array.isArray(team.reserveDetails) ? team.reserveDetails : []),
    ...(Array.isArray(team.roster) ? team.roster : []),
    ...(Array.isArray(team.members) ? team.members : [])
  ];
  const players = Array.isArray(team.players) ? team.players : [];
  const reserves = Array.isArray(team.reserves) ? team.reserves : [];
  const playerAccounts = Array.isArray(team.playerAccounts?.players) ? team.playerAccounts.players : [];
  const reserveAccounts = Array.isArray(team.playerAccounts?.reserves) ? team.playerAccounts.reserves : [];
  const appendLegacy = (names, accounts, rosterRole) => {
    const length = Math.max(names.length, accounts.length);
    for (let index = 0; index < length; index += 1) {
      const raw = names[index];
      const base = raw && typeof raw === 'object' ? raw : { name: raw || '' };
      entries.push({ ...base, account: base.account || accounts[index] || '', discordId: base.discordId || extractDiscordId(accounts[index] || ''), rosterRole });
    }
  };
  appendLegacy(players, playerAccounts, 'Titular');
  appendLegacy(reserves, reserveAccounts, 'Reserva');
  return entries;
}
function findCurrentTeam(teams = [], user = {}) {
  const safeTeams = Array.isArray(teams) ? teams : [];
  return safeTeams.find((team) => teamOwnerMatchesUser(team, user)) || safeTeams.find((team) => teamRosterEntries(team).some((player) => playerMatchesUser(player, user))) || null;
}
function buildStats(user = {}, team = null) {
  const base = user.playerStats || user.stats || {};
  const played = Number(base.played || base.matches || 0) || 0;
  const wins = Number(base.wins || 0) || 0;
  const losses = Number(base.losses || 0) || 0;
  const goals = Number(base.goals || 0) || 0;
  const assists = Number(base.assists || 0) || 0;
  const passes = Number(base.passes || 0) || 0;
  const interceptions = Number(base.interceptions || 0) || 0;
  const defenses = Number(base.defenses || 0) || 0;
  const mvp = Number(base.mvp || 0) || 0;
  const points = Number(base.points || base.vap || 0) || 0;
  return { played, wins, losses, winRate: played ? Math.round((wins / played) * 100) : 0, goals, assists, passes, interceptions, defenses, points, mvp, teamId: team?.id || '', teamName: team?.name || '' };
}

function registerProfileV2Routes(app) {
  app.get('/api/me/profile-v2', requireSession, async (req, res) => {
    const [user, teams] = await Promise.all([storage.findUserById(req.session.userId), storage.readTeams().catch(() => [])]);
    if (!user || user.deletedAt) return res.status(401).json({ success: false, message: 'Sessão inválida.' });
    const [team, roles] = await Promise.all([Promise.resolve(findCurrentTeam(teams, user)), readDiscordRoles(user.discordId)]);
    return res.json({ success: true, user: publicUser(user, roles), roles, currentTeam: team || null, stats: buildStats(user, team) });
  });

  app.put('/api/me/profile-v2', requireSession, async (req, res) => {
    const user = await storage.findUserById(req.session.userId);
    if (!user || user.deletedAt) return res.status(401).json({ success: false, message: 'Sessão inválida.' });
    const profilePayload = req.body?.profile && typeof req.body.profile === 'object' ? req.body.profile : {};
    const socialsPayload = req.body?.socials && typeof req.body.socials === 'object' ? req.body.socials : {};
    const saved = await storage.saveUser({
      ...user,
      profile: normalizeProfile({ ...(user.profile || {}), ...profilePayload }),
      socials: normalizeSocials({ ...(user.socials || {}), ...socialsPayload }),
      updatedAt: new Date().toISOString()
    });
    const teams = await storage.readTeams().catch(() => []);
    const [team, roles] = await Promise.all([Promise.resolve(findCurrentTeam(teams, saved)), readDiscordRoles(saved.discordId)]);
    return res.json({ success: true, user: publicUser(saved, roles), roles, currentTeam: team || null, stats: buildStats(saved, team) });
  });

  app.delete('/api/me/profile-v2', requireSession, async (req, res) => {
    const user = await storage.findUserById(req.session.userId);
    if (!user || user.deletedAt) return res.status(401).json({ success: false, message: 'Sessão inválida.' });
    if (user.discordId || String(user.provider || '').toLowerCase() === 'discord') {
      return res.status(400).json({ success: false, message: 'Contas criadas/logadas pelo Discord não são apagadas por aqui. Use Sair da conta para desconectar a sessão.' });
    }
    await storage.saveUser({
      ...user,
      email: '',
      passwordHash: '',
      name: 'Conta excluída',
      avatar: '',
      profile: { username: 'Conta excluída' },
      socials: {},
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    await new Promise((resolve) => req.session.destroy(() => resolve()));
    return res.json({ success: true, message: 'Conta excluída.' });
  });
}

module.exports = { registerProfileV2Routes, findCurrentTeam, playerMatchesUser };