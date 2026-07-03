(function () {
  const statusEl = document.getElementById('resultsStatus');
  const listEl = document.getElementById('resultsList');
  function esc(value) { return VoidArena.escapeHtml(value || ''); }
  function teamName(team = {}, fallback = 'Time') { return team?.name || team?.tag || fallback; }
  function winnerOf(item = {}) {
    const match = item.match || {};
    const a = match.teamA || {};
    const b = match.teamB || {};
    const winnerId = String(item.winnerTeamId || '');
    if (winnerId && String(a.id || '') === winnerId) return a;
    if (winnerId && String(b.id || '') === winnerId) return b;
    const scoreA = Number(item.seriesScoreA || item.finalScoreA || 0);
    const scoreB = Number(item.seriesScoreB || item.finalScoreB || 0);
    return scoreA > scoreB ? a : scoreB > scoreA ? b : null;
  }
  function render(results = []) {
    const finals = results.filter((item) => item.status === 'validated' && winnerOf(item));
    if (!finals.length) {
      listEl.innerHTML = '<div class="va-item">Nenhum vencedor publicado ainda. Assim que uma série for validada, o resumo aparece aqui.</div>';
      return;
    }
    listEl.innerHTML = finals.map((item) => {
      const match = item.match || {};
      const winner = winnerOf(item) || {};
      const loser = String(winner.id || '') === String(match.teamA?.id || '') ? match.teamB : match.teamA;
      return `<article class="va-result-card"><div class="va-section-head"><div><p class="va-eyebrow">${esc(match.roundLabel || item.roundKey || 'Confronto oficial')}</p><h2>🏆 ${esc(teamName(winner, 'Time vencedor'))}</h2><p class="va-muted">Venceu ${esc(teamName(loser, 'adversário'))} pelo placar da série ${item.seriesScoreA || item.finalScoreA || 0} x ${item.seriesScoreB || item.finalScoreB || 0}.</p></div><strong class="va-score-big">GG</strong></div><p>Obrigado aos capitães e jogadores pela participação. O histórico completo de prints fica preservado no Discord para conferência da organização.</p></article>`;
    }).join('');
  }
  async function load() {
    statusEl.textContent = 'Carregando vencedores...';
    statusEl.className = 'va-status';
    const data = await VoidArena.request('/api/match-results').catch((error) => ({ results: [], message: error.message }));
    render(data.results || data.records || []);
    statusEl.textContent = data.message ? `⚠️ ${data.message}` : 'Resultados carregados.';
    statusEl.className = data.message ? 'va-status err' : 'va-status ok';
  }
  document.getElementById('reloadResultsBtn')?.addEventListener('click', load);
  VoidArena.bootLayout('resultados').then(load).catch((error) => { statusEl.textContent = error.message; statusEl.className = 'va-status err'; });
}());
