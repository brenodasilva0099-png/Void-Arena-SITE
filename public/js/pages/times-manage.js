(function () {
  const esc = (value) => (window.VoidArena?.escapeHtml || ((v) => String(v || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]))))(value || '');
  let teams = [];

  async function request(path, options = {}) {
    const response = await fetch(path, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) throw new Error(data.message || `Falha (${response.status}).`);
    return data;
  }

  function teamPlayers(team, key, fallbackKey) {
    const detailed = Array.isArray(team[key]) ? team[key] : [];
    if (detailed.length) return detailed;
    return Array.isArray(team[fallbackKey]) ? team[fallbackKey].map((name, index) => ({ name, discordId: team.playerAccounts?.[fallbackKey === 'players' ? 'players' : 'reserves']?.[index] || '' })) : [];
  }

  function addRow(container, data = {}) {
    const row = document.createElement('div');
    row.className = 'va-roster-row';
    row.innerHTML = `<label>Nome<input data-name maxlength="80" value="${esc(data.name || '')}" /></label><label>ID Discord<input data-discord maxlength="40" value="${esc(data.discordId || data.account || '')}" /></label><button class="va-btn danger mini" type="button">Remover</button>`;
    row.querySelector('button').addEventListener('click', () => row.remove());
    container.appendChild(row);
  }

  function rows(container) {
    return Array.from(container.querySelectorAll('.va-roster-row')).map((row) => ({
      name: row.querySelector('[data-name]')?.value || '',
      discordId: String(row.querySelector('[data-discord]')?.value || '').replace(/^<@!?/, '').replace(/>$/, '').trim()
    })).filter((item) => item.name.trim());
  }

  function modal() {
    let shell = document.getElementById('teamManageModal');
    if (shell) return shell;
    shell = document.createElement('div');
    shell.id = 'teamManageModal';
    shell.className = 'va-modal-shell';
    shell.hidden = true;
    shell.innerHTML = `<div class="va-modal-card va-team-create-modal"><div class="va-modal-head"><div><p class="va-eyebrow">Editar time</p><h2 id="teamManageTitle">Editar time</h2><p class="va-muted">Capitão criador edita o próprio time. Dono/admin pode editar qualquer time.</p></div><button class="va-modal-close" data-close-team-manage type="button">×</button></div><form id="teamManageForm" class="va-form-grid two"><label>Nome<input name="name" required maxlength="80" /></label><label>Tag<input name="tag" required maxlength="8" /></label><label class="wide">Logo / escudo<input name="logo" maxlength="650000" /></label><div class="wide va-roster-editor"><div class="va-section-head mini"><div><h3>Titulares</h3><p>Nome + ID Discord.</p></div><button id="teamManageAddPlayer" class="va-btn" type="button">+ Titular</button></div><div id="teamManagePlayers" class="va-player-editor-list"></div></div><div class="wide va-roster-editor"><div class="va-section-head mini"><div><h3>Reservas</h3><p>Nome + ID Discord.</p></div><button id="teamManageAddReserve" class="va-btn" type="button">+ Reserva</button></div><div id="teamManageReserves" class="va-player-editor-list"></div></div><label>Discord<input name="socialDiscord" /></label><label>Instagram<input name="socialInstagram" /></label><label>YouTube<input name="socialYoutube" /></label><label>TikTok<input name="socialTikTok" /></label><label>Steam<input name="socialSteam" /></label><label>Xbox<input name="socialXbox" /></label><div class="va-actions wide"><button class="va-btn primary" type="submit">Salvar alterações</button><button class="va-btn" data-close-team-manage type="button">Cancelar</button></div></form><div id="teamManageStatus" class="va-status"></div></div>`;
    document.body.appendChild(shell);
    shell.addEventListener('click', (event) => { if (event.target === shell || event.target.closest('[data-close-team-manage]')) shell.hidden = true; });
    shell.querySelector('#teamManageAddPlayer').addEventListener('click', () => addRow(shell.querySelector('#teamManagePlayers')));
    shell.querySelector('#teamManageAddReserve').addEventListener('click', () => addRow(shell.querySelector('#teamManageReserves')));
    return shell;
  }

  function openEdit(team) {
    const shell = modal();
    const form = shell.querySelector('#teamManageForm');
    const players = shell.querySelector('#teamManagePlayers');
    const reserves = shell.querySelector('#teamManageReserves');
    shell.querySelector('#teamManageTitle').textContent = `Editar ${team.name || 'time'}`;
    form.dataset.teamId = team.id;
    form.elements.name.value = team.name || '';
    form.elements.tag.value = team.tag || '';
    form.elements.logo.value = team.logo || '';
    form.elements.socialDiscord.value = team.socials?.discord || '';
    form.elements.socialInstagram.value = team.socials?.instagram || '';
    form.elements.socialYoutube.value = team.socials?.youtube || '';
    form.elements.socialTikTok.value = team.socials?.tiktok || '';
    form.elements.socialSteam.value = team.socials?.steam || '';
    form.elements.socialXbox.value = team.socials?.xbox || '';
    players.innerHTML = '';
    reserves.innerHTML = '';
    teamPlayers(team, 'playerDetails', 'players').forEach((p) => addRow(players, p));
    teamPlayers(team, 'reserveDetails', 'reserves').forEach((p) => addRow(reserves, p));
    if (!players.children.length) addRow(players);
    if (!reserves.children.length) addRow(reserves);
    shell.hidden = false;
  }

  async function saveEdit(event) {
    event.preventDefault();
    const shell = modal();
    const form = event.currentTarget;
    const status = shell.querySelector('#teamManageStatus');
    status.textContent = 'Salvando alterações...';
    try {
      await request(`/api/teams/${encodeURIComponent(form.dataset.teamId)}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: form.elements.name.value,
          tag: form.elements.tag.value,
          logo: form.elements.logo.value,
          playerDetails: rows(shell.querySelector('#teamManagePlayers')),
          reserveDetails: rows(shell.querySelector('#teamManageReserves')),
          socials: {
            discord: form.elements.socialDiscord.value,
            instagram: form.elements.socialInstagram.value,
            youtube: form.elements.socialYoutube.value,
            tiktok: form.elements.socialTikTok.value,
            steam: form.elements.socialSteam.value,
            xbox: form.elements.socialXbox.value
          }
        })
      });
      status.textContent = 'Time atualizado.';
      status.className = 'va-status ok';
      setTimeout(() => window.location.reload(), 700);
    } catch (error) {
      status.textContent = `Erro: ${error.message}`;
      status.className = 'va-status err';
    }
  }

  async function removeTeam(team) {
    if (!confirm(`Excluir o time ${team.name}?`)) return;
    try {
      await request(`/api/teams/${encodeURIComponent(team.id)}`, { method: 'DELETE' });
      window.location.reload();
    } catch (error) {
      alert(`Erro ao excluir: ${error.message}`);
    }
  }

  async function enhance() {
    const data = await request('/api/teams').catch(() => ({ teams: [] }));
    teams = Array.isArray(data.teams) ? data.teams : [];
    document.querySelectorAll('[data-team-id]').forEach((card) => {
      const team = teams.find((item) => String(item.id) === String(card.dataset.teamId));
      if (!team?.canManage || card.querySelector('[data-manage-team-actions]')) return;
      const actions = document.createElement('div');
      actions.className = 'va-actions team-actions';
      actions.setAttribute('data-manage-team-actions', '1');
      actions.innerHTML = '<button class="va-btn mini" type="button">Editar</button><button class="va-btn danger mini" type="button">Excluir</button>';
      actions.children[0].addEventListener('click', (event) => { event.stopPropagation(); openEdit(team); });
      actions.children[1].addEventListener('click', (event) => { event.stopPropagation(); removeTeam(team); });
      card.appendChild(actions);
    });
    modal().querySelector('#teamManageForm').addEventListener('submit', saveEdit, { once: false });
  }

  setTimeout(enhance, 1200);
  new MutationObserver(() => setTimeout(enhance, 100)).observe(document.getElementById('teamsList'), { childList: true });
}());
