const storage = require('../storage');
const { getSessionUser, isOwnerRecord } = require('../services/access.service');
const { callBot } = require('../services/botApi.service');
const { createRecruitmentNotification } = require('./notifications.routes');

const RECRUITMENT_CHANNEL_ID = 'recruitment-board';

function requireSession(req, res, next) {
  if (!req.session?.userId) return res.status(401).json({ success: false, message: 'Faça login para continuar.' });
  return next();
}

function clean(value = '', max = 500) { return String(value || '').trim().slice(0, max); }
function userName(user = {}) { return user?.profile?.username || user?.name || user?.discordId || 'Jogador'; }
function playerKey(player = {}) { return String(player.userId || player.id || player.discordId || player.name || '').trim().toLowerCase(); }

function extractDiscordId(value = '') {
  const raw = String(value || '').trim();
  const mention = raw.match(/^<@!?(\d{16,22})>$/);
  if (mention) return mention[1];
  if (/^\d{16,22}$/.test(raw)) return raw;
  return '';
}

function publicRole(role = {}) {
  return { id: role.id || '', name: clean(role.name || '', 80), guildId: role.guildId || '', guildName: role.guildName || '' };
}
function filterPublicRoles(roles = []) {
  const blocked = new Set(['everyone', '@everyone']);
  return (Array.isArray(roles) ? roles : []).map(publicRole).filter((role) => role.id && role.name && !blocked.has(String(role.name).toLowerCase())).slice(0, 12);
}
async function readRolesForDiscordId(discordId = '') {
  const id = String(discordId || '').trim();
  if (!id) return [];
  try {
    const data = await callBot(`/internal/discord/member-roles/${encodeURIComponent(id)}`, { method: 'GET' });
    return filterPublicRoles(data.roles || []);
  } catch { return []; }
}
async function attachDiscordRoles(players = []) {
  const ids = Array.from(new Set(players.map((player) => String(player.discordId || '').trim()).filter(Boolean)));
  const map = new Map();
  const chunkSize = 5;
  for (let index = 0; index < ids.length; index += chunkSize) {
    const chunk = ids.slice(index, index + chunkSize);
    const results = await Promise.all(chunk.map(async (id) => [id, await readRolesForDiscordId(id)]));
    results.forEach(([id, roles]) => map.set(id, roles));
  }
  return players.map((player) => ({ ...player, roles: map.get(String(player.discordId || '').trim()) || [] }));
}

async function safeSessionUser(req) { try { return await getSessionUser(req); } catch { return null; } }

function canManageTeam(user = null, team = {}) {
  if (!user) return false;
  if (isOwnerRecord(user)) return true;
  if (String(team.ownerUserId || '') === String(user.id || '')) return true;
  if (String(team.captainDiscordId || '') && String(team.captainDiscordId) === String(user.discordId || '')) return true;
  return false;
}

function publicTeam(team = {}) {
  return { id: team.id || '', name: team.name || 'Time', tag: team.tag || '', logo: team.logo || '', ownerUserId: team.ownerUserId || '', captainName: team.captainName || team.ownerName || '', captainDiscordId: team.captainDiscordId || '' };
}

function publicUser(user = {}) { return { id: user.id || '', name: userName(user), discordId: user.discordId || '', avatar: user.avatar || '', profile: user.profile || {}, socials: user.socials || {} }; }

