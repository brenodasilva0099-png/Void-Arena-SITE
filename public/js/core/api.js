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

  function applyBrand(brand = {}) {
    const icon = brand.icon || brand.fallbackIcon || '/assets/hollow-nexus.png';
    const name = brand.name || 'Hollow Nexus';
    document.querySelectorAll('[data-server-name]').forEach((el) => { el.textContent = name; });
    document.querySelectorAll('[data-server-icon]').forEach((img) => {
      img.src = icon;
      img.alt = `Ícone ${name}`;
    });

    let favicon = document.querySelector('link[rel="icon"]') || document.querySelector('link[rel="shortcut icon"]');
    if (!favicon) {
      favicon = document.createElement('link');
      favicon.rel = 'icon';
      document.head.appendChild(favicon);
    }
    favicon.href = icon;
  }

  function profileUsername(user = {}) {
    return user?.profile?.username || user?.name || 'Usuário';
  }

  function userAvatar(user = {}) {
    return user?.avatar || '';
  }

  function injectProfileModal(user = {}) {
    if (document.getElementById('vaProfileOverlay')) return;
    const profile = user.profile || {};
    const socials = user.socials || {};
    const overlay = document.createElement('div');
    overlay.id = 'vaProfileOverlay';
    overlay.className = 'va-profile-overlay';
    overlay.hidden = true;
    overlay.innerHTML = `
      <div class="va-profile-modal" role="dialog" aria-modal="true" aria-label="Perfil do usuário">
        <button class="va-profile-close" type="button" data-profile-close>×</button>
        <div class="va-profile-head">
          <div class="va-profile-avatar-big">${userAvatar(user) ? `<img src="${escapeHtml(userAvatar(user))}" alt="Avatar" />` : `<span>${escapeHtml(profileUsername(user).slice(0, 1).toUpperCase())}</span>`}</div>
          <div>
            <p class="va-eyebrow">Perfil público</p>
            <h2>${escapeHtml(profileUsername(user))}</h2>
            <p class="va-muted">Personalize como você aparece nos times, rankings, inscrições e histórico.</p>
          </div>
        </div>
        <form id="vaProfileForm" class="va-profile-form">
          <label>Nome público<input name="username" value="${escapeHtml(profile.username || user.name || '')}" maxlength="60" /></label>
          <label>Nome real<input name="realName" value="${escapeHtml(profile.realName || '')}" maxlength="80" /></label>
          <label>País / região<input name="country" value="${escapeHtml(profile.country || '')}" maxlength="60" /></label>
          <label>Posição principal<input name="primaryPosition" value="${escapeHtml(profile.primaryPosition || '')}" maxlength="60" /></label>
          <label>Posição secundária<input name="secondaryPosition" value="${escapeHtml(profile.secondaryPosition || '')}" maxlength="60" /></label>
          <label>Bio<textarea name="bio" maxlength="220">${escapeHtml(profile.bio || '')}</textarea></label>
          <label>Steam<input name="steam" value="${escapeHtml(socials.steam || '')}" maxlength="160" /></label>
          <label>TikTok<input name="tiktok" value="${escapeHtml(socials.tiktok || '')}" maxlength="160" /></label>
          <label>YouTube<input name="youtube" value="${escapeHtml(socials.youtube || '')}" maxlength="160" /></label>
          <label>Twitter/X<input name="twitter" value="${escapeHtml(socials.twitter || '')}" maxlength="160" /></label>
          <div class="va-profile-actions">
            <button class="va-btn" type="button" data-profile-close>Cancelar</button>
            <button class="va-btn primary" type="submit">Salvar perfil</button>
          </div>
          <div id="vaProfileStatus" class="va-status"></div>
        </form>
      </div>`;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay || event.target.closest('[data-profile-close]')) overlay.hidden = true;
    });
    overlay.querySelector('#vaProfileForm')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const status = document.getElementById('vaProfileStatus');
      const body = {
        profile: {
          username: form.username.value,
          realName: form.realName.value,
          country: form.country.value,
          primaryPosition: form.primaryPosition.value,
          secondaryPosition: form.secondaryPosition.value,
          bio: form.bio.value
        },
        socials: {
          steam: form.steam.value,
          tiktok: form.tiktok.value,
          youtube: form.youtube.value,
          twitter: form.twitter.value
        }
      };
      try {
        status.textContent = 'Salvando perfil...';
        status.className = 'va-status';
        const data = await request('/api/me/profile', { method: 'PUT', body: JSON.stringify(body) });
        document.querySelectorAll('[data-user-name]').forEach((el) => { el.textContent = profileUsername(data.user || {}); });
        status.textContent = 'Perfil salvo.';
        status.className = 'va-status ok';
      } catch (error) {
        status.textContent = `❌ ${error.message}`;
        status.className = 'va-status err';
      }
    });
  }

  function setupUserPill(user = {}) {
    document.querySelectorAll('.va-user-pill').forEach((pill) => {
      pill.classList.add('is-clickable');
      pill.setAttribute('role', 'button');
      pill.setAttribute('tabindex', '0');
      const avatar = userAvatar(user);
      if (!pill.querySelector('.va-user-pill-avatar')) {
        pill.insertAdjacentHTML('afterbegin', `<span class="va-user-pill-avatar">${avatar ? `<img src="${escapeHtml(avatar)}" alt="Avatar" />` : escapeHtml(profileUsername(user).slice(0, 1).toUpperCase())}</span>`);
      }
      const open = () => { const overlay = document.getElementById('vaProfileOverlay'); if (overlay) overlay.hidden = false; };
      pill.addEventListener('click', open);
      pill.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } });
    });
  }

  async function bootLayout(activeKey = '') {
    const [user, brand] = await Promise.all([loadMe(), loadBrand()]);
    applyBrand(brand);
    document.querySelectorAll('[data-user-name]').forEach((el) => { el.textContent = profileUsername(user); });
    document.querySelectorAll('[data-nav-key]').forEach((el) => {
      if (el.getAttribute('data-nav-key') === activeKey) el.classList.add('active');
    });
    injectProfileModal(user);
    setupUserPill(user);
    return { user, brand };
  }

  window.VoidArena = {
    request,
    escapeHtml,
    formatDate,
    loadMe,
    loadBrand,
    bootLayout,
    profileUsername
  };
}());
