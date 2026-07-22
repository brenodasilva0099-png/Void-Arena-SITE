const storage = require('../storage');
const { callBot } = require('../services/botApi.service');
const { getSessionUser, isOwnerRecord, isAdminRecord } = require('../services/access.service');
const { canManageTeam, canDeleteTeam } = require('../services/teamAccess.service');
const { normalizeBracketForResponse, sanitizeTeam } = require('../services/bracket.service');
const { removeRoutes } = require('../utils/expressRoutes');

const PERMISSION_KEYS = ['events','teams','bracket','results','rankings','scoring','chat','teamChats','scrims','stats','matches','forms','backup','config','jogadores','recrutamento','placar'];

function requireSession(req, res, next) { if (!req.session?.userId) return res.status(401).json({ success: false, message: 'Faça login para continuar.' }); return next(); }
function clean(value = '') { return String(value || '').trim(); }
function splitDiscordId(value = '') { const raw = clean(value); const mention = raw.match(/^<@!?(\d{16,22})>$/); if (mention) return mention[1]; if (/^\d{16,22}$/.test(raw)) return raw; return ''; }
function userDisplay(user = {}) { return user?.profile?.username || user?.name || user?.discordId || 'Jogador'; }
function emptyPermissions() { return Object.fromEntries(PERMISSION_KEYS.map((key) => [key, false])); }
function allPermissions() { return Object.fromEntries(PERMISSION_KEYS.map((key) => [key, true])); }
function normalizeRoleIds(roles = []) { return Array.from(new Set((Array.isArray(roles) ? roles : []).map((role) => typeof role === 'string' ? role : (role?.id || role?.roleId || '')).map((id) => String(id || '').trim()).filter(Boolean))); }
function applyPermissionConfig(target, config = {}) { PERMISSION_KEYS.forEach((key) => { if (config[key] === true) target[key] = true; }); if (config.teams || config.rankings) target.jogadores = true; if (config.teams) target.recrutamento = true; if (config.rankings) target.placar = true; }

async function permissionsForUser(user = {}) {
  if (isOwnerRecord(user)) return { isOwner: true, permissions: allPermissions(), roles: [], matchedRoleIds: [] };
  const permissions = emptyPermissions();
  const discordId = clean(user?.discordId || '');
  if (!discordId) return { isOwner: false, permissions, roles: [], matchedRoleIds: [], message: 'Sem Discord vinculado.' };
  const [permData, memberData] = await Promise.all([
    callBot('/internal/storage/readRolePermissions', { method: 'POST', body: JSON.stringify({ args: [] }) }).catch(() => ({ result: {} })),
    callBot(`/internal/discord/member-roles/${encodeURIComponent(discordId)}`, { method: 'GET' }).catch(() => ({ roles: [] }))
  ]);
  const rolePermissions = permData.result || {};
  const roles = Array.isArray(memberData.roles) ? memberData.roles : [];
  const matchedRoleIds = [];
  normalizeRoleIds(roles).forEach((roleId) => { const config = rolePermissions[String(roleId || '').trim()]; if (!config) return; matchedRoleIds.push(roleId); applyPermissionConfig(permissions, config); });
  return { isOwner: false, permissions, roles, matchedRoleIds };
}