function buildDirectory(users = [], teams = []) {
  const byDiscord = new Map(users.map((user) => [String(user.discordId || '').trim(), user]).filter(([id]) => id));
  const byId = new Map(users.map((user) => [String(user.id || '').trim(), user]).filter(([id]) => id));
  const map = new Map();

  function upsert(raw = {}) {
    const key = playerKey(raw);
    if (!key) return;
    const current = map.get(key) || {};
    map.set(key, { ...current, ...raw, teams: [...(current.teams || []), ...(raw.teams || [])].filter(Boolean) });
  }

  teams.forEach((team) => {
    const roster = [
      ...(Array.isArray(team.playerDetails) ? team.playerDetails.map((p) => ({ ...p, rosterRole: 'Titular' })) : []),
      ...(Array.isArray(team.reserveDetails) ? team.reserveDetails.map((p) => ({ ...p, rosterRole: 'Reserva' })) : [])
    ];
    if (!roster.length) {
      (Array.isArray(team.players) ? team.players : []).forEach((name, index) => roster.push({ name, discordId: extractDiscordId(team.playerAccounts?.players?.[index] || ''), rosterRole: 'Titular' }));
      (Array.isArray(team.reserves) ? team.reserves : []).forEach((name, index) => roster.push({ name, discordId: extractDiscordId(team.playerAccounts?.reserves?.[index] || ''), rosterRole: 'Reserva' }));
    }

    roster.forEach((entry) => {
      const discordId = extractDiscordId(entry.discordId || entry.account || '');
      const user = byId.get(String(entry.id || '')) || byDiscord.get(discordId) || null;
      upsert({
        id: user?.id || entry.id || discordId || `roster_${team.id}_${entry.name}`,
        userId: user?.id || '',
        discordId: user?.discordId || discordId || '',
        name: user ? userName(user) : clean(entry.name || 'Jogador', 80),
        avatar: user?.avatar || entry.avatar || '',
        profile: user?.profile || entry.profile || {},
        socials: user?.socials || entry.socials || {},
        status: 'club',
        statusLabel: 'Com clube',
        rosterRole: entry.rosterRole || 'Titular',
        teams: [publicTeam(team)]
      });
    });

    const owner = byId.get(String(team.ownerUserId || '')) || byDiscord.get(String(team.captainDiscordId || '')) || null;
    if (owner) {
      upsert({ id: owner.id, userId: owner.id, discordId: owner.discordId || '', name: userName(owner), avatar: owner.avatar || '', profile: owner.profile || {}, socials: owner.socials || {}, status: 'club', statusLabel: 'Com clube', rosterRole: 'Capitão', teams: [publicTeam(team)] });
    }
  });

  users.filter((user) => !user.deletedAt).forEach((user) => {
    const key = playerKey({ userId: user.id, discordId: user.discordId, name: userName(user) });
    if (map.has(key)) return;
    upsert({ id: user.id || user.discordId || userName(user), userId: user.id || '', discordId: user.discordId || '', name: userName(user), avatar: user.avatar || '', profile: user.profile || {}, socials: user.socials || {}, status: 'free', statusLabel: 'Sem clube', rosterRole: 'Livre', teams: [] });
  });

  return Array.from(map.values()).map((player) => {
    const uniqueTeams = [];
    const seen = new Set();
    (player.teams || []).forEach((team) => { if (!team?.id || seen.has(team.id)) return; seen.add(team.id); uniqueTeams.push(team); });
    const profile = player.profile || {};
    return { ...player, name: clean(player.name || 'Jogador', 80), teams: uniqueTeams, teamName: uniqueTeams[0]?.name || '', teamTag: uniqueTeams[0]?.tag || '', primaryPosition: profile.primaryPosition || '', secondaryPosition: profile.secondaryPosition || '', country: profile.country || '', region: profile.region || profile.competitiveRegion || '', status: uniqueTeams.length ? 'club' : 'free', statusLabel: uniqueTeams.length ? 'Com clube' : 'Sem clube' };
  }).sort((a, b) => (a.status === b.status ? 0 : a.status === 'free' ? -1 : 1) || String(a.name || '').localeCompare(String(b.name || '')));
}

function parseRecruitmentMessage(message = {}) {
  try { const parsed = JSON.parse(message.content || '{}'); return { id: message.id, createdAt: message.createdAt, authorName: message.authorName, authorId: message.authorId, ...parsed }; }
  catch { return { id: message.id, createdAt: message.createdAt, authorName: message.authorName, authorId: message.authorId, type: 'unknown', text: message.content || '' }; }
}

function canCancelRecruitment(viewer = null, request = {}, teams = []) {
  if (!viewer || !request?.id) return false;
  if (isOwnerRecord(viewer)) return true;
  if (request.status !== 'pending') return false;
  if (String(request.authorId || '') === String(viewer.id || '')) return true;
  if (String(request.requester?.id || '') === String(viewer.id || '')) return true;
  const team = teams.find((item) => String(item.id || '') === String(request.team?.id || request.teamId || '')) || request.team || {};
  return canManageTeam(viewer, team);
}

async function recruitmentRequestsForViewer(req) {
  const [messages, viewer, teams] = await Promise.all([
    storage.readChatMessages({ channelId: RECRUITMENT_CHANNEL_ID, limit: 150 }).catch(() => []),
    safeSessionUser(req),
    storage.readTeams().catch(() => [])
  ]);
  return { viewer, teams, requests: messages.map(parseRecruitmentMessage).reverse().map((request) => ({ ...request, canCancel: canCancelRecruitment(viewer, request, teams) })) };
}

