(function () {
  const directoryTable = document.getElementById('playerDirectoryTable');
  const recruitmentTable = document.getElementById('recruitmentRequestsTable');
  const directoryStatus = document.getElementById('playerDirectoryStatus');
  const recruitmentStatus = document.getElementById('recruitmentStatus');
  const teamSelect = document.getElementById('recruitmentTeamSelect');
  const typeSelect = document.getElementById('recruitmentTypeSelect');
  const noteInput = document.getElementById('recruitmentNoteInput');
  const pageKey = document.body?.dataset?.page || 'jogadores';
  let directory = { players: [], teams: [], viewerTeams: [], selectedPlayer: null };
  const esc = (value) => VoidArena.escapeHtml(value ?? '');

  function setStatus(el, message, type = '') { if (el) { el.textContent = message; el.className = `va-status ${type}`.trim(); el.hidden = !message; } }
  function idOf(player = {}) { return String(player.userId || player.discordId || player.id || player.name || '').trim(); }
  function avatar(player = {}) { return player.avatar ? `<img src="${esc(player.avatar)}" alt="${esc(player.name)}" />` : esc((player.name || '?').slice(0, 1).toUpperCase()); }
  function statusBadge(player = {}) { return player.status === 'free' ? '<span class="va-badge ok">Livre</span>' : '<span class="va-badge">Com clube</span>'; }
  function requestStatusBadge(status = '') { const s = String(status || 'pending').toLowerCase(); const label = s === 'cancelled' ? 'Cancelado' : s === 'accepted' ? 'Aceito' : s === 'declined' ? 'Recusado' : 'Pendente'; const cls = s === 'cancelled' || s === 'declined' ? 'danger' : s === 'accepted' ? 'ok' : ''; return `<span class="va-badge ${cls}">${label}</span>`; }
  function playerMeta(player = {}) { return [player.primaryPosition, player.region, player.country].filter(Boolean).join(' • ') || 'Perfil sem detalhes'; }
  function publicPlayerSubline(player = {}) { return player.teamName ? `${player.rosterRole || 'Jogador'} • ${player.teamName}` : (player.status === 'free' ? 'Sem clube' : 'Perfil vinculado'); }
  function getOverlay() { let overlay = document.getElementById('directoryPlayerOverlay'); if (!overlay) { overlay = document.createElement('div'); overlay.id = 'directoryPlayerOverlay'; overlay.className = 'va-modal-shell'; document.body.appendChild(overlay); overlay.addEventListener('click', (e) => { if (e.target === overlay || e.target.closest('[data-directory-close]')) overlay.hidden = true; }); } return overlay; }
  function socialIcon(key) { return window.VoidArenaSocial?.iconHtml?.(key) || '🔗'; }
  function socialLabel(key) { return window.VoidArenaSocial?.label?.(key) || key; }
  function socialHref(key, value = '') { const raw = String(value || '').trim(); if (!raw) return ''; if (/^https?:\/\//i.test(raw)) return raw; if (/^discord\.gg\//i.test(raw)) return `https://${raw}`; if (key === 'tiktok') return `https://www.tiktok.com/@${raw.replace(/^@/, '')}`; if (key === 'twitter') return `https://x.com/${raw.replace(/^@/, '')}`; if (key === 'steam' && /^\d{16,20}$/.test(raw)) return `https://steamcommunity.com/profiles/${raw}`; return ''; }
  function connectionCards(socials = {}) { const entries = Object.entries(socials || {}).filter(([, v]) => String(v || '').trim()); if (!entries.length) return '<p class="va-muted">Nenhuma conexão pública cadastrada.</p>'; return `<div class="va-connections-grid va-social-card-grid">${entries.map(([key, value]) => { const href = socialHref(key, value); const inner = `<span class="va-social-card-icon">${socialIcon(key)}</span><span class="va-social-card-body"><strong>${socialLabel(key)}</strong>${href ? '' : `<small>${esc(value)}</small>`}</span><span class="va-social-card-arrow">↗</span>`; return href ? `<a class="va-social-card" href="${esc(href)}" target="_blank" rel="noreferrer">${inner}</a>` : `<div class="va-social-card">${inner}</div>`; }).join('')}</div>`; }
  function rolesHtml(roles = []) { const list = (Array.isArray(roles) ? roles : []).filter((role) => role?.name).slice(0, 10); return list.length ? list.map((role) => `<span class="va-role-chip">${esc(role.name)}</span>`).join('') : '<span class="va-muted">Sem cargos públicos encontrados.</span>'; }
  function safeLogoUrl(value = '') { const raw = String(value || '').trim(); if (!raw) return ''; if (/^data:image\//i.test(raw)) return raw; if (/^blob:/i.test(raw)) return raw; if (/^https?:\/\//i.test(raw)) return raw; if (/^\/(assets|uploads|images|img|public)\//i.test(raw)) return raw; return ''; }
  function teamInitials(team = {}) { return esc(String(team.tag || team.name || '?').trim().slice(0, 2).toUpperCase() || '?'); }
  function teamLogoHtml(team = {}) { const logo = safeLogoUrl(team.logo || team.logoUrl || team.imageUrl || team.badgeUrl || team.escudo || ''); return logo ? `<img src="${esc(logo)}" alt="Logo ${esc(team.name || 'time')}" loading="lazy" />` : `<span>${teamInitials(team)}</span>`; }
  function linkedTeamsHtml(teams = []) { if (!teams.length) return '<p class="va-muted">Jogador livre para recrutamento.</p>'; return `<div class="va-player-team-list">${teams.map((team) => `<div class="va-player-linked-team"><span class="va-linked-team-logo">${teamLogoHtml(team)}</span><span class="va-linked-team-info"><strong>${esc(team.name)}</strong><small>${esc(team.tag || 'Sem tag')}</small></span></div>`).join('')}</div>`; }

  function openPublicPlayer(player = {}) {
    const profile = player.profile || {};
    const banner = profile.banner || profile.discordBanner || '';
    const name = profile.username || player.name || 'Jogador';
    const teams = Array.isArray(player.teams) ? player.teams : [];
    const overlay = getOverlay();
    overlay.innerHTML = `<div class="va-modal-card va-public-profile-card va-player-public-card"><button class="va-modal-close va-floating-close" data-directory-close type="button">×</button><div class="va-public-banner" style="${banner ? `background-image:linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.72)),url('${esc(banner)}')` : ''}"></div><div class="va-public-head"><div class="va-profile-page-avatar va-public-avatar">${player.avatar ? `<img src="${esc(player.avatar)}" alt="Avatar" />` : esc(name.slice(0, 1).toUpperCase())}</div><div class="va-public-main-info"><p class="va-eyebrow">Perfil público do jogador</p><div class="va-public-name-row"><h2>${esc(name)}</h2><div class="va-public-role-strip">${rolesHtml(player.roles)}</div></div><p class="va-muted">${esc([profile.primaryPosition || player.primaryPosition, profile.secondaryPosition, profile.region || profile.competitiveRegion || player.region, profile.country || player.country].filter(Boolean).join(' • ') || player.statusLabel || 'Jogador')}</p><div class="va-kpi-row"><span class="va-badge ${player.status === 'free' ? 'ok' : ''}">${esc(player.statusLabel || 'Jogador')}</span><span class="va-badge">${esc(player.rosterRole || 'Perfil público')}</span>${player.teamName ? `<span class="va-badge">${esc(player.teamName)}${player.teamTag ? ` • ${esc(player.teamTag)}` : ''}</span>` : ''}</div></div></div><div class="va-public-section"><h3>Times vinculados</h3>${linkedTeamsHtml(teams)}</div><div class="va-public-section"><h3>Conexões públicas</h3>${connectionCards(player.socials)}</div>${profile.bio ? `<div class="va-public-section"><h3>Bio</h3><p class="va-muted">${esc(profile.bio)}</p></div>` : ''}</div>`;
    overlay.hidden = false;
  }

  function fillTeamSelect() {
    if (!teamSelect) return;
    const teams = typeSelect?.value === 'trial' ? directory.teams : directory.viewerTeams;
    teamSelect.innerHTML = '<option value="">Selecionar time</option>' + teams.map((team) => `<option value="${esc(team.id)}">${esc(team.name)}${team.tag ? ` (${esc(team.tag)})` : ''}</option>`).join('');
  }

  function savePendingRecruitment(player) { sessionStorage.setItem('voidarena:pendingRecruitment', JSON.stringify(player)); }
  function consumePendingRecruitment() { try { const raw = sessionStorage.getItem('voidarena:pendingRecruitment'); if (!raw) return null; sessionStorage.removeItem('voidarena:pendingRecruitment'); return JSON.parse(raw); } catch { return null; } }
  function ensureSelectedPlayerCard() { const form = document.querySelector('.va-recruitment-form'); if (!form) return null; let card = document.getElementById('selectedRecruitmentPlayerCard'); if (!card) { card = document.createElement('div'); card.id = 'selectedRecruitmentPlayerCard'; card.className = 'va-selected-player-card'; form.insertBefore(card, form.firstChild); } return card; }
  function renderSelectedPlayer() { const card = ensureSelectedPlayerCard(); if (!card) return; if (typeSelect?.value === 'trial') { card.innerHTML = '<strong>🧪 Modo peneira</strong><span>Você vai solicitar avaliação para entrar no time selecionado.</span>'; return; } if (!directory.selectedPlayer?.id) { card.innerHTML = '<strong>🎯 Nenhum jogador selecionado</strong><span>Abra Banco de Jogadores, clique em Recrutar no jogador desejado e volte para cá.</span>'; return; } card.innerHTML = `<strong>🎯 Jogador selecionado</strong><span>${esc(directory.selectedPlayer.name || 'Jogador')}</span><button class="va-btn mini secondary" type="button" id="clearSelectedPlayerBtn">Trocar/remover seleção</button>`; document.getElementById('clearSelectedPlayerBtn')?.addEventListener('click', () => { directory.selectedPlayer = null; renderSelectedPlayer(); setStatus(recruitmentStatus, 'Seleção removida. Escolha outro jogador no Banco de Jogadores.', ''); }); }

  function renderDirectory() {
    if (!directoryTable) return;
    const rows = directory.players || [];
    directoryTable.innerHTML = '<thead><tr><th>Jogador</th><th>Status</th><th>Time atual</th><th>Posição/região</th><th>Ação</th></tr></thead><tbody>' + (rows.length ? rows.map((p) => `<tr><td><button class="va-directory-player va-player-profile-trigger" data-open-player="${esc(idOf(p))}" type="button"><span class="va-directory-avatar">${avatar(p)}</span><span><strong>${esc(p.name)}</strong><small>${esc(publicPlayerSubline(p))}</small></span></button></td><td>${statusBadge(p)}</td><td>${p.teamName ? `<strong>${esc(p.teamName)}</strong><small>${esc(p.teamTag || '')}</small>` : '<span class="va-muted">Sem clube</span>'}</td><td>${esc(playerMeta(p))}</td><td><div class="va-directory-actions"><button class="va-btn mini secondary" data-open-player="${esc(idOf(p))}" type="button">Perfil</button><button class="va-btn mini" data-recruit-player="${esc(idOf(p))}" data-player-name="${esc(p.name)}" type="button">Recrutar</button></div></td></tr>`).join('') : '<tr><td colspan="5">Nenhum jogador encontrado ainda.</td></tr>') + '</tbody>';
    directoryTable.querySelectorAll('[data-recruit-player]').forEach((btn) => btn.addEventListener('click', () => {
      const selected = { id: btn.dataset.recruitPlayer, name: btn.dataset.playerName };
      if (!document.getElementById('recruitmentPanel')) { savePendingRecruitment(selected); window.location.href = '/pages/recrutamento.html'; return; }
      directory.selectedPlayer = selected; if (typeSelect) typeSelect.value = 'recruitment'; fillTeamSelect(); renderSelectedPlayer(); setStatus(recruitmentStatus, `Jogador selecionado para recrutamento: ${directory.selectedPlayer.name}`, 'ok'); document.getElementById('recruitmentPanel')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }));
    directoryTable.querySelectorAll('[data-open-player]').forEach((btn) => btn.addEventListener('click', () => { const row = directory.players.find((p) => idOf(p) === String(btn.dataset.openPlayer)); if (!row) return setStatus(directoryStatus, 'Jogador não encontrado.', 'err'); openPublicPlayer(row); }));
    setStatus(directoryStatus, '', 'ok');
  }

  function renderRequests(requests = []) {
    if (!recruitmentTable) return;
    recruitmentTable.innerHTML = '<thead><tr><th>Tipo</th><th>Time</th><th>Jogador/solicitante</th><th>Status</th><th>Mensagem</th><th>Ação</th></tr></thead><tbody>' + (requests.length ? requests.map((r) => `<tr class="${r.status === 'cancelled' ? 'is-muted-row' : ''}"><td><span class="va-badge">${r.type === 'trial' ? 'Peneira' : 'Recrutamento'}</span></td><td><strong>${esc(r.team?.name || '')}</strong><small>${esc(r.team?.tag || '')}</small></td><td><strong>${esc(r.type === 'trial' ? r.requester?.name : (r.playerName || 'Jogador'))}</strong></td><td>${requestStatusBadge(r.status)}</td><td>${esc(r.note || (r.status === 'cancelled' ? 'Solicitação removida/cancelada.' : 'Sem observação.'))}</td><td>${r.canCancel ? `<button class="va-btn mini danger" data-cancel-request="${esc(r.id)}" type="button">Remover</button>` : '<span class="va-muted">—</span>'}</td></tr>`).join('') : '<tr><td colspan="6">Nenhuma solicitação registrada ainda.</td></tr>') + '</tbody>';
    recruitmentTable.querySelectorAll('[data-cancel-request]').forEach((btn) => btn.addEventListener('click', () => cancelRequest(btn.dataset.cancelRequest)));
  }

  async function loadDirectory() {
    setStatus(directoryStatus, 'Carregando banco de jogadores...');
    directory = await VoidArena.request('/api/players/directory');
    const pending = consumePendingRecruitment();
    if (pending && typeSelect) { directory.selectedPlayer = pending; typeSelect.value = 'recruitment'; setStatus(recruitmentStatus, `Jogador selecionado para recrutamento: ${pending.name}`, 'ok'); }
    fillTeamSelect(); renderSelectedPlayer(); renderDirectory();
  }
  async function loadRequests() { if (!recruitmentTable) return; const data = await VoidArena.request('/api/recruitment/requests'); renderRequests(data.requests || []); }
  async function submitRequest() { const type = typeSelect?.value || 'recruitment'; const teamId = teamSelect?.value || ''; if (!teamId) throw new Error('Selecione o time.'); if (type === 'recruitment' && !directory.selectedPlayer?.id) throw new Error('Selecione um jogador na tela Jogadores para recrutar.'); const saved = await VoidArena.request('/api/recruitment/requests', { method: 'POST', body: JSON.stringify({ type, teamId, playerId: type === 'recruitment' ? directory.selectedPlayer.id : '', playerName: type === 'recruitment' ? directory.selectedPlayer.name : '', note: noteInput?.value || '' }) }); if (noteInput) noteInput.value = ''; directory.selectedPlayer = null; renderSelectedPlayer(); setStatus(recruitmentStatus, saved.request?.type === 'trial' ? 'Peneira solicitada com sucesso.' : 'Convite de recrutamento enviado. O jogador recebe nas notificações/correios.', 'ok'); await loadRequests(); }
  async function cancelRequest(id) { if (!id) return; if (!confirm('Remover/cancelar essa solicitação de recrutamento?')) return; setStatus(recruitmentStatus, 'Cancelando solicitação...'); await VoidArena.request(`/api/recruitment/requests/${encodeURIComponent(id)}`, { method: 'DELETE' }); setStatus(recruitmentStatus, 'Solicitação removida/cancelada.', 'ok'); await loadRequests(); }

  typeSelect?.addEventListener('change', () => { directory.selectedPlayer = typeSelect.value === 'trial' ? null : directory.selectedPlayer; fillTeamSelect(); renderSelectedPlayer(); });
  document.getElementById('reloadDirectoryBtn')?.addEventListener('click', () => Promise.all([loadDirectory(), loadRequests()]).catch((e) => setStatus(directoryStatus || recruitmentStatus, `❌ ${e.message}`, 'err')));
  document.getElementById('sendRecruitmentBtn')?.addEventListener('click', () => submitRequest().catch((e) => setStatus(recruitmentStatus, `❌ ${e.message}`, 'err')));
  VoidArena.bootLayout(pageKey).then(() => Promise.all([loadDirectory(), loadRequests()])).catch((e) => { setStatus(directoryStatus, `❌ ${e.message}`, 'err'); setStatus(recruitmentStatus, `❌ ${e.message}`, 'err'); });
}());
