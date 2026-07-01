(function () {
  const form = document.getElementById('profilePageForm');
  const statusEl = document.getElementById('profileStatus');
  const avatarEl = document.getElementById('profileAvatarPreview');
  const bannerEl = document.getElementById('profileBannerPreview');
  const nameEl = document.getElementById('profilePreviewName');
  const metaEl = document.getElementById('profilePreviewMeta');
  let currentUser = null;

  function setStatus(message, type = '') { statusEl.textContent = message; statusEl.className = `va-status ${type}`.trim(); }
  function value(name, val = '') { if (form?.elements?.[name]) form.elements[name].value = val || ''; }
  function read(name) { return String(form?.elements?.[name]?.value || '').trim(); }
  function fill(user = {}) {
    currentUser = user;
    const profile = user.profile || {};
    const socials = user.socials || {};
    value('username', profile.username || user.name || '');
    value('realName', profile.realName || '');
    value('country', profile.country || '');
    value('region', profile.region || '');
    value('primaryPosition', profile.primaryPosition || '');
    value('secondaryPosition', profile.secondaryPosition || '');
    value('bio', profile.bio || '');
    value('banner', profile.banner || profile.discordBanner || '');
    value('steam', socials.steam || profile.steamId || '');
    value('xboxGamertag', socials.xbox || profile.xboxGamertag || '');
    value('tiktok', socials.tiktok || '');
    value('youtube', socials.youtube || '');
    value('twitter', socials.twitter || '');
    const displayName = VoidArena.profileUsername(user);
    nameEl.textContent = displayName;
    metaEl.textContent = [profile.country, profile.region, profile.primaryPosition].filter(Boolean).join(' • ') || 'Perfil público do jogador';
    avatarEl.innerHTML = user.avatar ? `<img src="${VoidArena.escapeHtml(user.avatar)}" alt="Avatar" />` : VoidArena.escapeHtml(displayName.slice(0, 1).toUpperCase());
    const banner = profile.banner || profile.discordBanner || '';
    if (bannerEl) bannerEl.style.backgroundImage = banner ? `linear-gradient(180deg, rgba(0,0,0,.05), rgba(0,0,0,.45)), url("${VoidArena.escapeHtml(banner)}")` : '';
  }
  async function load() { const { user } = await VoidArena.bootLayout('perfil'); fill(user); setStatus('Perfil carregado.', 'ok'); }
  async function save() {
    setStatus('Salvando perfil...');
    const body = {
      profile: {
        username: read('username'), realName: read('realName'), country: read('country'), region: read('region'),
        primaryPosition: read('primaryPosition'), secondaryPosition: read('secondaryPosition'), bio: read('bio'),
        banner: read('banner'), steamId: read('steam'), xboxGamertag: read('xboxGamertag')
      },
      socials: { steam: read('steam'), xbox: read('xboxGamertag'), tiktok: read('tiktok'), youtube: read('youtube'), twitter: read('twitter') }
    };
    const data = await VoidArena.request('/api/me/profile', { method: 'PUT', body: JSON.stringify(body) });
    fill(data.user || currentUser || {});
    setStatus('Perfil salvo com sucesso.', 'ok');
  }
  form?.elements?.banner?.addEventListener('input', () => { const url = read('banner'); if (bannerEl) bannerEl.style.backgroundImage = url ? `linear-gradient(180deg, rgba(0,0,0,.05), rgba(0,0,0,.45)), url("${VoidArena.escapeHtml(url)}")` : ''; });
  document.getElementById('saveProfileBtn')?.addEventListener('click', () => save().catch((error) => setStatus(`❌ ${error.message}`, 'err')));
  load().catch((error) => setStatus(`❌ ${error.message}`, 'err'));
}());
