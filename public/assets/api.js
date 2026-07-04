(function () {
  if (window.VoidArena) return;
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
    return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
  }
  function formatDate(value) {
    if (!value) return 'sem data';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  }
  async function loadMe() { const data = await request('/api/me'); return data.user; }
  async function loadBrand() {
    const data = await request('/api/brand/server').catch(() => ({ server: { name: 'Hollow Nexus', icon: '/assets/hollow-nexus.png' } }));
    return data.server || { name: 'Hollow Nexus', icon: '/assets/hollow-nexus.png' };
  }
  function applyBrand(brand = {}) {
    const icon = brand.icon || brand.fallbackIcon || '/assets/hollow-nexus.png';
    const name = brand.name || 'Hollow Nexus';
    document.querySelectorAll('[data-server-name]').forEach((el) => { el.textContent = name; });
    document.querySelectorAll('[data-server-icon]').forEach((img) => { img.src = icon; img.alt = `Ícone ${name}`; });
    let favicon = document.querySelector('link[rel="icon"]') || document.querySelector('link[rel="shortcut icon"]');
    if (!favicon) { favicon = document.createElement('link'); favicon.rel = 'icon'; document.head.appendChild(favicon); }
    favicon.href = icon;
    document.querySelectorAll('[data-brand-title]').forEach((el) => { el.textContent = name; });
  }
  function ensureExtraNavLinks() {
    document.querySelectorAll('.va-nav').forEach((nav) => {
      const rankings = nav.querySelector('[data-nav-key="rankings"]');
      let anchor = rankings || nav.querySelector('[data-nav-key="pontuacao"]');
      if (!nav.querySelector('[data-nav-key="pontuacao"]')) {
        const link = document.createElement('a');
        link.setAttribute('data-nav-key', 'pontuacao');
        link.href = '/pages/pontuacao.html';
        link.textContent = '🏅 Pontuação';
        if (anchor?.parentNode) anchor.insertAdjacentElement('afterend', link); else nav.appendChild(link);
        anchor = link;
      }
      if (!nav.querySelector('[data-nav-key="placar"]')) {
        const link = document.createElement('a');
        link.setAttribute('data-nav-key', 'placar');
        link.href = '/pages/placar.html';
        link.textContent = '🎮 Placar';
        if (anchor?.parentNode) anchor.insertAdjacentElement('afterend', link); else nav.appendChild(link);
      }
    });
  }
  function profileUsername(user = {}) { return user?.profile?.username || user?.name || 'Usuário'; }
  function userAvatar(user = {}) { return user?.avatar || ''; }
  function setupUserPill(user = {}) {
    const name = profileUsername(user); const avatar = userAvatar(user);
    document.querySelectorAll('.va-user-pill').forEach((pill) => {
      pill.classList.add('is-clickable', 'is-compact', 'is-avatar-only');
      pill.setAttribute('role', 'link'); pill.setAttribute('tabindex', '0');
      pill.setAttribute('title', `Abrir perfil de ${name}`); pill.setAttribute('aria-label', `Abrir perfil de ${name}`);
      pill.innerHTML = `<span class="va-user-pill-avatar">${avatar ? `<img src="${escapeHtml(avatar)}" alt="Avatar ${escapeHtml(name)}" />` : escapeHtml(name.slice(0, 1).toUpperCase())}</span>`;
      const open = () => { window.location.href = '/pages/perfil.html'; };
      pill.onclick = open;
      pill.onkeydown = (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } };
    });
  }
  async function bootLayout(activeKey = '') {
    ensureExtraNavLinks();
    const [user, brand] = await Promise.all([loadMe(), loadBrand()]);
    applyBrand(brand);
    document.querySelectorAll('[data-user-name]').forEach((el) => { el.textContent = profileUsername(user); });
    document.querySelectorAll('[data-nav-key]').forEach((el) => { if (el.getAttribute('data-nav-key') === activeKey) el.classList.add('active'); });
    setupUserPill(user);
    return { user, brand };
  }
  window.VoidArena = { request, escapeHtml, formatDate, loadMe, loadBrand, applyBrand, bootLayout, profileUsername, userAvatar };
}());
