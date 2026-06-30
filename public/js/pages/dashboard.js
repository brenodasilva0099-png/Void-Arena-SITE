(async function () {
  const statusEl = document.getElementById('homeStatus');
  try {
    await VoidArena.bootLayout('dashboard');
    const health = await VoidArena.request('/api/health');
    const db = health.data || {};
    statusEl.textContent = `Site online. Times: ${db.teams || 0} • Eventos: ${db.events || 0} • Mensagens: ${db.messages || 0}`;
    statusEl.classList.add('ok');
  } catch (error) {
    statusEl.textContent = `❌ ${error.message}`;
    statusEl.classList.add('err');
  }
}());
