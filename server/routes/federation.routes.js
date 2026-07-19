const crypto = require('node:crypto');
const storage = require('../storage');
const { getSessionUser, isAdminRecord } = require('../services/access.service');
const { callBot } = require('../services/botApi.service');
const { canManageTeam } = require('../services/teamAccess.service');

const NOTIFICATION_CHANNEL = 'user-notifications';
const ANNOUNCEMENT_CHANNEL = 'site-announcements';
const CAFE_CHANNEL = 'cafe-com-leite-queue';

function requireSession(req, res, next) {
  if (!req.session?.userId) return res.status(401).json({ success: false, message: 'Faça login para continuar.' });
  return next();
}

function nameOf(user = {}) {
  return user?.profile?.username || user?.profile?.displayName || user?.name || user?.discordId || 'Jogador';
}

function teamName(team = {}) {
  return team?.name || team?.teamName || team?.tag || 'Clube';
}

function clean(value = '', max = 500) {
  return String(value || '').trim().slice(0, max);
}

function parseStoredJson(message = {}) {
  try { return { id: message.id, createdAt: message.createdAt, updatedAt: message.updatedAt, ...JSON.parse(message.content || '{}') }; }
  catch { return null; }
}

function isVisibleStatus(item = {}) {
  return !['deleted', 'hidden', 'archived'].includes(String(item.status || '').toLowerCase());
}

function playerIdentityValues(player = {}) {
  return [player.id, player.userId, player.discordId, nameOf(player)].map((item) => String(item || '').trim().toLowerCase()).filter(Boolean);
}

function playerInTeam(team = {}, player = {}) {
  const ids = playerIdentityValues(player);
  const raw = [
    ...(Array.isArray(team.playerDetails) ? team.playerDetails : []),
    ...(Array.isArray(team.reserveDetails) ? team.reserveDetails : []),
    ...(Array.isArray(team.players) ? team.players : []),
    ...(Array.isArray(team.reserves) ? team.reserves : [])
  ];
  return raw.some((entry) => ids.includes(String(entry?.id || entry?.userId || entry?.discordId || entry?.name || entry || '').trim().toLowerCase()));
}

function addUserToTeam(team = {}, user = {}, invite = {}) {
  if (playerInTeam(team, user)) return team;
  const slot = String(invite.rosterSlot || invite.slot || invite.teamRole || 'player').toLowerCase() === 'reserve' ? 'reserve' : 'player';
  const detail = {
    id: user.id || '',
    userId: user.id || '',
    name: nameOf(user),
    discordId: user.discordId || '',
    avatar: user.avatar || '',
    profile: user.profile || {},
    type: slot,
    acceptedAt: new Date().toISOString()
  };
  const next = { ...team };
  if (slot === 'reserve') {
    next.reserveDetails = Array.isArray(next.reserveDetails) ? [...next.reserveDetails, detail] : [detail];
    next.reserves = Array.isArray(next.reserves) ? [...next.reserves] : [];
    if (!next.reserves.includes(detail.name)) next.reserves.push(detail.name);
    next.playerAccounts = { ...(next.playerAccounts || {}), reserves: Array.isArray(next.playerAccounts?.reserves) ? [...next.playerAccounts.reserves] : [] };
    if (detail.discordId && !next.playerAccounts.reserves.includes(detail.discordId)) next.playerAccounts.reserves.push(detail.discordId);
  } else {
    next.playerDetails = Array.isArray(next.playerDetails) ? [...next.playerDetails, detail] : [detail];
    next.players = Array.isArray(next.players) ? [...next.players] : [];
    if (!next.players.includes(detail.name)) next.players.push(detail.name);
    next.playerAccounts = { ...(next.playerAccounts || {}), players: Array.isArray(next.playerAccounts?.players) ? [...next.playerAccounts.players] : [] };
    if (detail.discordId && !next.playerAccounts.players.includes(detail.discordId)) next.playerAccounts.players.push(detail.discordId);
  }
  next.updatedAt = new Date().toISOString();
  return next;
}

