const crypto = require('node:crypto');
const storage = require('../storage');
const { getSessionUser, isAdminRecord } = require('../services/access.service');
const { canManageTeam } = require('../services/teamAccess.service');
const { createRecruitmentNotification } = require('./notifications.routes');
const { removeRoutes } = require('../utils/expressRoutes');

function requireLogin(req, res, next) {
  if (!req.session?.userId) return res.status(401).json({ success: false, message: 'Faca login para continuar.' });
  return next();
}

function clean(value = '', max = 160) { return String(value || '').trim().slice(0, max); }

function extractImageUrl(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^data:image\/[^;]+;base64,/i.test(raw)) return raw;
  const srcMatch = raw.match(/(?:src|href)=["']([^"']+)["']/i);
  if (srcMatch?.[1]) return srcMatch[1].trim();
  const markdownMatch = raw.match(/!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/i);
  if (markdownMatch?.[1]) return markdownMatch[1].trim();
  const urlMatch = raw.match(/https?:\/\/[^\s"'<>]+/i);
  if (urlMatch?.[0]) return urlMatch[0].trim();
  return raw;
}

function safeLogo(value = '') {
  const raw = extractImageUrl(value);
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw.slice(0, 1800);
  if (/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(raw)) return raw.slice(0, 2500000);
  if (/^\/(assets|uploads|images|img|public)\//i.test(raw)) return raw.slice(0, 1200);
  return '';
}

function firstLogoValue(...values) { for (const value of values) { const logo = safeLogo(value); if (logo) return logo; } return ''; }
function resolveTeamLogo(team = {}) { return firstLogoValue(team.logo, team.logoUrl, team.logoURL, team.teamLogo, team.teamLogoUrl, team.badge, team.badgeUrl, team.escudo, team.image, team.imageUrl, team.avatar, team.icon); }

function splitDiscordId(value = '') {
  const raw = String(value || '').trim();
  const mention = raw.match(/^<@!?(\d{16,22})>$/);
  if (mention) return mention[1];
  if (/^\d{16,22}$/.test(raw)) return raw;
  return '';
}

function userDisplay(user = {}) { return user?.profile?.username || user?.name || user?.discordId || 'Jogador'; }
function publicUser(user = {}) { return { id: user.id || '', name: user.name || '', discordId: user.discordId || '', avatar: user.avatar || '', profile: user.profile || {}, socials: user.socials || {}, provider: user.provider || 'login', createdAt: user.createdAt || null, updatedAt: user.updatedAt || null }; }

function normalizePlayers(value = []) {
  const source = Array.isArray(value) ? value : [];
  return source.map((item) => {
    if (typeof item === 'string') return { name: clean(item, 80), discordId: '', id: '', userId: '', inviteOnly: false };
    return {
      id: clean(item?.id || item?.userId || '', 80),
      userId: clean(item?.userId || item?.id || '', 80),
      name: clean(item?.name || item?.playerName || '', 80),
      discordId: clean(splitDiscordId(item?.discordId || item?.discord || item?.account || '') || item?.discordId || item?.discord || item?.account || '', 40),
      role: clean(item?.role || '', 40),
      inviteOnly: item?.inviteOnly === true || item?.pendingInvite === true
    };
  }).filter((item) => item.name).slice(0, 12);
}

function normalizeInvites(value = []) {
  return (Array.isArray(value) ? value : []).map((item) => ({
    playerId: clean(item?.playerId || item?.userId || item?.id || item?.discordId || '', 100),
    playerName: clean(item?.playerName || item?.name || 'Jogador', 120),
    rosterSlot: String(item?.rosterSlot || item?.slot || 'player').toLowerCase() === 'reserve' ? 'reserve' : 'player',
    note: clean(item?.note || '', 500)
  })).filter((item) => item.playerId).slice(0, 24);
}

function findUserByDiscord(usersByDiscord, discordId = '') { return usersByDiscord.get(String(splitDiscordId(discordId) || discordId || '').trim()) || null; }

function enrichTeam(team = {}, users = [], viewer = null) {
  const usersById = new Map(users.map((user) => [String(user.id || ''), user]));
  const usersByDiscord = new Map(users.map((user) => [String(user.discordId || ''), user]).filter(([id]) => id));
  const owner = usersById.get(String(team.ownerUserId || '')) || null;
  const directorUser = usersById.get(String(team.directorUserId || '')) || findUserByDiscord(usersByDiscord, team.directorDiscordId || '') || owner;
  const captainUser = usersById.get(String(team.captainUserId || '')) || findUserByDiscord(usersByDiscord, team.captainDiscordId || '');
  const accounts = team.playerAccounts || {};
  const normalizedLogo = resolveTeamLogo(team);

  const mapPlayer = (name, account, type, index) => {
    const discordId = splitDiscordId(account || name);
    const user = discordId ? usersByDiscord.get(discordId) : usersById.get(String(account || ''));
    const captainId = String(team.captainUserId || '');
    const captainDiscord = String(team.captainDiscordId || '');
    const isCaptain = Boolean((captainId && user?.id && String(user.id) === captainId) || (captainDiscord && (user?.discordId === captainDiscord || discordId === captainDiscord)) || (!team.captainName && index === 0 && type === 'player'));
    return { id: user?.id || '', name: clean(name || userDisplay(user) || `Jogador ${index + 1}`, 80), account: clean(account || '', 80), discordId: user?.discordId || discordId || '', avatar: user?.avatar || '', profile: user?.profile || {}, socials: user?.socials || {}, type, isCaptain };
  };

  const players = (Array.isArray(team.players) ? team.players : []).map((item, index) => mapPlayer(item, accounts.players?.[index] || '', 'player', index));
  const reserves = (Array.isArray(team.reserves) ? team.reserves : []).map((item, index) => mapPlayer(item, accounts.reserves?.[index] || '', 'reserve', index));
  const fallbackCaptain = players[0] || null;
  const directorName = directorUser ? userDisplay(directorUser) : (team.directorName || team.ownerName || userDisplay(owner || {}) || 'nao definido');
  const directorDiscordId = directorUser?.discordId || team.directorDiscordId || owner?.discordId || '';
  const captainName = captainUser ? userDisplay(captainUser) : (team.captainName || fallbackCaptain?.name || directorName || 'nao definido');
  const captainDiscordId = captainUser?.discordId || team.captainDiscordId || fallbackCaptain?.discordId || '';

  return { id: team.id || '', name: team.name || 'Time', tag: team.tag || '', logo: normalizedLogo, logoOriginal: team.logo || '', description: team.description || '', region: team.region || '', status: team.status || 'participating', ownerUserId: team.ownerUserId || '', ownerName: owner ? userDisplay(owner) : (team.ownerName || directorName), ownerAvatar: owner?.avatar || team.ownerAvatar || '', directorUserId: team.directorUserId || team.ownerUserId || '', directorName, directorDiscordId, captainUserId: team.captainUserId || '', captainName, captainDiscordId, players: Array.isArray(team.players) ? team.players : [], reserves: Array.isArray(team.reserves) ? team.reserves : [], playerAccounts: team.playerAccounts || {}, playerDetails: players, reserveDetails: reserves, socials: team.socials || {}, canManage: canManageTeam(viewer, team), createdAt: team.createdAt || null, updatedAt: team.updatedAt || null };
}

function buildTeamPayload(body = {}, user = {}, existing = null) {
  const allPlayerDetails = normalizePlayers(body.playerDetails || body.playersDetailed || []);
  const allReserveDetails = normalizePlayers(body.reserveDetails || body.reservesDetailed || []);
  const inviteRequests = [
    ...normalizeInvites(body.inviteRequests || body.pendingInvites || []),
    ...allPlayerDetails.filter((item) => item.inviteOnly).map((item) => ({ playerId: item.userId || item.id || item.discordId, playerName: item.name, rosterSlot: 'player' })),
    ...allReserveDetails.filter((item) => item.inviteOnly).map((item) => ({ playerId: item.userId || item.id || item.discordId, playerName: item.name, rosterSlot: 'reserve' }))
  ];
  const playerDetails = allPlayerDetails.filter((item) => !item.inviteOnly).map(({ inviteOnly, ...item }) => item);
  const reserveDetails = allReserveDetails.filter((item) => !item.inviteOnly).map(({ inviteOnly, ...item }) => item);
  const players = playerDetails.length ? playerDetails.map((item) => item.name) : normalizePlayers((body.players || []).map((name) => ({ name }))).map((item) => item.name);
  const reserves = reserveDetails.length ? reserveDetails.map((item) => item.name) : normalizePlayers((body.reserves || []).map((name) => ({ name }))).map((item) => item.name);
  const playerIds = playerDetails.map((item) => clean(item.discordId, 40));
  const reserveIds = reserveDetails.map((item) => clean(item.discordId, 40));

  const name = clean(body.name, 80);
  const tag = clean(body.tag, 8).toUpperCase();
  if (!name) throw new Error('Informe o nome do time.');
  if (!tag) throw new Error('Informe a tag do time.');
  if (players.length < 1 && inviteRequests.length < 1) throw new Error('Adicione pelo menos um titular ou selecione um jogador livre para convidar.');

  const now = new Date().toISOString();
  const ownerUserId = existing?.ownerUserId || user.id || '';
  const ownerName = existing?.ownerName || userDisplay(user);
  const incomingLogo = firstLogoValue(body.logo, body.logoUrl, body.logoURL, body.teamLogo, body.teamLogoUrl, body.badge, body.badgeUrl, body.escudo, body.image, body.imageUrl, body.avatar, body.icon);
  const logo = incomingLogo || resolveTeamLogo(existing || {}) || '';
  const directorName = clean(body.directorName || body.director?.name || existing?.directorName || ownerName, 80);
  const directorDiscordId = clean(splitDiscordId(body.directorDiscordId || body.director?.discordId || '') || body.directorDiscordId || body.director?.discordId || existing?.directorDiscordId || user.discordId || '', 40);
  const directorUserId = clean(body.directorUserId || existing?.directorUserId || ownerUserId, 80);
  const captainName = clean(body.captainName || body.captain?.name || existing?.captainName || players[0] || directorName, 80);
  const captainDiscordId = clean(splitDiscordId(body.captainDiscordId || body.captain?.discordId || '') || body.captainDiscordId || body.captain?.discordId || existing?.captainDiscordId || playerIds.find(Boolean) || '', 40);
  const captainUserId = clean(body.captainUserId || existing?.captainUserId || '', 80);

  const socialValue = (key, alias, max = 180) => clean(
    body.socials?.[key] !== undefined
      ? body.socials[key]
      : (body[alias] !== undefined ? body[alias] : existing?.socials?.[key] || ''),
    max
  );

  return { id: existing?.id || clean(body.id, 80) || `team_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`, name, tag, logo, description: clean(body.description !== undefined ? body.description : existing?.description || '', 600), region: clean(body.region !== undefined ? body.region : existing?.region || '', 80), status: existing?.status || 'participating', ownerUserId, ownerName, directorUserId, directorName, directorDiscordId, captainUserId, captainName, captainDiscordId, players, reserves, playerAccounts: { players: playerIds, reserves: reserveIds }, playerDetails, reserveDetails, inviteRequests, socials: { discord: socialValue('discord', 'socialDiscord'), instagram: socialValue('instagram', 'socialInstagram', 160), twitter: socialValue('twitter', 'socialTwitter', 160), youtube: socialValue('youtube', 'socialYoutube'), tiktok: socialValue('tiktok', 'socialTikTok', 160), twitch: socialValue('twitch', 'socialTwitch', 160), steam: socialValue('steam', 'socialSteam'), xbox: socialValue('xbox', 'socialXbox', 160), website: socialValue('website', 'socialWebsite') }, createdAt: existing?.createdAt || body.createdAt || now, updatedAt: now };
}

async function sendTeamInvites({ viewer, team, inviteRequests = [] }) {
  const sent = [];
  for (const invite of inviteRequests) {
    const notification = await createRecruitmentNotification({
      viewer,
      team,
      playerId: invite.playerId,
      playerName: invite.playerName,
      request: null,
      rosterSlot: invite.rosterSlot,
      note: invite.note || `Convite para entrar como ${invite.rosterSlot === 'reserve' ? 'reserva' : 'titular'} em ${team.name || 'time'}.`
    }).catch((error) => ({ success: false, message: error.message, playerId: invite.playerId }));
    sent.push({ playerId: invite.playerId, playerName: invite.playerName, rosterSlot: invite.rosterSlot, notification });
  }
  return sent;
}

function registerPublicTeamRoutes(app) {
  removeRoutes(app, [['get', '/api/teams'], ['post', '/api/teams'], ['put', '/api/teams/:teamId'], ['delete', '/api/teams/:teamId'], ['post', '/api/teams/:teamId/invite-player'], ['get', '/api/teams/:teamId/public'], ['get', '/api/users/:userId/public']]);

  app.get('/api/teams', async (req, res) => {
    const [teams, users, bracket, viewer] = await Promise.all([storage.readTeams().catch(() => []), storage.readUsers().catch(() => []), storage.readBracket().catch(() => ({})), getSessionUser(req)]);
    return res.json({ success: true, teams: teams.map((team) => enrichTeam(team, users, viewer)), bracket, viewer: publicUser(viewer || {}) });
  });

  app.post('/api/teams', requireLogin, async (req, res) => {
    try {
      const user = await getSessionUser(req);
      const payload = buildTeamPayload(req.body || {}, user || {});
      const inviteRequests = payload.inviteRequests || [];
      delete payload.inviteRequests;
      const saved = await storage.saveTeam(payload);
      const inviteResults = await sendTeamInvites({ viewer: user, team: saved, inviteRequests });
      const users = await storage.readUsers().catch(() => []);
      return res.status(201).json({ success: true, team: enrichTeam(saved, users, user), inviteResults });
    } catch (error) { return res.status(400).json({ success: false, message: error.message }); }
  });

  app.put('/api/teams/:teamId', requireLogin, async (req, res) => {
    try {
      const [user, teams] = await Promise.all([getSessionUser(req), storage.readTeams().catch(() => [])]);
      const existing = teams.find((item) => String(item.id || '') === String(req.params.teamId || ''));
      if (!existing) return res.status(404).json({ success: false, message: 'Time nao encontrado.' });
      if (!canManageTeam(user, existing)) return res.status(403).json({ success: false, message: 'Apenas diretor ou capitão pode editar esse time.' });
      const payload = buildTeamPayload({ ...(req.body || {}), id: existing.id }, user || {}, existing);
      const inviteRequests = payload.inviteRequests || [];
      delete payload.inviteRequests;
      const saved = await storage.saveTeam(payload);
      const inviteResults = await sendTeamInvites({ viewer: user, team: saved, inviteRequests });
      const users = await storage.readUsers().catch(() => []);
      return res.json({ success: true, team: enrichTeam(saved, users, user), inviteResults });
    } catch (error) { return res.status(400).json({ success: false, message: error.message }); }
  });

  app.post('/api/teams/:teamId/invite-player', requireLogin, async (req, res) => {
    try {
      const [user, teams] = await Promise.all([getSessionUser(req), storage.readTeams().catch(() => [])]);
      const team = teams.find((item) => String(item.id || '') === String(req.params.teamId || ''));
      if (!team) return res.status(404).json({ success: false, message: 'Time nao encontrado.' });
      if (!canManageTeam(user, team)) return res.status(403).json({ success: false, message: 'Apenas diretor ou capitão pode convidar jogador.' });
      const invite = normalizeInvites([{ ...req.body, playerId: req.body?.playerId || req.body?.userId || req.body?.discordId }])[0];
      if (!invite) return res.status(400).json({ success: false, message: 'Selecione um jogador cadastrado.' });
      const [result] = await sendTeamInvites({ viewer: user, team, inviteRequests: [invite] });
      return res.json({ success: true, invite: result });
    } catch (error) { return res.status(400).json({ success: false, message: error.message }); }
  });

  app.delete('/api/teams/:teamId', requireLogin, async (req, res) => {
    try {
      const [user, teams] = await Promise.all([getSessionUser(req), storage.readTeams().catch(() => [])]);
      const existing = teams.find((item) => String(item.id || '') === String(req.params.teamId || ''));
      if (!existing) return res.status(404).json({ success: false, message: 'Time nao encontrado.' });
      if (!await isAdminRecord(user)) return res.status(403).json({ success: false, message: 'Apenas administrador pode excluir times.' });
      const deleted = await storage.deleteTeam(existing.id);
      return res.json({ success: true, deleted: Boolean(deleted), teamId: existing.id });
    }
    catch (error) { return res.status(400).json({ success: false, message: error.message }); }
  });

  app.get('/api/teams/:teamId/public', async (req, res) => {
    const [teams, users, viewer] = await Promise.all([storage.readTeams().catch(() => []), storage.readUsers().catch(() => []), getSessionUser(req)]);
    const team = teams.find((item) => String(item.id || '') === String(req.params.teamId || ''));
    if (!team) return res.status(404).json({ success: false, message: 'Time nao encontrado.' });
    return res.json({ success: true, team: enrichTeam(team, users, viewer) });
  });

  app.get('/api/users/:userId/public', async (req, res) => {
    const users = await storage.readUsers().catch(() => []);
    const user = users.find((item) => String(item.id || '') === String(req.params.userId || '') || String(item.discordId || '') === String(req.params.userId || ''));
    if (!user) return res.status(404).json({ success: false, message: 'Jogador nao encontrado.' });
    return res.json({ success: true, user: publicUser(user) });
  });
}

module.exports = { registerPublicTeamRoutes };
