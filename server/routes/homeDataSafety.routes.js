const storage = require('../storage');
const { callBot } = require('../services/botApi.service');
const { removeRoutes } = require('../utils/expressRoutes');
const { isVisibleCompetition, publicSeason, withSeasonCompetitions } = require('../services/season.service');

const CAFE_CHANNELS = ['league-cafe-com-leite-queue', 'cafe-com-leite-queue'];

function asArray(value, keys = []) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];
  for (const key of keys) if (Array.isArray(value[key])) return value[key];
  if (Array.isArray(value.data)) return value.data;
  if (Array.isArray(value.items)) return value.items;
  return [];
}

function num(value = 0) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalize(value = '') {
  return String(value || '').trim().toLowerCase();
}

function parseJson(message = {}) {
  try {
    const raw = String(message.content || '');
    if (raw.startsWith('RESULT_JSON:')) return JSON.parse(raw.slice('RESULT_JSON:'.length));
    return JSON.parse(raw || '{}');
  } catch {
    return null;
  }
}

function nameOf(user = {}) {
  return user?.profile?.username || user?.profile?.displayName || user?.name || user?.username || user?.discordId || 'Membro';
}

async function resultsSafe() {
  const raw = await storage.readChatMessages({ channelId: 'results-main', limit: 500 }).catch(() => []);
  return asArray(raw, ['messages', 'records']).map(parseJson).filter(Boolean);
}

function userKeys(user = {}) {
  return [user.id, user.discordId, user.name, user.profile?.username, user.profile?.displayName].map(normalize).filter(Boolean);
}

function stats(user = {}, participations = 0) {
  const base = user.playerStats || user.stats || {};
  return {
    points: num(base.cafePoints ?? base.points ?? base.vap) + participations,
    matches: num(base.cafeMatches ?? base.matches ?? base.played) + participations,
    wins: num(base.cafeWins ?? base.wins),
    goals: num(base.cafeGoals ?? base.goals),
    assists: num(base.cafeAssists ?? base.assists),
    passes: num(base.cafePasses ?? base.passes),
    mvp: num(base.cafeMvp ?? base.mvp)
  };
}

function registerHomeDataSafetyRoutes(app) {
  removeRoutes(app, [
    ['get', '/api/league/overview'],
    ['get', '/api/league/cafe-ranking']
  ]);

  app.get('/api/league/overview', async (_req, res) => {
    try {
      const [rawTeams, rawUsers, rawEvents, rawResults] = await Promise.all([
        storage.readTeams().catch(() => []),
        storage.readUsers().catch(() => []),
        storage.readEvents().catch(() => []),
        resultsSafe()
      ]);
      const teams = asArray(rawTeams, ['teams', 'clubs']);
      const users = asArray(rawUsers, ['users', 'players', 'members']);
      const events = asArray(rawEvents, ['events', 'competitions']);
      const results = asArray(rawResults, ['results', 'records']);
      const visibleEvents = withSeasonCompetitions(events.filter((event) => isVisibleCompetition(event)));
      const goals = results.reduce((sum, item) => sum + num(item.finalScoreA ?? item.scoreA) + num(item.finalScoreB ?? item.scoreB), 0);
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
        stats: {
          clubes: teams.length,
          jogadores: users.length,
          atletas: users.length,
          competicoes: visibleEvents.length,
          partidas: results.length,
          gols: goals
        },
        season: publicSeason(visibleEvents)
      });
    } catch (error) {
      console.error('[League Overview/Safe] Falha:', error);
      return res.json({
        success: true,
        namespace: 'league-safe-fallback',
        teams: [], clubs: [], players: [], users: [], events: [], nexusCup: null,
        stats: { clubes: 0, jogadores: 0, atletas: 0, competicoes: 0, partidas: 0, gols: 0 },
        season: publicSeason([])
      });
    }
  });

  app.get('/api/league/cafe-ranking', async (_req, res) => {
    try {
      const [rawUsers, rawGroups, discordData] = await Promise.all([
        storage.readUsers().catch(() => []),
        Promise.all(CAFE_CHANNELS.map((channelId) => storage.readChatMessages({ channelId, limit: 500 }).catch(() => []))),
        callBot('/internal/discord/members/all?limit=1000', { method: 'GET' }).catch(() => ({ members: [] }))
      ]);
      const users = asArray(rawUsers, ['users', 'players', 'members']).filter((user) => user && !user.deletedAt && !user.hiddenFromPlayersDirectory);
      const members = asArray(discordData, ['members', 'users']);
      const messages = asArray(rawGroups).flatMap((group) => asArray(group, ['messages', 'records']));
      const participation = new Map();
      messages.map(parseJson).filter(Boolean).filter((entry) => entry.status !== 'deleted').forEach((entry) => {
        [entry.userId, entry.discordId, entry.name].map(normalize).filter(Boolean).forEach((key) => participation.set(key, (participation.get(key) || 0) + 1));
      });

      const byDiscord = new Map(users.map((user) => [String(user.discordId || '').trim(), user]).filter(([id]) => id));
      const records = new Map();
      const upsert = (record = {}) => {
        const key = String(record.discordId || record.id || record.name || '').trim();
        if (!key) return;
        records.set(key, { ...(records.get(key) || {}), ...record });
      };

      members.forEach((member) => {
        const linked = byDiscord.get(String(member.id || member.discordId || '').trim()) || null;
        upsert({
          id: linked?.id || member.id || member.discordId || '',
          discordId: member.id || member.discordId || linked?.discordId || '',
          name: linked ? nameOf(linked) : (member.name || member.username || 'Membro'),
          avatar: linked?.avatar || member.avatar || '',
          roles: Array.isArray(member.roles) ? member.roles : [],
          registered: Boolean(linked),
          user: linked
        });
      });
      users.forEach((user) => upsert({ id: user.id || user.discordId || '', discordId: user.discordId || '', name: nameOf(user), avatar: user.avatar || '', roles: Array.isArray(user.roles) ? user.roles : [], registered: true, user }));

      const ranking = Array.from(records.values()).map((record) => {
        const keys = record.user ? userKeys(record.user) : [record.id, record.discordId, record.name].map(normalize).filter(Boolean);
        const participations = keys.reduce((best, key) => Math.max(best, participation.get(key) || 0), 0);
        return {
          id: record.id || '', discordId: record.discordId || '', name: record.name || 'Membro', avatar: record.avatar || '',
          roles: record.roles || [], registered: Boolean(record.registered), participations,
          ...stats(record.user || {}, participations),
          profileUrl: record.registered ? `/pages/perfil-jogador.html?id=${encodeURIComponent(record.id || record.discordId || '')}` : ''
        };
      }).sort((a, b) => b.points - a.points || b.goals - a.goals || b.passes - a.passes || String(a.name).localeCompare(String(b.name), 'pt-BR'));

      return res.json({ success: true, source: members.length ? 'discord-members-and-site' : 'site-users-fallback', memberCount: ranking.length, ranking, metrics: ['points', 'goals', 'passes', 'assists', 'wins', 'matches', 'mvp'] });
    } catch (error) {
      console.error('[Cafe Ranking/Safe] Falha:', error);
      return res.json({ success: true, source: 'safe-fallback', memberCount: 0, ranking: [], metrics: ['points', 'goals', 'passes', 'assists', 'wins', 'matches', 'mvp'] });
    }
  });

  console.log('[Home Data Safety] Overview e Café com Leite protegidos contra respostas 500.');
}

module.exports = { registerHomeDataSafetyRoutes };
