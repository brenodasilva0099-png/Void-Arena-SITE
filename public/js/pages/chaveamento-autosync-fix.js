(function () {
  const button = document.getElementById('generateBracketBtn');
  const statusEl = document.getElementById('bracketStatus');

  function esc(value) { return window.VoidArena?.escapeHtml?.(value || '') || String(value || ''); }
  function setStatus(message, type = '') {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.className = `va-status ${type}`.trim();
  }

  function ensureGroupsBox() {
    let box = document.getElementById('generatedGroupsBox');
    if (!box) {
      box = document.createElement('article');
      box.id = 'generatedGroupsBox';
      box.className = 'va-card full va-generated-groups';
      box.hidden = true;
      document.querySelector('.va-bracket-card')?.insertAdjacentElement('afterend', box);
    }
    return box;
  }

  function renderGroups(groups = []) {
    const box = ensureGroupsBox();
    if (!Array.isArray(groups) || !groups.length) {
      box.hidden = true;
      box.innerHTML = '';
      return;
    }
    box.hidden = false;
    box.innerHTML = `<div class="va-section-head"><div><p class="va-eyebrow">Fase de grupos</p><h2>Grupos sorteados</h2><p class="va-muted">Times organizados automaticamente conforme a estrutura selecionada.</p></div></div><div class="va-groups-grid">${groups.map((group) => `<section class="va-group-card"><h3>${esc(group.name || 'Grupo')}</h3>${(group.teams || group.teamIds || []).map((team, index) => `<div class="va-group-team"><span>${index + 1}</span><strong>${esc(team.name || team.tag || team)}</strong><small>${esc(team.tag || '')}</small></div>`).join('') || '<p class="va-muted">Grupo vazio.</p>'}</section>`).join('')}</div>`;
  }

  if (window.VoidArena?.request && !window.VoidArena.__groupsPatch) {
    const original = window.VoidArena.request;
    window.VoidArena.request = async function patchedRequest(path, options = {}) {
      const data = await original(path, options);
      if (String(path).includes('/api/bracket/generate-v2')) renderGroups(data.groups || []);
      return data;
    };
    window.VoidArena.__groupsPatch = true;
  }

  async function syncAfterGenerate() {
    await new Promise((resolve) => setTimeout(resolve, 4200));
    try {
      const data = await VoidArena.request('/api/result-hubs/sync', { method: 'POST', body: '{}' });
      const result = data.resultHubs || {};
      const detail = `${result.created || 0} criadas • ${result.reused || 0} atualizadas • ${result.totalMatches || 0} confrontos${result.errors?.length ? ` • ${result.errors.length} erro(s)` : ''}`;
      if (result.success === false || result.errors?.length) {
        setStatus(`Chaveamento salvo, mas revise as HUBs: ${result.message || detail}`, 'err');
      } else {
        setStatus(`Chaveamento salvo. HUBs sincronizadas: ${detail}.`, 'ok');
      }
    } catch (error) {
      setStatus(`Chaveamento salvo, mas a sincronização extra das HUBs falhou: ${error.message}`, 'err');
    }
  }

  button?.addEventListener('click', syncAfterGenerate);
}());
