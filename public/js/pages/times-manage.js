(function () {
  const esc = (value) => (window.VoidArena?.escapeHtml || ((v) => String(v || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]))))(value || '');
  let teams = [];
  let freePlayers = [];

  async function request(path, options = {}) {
    const response = await fetch(path, { credentials: 'include', headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) throw new Error(data.message || `Falha (${response.status}).`);
    return data;
  }

  function cleanDiscord(value = '') { return String(value || '').replace(/^<@!?/, '').replace(/>$/, '').trim(); }
  function safeLogoUrl(value = '') { const raw = String(value || '').trim(); if (!raw) return ''; if (/^data:image\//i.test(raw)) return raw; if (/^blob:/i.test(raw)) return raw; if (/^https?:\/\//i.test(raw)) return raw; if (/^\/(assets|uploads|images|img|public)\//i.test(raw)) return raw; return ''; }
  function playerId(player = {}) { return String(player.userId || player.id || player.discordId || '').trim(); }
  function teamPlayers(team, key, fallbackKey) { const detailed = Array.isArray(team[key]) ? team[key] : []; if (detailed.length) return detailed; return Array.isArray(team[fallbackKey]) ? team[fallbackKey].map((name, index) => ({ name, discordId: team.playerAccounts?.[fallbackKey === 'players' ? 'players' : 'reserves']?.[index] || '' })) : []; }
  function allRoster(team) { return [...teamPlayers(team, 'playerDetails', 'players'), ...teamPlayers(team, 'reserveDetails', 'reserves')]; }
  function registeredRoster(team) { return allRoster(team).filter((p) => String(p.id || p.discordId || '').trim()); }
  async function loadFreePlayers() { try { const data = await request('/api/players/directory'); freePlayers = (Array.isArray(data.players) ? data.players : []).filter((p) => String(p.status || '').toLowerCase() === 'free' || !p.teamName); } catch { freePlayers = []; } }
  function freeOptions(selected = '') { return '<option value="">Digitar manualmente / sem convite</option>' + freePlayers.map((p) => { const id = playerId(p); return `<option value="${esc(id)}" data-name="${esc(p.name || '')}" data-discord="${esc(p.discordId || '')}" ${String(selected) === String(id) ? 'selected' : ''}>${esc(p.name || 'Jogador')} ${p.discordId ? `• ${esc(p.discordId)}` : ''}</option>`; }).join(''); }

  function markInvite(row, selected) { row.dataset.inviteOnly = selected ? '1' : '0'; row.classList.toggle('is-pending-invite', Boolean(selected)); const note = row.querySelector('[data-invite-note]'); if (note) note.textContent = selected ? 'Convite pendente: só entra se aceitar no site/Discord.' : 'Preenchimento manual: entra direto no elenco ao salvar.'; }
  function bindFreeSelect(row, updateLeadership) { if (!row || row.querySelector('[data-free-player-select]')) return; const label = document.createElement('label'); label.className = 'va-roster-select-label'; label.innerHTML = `Selecionar jogador livre<select data-free-player-select>${freeOptions(row.dataset.selectedPlayerId || '')}</select><small class="va-muted" data-invite-note>Preenchimento manual: entra direto no elenco ao salvar.</small>`; row.insertBefore(label, row.firstChild); const select = label.querySelector('select'); select.addEventListener('change', () => { const option = select.selectedOptions[0]; const selected = select.value; row.dataset.selectedPlayerId = selected || ''; if (selected) { row.querySelector('[data-name]').value = option?.dataset?.name || ''; row.querySelector('[data-discord]').value = option?.dataset?.discord || selected; } markInvite(row, selected); updateLeadership?.(); }); markInvite(row, row.dataset.selectedPlayerId); }

  function addRow(container, data = {}, updateLeadership = null) {
    const row = document.createElement('div');
    row.className = 'va-roster-row';
    row.innerHTML = `<label>Nome<input data-name maxlength="80" value="${esc(data.name || '')}" /></label><label>ID Discord<input data-discord maxlength="40" value="${esc(data.discordId || data.account || '')}" /></label><button class="va-btn danger mini" type="button">Remover</button>`;
    row.querySelector('button').addEventListener('click', () => { row.remove(); updateLeadership?.(); });
    row.querySelectorAll('input').forEach((input) => input.addEventListener('input', () => updateLeadership?.()));
    container.appendChild(row);
    bindFreeSelect(row, updateLeadership);
  }

  function rows(container) { return Array.from(container.querySelectorAll('.va-roster-row')).filter((row) => row.dataset.inviteOnly !== '1').map((row) => ({ name: row.querySelector('[data-name]')?.value || '', discordId: cleanDiscord(row.querySelector('[data-discord]')?.value || '') })).filter((item) => item.name.trim()); }
  function inviteRows(container, slot) { return Array.from(container.querySelectorAll('.va-roster-row')).filter((row) => row.dataset.inviteOnly === '1' && row.dataset.selectedPlayerId).map((row) => ({ playerId: row.dataset.selectedPlayerId, playerName: row.querySelector('[data-name]')?.value || 'Jogador', rosterSlot: slot, note: `Convite para entrar como ${slot === 'reserve' ? 'reserva' : 'titular'} no time.` })); }
  function currentMembers(shell) { return Array.from(shell.querySelectorAll('#teamManagePlayers .va-roster-row,#teamManageReserves .va-roster-row')).map((row) => ({ name: row.querySelector('[data-name]')?.value || '', discordId: cleanDiscord(row.querySelector('[data-discord]')?.value || ''), inviteOnly: row.dataset.inviteOnly === '1' })).filter((item) => item.name && !item.inviteOnly); }
  function ensureLeaderSelect(form, inputName) { const input = form.elements[inputName]; if (!input || input.parentElement.querySelector('[data-leadership-select]')) return; const select = document.createElement('select'); select.dataset.leadershipSelect = inputName; select.innerHTML = '<option value="">Selecionar membro do time</option>'; input.parentElement.appendChild(select); select.addEventListener('change', () => { if (!select.value) return; const opt = select.selectedOptions[0]; const discordField = inputName === 'directorName' ? form.elements.directorDiscordId : form.elements.captainDiscordId; input.value = opt?.dataset?.name || ''; if (discordField) discordField.value = opt?.dataset?.discord || ''; }); }
  function updateLeaderOptions(shell) { const form = shell.querySelector('#teamManageForm'); ensureLeaderSelect(form, 'directorName'); ensureLeaderSelect(form, 'captainName'); const members = currentMembers(shell); shell.querySelectorAll('[data-leadership-select]').forEach((select) => { const selected = select.value; select.innerHTML = '<option value="">Selecionar membro do time</option>' + members.map((m, index) => `<option value="${index}" data-name="${esc(m.name)}" data-discord="${esc(m.discordId)}">${esc(m.name)}${m.discordId ? ` • ${esc(m.discordId)}` : ''}</option>`).join(''); select.value = selected; }); }

  function modal() {
    let shell = document.getElementById('teamManageModal');
    if (shell) return shell;
    shell = document.createElement('div');
    shell.id = 'teamManageModal';
    shell.className = 'va-modal-shell';
    shell.hidden = true;
    shell.innerHTML = `<div class="va-modal-card va-team-create-modal"><div class="va-modal-head"><div><p class="va-eyebrow">Editar time</p><h2 id="teamManageTitle">Editar time</h2><p class="va-muted">Diretor/dono, capitão criador ou admin pode editar o time. Selecionar jogador livre envia convite, não adiciona direto.</p></div><button class="va-modal-close" data-close-team-manage type="button">×</button></div><form id="teamManageForm" class="va-form-grid two"><label>Nome<input name="name" required maxlength="80" /></label><label>Tag<input name="tag" required maxlength="8" /></label><div class="wide va-roster-editor va-leadership-editor"><div class="va-section-head mini"><div><h3>Diretoria</h3><p>Diretor é o dono/responsável principal. Capitão aparece logo abaixo no perfil público.</p></div></div><div class="va-form-grid two flat"><label>Diretor / dono<input name="directorName" maxlength="80" /></label><label>ID Discord do diretor<input name="directorDiscordId" maxlength="40" /></label><label>Capitão<input name="captainName" maxlength="80" /></label><label>ID Discord do capitão<input name="captainDiscordId" maxlength="40" /></label></div></div><label class="wide">Logo / escudo<input name="logo" maxlength="650000" placeholder="https://... ou data:image/..." /></label><div class="wide va-roster-editor"><div class="va-section-head mini"><div><h3>Titulares</h3><p>Selecione jogador livre para convite ou digite manualmente.</p></div><button id="teamManageAddPlayer" class="va-btn" type="button">+ Titular</button></div><div id="teamManagePlayers" class="va-player-editor-list"></div></div><div class="wide va-roster-editor"><div class="va-section-head mini"><div><h3>Reservas</h3><p>Selecione jogador livre para convite ou digite manualmente.</p></div><button id="teamManageAddReserve" class="va-btn" type="button">+ Reserva</button></div><div id="teamManageReserves" class="va-player-editor-list"></div></div><label>Discord<input name="socialDiscord" /></label><label>Instagram<input name="socialInstagram" /></label><label>YouTube<input name="socialYoutube" /></label><label>TikTok<input name="socialTikTok" /></label><label>Steam<input name="socialSteam" /></label><label>Xbox<input name="socialXbox" /></label><div class="va-actions wide"><button class="va-btn primary" type="submit">Salvar alterações</button><button class="va-btn" data-close-team-manage type="button">Cancelar</button></div></form><div id="teamManageStatus" class="va-status"></div></div>`;
    document.body.appendChild(shell);
    shell.addEventListener('click', (event) => { if (event.target === shell || event.target.closest('[data-close-team-manage]')) shell.hidden = true; });
    shell.querySelector('#teamManageAddPlayer').addEventListener('click', () => { addRow(shell.querySelector('#teamManagePlayers'), {}, () => updateLeaderOptions(shell)); updateLeaderOptions(shell); });
    shell.querySelector('#teamManageAddReserve').addEventListener('click', () => { addRow(shell.querySelector('#teamManageReserves'), {}, () => updateLeaderOptions(shell)); updateLeaderOptions(shell); });
    return shell;
  }

  function transferModal() { let shell = document.getElementById('teamTransferCaptainModal'); if (shell) return shell; shell = document.createElement('div'); shell.id = 'teamTransferCaptainModal'; shell.className = 'va-modal-shell'; shell.hidden = true; shell.innerHTML = `<div class="va-modal-card va-team-create-modal"><div class="va-modal-head"><div><p class="va-eyebrow">Transferir capitão</p><h2 id="teamTransferTitle">Transferir capitão</h2><p class="va-muted">Transfere o capitão para um jogador cadastrado/vinculado no site, sem perder elenco, inscrições ou histórico.</p></div><button class="va-modal-close" data-close-transfer type="button">×</button></div><form id="teamTransferForm" class="va-form-grid"><label>Novo capitão<select name="captain" required></select></label><div class="va-actions wide"><button class="va-btn primary" type="submit">Confirmar transferência</button><button class="va-btn" data-close-transfer type="button">Cancelar</button></div></form><div id="teamTransferStatus" class="va-status"></div></div>`; document.body.appendChild(shell); shell.addEventListener('click', (event) => { if (event.target === shell || event.target.closest('[data-close-transfer]')) shell.hidden = true; }); return shell; }

  async function openEdit(team) {
    await loadFreePlayers();
    const shell = modal();
    const form = shell.querySelector('#teamManageForm');
    const players = shell.querySelector('#teamManagePlayers');
    const reserves = shell.querySelector('#teamManageReserves');
    shell.querySelector('#teamManageTitle').textContent = `Editar ${team.name || 'time'}`;
    form.dataset.teamId = team.id;
    form.elements.name.value = team.name || '';
    form.elements.tag.value = team.tag || '';
    form.elements.directorName.value = team.directorName || team.ownerName || '';
    form.elements.directorDiscordId.value = team.directorDiscordId || '';
    form.elements.captainName.value = team.captainName || '';
    form.elements.captainDiscordId.value = team.captainDiscordId || '';
    form.elements.logo.value = safeLogoUrl(team.logo) || '';
    form.elements.socialDiscord.value = team.socials?.discord || '';
    form.elements.socialInstagram.value = team.socials?.instagram || '';
    form.elements.socialYoutube.value = team.socials?.youtube || '';
    form.elements.socialTikTok.value = team.socials?.tiktok || '';
    form.elements.socialSteam.value = team.socials?.steam || '';
    form.elements.socialXbox.value = team.socials?.xbox || '';
    players.innerHTML = ''; reserves.innerHTML = '';
    teamPlayers(team, 'playerDetails', 'players').forEach((p) => addRow(players, p, () => updateLeaderOptions(shell)));
    teamPlayers(team, 'reserveDetails', 'reserves').forEach((p) => addRow(reserves, p, () => updateLeaderOptions(shell)));
    if (!players.children.length) addRow(players, {}, () => updateLeaderOptions(shell));
    if (!reserves.children.length) addRow(reserves, {}, () => updateLeaderOptions(shell));
    updateLeaderOptions(shell);
    shell.hidden = false;
  }

  function openTransfer(team) { const shell = transferModal(); const form = shell.querySelector('#teamTransferForm'); const status = shell.querySelector('#teamTransferStatus'); const select = form.elements.captain; const players = registeredRoster(team); shell.querySelector('#teamTransferTitle').textContent = `Transferir capitão • ${team.name || 'time'}`; form.dataset.teamId = team.id; select.innerHTML = '<option value="">Selecionar novo capitão</option>' + players.map((p) => `<option value="${esc(p.id || p.discordId)}" data-user-id="${esc(p.id || '')}" data-discord-id="${esc(p.discordId || '')}">${esc(p.name || 'Jogador')} ${p.type === 'reserve' ? '(Reserva)' : '(Titular)'}</option>`).join(''); status.textContent = players.length ? 'Escolha um jogador cadastrado/vinculado no site.' : 'Nenhum jogador vinculado encontrado nesse elenco. Preencha o ID Discord correto e peça para o jogador logar no site.'; status.className = players.length ? 'va-status' : 'va-status err'; shell.hidden = false; }

  async function saveEdit(event) {
    event.preventDefault();
    const shell = modal();
    const form = event.currentTarget;
    const status = shell.querySelector('#teamManageStatus');
    const rawLogo = String(form.elements.logo.value || '').trim();
    if (rawLogo && !safeLogoUrl(rawLogo)) { status.textContent = 'Logo inválida. Use URL completa começando com https:// ou uma imagem colada como data:image.'; status.className = 'va-status err'; return; }
    const invites = [...inviteRows(shell.querySelector('#teamManagePlayers'), 'player'), ...inviteRows(shell.querySelector('#teamManageReserves'), 'reserve')];
    status.textContent = invites.length ? 'Salvando e enviando convites...' : 'Salvando alterações...';
    try {
      const result = await request(`/api/teams/${encodeURIComponent(form.dataset.teamId)}`, {
        method: 'PUT',
        body: JSON.stringify({ name: form.elements.name.value, tag: form.elements.tag.value, logo: safeLogoUrl(rawLogo), directorName: form.elements.directorName.value, directorDiscordId: cleanDiscord(form.elements.directorDiscordId.value), captainName: form.elements.captainName.value, captainDiscordId: cleanDiscord(form.elements.captainDiscordId.value), playerDetails: rows(shell.querySelector('#teamManagePlayers')), reserveDetails: rows(shell.querySelector('#teamManageReserves')), inviteRequests: invites, socials: { discord: form.elements.socialDiscord.value, instagram: form.elements.socialInstagram.value, youtube: form.elements.socialYoutube.value, tiktok: form.elements.socialTikTok.value, steam: form.elements.socialSteam.value, xbox: form.elements.socialXbox.value } })
      });
      const sent = Array.isArray(result.inviteResults) ? result.inviteResults.length : invites.length;
      status.textContent = sent ? `Time atualizado. ${sent} convite(s) enviados.` : 'Time atualizado.';
      status.className = 'va-status ok';
      setTimeout(() => window.location.reload(), 900);
    } catch (error) { status.textContent = `Erro: ${error.message}`; status.className = 'va-status err'; }
  }

  async function saveTransfer(event) { event.preventDefault(); const shell = transferModal(); const form = event.currentTarget; const status = shell.querySelector('#teamTransferStatus'); const selected = form.elements.captain.selectedOptions[0]; status.textContent = 'Transferindo capitão...'; status.className = 'va-status'; try { await request(`/api/teams/${encodeURIComponent(form.dataset.teamId)}/transfer-captain`, { method: 'POST', body: JSON.stringify({ userId: selected?.dataset?.userId || '', discordId: selected?.dataset?.discordId || selected?.value || '' }) }); status.textContent = 'Capitão transferido com sucesso.'; status.className = 'va-status ok'; setTimeout(() => window.location.reload(), 700); } catch (error) { status.textContent = `Erro: ${error.message}`; status.className = 'va-status err'; } }
  async function removeTeam(team) { if (!confirm(`Excluir o time ${team.name}?`)) return; try { await request(`/api/teams/${encodeURIComponent(team.id)}`, { method: 'DELETE' }); window.location.reload(); } catch (error) { alert(`Erro ao excluir: ${error.message}`); } }

  async function enhance() {
    const data = await request('/api/teams').catch(() => ({ teams: [] }));
    teams = Array.isArray(data.teams) ? data.teams : [];
    document.querySelectorAll('[data-team-id]').forEach((card) => {
      const team = teams.find((item) => String(item.id) === String(card.dataset.teamId));
      if (!team?.canManage || card.querySelector('[data-manage-team-actions]')) return;
      const actions = document.createElement('div');
      actions.className = 'va-actions team-actions';
      actions.setAttribute('data-manage-team-actions', '1');
      actions.innerHTML = '<button class="va-btn mini" type="button">Editar</button><button class="va-btn mini secondary" type="button">Transferir capitão</button><button class="va-btn danger mini" type="button">Excluir</button>';
      actions.children[0].addEventListener('click', (event) => { event.stopPropagation(); openEdit(team); });
      actions.children[1].addEventListener('click', (event) => { event.stopPropagation(); openTransfer(team); });
      actions.children[2].addEventListener('click', (event) => { event.stopPropagation(); removeTeam(team); });
      card.appendChild(actions);
    });
    const manageForm = modal().querySelector('#teamManageForm');
    if (!manageForm.dataset.bound) { manageForm.dataset.bound = '1'; manageForm.addEventListener('submit', saveEdit); }
    const transferForm = transferModal().querySelector('#teamTransferForm');
    if (!transferForm.dataset.bound) { transferForm.dataset.bound = '1'; transferForm.addEventListener('submit', saveTransfer); }
  }

  setTimeout(enhance, 1200);
  const target = document.getElementById('teamsList');
  if (target) new MutationObserver(() => setTimeout(enhance, 100)).observe(target, { childList: true });
}());
