(function () {
  const form = document.getElementById('profilePageForm');
  const statusEl = document.getElementById('profileStatus');
  const avatarEl = document.getElementById('profileAvatarPreview');
  const nameEl = document.getElementById('profilePreviewName');
  const metaEl = document.getElementById('profilePreviewMeta');
  let currentUser = null;

  function setStatus(message, type = '') {
    statusEl.textContent = message;
    statusEl.className = `va-status ${type}`.trim();
  }
  function fill(user = {}) {
    currentUser = user;
    const profile = user.profile || {};
    const socials = user.socials || {};
    form.username.value = profile.username || user.name || '';
    form.realName.value = profile.realName || '';
    form.country.value = profile.country || '';
    form.primaryPosition.value = profile.primaryPosition || '';
    form.secondaryPosition.value = profile.secondaryPosition || '';
    form.bio.value = profile.bio || '';
    form.steam.value = socials.steam || '';
    form.tiktok.value = socials.tiktok || '';
    form.youtube.value = socials.youtube || '';
    form.twitter.value = socials.twitter || '';
    const displayName = VoidArena.profileUsername(user);
    nameEl.textContent = displayName;
    metaEl.textContent = user.email ? `${user.email} • ${user.provider || 'login'}` : `login via ${user.provider || 'Discord'}`;
    avatarEl.innerHTML = user.avatar ? `<img src="${VoidArena.escapeHtml(user.avatar)}" alt="Avatar" />` : VoidArena.escapeHtml(displayName.slice(0, 1).toUpperCase());
  }
  async function load() {
    const { user } = await VoidArena.bootLayout('perfil');
    fill(user);
    setStatus('Perfil carregado.', 'ok');
  }
  async function save() {
    setStatus('Salvando perfil...');
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
    const data = await VoidArena.request('/api/me/profile', { method: 'PUT', body: JSON.stringify(body) });
    fill(data.user || currentUser || {});
    setStatus('Perfil salvo com sucesso.', 'ok');
  }
  document.getElementById('saveProfileBtn')?.addEventListener('click', () => save().catch((error) => setStatus(`❌ ${error.message}`, 'err')));
  load().catch((error) => setStatus(`❌ ${error.message}`, 'err'));
}());
