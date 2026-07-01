const storage = require('../storage');
const { callBot, fetchGuildBrand } = require('../services/botApi.service');
const { requireOwner, getSessionUser, isOwnerRecord } = require('../services/access.service');
const {
  normalizeTeamLimit,
  normalizeBracketData,
  normalizeBracketForResponse,
  generateBracketSlots,
  generateAdaptiveBracket,
  generateGroups,
  sanitizeTeam,
  nextTargetForSlotMatch
} = require('../services/bracket.service');

const RESULT_CHANNEL = 'results-main';

function requireSession(req, res, next) {
  if (!req.session?.userId) return res.status(401).json({ success: false, message: 'Faça login para continuar.' });
  return next();
}

async function readUsersSafe() {
  return storage.readUsers().catch(() => []);
}

async function syncResultHubs(bracket, settings) {
  return callBot('/internal/results/sync-hubs', {
    method: 'POST',
    body: JSON.stringify({ bracket, settings, source: 'site-organized-routes' })
  }).catch((error) => ({ success: false, message: error.message, created: 0, reused: 0, errors: [{ message: error.message }] }));
}

function parseResultRecord(message = {}) {
  try {
    const raw = String(message.content || '');
    if (!raw.startsWith('RESULT_JSON:')) return null;
    const result = JSON.parse(raw.slice('RESULT_JSON:'.length));
    return { ...result, messageId: message.id, createdAt: result.createdAt || message.createdAt, updatedAt: message.updatedAt || message.createdAt };
  } catch {
    return null;
  }
}

async function readResultRecords() {
  const messages = await storage.readChatMessages({ channelId: RESULT_CHANNEL, limit: 500 });
  return messages.map(parseResultRecord).filter(Boolean);
}

function splitDiscordId(value = '') {
  const raw = String(value || '').trim();
  const mention = raw.match(/^<@!?(\d+)>$/);
  if (mention) return mention[1];
  if (/^\d{16,22}$/.test(raw)) return raw;
  return '';
}

function userDisplay(user = {}) {
  return user?.profile?.username || user?.name || user?.discordId || 'Jogador';
}

function publicUser(user = {}) {
  return {
    id: user.id,
    name: user.name,
    discordId: user.discordId || null,
    avatar: user.avatar || null,
    profile: user.profile || {},
    socials: user.socials || {},
    provider: user.provider || 'login',
    createdAt: user.createdAt || null,
    updatedAt: user.updatedAt || null
  };
}

function enrichTeam(team = {}, users = []) {
  const usersById = new Map(users.map((user) => [String(user.id || ''), user]));
  const usersByDiscord = new Map(users.map((user) => [String(user.discordId || ''), user]).filter(([id]) => id));
  const owner = usersById.get(String(team.ownerUserId || '')) || null;
  const safe = sanitizeTeam(team, usersById);
  const mapPlayer = (name, account, type, index) => {
    const discordId = splitDiscordId(account || name);
    const user = discordId ? usersByDiscord.get(discordId) : usersById.get(String(account || ''));
    return {
      id: user?.id || '',
      name: String(name || userDisplay(user) || `Jogador ${index + 1}`).trim(),
      account: String(account || '').trim(),
      discordId: user?.discordId || discordId || '',
      avatar: user?.avatar || '',
      profile: user?.profile || {},
      type,
      isCaptain: Boolean(owner && user && String(owner.id) === String(user.id)) || (!owner && index === 0 && type === 'player')
    };
  };
  const accounts = team.playerAccounts || {};
  const players = (Array.isArray(team.players) ? team.players : []).map((item, index) => mapPlayer(item, accounts.players?.[index] || '', 'player', index));
  const reserves = (Array.isArray(team.reserves) ? team.reserves : []).map((item, index) => mapPlayer(item, accounts.reserves?.[index] || '', 'reserve', index));
  return {
    ...safe,
    ownerName: owner ? userDisplay(owner) : (safe.ownerName || safe.captainName || players.find((p) => p.isCaptain)?.name || 'não definido'),
    ownerAvatar: owner?.avatar || safe.ownerAvatar || '',
    captainName: owner ? userDisplay(owner) : (safe.captainName || players.find((p) => p.isCaptain)?.name || 'não definido'),
    captainDiscordId: owner?.discordId || players.find((p) => p.isCaptain)?.discordId || '',
    playerDetails: players,
    reserveDetails: reserves
  };
}


