const storage = require('../storage');
const { isVisibleCompetition, publicSeason, withSeasonCompetitions } = require('../services/season.service');

function asArray(value, keys = []) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];
  for (const key of keys) if (Array.isArray(value[key])) return value[key];
  if (Array.isArray(value.data)) return value.data;
  if (Array.isArray(value.items)) return value.items;
  return [];
}

function number(value = 0) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function nameOf(user = {}) {
  return user?.profile?.username || user?.profile?.displayName || user?.displayName || user?.name || user?.username || user?.discordId || 'Membro';
}

function parseResult(message = {}) {
  try {
    const raw = String(message.content || '');
    if (!raw.startsWith('RESULT_JSON:')) return null;
    return JSON.parse(raw.slice('RESULT_JSON:'.length));
  } catch {
    return null;
  }
}

async function overview(_req, res) {
  try {
    const [rawTeams, rawUsers, rawEvents, rawMessages] = await Promise.all([
      storage.readTeams().catch(() => []),
      storage.readUsers().catch(() => []),
      storage.readEvents().catch(() => []),
      storage.readChatMessages({ channelId: 'results-main', limit: 500 }).catch(() => [])
    ]);
    const teams = asArray(rawTeams, ['teams', 'clubs']);
    const users = asArray(rawUsers, ['users', 'players', 'members']).filter((user) => user && !user.deletedAt);
    const events = asArray(rawEvents, ['events', 'competitions']);
    const messages = asArray(rawMessages, ['messages', 'records']);
    const results = messages.map(parseResult).filter(Boolean);
    const visibleEvents = withSeasonCompetitions(events.filter((event) => isVisibleCompetition(event)));
    const goals = results.reduce((sum, item) => sum + number(item.finalScoreA ?? item.scoreA) + number(item.finalScoreB ?? item.scoreB), 0);
    return res.status(200).json({
      success: true,
      namespace: 'league-front-guard',
      teams,
      clubs: teams,
      players: users,
      users,
      events: visibleEvents,
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
    console.error('[Critical Public Data Guard] overview:', error);
    return res.status(200).json({
      success: true,
      namespace: 'league-front-guard-fallback',
      teams: [], clubs: [], players: [], users: [], events: [],
      stats: { clubes: 0, jogadores: 0, atletas: 0, competicoes: 0, partidas: 0, gols: 0 },
      season: publicSeason([])
    });
  }
}

async function cafeRanking(_req, res) {
  try {
    const rawUsers = await storage.readUsers().catch(() => []);
    const users = asArray(rawUsers, ['users', 'players', 'members']).filter((user) => user && !user.deletedAt && !user.hiddenFromPlayersDirectory);
    const ranking = users.map((user) => {
      const stats = user.playerStats || user.stats || {};
      return {
        id: user.id || user.discordId || '',
        discordId: user.discordId || '',
        name: nameOf(user),
        avatar: user.avatar || user.profile?.avatar || '',
        registered: true,
        points: number(stats.cafePoints ?? stats.points ?? stats.vap),
        matches: number(stats.cafeMatches ?? stats.matches ?? stats.played),
        wins: number(stats.cafeWins ?? stats.wins),
        goals: number(stats.cafeGoals ?? stats.goals),
        assists: number(stats.cafeAssists ?? stats.assists),
        passes: number(stats.cafePasses ?? stats.passes),
        mvp: number(stats.cafeMvp ?? stats.mvp),
        profileUrl: `/pages/perfil-jogador.html?id=${encodeURIComponent(user.id || user.discordId || '')}`
      };
    }).sort((a, b) => b.points - a.points || b.goals - a.goals || b.assists - a.assists || String(a.name).localeCompare(String(b.name), 'pt-BR'));
    return res.status(200).json({
      success: true,
      source: 'site-users-front-guard',
      memberCount: ranking.length,
      ranking,
      metrics: ['points', 'goals', 'passes', 'assists', 'wins', 'matches', 'mvp']
    });
  } catch (error) {
    console.error('[Critical Public Data Guard] cafe-ranking:', error);
    return res.status(200).json({ success: true, source: 'front-guard-fallback', memberCount: 0, ranking: [], metrics: ['points', 'goals', 'passes', 'assists', 'wins', 'matches', 'mvp'] });
  }
}

function registerCriticalPublicDataGuard(app) {
  const guard = (req, res, next) => {
    if (req.method === 'GET' && req.path === '/api/league/overview') return overview(req, res);
    if (req.method === 'GET' && req.path === '/api/league/cafe-ranking') return cafeRanking(req, res);
    return next();
  };

  app.use(guard);

  const stack = app?._router?.stack;
  if (Array.isArray(stack) && stack.length) {
    const layer = stack.pop();
    stack.unshift(layer);
  }

  console.log('[Critical Public Data Guard] overview/cafe-ranking protegidos antes das rotas legadas.');
}

module.exports = { registerCriticalPublicDataGuard };
