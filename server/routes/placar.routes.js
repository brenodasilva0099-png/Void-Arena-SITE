const { callBot } = require('../services/botApi.service');

const MODES = ['3v3', '5v5'];

function number(value = 0) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function discordIdOf(record = {}) {
  return String(record.discordId || record.id || '').trim();
}

function normalizeRoles(rawRoles = []) {
  return (Array.isArray(rawRoles) ? rawRoles : [])
    .map((role) => typeof role === 'string' ? { id: '', name: role } : {
      id: String(role?.id || ''),
      name: String(role?.name || '').trim(),
      color: role?.color || null
    })
    .filter((role) => role.name && role.name !== '@everyone');
}

function lowestRank(ranks = []) {
  const list = Array.isArray(ranks) ? ranks : [];
  return list.reduce((lowest, rank) => {
    if (!lowest) return rank;
    return number(rank?.min) < number(lowest?.min) ? rank : lowest;
  }, null) || { key: 'initial', name: 'Inicial', emoji: '•' };
}

function emptyStats() {
  return {
    points: 0,
    matches: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goals: 0,
    assists: 0,
    defenses: 0,
    interceptions: 0,
    passes: 0,
    mvp: 0,
    cleanSheets: 0,
    noShows: 0,
    winRate: 0
  };
}

function completeLeaderboard(players = [], members = [], ranks = []) {
  const initialRank = lowestRank(ranks);
  const scoreByDiscord = new Map();
  (Array.isArray(players) ? players : []).forEach((player) => {
    const id = discordIdOf(player);
    if (id) scoreByDiscord.set(id, player);
  });

  const complete = [];
  const included = new Set();
  (Array.isArray(members) ? members : []).forEach((member) => {
    const discordId = discordIdOf(member);
    if (!discordId || included.has(discordId)) return;
    const score = scoreByDiscord.get(discordId) || {};
    const roles = normalizeRoles(member.roles);
    const lastActivityAt = score.lastMatchAt || score.updatedAt || null;
    complete.push({
      ...emptyStats(),
      ...score,
      id: score.id || discordId,
      discordId,
      name: member.name || member.username || score.name || 'Membro',
      username: member.username || score.username || '',
      avatar: member.avatar || score.avatar || '',
      roles,
      roleNames: roles.map((role) => role.name),
      primaryRole: roles[0]?.name || 'Sem cargo',
      rankKey: score.rankKey || initialRank.key || 'initial',
      rankName: score.rankName || initialRank.name || 'Inicial',
      rankEmoji: score.rankEmoji || initialRank.emoji || '•',
      lastActivityAt,
      hasPlayed: number(score.matches) > 0 || number(score.points) !== 0
    });
    included.add(discordId);
  });

  scoreByDiscord.forEach((score, discordId) => {
    if (included.has(discordId)) return;
    const roles = normalizeRoles(score.roles);
    complete.push({
      ...emptyStats(),
      ...score,
      id: score.id || discordId,
      discordId,
      roles,
      roleNames: roles.map((role) => role.name),
      primaryRole: score.primaryRole || roles[0]?.name || 'Sem cargo',
      lastActivityAt: score.lastMatchAt || score.updatedAt || null,
      hasPlayed: number(score.matches) > 0 || number(score.points) !== 0
    });
  });

  return complete.sort((a, b) => number(b.points) - number(a.points)
    || String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR', { sensitivity: 'base' }));
}

async function loadCompleteScoreboard() {
  const [scoreboard, membersResult] = await Promise.all([
    callBot('/internal/placar', { method: 'GET' }),
    callBot('/internal/discord/members/all?limit=1000', { method: 'GET' })
      .then((data) => ({ data, error: null }))
      .catch((error) => ({ data: { members: [] }, error: error.message }))
  ]);
  const members = Array.isArray(membersResult.data?.members) ? membersResult.data.members : [];
  const leaderboards = {};
  MODES.forEach((mode) => {
    leaderboards[mode] = completeLeaderboard(scoreboard.leaderboards?.[mode], members, scoreboard.ranks);
  });
  return {
    ...scoreboard,
    leaderboards,
    serverMembersCount: members.length || Math.max(...MODES.map((mode) => leaderboards[mode].length), 0),
    membersSource: members.length ? 'discord-server' : 'scoreboard-fallback',
    membersWarning: membersResult.error || null
  };
}

function requireSession(req, res, next) {
  if (!req.session?.userId) return res.status(401).json({ success: false, message: 'Faça login para continuar.' });
  return next();
}

function registerPlacarRoutes(app) {
  app.get('/api/placar', requireSession, async (_req, res) => {
    try {
      const data = await loadCompleteScoreboard();
      return res.json(data);
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message, leaderboards: { '3v3': [], '5v5': [] }, queues: { '3v3': [], '5v5': [] }, matches: [] });
    }
  });

  app.get('/api/placar/:mode', requireSession, async (req, res) => {
    try {
      const mode = String(req.params.mode || '3v3').trim().toLowerCase().replace('x', 'v');
      if (!MODES.includes(mode)) return res.status(400).json({ success: false, message: 'Modo inválido. Use 3v3 ou 5v5.' });
      const data = await loadCompleteScoreboard();
      return res.json({
        success: data.success !== false,
        mode,
        players: data.leaderboards?.[mode] || [],
        queue: data.queues?.[mode] || [],
        ranks: data.ranks || [],
        serverMembersCount: data.serverMembersCount,
        membersSource: data.membersSource,
        membersWarning: data.membersWarning
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message, players: [] });
    }
  });
}

module.exports = { registerPlacarRoutes, completeLeaderboard, loadCompleteScoreboard };
