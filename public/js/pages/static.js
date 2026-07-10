(function () {
  const pageKey = document.body?.dataset?.page || '';

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if ([...document.scripts].some((script) => String(script.src || '').includes(src.split('?')[0]))) {
        return resolve();
      }
      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Falha ao carregar ${src}`));
      document.head.appendChild(script);
    });
  }

  async function ensureVoidArena() {
    if (window.VoidArena?.bootLayout) return window.VoidArena;

    await loadScript('/assets/api.js?v=stable-fallback-1').catch(() => null);
    if (window.VoidArena?.bootLayout) return window.VoidArena;

    await loadScript('/js/core/api.js?v=stable-fallback-1').catch(() => null);
    if (window.VoidArena?.bootLayout) return window.VoidArena;

    throw new Error('VoidArena não carregou. Recarregue a página com Ctrl+F5.');
  }

  ensureVoidArena()
    .then((api) => api.bootLayout(pageKey))
    .catch((error) => {
      console.error('[Void Arena] Falha ao inicializar página estática:', error.message);
      const main = document.querySelector('.va-main') || document.body;
      const box = document.createElement('div');
      box.style.cssText = 'margin:18px;padding:16px;border:1px solid #8b5cf6;border-radius:16px;background:#0b1024;color:#fff;font-family:system-ui,sans-serif';
      box.innerHTML = '<strong>Falha temporária no carregamento visual.</strong><br>Atualize a página com Ctrl+F5. Se continuar, avise a organização.';
      main.prepend(box);
    });
}());
