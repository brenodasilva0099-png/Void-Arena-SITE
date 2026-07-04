(function () {
  const form = document.getElementById('profilePageForm');
  const statusEl = document.getElementById('profileStatus');
  const avatarEl = document.getElementById('profileAvatarPreview');
  const bannerEl = document.getElementById('profileBannerPreview');
  const nameEl = document.getElementById('profilePreviewName');
  const metaEl = document.getElementById('profilePreviewMeta');
  const connectionsEl = document.getElementById('profileConnectionsPreview');
  const teamCardEl = document.getElementById('currentTeamCard');
  const statsEl = document.getElementById('playerStatsCard');
  let currentUser = null;
  function setStatus(message, type = '') { statusEl.textContent = message; statusEl.className = `va-status ${type}`.trim(); }
  function value(name, val = '') { if (form?.elements?.[name]) form.elements[name].value = val || ''; }
  function read(name) { return String(form?.elements?.[name]?.value || '').trim(); }
  function esc(v) { return VoidArena.escapeHtml(v || ''); }
  function icon(key) { return { discord: '💬', steam: '🎮', xbox: '🟢', tiktok: '🎵', youtube: '▶️', twitter: '𝕏', spotify: '🎧', riot: '🔥', ea: '🎯', psn: '🎮' }[key] || '🔗'; }
  function label(key) { return { discord: 'Discord', steam: 'Steam', xbox: 'Xbox', tiktok: 'TikTok', youtube: 'YouTube', twitter: 'Twitter/X', spotify: 'Spotify', riot: 'Riot ID', ea: 'EA ID', psn: 'PSN' }[key] || key; }
  function hrefFor(key, val) {
    const raw = String(val || '').trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    if (key === 'tiktok') return `https://www.tiktok.com/@${raw.replace(/^@/, '')}`;
    if (key === 'twitter') return `https://x.com/${raw.replace(/^@/, '')}`;
    if (key === 'steam' && /^\d{16,20}$/.test(raw)) return `https://steamcommunity.com/profiles/${raw}`;
    if (key === 'spotify' && raw.includes('spotify.com')) return raw;
    return '';
  }
  function socialCard([key, val]) {
    const href = hrefFor(key, val);
    const body = `<span class="va-social-card-icon">${icon(key)}</span><span class="va-social-card-body"><strong>${label(key)}</strong><small>${esc(val)}</small></span><span class="va-social-card-arrow">↗</span>`;
    return href ? `<a class="va-social-card" href="${esc(href)}" target="_blank" rel="noreferrer">${body}</a>` : `<div class="va-social-card">${body}</div>`;
  }
  function renderConnections(socials = {}) {
    if (!connectionsEl) return;
    const entries = Object.entries(socials || {}).filter(([, v]) => String(v || '').trim());
    connectionsEl.innerHTML = entries.length ? entries.map(socialCard).join('') : '<div class="va-muted">Nenhuma conexão pública cadastrada.</div>';
  }
  function renderTeam(team = null) {
    if (!teamCardEl) return;
    if (!team) { teamCardEl.innerHTML = '<div class="va-current-team-card"><p class="va-eyebrow">Time atual</p><strong>Nenhum time vinculado ainda</strong><p class="va-muted">Crie um time ou peça para o capitão adicionar seu Discord ID ao elenco.</p></div>'; return; }
    const logo = team.logo ? `<img src="${esc(team.logo)}" alt="${esc(team.name)}" />` : esc((team.tag || team.name || 'T').slice(0, 2).toUpperCase());
    teamCardEl.innerHTML = `<div class="va-current-team-card"><p class="va-eyebrow">Time atual</p><div class="va-current-team-row"><div class="va-current-team-logo">${logo}</div><div><span class="va-team-tag">${esc(team.tag || 'TIME')}</span><h3>${esc(team.name || 'Time')}</h3><a class="va-btn secondary mini" href="/pages/times.html">Ver perfil do time</a></div></div></div>`;
  }
  function statItem(value, label, cls = '') { return `<div class="va-stat-item ${cls}"><strong>${esc(String(value))}</strong><span>${esc(label)}</span></div>`; }
  function renderStats(stats = {}) {
    if (!statsEl) return;
    const played = Number(stats.played || 0); const avg = (v) => played ? (Number(v || 0) / played).toFixed(2) : '0.00';
    statsEl.innerHTML = `<div class="va-player-stat-card"><h3>📊 Estatísticas na Arena</h3><div class="va-stat-section"><div class="va-stat-title">🔵 Resultados</div><div class="va-stat-grid">${statItem(stats.played || 0, 'Partidas')}${statItem(stats.wins || 0, 'Vitórias')}${statItem(stats.losses || 0, 'Derrotas')}${statItem((stats.winRate || 0) + '%', 'Win Rate')}</div></div><div class="va-stat-section"><div class="va-stat-title">💠 Ataque</div><div class="va-stat-grid">${statItem(stats.goals || 0, 'Gols')}${statItem(avg(stats.goals), 'Gols/Partida')}${statItem(stats.assists || 0, 'Assistências')}${statItem(avg(stats.assists), 'Assist./Partida')}${statItem(stats.passes || 0, 'Passes')}${statItem(avg(stats.passes), 'Passes/Partida')}</div></div><div class="va-stat-section"><div class="va-stat-title">🛡️ Defesa</div><div class="va-stat-grid">${statItem(stats.interceptions || 0, 'Interceptações')}${statItem(avg(stats.interceptions), 'Intercep./Partida')}${statItem(stats.defenses || 0, 'Defesas')}${statItem(avg(stats.defenses), 'Defesas/Partida')}</div></div><div class="va-stat-section"><div class="va-stat-title">🏆 Destaque</div><div class="va-stat-grid">${statItem(stats.points || 0, 'Pontuação', 'gold')}${statItem(avg(stats.points), 'Pontos/Partida')}${statItem(stats.mvp || 0, 'MVP', 'gold')}${statItem(avg(stats.mvp), 'MVP/Partida')}</div></div></div>`;
  }
  function fill(payload = {}) {
    const user = payload.user || payload; currentUser = user;
    const profile = user.profile || {}; const socials = user.socials || {};
    value('username', profile.username || user.name || ''); value('realName', profile.realName || ''); value('country', profile.country || ''); value('region', profile.region || profile.competitiveRegion || ''); value('timezone', profile.timezone || ''); value('primaryPosition', profile.primaryPosition || ''); value('secondaryPosition', profile.secondaryPosition || ''); value('bio', profile.bio || ''); value('banner', profile.banner || profile.discordBanner || '');
    value('discord', socials.discord || (user.discordId ? `<@${user.discordId}>` : '')); value('steam', socials.steam || profile.steamId || ''); value('xboxGamertag', socials.xbox || profile.xboxGamertag || ''); value('tiktok', socials.tiktok || ''); value('youtube', socials.youtube || ''); value('twitter', socials.twitter || ''); value('spotify', socials.spotify || ''); value('riot', socials.riot || ''); value('ea', socials.ea || ''); value('psn', socials.psn || '');
    const displayName = profile.username || user.name || 'Perfil'; nameEl.textContent = displayName;
    metaEl.textContent = [profile.country, profile.region || profile.competitiveRegion, profile.primaryPosition].filter(Boolean).join(' • ') || 'Perfil público do jogador';
    avatarEl.innerHTML = user.avatar ? `<img src="${esc(user.avatar)}" alt="Avatar" />` : esc(displayName.slice(0, 1).toUpperCase());
    const banner = profile.banner || profile.discordBanner || '';
    if (bannerEl) bannerEl.style.backgroundImage = banner ? `linear-gradient(180deg, rgba(0,0,0,.05), rgba(0,0,0,.45)), url("${esc(banner)}")` : '';
    renderConnections({ discord: socials.discord || (user.discordId ? `<@${user.discordId}>` : ''), ...socials }); renderTeam(payload.currentTeam || null); renderStats(payload.stats || {});
  }
  async function load() { await VoidArena.bootLayout('perfil'); const data = await VoidArena.request('/api/me/profile-v2'); fill(data); setStatus('Perfil carregado.', 'ok'); }
  async function save() {
    setStatus('Salvando perfil...');
    const body = { profile: { username: read('username'), realName: read('realName'), country: read('country'), region: read('region'), timezone: read('timezone'), primaryPosition: read('primaryPosition'), secondaryPosition: read('secondaryPosition'), bio: read('bio'), banner: read('banner'), steamId: read('steam'), xboxGamertag: read('xboxGamertag') }, socials: { discord: read('discord'), steam: read('steam'), xbox: read('xboxGamertag'), tiktok: read('tiktok'), youtube: read('youtube'), twitter: read('twitter'), spotify: read('spotify'), riot: read('riot'), ea: read('ea'), psn: read('psn') } };
    const data = await VoidArena.request('/api/me/profile-v2', { method: 'PUT', body: JSON.stringify(body) }); fill(data); setStatus('Perfil salvo com sucesso.', 'ok');
  }
  form?.elements?.banner?.addEventListener('input', () => { const url = read('banner'); if (bannerEl) bannerEl.style.backgroundImage = url ? `linear-gradient(180deg, rgba(0,0,0,.05), rgba(0,0,0,.45)), url("${esc(url)}")` : ''; });
  document.getElementById('saveProfileBtn')?.addEventListener('click', () => save().catch((error) => setStatus(`❌ ${error.message}`, 'err')));
  load().catch((error) => setStatus(`❌ ${error.message}`, 'err'));
}());
