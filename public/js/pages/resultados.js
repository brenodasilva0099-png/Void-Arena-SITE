(function () {
  const statusEl = document.getElementById('resultsStatus');
  const listEl = document.getElementById('resultsList');

  function teamName(team = {}, fallback = 'Time') { return team?.name || team?.tag || fallback; }
  function esc(value) { return VoidArena.escapeHtml(value || ''); }
  function statusBadge(status = '') {
    const map = {
      validated: ['ok', '✅ Finalizada'],
      partial: ['warn', '🟣 Em andamento'],
      conflict: ['err', '⚠️ Conflito'],
      pending: ['', '⏳ Aguardando']
    };
    const [cls, label] = map[status] || ['', status || 'Aguardando'];
    return `<span class="va-badge ${cls}">${label}</span>`;
  }
  function proofOf(game = {}, result = {}) {
    return game.proof?.url || game.proof?.proxyUrl || result.proof?.url || result.proof?.proxyUrl || '';
  }
  function gameRows(result = {}) {
    const games = Array.isArray(result.games) ? result.games.slice().sort((a, b) => Number(a.gameNumber) - Number(b.gameNumber)) : [];
    if (!games.length) return '<div class="va-result-game-row"><span>Nenhuma partida enviada ainda.</span><span>Use a HUB no Discord.</span></div>';
    return games.map((game) => {
      const proof = proofOf(game, result);
      const score = game.finalScoreA !== null && game.finalScoreA !== undefined
        ? `${game.finalScoreA} x ${game.finalScoreB}`
        : game.submissions?.[0]
          ? `${game.submissions[0].scoreA} x ${game.submissions[0].scoreB}`
          : 'sem placar';
      const submitters = (game.submissions || []).map((s) => s.authorName || s.authorDiscordId).filter(Boolean).slice(-2).join(' / ');
      return `<div class="va-result-game-row">
        <span><strong>Jogo ${esc(game.gameNumber)}</strong> • ${esc(score)} • ${statusBadge(game.status)}</span>
        <span>${submitters ? esc(submitters) : 'sem envio'} ${proof ? `• <a class="va-mini-link" href="${esc(proof)}" target="_blank" rel="noreferrer">print</a>` : ''}</span>
      </div>${proof ? `<img class="va-proof-img" src="${esc(proof)}" alt="Print do jogo ${esc(game.gameNumber)}" loading="lazy" onerror="this.remove()" />` : ''}`;
    }).join('');
  }
  function render(results = []) {
    if (!listEl) return;
    if (!results.length) {
      listEl.innerHTML = '<div class="va-item">Nenhum resultado registrado ainda. Use a HUB no Discord e depois recarregue esta página.</div>';
      return;
    }
    listEl.innerHTML = results.map((item) => {
      const match = item.match || {};
      const a = match.teamA || {};
      const b = match.teamB || {};
      const current = item.status === 'validated' ? 'Série concluída' : `Jogo atual ${item.currentGameNumber || 1} de ${item.bestOf || match.maxGames || 1}`;
      return `<article class="va-result-card">
        <div class="va-section-head">
          <div>
            <p class="va-eyebrow">${esc(match.roundLabel || item.roundKey || 'Confronto')} ${Number(match.matchNumber || item.matchIndex || 0) + (match.matchNumber ? 0 : 1)}</p>
            <h2>${esc(teamName(a, 'Time A'))} <span class="va-muted">vs</span> ${esc(teamName(b, 'Time B'))}</h2>
            <p class="va-muted">${esc(item.matchFormat || match.matchFormat || `MD${item.bestOf || 1}`)} • ${current} • vitórias faltando: ${item.winsRemaining ?? '-'}</p>
          </div>
          <div class="va-result-side">
            ${statusBadge(item.status)}
            <strong class="va-score-big">${item.seriesScoreA || 0} x ${item.seriesScoreB || 0}</strong>
          </div>
        </div>
        <div class="va-kpi-row">
          <span class="va-badge">Partidas: ${item.playedGames || 0}/${item.bestOf || 1}</span>
          <span class="va-badge">Restantes: ${item.remainingGames ?? Math.max(0, (item.bestOf || 1) - (item.playedGames || 0))}</span>
          <span class="va-badge">HUB: ${esc(item.hubId || '-')}</span>
          ${item.advanced ? '<span class="va-badge ok">Avançou no chaveamento</span>' : ''}
        </div>
        <div class="va-result-games">${gameRows(item)}</div>
      </article>`;
    }).join('');
  }
  async function load() {
    statusEl.textContent = 'Carregando resultados...';
    statusEl.className = 'va-status';
    const data = await VoidArena.request('/api/match-results').catch((error) => ({ results: [], message: error.message }));
    render(data.results || data.records || []);
    statusEl.textContent = data.message ? `⚠️ ${data.message}` : 'Resultados carregados.';
    statusEl.className = data.message ? 'va-status err' : 'va-status ok';
  }
  async function syncHubs() {
    statusEl.textContent = 'Sincronizando HUBs no Discord...';
    statusEl.className = 'va-status';
    try {
      const data = await VoidArena.request('/api/result-hubs/sync', { method: 'POST', body: '{}' });
      const result = data.resultHubs || {};
      statusEl.textContent = `HUBs: ${result.created || 0} criadas • ${result.reused || 0} atualizadas • ${result.totalMatches || 0} confrontos${result.errors?.length ? ` • ${result.errors.length} erro(s)` : ''}.`;
      statusEl.className = result.errors?.length ? 'va-status err' : 'va-status ok';
      await load();
    } catch (error) {
      statusEl.textContent = error.message;
      statusEl.className = 'va-status err';
    }
  }
  document.getElementById('reloadResultsBtn')?.addEventListener('click', load);
  document.getElementById('syncResultsHubsBtn')?.addEventListener('click', syncHubs);
  VoidArena.bootLayout('resultados').then(load).catch((error) => { statusEl.textContent = error.message; statusEl.className = 'va-status err'; });
}());
