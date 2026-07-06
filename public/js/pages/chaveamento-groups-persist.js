(function () {
  const DEFAULT_CATEGORY = '1523133579570184194';
  const statusEl = document.getElementById('bracketStatus');
  const categoryField = document.querySelector('[name="discordMatchCategoryId"]');
  if (categoryField && !String(categoryField.value || '').trim()) categoryField.value = DEFAULT_CATEGORY;

  let teams = [];
  let groups = [];
  let standings = {};
  let panelOpen = false;

  function esc(value) { return window.VoidArena?.escapeHtml?.(value || '') || String(value || ''); }
  function setStatus(message, type = '') { if (!statusEl) return; statusEl.textContent = message; statusEl.className = `va-status ${type}`.trim(); }
  function teamId(team) { return typeof team === 'string' ? team : String(team?.id || ''); }
  function findTeam(id) { return teams.find((team) => teamId(team) === String(id || '')) || null; }
  function teamName(team) { return String(team?.name || team?.tag || team || 'Time'); }
  function teamTag(team) { return String(team?.tag || '').trim(); }
  function initials(team, fallback) { return esc(String(team?.tag || team?.name || fallback || '?').slice(0, 2).toUpperCase()); }
  function logo(team, fallback) { return team?.logo ? `<img src="${esc(team.logo)}" alt="" />` : `<span>${initials(team, fallback)}</span>`; }
  function st(id) { return standings[id] || { played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0 }; }
  function goalDiff(row) { return Number(row.goalsFor || 0) - Number(row.goalsAgainst || 0); }
  function sortedGroupTeams(group) {
    return [...(group.teams || [])].sort((a, b) => {
      const sa = st(teamId(a));
      const sb = st(teamId(b));
      return Number(sb.points || 0) - Number(sa.points || 0) || goalDiff(sb) - goalDiff(sa) || Number(sb.goalsFor || 0) - Number(sa.goalsFor || 0) || teamName(a).localeCompare(teamName(b));
    });
  }
  function installCss() {
    if (document.getElementById('groupStagePanelCss')) return;
    const style = document.createElement('style');
    style.id = 'groupStagePanelCss';
    style.textContent = `.va-group-stage-entry{margin-top:16px}.va-stage-panel{margin-top:14px}.va-stage-toolbar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;justify-content:space-between;margin-bottom:12px}.va-stage-actions{display:flex;gap:8px;flex-wrap:wrap}.va-stage-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px}.va-stage-card{border:1px solid rgba(139,92,246,.28);border-radius:18px;padding:14px;background:rgba(255,255,255,.04)}.va-stage-card h3{margin:0 0 10px;color:#67e8f9}.va-stage-table{width:100%;border-collapse:separate;border-spacing:0 7px}.va-stage-table th{font-size:10px;color:#a5b4fc;text-transform:uppercase;text-align:center}.va-stage-table td{background:rgba(2,6,23,.45);padding:7px 5px;text-align:center}.va-stage-table td:first-child{border-radius:12px 0 0 12px;text-align:left;min-width:132px}.va-stage-table td:last-child{border-radius:0 12px 12px 0}.va-stage-team{display:flex;align-items:center;gap:8px;min-width:0}.va-stage-logo{width:28px;height:28px;border-radius:9px;display:grid;place-items:center;background:rgba(139,92,246,.25);border:1px solid rgba(34,211,238,.25);overflow:hidden;flex:0 0 auto}.va-stage-logo img{width:100%;height:100%;object-fit:cover}.va-stage-logo span{font-size:10px;font-weight:1000}.va-stage-team strong{font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block}.va-stage-team small{font-size:10px;color:#67e8f9;font-weight:900}.va-stage-table input{width:44px;background:#080b1c;color:#fff;border:1px solid rgba(139,92,246,.35);border-radius:9px;padding:6px;text-align:center}.va-stage-editor{margin-top:14px;padding:14px;border:1px solid rgba(103,232,249,.25);border-radius:16px;background:rgba(2,6,23,.45)}.va-stage-editor-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}.va-stage-editor label{display:grid;gap:6px;font-size:12px;font-weight:800}.va-stage-editor select,.va-stage-editor input{background:#080b1c;color:#fff;border:1px solid rgba(139,92,246,.35);border-radius:10px;padding:9px}.va-manual-call-box{margin-top:14px;padding:14px;border:1px solid rgba(103,232,249,.25);border-radius:16px;background:rgba(2,6,23,.45)}`;
    document.head.appendChild(style);
  }
  function entryBox() {
    installCss();
    let el = document.getElementById('groupStageEntryBox');
    if (!el) {
      el = document.createElement('article');
      el.id = 'groupStageEntryBox';
      el.className = 'va-card full va-group-stage-entry';
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
  function currentPool(snapshot = null) {
    const slotIds = (snapshot?.bracket?.slots || []).map(teamId).filter(Boolean);
    const source = slotIds.length ? slotIds.map(findTeam).filter(Boolean) : teams;
    const limit = Math.max(1, Number(document.querySelector('[name="teamLimit"]')?.value || snapshot?.bracket?.teamLimit || 16) || 16);
    return source.slice(0, limit);
  }
  function makeGroups(pool, count) {
    const shuffled = [...pool].map((team) => ({ team, n: Math.random() })).sort((a, b) => a.n - b.n).map((item) => item.team);
    const next = Array.from({ length: count }, (_, index) => ({ name: `Grupo ${String.fromCharCode(65 + index)}`, teams: [] }));
    shuffled.forEach((team, index) => next[index % count].teams.push(team));
    return next;
  }
  function renderEntry() {
    const el = entryBox();
    el.innerHTML = `<div class="va-section-head"><div><p class="va-eyebrow">Grupos + Playoffs</p><h2>Fase de grupos</h2><p class="va-muted">Use esta tela para sortear/organizar os grupos e atualizar pontos dos times. O chaveamento fica limpo acima.</p></div><div class="va-stage-actions"><button id="openGroupStageBtn" class="va-btn primary" type="button">🎲 Sorteio / organizar grupos</button><button id="quickManualCallBtn" class="va-btn" type="button">🎧 Criar call manual</button></div></div><div id="groupStagePanel" class="va-stage-panel" ${panelOpen ? '' : 'hidden'}></div>`;
    document.getElementById('openGroupStageBtn')?.addEventListener('click', () => { panelOpen = !panelOpen; renderEntry(); renderPanel(); });
    document.getElementById('quickManualCallBtn')?.addEventListener('click', () => { panelOpen = true; renderEntry(); renderPanel(); openManualCall(); });
    if (panelOpen) renderPanel();
  }
  function rowFor(team, index) {
    const id = teamId(team);
    const row = st(id);
    return `<tr data-stage-team="${esc(id)}"><td><div class="va-stage-team"><div class="va-stage-logo">${logo(team, index + 1)}</div><span><strong>${esc(teamName(team))}</strong>${teamTag(team) ? `<small>${esc(teamTag(team))}</small>` : ''}</span></div></td>${['points','played','wins','draws','losses','goalsFor','goalsAgainst'].map((key) => `<td><input data-stage-stat="${key}" type="number" min="0" value="${Number(row[key] || 0)}" /></td>`).join('')}<td><strong>${goalDiff(row)}</strong></td></tr>`;
  }
  function renderPanel() {
    const panel = document.getElementById('groupStagePanel');
    if (!panel) return;
    const hasGroups = groups.length > 0;
    panel.hidden = false;
    panel.innerHTML = `<div class="va-stage-toolbar"><p class="va-muted">${hasGroups ? 'Grupos carregados/salvos. Você pode editar posições e pontos sem gerar automático.' : 'Ainda não há grupos salvos. Clique em Sortear grupos.'}</p><div class="va-stage-actions"><button id="drawGroupsBtn" class="va-btn primary" type="button">🎲 Sortear grupos</button><button id="editGroupsBtn" class="va-btn" type="button">⚙️ Editar posições</button><button id="saveStageBtn" class="va-btn" type="button">💾 Salvar pontos</button><button id="manualCallBtn" class="va-btn" type="button">🎧 Criar call manual</button></div></div><div class="va-stage-grid">${groups.map((group) => `<section class="va-stage-card"><h3>${esc(group.name)}</h3><table class="va-stage-table"><thead><tr><th>Time</th><th>Pts</th><th>J</th><th>V</th><th>E</th><th>D</th><th>GP</th><th>GC</th><th>SG</th></tr></thead><tbody>${sortedGroupTeams(group).map(rowFor).join('')}</tbody></table></section>`).join('') || '<div class="va-muted">Nenhum grupo sorteado ainda.</div>'}</div><div id="groupsEditor" class="va-stage-editor" hidden></div><div id="manualCallBox" class="va-manual-call-box" hidden></div>`;
    document.getElementById('drawGroupsBtn')?.addEventListener('click', drawGroups);
    document.getElementById('editGroupsBtn')?.addEventListener('click', openEditor);
    document.getElementById('saveStageBtn')?.addEventListener('click', saveStage);
    document.getElementById('manualCallBtn')?.addEventListener('click', openManualCall);
    panel.querySelectorAll('[data-stage-stat]').forEach((input) => input.addEventListener('change', collectStandings));
  }
  async function drawGroups() {
    const snap = await VoidArena.request('/api/dashboard/snapshot');
    if (Array.isArray(snap.teams)) teams = snap.teams;
    const count = Math.max(1, Number(document.querySelector('[name="groupCount"]')?.value || snap.settings?.groupCount || 4) || 4);
    groups = makeGroups(currentPool(snap), count);
    collectStandings();
    await saveStage();
    setStatus('Grupos sorteados e salvos. Agora ajuste posições/pontos se precisar.', 'ok');
  }
  function collectStandings() {
    document.querySelectorAll('[data-stage-team]').forEach((row) => {
      const id = String(row.dataset.stageTeam || '').trim();
      if (!id) return;
      standings[id] = standings[id] || st(id);
      row.querySelectorAll('[data-stage-stat]').forEach((input) => { standings[id][input.dataset.stageStat] = Math.max(0, Number(input.value || 0) || 0); });
    });
  }
  function option(team, selected) { if (!team) return `<option value=""${!selected ? ' selected' : ''}>Vazio</option>`; const id = teamId(team); return `<option value="${esc(id)}"${id === selected ? ' selected' : ''}>${esc(teamName(team))}${teamTag(team) ? ` • ${esc(teamTag(team))}` : ''}</option>`; }
  function openEditor() {
    const editor = document.getElementById('groupsEditor');
    if (!editor) return;
    const max = Math.max(...groups.map((g) => g.teams.length), 1);
    const opts = (selected) => [option(null, selected), ...teams.map((team) => option(team, selected))].join('');
    editor.hidden = false;
    editor.innerHTML = `<p class="va-muted">Troque os times de grupo para equilibrar antes dos jogos.</p><div class="va-stage-editor-grid">${groups.map((group, gi) => Array.from({ length: max }, (_, si) => `<label>${esc(group.name)} • posição ${si + 1}<select data-gi="${gi}" data-si="${si}">${opts(teamId(group.teams[si]))}</select></label>`).join('')).join('')}</div><div class="va-actions" style="margin-top:12px"><button id="saveGroupsBtn" class="va-btn primary" type="button">Salvar organização</button><button id="cancelGroupsBtn" class="va-btn" type="button">Cancelar</button></div>`;
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
    groups = next;
    await saveStage();
    setStatus('Organização dos grupos salva.', 'ok');
  }
  async function saveStage() {
    collectStandings();
    const snap = await VoidArena.request('/api/dashboard/snapshot');
    const payload = { ...(snap.bracket || {}), groups: groups.map((group) => ({ name: group.name, teams: group.teams.map(teamId) })), groupStandings: standings };
    const saved = await VoidArena.request('/api/bracket', { method: 'PUT', body: JSON.stringify(payload) });
    groups = normalize(saved.bracket?.groups || groups);
    standings = saved.bracket?.groupStandings || standings;
    panelOpen = true;
    renderEntry();
  }
  function flatTeams() { return groups.flatMap((group) => group.teams || []).filter((team) => teamId(team)); }
  function teamPlayersDiscordIds(team = {}) {
    const ids = [];
    const accounts = team.playerAccounts || {};
    Object.values(accounts).forEach((account) => { const id = String(account?.discordId || account?.id || '').trim(); if (/^\d{8,25}$/.test(id)) ids.push(id); });
    return Array.from(new Set(ids));
  }
  function openManualCall() {
    const callBox = document.getElementById('manualCallBox');
    if (!callBox) return;
    const source = flatTeams().length ? flatTeams() : teams;
    callBox.hidden = false;
    callBox.innerHTML = `<p class="va-muted">Crie a call de um time manualmente na categoria definida, com as permissões privadas já configuradas.</p><div class="va-stage-editor-grid"><label>Time<select id="manualCallTeamSelect">${source.map((team) => `<option value="${esc(teamId(team))}">${esc(teamName(team))}${teamTag(team) ? ` • ${esc(teamTag(team))}` : ''}</option>`).join('')}</select></label><label>Categoria Discord<input id="manualCallCategoryInput" value="${esc(categoryField?.value || DEFAULT_CATEGORY)}" /></label></div><div class="va-actions" style="margin-top:12px"><button id="createManualCallBtn" class="va-btn primary" type="button">Criar call do time</button><button id="closeManualCallBtn" class="va-btn" type="button">Cancelar</button></div>`;
    document.getElementById('closeManualCallBtn')?.addEventListener('click', () => { callBox.hidden = true; });
    document.getElementById('createManualCallBtn')?.addEventListener('click', createManualCall);
  }
  async function createManualCall() {
    const selected = document.getElementById('manualCallTeamSelect')?.value || '';
    const category = document.getElementById('manualCallCategoryInput')?.value || DEFAULT_CATEGORY;
    const team = findTeam(selected) || flatTeams().find((item) => teamId(item) === selected);
    if (!team) return setStatus('Escolha um time para criar a call manual.', 'err');
    const data = await VoidArena.request('/api/discord/match-voices/create', { method: 'POST', body: JSON.stringify({ teamName: teamName(team), categoryId: category, playerIds: teamPlayersDiscordIds(team) }) });
    setStatus(data.reused ? `Call já existia e foi atualizada: ${data.channel?.name}` : `Call criada: ${data.channel?.name}`, 'ok');
  }
  async function fromData(data) {
    if (Array.isArray(data?.teams)) teams = data.teams;
    groups = normalize(data?.bracket?.groups || data?.groups || groups || []);
    standings = data?.bracket?.groupStandings || standings || {};
    renderEntry();
  }
  if (window.VoidArena?.request && !window.VoidArena.__groupStagePanelPatch) {
    const original = window.VoidArena.request;
    window.VoidArena.request = async function patched(path, options = {}) {
      const data = await original(path, options);
      const url = String(path || '');
      if (url.includes('/api/dashboard/snapshot') || url.includes('/api/bracket/generate') || (url.includes('/api/bracket') && options?.method === 'PUT')) fromData(data);
      return data;
    };
    window.VoidArena.__groupStagePanelPatch = true;
  }
  document.getElementById('reloadBracketBtn')?.addEventListener('click', () => setTimeout(() => VoidArena.request('/api/dashboard/snapshot').then(fromData).catch(() => null), 700));
  setTimeout(() => VoidArena.request('/api/dashboard/snapshot').then(fromData).catch(() => null), 600);
}());
