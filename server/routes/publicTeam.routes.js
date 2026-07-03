const crypto = require('node:crypto');
const storage = require('../storage');
const { getSessionUser, isOwnerRecord } = require('../services/access.service');
const { removeRoutes } = require('../utils/expressRoutes');

function requireLogin(req, res, next) {
  if (!req.session?.userId) return res.status(401).json({ success: false, message: 'Faca login para continuar.' });
  return next();
}

function clean(value = '', max = 160) {
  return String(value || '').trim().slice(0, max);
}

function safeLogo(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw.slice(0, 1200);
  if (/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(raw)) return raw.slice(0, 650000);
  return '';
}

function splitDiscordId(value = '') {
  const raw = String(value || '').trim();
  const mention = raw.match(/^<@!?(\d{16,22})>$/);
  if (mention) return mention[1];
  if (/^\d{16,22}$/.test(raw)) return raw;
  return '';
}

function userDisplay(user = {}) {
  return user?.profile?.username || user?.name || user?.discordId || 'Jogador';
}

function publicUser(user = {}) {
  return { id: user.id || '', name: user.name || '', discordId: user.discordId || '', avatar: user.avatar || '', profile: user.profile || {}, socials: user.socials || {}, provider: user.provider || 'login', createdAt: user.createdAt || null, updatedAt: user.updatedAt || null };
}

function normalizePlayers(value = []) {
  const source = Array.isArray(value) ? value : [];
  return source.map((item) => {
    if (typeof item === 'string') return { name: clean(item, 80), discordId: '' };
    return { name: clean(item?.name || item?.playerName || '', 80), discordId: clean(item?.discordId || item?.discord || item?.account || '', 40), role: clean(item?.role || '', 40) };
  }).filter((item) => item.name).slice(0, 12);
}

function enrichTeam(team = {}, users = [], viewer = null) {
  const usersById = new Map(users.map((user) => [String(user.id || ''), user]));
  const usersByDiscord = new Map(users.map((user) => [String(user.discordId || ''), user]).filter(([id]) => id));
  const owner = usersById.get(String(team.ownerUserId || '')) || null;
  const accounts = team.playerAccounts || {};
  const viewerCanManage = canManageTeam(viewer, team);

  const mapPlayer = (name, account, type, index) => {
    const discordId = splitDiscordId(account || name);
    const user = discordId ? usersByDiscord.get(discordId) : usersById.get(String(account || ''));
    return { id: user?.id || '', name: clean(name || userDisplay(user) || `Jogador ${index + 1}`, 80), account: clean(account || '', 80), discordId: user?.discordId || discordId || '', avatar: user?.avatar || '', profile: user?.profile || {}, socials: user?.socials || {}, type, isCaptain: Boolean(owner && user && String(owner.id) === String(user.id)) || (!owner && index === 0 && type === 'player') };
  };

  const players = (Array.isArray(team.players) ? team.players : []).map((item, index) => mapPlayer(item, accounts.players?.[index] || '', 'player', index));
  const reserves = (Array.isArray(team.reserves) ? team.reserves : []).map((item, index) => mapPlayer(item, accounts.reserves?.[index] || '', 'reserve', index));

  return { id: team.id || '', name: team.name || 'Time', tag: team.tag || '', logo: team.logo || '', ownerUserId: team.ownerUserId || '', ownerName: owner ? userDisplay(owner) : (team.ownerName || team.captainName || players[0]?.name || 'nao definido'), ownerAvatar: owner?.avatar || team.ownerAvatar || '', captainName: owner ? userDisplay(owner) : (team.captainName || players[0]?.name || 'nao definido'), captainDiscordId: owner?.discordId || team.captainDiscordId || players[0]?.discordId || '', players: Array.isArray(team.players) ? team.players : [], reserves: Array.isArray(team.reserves) ? team.reserves : [], playerAccounts: team.playerAccounts || {}, playerDetails: players, reserveDetails: reserves, socials: team.socials || {}, canManage: viewerCanManage, createdAt: team.createdAt || null, updatedAt: team.updatedAt || null };
}

function canManageTeam(user = null, team = {}) {
  if (!user) return false;
  if (isOwnerRecord(user)) return true;
  if (String(team.ownerUserId || '') === String(user.id || '')) return true;
  if (String(team.captainDiscordId || '') && String(team.captainDiscordId) === String(user.discordId || '')) return true;
  return false;
}

