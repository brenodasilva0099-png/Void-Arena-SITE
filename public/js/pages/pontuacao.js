(function () {
  const RULES = [
    ['3', 'Vitória', 'Ganhou a partida: soma 3 pontos'],
    ['1', 'Empate', 'Empatou a partida: soma 1 ponto'],
    ['0', 'Derrota', 'Perdeu: não soma ponto de resultado'],
    ['+0,5', 'Por gol marcado', 'Cada gol ajuda, mas não vale mais que vencer'],
    ['+1', 'Clean sheet', 'Bônus por vencer sem sofrer gol'],
    ['+2', 'Participação', 'Time validado no evento soma presença'],
    ['+30', 'Campeão', 'Bônus de colocação para campeão'],
    ['+20', 'Vice', 'Bônus de colocação para vice-campeão']
  ];

  const $ = (id) => document.getElementById(id);
  const esc = (value) => VoidArena.escapeHtml(value ?? '');
  const statusEl = $('scoringStatus');
  const rulesEl = $('scoringRules');
  const summaryEl = $('scoringSummary');
  const validationEl = $('scoringValidation');
  const eventFilterEl = $('eventFilter');

  function num(value) { const n = Number(value || 0); return Number.isFinite(n) ? n : 0; }
  function normalizeResult(result = {}) {
    const match = result.match || {};
    const teamA = match.teamA || result.teamA || {};
    const teamB = match.teamB || result.teamB || {};
    const games = Array.isArray(result.games) ? result.games : [];
    let goalsA = num(result.goalsA ?? result.totalGoalsA);
    let goalsB = num(result.goalsB ?? result.totalGoalsB);
    if (!goalsA && !goalsB && games.length) {
      games.forEach((game) => { if (game.status && game.status !== 'validated') return; goalsA += num(game.finalScoreA ?? game.scoreA); goalsB += num(game.finalScoreB ?? game.scoreB); });
    }
    if (!goalsA && !goalsB) { goalsA = num(result.finalScoreA); goalsB = num(result.finalScoreB); }
    return { teamA, teamB, goalsA, goalsB, scoreA: num(result.seriesScoreA ?? result.finalScoreA), scoreB: num(result.seriesScoreB ?? result.finalScoreB), winnerTeamId: String(result.winnerTeamId || ''), eventId: String(result.eventId || match.eventId || result.tournamentEventId || '').trim(), status: String(result.status || '').toLowerCase() };
  }
  function teamName(team = {}, fallback = 'Time') { return team.name || team.tag || fallback; }
  function renderRules() { rulesEl.innerHTML = RULES.map(([value, title, text]) => '<article class="va-scoring-rule-card"><strong>' + esc(value) + '</strong><h3>' + esc(title) + '</h3><p>' + esc(text) + '</p></article>').join(''); }
  function renderEvents(events = []) { const selected = eventFilterEl.value || ''; eventFilterEl.innerHTML = '<option value="">Todos os eventos</option>' + events.map((event) => '<option value="' + esc(event.id) + '">' + esc(event.name || event.title || 'Evento') + '</option>').join(''); eventFilterEl.value = selected; }
  function renderSummary(results = [], selectedEventId = '') {
    const rows = results.map(normalizeResult).filter((item) => !selectedEventId || item.eventId === selectedEventId || !item.eventId);
    const validated = rows.filter((item) => item.status === 'validated' || item.winnerTeamId);
    const pending = rows.filter((item) => item.status && item.status !== 'validated' && !item.winnerTeamId);
    const goals = validated.reduce((sum, item) => sum + item.goalsA + item.goalsB, 0);
    summaryEl.innerHTML = '<div><strong>' + validated.length + '</strong><span>resultados validados</span></div><div><strong>' + pending.length + '</strong><span>pendentes/conflitos</span></div><div><strong>' + goals + '</strong><span>gols somados</span></div><div><strong>' + (validated.length ? 'ativo' : 'aguardando') + '</strong><span>status do ranking</span></div>';
  }
  function renderValidation(results = [], selectedEventId = '') {
    const rows = results.map(normalizeResult).filter((item) => (!selectedEventId || item.eventId === selectedEventId || !item.eventId) && item.status !== 'validated' && !item.winnerTeamId).slice(0, 20);
    validationEl.innerHTML = rows.length ? rows.map((item) => '<article class="va-item va-validation-item"><div><strong>' + esc(teamName(item.teamA, 'Time A')) + ' x ' + esc(teamName(item.teamB, 'Time B')) + '</strong><div class="va-muted">Status: ' + esc(item.status || 'pendente') + ' • Série ' + item.scoreA + ' x ' + item.scoreB + ' • Gols ' + item.goalsA + ' x ' + item.goalsB + '</div></div><a class="va-btn secondary" href="/pages/resultados.html">Abrir resultados</a></article>').join('') : '<div class="va-item">Nenhum resultado pendente. Os vencedores validados já estão prontos para alimentar o ranking.</div>';
  }
  async function load() {
    statusEl.textContent = 'Carregando regras e validações...'; statusEl.className = 'va-status';
    const [eventsData, resultsData] = await Promise.all([VoidArena.request('/api/events'), VoidArena.request('/api/match-results').catch((error) => ({ results: [], message: error.message }))]);
    const events = eventsData.events || []; const results = resultsData.results || resultsData.records || []; const selectedEventId = eventFilterEl.value || '';
    renderEvents(events); eventFilterEl.value = selectedEventId; renderRules(); renderSummary(results, selectedEventId); renderValidation(results, selectedEventId);
    statusEl.textContent = resultsData.message ? 'Aviso: ' + resultsData.message : 'Pontuação pronta. ' + results.length + ' resultado(s) encontrados.';
    statusEl.className = resultsData.message ? 'va-status err' : 'va-status ok';
  }
  eventFilterEl.addEventListener('change', load);
  $('reloadScoringBtn').addEventListener('click', load);
  VoidArena.bootLayout('pontuacao').then(load).catch((error) => { statusEl.textContent = error.message; statusEl.className = 'va-status err'; });
}());