function resultMaxGames(match = {}) {
  const format = String(match.matchFormat || '').trim();
  const found = format.match(/MD(\d+)/i);
  const number = found ? Number(found[1]) || 1 : Number(match.maxGames || 1) || 1;
  return Math.max(1, Math.min(9, number));
}

function resultWinsNeeded(bestOf = 1) {
  const n = Number(bestOf || 1) || 1;
  return n % 2 === 0 ? Math.floor(n / 2) + 1 : Math.floor(n / 2) + 1;
}

function scoreWinnerFromScore(match = {}, scoreA = 0, scoreB = 0) {
  const teamAId = String(match?.teamA?.id || '').trim();
  const teamBId = String(match?.teamB?.id || '').trim();
  if (Number(scoreA) > Number(scoreB)) return teamAId;
  if (Number(scoreB) > Number(scoreA)) return teamBId;
  return '';
}

function normalizeSeriesSubmission(payload = {}) {
  return {
    authorDiscordId: String(payload.authorDiscordId || '').trim(),
    authorName: String(payload.authorName || 'Capitão').trim().slice(0, 120),
    scoreA: Number(payload.scoreA || 0) || 0,
    scoreB: Number(payload.scoreB || 0) || 0,
    proof: payload.proof || null,
    isStaff: Boolean(payload.isStaff),
    createdAt: payload.createdAt || new Date().toISOString()
  };
}

function computeGameStatus(game = {}, match = {}) {
  const submissions = Array.isArray(game.submissions) ? game.submissions : [];
  const staff = submissions.find((item) => item.isStaff);
  if (staff) return { status: 'validated', final: staff, winnerTeamId: scoreWinnerFromScore(match, staff.scoreA, staff.scoreB) };
  const captains = submissions.filter((item) => item.authorDiscordId);
  if (captains.length >= 2) {
    const a = captains[captains.length - 2];
    const b = captains[captains.length - 1];
    const same = Number(a.scoreA) === Number(b.scoreA) && Number(a.scoreB) === Number(b.scoreB);
    return same ? { status: 'validated', final: b, winnerTeamId: scoreWinnerFromScore(match, b.scoreA, b.scoreB) } : { status: 'conflict', final: null, winnerTeamId: '' };
  }
  return { status: 'pending', final: submissions[submissions.length - 1] || null, winnerTeamId: '' };
}

function recomputeSeries(result = {}) {
  const match = result.match || {};
  const bestOf = resultMaxGames(match);
  const needed = resultWinsNeeded(bestOf);
  const teamAId = String(match?.teamA?.id || '').trim();
  const teamBId = String(match?.teamB?.id || '').trim();
  const games = (Array.isArray(result.games) ? result.games : [])
    .map((game) => ({ ...game, gameNumber: Math.max(1, Math.min(bestOf, Number(game.gameNumber || 1) || 1)), submissions: Array.isArray(game.submissions) ? game.submissions : [] }))
    .sort((a, b) => Number(a.gameNumber) - Number(b.gameNumber));
  let seriesScoreA = 0;
  let seriesScoreB = 0;
  let hasConflict = false;
  let lastProof = null;
  for (const game of games) {
    const computed = computeGameStatus(game, match);
    game.status = computed.status;
    game.updatedAt = new Date().toISOString();
    if (computed.final) {
      game.finalScoreA = Number(computed.final.scoreA || 0);
      game.finalScoreB = Number(computed.final.scoreB || 0);
      game.proof = computed.final.proof || game.proof || null;
      lastProof = game.proof || lastProof;
    }
    game.winnerTeamId = computed.winnerTeamId || '';
    if (game.status === 'validated') {
      if (game.winnerTeamId === teamAId) seriesScoreA += 1;
      if (game.winnerTeamId === teamBId) seriesScoreB += 1;
    }
    if (game.status === 'conflict') hasConflict = true;
  }
  const playedGames = seriesScoreA + seriesScoreB;
  let winnerTeamId = '';
  if (seriesScoreA >= needed) winnerTeamId = teamAId;
  if (seriesScoreB >= needed) winnerTeamId = teamBId;
  if (!winnerTeamId && bestOf % 2 === 0 && playedGames >= bestOf && seriesScoreA !== seriesScoreB) {
    winnerTeamId = seriesScoreA > seriesScoreB ? teamAId : teamBId;
  }
  const status = winnerTeamId ? 'validated' : hasConflict ? 'conflict' : playedGames > 0 ? 'partial' : 'pending';
  const currentGameNumber = winnerTeamId ? Math.min(bestOf, Math.max(1, playedGames)) : Math.max(1, Math.min(bestOf, (games.find((game) => game.status === 'conflict')?.gameNumber) || playedGames + 1));
  return { ...result, games, bestOf, winsNeeded: needed, seriesScoreA, seriesScoreB, finalScoreA: seriesScoreA, finalScoreB: seriesScoreB, playedGames, remainingGames: Math.max(0, bestOf - playedGames), winsRemaining: Math.max(0, needed - Math.max(seriesScoreA, seriesScoreB)), currentGameNumber, status, proof: lastProof || result.proof || null, winnerTeamId, updatedAt: new Date().toISOString() };
}

