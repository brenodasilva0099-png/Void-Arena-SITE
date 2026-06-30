(async function () {
  const statusEl = document.getElementById('homeStatus');
  const counters = document.getElementById('homeCounters');
  function kpi(label, value) { return `<div class="va-kpi"><strong>${VoidArena.escapeHtml(value ?? 0)}</strong><span>${VoidArena.escapeHtml(label)}</span></div>`; }
  try {
    await VoidArena.bootLayout('dashboard');
    const snap = await VoidArena.request('/api/dashboard/snapshot');
    const health = await VoidArena.request('/api/health').catch(() => ({ data: {} }));
    const db = health.data || {};
    counters.innerHTML = [
      kpi('Times', snap.teams?.length || db.teams || 0),
      kpi('Eventos', snap.events?.length || db.events || 0),
      kpi('Vagas no chaveamento', (snap.bracket?.slots || []).filter(Boolean).length),
      kpi('Mensagens', db.messages || 0)
    ].join('');
    statusEl.textContent = 'Site online e estrutura 5.0.1 carregada.';
    statusEl.className = 'va-status ok';
  } catch (error) { statusEl.textContent = `❌ ${error.message}`; statusEl.className = 'va-status err'; }
}());
