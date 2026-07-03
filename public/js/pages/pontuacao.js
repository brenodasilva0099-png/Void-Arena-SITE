(function () {
  const RULES = {
    win: 3,
    draw: 1,
    loss: 0,
    goal: 0.5,
    cleanSheet: 1,
    participation: 2,
    placements: {
      champion: 30,
      runnerUp: 20,
      third: 14,
      fourth: 10,
      semifinal: 8,
      quarterfinal: 5
    },
    multipliers: {
      scrim: 0.5,
      small: 1,
      official: 1.5,
      main: 2,
      elite: 2.5
    }
  };

  const $ = (id) => document.getElementById(id);
  const esc = (value) => VoidArena.escapeHtml(value ?? '');
  const statusEl = $('scoringStatus');
  const rulesEl = $('scoringRules');
  const teamsEl = $('scoringTeams');
  const playersEl = $('scoringPlayers');
  const validationEl = $('scoringValidation');
  const eventFilterEl = $('eventFilter');

  function asNumber(value) {
    const n = Number(value || 0);
    return Number.isFinite(n) ? n : 0;
  }

  function teamLabel(team = {}, fallback = 'Time') {
    return team.name || team.tag || fallback;
  }

  function eventType(event = {}) {
    const raw = String(event.scoringType || event.type || event.category || event.weight || '').toLowerCase();
    const text = `${raw} ${event.name || ''} ${event.title || ''} ${event.description || ''}`.toLowerCase();
    if (text.includes('elite')) return 'elite';
    if (text.includes('principal') || text.includes('main')) return 'main';
    if (text.includes('oficial') || text.includes('official')) return 'official';
    if (text.includes('scrim') || text.includes('amistoso')) return 'scrim';
    return 'small';
  }

  function eventMultiplier(event = {}) {
    const direct = Number(event.scoringMultiplier || event.multiplier || event.pointsMultiplier);
    if (Number.isFinite(direct) && direct > 0) return direct;
    return RULES.multipliers[eventType(event)] || 1;
  }

  function normalizeResult(result = {}) {
    const match = result.match || {};
    const teamA = match.teamA || result.teamA || {};
    const teamB = match.teamB || result.teamB || {};
    const games = Array.isArray(result.games) ? result.games : [];

    let goalsA = asNumber(result.goalsA ?? result.totalGoalsA);
    let goalsB = asNumber(result.goalsB ?? result.totalGoalsB);

    if (!goalsA && !goalsB && games.length) {
      games.forEach((game) => {
        if (game.status && game.status !== 'validated') return;
        goalsA += asNumber(game.finalScoreA ?? game.scoreA);
        goalsB += asNumber(game.finalScoreB ?? game.scoreB);
      });
    }

    if (!goalsA && !goalsB) {
      goalsA = asNumber(result.finalScoreA);
      goalsB = asNumber(result.finalScoreB);
    }

    const winnerTeamId = String(result.winnerTeamId || '');
    const scoreA = asNumber(result.seriesScoreA ?? result.finalScoreA);
    const scoreB = asNumber(result.seriesScoreB ?? result.finalScoreB);
    const isDraw = !winnerTeamId && scoreA === scoreB && (scoreA > 0 || scoreB > 0);

    return {
      ...result,
      match,
      teamA,
      teamB,
      teamAId: String(teamA.id || result.teamAId || ''),
      teamBId: String(teamB.id || result.teamBId || ''),
      goalsA,
      goalsB,
      scoreA,
      scoreB,
      winnerTeamId,
      isDraw,
      eventId: String(result.eventId || match.eventId || result.tournamentEventId || '').trim(),
      status: String(result.status || '').toLowerCase()
    };
  }

  function emptyTeamStats(team = {}) {
    return {
      id: String(team.id || ''),
      name: teamLabel(team),
      logo: team.logo || '',
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      cleanSheets: 0,
      basePoints: 0,
      eventBonus: 0,
      total: 0,
      events: new Set()
    };
  }

  function addMatchPoints(stats, { goalsFor, goalsAgainst, result }) {
    stats.played += 1;
    stats.goalsFor += goalsFor;
    stats.goalsAgainst += goalsAgainst;
    stats.basePoints += goalsFor * RULES.goal;

    if (goalsAgainst === 0) {
      stats.cleanSheets += 1;
      stats.basePoints += RULES.cleanSheet;
    }

    if (result === 'win') {
      stats.wins += 1;
      stats.basePoints += RULES.win;
    } else if (result === 'draw') {
      stats.draws += 1;
      stats.basePoints += RULES.draw;
    } else {
      stats.losses += 1;
      stats.basePoints += RULES.loss;
    }
  }

  function computeTeamRanking({ teams = [], events = [], results = [], selectedEventId = '' }) {
    const eventById = new Map(events.map((event) => [String(event.id), event]));
    const stats = new Map();
    teams.forEach((team) => stats.set(String(team.id), emptyTeamStats(team)));

    const ensureTeam = (team = {}) => {
      const id = String(team.id || '');
      if (!id) return null;
      if (!stats.has(id)) stats.set(id, emptyTeamStats(team));
      return stats.get(id);
    };

    const normalizedResults = results.map(normalizeResult).filter((result) => {
      if (selectedEventId && result.eventId && result.eventId !== selectedEventId) return false;
      return result.status === 'validated' || result.winnerTeamId || result.isDraw;
    });

    normalizedResults.forEach((result) => {
      const a = ensureTeam(result.teamA);
      const b = ensureTeam(result.teamB);
      if (!a || !b) return;

      const event = eventById.get(result.eventId) || {};
      const multiplier = eventMultiplier(event);
      a.events.add(result.eventId || 'evento');
      b.events.add(result.eventId || 'evento');

      const aResult = result.isDraw ? 'draw' : result.winnerTeamId === a.id ? 'win' : 'loss';
      const bResult = result.isDraw ? 'draw' : result.winnerTeamId === b.id ? 'win' : 'loss';
      const beforeA = a.basePoints;
      const beforeB = b.basePoints;

      addMatchPoints(a, { goalsFor: result.goalsA, goalsAgainst: result.goalsB, result: aResult });
      addMatchPoints(b, { goalsFor: result.goalsB, goalsAgainst: result.goalsA, result: bResult });

      a.basePoints = beforeA + ((a.basePoints - beforeA) * multiplier);
      b.basePoints = beforeB + ((b.basePoints - beforeB) * multiplier);
    });

    return Array.from(stats.values()).map((item) => ({
      ...item,
      goalDifference: item.goalsFor - item.goalsAgainst,
      total: Math.round((item.basePoints + item.eventBonus + (item.events.size ? RULES.participation : 0)) * 10) / 10,
      eventCount: item.events.size
    })).sort((a, b) =>
      b.total - a.total ||
      b.wins - a.wins ||
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor ||
      a.name.localeCompare(b.name)
    );
  }

  function computePlayerRanking(teamRanking = [], teams = []) {
    const rows = [];
    const teamById = new Map(teams.map((team) => [String(team.id), team]));

    teamRanking.forEach((stats) => {
      const team = teamById.get(stats.id) || {};
      const names = [
        ...(Array.isArray(team.players) ? team.players : []),
        ...(Array.isArray(team.reserves) ? team.reserves : [])
      ].map((name) => String(name || '').trim()).filter(Boolean);

      names.forEach((name, index) => {
        rows.push({
          name,
          teamName: stats.name,
          role: index < (team.players || []).length ? 'Titular' : 'Reserva',
          points: Math.round(((stats.total * 0.25) + (stats.wins * 1) + (stats.eventCount * 2)) * 10) / 10
        });
      });
    });

    return rows.sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
  }

  function renderRules() {
    rulesEl.innerHTML = `
      <div class="va-kpi"><strong>${RULES.win}</strong><span>Vitória</span></div>
      <div class="va-kpi"><strong>${RULES.draw}</strong><span>Empate</span></div>
      <div class="va-kpi"><strong>+${String(RULES.goal).replace('.', ',')}</strong><span>Por gol marcado</span></div>
      <div class="va-kpi"><strong>+${RULES.cleanSheet}</strong><span>Sem sofrer gol</span></div>
      <div class="va-kpi"><strong>+${RULES.placements.champion}</strong><span>Campeão do evento</span></div>
      <div class="va-kpi"><strong>x0.5–x2.5</strong><span>Peso do evento</span></div>
    `;
  }

  function renderTeams(rows = []) {
    teamsEl.innerHTML = rows.length ? rows.map((row, index) => `
      <article class="va-item va-ranking-row">
        <div class="va-rank-number">#${index + 1}</div>
        <div class="va-team-mini-logo">${row.logo ? `<img src="${esc(row.logo)}" alt="${esc(row.name)}" />` : '🛡️'}</div>
        <div class="va-grow">
          <strong>${esc(row.name)}</strong>
          <div class="va-muted">${row.played} jogos • ${row.wins}V ${row.draws}E ${row.losses}D • SG ${row.goalDifference >= 0 ? '+' : ''}${row.goalDifference}</div>
        </div>
        <div class="va-score-pill">${row.total} VAP</div>
      </article>
    `).join('') : '<div class="va-item">Nenhum ponto calculado ainda. Valide resultados para alimentar o ranking.</div>';
  }

  function renderPlayers(rows = []) {
    playersEl.innerHTML = rows.length ? rows.slice(0, 30).map((row, index) => `
      <article class="va-item va-ranking-row compact">
        <div class="va-rank-number">#${index + 1}</div>
        <div class="va-grow"><strong>${esc(row.name)}</strong><div class="va-muted">${esc(row.teamName)} • ${esc(row.role)}</div></div>
        <div class="va-score-pill">${row.points} pts</div>
      </article>
    `).join('') : '<div class="va-item">Ranking de jogadores entra quando os times tiverem jogadores cadastrados em lista.</div>';
  }

  function renderValidation(results = []) {
    const rows = results.map(normalizeResult).filter((item) => item.status !== 'validated').slice(0, 20);
    validationEl.innerHTML = rows.length ? rows.map((item) => `
      <article class="va-item">
        <strong>${esc(teamLabel(item.teamA, 'Time A'))} x ${esc(teamLabel(item.teamB, 'Time B'))}</strong>
        <div class="va-muted">Status: ${esc(item.status || 'pendente')} • Série ${item.scoreA} x ${item.scoreB} • Gols ${item.goalsA} x ${item.goalsB}</div>
        <button class="va-btn secondary" type="button" disabled>Validação manual será ligada ao BOT</button>
      </article>
    `).join('') : '<div class="va-item">Nenhum resultado pendente. Os vencedores validados já estão somando pontos.</div>';
  }

  function renderEvents(events = []) {
    eventFilterEl.innerHTML = '<option value="">Todos os eventos</option>' + events.map((event) => (
      `<option value="${esc(event.id)}">${esc(event.name || event.title || 'Evento')}</option>`
    )).join('');
  }

  async function load() {
    statusEl.textContent = 'Carregando pontuação...';
    statusEl.className = 'va-status';

    const [teamsData, eventsData, resultsData] = await Promise.all([
      VoidArena.request('/api/teams'),
      VoidArena.request('/api/events'),
      VoidArena.request('/api/match-results').catch((error) => ({ results: [], message: error.message }))
    ]);

    const teams = teamsData.teams || [];
    const events = eventsData.events || [];
    const results = resultsData.results || resultsData.records || [];
    const selectedEventId = eventFilterEl.value || '';
    const ranking = computeTeamRanking({ teams, events, results, selectedEventId });
    const playerRanking = computePlayerRanking(ranking, teams);

    renderEvents(events);
    eventFilterEl.value = selectedEventId;
    renderRules();
    renderTeams(ranking);
    renderPlayers(playerRanking);
    renderValidation(results);

    statusEl.textContent = resultsData.message ? `⚠️ ${resultsData.message}` : `Pontuação atualizada com ${results.length} resultado(s).`;
    statusEl.className = resultsData.message ? 'va-status err' : 'va-status ok';
  }

  eventFilterEl?.addEventListener('change', load);
  $('reloadScoringBtn')?.addEventListener('click', load);

  VoidArena.bootLayout('pontuacao')
    .then(() => load())
    .catch((error) => {
      statusEl.textContent = `❌ ${error.message}`;
      statusEl.className = 'va-status err';
    });
}());
