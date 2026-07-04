const permissionRows = document.getElementById('permissionRows');
const saveBtn = document.getElementById('saveBtn');
const reloadBtn = document.getElementById('reloadBtn');
const statusEl = document.getElementById('status');

const keys = [
  ['events', 'Eventos'],
  ['teams', 'Times'],
  ['bracket', 'Chaveamento'],
  ['results', 'Resultados'],
  ['rankings', 'Rankings'],
  ['scoring', 'Pontuação'],
  ['chat', 'Chat Geral'],
  ['teamChats', 'Chat de Times'],
  ['scrims', 'Scrims'],
  ['stats', 'Estatísticas'],
  ['matches', 'Análise'],
  ['forms', 'Formulários'],
  ['backup', 'Backup'],
  ['config', 'Hub Config BOT']
];

let permissions = {};
let roles = [];

function esc(value = '') { return VoidArena.escapeHtml(value); }

function render() {
  if (!roles.length) {
    permissionRows.innerHTML = `
      <div class="va-item">
        <strong>Nenhum cargo carregado</strong>
        <p class="va-muted">O BOT não retornou cargos ainda. Confira se o BOT está Live no Render, no servidor certo e com permissão de ver cargos. Você também pode configurar pelo botão Permissões da hub de configuração do bot.</p>
      </div>`;
    return;
  }

  permissionRows.innerHTML = `
    <div class="va-item">
      <strong>Sincronizado com a Hub Config BOT</strong>
      <p class="va-muted">Essa tela lê e salva as mesmas definições do BOT. Se você alterar na hub/config do bot, clique em Recarregar cargos para atualizar aqui; se alterar aqui, o BOT recebe a nova definição.</p>
    </div>
    ${roles.map((role) => `
      <div class="va-permission-role" data-role-id="${esc(role.id)}">
        <div class="va-permission-role-head">
          <strong>${esc(role.name)}</strong>
          <span class="va-badge">${esc(role.guildName || 'Discord')}</span>
        </div>
        <div class="va-permission-checks">
          ${keys.map(([key, label]) => `<label><input type="checkbox" data-role-id="${esc(role.id)}" data-permission="${esc(key)}" ${permissions?.[role.id]?.[key] ? 'checked' : ''}>${esc(label)}</label>`).join('')}
        </div>
      </div>`).join('')}`;
}

async function load() {
  statusEl.textContent = 'Carregando permissões direto do BOT...';
  statusEl.className = 'va-status';
  try {
    const data = await VoidArena.request('/api/owner/role-permissions');
    permissions = data.permissions || {};
    roles = Array.isArray(data.roles) ? data.roles : [];
    render();
    const suffix = roles.length ? `${roles.length} cargo(s) carregado(s).` : 'Nenhum cargo retornado pelo BOT.';
    statusEl.textContent = data.message ? `${suffix} ${data.message}` : `${suffix} Definições conectadas ao storage do BOT.`;
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
  statusEl.textContent = 'Salvando permissões na Hub/Storage do BOT...';
  statusEl.className = 'va-status';
  try {
    const data = await VoidArena.request('/api/owner/role-permissions', { method: 'PUT', body: JSON.stringify({ permissions: next }) });
    permissions = data.permissions || next;
    statusEl.textContent = 'Permissões salvas e sincronizadas com o BOT.';
    statusEl.className = 'va-status ok';
  } catch (error) {
    statusEl.textContent = `❌ ${error.message}`;
    statusEl.className = 'va-status err';
  }
}

saveBtn.addEventListener('click', save);
reloadBtn.addEventListener('click', load);
VoidArena.bootLayout('permissoes').then(load).catch((error) => { statusEl.textContent = `❌ ${error.message}`; statusEl.className = 'va-status err'; });
