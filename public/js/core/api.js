(function () {
  async function request(path, options = {}) {
    const response = await fetch(path, {
      credentials: 'include',
      cache: options.cache || 'no-store',
      ...options,
      headers: {
        ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {})
      }
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) {
      window.location.href = '/';
      throw new Error('Sessão expirada. Faça login novamente.');
    }
    if (!response.ok || data.success === false) {
      throw new Error(data.message || `Falha na requisição (${response.status}).`);
    }
    return data;
  }

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[char]));
  }

  function formatDate(value) {
    if (!value) return 'sem data';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  }

  async function loadMe() {
    const data = await request('/api/me');
    return data.user;
  }

  async function loadBrand() {
    const data = await request('/api/brand/server').catch(() => ({ server: { name: 'Hollow Nexus', icon: '/assets/hollow-nexus.png' } }));
    return data.server || { name: 'Hollow Nexus', icon: '/assets/hollow-nexus.png' };
  }

  async function bootLayout(activeKey = '') {
    const [user, brand] = await Promise.all([loadMe(), loadBrand()]);
    document.querySelectorAll('[data-server-name]').forEach((el) => { el.textContent = brand.name || 'Hollow Nexus'; });
    document.querySelectorAll('[data-server-icon]').forEach((img) => { img.src = brand.icon || brand.fallbackIcon || '/assets/hollow-nexus.png'; });
    document.querySelectorAll('[data-user-name]').forEach((el) => { el.textContent = user?.profile?.username || user?.name || 'Usuário'; });
    document.querySelectorAll('[data-nav-key]').forEach((el) => {
      if (el.getAttribute('data-nav-key') === activeKey) el.classList.add('active');
    });
    return { user, brand };
  }

  window.VoidArena = {
    request,
    escapeHtml,
    formatDate,
    loadMe,
    loadBrand,
    bootLayout
  };
}());
