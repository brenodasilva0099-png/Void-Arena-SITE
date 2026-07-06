(function () {
  const DEFAULT_CATEGORY = '1523133579570184194';
  const statusEl = document.getElementById('bracketStatus');
  const categoryField = document.querySelector('[name="discordMatchCategoryId"]');
  if (categoryField && !String(categoryField.value || '').trim()) categoryField.value = DEFAULT_CATEGORY;

  let teams = [];
  let groups = [];
  let visibility = readVisibility();

  function readVisibility() {
    try { return { showGroups: true, showPositions: true, ...(JSON.parse(localStorage.getItem('voidArenaGroupVisibility') || '{}')) }; }
    catch { return { showGroups: true, showPositions: true }; }
  }
  function saveVisibility() { localStorage.setItem('voidArenaGroupVisibility', JSON.stringify(visibility)); }
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
    style.textContent = `.va-generated-groups{margin-top:16px}.va-groups-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}.va-group-card{border:1px solid rgba(139,92,246,.28);border-radius:18px;padding:14px;background:rgba(255,255,255,.04)}.va-group-card h3{margin:0 0 10px;color:#67e8f9;display:flex;justify-content:space-between}.va-group-team{display:grid;grid-template-columns:38px 1fr auto;gap:10px;align-items:center;padding:9px 10px;border-radius:12px;background:rgba(2,6,23,.45);margin-top:8px}.va-group-pos{font-size:11px;color:#94a3b8;font-weight:900}.va-group-logo{width:34px;height:34px;border-radius:12px;display:grid;place-items:center;background:rgba(139,92,246,.25);border:1px solid rgba(34,211,238,.25);overflow:hidden}.va-group-logo img{width:100%;height:100%;object-fit:cover}.va-group-logo span{font-size:11px;font-weight:1000}.va-group-team strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.va-group-team small{color:#a5f3fc;font-weight:900}.va-groups-editor,.va-manual-call-box{margin-top:14px;padding:14px;border:1px solid rgba(103,232,249,.25);border-radius:16px;background:rgba(2,6,23,.45)}.va-groups-editor-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}.va-groups-editor label,.va-manual-call-box label{display:grid;gap:6px;font-size:12px;font-weight:800}.va-groups-editor select,.va-manual-call-box select,.va-manual-call-box input{background:#080b1c;color:#fff;border:1px solid rgba(139,92,246,.35);border-radius:10px;padding:9px}.va-group-controls{display:flex;gap:8px;flex-wrap:wrap;align-items:center;justify-content:flex-end}.va-group-controls .va-btn{white-space:nowrap}`;
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
  function flatGroupTeams() { return groups.flatMap((group) => (group.teams || []).map((team) => ({ ...team, groupName: group.name }))).filter((team) => teamId(team)); }
  function render(list) {
    groups = normalize(list);
    const el = box();
    if (!groups.length) { el.hidden = true; el.innerHTML = ''; return; }
    el.hidden = !visibility.showGroups;
    el.innerHTML = `<div class="va-section-head"><div><p class="va-eyebrow">Fase de grupos</p><h2>Grupos sorteados</h2><p class="va-muted">Grupos + Playoffs: fase de pontos e depois mata-mata. Os grupos ficam salvos, então não precisa gerar automático toda vez.</p></div><div class="va-group-controls"><button id="toggleGroupsBtn" class="va-btn" type="button">${visibility.showGroups ? '👁️ Ocultar grupos' : '👁️ Mostrar grupos'}</button><button id="togglePositionsBtn" class="va-btn" type="button">${visibility.showPositions ? '🔢 Ocultar posições' : '🔢 Mostrar posições'}</button><button id="manualCallBtn" class="va-btn" type="button">🎧 Criar call manual</button><button id="editGroupsBtn" class="va-btn primary" type="button">⚙️ Editar grupos</button></div></div><div class="va-groups-grid">${groups.map((group) => `<section class="va-group-card"><h3>${esc(group.name)}<span>⚙️</span></h3>${group.teams.map((team, index) => `<div class="va-group-team"><div class="va-group-logo">${logo(team, index + 1)}</div><strong>${visibility.showPositions ? `<span class="va-group-pos">${index + 1}º</span> ` : ''}${esc(team.name || team.tag || team)}</strong><small>${esc(team.tag || '')}</small></div>`).join('')}</section>`).join('')}</div><div id="groupsEditor" class="va-groups-editor" hidden></div><div id="manualCallBox" class="va-manual-call-box" hidden></div>`;
    document.getElementById('editGroupsBtn')?.addEventListener('click', openEditor);
    document.getElementById('manualCallBtn')?.addEventListener('click', openManualCall);
    document.getElementById('toggleGroupsBtn')?.addEventListener('click', () => { visibility.showGroups = !visibility.showGroups; saveVisibility(); render(groups); });
    document.getElementById('togglePositionsBtn')?.addEventListener('click', () => { visibility.showPositions = !visibility.showPositions; saveVisibility(); render(groups); });
    if (!visibility.showGroups) { el.hidden = false; el.querySelector('.va-groups-grid')?.setAttribute('hidden', ''); }
  }
  function option(team, selected) { if (!team) return `<option value=""${!selected ? ' selected' : ''}>Vazio</option>`; const id = teamId(team); return `<option value="${esc(id)}"${id === selected ? ' selected' : ''}>${esc(team.name || team.tag || 'Time')}${team.tag ? ` • ${esc(team.tag)}` : ''}</option>`; }
  function openEditor() {
    const editor = document.getElementById('groupsEditor');
    if (!editor) return;
    const max = Math.max(...groups.map((g) => g.teams.length), 1);
    const opts = (selected) => [option(null, selected), ...teams.map((team) => option(team, selected))].join('');
    editor.hidden = false;
    editor.innerHTML = `<p class="va-muted">Ajuste os times de grupo para equilibrar times grandes e pequenos. Salvar aqui mantém os grupos quando você sai e volta da página.</p><div class="va-groups-editor-grid">${groups.map((group, gi) => Array.from({ length: max }, (_, si) => `<label>${esc(group.name)} • posição ${si + 1}<select data-gi="${gi}" data-si="${si}">${opts(teamId(group.teams[si]))}</select></label>`).join('')).join('')}</div><div class="va-actions" style="margin-top:12px"><button id="saveGroupsBtn" class="va-btn primary" type="button">Salvar grupos</button><button id="cancelGroupsBtn" class="va-btn" type="button">Cancelar</button></div>`;
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
    setStatus('Grupos salvos e persistidos. Não precisa gerar automático para ver os grupos editados.', 'ok');
  }
  function openManualCall() {
    const box = document.getElementById('manualCallBox');
    if (!box) return;
    const groupTeams = flatGroupTeams();
    const source = groupTeams.length ? groupTeams : teams;
    box.hidden = false;
    box.innerHTML = `<p class="va-muted">Crie a call de um time manualmente na mesma categoria definida, com as mesmas permissões das calls privadas.</p><div class="va-groups-editor-grid"><label>Time<select id="manualCallTeamSelect">${source.map((team) => `<option value="${esc(teamId(team))}">${esc(team.name || team.tag || 'Time')}${team.groupName ? ` • ${esc(team.groupName)}` : ''}</option>`).join('')}</select></label><label>Categoria Discord<input id="manualCallCategoryInput" value="${esc(categoryField?.value || DEFAULT_CATEGORY)}" /></label></div><div class="va-actions" style="margin-top:12px"><button id="createManualCallBtn" class="va-btn primary" type="button">Criar call do time</button><button id="closeManualCallBtn" class="va-btn" type="button">Cancelar</button></div>`;
    document.getElementById('closeManualCallBtn')?.addEventListener('click', () => { box.hidden = true; });
    document.getElementById('createManualCallBtn')?.addEventListener('click', createManualCall);
  }
  function teamPlayersDiscordIds(team = {}) {
    const ids = [];
    const accounts = team.playerAccounts || {};
    Object.values(accounts).forEach((account) => { const id = String(account?.discordId || account?.id || '').trim(); if (/^\d{8,25}$/.test(id)) ids.push(id); });
    return Array.from(new Set(ids));
  }
  async function createManualCall() {
    const select = document.getElementById('manualCallTeamSelect');
    const categoryInput = document.getElementById('manualCallCategoryInput');
    const team = findTeam(select?.value) || flatGroupTeams().find((item) => teamId(item) === select?.value);
    if (!team) return setStatus('Escolha um time para criar a call manual.', 'err');
    const data = await VoidArena.request('/api/discord/match-voices/create', { method: 'POST', body: JSON.stringify({ teamName: team.name || team.tag, categoryId: categoryInput?.value || DEFAULT_CATEGORY, playerIds: teamPlayersDiscordIds(team) }) });
    setStatus(data.reused ? `Call já existia e foi atualizada: ${data.channel?.name}` : `Call criada: ${data.channel?.name}`, 'ok');
  }
  async function buildGroupsIfMissing(snapshot) {
    const existing = snapshot?.bracket?.groups || [];
    if (existing.length) return existing;
    const count = Math.max(1, Number(document.querySelector('[name="groupCount"]')?.value || 4) || 4);
    const limit = Math.max(1, Number(document.querySelector('[name="teamLimit"]')?.value || snapshot?.bracket?.teamLimit || 16) || 16);
    const pool = (snapshot?.bracket?.slots || []).filter(Boolean);
    const fromSlots = pool.length ? pool : (snapshot?.teams || []).slice(0, limit).map(teamId);
    const built = Array.from({ length: count }, (_, index) => ({ name: `Grupo ${String.fromCharCode(65 + index)}`, teams: [] }));
    fromSlots.slice(0, limit).forEach((id, index) => built[index % count].teams.push(id));
    const payload = { ...(snapshot.bracket || {}), groups: built };
    const saved = await VoidArena.request('/api/bracket', { method: 'PUT', body: JSON.stringify(payload) });
    return saved.bracket?.groups || built;
  }
  async function fromData(data) {
    if (Array.isArray(data?.teams)) teams = data.teams;
    let incoming = data?.bracket?.groups || data?.groups || [];
    if (!incoming.length && data?.bracket && data?.teams) incoming = await buildGroupsIfMissing(data).catch(() => []);
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
  setTimeout(() => VoidArena.request('/api/dashboard/snapshot').then(fromData).catch(() => null), 600);
}());
