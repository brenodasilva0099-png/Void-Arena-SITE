const storage = require('../storage');
const { getSessionUser, requireOwner } = require('../services/access.service');
const { callBot } = require('../services/botApi.service');

const NOTIFICATION_CHANNEL = 'user-notifications';
const ANNOUNCEMENT_CHANNEL = 'site-announcements';
const RECRUITMENT_CHANNEL = 'recruitment-board';

function requireSession(req, res, next) {
  if (!req.session?.userId) return res.status(401).json({ success: false, message: 'Faça login para continuar.' });
  return next();
}

function clean(value = '', max = 800) {
  return String(value || '').trim().slice(0, max);
}

function parseMessage(message = {}) {
  try {
    const data = JSON.parse(message.content || '{}');
    return { id: message.id, createdAt: message.createdAt, updatedAt: message.updatedAt, ...data };
  } catch {
    return { id: message.id, type: 'text', text: message.content || '', createdAt: message.createdAt };
  }
}

function isVisible(item = {}) {
  return !['archived', 'deleted', 'hidden'].includes(String(item.status || '').toLowerCase());
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

function playerIdentityValues(user = {}) {
  return [user.id, user.discordId, userName(user)].map((v) => String(v || '').trim().toLowerCase()).filter(Boolean);
}

function findPlayerAlreadyOnTeam(team = {}, user = {}) {
  const ids = playerIdentityValues(user);
  const details = [...(Array.isArray(team.playerDetails) ? team.playerDetails : []), ...(Array.isArray(team.reserveDetails) ? team.reserveDetails : [])];
  if (details.some((player) => ids.includes(String(player.id || player.userId || player.discordId || player.name || '').trim().toLowerCase()))) return true;
  const simple = [...(Array.isArray(team.players) ? team.players : []), ...(Array.isArray(team.reserves) ? team.reserves : [])];
  return simple.some((name) => ids.includes(String(name || '').trim().toLowerCase()));
}

function addUserToTeam(team = {}, user = {}, notification = {}) {
  if (findPlayerAlreadyOnTeam(team, user)) return team;
  const slot = String(notification.rosterSlot || notification.slot || notification.teamRole || 'player').toLowerCase() === 'reserve' ? 'reserve' : 'player';
  const next = { ...team };
  const detail = {
    id: user.id || '',
    userId: user.id || '',
    name: userName(user),
    discordId: user.discordId || '',
    avatar: user.avatar || '',
    profile: user.profile || {},
    type: slot,
    acceptedAt: new Date().toISOString()
  };

  if (slot === 'reserve') {
    next.reserveDetails = Array.isArray(next.reserveDetails) ? [...next.reserveDetails] : [];
    next.reserveDetails.push(detail);
    next.reserves = Array.isArray(next.reserves) ? [...next.reserves] : [];
    if (!next.reserves.includes(userName(user))) next.reserves.push(userName(user));
    next.playerAccounts = { ...(next.playerAccounts || {}), reserves: Array.isArray(next.playerAccounts?.reserves) ? [...next.playerAccounts.reserves] : [] };
    if (user.discordId && !next.playerAccounts.reserves.includes(user.discordId)) next.playerAccounts.reserves.push(user.discordId);
  } else {
    next.playerDetails = Array.isArray(next.playerDetails) ? [...next.playerDetails] : [];
    next.playerDetails.push(detail);
    next.players = Array.isArray(next.players) ? [...next.players] : [];
    if (!next.players.includes(userName(user))) next.players.push(userName(user));
    next.playerAccounts = { ...(next.playerAccounts || {}), players: Array.isArray(next.playerAccounts?.players) ? [...next.playerAccounts.players] : [] };
    if (user.discordId && !next.playerAccounts.players.includes(user.discordId)) next.playerAccounts.players.push(user.discordId);
  }

  next.updatedAt = new Date().toISOString();
  return next;
}

async function readAnnouncements(limit = 80) {
  const messages = await storage.readChatMessages({ channelId: ANNOUNCEMENT_CHANNEL, limit }).catch(() => []);
  return messages.map(parseMessage).filter(isVisible).map((item) => ({ ...item, type: item.type || 'announcement', status: item.status || 'info' }));
}

async function sendRecruitmentDm({ target, viewer, team, rosterSlot, note }) {
  const discordId = String(target?.discordId || '').trim();
  if (!discordId) return { success: false, skipped: true, message: 'Jogador sem Discord ID.' };
  const slotLabel = String(rosterSlot || 'player').toLowerCase() === 'reserve' ? 'reserva' : 'titular';
  const siteUrl = String(process.env.SITE_PUBLIC_URL || process.env.PUBLIC_SITE_URL || 'https://void-arena-site.onrender.com').replace(/\/$/, '');
  const content = [
    '🤝 **Convite de recrutamento — Void Arena**',
    '',
    `O time **${team.name || 'um time'}${team.tag ? ` (${team.tag})` : ''}** quer te adicionar como **${slotLabel}**.`,
    viewer ? `Enviado por: **${userName(viewer)}**` : '',
    note ? `Mensagem: ${clean(note, 400)}` : '',
    '',
    `Entre no site para aceitar ou recusar: ${siteUrl}/pages/dashboard.html`,
    'O jogador só entra no elenco depois que aceitar pelo site.'
  ].filter(Boolean).join('\n');

  return callBot('/internal/discord/message-player', {
    method: 'POST',
    body: JSON.stringify({
      discordId,
      content,
      authorId: viewer?.id || '',
      authorName: userName(viewer || {}),
      meta: { type: 'recruitment_invite', teamId: team.id || '', rosterSlot }
    })
  }).catch((error) => ({ success: false, deliveredToDiscord: false, message: error.message, dmError: error.message }));
}

function registerNotificationRoutes(app) {
  app.get('/api/notifications', requireSession, async (req, res) => {
    try {
      const user = await getSessionUser(req);
      const [directMessages, announcements] = await Promise.all([
        storage.readChatMessages({ channelId: NOTIFICATION_CHANNEL, limit: 120 }).catch(() => []),
        readAnnouncements(30)
      ]);
      const personal = directMessages.map(parseMessage).filter((item) => isVisible(item) && isForUser(item, user));
      const notifications = [...personal, ...announcements].sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
      const unread = personal.filter((item) => !['read', 'accepted', 'declined', 'archived'].includes(String(item.status || '').toLowerCase())).length + announcements.length;
      return res.json({ success: true, notifications: notifications.reverse(), unread });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message, notifications: [], unread: 0 });
    }
  });

  app.get('/api/notifications/announcements', requireSession, requireOwner, async (_req, res) => {
    try {
      const announcements = await readAnnouncements(100);
      return res.json({ success: true, announcements: announcements.reverse() });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message, announcements: [] });
    }
  });

  app.post('/api/notifications/announcement', requireSession, requireOwner, async (req, res) => {
    try {
      const user = await getSessionUser(req);
      const title = clean(req.body?.title || 'Aviso da Void Arena', 120);
      const message = clean(req.body?.message, 1000);
      if (!message) return res.status(400).json({ success: false, message: 'Digite a mensagem do aviso.' });
      const createdAt = new Date().toISOString();
      const saved = await storage.saveChatMessage({
        channelId: ANNOUNCEMENT_CHANNEL,
        source: 'system',
        authorId: user?.id || '',
        authorName: userName(user || {}),
        content: JSON.stringify({ type: 'announcement', title, message, note: message, status: 'info', sender: publicUser(user || {}), createdAt }),
        attachments: [],
        createdAt
      });
      return res.json({ success: true, message: 'Aviso enviado para os Correios dos usuários logados.', notification: parseMessage(saved) });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

  app.delete('/api/notifications/announcements', requireSession, requireOwner, async (req, res) => {
    try {
      const ids = Array.from(new Set(Array.isArray(req.body?.ids) ? req.body.ids : []))
        .map((id) => String(id || '').trim()).filter(Boolean);
      if (!ids.length) return res.status(400).json({ success: false, message: 'Selecione pelo menos uma notificação.' });
      const messages = await storage.readChatMessages({ channelId: ANNOUNCEMENT_CHANNEL, limit: 200 }).catch(() => []);
      let archived = 0;
      for (const raw of messages) {
        if (!ids.includes(String(raw.id))) continue;
        const item = parseMessage(raw);
        await storage.updateChatMessage(raw.id, { content: JSON.stringify({ ...item, status: 'archived', archivedAt: new Date().toISOString() }) }, { channelId: ANNOUNCEMENT_CHANNEL });
        archived += 1;
      }
      return res.json({ success: true, archived, message: `${archived} notificação(ões) removida(s).` });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
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
        const savedTeam = await storage.saveTeam(addUserToTeam(team, user, notification));
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

async function createRecruitmentNotification({ viewer, team, playerId, playerName, request, note, rosterSlot = 'player', teamRole = '' }) {
  const users = await storage.readUsers().catch(() => []);
  const target = users.find((user) => String(user.id || '') === String(playerId || '') || String(user.discordId || '') === String(playerId || '')) || null;
  if (!target) return null;
  const slot = String(rosterSlot || teamRole || 'player').toLowerCase() === 'reserve' ? 'reserve' : 'player';
  const slotLabel = slot === 'reserve' ? 'reserva' : 'titular';
  const createdAt = new Date().toISOString();

  const content = {
    type: 'recruitment_invite',
    title: `${team.name || 'Um time'} quer te recrutar`,
    message: `Convite para entrar como ${slotLabel}.`,
    status: 'pending',
    requestId: request?.id || '',
    teamId: team.id || '',
    team: { id: team.id || '', name: team.name || 'Time', tag: team.tag || '', logo: team.logo || '' },
    userId: target.id || '',
    targetUserId: target.id || '',
    targetDiscordId: target.discordId || '',
    playerId,
    playerName: playerName || userName(target),
    rosterSlot: slot,
    teamRole: slotLabel,
    sender: publicUser(viewer || {}),
    note: note || '',
    createdAt
  };

  const saved = await storage.saveChatMessage({
    channelId: NOTIFICATION_CHANNEL,
    source: 'system',
    authorId: viewer?.id || '',
    authorName: userName(viewer),
    content: JSON.stringify(content),
    attachments: [],
    createdAt
  });

  const discordDm = await sendRecruitmentDm({ target, viewer, team, rosterSlot: slot, note }).catch((error) => ({ success: false, message: error.message }));
  return { ...saved, discordDm };
}

module.exports = { registerNotificationRoutes, createRecruitmentNotification };