async function readResultsSafe() {
  const messages = await storage.readChatMessages({ channelId: 'results-main', limit: 500 }).catch(() => []);
  return messages.map((message) => {
    try {
      const raw = String(message.content || '');
      if (!raw.startsWith('RESULT_JSON:')) return null;
      return JSON.parse(raw.slice('RESULT_JSON:'.length));
    } catch { return null; }
  }).filter(Boolean);
}

function publicSiteUrl(req) {
  return String(process.env.SITE_PUBLIC_URL || process.env.PUBLIC_SITE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
}

function inviteSecret() {
  return process.env.SITE_INVITE_ACTION_SECRET || process.env.SESSION_SECRET || process.env.INTERNAL_API_TOKEN || 'void-arena-invite-action-dev';
}

function inviteToken(rawMessage = {}, invite = {}) {
  const payload = [rawMessage.id || invite.id || '', invite.targetUserId || invite.userId || '', invite.targetDiscordId || '', invite.createdAt || rawMessage.createdAt || ''].join('|');
  return crypto.createHmac('sha256', inviteSecret()).update(payload).digest('hex').slice(0, 32);
}

async function findNotificationById(id = '') {
  const messages = await storage.readChatMessages({ channelId: NOTIFICATION_CHANNEL, limit: 250 }).catch(() => []);
  const raw = messages.find((message) => String(message.id || '') === String(id || '')) || null;
  if (!raw) return { raw: null, invite: null };
  return { raw, invite: parseStoredJson(raw) };
}

function responseHtml(title, message) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#02040a;color:#fff;font-family:Inter,system-ui,sans-serif}.card{max-width:620px;padding:32px;border:1px solid rgba(139,92,246,.35);border-radius:18px;background:rgba(7,12,25,.9);box-shadow:0 0 48px rgba(139,92,246,.18)}a{color:#c084fc}</style></head><body><main class="card"><h1>${title}</h1><p>${message}</p><p><a href="/pages/correio.html">Abrir Correio</a> · <a href="/pages/dashboard.html">Voltar ao site</a></p></main></body></html>`;
}

async function respondInviteByStoredNotification({ id, action, token }) {
  const { raw, invite } = await findNotificationById(id);
  if (!raw || !invite) throw new Error('Convite não encontrado.');
  if (invite.type !== 'recruitment_invite') throw new Error('Esta notificação não é um convite de recrutamento.');
  if (String(invite.status || 'pending') !== 'pending') return { invite, alreadyAnswered: true };
  if (inviteToken(raw, invite) !== String(token || '')) throw new Error('Token do convite inválido ou expirado.');

  const users = await storage.readUsers().catch(() => []);
  const target = users.find((user) => String(user.id || '') === String(invite.targetUserId || invite.userId || '') || String(user.discordId || '') === String(invite.targetDiscordId || '')) || null;
  if (!target) throw new Error('Jogador alvo do convite não foi encontrado.');

  let savedTeam = null;
  if (action === 'accept') {
    const teams = await storage.readTeams().catch(() => []);
    const team = teams.find((item) => String(item.id || '') === String(invite.teamId || invite.team?.id || '')) || null;
    if (!team) throw new Error('Clube do convite não encontrado.');
    savedTeam = await storage.saveTeam(addUserToTeam(team, target, invite));
  }

  const status = action === 'accept' ? 'accepted' : 'declined';
  const next = { ...invite, status, respondedAt: new Date().toISOString(), responder: { id: target.id || '', name: nameOf(target), discordId: target.discordId || '', avatar: target.avatar || '' } };
  const saved = await storage.updateChatMessage(raw.id, { content: JSON.stringify(next) }, { channelId: NOTIFICATION_CHANNEL });

  const senderDiscordId = String(invite.sender?.discordId || invite.authorDiscordId || '').trim();
  if (senderDiscordId) {
    callBot('/internal/discord/message-player', {
      method: 'POST',
      body: JSON.stringify({
        discordId: senderDiscordId,
        content: action === 'accept'
          ? `✅ **${nameOf(target)} aceitou** o convite para entrar no clube **${invite.team?.name || invite.teamId || 'clube'}**.`
          : `❌ **${nameOf(target)} recusou** o convite para entrar no clube **${invite.team?.name || invite.teamId || 'clube'}**.`,
        meta: { type: 'recruitment_invite_response', action, notificationId: raw.id || '' }
      })
    }).catch(() => null);
  }

  return { invite: parseStoredJson(saved), team: savedTeam };
}

