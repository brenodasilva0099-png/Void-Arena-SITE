const storage = require('../storage');
const { getSessionUser, isAdminRecord, requireAdmin } = require('../services/access.service');
const { canManageTeam } = require('../services/teamAccess.service');
const { withSeasonCompetitions } = require('../services/season.service');
const RESULT_CHANNEL = 'results-main';
const MAX_PROOF_CHARACTERS = 2600000;
const STAT_KEYS = ['goals', 'assists', 'interceptions', 'defenses', 'passes'];
const ALLOWED_STATUSES = new Set(['pending', 'validated', 'rejected']);
let reportCache = [];
let reportCacheUpdatedAt = null;

function text(value = '', max = 180) {
  return String(value || '').trim().slice(0, max);
}

function key(value = '') {
  return text(value, 180).toLocaleLowerCase('pt-BR');
}

function safeImage(value = '', max = 5000) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^data:image\/(?:png|jpe?g|webp);base64,[a-z0-9+/=]+$/i.test(raw)) {
    return raw.length <= MAX_PROOF_CHARACTERS ? raw : '';
  }
  if (/^https?:\/\//i.test(raw)) return raw.slice(0, max);
  if (/^\/(?:assets|uploads|images|img)\//i.test(raw)) return raw.slice(0, max);
  return '';
}

function requireSession(req, res, next) {
  if (!req.session?.userId && !req.session?.discordId) {
    return res.status(401).json({ success: false, message: 'Entre com o Discord para abrir a Central de Súmulas.' });
  }
  return next();
}

function parseResultRecord(message = {}) {
  try {
    const raw = String(message.content || '');
    if (!raw.startsWith('RESULT_JSON:')) return null;
    const data = JSON.parse(raw.slice('RESULT_JSON:'.length));
    return {
      ...data,
      messageId: message.id || data.messageId || '',
      createdAt: data.createdAt || message.createdAt || null,
      updatedAt: data.updatedAt || message.updatedAt || message.createdAt || null
    };
  } catch {
    return null;
  }
}

function sortReports(reports = []) {
  return [...reports].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
}

function isDeletedReport(report = {}) {
  return Boolean(report.deletedAt) || String(report.status || '').toLowerCase() === 'deleted';
}

function cacheReport(report = {}) {
  const identities = [report.id, report.messageId, report.hubId].map(String).filter(Boolean);
  if (isDeletedReport(report)) {
    reportCache = reportCache.filter((item) => ![item.id, item.messageId, item.hubId].map(String).some((id) => identities.includes(id)));
    reportCacheUpdatedAt = new Date().toISOString();
    return;
  }
  const index = reportCache.findIndex((item) => [item.id, item.messageId, item.hubId].map(String).some((id) => identities.includes(id)));
  if (index >= 0) reportCache[index] = { ...reportCache[index], ...report };
  else reportCache.unshift(report);
  reportCache = sortReports(reportCache);
  reportCacheUpdatedAt = new Date().toISOString();
}

async function readReportState() {
  try {
    const messages = await storage.readChatMessages({ channelId: RESULT_CHANNEL, limit: 500 });
    const results = sortReports(messages.map(parseResultRecord).filter((report) => report && !isDeletedReport(report)));
    reportCache = results;
    reportCacheUpdatedAt = new Date().toISOString();
    return { results, degraded: false, warning: '', cacheUpdatedAt: reportCacheUpdatedAt };
  } catch (error) {
    return {
      results: sortReports(reportCache),
      degraded: true,
      warning: reportCache.length
        ? 'O histórico está exibindo a última cópia disponível. Novos envios continuam bloqueados até a conexão de dados voltar.'
        : 'O histórico está temporariamente indisponível. A criação da súmula permanece na tela e pode ser tentada novamente em instantes.',
      cacheUpdatedAt: reportCacheUpdatedAt,
      error: error.message
    };
  }
}

async function readReports() {
  return (await readReportState()).results;
}

async function saveReport(report = {}) {
  const content = `RESULT_JSON:${JSON.stringify(report)}`;
  let saved;
  if (report.messageId) {
    saved = await storage.updateChatMessage(report.messageId, { content }, { channelId: RESULT_CHANNEL, source: 'system' });
  } else {
    saved = await storage.saveChatMessage({
      channelId: RESULT_CHANNEL,
      source: 'system',
      authorId: 'void-arena-sumulas',
      authorName: 'Central de Súmulas',
      content,
      attachments: [],
      createdAt: report.createdAt || new Date().toISOString()
    });
  }
  cacheReport({ ...report, messageId: saved?.id || report.messageId || '' });
  return saved;
}

function userMaps(users = []) {
  const byId = new Map();
  const byLabel = new Map();
  for (const user of users) {
    for (const value of [user.id, user.discordId]) {
      if (value) byId.set(String(value), user);
    }
    for (const value of [user.name, user.username, user.profile?.username, user.profile?.displayName]) {
      if (value) byLabel.set(key(value), user);
    }
  }
  return { byId, byLabel };
}

function resolveUser(value = '', maps = {}) {
  const raw = text(value, 180);
  if (!raw) return null;
  const mention = raw.match(/^<@!?(\d{16,22})>$/);
  const id = mention ? mention[1] : raw;
  return maps.byId?.get(id) || maps.byLabel?.get(key(raw)) || null;
}

function publicPlayer(user = {}, fallback = {}, rosterRole = 'Titular', index = 0) {
  const id = text(user.id || fallback.userId || fallback.id || '', 100);
  const discordId = text(user.discordId || fallback.discordId || '', 40);
  const name = text(
    user.profile?.username ||
    user.profile?.displayName ||
    user.name ||
    fallback.name ||
    fallback.playerName ||
    `Jogador ${index + 1}`,
    100
  );
  const avatar = safeImage(user.avatar || fallback.avatar || '', 4000);
  return {
    id: id || discordId || `${key(name)}-${index}`,
    userId: id,
    discordId,
    name,
    avatar,
    rosterRole
  };
}

function teamRoster(team = {}, users = []) {
  const maps = userMaps(users);
  const result = [];
  const add = (detail, storedName, account, rosterRole, index) => {
    const source = detail && typeof detail === 'object' ? detail : {};
    const linked = [
      source.userId,
      source.id,
      source.discordId,
      account,
      storedName,
      typeof detail === 'string' ? detail : ''
    ].map((value) => resolveUser(value, maps)).find(Boolean) || {};
    const player = publicPlayer(linked, {
      ...source,
      name: source.name || source.playerName || (typeof detail === 'string' ? detail : storedName),
      discordId: source.discordId || account
    }, rosterRole, index);
    const identity = player.discordId || player.userId || key(player.name);
    if (!identity || result.some((item) => (item.discordId || item.userId || key(item.name)) === identity)) return;
    result.push(player);
  };

  const playerDetails = Array.isArray(team.playerDetails) ? team.playerDetails : [];
  const reserveDetails = Array.isArray(team.reserveDetails) ? team.reserveDetails : [];
  const players = Array.isArray(team.players) ? team.players : [];
  const reserves = Array.isArray(team.reserves) ? team.reserves : [];
  const playerAccounts = Array.isArray(team.playerAccounts?.players) ? team.playerAccounts.players : [];
  const reserveAccounts = Array.isArray(team.playerAccounts?.reserves) ? team.playerAccounts.reserves : [];

  for (let i = 0; i < Math.max(playerDetails.length, players.length, playerAccounts.length); i += 1) {
    add(playerDetails[i], players[i], playerAccounts[i], 'Titular', i);
  }
  for (let i = 0; i < Math.max(reserveDetails.length, reserves.length, reserveAccounts.length); i += 1) {
    add(reserveDetails[i], reserves[i], reserveAccounts[i], 'Reserva', i);
  }
  return result.slice(0, 30);
}

function publicTeam(team = {}, users = []) {
  return {
    id: text(team.id, 120),
    name: text(team.name || team.teamName || 'Clube', 100),
    tag: text(team.tag, 24),
    logo: safeImage(
      team.logo || team.logoUrl || team.logoURL || team.badge || team.badgeUrl ||
      team.escudo || team.image || team.imageUrl || team.avatar || team.icon || '',
      900000
    ) || '/assets/hollow-nexus-official.svg',
    region: text(team.region, 80),
    roster: teamRoster(team, users)
  };
}

function compactTeam(team = {}) {
  const logo = safeImage(team.logo || '', 900000);
  return {
    id: text(team.id, 120),
    name: text(team.name || 'Clube', 100),
    tag: text(team.tag, 24),
    logo,
    region: text(team.region, 80)
  };
}

function publicEvent(event = {}) {
  return {
    id: text(event.id, 120),
    name: text(event.name || event.title || 'Competição', 100),
    title: text(event.title || event.name || 'Competição', 100),
    status: text(event.status || 'open', 40),
    matchFormat: text(event.matchFormat || 'MD1', 20)
  };
}

function allowedTeamIds(user = {}, teams = [], isAdmin = false) {
  if (isAdmin) return new Set(teams.map((team) => String(team.id || '')).filter(Boolean));
  return new Set(
    teams
      .filter((team) => canManageTeam(user, team))
      .map((team) => String(team.id || ''))
      .filter(Boolean)
  );
}

function reportPlayerId(player = {}) {
  return String(player.discordId || player.userId || player.id || key(player.name));
}

function cleanStats(raw = {}) {
  return Object.fromEntries(STAT_KEYS.map((stat) => {
    const value = Number(raw?.[stat] || 0);
    return [stat, Number.isInteger(value) && value >= 0 && value <= 999 ? value : 0];
  }));
}

function participantFromId(id = '', rosters = []) {
  const target = String(id || '');
  for (const roster of rosters) {
    const found = roster.find((player) => reportPlayerId(player) === target);
    if (found) return found;
  }
  return null;
}

function normalizeParticipants(ids = [], rosters = []) {
  const selected = [];
  for (const id of Array.isArray(ids) ? ids : []) {
    const player = participantFromId(id, rosters);
    if (!player) continue;
    const identity = reportPlayerId(player);
    if (!selected.some((item) => reportPlayerId(item) === identity)) selected.push(player);
  }
  return selected.slice(0, 30);
}

function publicHistoryResult(result = {}) {
  const proof = safeImage(
    typeof result.proof === 'string'
      ? result.proof
      : result.proof?.url || result.proof?.dataUrl || result.screenshot || '',
    MAX_PROOF_CHARACTERS
  );
  return {
    ...result,
    proof,
    proofMeta: result.proofMeta || null
  };
}

async function loadBootstrap(req) {
  const [user, teams, users, events, reportState] = await Promise.all([
    getSessionUser(req),
    storage.readTeams(),
    storage.readUsers(),
    storage.readEvents().catch(() => []),
    readReportState()
  ]);
  if (!user) return null;
  const isAdmin = await isAdminRecord(user).catch(() => false);
  const managedIds = allowedTeamIds(user, teams, isAdmin);
  return {
    user,
    isAdmin,
    teams,
    users,
    events: withSeasonCompetitions(events),
    results: reportState.results,
    reportsDegraded: reportState.degraded,
    reportsWarning: reportState.warning,
    reportsCacheUpdatedAt: reportState.cacheUpdatedAt,
    managedIds
  };
}

function registerMatchReportRoutes(app) {
  app.get('/api/match-reports/bootstrap', requireSession, async (req, res) => {
    try {
      const data = await loadBootstrap(req);
      if (!data) return res.status(401).json({ success: false, message: 'Sessão Discord inválida.' });
      const teams = data.teams.map((team) => publicTeam(team, data.users));
      const managedTeams = teams.filter((team) => data.managedIds.has(String(team.id)));
      return res.json({
        success: true,
        isAdmin: data.isAdmin,
        canSubmit: managedTeams.length > 0,
        currentUser: publicPlayer(data.user, {}, 'Responsável', 0),
        managedTeams,
        teams,
        events: data.events.map(publicEvent),
        results: data.results.map(publicHistoryResult),
        degraded: data.reportsDegraded,
        warning: data.reportsWarning,
        cacheUpdatedAt: data.reportsCacheUpdatedAt,
        stats: {
          total: data.results.length,
          pending: data.results.filter((item) => ['pending', 'partial', 'conflict'].includes(String(item.status || 'pending'))).length,
          validated: data.results.filter((item) => String(item.status || '') === 'validated').length,
          withProof: data.results.filter((item) => Boolean(safeImage(typeof item.proof === 'string' ? item.proof : item.proof?.url || ''))).length
        }
      });
    } catch (error) {
      return res.status(503).json({ success: false, message: `Não foi possível carregar a Central de Súmulas: ${error.message}` });
    }
  });

  app.get('/api/match-reports', requireSession, async (_req, res) => {
    const state = await readReportState();
    return res.json({
      success: true,
      results: state.results.map(publicHistoryResult),
      degraded: state.degraded,
      warning: state.warning,
      cacheUpdatedAt: state.cacheUpdatedAt
    });
  });

  app.get('/api/match-reports/:reportId/proof', requireSession, async (req, res) => {
    try {
      const reports = await readReports();
      const report = reports.find((item) => (
        String(item.id || '') === String(req.params.reportId) ||
        String(item.messageId || '') === String(req.params.reportId) ||
        String(item.hubId || '') === String(req.params.reportId)
      ));
      if (!report) return res.status(404).send('Súmula não encontrada.');

      const storedProof = safeImage(
        typeof report.proof === 'string'
          ? report.proof
          : report.proof?.dataUrl || report.proof?.url || '',
        MAX_PROOF_CHARACTERS
      );
      if (!storedProof) return res.status(404).send('Comprovante não encontrado.');

      res.set('Cache-Control', 'private, no-store');
      const dataImage = storedProof.match(/^data:(image\/(?:png|jpe?g|webp));base64,([a-z0-9+/=]+)$/i);
      if (dataImage) {
        const buffer = Buffer.from(dataImage[2], 'base64');
        if (!buffer.length) return res.status(404).send('Comprovante não encontrado.');
        res.type(dataImage[1]);
        return res.send(buffer);
      }
      return res.redirect(302, storedProof);
    } catch (error) {
      return res.status(500).send(error.message || 'Não foi possível abrir o comprovante.');
    }
  });

  app.post('/api/match-reports', requireSession, async (req, res) => {
    try {
      const data = await loadBootstrap(req);
      if (!data) return res.status(401).json({ success: false, message: 'Sessão Discord inválida.' });

      const body = req.body || {};
      const teamA = data.teams.find((team) => String(team.id) === String(body.teamAId || ''));
      const teamB = data.teams.find((team) => String(team.id) === String(body.teamBId || ''));
      if (!teamA || !teamB || String(teamA.id) === String(teamB.id)) {
        return res.status(400).json({ success: false, message: 'Selecione dois clubes cadastrados e diferentes.' });
      }
      if (!data.managedIds.has(String(teamA.id))) {
        return res.status(403).json({ success: false, message: 'Você só pode enviar súmula por um clube em que seja criador, diretor ou capitão.' });
      }

      const scoreA = Number(body.scoreA);
      const scoreB = Number(body.scoreB);
      if (![scoreA, scoreB].every((value) => Number.isInteger(value) && value >= 0 && value <= 999)) {
        return res.status(400).json({ success: false, message: 'Informe um placar válido, usando números inteiros de 0 a 999.' });
      }
      if (scoreA === scoreB) {
        return res.status(400).json({ success: false, message: 'O resultado não pode terminar empatado.' });
      }

      const proof = safeImage(body.proof, MAX_PROOF_CHARACTERS);
      if (!proof || !proof.startsWith('data:image/')) {
        return res.status(400).json({ success: false, message: 'A print do fim da partida é obrigatória. Envie PNG, JPG ou WEBP.' });
      }

      const teamAPublic = publicTeam(teamA, data.users);
      const teamBPublic = publicTeam(teamB, data.users);
      const teamARecord = compactTeam(teamAPublic);
      const teamBRecord = compactTeam(teamBPublic);
      const participants = normalizeParticipants(body.participantIds, [teamAPublic.roster, teamBPublic.roster]);
      if (!participants.length) {
        return res.status(400).json({ success: false, message: 'Selecione ao menos um jogador que participou da partida.' });
      }
      const teamAPlayerIds = new Set(teamAPublic.roster.map(reportPlayerId));
      const teamBPlayerIds = new Set(teamBPublic.roster.map(reportPlayerId));
      if (
        !participants.some((player) => teamAPlayerIds.has(reportPlayerId(player))) ||
        !participants.some((player) => teamBPlayerIds.has(reportPlayerId(player)))
      ) {
        return res.status(400).json({ success: false, message: 'Selecione ao menos um participante de cada clube.' });
      }

      const mvp = participantFromId(body.mvpId, [participants]);
      if (!mvp) {
        return res.status(400).json({ success: false, message: 'Selecione o MVP entre os jogadores dos dois clubes.' });
      }

      const submittedStats = body.playerStats && typeof body.playerStats === 'object' ? body.playerStats : {};
      const playerStats = participants.map((player) => ({
        ...player,
        ...cleanStats(submittedStats[reportPlayerId(player)])
      }));
      const event = data.events.find((item) => String(item.id) === String(body.competitionId || '')) || null;
      const now = new Date().toISOString();
      const suffix = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      const hubId = `site_sumula_${suffix}`;
      const submission = {
        authorDiscordId: text(data.user.discordId || data.user.id, 40),
        authorName: text(data.user.profile?.username || data.user.name || 'Capitão', 120),
        scoreA,
        scoreB,
        proof: '',
        isStaff: data.isAdmin,
        source: 'site',
        participantCount: participants.length,
        mvpId: reportPlayerId(mvp),
        createdAt: now
      };
      let report = {
        id: `result_${hubId}`,
        hubId,
        source: 'site',
        reportType: 'captain-match-report',
        competitionId: text(event?.id || body.competitionId || '__test__', 120),
        competitionName: text(event?.name || event?.title || body.competitionName || 'Amistoso / teste', 120),
        round: text(body.round || 'Não informada', 100),
        game: text(body.game || '', 100),
        notes: text(body.notes || '', 800),
        match: {
          roundKey: 'site-reports',
          matchIndex: 0,
          matchFormat: text(event?.matchFormat || body.matchFormat || 'MD1', 20),
          teamA: teamARecord,
          teamB: teamBRecord
        },
        teamA: teamARecord,
        teamB: teamBRecord,
        scoreA,
        scoreB,
        finalScoreA: scoreA,
        finalScoreB: scoreB,
        participants,
        playerStats,
        mvp,
        submissions: [submission],
        games: [{
          id: `${hubId}_game_1`,
          gameNumber: 1,
          status: 'pending',
          finalScoreA: scoreA,
          finalScoreB: scoreB,
          winnerTeamId: scoreA > scoreB ? teamA.id : teamB.id,
          proof: '',
          submissions: [submission],
          createdAt: now,
          updatedAt: now
        }],
        status: 'pending',
        proof,
        proofMeta: {
          name: text(body.proofName || 'comprovante-da-partida', 160),
          contentType: text(body.proofType || 'image/webp', 80),
          size: Number(body.proofSize || 0) || 0
        },
        submittedBy: {
          id: text(data.user.id, 100),
          discordId: text(data.user.discordId || data.user.id, 40),
          name: text(data.user.profile?.username || data.user.name || 'Capitão', 120),
          avatar: (() => {
            const avatar = safeImage(data.user.avatar || '', 4000);
            return avatar && !avatar.startsWith('data:image/') ? avatar : '';
          })()
        },
        winnerTeamId: scoreA > scoreB ? String(teamA.id) : String(teamB.id),
        validatedBy: null,
        validationNote: '',
        createdAt: now,
        updatedAt: now
      };

      const saved = await saveReport(report);
      report.messageId = saved.id || report.messageId || '';
      report.updatedAt = new Date().toISOString();
      req.app.locals.realtime?.broadcast?.({
        type: 'match-report:create',
        payload: { report: publicHistoryResult(report) },
        source: 'site'
      });

      return res.status(201).json({
        success: true,
        report: publicHistoryResult(report),
        message: 'Súmula salva com sucesso em Todos os envios do site.'
      });
    } catch (error) {
      return res.status(503).json({
        success: false,
        retryable: true,
        message: 'Não foi possível salvar em Todos os envios agora. Seus campos continuam preenchidos; aguarde alguns instantes e tente novamente.'
      });
    }
  });

  app.patch('/api/match-reports/:reportId', requireAdmin, async (req, res) => {
    try {
      const data = await loadBootstrap(req);
      if (!data) return res.status(401).json({ success: false, message: 'Sessão Discord inválida.' });

      const reports = data.results;
      const report = reports.find((item) => (
        String(item.id || '') === String(req.params.reportId) ||
        String(item.messageId || '') === String(req.params.reportId) ||
        String(item.hubId || '') === String(req.params.reportId)
      ));
      if (!report) return res.status(404).json({ success: false, message: 'Súmula não encontrada.' });

      const body = req.body || {};
      const teamA = data.teams.find((team) => String(team.id) === String(body.teamAId || report.teamA?.id || report.match?.teamA?.id || ''));
      const teamB = data.teams.find((team) => String(team.id) === String(body.teamBId || report.teamB?.id || report.match?.teamB?.id || ''));
      if (!teamA || !teamB || String(teamA.id) === String(teamB.id)) {
        return res.status(400).json({ success: false, message: 'Selecione dois clubes cadastrados e diferentes.' });
      }

      const scoreA = Number(body.scoreA);
      const scoreB = Number(body.scoreB);
      if (![scoreA, scoreB].every((value) => Number.isInteger(value) && value >= 0 && value <= 999)) {
        return res.status(400).json({ success: false, message: 'Informe um placar válido, usando números inteiros de 0 a 999.' });
      }
      if (scoreA === scoreB) {
        return res.status(400).json({ success: false, message: 'O resultado não pode terminar empatado.' });
      }

      const proof = safeImage(body.proof || report.proof, MAX_PROOF_CHARACTERS);
      if (!proof || !proof.startsWith('data:image/')) {
        return res.status(400).json({ success: false, message: 'A print deve continuar salva no próprio sistema.' });
      }

      const teamAPublic = publicTeam(teamA, data.users);
      const teamBPublic = publicTeam(teamB, data.users);
      const participants = normalizeParticipants(body.participantIds, [teamAPublic.roster, teamBPublic.roster]);
      const teamAPlayerIds = new Set(teamAPublic.roster.map(reportPlayerId));
      const teamBPlayerIds = new Set(teamBPublic.roster.map(reportPlayerId));
      if (
        !participants.length ||
        !participants.some((player) => teamAPlayerIds.has(reportPlayerId(player))) ||
        !participants.some((player) => teamBPlayerIds.has(reportPlayerId(player)))
      ) {
        return res.status(400).json({ success: false, message: 'Selecione ao menos um participante de cada clube.' });
      }

      const mvp = participantFromId(body.mvpId, [participants]);
      if (!mvp) {
        return res.status(400).json({ success: false, message: 'Selecione o MVP entre os participantes.' });
      }

      const submittedStats = body.playerStats && typeof body.playerStats === 'object' ? body.playerStats : {};
      const playerStats = participants.map((player) => ({
        ...player,
        ...cleanStats(submittedStats[reportPlayerId(player)])
      }));
      const event = data.events.find((item) => String(item.id) === String(body.competitionId || '')) || null;
      const now = new Date().toISOString();
      const teamARecord = compactTeam(teamAPublic);
      const teamBRecord = compactTeam(teamBPublic);
      const existingSubmission = Array.isArray(report.submissions) ? report.submissions[0] || {} : {};
      const savedSubmission = {
        ...existingSubmission,
        scoreA,
        scoreB,
        proof: '',
        participantCount: participants.length,
        mvpId: reportPlayerId(mvp),
        updatedAt: now
      };

      Object.assign(report, {
        competitionId: text(event?.id || body.competitionId || report.competitionId || '__test__', 120),
        competitionName: text(event?.name || event?.title || body.competitionName || report.competitionName || 'Amistoso / teste', 120),
        round: text(body.round || report.round || 'Não informada', 100),
        game: text(body.game || '', 100),
        notes: text(body.notes || '', 800),
        match: {
          ...(report.match || {}),
          matchFormat: text(event?.matchFormat || body.matchFormat || report.match?.matchFormat || 'MD1', 20),
          teamA: teamARecord,
          teamB: teamBRecord
        },
        teamA: teamARecord,
        teamB: teamBRecord,
        scoreA,
        scoreB,
        finalScoreA: scoreA,
        finalScoreB: scoreB,
        participants,
        playerStats,
        mvp,
        proof,
        proofMeta: {
          name: text(body.proofName || report.proofMeta?.name || 'comprovante-da-partida.webp', 160),
          contentType: text(body.proofType || report.proofMeta?.contentType || 'image/webp', 80),
          size: Number(body.proofSize || report.proofMeta?.size || 0) || 0
        },
        submissions: [savedSubmission],
        winnerTeamId: scoreA > scoreB ? String(teamA.id) : String(teamB.id),
        updatedAt: now
      });
      report.games = [{
        ...(Array.isArray(report.games) ? report.games[0] || {} : {}),
        id: report.games?.[0]?.id || `${report.hubId || report.id}_game_1`,
        gameNumber: 1,
        status: report.status || 'pending',
        finalScoreA: scoreA,
        finalScoreB: scoreB,
        winnerTeamId: report.winnerTeamId,
        proof: '',
        submissions: [savedSubmission],
        updatedAt: now
      }];

      await saveReport(report);
      req.app.locals.realtime?.broadcast?.({
        type: 'match-report:update',
        payload: { report: publicHistoryResult(report) },
        source: 'site'
      });
      return res.json({
        success: true,
        report: publicHistoryResult(report),
        message: 'Alterações salvas em Todos os envios.'
      });
    } catch (error) {
      return res.status(503).json({ success: false, retryable: true, message: 'Não foi possível atualizar esta súmula agora. Tente novamente em instantes.' });
    }
  });

  app.patch('/api/match-reports/:reportId/status', requireAdmin, async (req, res) => {
    try {
      const status = text(req.body?.status, 30).toLowerCase();
      if (!ALLOWED_STATUSES.has(status)) {
        return res.status(400).json({ success: false, message: 'Status de validação inválido.' });
      }
      const reports = await readReports();
      const report = reports.find((item) => (
        String(item.id || '') === String(req.params.reportId) ||
        String(item.messageId || '') === String(req.params.reportId) ||
        String(item.hubId || '') === String(req.params.reportId)
      ));
      if (!report) return res.status(404).json({ success: false, message: 'Súmula não encontrada.' });

      const user = await getSessionUser(req);
      report.status = status;
      report.validationNote = text(req.body?.note || '', 500);
      report.validatedBy = status === 'pending' ? null : {
        id: text(user?.id, 100),
        discordId: text(user?.discordId || user?.id, 40),
        name: text(user?.profile?.username || user?.name || 'Organização', 120)
      };
      report.validatedAt = status === 'validated' ? new Date().toISOString() : null;
      report.rejectedAt = status === 'rejected' ? new Date().toISOString() : null;
      report.updatedAt = new Date().toISOString();
      await saveReport(report);

      req.app.locals.realtime?.broadcast?.({
        type: 'match-report:update',
        payload: { report: publicHistoryResult(report) },
        source: 'site'
      });
      return res.json({ success: true, report: publicHistoryResult(report) });
    } catch (error) {
      return res.status(503).json({ success: false, retryable: true, message: 'Não foi possível alterar o status agora. Tente novamente em instantes.' });
    }
  });

  app.delete('/api/match-reports/:reportId', requireAdmin, async (req, res) => {
    try {
      const reports = await readReports();
      const report = reports.find((item) => (
        String(item.id || '') === String(req.params.reportId) ||
        String(item.messageId || '') === String(req.params.reportId) ||
        String(item.hubId || '') === String(req.params.reportId)
      ));
      if (!report) return res.status(404).json({ success: false, message: 'Súmula não encontrada.' });

      const user = await getSessionUser(req);
      const deletedAt = new Date().toISOString();
      report.status = 'deleted';
      report.deletedAt = deletedAt;
      report.deletedBy = {
        id: text(user?.id, 100),
        discordId: text(user?.discordId || user?.id, 40),
        name: text(user?.profile?.username || user?.name || 'Administração', 120)
      };
      report.updatedAt = deletedAt;
      await saveReport(report);

      const reportId = String(report.id || report.messageId || report.hubId || req.params.reportId);
      req.app.locals.realtime?.broadcast?.({
        type: 'match-report:delete',
        payload: { reportId },
        source: 'site'
      });
      return res.json({ success: true, reportId, message: 'Envio removido do histórico.' });
    } catch (error) {
      return res.status(503).json({ success: false, retryable: true, message: 'Não foi possível excluir este envio agora. Tente novamente em instantes.' });
    }
  });

  console.log('[Súmulas] Envios salvos somente no site, com comprovante, histórico, edição e exclusão administrativa recuperável.');
}

module.exports = {
  registerMatchReportRoutes,
  parseResultRecord,
  publicHistoryResult,
  teamRoster,
  RESULT_CHANNEL
};
