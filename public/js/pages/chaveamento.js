(function () {
  const grid = document.getElementById('bracketGrid');
  const statusEl = document.getElementById('bracketStatus');
  const rounds = [
    ['slots', 'Oitavas', 16], ['quarters', 'Quartas', 8], ['semis', 'Semifinal', 4], ['finals', 'Final', 2]
  ];
  function teamName(team) { return team?.name || team?.tag || 'Aguardando'; }
  function render(bracket = {}) {
    grid.innerHTML = rounds.map(([key, label, size]) => {
      const items = Array.isArray(bracket[key]) ? bracket[key] : [];
      const matches = [];
      for (let i = 0; i < size; i += 2) {
        const a = items[i] || null;
        const b = items[i + 1] || null;
        matches.push(`<div class="va-match"><div class="va-team ${a ? '' : 'va-empty'}">${VoidArena.escapeHtml(teamName(a))}</div><div class="va-team ${b ? '' : 'va-empty'}">${VoidArena.escapeHtml(teamName(b))}</div></div>`);
      }
      return `<section class="va-round"><h3>${label}</h3>${matches.join('')}</section>`;
    }).join('');
  }
  async function load() {
    statusEl.textContent = 'Carregando chaveamento...';
    const data = await VoidArena.request('/api/dashboard/snapshot');
    render(data.bracket || {});
    statusEl.textContent = 'Chaveamento carregado.';
    statusEl.className = 'va-status ok';
  }
  async function generate() {
    statusEl.textContent = 'Gerando chaveamento...';
    try {
      const data = await VoidArena.request('/api/bracket/generate', { method: 'POST', body: '{}' });
      render(data.bracket || {});
      const hubs = data.resultHubs;
      statusEl.textContent = hubs?.success === false ? `Chaveamento gerado, mas HUBs não sincronizaram: ${hubs.message}` : 'Chaveamento gerado e HUBs sincronizadas.';
      statusEl.className = hubs?.success === false ? 'va-status err' : 'va-status ok';
    } catch (error) {
      statusEl.textContent = `❌ ${error.message}`;
      statusEl.className = 'va-status err';
    }
  }
  document.getElementById('reloadBracketBtn').addEventListener('click', load);
  document.getElementById('generateBracketBtn').addEventListener('click', generate);
  VoidArena.bootLayout('chaveamento').then(load).catch((error) => { statusEl.textContent = `❌ ${error.message}`; });
}());
