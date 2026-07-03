(async function () {
  const statusEl = document.getElementById('homeStatus');
  const counters = document.getElementById('homeCounters');
  function kpi(label, value) { return `<div class="va-kpi"><strong>${VoidArena.escapeHtml(value ?? 0)}</strong><span>${VoidArena.escapeHtml(label)}</span></div>`; }
  try {
    await VoidArena.bootLayout('dashboard');
    const snap = await VoidArena.request('/api/dashboard/snapshot');
    counters.innerHTML = [
      kpi('Times cadastrados', snap.teams?.length || 0),
      kpi('Eventos ativos', (snap.events || []).filter((event) => event.status !== 'finished').length),
      kpi('Vagas preenchidas', (snap.bracket?.slots || []).filter(Boolean).length),
      kpi('Resultados enviados', snap.results?.length || 0)
    ].join('');
    statusEl.textContent = 'Arena online: site e bot preparados para organizar inscrições, partidas e resultados.';
    statusEl.className = 'va-status ok';
  } catch (error) { statusEl.textContent = `❌ ${error.message}`; statusEl.className = 'va-status err'; }
}());
