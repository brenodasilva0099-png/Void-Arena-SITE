const crypto = require('node:crypto');
const storage = require('../storage');
const { getSessionUser, isAdminRecord } = require('../services/access.service');
const { callBot } = require('../services/botApi.service');
const { removeRoutes } = require('../utils/expressRoutes');

const RANKING_CHANNEL = 'league-ranking-settings';
const LEGACY_RANKING_CHANNEL = 'frm-ranking-settings';
const NOTIFICATION_CHANNEL = 'user-notifications';
const ANNOUNCEMENT_CHANNEL = 'site-announcements';
const CAFE_CHANNEL = 'league-cafe-com-leite-queue';
const LEGACY_CAFE_CHANNEL = 'cafe-com-leite-queue';
const DEFAULT_LOGO = '/assets/hollow-nexus.png';

function requireSession(req, res, next) {
  if (!req.session?.userId) return res.status(401).json({ success: false, message: 'Faça login para continuar.' });
  return next();
}

function clean(value = '', max = 500) {
  return String(value || '').trim().slice(0, max);
}

function nameOf(user = {}) {
  return user?.profile?.username || user?.profile?.displayName || user?.name || user?.username || user?.discordId || 'Jogador';
}

function teamName(team = {}) {
  return team?.name || team?.teamName || team?.tag || 'Clube';
}

function parseStoredJson(message = {}) {
  try { return { id: message.id, createdAt: message.createdAt, updatedAt: message.updatedAt, ...JSON.parse(message.content || '{}') }; }
  catch { return null; }
}

function isVisibleStatus(item = {}) {
  return !['deleted', 'hidden', 'archived'].includes(String(item.status || '').toLowerCase());
}

