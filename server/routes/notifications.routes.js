const storage = require('../storage');
const { getSessionUser } = require('../services/access.service');

const NOTIFICATION_CHANNEL = 'user-notifications';
const RECRUITMENT_CHANNEL = 'recruitment-board';

function requireSession(req, res, next) {
  if (!req.session?.userId) return res.status(401).json({ success: false, message: 'Faça login para continuar.' });
  return next();
}

function parseMessage(message = {}) {
  try {
    const data = JSON.parse(message.content || '{}');
    return { id: message.id, createdAt: message.createdAt, updatedAt: message.updatedAt, ...data };
  } catch {
    return { id: message.id, type: 'text', text: message.content || '', createdAt: message.createdAt };
  }
}

function userName(user = {}) {
  return user?.profile?.username || user?.name || user?.discordId || 'Jogador';
}

function publicUser(user = {}) {
  return { id: user.id || '', name: userName(user), discordId: user.discordId || '', avatar: user.avatar || '' };
}

function isForUser(notification = {}, user = {}) {
  const ids = [user.id, user.discordId].map((v) => String(v || '').trim()).filter(Boolean);
  const targets = [notification.userId, notification.targetUserId, notification.discordId, notification.targetDiscordId, notification.playerId].map((v) => String(v || '').trim()).filter(Boolean);
  return targets.some((target) => ids.includes(target));
}

function findPlayerAlreadyOnTeam(team = {}, user = {}) {
  const ids = [user.id, user.discordId, userName(user)].map((v) => String(v || '').trim().toLowerCase()).filter(Boolean);
  const details = [...(Array.isArray(team.playerDetails) ? team.playerDetails : []), ...(Array.isArray(team.reserveDetails) ? team.reserveDetails : [])];
  if (details.some((player) => ids.includes(String(player.id || player.userId || player.discordId || player.name || '').trim().toLowerCase()))) return true;
  const simple = [...(Array.isArray(team.players) ? team.players : []), ...(Array.isArray(team.reserves) ? team.reserves : [])];
  return simple.some((name) => ids.includes(String(name || '').trim().toLowerCase()));
}

function addUserToTeam(team = {}, user = {}) {
  if (findPlayerAlreadyOnTeam(team, user)) return team;
  const next = { ...team };
  next.playerDetails = Array.isArray(next.playerDetails) ? [...next.playerDetails] : [];
  next.playerDetails.push({
    id: user.id || '',
    userId: user.id || '',
    name: userName(user),
    discordId: user.discordId || '',
    avatar: user.avatar || '',
    profile: user.profile || {},
    type: 'player',
    acceptedAt: new Date().toISOString()
  });
  next.players = Array.isArray(next.players) ? [...next.players] : [];
  if (!next.players.includes(userName(user))) next.players.push(userName(user));
  next.updatedAt = new Date().toISOString();
  return next;
}

function registerNotificationRoutes(app) {
  app.get('/api/notifications', requireSession, async (req, res) => {
    try {
      const user = await getSessionUser(req);
      const messages = await storage.readChatMessages({ channelId: NOTIFICATION_CHANNEL, limit: 120 }).catch(() => []);
      const notifications = messages.map(parseMessage).filter((item) => isForUser(item, user));
      const unread = notifications.filter((item) => !['read', 'accepted', 'declined', 'archived'].includes(String(item.status || '').toLowerCase())).length;
      return res.json({ success: true, notifications: notifications.reverse(), unread });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message, notifications: [], unread: 0 });
    }
  });

  app.post('/api/notifications/:id/action', requireSession, async (req, res) => {
    try {
      const user = await getSessionUser(req);
      const action = String(req.body?.action || '').trim().toLowerCase();
      if (!['accept', 'decline', 'read'].includes(action)) return res.status(400).json({ success: false, message: 'Ação inválida.' });

      const messages = await storage.readChatMessages({ channelId: NOTIFICATION_CHANNEL, limit: 120 }).catch(() => []);
      const raw = messages.find((message) => String(message.id) === String(req.params.id));
      if (!raw) return res.status(404).json({ success: false, message: 'Notificação não encontrada.' });

      const notification = parseMessage(raw);
      if (!isForUser(notification, user)) return res.status(403).json({ success: false, message: 'Essa notificação não é sua.' });

      let team = null;
      if (notification.type === 'recruitment_invite' && action === 'accept') {
        const teams = await storage.readTeams().catch(() => []);
        team = teams.find((item) => String(item.id || '') === String(notification.team?.id || notification.teamId || '')) || null;
        if (!team) throw new Error('Time do convite não encontrado.');
        const savedTeam = await storage.saveTeam(addUserToTeam(team, user));
        team = savedTeam;
      }

      const next = {
        ...notification,
        status: action === 'accept' ? 'accepted' : action === 'decline' ? 'declined' : 'read',
        respondedAt: new Date().toISOString(),
        responder: publicUser(user)
      };

      const saved = await storage.updateChatMessage(raw.id, { content: JSON.stringify(next) }, { channelId: NOTIFICATION_CHANNEL });
      return res.json({ success: true, notification: parseMessage(saved), team });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });
}

async function createRecruitmentNotification({ viewer, team, playerId, playerName, request, note }) {
  const users = await storage.readUsers().catch(() => []);
  const target = users.find((user) => String(user.id || '') === String(playerId || '') || String(user.discordId || '') === String(playerId || '')) || null;
  if (!target) return null;

  return storage.saveChatMessage({
    channelId: NOTIFICATION_CHANNEL,
    source: 'system',
    authorId: viewer?.id || '',
    authorName: userName(viewer),
    content: JSON.stringify({
      type: 'recruitment_invite',
      title: `${team.name || 'Um time'} quer te recrutar`,
      status: 'pending',
      requestId: request?.id || '',
      teamId: team.id || '',
      team: { id: team.id || '', name: team.name || 'Time', tag: team.tag || '', logo: team.logo || '' },
      userId: target.id || '',
      targetUserId: target.id || '',
      targetDiscordId: target.discordId || '',
      playerId,
      playerName: playerName || userName(target),
      sender: publicUser(viewer || {}),
      note: note || '',
      createdAt: new Date().toISOString()
    }),
    attachments: [],
    createdAt: new Date().toISOString()
  });
}

module.exports = { registerNotificationRoutes, createRecruitmentNotification };
