const crypto = require('node:crypto');
const storage = require('../storage');
const { getSessionUser, isAdminRecord } = require('../services/access.service');
const { canManageTeam } = require('../services/teamAccess.service');

const RANKING_CHANNEL = 'frm-ranking-settings';
const TRANSFER_CHANNEL = 'frm-transfer-requests';

function requireSession(req, res, next) {
  if (!req.session?.userId) return res.status(401).json({ success: false, message: 'Faça login para continuar.' });
  return next();
}

function clean(value = '', max = 500) {
  return String(value || '').trim().slice(0, max);
}

function displayUser(user = {}) {
  return user?.profile?.username || user?.profile?.displayName || user?.name || user?.discordId || 'Jogador';
}

function teamName(team = {}) {
  return team?.name || team?.teamName || team?.tag || 'Clube';
}

function safeJson(message = {}) {
  try { return { id: message.id, createdAt: message.createdAt, ...JSON.parse(message.content || '{}') }; }
  catch { return null; }
}

async function readRankingSettings() {
  const messages = await storage.readChatMessages({ channelId: RANKING_CHANNEL, limit: 400 }).catch(() => []);
  const settings = {};
  messages.map(safeJson).filter(Boolean).forEach((item) => {
    if (!item.targetType || !item.targetId) return;
    settings[`${item.targetType}:${item.targetId}`] = item;
  });
  return settings;
}

function registerFederationFixRoutes(app) {
  app.get('/api/federation/ranking-settings', requireSession, async (_req, res) => {
    const settings = await readRankingSettings();
    return res.json({ success: true, settings });
  });

  app.post('/api/federation/ranking-settings', requireSession, async (req, res) => {
    try {
      const viewer = await getSessionUser(req);
      if (!(await isAdminRecord(viewer))) return res.status(403).json({ success: false, message: 'Apenas admin pode editar ranking.' });
      const targetType = clean(req.body?.targetType, 40);
      const targetId = clean(req.body?.targetId, 120);
      if (!['club','player'].includes(targetType) || !targetId) return res.status(400).json({ success: false, message: 'Alvo inválido.' });
      const payload = {
        type: 'ranking_setting', targetType, targetId,
        points: Number(req.body?.points || 0) || 0,
        wins: Number(req.body?.wins || 0) || 0,
        losses: Number(req.body?.losses || 0) || 0,
        goals: Number(req.body?.goals || 0) || 0,
        updatedBy: viewer.id || '', updatedByName: displayUser(viewer), updatedAt: new Date().toISOString()
      };
      const saved = await storage.saveChatMessage({ channelId: RANKING_CHANNEL, source: 'system', authorId: viewer.id || '', authorName: displayUser(viewer), content: JSON.stringify(payload), attachments: [], createdAt: payload.updatedAt });
      return res.json({ success: true, setting: { id: saved.id, ...payload } });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

  app.post('/api/federation/clubs', requireSession, async (req, res) => {
    try {
      const viewer = await getSessionUser(req);
      const name = clean(req.body?.name || req.body?.teamName, 90);
      const tag = clean(req.body?.tag, 12).toUpperCase();
      if (!name) return res.status(400).json({ success: false, message: 'Informe o nome do clube.' });
      const teams = await storage.readTeams().catch(() => []);
      const exists = teams.some((team) => teamName(team).toLowerCase() === name.toLowerCase() || (tag && String(team.tag || '').toLowerCase() === tag.toLowerCase()));
      if (exists) return res.status(409).json({ success: false, message: 'Já existe clube com esse nome ou sigla.' });
      const now = new Date().toISOString();
      const team = await storage.saveTeam({
        id: crypto.randomUUID(), name, teamName: name, tag,
        description: clean(req.body?.description, 600), region: clean(req.body?.region, 80), logo: clean(req.body?.logo, 4000), logoUrl: clean(req.body?.logo, 4000),
        ownerUserId: viewer.id || '', ownerName: displayUser(viewer), ownerDiscordId: viewer.discordId || '', ownerAvatar: viewer.avatar || '',
        captainUserId: viewer.id || '', captainName: displayUser(viewer), captainDiscordId: viewer.discordId || '',
        directorUserId: viewer.id || '', directorName: displayUser(viewer), directorDiscordId: viewer.discordId || '',
        players: [displayUser(viewer)], playerDetails: [{ id: viewer.id || '', userId: viewer.id || '', name: displayUser(viewer), discordId: viewer.discordId || '', avatar: viewer.avatar || '', type: 'player', isCaptain: true, acceptedAt: now }],
        reserves: [], reserveDetails: [], playerAccounts: { players: viewer.discordId ? [viewer.discordId] : [], reserves: [] },
        status: 'affiliated', createdAt: now, updatedAt: now
      });
      return res.json({ success: true, team });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

  app.post('/api/federation/transfers', requireSession, async (req, res) => {
    try {
      const viewer = await getSessionUser(req);
      const [teams, users] = await Promise.all([storage.readTeams().catch(() => []), storage.readUsers().catch(() => [])]);
      const fromTeam = teams.find((team) => String(team.id || '') === String(req.body?.fromTeamId || ''));
      const toTeam = teams.find((team) => String(team.id || '') === String(req.body?.toTeamId || ''));
      const player = users.find((user) => String(user.id || '') === String(req.body?.playerId || '') || String(user.discordId || '') === String(req.body?.playerId || ''));
      if (!fromTeam || !toTeam || !player) return res.status(404).json({ success: false, message: 'Clube ou jogador não encontrado.' });
      if (!(await canManageTeam(viewer, toTeam))) return res.status(403).json({ success: false, message: 'Apenas capitão ou diretor do clube de destino pode solicitar transferência.' });
      const payload = { type: 'transfer_request', status: 'pending', fromTeam: { id: fromTeam.id, name: teamName(fromTeam) }, toTeam: { id: toTeam.id, name: teamName(toTeam) }, player: { id: player.id || '', name: displayUser(player), discordId: player.discordId || '', avatar: player.avatar || '' }, requestedBy: { id: viewer.id || '', name: displayUser(viewer) }, createdAt: new Date().toISOString(), note: clean(req.body?.note, 400) };
      const saved = await storage.saveChatMessage({ channelId: TRANSFER_CHANNEL, source: 'system', authorId: viewer.id || '', authorName: displayUser(viewer), content: JSON.stringify(payload), attachments: [], createdAt: payload.createdAt });
      return res.json({ success: true, transfer: { id: saved.id, ...payload } });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });
}

module.exports = { registerFederationFixRoutes };
