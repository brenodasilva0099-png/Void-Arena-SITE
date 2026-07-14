const storage = require('../storage');
const { getSessionUser, isAdminRecord } = require('../services/access.service');
const { callBot } = require('../services/botApi.service');

const NOTIFICATION_CHANNEL = 'user-notifications';
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
  try { return { id: message.id, createdAt: message.createdAt, ...JSON.parse(message.content || '{}') }; }
  catch { return null; }
}

function canManageTeam(user = {}, team = {}) {
  if (!user) return false;
  if (isAdminRecord?.(user)) return true;
  return String(team.ownerUserId || '') === String(user.id || '')
    || String(team.captainUserId || '') === String(user.id || '')
    || String(team.captainDiscordId || '') === String(user.discordId || '')
    || String(team.directorUserId || '') === String(user.id || '')
    || String(team.directorDiscordId || '') === String(user.discordId || '');
}

function playerInTeam(team = {}, player = {}) {
  const ids = [player.id, player.discordId, nameOf(player)].map((item) => String(item || '').toLowerCase()).filter(Boolean);
  const raw = [
    ...(Array.isArray(team.playerDetails) ? team.playerDetails : []),
    ...(Array.isArray(team.reserveDetails) ? team.reserveDetails : []),
    ...(Array.isArray(team.players) ? team.players : []),
    ...(Array.isArray(team.reserves) ? team.reserves : [])
  ];
  return raw.some((entry) => ids.includes(String(entry?.id || entry?.userId || entry?.discordId || entry?.name || entry || '').toLowerCase()));
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

function registerFederationRoutes(app) {
  app.get('/api/federation/overview', async (_req, res) => {
    try {
      const [teams, users, events, results] = await Promise.all([
        storage.readTeams().catch(() => []),
        storage.readUsers().catch(() => []),
        storage.readEvents().catch(() => []),
        readResultsSafe()
      ]);
      const visibleEvents = events.filter((event) => !['deleted', 'hidden', 'archived'].includes(String(event.status || '').toLowerCase()));
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
          startAt: nexusCup?.startAt || '2026-07-18T19:30:00-03:00',
          endAt: nexusCup?.endAt || nexusCup?.registrationDeadline || nexusCup?.registrationCloseAt || '2026-07-31T23:59:00-03:00'
        }
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message, teams: [], players: [], events: [], stats: { clubes: 0, atletas: 0, competicoes: 0, partidas: 0, gols: 0 } });
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
      const payload = {
        type: 'cafe_queue', status: 'queued', userId: user.id || '', discordId: user.discordId || '',
        name: nameOf(user), avatar: user.avatar || '', role: clean(req.body?.role, 80), note: clean(req.body?.note, 300), createdAt
      };
      const saved = await storage.saveChatMessage({ channelId: CAFE_CHANNEL, source: 'site', authorId: user.id || '', authorName: nameOf(user), authorAvatar: user.avatar || '', content: JSON.stringify(payload), attachments: [], createdAt });
      return res.json({ success: true, entry: { id: saved.id, ...payload } });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

  app.post('/api/federation/team-invites', requireSession, async (req, res) => {
    try {
      const viewer = await getSessionUser(req);
      const [teams, users] = await Promise.all([storage.readTeams().catch(() => []), storage.readUsers().catch(() => [])]);
      const team = teams.find((item) => String(item.id || '') === String(req.body?.teamId || ''));
      if (!team) return res.status(404).json({ success: false, message: 'Clube não encontrado.' });
      if (!canManageTeam(viewer, team)) return res.status(403).json({ success: false, message: 'Apenas capitão/diretor/admin pode convidar jogadores.' });
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
      if (target.discordId) {
        callBot('/internal/discord/message-player', {
          method: 'POST',
          body: JSON.stringify({
            discordId: target.discordId,
            content: `🤝 **Convite de recrutamento — Hollow Nexus FRM**\n\nO clube **${teamName(team)}** quer te adicionar como **${slotLabel}**.\nAbra o Correio no site para aceitar ou recusar.`,
            authorId: viewer.id || '', authorName: nameOf(viewer), meta: { type: 'recruitment_invite', teamId: team.id || '', notificationId: saved.id || '' }
          })
        }).catch(() => null);
      }
      return res.json({ success: true, notification: { id: saved.id, ...content }, message: 'Convite enviado ao Correio do jogador.' });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });
}

module.exports = { registerFederationRoutes };
