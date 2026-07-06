(function () {
  const DEFAULT_CATEGORY = '1523133579570184194';
  const statusEl = document.getElementById('bracketStatus');
  const categoryField = document.querySelector('[name="discordMatchCategoryId"]');
  if (categoryField && !String(categoryField.value || '').trim()) categoryField.value = DEFAULT_CATEGORY;

  let teams = [];
  let groups = [];

  function esc(value) { return window.VoidArena?.escapeHtml?.(value || '') || String(value || ''); }
  function setStatus(message, type = '') { if (!statusEl) return; statusEl.textContent = message; statusEl.className = `va-status ${type}`.trim(); }
  function teamId(team) { return typeof team === 'string' ? team : String(team?.id || ''); }
  function findTeam(id) { return teams.find((team) => teamId(team) === String(id || '')) || null; }
  function initials(team, fallback) { return esc(String(team?.tag || team?.name || fallback || '?').slice(0, 2).toUpperCase()); }
  function logo(team, fallback) { return team?.logo ? `<img src="${esc(team.logo)}" alt="" />` : `<span>${initials(team, fallback)}</span>`; }
  function installCss() {
    if (document.getElementById('groupPersistCss')) return;
    const style = document.createElement('style');
    style.id = 'groupPersistCss';
    style.textContent = `.va-generated-groups{margin-top:16px}.va-groups-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}.va-group-card{border:1px solid rgba(139,92,246,.28);border-radius:18px;padding:14px;background:rgba(255,255,255,.04)}.va-group-card h3{margin:0 0 10px;color:#67e8f9;display:flex;justify-content:space-between}.va-group-team{display:grid;grid-template-columns:38px 1fr auto;gap:10px;align-items:center;padding:9px 10px;border-radius:12px;background:rgba(2,6,23,.45);margin-top:8px}.va-group-logo{width:34px;height:34px;border-radius:12px;display:grid;place-items:center;background:rgba(139,92,246,.25);border:1px solid rgba(34,211,238,.25);overflow:hidden}.va-group-logo img{width:100%;height:100%;object-fit:cover}.va-group-logo span{font-size:11px;font-weight:1000}.va-group-team strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.va-group-team small{color:#a5f3fc;font-weight:900}.va-groups-editor{margin-top:14px;padding:14px;border:1px solid rgba(103,232,249,.25);border-radius:16px;background:rgba(2,6,23,.45)}.va-groups-editor-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}.va-groups-editor label{display:grid;gap:6px;font-size:12px;font-weight:800}.va-groups-editor select{background:#080b1c;color:#fff;border:1px solid rgba(139,92,246,.35);border-radius:10px;padding:9px}`;
    document.head.appendChild(style);
  }
  function box() {
    installCss();
    let el = document.getElementById('generatedGroupsBox');
    if (!el) {
      el = document.createElement('article');
      el.id = 'generatedGroupsBox';
      el.className = 'va-card full va-generated-groups';
      document.querySelector('.va-bracket-card')?.insertAdjacentElement('afterend', el);
    }
    return el;
  }
  function normalize(list) {
    return (Array.isArray(list) ? list : []).map((group, index) => ({
      name: group.name || `Grupo ${String.fromCharCode(65 + index)}`,
      teams: (group.teams || group.teamIds || []).map((team) => typeof team === 'string' ? (findTeam(team) || team) : team).filter(Boolean)
    }));
  }
  function render(list) {
    groups = normalize(list);
    const el = box();
    if (!groups.length) { el.hidden = true; el.innerHTML = ''; return; }
    el.hidden = false;
    el.innerHTML = `<div class="va-section-head"><div><p class="va-eyebrow">Fase de grupos</p><h2>Grupos sorteados</h2><p class="va-muted">Grupos + Playoffs: fase de pontos e depois mata-mata.</p></div><button id="editGroupsBtn" class="va-btn" type="button">⚙️ Editar grupos</button></div><div class="va-groups-grid">${groups.map((group) => `<section class="va-group-card"><h3>${esc(group.name)}<span>⚙️</span></h3>${group.teams.map((team, index) => `<div class="va-group-team"><div class="va-group-logo">${logo(team, index + 1)}</div><strong>${esc(team.name || team.tag || team)}</strong><small>${esc(team.tag || '')}</small></div>`).join('')}</section>`).join('')}</div><div id="groupsEditor" class="va-groups-editor" hidden></div>`;
    document.getElementById('editGroupsBtn')?.addEventListener('click', openEditor);
  }
  function option(team, selected) { if (!team) return `<option value=""${!selected ? ' selected' : ''}>Vazio</option>`; const id = teamId(team); return `<option value="${esc(id)}"${id === selected ? ' selected' : ''}>${esc(team.name || team.tag || 'Time')}${team.tag ? ` • ${esc(team.tag)}` : ''}</option>`; }
  function openEditor() {
    const editor = document.getElementById('groupsEditor');
    if (!editor) return;
    const max = Math.max(...groups.map((g) => g.teams.length), 1);
    const opts = (selected) => [option(null, selected), ...teams.map((team) => option(team, selected))].join('');
    editor.hidden = false;
    editor.innerHTML = `<p class="va-muted">Ajuste os times de grupo para equilibrar times grandes e pequenos.</p><div class="va-groups-editor-grid">${groups.map((group, gi) => Array.from({ length: max }, (_, si) => `<label>${esc(group.name)} • posição ${si + 1}<select data-gi="${gi}" data-si="${si}">${opts(teamId(group.teams[si]))}</select></label>`).join('')).join('')}</div><div class="va-actions" style="margin-top:12px"><button id="saveGroupsBtn" class="va-btn primary" type="button">Salvar grupos</button><button id="cancelGroupsBtn" class="va-btn" type="button">Cancelar</button></div>`;
    document.getElementById('cancelGroupsBtn')?.addEventListener('click', () => { editor.hidden = true; });
    document.getElementById('saveGroupsBtn')?.addEventListener('click', saveEditor);
  }
  async function saveEditor() {
    const next = groups.map((g) => ({ name: g.name, teams: [] }));
    document.querySelectorAll('[data-gi][data-si]').forEach((select) => {
      const group = next[Number(select.dataset.gi || 0)];
      const team = findTeam(select.value);
      if (group && team) group.teams[Number(select.dataset.si || 0)] = team;
    });
    next.forEach((group) => { group.teams = group.teams.filter(Boolean); });
    const snap = await VoidArena.request('/api/dashboard/snapshot');
    const payload = { ...(snap.bracket || {}), groups: next.map((group) => ({ name: group.name, teams: group.teams.map(teamId) })) };
    const saved = await VoidArena.request('/api/bracket', { method: 'PUT', body: JSON.stringify(payload) });
    render(saved.bracket?.groups || next);
    setStatus('Grupos salvos. Clique em Sincronizar HUBs para garantir HUBs/calls pelo BOT.', 'ok');
  }
  function fromData(data) {
    if (Array.isArray(data?.teams)) teams = data.teams;
    const incoming = data?.bracket?.groups || data?.groups || [];
    if (incoming.length) render(incoming);
  }
  if (window.VoidArena?.request && !window.VoidArena.__groupsPersistPatch) {
    const original = window.VoidArena.request;
    window.VoidArena.request = async function patched(path, options = {}) {
      const data = await original(path, options);
      const url = String(path || '');
      if (url.includes('/api/dashboard/snapshot') || url.includes('/api/bracket/generate') || (url.includes('/api/bracket') && options?.method === 'PUT')) fromData(data);
      return data;
    };
    window.VoidArena.__groupsPersistPatch = true;
  }
  document.getElementById('reloadBracketBtn')?.addEventListener('click', () => setTimeout(() => VoidArena.request('/api/dashboard/snapshot').then(fromData).catch(() => null), 700));
}());