function enrichTeam(team = {}, users = [], viewer = null, isAdmin = false) {
  const usersById = new Map(users.map((user) => [String(user.id || ''), user]));
  const usersByDiscord = new Map(users.map((user) => [String(user.discordId || ''), user]).filter(([id]) => id));
  const owner = usersById.get(String(team.ownerUserId || '')) || null;
  const director = usersById.get(String(team.directorUserId || '')) || usersByDiscord.get(String(team.directorDiscordId || '')) || owner || null;
  const captain = usersById.get(String(team.captainUserId || '')) || usersByDiscord.get(String(team.captainDiscordId || '')) || null;
  const safe = sanitizeTeam(team, usersById);
  const mapPlayer = (entry, type, index, account = '') => {
    const name = typeof entry === 'string' ? entry : (entry?.name || '');
    const rawDiscord = typeof entry === 'object' ? (entry.discordId || entry.account || account || '') : account;
    const discordId = splitDiscordId(rawDiscord || name);
    const user = (typeof entry === 'object' && entry.id ? usersById.get(String(entry.id || '')) : null) || (discordId ? usersByDiscord.get(discordId) : null);
    const isCaptain = Boolean((team.captainUserId && user?.id && String(team.captainUserId) === String(user.id)) || (team.captainDiscordId && (String(team.captainDiscordId) === String(user?.discordId || '') || String(team.captainDiscordId) === String(discordId))));
    return { id: user?.id || (typeof entry === 'object' ? entry.id || '' : ''), name: user ? userDisplay(user) : clean(name || `Jogador ${index + 1}`), account: clean(rawDiscord), discordId: user?.discordId || discordId || '', avatar: user?.avatar || (typeof entry === 'object' ? entry.avatar || '' : ''), profile: user?.profile || (typeof entry === 'object' ? entry.profile || {} : {}), type, isCaptain };
  };
  const playerDetails = Array.isArray(team.playerDetails) && team.playerDetails.length ? team.playerDetails.map((item, index) => mapPlayer(item, 'player', index)) : (Array.isArray(team.players) ? team.players : []).map((item, index) => mapPlayer(item, 'player', index, team.playerAccounts?.players?.[index] || ''));
  const reserveDetails = Array.isArray(team.reserveDetails) && team.reserveDetails.length ? team.reserveDetails.map((item, index) => mapPlayer(item, 'reserve', index)) : (Array.isArray(team.reserves) ? team.reserves : []).map((item, index) => mapPlayer(item, 'reserve', index, team.playerAccounts?.reserves?.[index] || ''));
  const fallbackCaptain = playerDetails[0] || null;
  const directorName = director ? userDisplay(director) : (team.directorName || team.ownerName || safe.ownerName || 'não definido');
  const captainName = captain ? userDisplay(captain) : (team.captainName || fallbackCaptain?.name || 'não definido');
  return { ...safe, ownerName: owner ? userDisplay(owner) : (safe.ownerName || team.ownerName || directorName), ownerAvatar: owner?.avatar || safe.ownerAvatar || '', directorUserId: team.directorUserId || team.ownerUserId || '', directorName, directorDiscordId: director?.discordId || team.directorDiscordId || owner?.discordId || '', captainUserId: team.captainUserId || '', captainName, captainDiscordId: captain?.discordId || team.captainDiscordId || fallbackCaptain?.discordId || '', playerDetails, reserveDetails, canManage: Boolean(isAdmin || canManageTeam(viewer, team)), canDelete: Boolean(isAdmin || canDeleteTeam(viewer, team)) };
}

function findUser(users = [], { userId = '', discordId = '' } = {}) { const safeUserId = clean(userId); const safeDiscordId = clean(discordId); return users.find((user) => (safeUserId && String(user.id || '') === safeUserId) || (safeDiscordId && String(user.discordId || '') === safeDiscordId)) || null; }

function registerTeamExtrasRoutes(app) {
  removeRoutes(app, [['get', '/api/teams'], ['get', '/api/me/permissions']]);

  app.get('/api/me/permissions', requireSession, async (req, res) => {
    try { const user = await getSessionUser(req); if (!user) return res.status(401).json({ success: false, message: 'Sessão inválida.' }); const data = await permissionsForUser(user); return res.json({ success: true, ...data }); }
    catch (error) { return res.status(500).json({ success: false, message: error.message, permissions: emptyPermissions(), roles: [] }); }
  });

  app.get('/api/teams', requireSession, async (req, res) => {
    try { const [teams, users, bracket, viewer] = await Promise.all([storage.readTeams(), storage.readUsers(), storage.readBracket(), getSessionUser(req)]); const isAdmin = await isAdminRecord(viewer).catch(() => false); const enriched = teams.map((team) => enrichTeam(team, users, viewer, isAdmin)); return res.json({ success: true, teams: enriched, bracket: normalizeBracketForResponse(bracket, teams, users), isAdmin }); }
    catch (error) { return res.status(500).json({ success: false, message: error.message, teams: [] }); }
  });

  app.post('/api/teams/:teamId/transfer-captain', requireSession, async (req, res) => {
    try {
      const [teams, users, viewer] = await Promise.all([storage.readTeams(), storage.readUsers(), getSessionUser(req)]);
      const team = teams.find((item) => String(item.id || '') === String(req.params.teamId || ''));
      if (!team) return res.status(404).json({ success: false, message: 'Time não encontrado.' });
      const isAdmin = await isAdminRecord(viewer).catch(() => false);
      if (!isAdmin && !canManageTeam(viewer, team)) return res.status(403).json({ success: false, message: 'Você não pode transferir esse time.' });
      const targetDiscordId = splitDiscordId(req.body?.discordId || req.body?.newCaptainDiscordId || '');
      const targetUserId = clean(req.body?.userId || req.body?.newCaptainUserId || '');
      const target = findUser(users, { userId: targetUserId, discordId: targetDiscordId });
      if (!target) return res.status(400).json({ success: false, message: 'Novo capitão precisa estar cadastrado/vinculado no site.' });
      if (!target.discordId) return res.status(400).json({ success: false, message: 'Novo capitão precisa ter Discord vinculado no perfil.' });
      const saved = await storage.saveTeam({ ...team, captainUserId: target.id, captainName: userDisplay(target), captainDiscordId: target.discordId || '', updatedAt: new Date().toISOString() });
      return res.json({ success: true, team: enrichTeam(saved, users, viewer, isAdmin), message: `Capitão transferido para ${userDisplay(target)}.` });
    } catch (error) { return res.status(400).json({ success: false, message: error.message }); }
  });
}

module.exports = { registerTeamExtrasRoutes };
