const storage = require('../storage');
const { callBot } = require('../services/botApi.service');
const { removeRoutes } = require('../utils/expressRoutes');

const CHANNELS = ['league-cafe-com-leite-queue', 'cafe-com-leite-queue'];

function number(value = 0) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalize(value = '') {
  return String(value || '').trim().toLowerCase();
}

function nameOf(user = {}) {
  return user?.profile?.username || user?.profile?.displayName || user?.name || user?.username || user?.discordId || 'Membro';
}

function parseMessage(message = {}) {
  try { return JSON.parse(message.content || '{}'); }
  catch { return null; }
}

function statistics(user = {}, participations = 0) {
  const base = user.playerStats || user.stats || {};
  return {
    points: number(base.cafePoints ?? base.points ?? base.vap) + participations,
    matches: number(base.cafeMatches ?? base.matches ?? base.played) + participations,
    wins: number(base.cafeWins ?? base.wins),
    goals: number(base.cafeGoals ?? base.goals),
    assists: number(base.cafeAssists ?? base.assists),
    passes: number(base.cafePasses ?? base.passes),
    mvp: number(base.cafeMvp ?? base.mvp)
  };
}

function participationKeys(entry = {}) {
  return [entry.userId, entry.discordId, entry.name].map(normalize).filter(Boolean);
}

function userKeys(user = {}) {
  return [user.id, user.discordId, user.name, user.profile?.username, user.profile?.displayName].map(normalize).filter(Boolean);
}

function registerCafeRankingRoutes(app) {
  removeRoutes(app, [['get', '/api/league/cafe-ranking']]);

  app.get('/api/league/cafe-ranking', async (_req, res) => {
    const [users, messageGroups, discordData] = await Promise.all([
      storage.readUsers().catch(() => []),
      Promise.all(CHANNELS.map((channelId) => storage.readChatMessages({ channelId, limit: 500 }).catch(() => []))),
      callBot('/internal/discord/mentions', { method: 'GET' }).catch(() => ({ members: [] }))
    ]);

    const activeUsers = users.filter((user) => !user.deletedAt && !user.hiddenFromPlayersDirectory);
    const byDiscord = new Map(activeUsers.map((user) => [String(user.discordId || '').trim(), user]).filter(([id]) => id));
    const participants = new Map();

    messageGroups.flat().map(parseMessage).filter(Boolean).filter((entry) => entry.status !== 'deleted').forEach((entry) => {
      participationKeys(entry).forEach((key) => participants.set(key, Math.max(1, (participants.get(key) || 0) + 1)));
    });

    const records = new Map();
    const upsert = (raw = {}) => {
      const key = String(raw.discordId || raw.id || raw.name || '').trim();
      if (!key) return;
      const current = records.get(key) || {};
      records.set(key, { ...current, ...raw });
    };

    (Array.isArray(discordData.members) ? discordData.members : []).forEach((member) => {
      const linked = byDiscord.get(String(member.id || '').trim()) || null;
      upsert({
        id: linked?.id || member.id || '',
        discordId: member.id || linked?.discordId || '',
        name: linked ? nameOf(linked) : (member.name || member.username || 'Membro'),
        avatar: linked?.avatar || member.avatar || '',
        profile: linked?.profile || {},
        registered: Boolean(linked),
        user: linked
      });
    });

    activeUsers.forEach((user) => upsert({
      id: user.id || user.discordId || '',
      discordId: user.discordId || '',
      name: nameOf(user),
      avatar: user.avatar || '',
      profile: user.profile || {},
      registered: true,
      user
    }));

    const ranking = Array.from(records.values()).map((record) => {
      const keys = record.user ? userKeys(record.user) : [record.discordId, record.id, record.name].map(normalize).filter(Boolean);
      const participations = keys.reduce((best, key) => Math.max(best, participants.get(key) || 0), 0);
      return {
        id: record.id || '',
        discordId: record.discordId || '',
        name: record.name || 'Membro',
        avatar: record.avatar || '',
        profile: record.profile || {},
        registered: Boolean(record.registered),
        participations,
        ...statistics(record.user || {}, participations),
        profileUrl: record.registered ? `/pages/perfil-jogador.html?id=${encodeURIComponent(record.id || record.discordId || '')}` : ''
      };
    }).sort((a, b) => b.points - a.points || b.goals - a.goals || b.passes - a.passes || String(a.name).localeCompare(String(b.name), 'pt-BR'));

    return res.json({
      success: true,
      source: discordData.members?.length ? 'discord-members-and-site' : 'site-users-fallback',
      ranking,
      metrics: ['points', 'goals', 'passes', 'assists', 'wins', 'matches', 'mvp']
    });
  });

  console.log('[Cafe com Leite] Ranking de membros do Discord registrado.');
}

module.exports = { registerCafeRankingRoutes };