function registerPlayersRoutes(app) {
  app.get('/api/players/directory', requireSession, async (req, res) => {
    try {
      const [users, teams, viewer] = await Promise.all([storage.readUsers().catch(() => []), storage.readTeams().catch(() => []), safeSessionUser(req)]);
      const activeUsers = users.filter((user) => !user.deletedAt);
      const viewerTeams = teams.filter((team) => canManageTeam(viewer, team)).map(publicTeam);
      const players = await attachDiscordRoles(buildDirectory(activeUsers, teams));
      return res.json({ success: true, players, teams: teams.map(publicTeam), viewer: publicUser(viewer || {}), viewerTeams });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message, players: [], teams: [], viewerTeams: [] });
    }
  });

  app.get('/api/recruitment/requests', requireSession, async (req, res) => {
    try {
      const data = await recruitmentRequestsForViewer(req);
      return res.json({ success: true, requests: data.requests });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message, requests: [] });
    }
  });

  app.post('/api/recruitment/requests', requireSession, async (req, res) => {
    try {
      const [viewer, teams] = await Promise.all([safeSessionUser(req), storage.readTeams().catch(() => [])]);
      if (!viewer) return res.status(401).json({ success: false, message: 'Sessão inválida.' });
      const type = clean(req.body?.type, 32);
      const teamId = clean(req.body?.teamId, 120);
      const playerId = clean(req.body?.playerId, 120);
      const playerName = clean(req.body?.playerName, 120);
      const note = clean(req.body?.note, 700);
      const team = teams.find((item) => String(item.id || '') === teamId);
      if (!team) throw new Error('Time não encontrado.');
      let title = '';
      if (type === 'recruitment') {
        if (!canManageTeam(viewer, team)) throw new Error('Só capitão/dono desse time pode solicitar recrutamento.');
        if (!playerId && !playerName) throw new Error('Selecione o jogador que deseja recrutar.');
        title = `Convite de recrutamento enviado por ${team.name}`;
      } else if (type === 'trial') title = `Peneira solicitada para ${team.name}`;
      else throw new Error('Tipo de solicitação inválido.');

      const payload = { type, title, status: 'pending', team: publicTeam(team), playerId, playerName, requester: publicUser(viewer), note, createdAt: new Date().toISOString() };
      const saved = await storage.saveChatMessage({ channelId: RECRUITMENT_CHANNEL_ID, source: 'site', authorId: viewer.id || req.session.userId || '', authorName: userName(viewer), authorAvatar: viewer.avatar || '', content: JSON.stringify(payload), attachments: [], createdAt: payload.createdAt });
      let notification = null;
      if (type === 'recruitment') notification = await createRecruitmentNotification({ viewer, team, playerId, playerName, request: parseRecruitmentMessage(saved), note }).catch(() => null);
      return res.status(201).json({ success: true, request: parseRecruitmentMessage(saved), notification });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

  app.delete('/api/recruitment/requests/:requestId', requireSession, async (req, res) => {
    try {
      const [viewer, teams, messages] = await Promise.all([safeSessionUser(req), storage.readTeams().catch(() => []), storage.readChatMessages({ channelId: RECRUITMENT_CHANNEL_ID, limit: 150 }).catch(() => [])]);
      if (!viewer) return res.status(401).json({ success: false, message: 'Sessão inválida.' });
      const message = messages.find((item) => String(item.id || '') === String(req.params.requestId || ''));
      if (!message) throw new Error('Solicitação não encontrada.');
      const current = parseRecruitmentMessage(message);
      if (!canCancelRecruitment(viewer, current, teams)) throw new Error('Você não tem permissão para remover essa solicitação.');
      const next = { ...current, status: 'cancelled', cancelledAt: new Date().toISOString(), cancelledBy: publicUser(viewer) };
      delete next.canCancel;
      delete next.id;
      delete next.authorId;
      delete next.authorName;
      const saved = await storage.updateChatMessage(message.id, { content: JSON.stringify(next) }, { channelId: RECRUITMENT_CHANNEL_ID });
      return res.json({ success: true, request: parseRecruitmentMessage(saved) });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });
}

module.exports = { registerPlayersRoutes };
