(function () {
  const list = document.getElementById('resultsList');
  const statusEl = document.getElementById('resultsStatus');

  function statusLabel(status) {
    return ({ validated: 'Série finalizada', partial: 'Em andamento', conflict: 'Conflito', pending: 'Aguardando' })[status] || status || 'Aguardando';
  }

  function statusBadge(status) {
    const cls = status === 'validated' ? 'ok' : status === 'conflict' ? 'err' : status === 'partial' ? 'warn' : '';
    return `<span class="va-badge ${cls}">${VoidArena.escapeHtml(statusLabel(status))}</span>`;
  }

  function proofOf(item) {
    if (item.proof?.url) return item.proof.url;
    const games = Array.isArray(item.games) ? item.games : [];
    const latest = [...games].reverse().find((game) => game.proof?.url || game.submissions?.some((submission) => submission.proof?.url));
    return latest?.proof?.url || latest?.submissions?.find((submission) => submission.proof?.url)?.proof?.url || '';
  }

  function gameRows(item) {
    const games = Array.isArray(item.games) ? item.games.slice().sort((a, b) => Number(a.gameNumber) - Number(b.gameNumber)) : [];
    if (!games.length) return '<div class="va-muted">Nenhuma partida enviada ainda.</div>';
    return `<div class="va-result-games">${games.map((game) => {
      const score = game.finalScoreA !== null && game.finalScoreA !== undefined
        ? `${game.finalScoreA} x ${game.finalScoreB}`
        : game.submissions?.[0]
          ? `${game.submissions[0].scoreA} x ${game.submissions[0].scoreB}`
          : 'sem placar';
      const proof = game.proof?.url || game.submissions?.find((submission) => submission.proof?.url)?.proof?.url || '';
      return `<div class="va-result-game"><span>Jogo ${VoidArena.escapeHtml(game.gameNumber || '?')}</span><strong>${VoidArena.escapeHtml(score)}</strong><em>${VoidArena.escapeHtml(statusLabel(game.status))}</em>${proof ? `<a class="va-mini-link" href="${VoidArena.escapeHtml(proof)}" target="_blank" rel="noreferrer">print</a>` : ''}</div>`;
    }).join('')}</div>`;
  }

  function render(results = []) {
    if (!results.length) {
      list.innerHTML = '<div class="va-item">Nenhum resultado registrado ainda.</div>';
      return;
    }

    list.innerHTML = results.map((item) => {
      const m = item.match || {};
      const proof = proofOf(item);
      const bestOf = item.bestOf || m.maxGames || 1;
      const current = item.status === 'validated' ? 'concluída' : `jogo ${item.currentGameNumber || 1} de ${bestOf}`;
      return `
        <div class="va-item va-result-item va-result-series">
          <div class="va-result-main">
            <strong>${VoidArena.escapeHtml(m.teamA?.name || 'Time A')} vs ${VoidArena.escapeHtml(m.teamB?.name || 'Time B')}</strong>
            <div class="va-muted">
              Série ${VoidArena.escapeHtml(m.matchFormat || `MD${bestOf}`)} • ${VoidArena.escapeHtml(current)} •
              Placar da série: ${VoidArena.escapeHtml(m.teamA?.tag || m.teamA?.name || 'A')} ${item.seriesScoreA || item.finalScoreA || 0} x ${item.seriesScoreB || item.finalScoreB || 0} ${VoidArena.escapeHtml(m.teamB?.tag || m.teamB?.name || 'B')}
            </div>
            <div class="va-muted">Concluídas: ${item.playedGames || 0}/${bestOf} • possíveis restantes: ${item.remainingGames ?? Math.max(0, bestOf - (item.playedGames || 0))} • vitórias faltando: ${item.winsRemaining ?? '-'}</div>
            ${gameRows(item)}
          </div>
          <div class="va-result-side">
            ${statusBadge(item.status)}
            ${proof ? `<a class="va-mini-link" href="${VoidArena.escapeHtml(proof)}" target="_blank" rel="noreferrer">Ver última print</a>` : ''}
            <span class="va-muted">${VoidArena.formatDate(item.updatedAt || item.createdAt)}</span>
          </div>
        </div>`;
    }).join('');
  }

  async function load() {
    statusEl.textContent = 'Carregando resultados...';
    statusEl.className = 'va-status';
    const data = await VoidArena.request('/api/match-results').catch(() => ({ results: [] }));
    render(data.results || data.records || []);
    statusEl.textContent = 'Resultados carregados.';
    statusEl.className = 'va-status ok';
  }

  async function syncHubs() {
    statusEl.textContent = 'Sincronizando HUBs no Discord...';
    statusEl.className = 'va-status';
    try {
      const data = await VoidArena.request('/api/result-hubs/sync', { method: 'POST', body: '{}' });
      const result = data.resultHubs || {};
      statusEl.textContent = `HUBs: ${result.created || 0} criadas • ${result.reused || 0} atualizadas • ${result.totalMatches || 0} confrontos${result.errors?.length ? ` • ${result.errors.length} erro(s)` : ''}.`;
      statusEl.className = result.errors?.length ? 'va-status err' : 'va-status ok';
    } catch (error) {
      statusEl.textContent = error.message;
      statusEl.className = 'va-status err';
    }
  }

  document.getElementById('reloadResultsBtn')?.addEventListener('click', load);
  document.getElementById('syncResultsHubsBtn')?.addEventListener('click', syncHubs);
  VoidArena.bootLayout('resultados').then(load).catch((error) => { statusEl.textContent = error.message; statusEl.className = 'va-status err'; });
}());
