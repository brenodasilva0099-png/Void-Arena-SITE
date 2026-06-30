(function () {
  const list = document.getElementById('resultsList');
  const statusEl = document.getElementById('resultsStatus');
  function scoreOf(item) {
    if (item.finalScoreA !== null && item.finalScoreA !== undefined) return `${item.finalScoreA} x ${item.finalScoreB}`;
    const first = item.submissions?.[0];
    if (first && first.scoreA !== undefined) return `${first.scoreA} x ${first.scoreB}`;
    return 'Aguardando validação';
  }
  function statusBadge(status) { return `<span class="va-badge ${status === 'validated' ? 'ok' : status === 'conflict' ? 'err' : ''}">${VoidArena.escapeHtml(status || 'pending')}</span>`; }
  function render(results = []) {
    if (!results.length) { list.innerHTML = '<div class="va-item">Nenhum resultado registrado ainda.</div>'; return; }
    list.innerHTML = results.map((item) => {
      const m = item.match || {};
      const proof = item.proofUrl || item.proof?.url || item.submissions?.[0]?.proofUrl || '';
      return `<div class="va-item va-result-item"><div><strong>${VoidArena.escapeHtml(m.teamA?.name || 'Time A')} vs ${VoidArena.escapeHtml(m.teamB?.name || 'Time B')}</strong><div class="va-muted">Placar: ${VoidArena.escapeHtml(scoreOf(item))} • ${VoidArena.formatDate(item.updatedAt || item.createdAt)}</div></div><div>${statusBadge(item.status)}${proof ? `<a class="va-mini-link" href="${VoidArena.escapeHtml(proof)}" target="_blank" rel="noreferrer">Ver print</a>` : ''}</div></div>`;
    }).join('');
  }
  async function load() {
    statusEl.textContent = 'Carregando resultados...';
    const data = await VoidArena.request('/api/match-results').catch(() => ({ results: [] }));
    render(data.results || data.records || []);
    statusEl.textContent = 'Resultados carregados.'; statusEl.className = 'va-status ok';
  }
  document.getElementById('reloadResultsBtn')?.addEventListener('click', load);
  VoidArena.bootLayout('resultados').then(load).catch((error) => { statusEl.textContent = `❌ ${error.message}`; statusEl.className = 'va-status err'; });
}());
