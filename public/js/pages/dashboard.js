(async function () {
  const statusEl = document.getElementById('homeStatus');
  try {
    await VoidArena.bootLayout('dashboard');
    if (statusEl) {
      statusEl.textContent = 'Sua sessão está ativa. Use a navegação superior para acessar as áreas oficiais da Hollow Nexus.';
      statusEl.className = 'va-status ok';
    }
  } catch (error) {
    if (statusEl) {
      statusEl.textContent = error.message;
      statusEl.className = 'va-status err';
    }
  }
}());