function publicSiteUrl(req) {
  return String(process.env.CANONICAL_SITE_URL || process.env.SITE_PUBLIC_URL || process.env.PUBLIC_SITE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
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

async function readRankingSettings() {
  const [current, legacy] = await Promise.all([
    storage.readChatMessages({ channelId: RANKING_CHANNEL, limit: 400 }).catch(() => []),
    storage.readChatMessages({ channelId: LEGACY_RANKING_CHANNEL, limit: 400 }).catch(() => [])
  ]);
  const settings = {};
  [...legacy, ...current].map(parseStoredJson).filter(Boolean).forEach((item) => {
    if (!item.targetType || !item.targetId) return;
    settings[`${item.targetType}:${item.targetId}`] = item;
  });
  return settings;
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

async function canManageTeam(user = {}, team = {}) {
  if (!user) return false;
  if (await isAdminRecord(user)) return true;
  return String(team.ownerUserId || '') === String(user.id || '')
    || String(team.captainUserId || '') === String(user.id || '')
    || String(team.captainDiscordId || '') === String(user.discordId || '')
    || String(team.directorUserId || '') === String(user.id || '')
    || String(team.directorDiscordId || '') === String(user.discordId || '');
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

async function findNotificationById(id = '') {
  const messages = await storage.readChatMessages({ channelId: NOTIFICATION_CHANNEL, limit: 250 }).catch(() => []);
  const raw = messages.find((message) => String(message.id || '') === String(id || '')) || null;
  if (!raw) return { raw: null, invite: null };
  return { raw, invite: parseStoredJson(raw) };
}

function inviteSecret() {
  return process.env.SITE_INVITE_ACTION_SECRET || process.env.SESSION_SECRET || process.env.INTERNAL_API_TOKEN || 'hollow-nexus-league-invite-action-dev';
}

function inviteToken(rawMessage = {}, invite = {}) {
  const payload = [rawMessage.id || invite.id || '', invite.targetUserId || invite.userId || '', invite.targetDiscordId || '', invite.createdAt || rawMessage.createdAt || ''].join('|');
  return crypto.createHmac('sha256', inviteSecret()).update(payload).digest('hex').slice(0, 32);
}

function responseHtml(title, message) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#02040a;color:#fff;font-family:Inter,system-ui,sans-serif}.card{max-width:620px;padding:32px;border:1px solid rgba(139,92,246,.35);border-radius:18px;background:rgba(7,12,25,.9);box-shadow:0 0 48px rgba(139,92,246,.18)}a{color:#c084fc}</style></head><body><main class="card"><h1>${title}</h1><p>${message}</p><p><a href="/pages/correio.html">Abrir Correio</a> · <a href="/pages/dashboard.html">Voltar ao site</a></p></main></body></html>`;
}

async function resolveBrand() {
  const data = await callBot('/public/guild-brand', { method: 'GET' }).catch(() => null);
  const guild = data?.guild || {};
  return {
    id: clean(guild.id || ''),
    name: clean(guild.name || process.env.LEAGUE_NAME || 'the Hollow Nexus League'),
    icon: clean(guild.icon || process.env.LEAGUE_LOGO_URL || process.env.PUBLIC_LOGO_URL || '')
  };
}

function registerLeagueRoutes(app) {
  removeRoutes(app, [
    ['get', '/api/brand'],
    ['get', '/api/brand/icon'],
    ['get', '/api/brand/logo'],
    ['get', '/api/league/overview'],
    ['get', '/api/league/news'],
    ['get', '/api/league/ranking-settings'],
    ['post', '/api/league/ranking-settings'],
    ['post', '/api/league/clubs'],
    ['post', '/api/league/transfers'],
    ['post', '/api/league/team-invites'],
    ['get', '/api/league/team-invites/respond'],
    ['get', '/api/league/cafe-com-leite'],
    ['post', '/api/league/cafe-com-leite/queue']
  ]);

  app.get('/api/brand', async (_req, res) => {
    const brand = await resolveBrand();
    return res.json({ success: true, brand, logo: brand.icon || DEFAULT_LOGO, icon: brand.icon || DEFAULT_LOGO });
  });

  app.get('/api/brand/icon', async (_req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const brand = await resolveBrand();
    if (/^https?:\/\//i.test(brand.icon)) return res.redirect(302, brand.icon);
    return res.redirect(302, DEFAULT_LOGO);
  });

  app.get('/api/brand/logo', async (req, res) => app._router.handle({ ...req, url: '/api/brand/icon', originalUrl: '/api/brand/icon' }, res, () => res.redirect(DEFAULT_LOGO)));

  app.get('/api/league/overview', async (_req, res) => {
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
        namespace: 'league',
        teams,
        clubs: teams,
        players: users,
        users,
        events: visibleEvents,
        nexusCup,
        stats: { clubes: teams.length, jogadores: users.length, atletas: users.length, competicoes: visibleEvents.length, partidas: results.length, gols: goals },
        season: {
          name: 'Temporada 1 - 2026',
          startAt: nexusCup?.startAt || null,
          endAt: nexusCup?.endAt || nexusCup?.registrationDeadline || nexusCup?.registrationCloseAt || null
        }
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message, teams: [], clubs: [], players: [], users: [], events: [], stats: { clubes: 0, jogadores: 0, atletas: 0, competicoes: 0, partidas: 0, gols: 0 } });
    }
  });

  app.get('/api/league/news', async (_req, res) => {
    const messages = await storage.readChatMessages({ channelId: ANNOUNCEMENT_CHANNEL, limit: 50 }).catch(() => []);
    const news = messages.map(parseStoredJson).filter(Boolean).filter(isVisibleStatus).reverse().slice(0, 8);
    return res.json({ success: true, news });
  });

  app.get('/api/league/ranking-settings', requireSession, async (_req, res) => {
    const settings = await readRankingSettings();
    return res.json({ success: true, settings });
  });

  app.post('/api/league/ranking-settings', requireSession, async (req, res) => {
    try {
      const viewer = await getSessionUser(req);
      if (!(await isAdminRecord(viewer))) return res.status(403).json({ success: false, message: 'Apenas admin pode editar ranking.' });
      const targetType = clean(req.body?.targetType, 40);
      const targetId = clean(req.body?.targetId, 120);
      if (!['club', 'player'].includes(targetType) || !targetId) return res.status(400).json({ success: false, message: 'Alvo inválido.' });
      const payload = {
        type: 'ranking_setting', targetType, targetId,
        points: Number(req.body?.points || 0) || 0,
        wins: Number(req.body?.wins || 0) || 0,
        losses: Number(req.body?.losses || 0) || 0,
        goals: Number(req.body?.goals || 0) || 0,
        updatedBy: viewer.id || '', updatedByName: nameOf(viewer), updatedAt: new Date().toISOString()
      };
      const saved = await storage.saveChatMessage({ channelId: RANKING_CHANNEL, source: 'system', authorId: viewer.id || '', authorName: nameOf(viewer), content: JSON.stringify(payload), attachments: [], createdAt: payload.updatedAt });
      return res.json({ success: true, setting: { id: saved.id, ...payload } });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

  app.post('/api/league/clubs', requireSession, async (req, res) => {
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
        ownerUserId: viewer.id || '', ownerName: nameOf(viewer), ownerDiscordId: viewer.discordId || '', ownerAvatar: viewer.avatar || '',
        captainUserId: viewer.id || '', captainName: nameOf(viewer), captainDiscordId: viewer.discordId || '',
        directorUserId: viewer.id || '', directorName: nameOf(viewer), directorDiscordId: viewer.discordId || '',
        players: [nameOf(viewer)], playerDetails: [{ id: viewer.id || '', userId: viewer.id || '', name: nameOf(viewer), discordId: viewer.discordId || '', avatar: viewer.avatar || '', type: 'player', isCaptain: true, acceptedAt: now }],
        reserves: [], reserveDetails: [], playerAccounts: { players: viewer.discordId ? [viewer.discordId] : [], reserves: [] },
        status: 'participating', createdAt: now, updatedAt: now
      });
      return res.json({ success: true, team, club: team });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

  app.post('/api/league/team-invites', requireSession, async (req, res) => {
    try {
      const viewer = await getSessionUser(req);
      const [teams, users] = await Promise.all([storage.readTeams().catch(() => []), storage.readUsers().catch(() => [])]);
      const team = teams.find((item) => String(item.id || '') === String(req.body?.teamId || ''));
      const target = users.find((user) => String(user.id || '') === String(req.body?.playerId || '') || String(user.discordId || '') === String(req.body?.playerId || ''));
      if (!team || !target) return res.status(404).json({ success: false, message: 'Clube ou jogador não encontrado.' });
      if (!(await canManageTeam(viewer, team))) return res.status(403).json({ success: false, message: 'Apenas capitão/diretor/admin do clube pode convidar jogadores.' });
      const payload = {
        type: 'recruitment_invite', status: 'pending', teamId: team.id || '', team: { id: team.id || '', name: teamName(team), tag: team.tag || '' },
        targetUserId: target.id || '', targetDiscordId: target.discordId || '', targetName: nameOf(target), targetAvatar: target.avatar || '',
        sender: { id: viewer.id || '', name: nameOf(viewer), discordId: viewer.discordId || '' },
        rosterSlot: clean(req.body?.rosterSlot || req.body?.slot || 'player', 40), note: clean(req.body?.note, 400), createdAt: new Date().toISOString(), siteUrl: publicSiteUrl(req)
      };
      const saved = await storage.saveChatMessage({ channelId: NOTIFICATION_CHANNEL, source: 'site', authorId: viewer.id || '', authorName: nameOf(viewer), content: JSON.stringify(payload), attachments: [], createdAt: payload.createdAt });
      const token = inviteToken(saved, payload);
      const actionBase = `${publicSiteUrl(req)}/api/league/team-invites/respond?id=${encodeURIComponent(saved.id)}`;
      if (target.discordId) {
        callBot('/internal/discord/message-player', {
          method: 'POST',
          body: JSON.stringify({
            discordId: target.discordId,
            content: `📨 Você recebeu um convite para entrar no clube **${teamName(team)}** da Hollow Nexus League.\nAceitar: ${actionBase}&action=accept&token=${token}\nRecusar: ${actionBase}&action=decline&token=${token}`,
            meta: { type: 'league_recruitment_invite', notificationId: saved.id || '' }
          })
        }).catch(() => null);
      }
      return res.json({ success: true, invite: { id: saved.id, ...payload, token } });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

  app.get('/api/league/team-invites/respond', async (req, res) => {
    try {
      const action = String(req.query.action || '').trim().toLowerCase();
      if (!['accept', 'decline'].includes(action)) throw new Error('Ação inválida.');
      const { raw, invite } = await findNotificationById(req.query.id);
      if (!raw || !invite) throw new Error('Convite não encontrado.');
      if (invite.type !== 'recruitment_invite') throw new Error('Esta notificação não é um convite de recrutamento.');
      if (String(invite.status || 'pending') !== 'pending') return res.send(responseHtml('Convite já respondido', 'Esse convite já tinha sido respondido.'));
      if (inviteToken(raw, invite) !== String(req.query.token || '')) throw new Error('Token do convite inválido ou expirado.');
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
      await storage.updateChatMessage(raw.id, { content: JSON.stringify(next) }, { channelId: NOTIFICATION_CHANNEL });
      return res.send(responseHtml(action === 'accept' ? 'Convite aceito' : 'Convite recusado', action === 'accept' ? 'Você entrou no elenco do clube.' : 'O capitão foi avisado da recusa.'));
    } catch (error) {
      return res.status(400).send(responseHtml('Erro no convite', error.message));
    }
  });

  app.post('/api/league/transfers', requireSession, async (req, res) => {
    try {
      const viewer = await getSessionUser(req);
      const [teams, users] = await Promise.all([storage.readTeams().catch(() => []), storage.readUsers().catch(() => [])]);
      const fromTeam = teams.find((team) => String(team.id || '') === String(req.body?.fromTeamId || ''));
      const toTeam = teams.find((team) => String(team.id || '') === String(req.body?.toTeamId || ''));
      const player = users.find((user) => String(user.id || '') === String(req.body?.playerId || '') || String(user.discordId || '') === String(req.body?.playerId || ''));
      if (!fromTeam || !toTeam || !player) return res.status(404).json({ success: false, message: 'Clube ou jogador não encontrado.' });
      if (!(await canManageTeam(viewer, toTeam)) && !(await isAdminRecord(viewer))) return res.status(403).json({ success: false, message: 'Apenas capitão/diretor/admin do clube de destino pode solicitar transferência.' });
      const payload = { type: 'transfer_request', status: 'pending', fromTeam: { id: fromTeam.id, name: teamName(fromTeam) }, toTeam: { id: toTeam.id, name: teamName(toTeam) }, player: { id: player.id || '', name: nameOf(player), discordId: player.discordId || '', avatar: player.avatar || '' }, requestedBy: { id: viewer.id || '', name: nameOf(viewer) }, createdAt: new Date().toISOString(), note: clean(req.body?.note, 400) };
      const saved = await storage.saveChatMessage({ channelId: 'league-transfer-requests', source: 'system', authorId: viewer.id || '', authorName: nameOf(viewer), content: JSON.stringify(payload), attachments: [], createdAt: payload.createdAt });
      return res.json({ success: true, transfer: { id: saved.id, ...payload } });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

  app.get('/api/league/cafe-com-leite', requireSession, async (_req, res) => {
    const [current, legacy] = await Promise.all([
      storage.readChatMessages({ channelId: CAFE_CHANNEL, limit: 200 }).catch(() => []),
      storage.readChatMessages({ channelId: LEGACY_CAFE_CHANNEL, limit: 200 }).catch(() => [])
    ]);
    const queue = [...legacy, ...current].map(parseStoredJson).filter(Boolean).filter((item) => item.status !== 'deleted').reverse();
    const rankingMap = new Map();
    queue.forEach((item) => {
      const key = item.userId || item.discordId || item.name;
      const prev = rankingMap.get(key) || { ...item, matches: 0, points: 0 };
      prev.matches += 1;
      prev.points += 1;
      rankingMap.set(key, prev);
    });
    return res.json({ success: true, queue, ranking: Array.from(rankingMap.values()).sort((a, b) => b.points - a.points) });
  });

  app.post('/api/league/cafe-com-leite/queue', requireSession, async (req, res) => {
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
}

module.exports = { registerLeagueRoutes };
