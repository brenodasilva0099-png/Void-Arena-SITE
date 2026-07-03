(async function () {
  const statusEl = document.getElementById('homeStatus');
  try {
    await VoidArena.bootLayout('dashboard');
    if (statusEl) {
      statusEl.textContent = 'Use o menu lateral para criar times, acompanhar eventos, ver chaveamento e registrar resultados oficiais.';
      statusEl.className = 'va-status ok';
    }
  } catch (error) {
    if (statusEl) { statusEl.textContent = `❌ ${error.message}`; statusEl.className = 'va-status err'; }
  }
}());
