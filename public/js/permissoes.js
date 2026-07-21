(function () {
  'use strict';

  const permissionRows = document.getElementById('permissionRows');
  const saveBtn = document.getElementById('saveBtn');
  const reloadBtn = document.getElementById('reloadBtn');
  const statusEl = document.getElementById('status');
  const roleSearch = document.getElementById('roleSearch');
  const roleFilter = document.getElementById('roleFilter');
  const expandRolesBtn = document.getElementById('expandRolesBtn');
  const collapseRolesBtn = document.getElementById('collapseRolesBtn');
  const roleCount = document.getElementById('roleCount');
  const ruleCount = document.getElementById('ruleCount');
  const changeCount = document.getElementById('changeCount');

  if (!permissionRows || !saveBtn || !reloadBtn || !statusEl) return;

  const permissionGroups = [
    {
      key: 'competitive',
      title: 'Competitivo',
      icon: '♕',
      description: 'Competições, chaveamento e resultados.',
      permissions: [
        ['events', 'Eventos', 'Consultar e operar eventos liberados.'],
        ['bracket', 'Chaveamento e grupos', 'Acessar chaveamento e fase de grupos.'],
        ['results', 'Resultados', 'Consultar e registrar resultados permitidos.'],
        ['rankings', 'Rankings', 'Acessar os rankings competitivos.']
      ]
    },
    {
      key: 'community',
      title: 'Clubes e jogadores',
      icon: '◈',
      description: 'Diretórios, recrutamento e pontuação.',
      permissions: [
        ['teams', 'Clubes', 'Acessar páginas e dados de clubes.'],
        ['players', 'Jogadores', 'Acessar o diretório de jogadores.'],
        ['recruitment', 'Recrutamento', 'Acessar mercado e solicitações.'],
        ['scoring', 'Pontuação', 'Consultar e operar a área de pontuação.'],
        ['placar', 'Placar', 'Acessar o placar da comunidade.']
      ]
    },
    {
      key: 'communication',
      title: 'Comunicação',
      icon: '◇',
      description: 'Chats, scrims e estatísticas.',
      permissions: [
        ['chat', 'Chat geral', 'Acessar a comunicação geral.'],
        ['teamChats', 'Chat de clubes', 'Acessar canais de clubes autorizados.'],
        ['scrims', 'Scrims', 'Acessar organização de amistosos.'],
        ['stats', 'Estatísticas', 'Consultar estatísticas da liga.']
      ]
    },
    {
      key: 'staff',
      title: 'Administração',
      icon: '⚙',
      description: 'Ferramentas internas e integrações.',
      permissions: [
        ['matches', 'Partidas e análise', 'Acessar submissões e análise de partidas.'],
        ['forms', 'Formulários', 'Acessar formulários administrativos.'],
        ['backup', 'Backups', 'Acessar controles de backup autorizados.'],
        ['config', 'Configuração do BOT', 'Acessar integrações e Hub Config BOT.']
      ]
    }
  ];

  const permissionKeys = permissionGroups.flatMap((group) => group.permissions.map(([key]) => key));
  let permissions = {};
  let draft = {};
  let roles = [];
  let loading = false;
  let saving = false;
  let loadAttempts = 0;
  const openRoleIds = new Set();

  function esc(value = '') { return VoidArena.escapeHtml(value); }
  function clone(value = {}) { return JSON.parse(JSON.stringify(value || {})); }
  function normalize(value = '') { return String(value || '').trim().toLocaleLowerCase('pt-BR'); }
  function roleId(role = {}) { return String(role.id || '').trim(); }
  function roleRules(id = '') { return draft[id] && typeof draft[id] === 'object' ? draft[id] : {}; }
  function activeCount(id = '') { return permissionKeys.reduce((total, key) => total + (roleRules(id)[key] === true ? 1 : 0), 0); }

  function pendingChangeCount() {
    return roles.reduce((total, role) => {
      const id = roleId(role);
      return total + permissionKeys.reduce((count, key) => count + (Boolean(draft?.[id]?.[key]) !== Boolean(permissions?.[id]?.[key]) ? 1 : 0), 0);
    }, 0);
  }

  function preserveMissingRoles(saved = {}, nextForLoaded = {}) {
    const merged = clone(saved);
    for (const [id, rules] of Object.entries(nextForLoaded || {})) {
      merged[id] = { ...(merged[id] || {}), ...(rules || {}) };
    }
    return merged;
  }

  function setStatus(message, type = '') {
    statusEl.textContent = message;
    statusEl.className = `va-status hnl-permission-status ${type}`.trim();
  }

  function setBusy() {
    reloadBtn.disabled = loading || saving;
    saveBtn.disabled = loading || saving || pendingChangeCount() === 0;
    if (roleSearch) roleSearch.disabled = loading;
    if (roleFilter) roleFilter.disabled = loading;
  }

  function updateStats() {
    if (roleCount) roleCount.textContent = String(roles.length);
    if (ruleCount) ruleCount.textContent = String(roles.reduce((sum, role) => sum + activeCount(roleId(role)), 0));
    if (changeCount) changeCount.textContent = String(pendingChangeCount());
    setBusy();
  }

  function filteredRoles() {
    const query = normalize(roleSearch?.value);
    const filter = roleFilter?.value || 'all';
    return roles.filter((role) => {
      const count = activeCount(roleId(role));
      const matchesText = !query || normalize(`${role.name || ''} ${role.guildName || ''}`).includes(query);
      const matchesFilter = filter === 'configured' ? count > 0 : filter === 'empty' ? count === 0 : true;
      return matchesText && matchesFilter;
    });
  }

  function permissionOption(id, permission) {
    const [key, label, description] = permission;
    const checked = roleRules(id)[key] === true;
    return `<label class="hnl-permission-option ${checked ? 'active' : ''}">
      <input type="checkbox" data-role-id="${esc(id)}" data-permission="${esc(key)}" ${checked ? 'checked' : ''}>
      <span class="hnl-permission-check" aria-hidden="true">${checked ? '✓' : ''}</span>
      <span><strong>${esc(label)}</strong><small>${esc(description)}</small></span>
    </label>`;
  }

  function roleCard(role) {
    const id = roleId(role);
    const count = activeCount(id);
    const isOpen = openRoleIds.has(id);
    return `<details class="hnl-permission-role" data-role-card="${esc(id)}" ${isOpen ? 'open' : ''}>
      <summary>
        <span class="hnl-permission-role-mark" aria-hidden="true">${esc((role.name || '?').slice(0, 1).toUpperCase())}</span>
        <span class="hnl-permission-role-copy"><strong>${esc(role.name || 'Cargo sem nome')}</strong><small>${esc(role.guildName || 'Servidor Discord')}</small></span>
        <span class="hnl-permission-role-count"><b data-role-count="${esc(id)}">${count}</b><small>de ${permissionKeys.length} acessos</small></span>
        <span class="hnl-permission-chevron" aria-hidden="true">⌄</span>
      </summary>
      <div class="hnl-permission-role-body">
        <div class="hnl-permission-role-actions">
          <p>Marque somente o necessário para este cargo.</p>
          <div class="hnl-actions">
            <button class="hnl-btn ghost" type="button" data-permission-action="all" data-role-id="${esc(id)}">Liberar todos</button>
            <button class="hnl-btn ghost" type="button" data-permission-action="clear" data-role-id="${esc(id)}">Limpar</button>
          </div>
        </div>
        <div class="hnl-permission-groups">
          ${permissionGroups.map((group) => `<section class="hnl-permission-group">
            <header><span>${esc(group.icon)}</span><div><strong>${esc(group.title)}</strong><small>${esc(group.description)}</small></div></header>
            <div>${group.permissions.map((permission) => permissionOption(id, permission)).join('')}</div>
          </section>`).join('')}
        </div>
      </div>
    </details>`;
  }

  function rememberOpenCards() {
    permissionRows.querySelectorAll('[data-role-card]').forEach((card) => {
      const id = String(card.dataset.roleCard || '');
      if (card.open) openRoleIds.add(id); else openRoleIds.delete(id);
    });
  }

  function render() {
    rememberOpenCards();
    const visible = filteredRoles();
    if (!roles.length) {
      permissionRows.innerHTML = `<div class="hnl-permission-empty"><strong>Nenhum cargo carregado</strong><p>O BOT ainda não retornou os cargos do Discord. Verifique se ele está online e clique em Recarregar cargos.</p></div>`;
      updateStats();
      return;
    }
    if (!visible.length) {
      permissionRows.innerHTML = `<div class="hnl-permission-empty"><strong>Nenhum cargo encontrado</strong><p>Ajuste a busca ou o filtro para visualizar outros cargos.</p></div>`;
      updateStats();
      return;
    }
    permissionRows.innerHTML = visible.map(roleCard).join('');
    updateStats();
  }

  function timeout(ms) {
    return new Promise((_, reject) => setTimeout(() => reject(new Error('O BOT demorou para responder.')), ms));
  }

  async function requestPermissions() {
    return Promise.race([
      VoidArena.request('/api/owner/role-permissions', { timeoutMs: 10000 }),
      timeout(12000)
    ]);
  }

  async function load({ retry = true } = {}) {
    if (loading || saving) return;
    loading = true;
    loadAttempts += 1;
    setBusy();
    setStatus(loadAttempts > 1 ? `Sincronizando com o BOT — tentativa ${loadAttempts}...` : 'Sincronizando cargos e permissões com o BOT...');
    try {
      const data = await requestPermissions();
      permissions = clone(data.permissions || {});
      draft = clone(permissions);
      roles = (Array.isArray(data.roles) ? data.roles : []).filter((role) => roleId(role));
      openRoleIds.clear();
      if (roles[0]) openRoleIds.add(roleId(roles[0]));
      render();
      const suffix = roles.length ? `${roles.length} cargo(s) sincronizado(s).` : 'Nenhum cargo retornado pelo Discord.';
      setStatus(data.message ? `${suffix} ${data.message}` : `${suffix} Alterações só serão aplicadas depois de salvar.`, roles.length ? 'ok' : 'err');
    } catch (error) {
      if (retry && loadAttempts < 3) {
        loading = false;
        setBusy();
        setStatus(`${error.message} Nova tentativa em 2 segundos...`, 'err');
        setTimeout(() => load({ retry: true }), 2000);
        return;
      }
      setStatus(`Não foi possível carregar: ${error.message}`, 'err');
    } finally {
      loading = false;
      setBusy();
    }
  }

  function setRolePermissions(id, checked) {
    if (!id) return;
    draft[id] = { ...(draft[id] || {}) };
    permissionKeys.forEach((key) => { draft[id][key] = checked; });
    openRoleIds.add(id);
    render();
  }

  async function save() {
    if (saving || loading || pendingChangeCount() === 0) return;
    const changes = pendingChangeCount();
    if (!window.confirm(`Salvar ${changes} alteração(ões) de acesso no BOT?`)) return;
    saving = true;
    setBusy();
    setStatus('Salvando e aguardando a confirmação do BOT...');
    const nextForLoaded = {};
    roles.forEach((role) => {
      const id = roleId(role);
      nextForLoaded[id] = clone(draft[id] || {});
    });
    const payload = preserveMissingRoles(permissions, nextForLoaded);
    try {
      const data = await VoidArena.request('/api/owner/role-permissions', {
        method: 'PUT',
        body: JSON.stringify({ permissions: payload }),
        timeoutMs: 12000
      });
      permissions = clone(data.permissions && Object.keys(data.permissions).length ? data.permissions : payload);
      draft = clone(permissions);
      render();
      setStatus(data.message || 'Permissões salvas e confirmadas pelo BOT.', 'ok');
    } catch (error) {
      setStatus(`As alterações não foram confirmadas: ${error.message}`, 'err');
    } finally {
      saving = false;
      setBusy();
    }
  }

  permissionRows.addEventListener('toggle', (event) => {
    const card = event.target.closest?.('[data-role-card]');
    if (!card) return;
    if (card.open) openRoleIds.add(card.dataset.roleCard); else openRoleIds.delete(card.dataset.roleCard);
  }, true);

  permissionRows.addEventListener('change', (event) => {
    const input = event.target.closest?.('input[data-role-id][data-permission]');
    if (!input) return;
    const id = String(input.dataset.roleId || '');
    const key = String(input.dataset.permission || '');
    draft[id] = { ...(draft[id] || {}), [key]: input.checked };
    input.closest('.hnl-permission-option')?.classList.toggle('active', input.checked);
    const check = input.closest('.hnl-permission-option')?.querySelector('.hnl-permission-check');
    if (check) check.textContent = input.checked ? '✓' : '';
    const counter = permissionRows.querySelector(`[data-role-count="${CSS.escape(id)}"]`);
    if (counter) counter.textContent = String(activeCount(id));
    updateStats();
  });

  permissionRows.addEventListener('click', (event) => {
    const button = event.target.closest?.('[data-permission-action]');
    if (!button) return;
    event.preventDefault();
    setRolePermissions(String(button.dataset.roleId || ''), button.dataset.permissionAction === 'all');
  });

  roleSearch?.addEventListener('input', render);
  roleFilter?.addEventListener('change', render);
  expandRolesBtn?.addEventListener('click', () => {
    filteredRoles().forEach((role) => openRoleIds.add(roleId(role)));
    render();
  });
  collapseRolesBtn?.addEventListener('click', () => {
    openRoleIds.clear();
    render();
  });
  saveBtn.addEventListener('click', () => save());
  reloadBtn.addEventListener('click', () => {
    if (pendingChangeCount() && !window.confirm('Descartar alterações não salvas e recarregar do BOT?')) return;
    loadAttempts = 0;
    load({ retry: true });
  });

  Promise.race([
    VoidArena.bootLayout('permissoes'),
    new Promise((resolve) => setTimeout(resolve, 2500))
  ]).then(() => load({ retry: true })).catch((error) => setStatus(`Não foi possível iniciar a tela: ${error.message}`, 'err'));
}());
