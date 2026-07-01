(function () {
  const button = document.getElementById('generateBracketBtn');
  const statusEl = document.getElementById('bracketStatus');

  function setStatus(message, type = '') {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.className = `va-status ${type}`.trim();
  }

  async function syncAfterGenerate() {
    await new Promise((resolve) => setTimeout(resolve, 4200));
    try {
      const data = await VoidArena.request('/api/result-hubs/sync', { method: 'POST', body: '{}' });
      const result = data.resultHubs || {};
      const detail = `${result.created || 0} criadas • ${result.reused || 0} atualizadas • ${result.totalMatches || 0} confrontos${result.errors?.length ? ` • ${result.errors.length} erro(s)` : ''}`;
      if (result.success === false || result.errors?.length) {
        setStatus(`Chaveamento salvo, mas revise as HUBs: ${result.message || detail}`, 'err');
      } else {
        setStatus(`Chaveamento salvo. HUBs sincronizadas: ${detail}.`, 'ok');
      }
    } catch (error) {
      setStatus(`Chaveamento salvo, mas a sincronização extra das HUBs falhou: ${error.message}`, 'err');
    }
  }

  button?.addEventListener('click', syncAfterGenerate);
}());
