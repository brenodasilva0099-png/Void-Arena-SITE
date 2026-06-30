const permissionRows = document.getElementById('permissionRows');
const saveBtn = document.getElementById('saveBtn');
const reloadBtn = document.getElementById('reloadBtn');
const statusEl = document.getElementById('status');

const keys = [
  ['forms', 'Formulários'],
  ['events', 'Eventos'],
  ['matches', 'Análise'],
  ['stats', 'Estatísticas'],
  ['bracket', 'Chaveamento'],
  ['teams', 'Times'],
  ['backup', 'Backup'],
  ['config', 'Config']
];
let permissions = {};
let roles = [];
function esc(value = '') { return VoidArena.escapeHtml(value); }
function render() {
  if (!roles.length) {
    permissionRows.innerHTML = `
      <div class="va-item">
        <strong>Nenhum cargo carregado</strong>
        <p class="va-muted">O BOT não retornou cargos ainda. Confira se o BOT está Live no Render, no servidor certo e com permissão de ver cargos. Você também pode configurar pelo botão Permissões do .painel-controle.</p>
      </div>`;
    return;
  }
  permissionRows.innerHTML = roles.map((role) => `
    <div class="va-permission-role" data-role-id="${esc(role.id)}">
      <div class="va-permission-role-head">
        <strong>${esc(role.name)}</strong>
        <span class="va-badge">${esc(role.guildName || 'Discord')}</span>
      </div>
      <div class="va-permission-checks">
        ${keys.map(([key, label]) => `<label><input type="checkbox" data-role-id="${esc(role.id)}" data-permission="${esc(key)}" ${permissions?.[role.id]?.[key] ? 'checked' : ''}>${esc(label)}</label>`).join('')}
      </div>
    </div>`).join('');
}
async function load() {
  statusEl.textContent = 'Carregando permissões...';
  statusEl.className = 'va-status';
  try {
    const data = await VoidArena.request('/api/owner/role-permissions');
    permissions = data.permissions || {};
    roles = Array.isArray(data.roles) ? data.roles : [];
    render();
    const suffix = roles.length ? `${roles.length} cargo(s) carregado(s).` : 'Nenhum cargo retornado pelo BOT.';
    statusEl.textContent = data.message ? `${suffix} ${data.message}` : suffix;
    statusEl.className = roles.length ? 'va-status ok' : 'va-status err';
  } catch (error) {
    statusEl.textContent = `❌ ${error.message}`;
    statusEl.className = 'va-status err';
  }
}
async function save() {
  const next = {};
  document.querySelectorAll('input[data-role-id][data-permission]').forEach((input) => {
    const roleId = input.dataset.roleId;
    const key = input.dataset.permission;
    next[roleId] = next[roleId] || {};
    next[roleId][key] = input.checked;
  });
  statusEl.textContent = 'Salvando permissões...';
  statusEl.className = 'va-status';
  try {
    const data = await VoidArena.request('/api/owner/role-permissions', { method: 'PUT', body: JSON.stringify({ permissions: next }) });
    permissions = data.permissions || next;
    statusEl.textContent = 'Permissões salvas.';
    statusEl.className = 'va-status ok';
  } catch (error) {
    statusEl.textContent = `❌ ${error.message}`;
    statusEl.className = 'va-status err';
  }
}
saveBtn.addEventListener('click', save);
reloadBtn.addEventListener('click', load);
VoidArena.bootLayout('permissoes').then(load).catch((error) => { statusEl.textContent = `❌ ${error.message}`; statusEl.className = 'va-status err'; });