async function saveResultRecord(result = {}) {
  const content = `RESULT_JSON:${JSON.stringify(result)}`;
  if (result.messageId) return storage.updateChatMessage(result.messageId, { content }, { channelId: RESULT_CHANNEL, source: 'system' });
  return storage.saveChatMessage({ channelId: RESULT_CHANNEL, source: 'system', authorId: 'void-arena-results', authorName: 'Resultados Void Arena', content, attachments: [], createdAt: result.createdAt || new Date().toISOString() });
}

function nextSlotTargetForResult(matchIndex = 0, bracket = {}) {
  const slotSize = bracket.slotSize || (Array.isArray(bracket.slots) && bracket.slots.length > 16 ? 32 : 16);
  return nextTargetForSlotMatch(matchIndex, slotSize);
}

async function applyResultToBracket(result = {}) {
  const winnerTeamId = String(result.winnerTeamId || '').trim();
  const roundKey = String(result.match?.roundKey || result.roundKey || '').trim();
  const matchIndex = Number(result.match?.matchIndex ?? result.matchIndex ?? 0) || 0;
  if (!winnerTeamId) return { applied: false, reason: 'Resultado sem vencedor.' };
  const [teams, users, bracket] = await Promise.all([storage.readTeams(), readUsersSafe(), storage.readBracket()]);
  const next = {
    slotSize: bracket.slotSize || (Array.isArray(bracket.slots) && bracket.slots.length > 16 ? 32 : 16),
    teamLimit: bracket.teamLimit || (Array.isArray(bracket.slots) ? bracket.slots.filter(Boolean).length : 16),
    slots: Array.isArray(bracket.slots) ? [...bracket.slots] : [],
    round16: Array.isArray(bracket.round16) ? [...bracket.round16] : [],
    quarters: Array.isArray(bracket.quarters) ? [...bracket.quarters] : [],
    semis: Array.isArray(bracket.semis) ? [...bracket.semis] : [],
    finals: Array.isArray(bracket.finals) ? [...bracket.finals] : [],
    matchProgress: bracket.matchProgress || {},
    eventId: bracket.eventId || '',
    generatedAt: bracket.generatedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  if (roundKey === 'slots') { const target = nextSlotTargetForResult(matchIndex, next); if (!Array.isArray(next[target.round])) next[target.round] = []; next[target.round][target.index] = winnerTeamId; }
  else if (roundKey === 'round16') next.quarters[Math.floor(matchIndex / 2)] = winnerTeamId;
  else if (roundKey === 'quarters') next.semis[Math.floor(matchIndex / 2)] = winnerTeamId;
  else if (roundKey === 'semis') next.finals[matchIndex < 2 ? 0 : 1] = winnerTeamId;
  else if (roundKey === 'finals') return { applied: false, reason: 'Final validada; não existe próxima fase.' };
  else return { applied: false, reason: 'Rodada inválida.' };
  const saved = await storage.writeBracket(next);
  return { applied: true, bracket: normalizeBracketForResponse(saved, teams, users) };
}

function registerOrganizedRouteOverrides(app) {
  app.get('/api/brand/server', async (_req, res) => {
    const guild = await fetchGuildBrand();
    const serverName = guild?.name || 'Hollow Nexus';
    return res.json({
      success: true,
      server: {
        id: guild?.id || null,
        name: serverName,
        icon: guild?.icon || null,
        fallbackIcon: '/assets/hollow-nexus.png'
      },
      fetchedAt: new Date().toISOString()
    });
  });

  app.get('/api/bot', async (_req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const guild = await fetchGuildBrand();
    const serverName = guild?.name || 'Hollow Nexus';
    return res.json({
      success: true,
      online: true,
      name: serverName,
      displayName: serverName,
      serverName,
      guildName: serverName,
      applicationName: null,
      username: 'Void Arena',
      tag: serverName,
      id: guild?.id || null,
      guildId: guild?.id || null,
      guilds: guild ? 1 : 0,
      avatar: guild?.icon || '/assets/hollow-nexus.png',
      guildIcon: guild?.icon || null,
      fetchedAt: new Date().toISOString()
    });
  });

  app.get('/api/dashboard/snapshot', requireSession, async (_req, res) => {
    const [teams, bracket, events, users, settings, results] = await Promise.all([
      storage.readTeams(),
      storage.readBracket(),
      storage.readEvents(),
      storage.readUsers(),
      storage.readTournamentSettings().catch(() => ({})),
      readResultRecords().catch(() => [])
    ]);
    return res.json({
      success: true,
      generatedAt: new Date().toISOString(),
      teams: teams.map((team) => enrichTeam(team, users)),
      bracket: normalizeBracketForResponse(bracket, teams, users),
      events,
      users: users.map(publicUser),
      settings,
      results: results.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
    });
  });

  app.get('/api/teams', requireSession, async (_req, res) => {
    const [teams, users, bracket] = await Promise.all([storage.readTeams(), storage.readUsers(), storage.readBracket()]);
    const enriched = teams.map((team) => enrichTeam(team, users));
    return res.json({ success: true, teams: enriched, bracket: normalizeBracketForResponse(bracket, teams, users) });
  });

  app.get('/api/teams/:teamId/public', requireSession, async (req, res) => {
    const [teams, users] = await Promise.all([storage.readTeams(), storage.readUsers()]);
    const team = teams.find((item) => String(item.id) === String(req.params.teamId));
    if (!team) return res.status(404).json({ success: false, message: 'Time não encontrado.' });
    return res.json({ success: true, team: enrichTeam(team, users) });
  });

  app.get('/api/users/:userId/public', requireSession, async (req, res) => {
    const users = await storage.readUsers();
    const user = users.find((item) => String(item.id) === String(req.params.userId) || String(item.discordId || '') === String(req.params.userId));
    if (!user) return res.status(404).json({ success: false, message: 'Jogador não encontrado.' });
    return res.json({ success: true, user: publicUser(user) });
  });

  app.get('/api/match-results', requireSession, async (_req, res) => {
    const results = await readResultRecords();
    return res.json({
      success: true,
      results: results.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
    });
  });

  app.put('/api/tournament/settings', requireOwner, async (req, res) => {
    try {
      const allowedFormats = new Set(['MD1', 'MD2', 'MD3', 'MD5']);
      const allowedStructures = new Set(['single_elimination', 'groups', 'groups_playoffs']);
      const payload = {
        activeEventId: String(req.body.activeEventId || '').trim(),
        tournamentName: String(req.body.tournamentName || 'Rematch Championship').trim().slice(0, 60),
        matchFormat: allowedFormats.has(String(req.body.matchFormat)) ? String(req.body.matchFormat) : 'MD1',
        structure: allowedStructures.has(String(req.body.structure)) ? String(req.body.structure) : 'single_elimination',
        teamLimit: normalizeTeamLimit(req.body.teamLimit || 16),
        groupCount: [2, 4, 5, 6, 7, 8].includes(Number(req.body.groupCount)) ? Number(req.body.groupCount) : 4,
        autoCreateMatchChannels: req.body.autoCreateMatchChannels !== false,
        discordMatchCategoryId: String(req.body.discordMatchCategoryId || '').trim()
      };
      const settings = await storage.writeTournamentSettings(payload);
      return res.json({ success: true, settings });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

  app.post('/api/bracket/generate', requireOwner, async (_req, res) => {
    try {
      const [teams, users, settings, events] = await Promise.all([storage.readTeams(), storage.readUsers(), storage.readTournamentSettings(), storage.readEvents().catch(() => [])]);
      if (!teams.length) return res.status(400).json({ success: false, message: 'Cadastre pelo menos um time antes de gerar.' });
      const limit = normalizeTeamLimit(settings.teamLimit || 16);
      const activeEvent = Array.isArray(events) ? events.find((event) => String(event.id || '') === String(settings.activeEventId || '')) : null;
      const registeredIds = new Set((activeEvent?.registrations || []).map((registration) => String(registration.teamId || '')).filter(Boolean));
      const sourceTeams = registeredIds.size ? teams.filter((team) => registeredIds.has(String(team.id || ''))) : teams;
      const selectedTeams = sourceTeams.slice(0, limit);
      if (!selectedTeams.length) return res.status(400).json({ success: false, message: 'O evento selecionado ainda não tem times aprovados.' });
      const groups = generateGroups(selectedTeams, settings);
      const generated = generateAdaptiveBracket(selectedTeams, limit);
      const bracket = await storage.writeBracket({
        slotSize: generated.slotSize,
        teamLimit: limit,
        eventId: settings.activeEventId || '',
        slots: generated.slots,
        round16: generated.round16,
        quarters: [],
        semis: [],
        finals: [],
        matchProgress: {},
        generatedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      const resultHubs = await syncResultHubs(bracket, settings);
      return res.json({ success: true, bracket: normalizeBracketForResponse(bracket, teams, users), groups, resultHubs, settings: { ...settings, teamLimit: limit } });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

  app.put('/api/bracket', requireOwner, async (req, res) => {
    try {
      const [teams, users, existing, settings] = await Promise.all([storage.readTeams(), storage.readUsers(), storage.readBracket(), storage.readTournamentSettings()]);
      const normalized = normalizeBracketData(req.body || {});
      const bracket = await storage.writeBracket({
        ...normalized,
        generatedAt: existing.generatedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      const resultHubs = await syncResultHubs(bracket, settings);
      return res.json({ success: true, bracket: normalizeBracketForResponse(bracket, teams, users), resultHubs });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

  app.post('/api/result-hubs/sync', requireOwner, async (_req, res) => {
    try {
      const [bracket, settings] = await Promise.all([
        storage.readBracket(),
        storage.readTournamentSettings().catch(() => ({}))
      ]);
      const resultHubs = await syncResultHubs(bracket, settings);
      return res.json({ success: resultHubs.success !== false, resultHubs });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

  app.get('/api/owner/role-permissions', requireOwner, async (_req, res) => {
    try {
      const [permissionsData, mentions] = await Promise.all([
        callBot('/internal/storage/readRolePermissions', { method: 'POST', body: JSON.stringify({ args: [] }) }).then((data) => data.result || {}).catch(() => ({})),
        callBot('/internal/discord/mentions', { method: 'GET' }).catch((error) => ({ roles: [], message: error.message }))
      ]);
      const roles = Array.isArray(mentions.roles) ? mentions.roles : [];
      return res.json({ success: true, permissions: permissionsData || {}, roles, message: roles.length ? '' : (mentions.message || 'BOT online, mas nenhum cargo foi retornado.') });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

  app.put('/api/owner/role-permissions', requireOwner, async (req, res) => {
    try {
      const permissions = req.body?.permissions && typeof req.body.permissions === 'object' ? req.body.permissions : {};
      const saved = await callBot('/internal/storage/writeRolePermissions', {
        method: 'POST',
        body: JSON.stringify({ args: [permissions] })
      });
      return res.json({ success: true, permissions: saved.result || permissions });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

  app.get('/api/bot/internal-health', requireOwner, async (_req, res) => {
    try {
      const data = await callBot('/internal/health', { method: 'GET' });
      return res.json(data);
    } catch (error) {
      const database = await storage.readDatabaseStatus().catch((dbError) => ({ error: dbError.message }));
      const guild = await fetchGuildBrand().catch(() => null);
      return res.json({ success: true, degraded: true, message: `Ponte interna direta indisponível: ${error.message}`, online: Boolean(guild), guilds: guild ? 1 : 0, database });
    }
  });

  app.get('/api/backups/github/latest', requireOwner, async (_req, res) => {
    try {
      const data = await callBot('/internal/backup/github/latest', { method: 'GET' });
      return res.json(data);
    } catch (error) {
      return res.status(503).json({ success: false, message: error.message });
    }
  });

  app.post('/api/backups/github/export', requireOwner, async (req, res) => {
    try {
      const data = await callBot('/internal/backup/github/export', {
        method: 'POST',
        body: JSON.stringify({ reason: req.body?.reason || 'site-manual' })
      });
      return res.json(data);
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  app.post('/api/backups/github/restore-latest', requireOwner, async (_req, res) => {
    try {
      const data = await callBot('/internal/backup/github/restore-latest', { method: 'POST', body: '{}' });
      return res.json(data);
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  app.post('/internal/results/state', async (req, res) => {
    try {
      const payload = req.body || {};
      const hubId = String(payload.hubId || `${payload.roundKey || payload.match?.roundKey || 'slots'}_${Number(payload.matchIndex ?? payload.match?.matchIndex ?? 0) || 0}`).trim();
      const records = await readResultRecords();
      const result = records.find((item) => String(item.hubId || '') === hubId) || null;
      return res.json({ success: true, result });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

  app.post('/internal/results/submit', async (req, res) => {
    try {
      const payload = req.body || {};
      const round = payload.roundKey || payload.match?.roundKey || 'slots';
      const index = Number(payload.matchIndex ?? payload.match?.matchIndex ?? 0) || 0;
      const hubId = `${round}_${index}`;
      const records = await readResultRecords();
      let result = records.find((item) => item.hubId === hubId) || null;
      const match = payload.match || result?.match || {};
      const bestOf = resultMaxGames(match);
      const gameNumber = Math.max(1, Math.min(bestOf, Number(payload.gameNumber || result?.currentGameNumber || 1) || 1));
      const submission = normalizeSeriesSubmission(payload);
      if (submission.scoreA === submission.scoreB) return res.status(400).json({ success: false, message: 'Resultado empatado não fecha uma partida.' });
      if (!result) {
        result = { id: `result_${hubId}`, hubId, roundKey: round, matchIndex: index, match, games: [], submissions: [], status: 'pending', bestOf, winsNeeded: resultWinsNeeded(bestOf), seriesScoreA: 0, seriesScoreB: 0, playedGames: 0, remainingGames: bestOf, currentGameNumber: 1, proof: null, winnerTeamId: '', advanced: false, createdAt: new Date().toISOString() };
      }
      result.match = match;
      result.bestOf = bestOf;
      result.winsNeeded = resultWinsNeeded(bestOf);
      result.games = Array.isArray(result.games) ? result.games : [];
      result.submissions = Array.isArray(result.submissions) ? result.submissions : [];
      let game = result.games.find((item) => Number(item.gameNumber) === gameNumber);
      if (!game) {
        game = { id: `${hubId}_game_${gameNumber}`, gameNumber, submissions: [], status: 'pending', finalScoreA: null, finalScoreB: null, proof: null, winnerTeamId: '', createdAt: new Date().toISOString() };
        result.games.push(game);
      }
      const key = submission.authorDiscordId || submission.authorName;
      const existingIndex = game.submissions.findIndex((item) => (item.authorDiscordId || item.authorName) === key);
      if (existingIndex >= 0) game.submissions[existingIndex] = submission;
      else game.submissions.push(submission);
      result.submissions.push({ ...submission, gameNumber });
      result.submissions = result.submissions.slice(-60);
      result = recomputeSeries(result);
      let bracketApply = { applied: false };
      if (result.status === 'validated' && result.winnerTeamId && !result.advanced) {
        bracketApply = await applyResultToBracket(result);
        result.advanced = Boolean(bracketApply.applied);
        result.advancedAt = bracketApply.applied ? new Date().toISOString() : null;
      }
      result.updatedAt = new Date().toISOString();
      const savedMessage = await saveResultRecord(result);
      result.messageId = savedMessage.id || result.messageId || '';
      req.app.locals.realtime?.broadcast?.({ type: 'match-result:update', payload: { result, bracket: bracketApply.bracket || null }, source: 'bot' });
      return res.json({ success: true, result, bracketApply });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

}

module.exports = { registerOrganizedRouteOverrides };
