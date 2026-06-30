(function () {
  const list = document.getElementById('resultsList');
  const statusEl = document.getElementById('resultsStatus');
  function render(results = []) {
    if (!results.length) {
      list.innerHTML = '<div class="va-item">Nenhum resultado registrado ainda.</div>';
      return;
    }
    list.innerHTML = results.map((item) => {
      const m = item.match || {};
      const score = item.finalScoreA !== null && item.finalScoreA !== undefined ? `${item.finalScoreA} x ${item.finalScoreB}` : 'Aguardando validação';
      return `<div class="va-item"><strong>${VoidArena.escapeHtml(m.teamA?.name || 'Time A')} vs ${VoidArena.escapeHtml(m.teamB?.name || 'Time B')}</strong><div class="va-muted">Status: ${VoidArena.escapeHtml(item.status || 'pending')} • Placar: ${VoidArena.escapeHtml(score)} • Atualizado: ${VoidArena.formatDate(item.updatedAt || item.createdAt)}</div></div>`;
    }).join('');
  }
  async function load() {
    statusEl.textContent = 'Carregando resultados...';
    const data = await VoidArena.request('/api/match-results').catch(() => ({ results: [] }));
    render(data.results || data.records || []);
    statusEl.textContent = 'Resultados carregados.';
    statusEl.className = 'va-status ok';
  }
  document.getElementById('reloadResultsBtn').addEventListener('click', load);
  VoidArena.bootLayout('resultados').then(load).catch((error) => { statusEl.textContent = `❌ ${error.message}`; });
}());
