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

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[char]));
}

function render() {
  if (!roles.length) {
    permissionRows.innerHTML = `
      <div class="role-row">
        <div class="role-name">Nenhum cargo carregado</div>
        <div>Confira se o bot está online e com permissão de ver cargos.</div>
      </div>
    `;
    return;
  }

  permissionRows.innerHTML = roles.map((role) => `
    <div class="role-row" data-role-id="${escapeHtml(role.id)}">
      <div class="role-name">
        <span>${escapeHtml(role.name)}</span>
      </div>
      ${keys.map(([key, label]) => `
        <label data-label="${escapeHtml(label)}">
          <input type="checkbox" data-role-id="${escapeHtml(role.id)}" data-permission="${escapeHtml(key)}" ${permissions?.[role.id]?.[key] ? 'checked' : ''}>
        </label>
      `).join('')}
    </div>
  `).join('');
}

async function load() {
  statusEl.textContent = 'Carregando permissões...';
  statusEl.className = 'status';

  try {
    const response = await fetch('/api/owner/role-permissions');
    const data = await response.json().catch(() => ({}));

    if (response.status === 401) {
      location.href = '/';
      return;
    }

    if (!response.ok || data.success === false) {
      throw new Error(data.message || 'Não foi possível carregar permissões.');
    }

    permissions = data.permissions || {};
    roles = Array.isArray(data.roles) ? data.roles : [];

    render();

    statusEl.textContent = 'Permissões carregadas.';
    statusEl.className = 'status ok';
  } catch (error) {
    statusEl.textContent = `❌ ${error.message}`;
    statusEl.className = 'status err';
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
  statusEl.className = 'status';

  try {
    const response = await fetch('/api/owner/role-permissions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ permissions: next })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.success === false) {
      throw new Error(data.message || 'Não foi possível salvar permissões.');
    }

    permissions = data.permissions || next;
    statusEl.textContent = '✅ Permissões salvas.';
    statusEl.className = 'status ok';
  } catch (error) {
    statusEl.textContent = `❌ ${error.message}`;
    statusEl.className = 'status err';
  }
}

saveBtn.addEventListener('click', save);
reloadBtn.addEventListener('click', load);

load();