function registerFederationRoutes(app) {
  app.get('/api/federation/overview', async (_req, res) => {
    try {
      const [teams, users, events, results] = await Promise.all([
        storage.readTeams().catch(() => []),
        storage.readUsers().catch(() => []),
        storage.readEvents().catch(() => []),
        readResultsSafe()
      ]);
      const visibleEvents = events.filter(isVisibleStatus);
      const goals = results.reduce((sum, item) => sum + Number(item.finalScoreA || item.scoreA || 0) + Number(item.finalScoreB || item.scoreB || 0), 0);
      const nexusCup = visibleEvents.find((event) => /nexus/i.test(String(event.name || event.title || ''))) || null;
      return res.json({
        success: true,
        teams,
        players: users,
        events: visibleEvents,
        nexusCup,
        stats: { clubes: teams.length, atletas: users.length, competicoes: visibleEvents.length, partidas: results.length, gols },
        season: {
          name: 'Temporada 1 - 2026',
          startAt: nexusCup?.startAt || null,
          endAt: nexusCup?.endAt || nexusCup?.registrationDeadline || nexusCup?.registrationCloseAt || null
        }
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message, teams: [], players: [], events: [], stats: { clubes: 0, atletas: 0, competicoes: 0, partidas: 0, gols: 0 } });
    }
  });

  app.get('/api/federation/news', async (_req, res) => {
    try {
      const messages = await storage.readChatMessages({ channelId: ANNOUNCEMENT_CHANNEL, limit: 50 }).catch(() => []);
      const news = messages.map(parseStoredJson).filter(Boolean).filter(isVisibleStatus).reverse().slice(0, 8);
      return res.json({ success: true, news });
    } catch (error) {
      return res.json({ success: true, news: [], message: error.message });
    }
  });

  app.get('/api/federation/cafe-com-leite', requireSession, async (_req, res) => {
    try {
      const messages = await storage.readChatMessages({ channelId: CAFE_CHANNEL, limit: 200 }).catch(() => []);
      const queue = messages.map(parseStoredJson).filter(Boolean).filter((item) => item.status !== 'deleted').reverse();
      const rankingMap = new Map();
      queue.forEach((item) => {
        const key = item.userId || item.discordId || item.name;
        const prev = rankingMap.get(key) || { ...item, matches: 0, points: 0 };
        prev.matches += 1;
        prev.points += 1;
        rankingMap.set(key, prev);
      });
      return res.json({ success: true, queue, ranking: Array.from(rankingMap.values()).sort((a, b) => b.points - a.points) });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message, queue: [], ranking: [] });
    }
  });

  app.post('/api/federation/cafe-com-leite/queue', requireSession, async (req, res) => {
    try {
      const user = await getSessionUser(req);
      const createdAt = new Date().toISOString();
      const payload = { type: 'cafe_queue', status: 'queued', userId: user.id || '', discordId: user.discordId || '', name: nameOf(user), avatar: user.avatar || '', role: clean(req.body?.role, 80), note: clean(req.body?.note, 300), createdAt };
      const saved = await storage.saveChatMessage({ channelId: CAFE_CHANNEL, source: 'site', authorId: user.id || '', authorName: nameOf(user), authorAvatar: user.avatar || '', content: JSON.stringify(payload), attachments: [], createdAt });
      return res.json({ success: true, entry: { id: saved.id, ...payload } });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

  app.get('/api/federation/team-invites/respond', async (req, res) => {
    try {
      const action = String(req.query.action || '').trim().toLowerCase();
      if (!['accept', 'decline'].includes(action)) throw new Error('Ação inválida.');
      const result = await respondInviteByStoredNotification({ id: req.query.id, action, token: req.query.token });
      const label = action === 'accept' ? 'Convite aceito' : 'Convite recusado';
      const message = result.alreadyAnswered ? 'Esse convite já tinha sido respondido.' : (action === 'accept' ? 'Você entrou no elenco do clube.' : 'O capitão foi avisado da recusa.');
      return res.send(responseHtml(label, message));
    } catch (error) {
      return res.status(400).send(responseHtml('Convite não processado', error.message));
    }
  });

  app.post('/api/federation/team-invites', requireSession, async (req, res) => {
    try {
      const viewer = await getSessionUser(req);
      const [teams, users] = await Promise.all([storage.readTeams().catch(() => []), storage.readUsers().catch(() => [])]);
      const team = teams.find((item) => String(item.id || '') === String(req.body?.teamId || ''));
      if (!team) return res.status(404).json({ success: false, message: 'Clube não encontrado.' });
      if (!canManageTeam(viewer, team)) return res.status(403).json({ success: false, message: 'Apenas capitão ou diretor pode convidar jogadores.' });
      const targetId = clean(req.body?.playerId || req.body?.targetUserId || req.body?.discordId, 80);
      const target = users.find((user) => String(user.id || '') === targetId || String(user.discordId || '') === targetId);
      if (!target) return res.status(404).json({ success: false, message: 'Jogador alvo não encontrado no site.' });
      if (playerInTeam(team, target)) return res.status(409).json({ success: false, message: 'Esse jogador já está vinculado ao clube.' });
      const slot = String(req.body?.rosterSlot || 'player').toLowerCase() === 'reserve' ? 'reserve' : 'player';
      const slotLabel = slot === 'reserve' ? 'reserva' : 'titular';
      const createdAt = new Date().toISOString();
      const content = {
        type: 'recruitment_invite', title: `${teamName(team)} quer te recrutar`, message: `Convite para entrar como ${slotLabel}.`, status: 'pending',
        teamId: team.id || '', team: { id: team.id || '', name: teamName(team), tag: team.tag || '', logo: team.logo || team.logoUrl || '' },
        userId: target.id || '', targetUserId: target.id || '', targetDiscordId: target.discordId || '', playerId: target.id || target.discordId || '', playerName: nameOf(target),
        rosterSlot: slot, teamRole: slotLabel, sender: { id: viewer.id || '', name: nameOf(viewer), discordId: viewer.discordId || '', avatar: viewer.avatar || '' }, note: clean(req.body?.note, 400), createdAt
      };
      const saved = await storage.saveChatMessage({ channelId: NOTIFICATION_CHANNEL, source: 'system', authorId: viewer.id || '', authorName: nameOf(viewer), content: JSON.stringify(content), attachments: [], createdAt });
      const token = inviteToken(saved, content);
      const base = publicSiteUrl(req);
      const acceptUrl = `${base}/api/federation/team-invites/respond?id=${encodeURIComponent(saved.id)}&action=accept&token=${encodeURIComponent(token)}`;
      const declineUrl = `${base}/api/federation/team-invites/respond?id=${encodeURIComponent(saved.id)}&action=decline&token=${encodeURIComponent(token)}`;
      if (target.discordId) {
        callBot('/internal/discord/message-player', {
          method: 'POST',
          body: JSON.stringify({
            discordId: target.discordId,
            content: `🤝 **Convite de recrutamento — Hollow Nexus FRM**\n\nO clube **${teamName(team)}** quer te adicionar como **${slotLabel}**.\n\n✅ Aceitar: ${acceptUrl}\n❌ Recusar: ${declineUrl}\n\nTambém aparece no Correio do site.`,
            authorId: viewer.id || '', authorName: nameOf(viewer), meta: { type: 'recruitment_invite', teamId: team.id || '', notificationId: saved.id || '' }
          })
        }).catch(() => null);
      }
      return res.json({ success: true, notification: { id: saved.id, ...content }, message: 'Convite enviado ao Correio do jogador e à DM do Discord quando disponível.' });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });
}

module.exports = { registerFederationRoutes };
