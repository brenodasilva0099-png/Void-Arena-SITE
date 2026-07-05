(function () {
  const VA = window.VoidArena || {};
  window.VoidArena = VA;
  if (VA.__stableBootstrapReady) return;
  VA.__stableBootstrapReady = true;

  const NAV_LINKS = [
    ['rankings', 'jogadores', '/pages/jogadores.html', '👤 Jogadores'],
    ['jogadores', 'recrutamento', '/pages/recrutamento.html', '🤝 Recrutamento'],
    ['recrutamento', 'pontuacao', '/pages/pontuacao.html', '🏅 Pontuação'],
    ['pontuacao', 'placar', '/pages/placar.html', '🎮 Placar'],
    ['termos', 'privacidade', '/pages/privacidade.html', '🔐 Privacidade']
  ];

  function ensureCleanupStyles() {
    if (document.querySelector('link[data-void-cleanup]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/css/site-cleanup.css?v=5';
    link.setAttribute('data-void-cleanup', '1');
    document.head.appendChild(link);
  }

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
  }

  function timeoutSignal(ms) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    return { controller, timer };
  }

  async function request(path, options = {}) {
    const timeoutMs = Number(options.timeoutMs || 12000) || 12000;
    const { controller, timer } = timeoutSignal(timeoutMs);
    try {
      const response = await fetch(path, {
        credentials: 'include',
        cache: options.cache || 'no-store',
        ...options,
        signal: options.signal || controller.signal,
        headers: {
          ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
          ...(options.headers || {})
        }
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) { window.location.href = '/'; throw new Error('Sessão expirada. Faça login novamente.'); }
      if (!response.ok || data.success === false) throw new Error(data.message || `Falha na requisição (${response.status}).`);
      return data;
    } catch (error) {
      if (error?.name === 'AbortError') throw new Error(`Tempo limite atingido carregando ${path}.`);
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  function formatDate(value) {
    if (!value) return 'sem data';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  }

  async function loadMe() {
    const data = await request('/api/me', { timeoutMs: 9000 });
    return data.user;
  }

  async function loadBrand() {
    const fallback = { name: 'Hollow Nexus', icon: '/assets/hollow-nexus.png', fallbackIcon: '/assets/hollow-nexus.png' };
    try {
      const data = await request('/api/brand/server', { timeoutMs: 4500 });
      return data.server || fallback;
    } catch {
      return fallback;
    }
  }

  function applyBrand(brand = {}) {
    const icon = brand.icon || brand.fallbackIcon || '/assets/hollow-nexus.png';
    const name = brand.name || 'Hollow Nexus';
    document.querySelectorAll('[data-server-name]').forEach((el) => { el.textContent = name; });
    document.querySelectorAll('[data-server-icon]').forEach((img) => { img.src = icon; img.alt = `Ícone ${name}`; });
    document.querySelectorAll('[data-brand-title]').forEach((el) => { el.textContent = name; });
    let favicon = document.querySelector('link[rel="icon"]') || document.querySelector('link[rel="shortcut icon"]');
    if (!favicon) { favicon = document.createElement('link'); favicon.rel = 'icon'; document.head.appendChild(favicon); }
    favicon.href = icon;
  }

  function addNavLink(nav, afterKey, key, href, text) {
    if (nav.querySelector(`[data-nav-key="${key}"]`)) return;
    const anchor = nav.querySelector(`[data-nav-key="${afterKey}"]`);
    const link = document.createElement('a');
    link.setAttribute('data-nav-key', key);
    link.href = href;
    link.textContent = text;
    if (anchor?.parentNode) anchor.insertAdjacentElement('afterend', link);
    else nav.appendChild(link);
  }

  function ensureExtraNavLinks() {
    document.querySelectorAll('.va-nav').forEach((nav) => {
      NAV_LINKS.forEach(([afterKey, key, href, text]) => addNavLink(nav, afterKey, key, href, text));
    });
  }

  function ensureLegalFooter() {
    const main = document.querySelector('.va-main');
    if (!main || main.querySelector(':scope > .va-site-footer')) return;
    const footer = document.createElement('footer');
    footer.className = 'va-site-footer';
    footer.innerHTML = '<span><strong>© 2026 Void Arena / Hollow Nexus.</strong> Todos os direitos reservados.</span><span><a href="/pages/termos.html">Termos de Uso</a> · <a href="/pages/privacidade.html">Política de Privacidade</a></span><span>Não afiliado ao Discord, Steam, EA, Xbox, TikTok, Spotify, Riot ou PlayStation.</span>';
    main.appendChild(footer);
  }

  function profileUsername(user = {}) { return user?.profile?.username || user?.name || 'Usuário'; }
  function userAvatar(user = {}) { return user?.avatar || ''; }

  function notificationOverlay() {
    let overlay = document.getElementById('voidArenaNotificationsOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'voidArenaNotificationsOverlay';
      overlay.className = 'va-modal-shell';
      overlay.hidden = true;
      overlay.addEventListener('click', (event) => { if (event.target === overlay || event.target.closest('[data-notification-close]')) overlay.hidden = true; });
      document.body.appendChild(overlay);
    }
    return overlay;
  }

  async function actionNotification(id, action) {
    await request(`/api/notifications/${encodeURIComponent(id)}/action`, { method: 'POST', body: JSON.stringify({ action }), timeoutMs: 9000 });
    await openNotifications();
  }

  async function openNotifications() {
    const overlay = notificationOverlay();
    overlay.innerHTML = '<div class="va-modal-card va-notifications-card"><button class="va-modal-close" data-notification-close type="button">×</button><p class="va-eyebrow">Correios da Arena</p><h2>Notificações</h2><div class="va-muted">Carregando...</div></div>';
    overlay.hidden = false;
    try {
      const data = await request('/api/notifications', { timeoutMs: 7000 });
      const items = data.notifications || [];
      const body = items.length ? items.map((item) => {
        const pending = item.status === 'pending' && item.type === 'recruitment_invite';
        return `<div class="va-notification-item"><strong>${escapeHtml(item.title || 'Notificação')}</strong><p>${escapeHtml(item.note || item.message || '')}</p>${item.team?.name ? `<span class="va-badge">${escapeHtml(item.team.name)}${item.team.tag ? ` • ${escapeHtml(item.team.tag)}` : ''}</span>` : ''}<div class="va-actions">${pending ? `<button class="va-btn primary mini" data-notification-action="accept" data-notification-id="${escapeHtml(item.id)}">Aceitar</button><button class="va-btn danger mini" data-notification-action="decline" data-notification-id="${escapeHtml(item.id)}">Recusar</button>` : `<span class="va-muted">Status: ${escapeHtml(item.status || 'lida')}</span>`}</div></div>`;
      }).join('') : '<div class="va-muted">Nenhuma notificação no momento.</div>';
      overlay.innerHTML = `<div class="va-modal-card va-notifications-card"><button class="va-modal-close" data-notification-close type="button">×</button><p class="va-eyebrow">Correios da Arena</p><h2>Notificações</h2>${body}</div>`;
      overlay.querySelectorAll('[data-notification-action]').forEach((btn) => btn.addEventListener('click', () => actionNotification(btn.dataset.notificationId, btn.dataset.notificationAction).catch((error) => alert(error.message))));
    } catch (error) {
      const muted = overlay.querySelector('.va-muted');
      if (muted) muted.textContent = error.message;
    }
  }

  function ensureTopbarTools(pill) {
    const topbar = pill.closest('.va-topbar');
    if (!topbar) return pill.parentElement;
    let tools = topbar.querySelector(':scope > .va-topbar-tools');
    if (!tools) { tools = document.createElement('div'); tools.className = 'va-topbar-tools'; topbar.appendChild(tools); }
    if (pill.parentElement !== tools) tools.appendChild(pill);
    return tools;
  }

  async function setupNotificationButtons() {
    const data = await request('/api/notifications', { timeoutMs: 5000 }).catch(() => ({ unread: 0 }));
    document.querySelectorAll('.va-user-pill').forEach((pill) => {
      const tools = ensureTopbarTools(pill);
      let btn = tools.querySelector('.va-mail-pill');
      if (!btn) {
        btn = document.createElement('button');
        btn.className = 'va-mail-pill';
        btn.type = 'button';
        btn.title = 'Notificações';
        btn.addEventListener('click', (event) => { event.preventDefault(); event.stopPropagation(); openNotifications(); });
        tools.appendChild(btn);
      }
      btn.innerHTML = `📬${data.unread ? `<span>${data.unread}</span>` : ''}`;
    });
  }

  function setupUserPill(user = {}) {
    const name = profileUsername(user);
    const avatar = userAvatar(user);
    document.querySelectorAll('.va-user-pill').forEach((pill) => {
      pill.classList.add('is-clickable', 'is-compact', 'is-avatar-only');
      pill.setAttribute('role', 'link');
      pill.setAttribute('tabindex', '0');
      pill.setAttribute('title', `Abrir perfil de ${name}`);
      pill.setAttribute('aria-label', `Abrir perfil de ${name}`);
      pill.innerHTML = `<span class="va-user-pill-avatar">${avatar ? `<img src="${escapeHtml(avatar)}" alt="Avatar ${escapeHtml(name)}" />` : escapeHtml(name.slice(0, 1).toUpperCase())}</span>`;
      const open = () => { window.location.href = '/pages/perfil.html'; };
      pill.onclick = open;
      pill.onkeydown = (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } };
      ensureTopbarTools(pill);
    });
    setupNotificationButtons();
  }

  function showAccessDenied(pageKey = '') {
    const main = document.querySelector('.va-main');
    if (!main) return;
    main.querySelectorAll('.va-grid, section:not(.va-access-denied), article:not(.va-access-denied)').forEach((el) => { if (!el.closest('.va-topbar')) el.remove(); });
    const denied = document.createElement('section');
    denied.className = 'va-card full va-access-denied';
    denied.innerHTML = `<p class="va-eyebrow">Acesso bloqueado</p><h2>Área sem permissão</h2><p class="va-muted">Seu cargo atual do Discord não tem acesso liberado para esta área: <strong>${escapeHtml(pageKey)}</strong>.</p><p class="va-muted">Peça para a staff conferir Permissões no site ou a Hub Config BOT.</p>`;
    main.appendChild(denied);
  }

  function applyAccessMap(access = {}, activeKey = '') {
    if (!access || !Object.keys(access).length) return true;
    document.querySelectorAll('[data-nav-key]').forEach((link) => {
      const key = link.getAttribute('data-nav-key');
      link.hidden = Object.prototype.hasOwnProperty.call(access, key) && access[key] === false;
    });
    if (activeKey && Object.prototype.hasOwnProperty.call(access, activeKey) && access[activeKey] === false) { showAccessDenied(activeKey); return false; }
    return true;
  }

  async function loadAccess(activeKey = '') {
    try {
      const data = await request('/api/access/me', { timeoutMs: 5000 });
      applyAccessMap(data.access || {}, activeKey);
      return data;
    } catch { return { success: true, degraded: true, access: {} }; }
  }

  async function bootLayout(activeKey = '') {
    ensureCleanupStyles();
    ensureExtraNavLinks();
    ensureLegalFooter();
    const user = await loadMe();
    setupUserPill(user);
    loadBrand().then(applyBrand).catch(() => applyBrand({}));
    document.querySelectorAll('[data-user-name]').forEach((el) => { el.textContent = profileUsername(user); });
    document.querySelectorAll('[data-nav-key]').forEach((el) => { el.classList.toggle('active', el.getAttribute('data-nav-key') === activeKey); });
    loadAccess(activeKey);
    return { user, brand: null };
  }

  ensureCleanupStyles();
  ensureLegalFooter();
  Object.assign(VA, { request, escapeHtml, formatDate, loadMe, loadBrand, applyBrand, bootLayout, profileUsername, userAvatar, openNotifications, loadAccess, ensureLegalFooter });
}());
