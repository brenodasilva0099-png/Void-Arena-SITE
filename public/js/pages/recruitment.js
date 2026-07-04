(function () {
  const directoryTable = document.getElementById('playerDirectoryTable');
  const recruitmentTable = document.getElementById('recruitmentRequestsTable');
  const directoryStatus = document.getElementById('playerDirectoryStatus');
  const recruitmentStatus = document.getElementById('recruitmentStatus');
  const teamSelect = document.getElementById('recruitmentTeamSelect');
  const typeSelect = document.getElementById('recruitmentTypeSelect');
  const noteInput = document.getElementById('recruitmentNoteInput');
  let directory = { players: [], teams: [], viewerTeams: [], selectedPlayer: null };
  const esc = (value) => VoidArena.escapeHtml(value ?? '');

  function setStatus(el, message, type = '') { if (el) { el.textContent = message; el.className = `va-status ${type}`.trim(); } }
  function avatar(player = {}) { return player.avatar ? `<img src="${esc(player.avatar)}" alt="${esc(player.name)}" />` : esc((player.name || '?').slice(0, 1).toUpperCase()); }
  function statusBadge(player = {}) { return player.status === 'free' ? '<span class="va-badge ok">Livre</span>' : '<span class="va-badge">Com clube</span>'; }
  function playerMeta(player = {}) { return [player.primaryPosition, player.region, player.country].filter(Boolean).join(' • ') || 'Perfil sem detalhes'; }

  function fillTeamSelect() {
    if (!teamSelect) return;
    const teams = typeSelect?.value === 'trial' ? directory.teams : directory.viewerTeams;
    teamSelect.innerHTML = '<option value="">Selecionar time</option>' + teams.map((team) => `<option value="${esc(team.id)}">${esc(team.name)}${team.tag ? ` (${esc(team.tag)})` : ''}</option>`).join('');
  }

  function renderDirectory() {
    if (!directoryTable) return;
    const rows = directory.players || [];
    directoryTable.innerHTML = '<thead><tr><th>Jogador</th><th>Status</th><th>Time atual</th><th>Posição/região</th><th>Ação</th></tr></thead><tbody>' + (rows.length ? rows.map((p) => `<tr><td><div class="va-directory-player"><span class="va-directory-avatar">${avatar(p)}</span><span><strong>${esc(p.name)}</strong><small>${esc(p.discordId || p.userId || 'sem ID vinculado')}</small></span></div></td><td>${statusBadge(p)}</td><td>${p.teamName ? `<strong>${esc(p.teamName)}</strong><small>${esc(p.teamTag || '')}</small>` : '<span class="va-muted">Sem clube</span>'}</td><td>${esc(playerMeta(p))}</td><td><div class="va-directory-actions"><button class="va-btn mini secondary" data-open-player="${esc(p.userId || p.discordId || p.id)}" type="button">Perfil</button><button class="va-btn mini" data-recruit-player="${esc(p.userId || p.discordId || p.id)}" data-player-name="${esc(p.name)}" type="button">Recrutar</button></div></td></tr>`).join('') : '<tr><td colspan="5">Nenhum jogador encontrado ainda.</td></tr>') + '</tbody>';
    directoryTable.querySelectorAll('[data-recruit-player]').forEach((btn) => btn.addEventListener('click', () => {
      directory.selectedPlayer = { id: btn.dataset.recruitPlayer, name: btn.dataset.playerName };
      if (typeSelect) typeSelect.value = 'recruitment';
      fillTeamSelect();
      setStatus(recruitmentStatus, `Jogador selecionado para recrutamento: ${directory.selectedPlayer.name}`, 'ok');
      document.getElementById('recruitmentPanel')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }));
    directoryTable.querySelectorAll('[data-open-player]').forEach((btn) => btn.addEventListener('click', () => {
      const row = directory.players.find((p) => [p.userId, p.discordId, p.id].map(String).includes(String(btn.dataset.openPlayer)));
      if (!row?.userId && !row?.discordId) return setStatus(directoryStatus, 'Esse jogador ainda não tem perfil público vinculado.', 'err');
      window.dispatchEvent(new CustomEvent('voidarena:open-public-player', { detail: { userId: row.userId || row.discordId } }));
    }));
    setStatus(directoryStatus, `${rows.length} jogador(es) encontrados.`, 'ok');
  }

  function renderRequests(requests = []) {
    if (!recruitmentTable) return;
    recruitmentTable.innerHTML = '<thead><tr><th>Tipo</th><th>Time</th><th>Jogador/solicitante</th><th>Status</th><th>Mensagem</th></tr></thead><tbody>' + (requests.length ? requests.map((r) => `<tr><td><span class="va-badge">${r.type === 'trial' ? 'Peneira' : 'Recrutamento'}</span></td><td><strong>${esc(r.team?.name || '')}</strong><small>${esc(r.team?.tag || '')}</small></td><td><strong>${esc(r.type === 'trial' ? r.requester?.name : (r.playerName || r.playerId || 'Jogador'))}</strong><small>${esc(r.requester?.discordId || '')}</small></td><td><span class="va-badge ok">${esc(r.status || 'pending')}</span></td><td>${esc(r.note || 'Sem observação.')}</td></tr>`).join('') : '<tr><td colspan="5">Nenhuma solicitação registrada ainda.</td></tr>') + '</tbody>';
  }

  async function loadDirectory() {
    setStatus(directoryStatus, 'Carregando banco de jogadores...');
    directory = await VoidArena.request('/api/players/directory');
    fillTeamSelect();
    renderDirectory();
  }

  async function loadRequests() {
    const data = await VoidArena.request('/api/recruitment/requests');
    renderRequests(data.requests || []);
  }

  async function submitRequest() {
    const type = typeSelect?.value || 'recruitment';
    const teamId = teamSelect?.value || '';
    if (!teamId) throw new Error('Selecione o time.');
    if (type === 'recruitment' && !directory.selectedPlayer?.id) throw new Error('Selecione um jogador na tabela para recrutar.');
    const body = {
      type,
      teamId,
      playerId: type === 'recruitment' ? directory.selectedPlayer.id : '',
      playerName: type === 'recruitment' ? directory.selectedPlayer.name : '',
      note: noteInput?.value || ''
    };
    const saved = await VoidArena.request('/api/recruitment/requests', { method: 'POST', body: JSON.stringify(body) });
    if (noteInput) noteInput.value = '';
    directory.selectedPlayer = null;
    setStatus(recruitmentStatus, saved.request?.type === 'trial' ? 'Peneira solicitada com sucesso.' : 'Recrutamento solicitado com sucesso.', 'ok');
    await loadRequests();
  }

  typeSelect?.addEventListener('change', () => { directory.selectedPlayer = typeSelect.value === 'trial' ? null : directory.selectedPlayer; fillTeamSelect(); });
  document.getElementById('reloadDirectoryBtn')?.addEventListener('click', () => Promise.all([loadDirectory(), loadRequests()]).catch((e) => setStatus(directoryStatus, `❌ ${e.message}`, 'err')));
  document.getElementById('sendRecruitmentBtn')?.addEventListener('click', () => submitRequest().catch((e) => setStatus(recruitmentStatus, `❌ ${e.message}`, 'err')));

  Promise.all([loadDirectory(), loadRequests()]).catch((e) => { setStatus(directoryStatus, `❌ ${e.message}`, 'err'); setStatus(recruitmentStatus, `❌ ${e.message}`, 'err'); });
}());
