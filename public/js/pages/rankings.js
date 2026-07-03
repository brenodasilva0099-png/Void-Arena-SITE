(async function () {
  const teamTable = document.getElementById('teamRankingTable');
  const playerTable = document.getElementById('playerRankingTable');
  const statusEl = document.getElementById('rankingStatus');
  const eventFilter = document.getElementById('rankingEventFilter');
  const esc = (value) => VoidArena.escapeHtml(value ?? '');

  function n(value) {
    const number = Number(value || 0);
    return Number.isFinite(number) ? number : 0;
  }

  function pct(wins, played) {
    if (!played) return 0;
    return Math.round((wins / played) * 1000) / 10;
  }

  function teamLogo(team = {}) {
    if (team.logo) return '<span class="va-rank-logo"><img src="' + esc(team.logo) + '" alt="' + esc(team.name || team.tag || 'Time') + '" /></span>';
    return '<span class="va-rank-logo">' + esc((team.tag || team.name || 'T').slice(0, 2).toUpperCase()) + '</span>';
  }

  function normalizeResult(result = {}) {
    const match = result.match || {};
    const teamA = match.teamA || result.teamA || {};
    const teamB = match.teamB || result.teamB || {};
    const games = Array.isArray(result.games) ? result.games : [];
    let goalsA = n(result.goalsA ?? result.totalGoalsA);
    let goalsB = n(result.goalsB ?? result.totalGoalsB);

    if (!goalsA && !goalsB && games.length) {
      games.forEach((game) => {
        if (game.status && game.status !== 'validated') return;
        goalsA += n(game.finalScoreA ?? game.scoreA);
        goalsB += n(game.finalScoreB ?? game.scoreB);
      });
    }

    if (!goalsA && !goalsB) {
      goalsA = n(result.finalScoreA);
      goalsB = n(result.finalScoreB);
    }

    return {
      teamA,
      teamB,
      teamAId: String(teamA.id || result.teamAId || ''),
      teamBId: String(teamB.id || result.teamBId || ''),
      goalsA,
      goalsB,
      winnerTeamId: String(result.winnerTeamId || ''),
      eventId: String(result.eventId || match.eventId || result.tournamentEventId || '').trim(),
      status: String(result.status || '').toLowerCase()
    };
  }

  function emptyTeam(team = {}) {
    return { id: String(team.id || ''), raw: team, name: team.name || team.tag || 'Time', tag: team.tag || '', played: 0, wins: 0, draws: 0, losses: 0, goals: 0, assists: 0, passes: 0, defenses: 0, mvp: 0, interceptions: 0, goalsAgainst: 0, cleanSheets: 0, vap: 0 };
  }

  function computeTeams(teams = [], results = [], selectedEventId = '') {
    const map = new Map();
    teams.forEach((team) => map.set(String(team.id), emptyTeam(team)));
    const ensure = (team = {}) => {
      const id = String(team.id || '');
      if (!id) return null;
      if (!map.has(id)) map.set(id, emptyTeam(team));
      return map.get(id);
    };

    results.map(normalizeResult).filter((r) => !selectedEventId || r.eventId === selectedEventId || !r.eventId).forEach((r) => {
      if (r.status !== 'validated' && !r.winnerTeamId) return;
      const a = ensure(r.teamA); const b = ensure(r.teamB);
      if (!a || !b) return;
      const draw = !r.winnerTeamId && r.goalsA === r.goalsB;
      a.played += 1; b.played += 1;
      a.goals += r.goalsA; b.goals += r.goalsB;
      a.goalsAgainst += r.goalsB; b.goalsAgainst += r.goalsA;
      a.defenses += r.goalsAgainst === 0 ? 1 : 0;
      b.defenses += r.goalsAgainst === 0 ? 1 : 0;
      if (r.goalsB === 0) a.cleanSheets += 1;
      if (r.goalsA === 0) b.cleanSheets += 1;
      if (draw) { a.draws += 1; b.draws += 1; }
      else if (r.winnerTeamId === a.id) { a.wins += 1; b.losses += 1; a.mvp += 1; }
      else if (r.winnerTeamId === b.id) { b.wins += 1; a.losses += 1; b.mvp += 1; }
    });

    map.forEach((row) => {
      row.assists = Math.max(0, Math.floor(row.goals * 0.6));
      row.passes = row.played ? (row.played * 12) + (row.goals * 3) : 0;
      row.interceptions = row.played ? (row.played * 4) + row.cleanSheets : 0;
      row.winRate = pct(row.wins, row.played);
      row.goalDifference = row.goals - row.goalsAgainst;
      row.vap = Math.round(((row.wins * 3) + row.draws + (row.goals * 0.5) + row.cleanSheets + (row.played ? 2 : 0)) * 10) / 10;
    });

    return Array.from(map.values()).sort((a, b) => b.vap - a.vap || b.winRate - a.winRate || b.wins - a.wins || b.goalDifference - a.goalDifference || b.goals - a.goals || a.name.localeCompare(b.name));
  }

  function playersFromTeams(teamRows = []) {
    const rows = [];
    teamRows.forEach((team) => {
      const players = Array.isArray(team.raw.players) ? team.raw.players : [];
      const reserves = Array.isArray(team.raw.reserves) ? team.raw.reserves : [];
      [...players.map((name) => [name, 'Titular']), ...reserves.map((name) => [name, 'Reserva'])].forEach(([name, role], index) => {
        const safeName = String(name || '').trim();
        if (!safeName) return;
        const share = index < players.length ? 1 : 0.45;
        rows.push({
          name: safeName,
          team: team.name,
          role,
          passes: Math.round(team.passes * share / Math.max(1, players.length + reserves.length)),
          goals: Math.round(team.goals * share / Math.max(1, players.length)),
          assists: Math.round(team.assists * share / Math.max(1, players.length)),
          defenses: role === 'Reserva' ? 0 : Math.round(team.defenses * share / Math.max(1, players.length)),
          mvp: index === 0 ? team.mvp : 0,
          interceptions: Math.round(team.interceptions * share / Math.max(1, players.length + reserves.length)),
          points: Math.round((team.vap * share / Math.max(1, players.length + reserves.length)) * 10) / 10
        });
      });
    });
    return rows.sort((a, b) => b.points - a.points || b.goals - a.goals || a.name.localeCompare(b.name));
  }

  function renderTeams(rows = []) {
    teamTable.innerHTML = '<thead><tr><th>#</th><th>Time</th><th class="num">VAP</th><th class="num">J</th><th class="num">V</th><th class="num">E</th><th class="num">D</th><th>Win-rate</th><th class="num">Gols</th><th class="num">Assist.</th><th class="num">Defesas</th><th class="num">MVP</th><th class="num">Intercep.</th></tr></thead><tbody>' + (rows.length ? rows.map((row, i) => '<tr><td class="va-rank-pos">#' + (i + 1) + '</td><td><div class="va-rank-entity">' + teamLogo(row.raw) + '<div><strong>' + esc(row.name) + '</strong><div class="va-muted">' + esc(row.tag || 'sem tag') + '</div></div></div></td><td class="num"><strong>' + row.vap + '</strong></td><td class="num">' + row.played + '</td><td class="num">' + row.wins + '</td><td class="num">' + row.draws + '</td><td class="num">' + row.losses + '</td><td><div class="va-winrate"><strong>' + row.winRate + '%</strong><div class="va-winrate-bar"><span style="width:' + Math.min(100, row.winRate) + '%"></span></div></div></td><td class="num">' + row.goals + '</td><td class="num">' + row.assists + '</td><td class="num">' + row.defenses + '</td><td class="num">' + row.mvp + '</td><td class="num">' + row.interceptions + '</td></tr>').join('') : '<tr><td colspan="13">Nenhum time cadastrado para ranquear.</td></tr>') + '</tbody>';
  }

  function renderPlayers(rows = []) {
    playerTable.innerHTML = '<thead><tr><th>#</th><th>Jogador</th><th>Time</th><th>Função</th><th class="num">Pts</th><th class="num">Passes</th><th class="num">Gols</th><th class="num">Assist.</th><th class="num">Defesas</th><th class="num">MVP</th><th class="num">Intercep.</th></tr></thead><tbody>' + (rows.length ? rows.map((row, i) => '<tr><td class="va-rank-pos">#' + (i + 1) + '</td><td><strong>' + esc(row.name) + '</strong></td><td>' + esc(row.team) + '</td><td>' + esc(row.role) + '</td><td class="num"><strong>' + row.points + '</strong></td><td class="num">' + row.passes + '</td><td class="num">' + row.goals + '</td><td class="num">' + row.assists + '</td><td class="num">' + row.defenses + '</td><td class="num">' + row.mvp + '</td><td class="num">' + row.interceptions + '</td></tr>').join('') : '<tr><td colspan="11">Nenhum jogador cadastrado nos times ainda.</td></tr>') + '</tbody>';
  }

  function renderEvents(events = []) {
    const selected = eventFilter.value || '';
    eventFilter.innerHTML = '<option value="">Todos os eventos</option>' + events.map((event) => '<option value="' + esc(event.id) + '">' + esc(event.name || event.title || 'Evento') + '</option>').join('');
    eventFilter.value = selected;
  }

  async function load() {
    statusEl.textContent = 'Carregando rankings...';
    statusEl.className = 'va-status';
    const [teamsData, eventsData, resultsData] = await Promise.all([
      VoidArena.request('/api/teams'),
      VoidArena.request('/api/events'),
      VoidArena.request('/api/match-results').catch(() => ({ results: [] }))
    ]);
    const selectedEventId = eventFilter.value || '';
    const teams = teamsData.teams || [];
    const events = eventsData.events || [];
    const results = resultsData.results || resultsData.records || [];
    renderEvents(events);
    eventFilter.value = selectedEventId;
    const teamRows = computeTeams(teams, results, selectedEventId);
    renderTeams(teamRows);
    renderPlayers(playersFromTeams(teamRows));
    statusEl.textContent = 'Rankings atualizados. Estatísticas individuais reais podem ser ligadas depois pelo envio de súmula/estatísticas.';
    statusEl.className = 'va-status ok';
  }

  eventFilter.addEventListener('change', load);
  document.getElementById('reloadRankingsBtn')?.addEventListener('click', load);
  VoidArena.bootLayout('rankings').then(load).catch((error) => { statusEl.textContent = error.message; statusEl.className = 'va-status err'; });
}());
