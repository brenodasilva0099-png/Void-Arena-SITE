(function () {
  'use strict';

  const recovered = new Set();
  const prefetched = new Set();

  function isCssResponse(response, text) {
    const type = String(response.headers.get('content-type') || '').toLowerCase();
    return response.ok && type.includes('text/css') && !/^\s*(?:<!doctype|<html)/i.test(text);
  }

  async function recoverStylesheet(link) {
    const original = String(link?.href || '');
    if (!original || recovered.has(original)) return;
    recovered.add(original);

    let lastError = null;
    for (const waitMs of [0, 250, 900]) {
      try {
        if (waitMs) await new Promise((resolve) => window.setTimeout(resolve, waitMs));
        const url = new URL(original, location.origin);
        url.searchParams.set('hnl_recovery', `${Date.now()}_${waitMs}`);
        const response = await fetch(url, { cache: 'no-store', credentials: 'same-origin' });
        const css = await response.text();
        if (!isCssResponse(response, css)) throw new Error(`MIME ${response.headers.get('content-type') || 'ausente'}`);

        const style = document.createElement('style');
        style.dataset.hnlRecoveredStylesheet = url.pathname;
        style.textContent = css;
        document.head.appendChild(style);
        link.disabled = true;
        document.documentElement.dataset.hnlCssRecovered = '1';
        return;
      } catch (error) {
        lastError = error;
      }
    }
    console.warn('[Navegação] Não foi possível recuperar o estilo:', lastError?.message || 'erro desconhecido');
  }

  document.addEventListener('error', (event) => {
    const link = event.target;
    if (link?.tagName === 'LINK' && link.rel === 'stylesheet' && /\/css\//.test(link.href || '')) {
      recoverStylesheet(link);
    }
  }, true);

  function internalPageLink(target) {
    const anchor = target?.closest?.('a[href]');
    if (!anchor || anchor.target || anchor.hasAttribute('download')) return null;
    try {
      const url = new URL(anchor.href, location.href);
      if (url.origin !== location.origin || !url.pathname.startsWith('/pages/')) return null;
      return { anchor, url };
    } catch {
      return null;
    }
  }

  function prefetch(target) {
    const item = internalPageLink(target);
    if (!item || item.url.pathname === location.pathname || prefetched.has(item.url.href)) return;
    prefetched.add(item.url.href);
    fetch(item.url.href, { credentials: 'same-origin', cache: 'force-cache', priority: 'low' }).catch(() => {});
  }

  function startNavigation(event) {
    if (event.defaultPrevented || event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const item = internalPageLink(event.target);
    if (!item || (item.url.pathname === location.pathname && item.url.search === location.search)) return;
    document.documentElement.classList.add('hnl-is-navigating');
    window.setTimeout(() => document.documentElement.classList.remove('hnl-is-navigating'), 8000);
  }

  document.addEventListener('pointerover', (event) => prefetch(event.target), { passive: true });
  document.addEventListener('focusin', (event) => prefetch(event.target));
  document.addEventListener('click', startNavigation, true);
  window.addEventListener('pageshow', () => document.documentElement.classList.remove('hnl-is-navigating'));
}());
