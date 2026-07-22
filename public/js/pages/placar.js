(function () {
  'use strict';

  const statusEl = document.getElementById('placarStatus');
  const table3 = document.getElementById('placar3v3Table');
  const table5 = document.getElementById('placar5v5Table');
  const queue3 = document.getElementById('queue3v3');
  const queue5 = document.getElementById('queue5v5');
  const ranksEl = document.getElementById('placarRanks');
  const consoleEl = document.getElementById('placarConsole');
  const loginEl = document.getElementById('placarLoginRequired');
  const memberCountEl = document.getElementById('placarMemberCount');
  const searchEl = document.getElementById('placarSearch');
  const sortEl = document.getElementById('placarSort');
  const roleEl = document.getElementById('placarRoleFilter');
  const resultCountEl = document.getElementById('placarResultCount');
  let scoreboardData = null;
  let activeMode = '3v3';

  function escapeHtml(value = '') {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
  }

  function number(value) {
    const parsed = Number(value || 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function normalize(value = '') {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  }

  function roleNames(player = {}) {
    const values = Array.isArray(player.roleNames) && player.roleNames.length
      ? player.roleNames
      : (Array.isArray(player.roles) ? player.roles.map((role) => typeof role === 'string' ? role : role?.name) : []);
    return [...new Set(values.map((role) => String(role || '').trim()).filter(Boolean))];
  }

  function primaryRole(player = {}) {
    return String(player.primaryRole || roleNames(player)[0] || 'Sem cargo');
  }

  function nameCompare(a = {}, b = {}) {
    return String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR', { sensitivity: 'base', numeric: true });
  }

  function activityTime(player = {}) {
    const value = player.lastActivityAt || player.lastMatchAt || player.updatedAt || '';
    const timestamp = value ? Date.parse(value) : Number.NaN;
    return Number.isFinite(timestamp) ? timestamp : null;
  }

  function formatActivity(player = {}) {
    const timestamp = activityTime(player);
    if (timestamp === null) return 'Nunca jogou';
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(new Date(timestamp));
  }

  function setStatus(message, type = '') {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.className = `hnl-placar-status ${type}`.trim();
  }

  async function getJson(url) {
    const response = await fetch(`${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`, {
      credentials: 'include',
      cache: 'no-store',
      headers: { Accept: 'application/json' }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) {
      const error = new Error(data.message || `Falha ao carregar o placar (${response.status}).`);
      error.status = response.status;
      throw error;
    }
    return data;
  }

  function avatar(player = {}) {
    const name = escapeHtml(player.name || 'Jogador');
    if (player.avatar) {
      return `<span class="hnl-placar-avatar"><img src="${escapeHtml(player.avatar)}" alt="Avatar de ${name}" loading="lazy"></span>`;
    }
    return `<span class="hnl-placar-avatar">${name.slice(0, 1).toUpperCase() || '?'}</span>`;
  }

  function renderRanks(ranks = []) {
    if (!ranksEl) return;
    ranksEl.innerHTML = ranks.length
      ? ranks.map((rank) => `<div class="hnl-rank-chip"><strong>${escapeHtml(rank.emoji || '•')} ${escapeHtml(rank.name || 'Patente')}</strong><span>${number(rank.min)}+ pts</span></div>`).join('')
      : '<div class="hnl-rank-chip"><strong>Patentes</strong><span>aguardando o bot</span></div>';
  }

  function filterAndSort(players = []) {
    const query = normalize(searchEl?.value || '');
    const selectedRole = roleEl?.value || 'all';
    const filtered = (Array.isArray(players) ? players : []).filter((player) => {
      const roles = roleNames(player);
      const searchable = normalize([player.name, player.username, player.discordId, ...roles].filter(Boolean).join(' '));
      return (!query || searchable.includes(query)) && (selectedRole === 'all' || roles.includes(selectedRole));
    });
    const sort = sortEl?.value || 'points-desc';
    return filtered.sort((a, b) => {
      if (sort === 'points-asc') return number(a.points) - number(b.points) || nameCompare(a, b);
      if (sort === 'name-asc') return nameCompare(a, b);
      if (sort === 'name-desc') return nameCompare(b, a);
      if (sort === 'role-asc') return primaryRole(a).localeCompare(primaryRole(b), 'pt-BR', { sensitivity: 'base' }) || nameCompare(a, b);
      if (sort === 'recent-desc' || sort === 'recent-asc') {
        const aTime = activityTime(a);
        const bTime = activityTime(b);
        if (aTime === null && bTime !== null) return sort === 'recent-desc' ? 1 : -1;
        if (aTime !== null && bTime === null) return sort === 'recent-desc' ? -1 : 1;
        if (aTime !== bTime) return sort === 'recent-desc' ? bTime - aTime : aTime - bTime;
        return nameCompare(a, b);
      }
      return number(b.points) - number(a.points) || number(b.wins) - number(a.wins) || nameCompare(a, b);
    });
  }

  function renderTable(table, players = [], mode = '3v3') {
    if (!table) return;
    const rows = Array.isArray(players) ? players : [];
    table.innerHTML = `<thead><tr><th>#</th><th>Jogador</th><th>Cargo</th><th>Patente</th><th class="num">Pts</th><th class="num">J</th><th class="num">V</th><th class="num">E</th><th class="num">D</th><th>Win-rate</th><th class="num">Gols</th><th class="num">Assist.</th><th class="num">Defesas</th><th class="num">MVP</th><th>Última atividade</th></tr></thead><tbody>${rows.length ? rows.map((player, index) => {
      const matches = number(player.matches);
      const wins = number(player.wins);
      const rate = Number.isFinite(Number(player.winRate)) ? Number(player.winRate) : (matches ? (wins / matches) * 100 : 0);
      const roles = roleNames(player);
      const role = primaryRole(player);
      return `<tr><td class="hnl-score">#${index + 1}</td><td><div class="hnl-placar-player">${avatar(player)}<span><strong>${escapeHtml(player.name || 'Jogador')}</strong><small>${escapeHtml(player.discordId || 'Discord reconhecido pelo bot')}</small></span></div></td><td><span class="hnl-role-chip" title="${escapeHtml(roles.join(' • ') || 'Sem cargo')}">${escapeHtml(role)}</span></td><td><span class="hnl-patent">${escapeHtml(player.rankEmoji || '•')} ${escapeHtml(player.rankName || 'Inicial')}</span></td><td class="num"><span class="hnl-score">${number(player.points)}</span></td><td class="num">${matches}</td><td class="num">${wins}</td><td class="num">${number(player.draws)}</td><td class="num">${number(player.losses)}</td><td>${rate.toFixed(1)}%</td><td class="num">${number(player.goals)}</td><td class="num">${number(player.assists)}</td><td class="num">${number(player.defenses)}</td><td class="num">${number(player.mvp)}</td><td><span class="hnl-last-activity">${escapeHtml(formatActivity(player))}</span></td></tr>`;
    }).join('') : `<tr><td colspan="15">Nenhum membro encontrado no Placar ${mode.toUpperCase()} com os filtros escolhidos.</td></tr>`}</tbody>`;
  }

  function playersFor(mode = activeMode) {
    return scoreboardData?.leaderboards?.[mode] || [];
  }

  function populateRoles() {
    if (!roleEl) return;
    const previous = roleEl.value || 'all';
    const roles = [...new Set(playersFor().flatMap(roleNames))].sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
    roleEl.innerHTML = `<option value="all">Todos os cargos</option>${roles.map((role) => `<option value="${escapeHtml(role)}">${escapeHtml(role)}</option>`).join('')}`;
    roleEl.value = roles.includes(previous) ? previous : 'all';
  }

  function renderCurrentData() {
    if (!scoreboardData) return;
    const rows3 = filterAndSort(playersFor('3v3'));
    const rows5 = filterAndSort(playersFor('5v5'));
    renderTable(table3, rows3, '3x3');
    renderTable(table5, rows5, '5x5');
    const currentRows = activeMode === '5v5' ? rows5 : rows3;
    const total = playersFor().length;
    if (resultCountEl) resultCountEl.textContent = `${currentRows.length} de ${total} membros exibidos`;
  }

  function selectTab(mode) {
    activeMode = mode;
    document.querySelectorAll('[data-placar-tab]').forEach((button) => {
      const active = button.dataset.placarTab === mode;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    document.querySelectorAll('[data-placar-panel]').forEach((panel) => {
      panel.hidden = panel.dataset.placarPanel !== mode;
    });
    populateRoles();
    renderCurrentData();
  }

  function showLoginRequired() {
    if (consoleEl) consoleEl.hidden = true;
    if (loginEl) loginEl.hidden = false;
    if (queue3) queue3.textContent = '—/6';
    if (queue5) queue5.textContent = '—/10';
    if (memberCountEl) memberCountEl.textContent = '—';
    if (ranksEl) ranksEl.innerHTML = '<div class="hnl-rank-chip"><strong>Patentes</strong><span>entre com Discord</span></div>';
    setStatus('Entre com Discord para que o bot reconheça sua conta e carregue o ranking.', 'err');
  }

  async function load() {
    setStatus('Sincronizando filas, patentes e rankings com o bot...');
    const session = await getJson('/api/auth/session');
    if (!session.authenticated) {
      showLoginRequired();
      return;
    }

    if (consoleEl) consoleEl.hidden = false;
    if (loginEl) loginEl.hidden = true;
    const data = await getJson('/api/placar');
    scoreboardData = data;
    renderRanks(data.ranks || []);
    if (queue3) queue3.textContent = `${data.queues?.['3v3']?.length || 0}/6`;
    if (queue5) queue5.textContent = `${data.queues?.['5v5']?.length || 0}/10`;
    if (memberCountEl) memberCountEl.textContent = number(data.serverMembersCount);
    populateRoles();
    renderCurrentData();
    setStatus(data.membersWarning
      ? 'Estatísticas carregadas; a lista completa de membros do Discord está temporariamente indisponível.'
      : 'Todos os membros do servidor e os dados do Café com Leite foram sincronizados.', data.membersWarning ? 'err' : 'ok');
  }

  document.querySelectorAll('[data-placar-tab]').forEach((button) => {
    button.addEventListener('click', () => selectTab(button.dataset.placarTab || '3v3'));
  });
  document.getElementById('reloadPlacarBtn')?.addEventListener('click', () => {
    load().catch((error) => error.status === 401 ? showLoginRequired() : setStatus(error.message, 'err'));
  });
  searchEl?.addEventListener('input', renderCurrentData);
  sortEl?.addEventListener('change', renderCurrentData);
  roleEl?.addEventListener('change', renderCurrentData);

  selectTab('3v3');
  load().catch((error) => error.status === 401 ? showLoginRequired() : setStatus(error.message, 'err'));
}());
