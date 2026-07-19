(function () {
  'use strict';

  const api = window.VoidArena || {};
  window.VoidArena = api;

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    })[char]);
  }

  async function request(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Number(options.timeoutMs || 12000));
    try {
      const response = await fetch(url, {
        credentials: 'include',
        cache: options.cache || 'no-store',
        ...options,
        signal: options.signal || controller.signal,
        headers: {
          Accept: 'application/json',
          ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
          ...(options.headers || {})
        }
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        location.assign('/?next=%2Fpages%2Fperfil.html');
        throw new Error('Sessão expirada. Entre novamente para abrir seu perfil.');
      }
      if (!response.ok || data.success === false) throw new Error(data.message || `Falha na requisição (${response.status}).`);
      return data;
    } catch (error) {
      if (error?.name === 'AbortError') throw new Error(`Tempo limite atingido carregando ${url}.`);
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  api.escapeHtml = api.escapeHtml || escapeHtml;
  api.request = api.request || request;
}());
