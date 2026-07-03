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

  function logo(team) {
    const label = esc((team.tag || team.name || '?').slice(0, 2).toUpperCase());
    return `<div class="va-team-logo">${team.logo ? `<img src="${esc(team.logo)}" alt="Logo ${esc(team.name)}" />` : label}</div>`;
  }

  function socialIcon(key) {
    return { discord: '💬', instagram: '📸', youtube: '▶️', tiktok: '🎵', steam: '🎮', xbox: '🟢', website: '🌐', twitter: '𝕏' }[key] || '🔗';
  }

  function socialLabel(key) {
    return { discord: 'Discord', instagram: 'Instagram', youtube: 'YouTube', tiktok: 'TikTok', steam: 'Steam', xbox: 'Xbox', website: 'Site', twitter: 'Twitter/X' }[key] || key;
  }

  function connectionCards(socials = {}) {
    const entries = Object.entries(socials || {}).filter(([, value]) => String(value || '').trim());
    if (!entries.length) return '<div class="va-muted">Nenhuma conexão pública cadastrada.</div>';
    return `<div class="va-connections-grid">${entries.map(([key, value]) => {
      const raw = String(value || '').trim();
      const href = /^https?:\/\//i.test(raw) ? raw : '';
      const body = href ? `<a href="${esc(href)}" target="_blank" rel="noreferrer">${esc(raw)} ↗</a>` : `<span>${esc(raw)}</span>`;
      return `<div class="va-connection-card"><strong>${socialIcon(key)} ${socialLabel(key)}</strong>${body}</div>`;
    }).join('')}</div>`;
  }

  function teamPlayers(team, key, fallbackKey) {
    const detailed = Array.isArray(team[key]) ? team[key] : [];
    if (detailed.length) return detailed;
    return Array.isArray(team[fallbackKey]) ? team[fallbackKey].map((name, index) => ({ name, discordId: team.playerAccounts?.[fallbackKey === 'players' ? 'players' : 'reserves']?.[index] || '' })) : [];
  }

  async function openPlayer(player) {
    if (!player) return;
    const lookup = player.id || player.discordId || '';
    let user = null;
    if (lookup) {
      const response = await fetch(`/api/users/${encodeURIComponent(lookup)}/public`, { credentials: 'include', cache: 'no-store' }).catch(() => null);
      const data = await response?.json?.().catch(() => null);
      if (data?.success) user = data.user;
    }
    let overlay = document.getElementById('playerProfileOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'playerProfileOverlay';
      overlay.className = 'va-modal-shell';
      document.body.appendChild(overlay);
      overlay.addEventListener('click', (event) => { if (event.target === overlay || event.target.closest('[data-player-close]')) overlay.hidden = true; });
    }
    const profile = user?.profile || player.profile || {};
    const socials = user?.socials || player.socials || {};
    const name = profile.username || user?.name || player.name || 'Jogador';
    overlay.innerHTML = `<div class="va-modal-card"><div class="va-modal-head"><div><p class="va-eyebrow">Perfil público do jogador</p><h2>${esc(name)}</h2><p class="va-muted">${esc([profile.country, profile.region, profile.primaryPosition].filter(Boolean).join(' • ') || player.discordId || 'Jogador vinculado ao elenco')}</p></div><button class="va-modal-close" data-player-close type="button">×</button></div><div class="va-profile-public-grid"><div class="va-profile-page-avatar">${user?.avatar ? `<img src="${esc(user.avatar)}" alt="Avatar" />` : esc(name.slice(0,1).toUpperCase())}</div><div><h3>Conexões</h3>${connectionCards(socials)}${profile.bio ? `<h3>Bio</h3><p class="va-muted">${esc(profile.bio)}</p>` : ''}</div></div></div>`;
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

  function openTeam(team) {
    if (!team) return;
    let overlay = document.getElementById('teamProfileOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'teamProfileOverlay';
      overlay.className = 'va-modal-shell';
      document.body.appendChild(overlay);
      overlay.addEventListener('click', (event) => { if (event.target === overlay || event.target.closest('[data-team-close]')) overlay.hidden = true; });
    }
    const players = teamPlayers(team, 'playerDetails', 'players');
    const reserves = teamPlayers(team, 'reserveDetails', 'reserves');
    overlay.innerHTML = `<div class="va-modal-card"><div class="va-modal-head"><div><p class="va-eyebrow">Perfil público do time</p><h2>${esc(team.name)} ${team.tag ? `<span class="va-muted">(${esc(team.tag)})</span>` : ''}</h2><p class="va-muted">Capitão: ${esc(team.captainName || team.ownerName || 'não definido')}</p></div><button class="va-modal-close" type="button" data-team-close>×</button></div><div class="va-team-profile-hero">${logo(team)}<div><strong>${esc(team.name)}</strong><p class="va-muted">Titulares: ${players.length} • Reservas: ${reserves.length}</p></div></div><h3>Conexões</h3>${connectionCards(team.socials)}<h3>Titulares</h3><div class="va-team-roster">${players.map((p) => playerRow(p, '⚽')).join('') || '<div class="va-player-row">Nenhum titular detalhado.</div>'}</div><h3>Reservas</h3><div class="va-team-roster">${reserves.map((p) => playerRow(p, '🧤')).join('') || '<div class="va-player-row">Nenhum reserva.</div>'}</div></div>`;
    overlay.querySelectorAll('[data-player-profile]').forEach((btn) => {
      const id = btn.dataset.playerProfile;
      const found = [...players, ...reserves].find((item) => String(item.id || item.discordId || '') === String(id));
      btn.addEventListener('click', () => openPlayer(found));
    });
    overlay.hidden = false;
  }

  function card(team) {
    const players = teamPlayers(team, 'playerDetails', 'players');
    const reserves = teamPlayers(team, 'reserveDetails', 'reserves');
    return `<article class="va-team-card" data-team-id="${esc(team.id)}"><div class="va-team-card-head">${logo(team)}<div><strong>${esc(team.name)} ${team.tag ? `(${esc(team.tag)})` : ''}</strong><div class="va-muted">Capitão: ${esc(team.captainName || team.ownerName || 'não definido')}</div></div></div><div class="va-kpi-row"><span class="va-badge">Titulares ${players.length}</span><span class="va-badge">Reservas ${reserves.length}</span><span class="va-badge">Perfil público</span></div></article>`;
  }

  async function requestJson(path) {
    const response = await fetch(path, { credentials: 'include', cache: 'no-store' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) throw new Error(data.message || `Falha na requisição (${response.status}).`);
    return data;
  }

  async function loadTeams() {
    try { return await VoidArena.request('/api/teams'); }
    catch (primaryError) { const fallback = await requestJson('/debug/public/teams'); fallback.fallbackReason = primaryError.message; return fallback; }
  }

  function renderTeams(teams) {
    teamsCache = teams;
    list.innerHTML = teams.length ? teams.map(card).join('') : '<div class="va-item">Nenhum time cadastrado.</div>';
    list.querySelectorAll('[data-team-id]').forEach((el) => el.addEventListener('click', () => openTeam(teamsCache.find((team) => String(team.id) === String(el.dataset.teamId)))));
    setStatus(teams.length ? `Times carregados: ${teams.length}. Clique em um time para abrir o perfil público.` : 'Nenhum time cadastrado.', teams.length ? 'ok' : 'err');
  }

  async function refreshTeams() {
    const data = await loadTeams();
    renderTeams(Array.isArray(data.teams) ? data.teams : []);
  }

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

  function resetRoster() {
    playersRows.innerHTML = '';
    reservesRows.innerHTML = '';
    for (let i = 0; i < 5; i += 1) addRosterRow(playersRows, 'player');
    addRosterRow(reservesRows, 'reserve');
  }

  function collectRows(container) {
    return Array.from(container?.querySelectorAll('.va-roster-row') || []).map((row) => ({
      name: row.querySelector('[data-roster-name]')?.value || '',
      discordId: cleanDiscord(row.querySelector('[data-roster-discord]')?.value || '')
    })).filter((item) => item.name.trim());
  }

  function updateLogoPreview() {
    const value = logoInput?.value || '';
    if (!logoPreview) return;
    if (value) logoPreview.innerHTML = `<img src="${esc(value)}" alt="Prévia do escudo" />`;
    else logoPreview.textContent = '?';
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handlePaste(event) {
    const file = Array.from(event.clipboardData?.files || []).find((item) => item.type.startsWith('image/'));
    if (!file) return;
    event.preventDefault();
    if (file.size > 550000) return setCreateStatus('Imagem muito pesada. Use uma imagem menor ou cole uma URL.', 'err');
    logoInput.value = await fileToDataUrl(file);
    updateLogoPreview();
    setCreateStatus('Logo colado com sucesso.', 'ok');
  }

  function collectTeam() {
    const fd = new FormData(form);
    return {
      name: fd.get('name'),
      tag: fd.get('tag'),
      logo: fd.get('logo'),
      playerDetails: collectRows(playersRows),
      reserveDetails: collectRows(reservesRows),
      socials: {
        discord: fd.get('socialDiscord'),
        instagram: fd.get('socialInstagram'),
        youtube: fd.get('socialYoutube'),
        tiktok: fd.get('socialTikTok'),
        steam: fd.get('socialSteam'),
        xbox: fd.get('socialXbox')
      }
    };
  }

  document.getElementById('openTeamCreateModalBtn')?.addEventListener('click', openCreateModal);
  createModal?.addEventListener('click', (event) => { if (event.target === createModal || event.target.closest('[data-team-create-close]')) closeCreateModal(); });
  document.getElementById('addPlayerRowBtn')?.addEventListener('click', () => addRosterRow(playersRows, 'player'));
  document.getElementById('addReserveRowBtn')?.addEventListener('click', () => addRosterRow(reservesRows, 'reserve'));
  document.getElementById('clearTeamFormBtn')?.addEventListener('click', () => { form.reset(); resetRoster(); updateLogoPreview(); setCreateStatus(''); });
  logoInput?.addEventListener('input', updateLogoPreview);
  logoPasteBox?.addEventListener('paste', handlePaste);
  logoPasteBox?.addEventListener('click', () => { logoPasteBox.focus(); setCreateStatus('Agora pressione Ctrl+V com a imagem do escudo copiada.', ''); });

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    setCreateStatus('Salvando time...');
    try {
      await VoidArena.request('/api/teams', { method: 'POST', body: JSON.stringify(collectTeam()) });
      setCreateStatus('Time criado com sucesso.', 'ok');
      form.reset();
      resetRoster();
      updateLogoPreview();
      closeCreateModal();
      await refreshTeams();
    } catch (error) {
      setCreateStatus(`❌ ${error.message}`, 'err');
    }
  });

  try {
    setStatus('Carregando layout e times...');
    resetRoster();
    if (window.VoidArena?.bootLayout) await VoidArena.bootLayout('times').catch((error) => console.warn('Layout carregou com fallback:', error.message));
    await refreshTeams();
  } catch (e) {
    if (list) list.innerHTML = '<div class="va-item">Não foi possível carregar os times.</div>';
    setStatus(`❌ ${e.message}`, 'err');
  }
}());
