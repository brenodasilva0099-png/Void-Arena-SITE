(function () {
  function esc(value) { return window.VoidArena?.escapeHtml?.(value || '') || String(value || ''); }
  function teamName(team) { return team?.name || team?.tag || 'Time'; }
  function renderGroups(groups = [], teams = []) {
    const box = document.getElementById('generatedGroupsBox');
    if (!box) return;
    if (!Array.isArray(groups) || !groups.length) {
      box.innerHTML = '';
      box.hidden = true;
      return;
    }
    const byId = new Map((teams || []).map((team) => [String(team.id || ''), team]));
    box.hidden = false;
    box.innerHTML = `<article class="va-card full va-generated-groups"><div class="va-section-head"><div><p class="va-eyebrow">Fase de grupos</p><h2>Grupos sorteados</h2><p class="va-muted">Times organizados automaticamente a partir da estrutura selecionada.</p></div></div><div class="va-groups-grid">${groups.map((group) => `<section class="va-group-card"><h3>${esc(group.name || 'Grupo')}</h3>${(group.teams || group.teamIds || []).map((item, index) => { const team = typeof item === 'string' ? byId.get(item) : item; return `<div class="va-group-team"><span>${index + 1}</span><strong>${esc(teamName(team))}</strong><small>${esc(team?.tag || '')}</small></div>`; }).join('') || '<p class="va-muted">Grupo vazio.</p>'}</section>`).join('')}</div></article>`;
  }

  window.VoidArenaGroups = { renderGroups };

  if (window.VoidArena?.request) {
    const original = window.VoidArena.request;
    window.VoidArena.request = async function patchedRequest(path, options = {}) {
      const data = await original(path, options);
      if (String(path).includes('/api/bracket/generate-v2')) {
        renderGroups(data.groups || [], data.teams || []);
      }
      return data;
    };
  }
}());