function buildTeamPayload(body = {}, user = {}, existing = null) {
  const playerDetails = normalizePlayers(body.playerDetails || body.playersDetailed || []);
  const reserveDetails = normalizePlayers(body.reserveDetails || body.reservesDetailed || []);
  const players = playerDetails.length ? playerDetails.map((item) => item.name) : normalizePlayers((body.players || []).map((name) => ({ name }))).map((item) => item.name);
  const reserves = reserveDetails.length ? reserveDetails.map((item) => item.name) : normalizePlayers((body.reserves || []).map((name) => ({ name }))).map((item) => item.name);
  const playerIds = playerDetails.map((item) => clean(item.discordId, 40));
  const reserveIds = reserveDetails.map((item) => clean(item.discordId, 40));

  const name = clean(body.name, 80);
  const tag = clean(body.tag, 8).toUpperCase();
  if (!name) throw new Error('Informe o nome do time.');
  if (!tag) throw new Error('Informe a tag do time.');
  if (players.length < 1) throw new Error('Adicione pelo menos um titular.');

  const now = new Date().toISOString();
  const ownerUserId = existing?.ownerUserId || user.id || '';
  const ownerName = existing?.ownerName || userDisplay(user);
  return { id: existing?.id || clean(body.id, 80) || `team_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`, name, tag, logo: safeLogo(body.logo), ownerUserId, ownerName, captainName: existing?.captainName || ownerName, captainDiscordId: existing?.captainDiscordId || user.discordId || playerIds.find(Boolean) || '', players, reserves, playerAccounts: { players: playerIds, reserves: reserveIds }, playerDetails, reserveDetails, socials: { discord: clean(body.socials?.discord || body.socialDiscord || '', 180), instagram: clean(body.socials?.instagram || body.socialInstagram || '', 160), youtube: clean(body.socials?.youtube || body.socialYoutube || '', 180), tiktok: clean(body.socials?.tiktok || body.socialTikTok || '', 160), steam: clean(body.socials?.steam || body.socialSteam || '', 180), xbox: clean(body.socials?.xbox || body.socialXbox || '', 160), website: clean(body.socials?.website || body.socialWebsite || '', 180) }, createdAt: existing?.createdAt || body.createdAt || now, updatedAt: now };
}

function registerPublicTeamRoutes(app) {
  removeRoutes(app, [
    ['get', '/api/teams'],
    ['post', '/api/teams'],
    ['put', '/api/teams/:teamId'],
    ['delete', '/api/teams/:teamId'],
    ['get', '/api/teams/:teamId/public'],
    ['get', '/api/users/:userId/public']
  ]);

  app.get('/api/teams', async (req, res) => {
    const [teams, users, bracket, viewer] = await Promise.all([storage.readTeams().catch(() => []), storage.readUsers().catch(() => []), storage.readBracket().catch(() => ({})), getSessionUser(req)]);
    return res.json({ success: true, teams: teams.map((team) => enrichTeam(team, users, viewer)), bracket, viewer: publicUser(viewer || {}) });
  });

  app.post('/api/teams', requireLogin, async (req, res) => {
    try {
      const user = await getSessionUser(req);
      const team = buildTeamPayload(req.body || {}, user || {});
      const saved = await storage.saveTeam(team);
      const users = await storage.readUsers().catch(() => []);
      return res.status(201).json({ success: true, team: enrichTeam(saved, users, user) });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

  app.put('/api/teams/:teamId', requireLogin, async (req, res) => {
    try {
      const [user, teams] = await Promise.all([getSessionUser(req), storage.readTeams().catch(() => [])]);
      const existing = teams.find((item) => String(item.id || '') === String(req.params.teamId || ''));
      if (!existing) return res.status(404).json({ success: false, message: 'Time nao encontrado.' });
      if (!canManageTeam(user, existing)) return res.status(403).json({ success: false, message: 'Apenas o capitao criador ou dono/admin pode editar esse time.' });
      const saved = await storage.saveTeam(buildTeamPayload({ ...(req.body || {}), id: existing.id }, user || {}, existing));
      const users = await storage.readUsers().catch(() => []);
      return res.json({ success: true, team: enrichTeam(saved, users, user) });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

  app.delete('/api/teams/:teamId', requireLogin, async (req, res) => {
    try {
      const [user, teams] = await Promise.all([getSessionUser(req), storage.readTeams().catch(() => [])]);
      const existing = teams.find((item) => String(item.id || '') === String(req.params.teamId || ''));
      if (!existing) return res.status(404).json({ success: false, message: 'Time nao encontrado.' });
      if (!canManageTeam(user, existing)) return res.status(403).json({ success: false, message: 'Apenas o capitao criador ou dono/admin pode excluir esse time.' });
      const deleted = await storage.deleteTeam(existing.id);
      return res.json({ success: true, deleted: Boolean(deleted), teamId: existing.id });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
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
