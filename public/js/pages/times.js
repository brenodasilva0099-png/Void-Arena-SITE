(async function () {
  const list = document.getElementById('teamsList');
  const st = document.getElementById('teamsStatus');
  const createStatus = document.getElementById('teamCreateStatus');
  const createModal = document.getElementById('teamCreateModal');
  const form = document.getElementById('teamCreateForm');
  const logoInput = form?.elements?.logo;
  const logoPasteBox = document.getElementById('logoPasteBox');
  const logoPreview = document.getElementById('teamLogoPreview');
  const playersRows = document.getElementById('playersRows');
  const reservesRows = document.getElementById('reservesRows');
  let teamsCache = [];

  function setStatus(message, type = '') { if (st) { st.textContent = message; st.className = `va-status ${type}`.trim(); } }
  function setCreateStatus(message, type = '') { if (createStatus) { createStatus.textContent = message; createStatus.className = `va-status ${type}`.trim(); } }
  function esc(v) { return (window.VoidArena?.escapeHtml || ((value) => String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]))))(v || ''); }
  function cleanDiscord(value = '') { return String(value || '').replace(/^<@!?/, '').replace(/>$/, '').trim(); }
  function initials(team = {}) { return esc(String(team.tag || team.name || '?').trim().slice(0, 2).toUpperCase() || '?'); }
  function safeLogoUrl(value = '') {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/^data:image\//i.test(raw)) return raw;
    if (/^blob:/i.test(raw)) return raw;
    if (/^https?:\/\//i.test(raw)) return raw;
    if (/^\/(assets|uploads|images|img|public)\//i.test(raw)) return raw;
    return '';
  }
  function logoImg(url, alt, fallback, className = '') {
    const safe = safeLogoUrl(url);
    if (!safe) return fallback;
    return `<img ${className ? `class="${esc(className)}"` : ''} src="${esc(safe)}" alt="${esc(alt)}" data-logo-fallback="${esc(fallback)}" />`;
  }
  function applyImageFallback(scope = document) {
    scope.querySelectorAll('img[data-logo-fallback]').forEach((img) => {
      const fallback = img.dataset.logoFallback || '?';
      const apply = () => {
        const parent = img.parentElement;
        if (parent) { parent.classList.add('is-logo-fallback'); parent.textContent = fallback; }
      };
      img.addEventListener('error', apply, { once: true });
      if (img.complete && img.naturalWidth === 0) apply();
    });
  }
  function logo(team) { const fallback = initials(team); return `<div class="va-team-logo">${logoImg(team.logo, `Logo ${team.name || 'time'}`, fallback)}</div>`; }
  function socialIcon(key) { return window.VoidArenaSocial?.iconHtml?.(key) || '🔗'; }
  function socialLabel(key) { return window.VoidArenaSocial?.label?.(key) || ({ discord: 'Discord', instagram: 'Instagram', youtube: 'YouTube', tiktok: 'TikTok', steam: 'Steam', xbox: 'Xbox', website: 'Site', twitter: 'Twitter/X', spotify: 'Spotify', riot: 'Riot ID', ea: 'EA ID', psn: 'PSN' }[String(key).toLowerCase()] || key); }
  function socialHref(key, value = '') { const raw = String(value || '').trim(); if (!raw) return ''; if (/^https?:\/\//i.test(raw)) return raw; if (/^discord\.gg\//i.test(raw)) return `https://${raw}`; if (key === 'tiktok') return `https://www.tiktok.com/@${raw.replace(/^@/, '')}`; if (key === 'instagram') return `https://instagram.com/${raw.replace(/^@/, '')}`; if (key === 'twitter') return `https://x.com/${raw.replace(/^@/, '')}`; if (key === 'steam' && /^\d{16,20}$/.test(raw)) return `https://steamcommunity.com/profiles/${raw}`; return ''; }
  function connectionCards(socials = {}) {
    const entries = Object.entries(socials || {}).filter(([, value]) => String(value || '').trim());
    if (!entries.length) return '<div class="va-muted">Nenhuma conexão pública cadastrada.</div>';
    return `<div class="va-connections-grid va-social-card-grid">${entries.map(([key, value]) => {
      const raw = String(value || '').trim();
      const href = socialHref(key, raw);
      const valueLine = href ? '' : `<small>${esc(raw)}</small>`;
      const inner = `<span class="va-social-card-icon">${socialIcon(key)}</span><span class="va-social-card-body"><strong>${socialLabel(key)}</strong>${valueLine}</span><span class="va-social-card-arrow">↗</span>`;
      return href ? `<a class="va-social-card" href="${esc(href)}" target="_blank" rel="noreferrer">${inner}</a>` : `<div class="va-social-card">${inner}</div>`;
    }).join('')}</div>`;
  }
  function teamPlayers(team, key, fallbackKey) {
    const detailed = Array.isArray(team[key]) ? team[key] : [];
    if (detailed.length) return detailed;
    return Array.isArray(team[fallbackKey]) ? team[fallbackKey].map((name, index) => ({ name, discordId: team.playerAccounts?.[fallbackKey === 'players' ? 'players' : 'reserves']?.[index] || '' })) : [];
  }
  function getOverlay(id, closeSelector) {
    let overlay = document.getElementById(id);
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = id;
      overlay.className = 'va-modal-shell';
      document.body.appendChild(overlay);
      overlay.addEventListener('click', (event) => { if (event.target === overlay || event.target.closest(closeSelector)) overlay.hidden = true; });
    }
    return overlay;
  }
  async function openPlayer(player, team = null) {
    if (!player) return;
    const lookup = player.id || player.discordId || '';
    let user = null;
    if (lookup) {
      const response = await fetch(`/api/users/${encodeURIComponent(lookup)}/public`, { credentials: 'include', cache: 'no-store' }).catch(() => null);
      const data = await response?.json?.().catch(() => null);
      if (data?.success) user = data.user;
    }
    const overlay = getOverlay('playerProfileOverlay', '[data-player-close]');
    const profile = user?.profile || player.profile || {};
    const socials = { discord: user?.discordId ? `<@${user.discordId}>` : player.discordId || '', ...(user?.socials || player.socials || {}) };
    const name = profile.username || user?.name || player.name || 'Jogador';
    const banner = safeLogoUrl(profile.banner || profile.discordBanner || '');
    const teamGhost = safeLogoUrl(team?.logo) ? logoImg(team.logo, '', initials(team), 'va-public-team-ghost') : '';
    const teamWatermark = !banner && safeLogoUrl(team?.logo) ? logoImg(team.logo, '', initials(team), 'va-user-team-watermark') : '';
    overlay.innerHTML = `<div class="va-modal-card va-public-profile-card"><button class="va-modal-close va-floating-close" data-player-close type="button">×</button><div class="va-public-banner" style="${banner ? `background-image:linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.72)),url('${esc(banner)}')` : ''}">${teamWatermark}</div><div class="va-public-head">${teamGhost}<div class="va-profile-page-avatar va-public-avatar">${user?.avatar ? logoImg(user.avatar, 'Avatar', esc(name.slice(0,1).toUpperCase())) : esc(name.slice(0,1).toUpperCase())}</div><div><p class="va-eyebrow">Perfil público do jogador</p><h2>${esc(name)}</h2><p class="va-muted">${esc([profile.country, profile.region || profile.competitiveRegion, profile.primaryPosition].filter(Boolean).join(' • ') || player.discordId || 'Jogador vinculado ao elenco')}</p></div></div><div class="va-public-section"><h3>Conexões</h3>${connectionCards(socials)}</div>${profile.bio ? `<div class="va-public-section"><h3>Bio</h3><p class="va-muted">${esc(profile.bio)}</p></div>` : ''}</div>`;
    applyImageFallback(overlay);
    window.VoidArena?.scheduleSocialIconPatch?.();
    overlay.hidden = false;
  }
  function playerRow(player, kind) {
    const name = typeof player === 'string' ? player : (player?.name || player?.account || 'Jogador');
    const discordId = typeof player === 'object' ? (player.discordId || '') : '';
    const account = typeof player === 'object' ? (player.account || '') : '';
    const cap = player?.isCaptain ? '<span class="va-badge ok">👑 Capitão</span>' : '';
    const acc = discordId ? `<span class="va-muted">Discord: ${esc(discordId)}</span>` : (account ? `<span class="va-muted">${esc(account)}</span>` : '');
    return `<button class="va-player-row as-button" type="button" data-player-profile="${esc(player?.id || discordId || '')}"><span>${kind} ${esc(name)} ${cap}</span><span>${acc}</span></button>`;
  }
  function leadershipCard(label, name, discordId, type) {
    return `<button class="va-leader-card" type="button" data-open-leader="${esc(type)}"><span class="va-leader-label">${esc(label)}</span><strong>${esc(name || 'não definido')}</strong>${discordId ? `<small>Discord: ${esc(discordId)}</small>` : ''}</button>`;
  }
  function openTeam(team) {
    if (!team) return;
    const overlay = getOverlay('teamProfileOverlay', '[data-team-close]');
    const players = teamPlayers(team, 'playerDetails', 'players');
    const reserves = teamPlayers(team, 'reserveDetails', 'reserves');
    const fallback = initials(team);
    const bannerLogo = safeLogoUrl(team.logo) ? logoImg(team.logo, '', fallback) : '';
    const directorName = team.directorName || team.ownerName || 'não definido';
    const captainName = team.captainName || players[0]?.name || directorName || 'não definido';
    overlay.innerHTML = `<div class="va-modal-card va-public-profile-card va-team-public-card"><button class="va-modal-close va-floating-close" type="button" data-team-close>×</button><div class="va-public-banner va-team-public-banner">${bannerLogo}</div><div class="va-public-head"><div class="va-public-team-logo">${logoImg(team.logo, `Logo ${team.name || 'time'}`, fallback)}</div><div><p class="va-eyebrow">Perfil público do time</p><h2>${esc(team.name)} ${team.tag ? `<span class="va-muted">(${esc(team.tag)})</span>` : ''}</h2><div class="va-team-leadership"><p class="va-muted">Diretor: <button class="va-link-button va-profile-public-link" data-director-open>${esc(directorName)}</button></p><p class="va-muted">Capitão: <button class="va-link-button va-profile-public-link" data-captain-open>${esc(captainName)}</button></p></div><div class="va-kpi-row"><span class="va-badge">Titulares ${players.length}</span><span class="va-badge">Reservas ${reserves.length}</span><span class="va-badge">${esc(team.tag || 'TIME')}</span></div></div></div><div class="va-public-section"><h3>Diretoria</h3><div class="va-leader-grid">${leadershipCard('Diretor / dono', directorName, team.directorDiscordId, 'director')}${leadershipCard('Capitão', captainName, team.captainDiscordId, 'captain')}</div></div><div class="va-public-section"><h3>Conexões</h3>${connectionCards(team.socials)}</div><div class="va-public-section"><h3>Titulares</h3><div class="va-team-roster">${players.map((p) => playerRow(p, '⚽')).join('') || '<div class="va-player-row">Nenhum titular detalhado.</div>'}</div></div><div class="va-public-section"><h3>Reservas</h3><div class="va-team-roster">${reserves.map((p) => playerRow(p, '🧤')).join('') || '<div class="va-player-row">Nenhum reserva.</div>'}</div></div></div>`;
    overlay.querySelector('[data-director-open]')?.addEventListener('click', () => openPlayer({ id: team.directorUserId || team.ownerUserId || '', discordId: team.directorDiscordId || '', name: directorName }, team));
    overlay.querySelector('[data-captain-open]')?.addEventListener('click', () => openPlayer({ id: team.captainUserId || '', discordId: team.captainDiscordId || '', name: captainName }, team));
    overlay.querySelectorAll('[data-open-leader]').forEach((btn) => btn.addEventListener('click', () => {
      if (btn.dataset.openLeader === 'director') return openPlayer({ id: team.directorUserId || team.ownerUserId || '', discordId: team.directorDiscordId || '', name: directorName }, team);
      return openPlayer({ id: team.captainUserId || '', discordId: team.captainDiscordId || '', name: captainName }, team);
    }));
    overlay.querySelectorAll('[data-player-profile]').forEach((btn) => {
      const id = btn.dataset.playerProfile;
      const found = [...players, ...reserves].find((item) => String(item.id || item.discordId || '') === String(id));
      btn.addEventListener('click', () => openPlayer(found, team));
    });
    applyImageFallback(overlay);
    window.VoidArena?.scheduleSocialIconPatch?.();
    overlay.hidden = false;
  }
  function card(team) {
    const players = teamPlayers(team, 'playerDetails', 'players');
    const reserves = teamPlayers(team, 'reserveDetails', 'reserves');
    return `<article class="va-team-card" data-team-id="${esc(team.id)}"><div class="va-team-card-head">${logo(team)}<div><strong>${esc(team.name)} ${team.tag ? `(${esc(team.tag)})` : ''}</strong><div class="va-muted">Diretor: ${esc(team.directorName || team.ownerName || 'não definido')}</div><div class="va-muted">Capitão: ${esc(team.captainName || players[0]?.name || 'não definido')}</div></div></div><div class="va-kpi-row"><span class="va-badge">Titulares ${players.length}</span><span class="va-badge">Reservas ${reserves.length}</span><span class="va-badge">Perfil público</span></div></article>`;
  }
  async function requestJson(path) { const response = await fetch(path, { credentials: 'include', cache: 'no-store' }); const data = await response.json().catch(() => ({})); if (!response.ok || data.success === false) throw new Error(data.message || `Falha na requisição (${response.status}).`); return data; }
  async function loadTeams() { try { return await VoidArena.request('/api/teams'); } catch (primaryError) { const fallback = await requestJson('/debug/public/teams'); fallback.fallbackReason = primaryError.message; return fallback; } }
  function renderTeams(teams) {
    teamsCache = teams;
    list.innerHTML = teams.length ? teams.map(card).join('') : '<div class="va-item">Nenhum time cadastrado.</div>';
    applyImageFallback(list);
    list.querySelectorAll('[data-team-id]').forEach((el) => el.addEventListener('click', () => openTeam(teamsCache.find((team) => String(team.id) === String(el.dataset.teamId)))));
    const broken = teams.filter((team) => team.logo && !safeLogoUrl(team.logo)).length;
    setStatus(teams.length ? `Times carregados: ${teams.length}. ${broken ? `${broken} logo(s) tinham arquivo/URL inválida e foram trocadas por iniciais.` : 'Logos verificadas.'}` : 'Nenhum time cadastrado.', teams.length ? 'ok' : 'err');
    window.VoidArena?.scheduleSocialIconPatch?.();
  }
  async function refreshTeams() { const data = await loadTeams(); renderTeams(Array.isArray(data.teams) ? data.teams : []); }
  function openCreateModal() { if (createModal) createModal.hidden = false; }
  function closeCreateModal() { if (createModal) createModal.hidden = true; }
  function addRosterRow(container, type, data = {}) {
    if (!container) return;
    const row = document.createElement('div');
    row.className = 'va-roster-row';
    row.innerHTML = `<label>Nome<input data-roster-name type="text" maxlength="80" placeholder="Nome do jogador" value="${esc(data.name || '')}" /></label><label>ID Discord<input data-roster-discord type="text" maxlength="40" placeholder="ID ou menção do Discord" value="${esc(data.discordId || '')}" /></label><button class="va-btn danger mini" type="button" data-remove-row>Remover</button>`;
    row.querySelector('[data-remove-row]')?.addEventListener('click', () => row.remove());
    container.appendChild(row);
  }
  function resetRoster() { playersRows.innerHTML = ''; reservesRows.innerHTML = ''; for (let i = 0; i < 5; i += 1) addRosterRow(playersRows, 'player'); addRosterRow(reservesRows, 'reserve'); }
  function collectRows(container) { return Array.from(container?.querySelectorAll('.va-roster-row') || []).map((row) => ({ name: row.querySelector('[data-roster-name]')?.value || '', discordId: cleanDiscord(row.querySelector('[data-roster-discord]')?.value || '') })).filter((item) => item.name.trim()); }
  function updateLogoPreview() {
    const value = logoInput?.value || '';
    if (!logoPreview) return;
    const safe = safeLogoUrl(value);
    if (safe) { logoPreview.innerHTML = logoImg(safe, 'Prévia do escudo', '?'); applyImageFallback(logoPreview); setCreateStatus(value === safe ? '' : 'Logo preparada.', 'ok'); }
    else if (String(value || '').trim()) { logoPreview.textContent = '?'; setCreateStatus('Essa logo parece ser só nome de arquivo ou URL inválida. Cole uma URL completa ou cole a imagem com Ctrl+V.', 'err'); }
    else { logoPreview.textContent = '?'; }
  }
  function fileToDataUrl(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result || '')); reader.onerror = reject; reader.readAsDataURL(file); }); }
  async function handlePaste(event) {
    const file = Array.from(event.clipboardData?.files || []).find((item) => item.type.startsWith('image/'));
    if (!file) return;
    event.preventDefault();
    if (file.size > 550000) return setCreateStatus('Imagem muito pesada. Use uma imagem menor ou cole uma URL.', 'err');
    logoInput.value = await fileToDataUrl(file);
    updateLogoPreview();
    setCreateStatus('Logo colada como imagem. Agora é só salvar o time.', 'ok');
  }
  function collectTeam() {
    const fd = new FormData(form);
    const rawLogo = String(fd.get('logo') || '').trim();
    return {
      name: fd.get('name'), tag: fd.get('tag'), logo: safeLogoUrl(rawLogo) || '',
      directorName: fd.get('directorName'), directorDiscordId: cleanDiscord(fd.get('directorDiscordId')),
      captainName: fd.get('captainName'), captainDiscordId: cleanDiscord(fd.get('captainDiscordId')),
      playerDetails: collectRows(playersRows), reserveDetails: collectRows(reservesRows),
      socials: { discord: fd.get('socialDiscord'), instagram: fd.get('socialInstagram'), youtube: fd.get('socialYoutube'), tiktok: fd.get('socialTikTok'), steam: fd.get('socialSteam'), xbox: fd.get('socialXbox') }
    };
  }

  document.getElementById('openTeamCreateModalBtn')?.addEventListener('click', openCreateModal);
  createModal?.addEventListener('click', (event) => { if (event.target === createModal || event.target.closest('[data-team-create-close]')) closeCreateModal(); });
  document.getElementById('addPlayerRowBtn')?.addEventListener('click', () => addRosterRow(playersRows, 'player'));
  document.getElementById('addReserveRowBtn')?.addEventListener('click', () => addRosterRow(reservesRows, 'reserve'));
  document.getElementById('clearTeamFormBtn')?.addEventListener('click', () => { form.reset(); resetRoster(); updateLogoPreview(); setCreateStatus(''); });
  logoInput?.addEventListener('input', updateLogoPreview);
  logoPasteBox?.addEventListener('paste', handlePaste);
  logoPasteBox?.addEventListener('click', () => { logoPasteBox.focus(); setCreateStatus('Agora pressione Ctrl+V com a imagem copiada.', 'ok'); });
  logoPasteBox?.setAttribute('tabindex', '0');
  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const rawLogo = String(form.elements.logo?.value || '').trim();
    if (rawLogo && !safeLogoUrl(rawLogo)) return setCreateStatus('Logo inválida. Cole uma URL completa começando com https:// ou cole a imagem com Ctrl+V.', 'err');
    setCreateStatus('Salvando time...');
    try {
      await VoidArena.request('/api/teams', { method: 'POST', body: JSON.stringify(collectTeam()), timeoutMs: 12000 });
      setCreateStatus('Time salvo com sucesso.', 'ok');
      form.reset(); resetRoster(); updateLogoPreview(); closeCreateModal(); await refreshTeams();
    } catch (error) { setCreateStatus(`Erro: ${error.message}`, 'err'); }
  });

  try { await VoidArena.bootLayout('times'); resetRoster(); updateLogoPreview(); await refreshTeams(); }
  catch (error) { setStatus(`Erro ao carregar times: ${error.message}`, 'err'); }
}());
