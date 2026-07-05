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
  ['players', 'Jogadores'],
  ['recruitment', 'Recrutamento'],
  ['scoring', 'Pontuação'],
  ['placar', 'Placar'],
  ['chat', 'Chat Geral'],
  ['teamChats', 'Chat de Times'],
  ['scrims', 'Scrims'],
  ['stats', 'Estatísticas'],
  ['matches', 'Partidas / Análise'],
  ['forms', 'Formulários'],
  ['backup', 'Backup'],
  ['config', 'Hub Config BOT']
];

let permissions = {};
let roles = [];
let loading = false;
let loadAttempts = 0;

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
      <p class="va-muted">Essa tela lê e salva as mesmas definições do BOT. Formulários e Partidas/Análise exigem cargo configurado aqui, igual o controle de capitães.</p>
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

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('Tempo limite atingido. Tentando novamente...')), ms));
}

async function requestPermissions() {
  return Promise.race([
    VoidArena.request('/api/owner/role-permissions', { timeoutMs: 10000 }),
    timeout(12000)
  ]);
}

async function load({ retry = true } = {}) {
  if (loading) return;
  loading = true;
  loadAttempts += 1;
  statusEl.textContent = loadAttempts > 1 ? `Carregando permissões direto do BOT... tentativa ${loadAttempts}` : 'Carregando permissões direto do BOT...';
  statusEl.className = 'va-status';
  try {
    const data = await requestPermissions();
    permissions = data.permissions || {};
    roles = Array.isArray(data.roles) ? data.roles : [];
    render();
    const suffix = roles.length ? `${roles.length} cargo(s) carregado(s).` : 'Nenhum cargo retornado pelo BOT.';
    statusEl.textContent = data.message ? `${suffix} ${data.message}` : `${suffix} Definições conectadas ao storage do BOT.`;
    statusEl.className = roles.length ? 'va-status ok' : 'va-status err';
  } catch (error) {
    if (retry && loadAttempts < 3) {
      loading = false;
      statusEl.textContent = `${error.message} Recarregando em 2 segundos...`;
      setTimeout(() => load({ retry: true }), 2000);
      return;
    }
    statusEl.textContent = `❌ ${error.message}`;
    statusEl.className = 'va-status err';
  } finally {
    loading = false;
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
    const data = await VoidArena.request('/api/owner/role-permissions', { method: 'PUT', body: JSON.stringify({ permissions: next }), timeoutMs: 10000 });
    permissions = data.permissions || next;
    statusEl.textContent = 'Permissões salvas e sincronizadas com o BOT.';
    statusEl.className = 'va-status ok';
  } catch (error) {
    statusEl.textContent = `❌ ${error.message}`;
    statusEl.className = 'va-status err';
  }
}

saveBtn.addEventListener('click', save);
reloadBtn.addEventListener('click', () => { loadAttempts = 0; load({ retry: true }); });
Promise.race([
  VoidArena.bootLayout('permissoes'),
  new Promise((resolve) => setTimeout(resolve, 2500))
]).then(() => load({ retry: true })).catch((error) => { statusEl.textContent = `❌ ${error.message}`; statusEl.className = 'va-status err'; });
