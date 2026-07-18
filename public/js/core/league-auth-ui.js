(function () {
  'use strict';

  const BUILD = '2026-07-18-stable-auth-ui-v1';
  const BUTTON_SELECTOR = '[data-frm-login],[data-discord-login],.frm-header-actions a[href*="/auth/discord"]';

  function allButtons() {
    const found = Array.from(document.querySelectorAll(BUTTON_SELECTOR));
    document.querySelectorAll('.frm-header-actions a').forEach((link) => {
      const text = String(link.textContent || '').toLowerCase();
      if ((text.includes('entrar') || text.includes('painel')) && !found.includes(link)) found.push(link);
    });
    return found;
  }

  function currentReturnPath() {
    const value = `${location.pathname || '/pages/dashboard.html'}${location.search || ''}${location.hash || ''}`;
    return value.startsWith('/') && !value.startsWith('//') ? value : '/pages/perfil.html';
  }

  function loginHref() {
    return `/auth/discord?next=${encodeURIComponent(currentReturnPath())}`;
  }

  function defaultDiscordAvatar(discordId) {
    try {
      const index = Number((BigInt(String(discordId || '0')) >> 22n) % 6n);
      return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
    } catch {
      return '/assets/hollow-nexus-official.svg';
    }
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
  }

  function preserveOriginal(button) {
    if (!button.dataset.hnlAuthOriginalHtml) {
      button.dataset.hnlAuthOriginalHtml = button.innerHTML || '♟ ENTRAR / PAINEL';
      button.dataset.hnlAuthOriginalClass = button.className || 'frm-btn';
    }
  }

  function renderLoggedOut(button) {
    preserveOriginal(button);
    button.dataset.loggedIn = '0';
    button.dataset.hnlAuthState = 'logged-out';
    button.href = loginHref();
    button.title = 'Entrar com Discord';
    button.setAttribute('aria-label', 'Entrar com Discord');
    button.className = button.dataset.hnlAuthOriginalClass || 'frm-btn';
    button.classList.remove('hnl-auth-avatar-button');
    button.innerHTML = button.dataset.hnlAuthOriginalHtml || '♟ ENTRAR / PAINEL';
  }

  function renderLoggedIn(button, user) {
    preserveOriginal(button);
    const avatar = String(user.avatar || defaultDiscordAvatar(user.discordId));
    const name = String(user.profile?.username || user.name || user.discordTag || 'Abrir perfil');

    button.dataset.loggedIn = '1';
    button.dataset.hnlAuthState = 'logged-in';
    button.href = '/pages/perfil.html';
    button.title = `${name} — abrir perfil`;
    button.setAttribute('aria-label', `${name} — abrir perfil`);
    button.className = 'hnl-auth-avatar-button';
    button.innerHTML = `<img src="${escapeHtml(avatar)}" alt="Avatar de ${escapeHtml(name)}"><span class="hnl-auth-online-dot" aria-hidden="true"></span>`;
  }

  async function readSession() {
    const response = await fetch(`/api/auth/session?t=${Date.now()}`, {
      credentials: 'include',
      cache: 'no-store',
      headers: { Accept: 'application/json' }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return data;
  }

  let running = false;
  async function sync() {
    if (running) return;
    running = true;
    try {
      const data = await readSession();
      const buttons = allButtons();
      if (data.authenticated && data.user) {
        buttons.forEach((button) => renderLoggedIn(button, data.user));
        document.documentElement.dataset.discordAuthenticated = '1';
      } else {
        buttons.forEach(renderLoggedOut);
        document.documentElement.dataset.discordAuthenticated = '0';
      }
      document.documentElement.dataset.hnlAuthBuild = BUILD;
    } catch {
      allButtons().forEach(renderLoggedOut);
      document.documentElement.dataset.discordAuthenticated = '0';
    } finally {
      running = false;
    }
  }

  document.addEventListener('click', (event) => {
    const button = event.target && event.target.closest ? event.target.closest(BUTTON_SELECTOR) : null;
    if (!button || button.dataset.loggedIn === '1') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    location.assign(loginHref());
  }, true);

  function start() {
    sync();
    setTimeout(sync, 350);
    setTimeout(sync, 1200);
    setTimeout(sync, 3000);
    window.addEventListener('focus', sync);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });
    window.setInterval(sync, 30000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
