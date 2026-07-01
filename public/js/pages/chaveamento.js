(function () {
  const statusEl = document.getElementById('bracketStatus');
  const miniStatusEl = document.getElementById('bracketMiniStatus');
  const settingsForm = document.getElementById('tournamentSettingsForm');
  const adaptiveEl = document.getElementById('adaptiveBracket');
  const activeEventStatus = document.getElementById('activeEventStatus');
  const manualModal = document.getElementById('manualBracketModal');
  const manualBody = document.getElementById('manualEditorBody');
  const manualStatus = document.getElementById('manualEditorStatus');

  let currentBracket = { slots: [], round16: [], quarters: [], semis: [], finals: [], matchProgress: {} };
  let currentSettings = { activeEventId: '', tournamentName: 'Rematch Championship', matchFormat: 'MD1', teamLimit: 16, groupCount: 4, structure: 'single_elimination', autoCreateMatchChannels: true, discordMatchCategoryId: '' };
  let currentEvents = [];
  let currentTeams = [];

  function safe(value) { return VoidArena.escapeHtml(value || ''); }
  function teamId(team) { return typeof team === 'string' ? team : String(team?.id || ''); }
  function teamName(team, fallback) { return team?.name || team?.tag || fallback; }
  function initials(team, fallback = '?') { return safe((team?.tag || team?.name || fallback).slice(0, 2).toUpperCase()); }
  function teamLabel(team, fallback) {
    if (!team) return `<span>${safe(fallback)}</span>`;
    const logo = team.logo ? `<img src="${safe(team.logo)}" alt="" />` : initials(team, fallback);
    const tag = team?.tag && team?.tag !== team?.name ? `<small>${safe(team.tag)}</small>` : '';
    return `<span class="va-inline-team-logo">${logo}</span><span>${safe(teamName(team, fallback))}${tag}</span>`;
  }
  function setStatus(message, type = '') {
    if (statusEl) { statusEl.textContent = message; statusEl.className = `va-status ${type}`.trim(); }
    if (miniStatusEl) miniStatusEl.textContent = message.replace(/^❌\s*/, '');
  }
  function selectedEvent() {
    const id = String(settingsForm?.elements?.activeEventId?.value || currentSettings.activeEventId || '').trim();
    return currentEvents.find((event) => String(event.id || '') === id) || null;
  }
  function normalizedStructure(value = '') {
    const raw = String(value || '').toLowerCase();
    if (raw.includes('grupo') && raw.includes('play')) return 'groups_playoffs';
    if (raw.includes('grupo')) return 'groups';
    return 'single_elimination';
  }
  function updateActiveEventStatus() {
    if (!activeEventStatus) return;
    const event = selectedEvent();
    if (!event) {
      activeEventStatus.innerHTML = '🧭 <strong>Sem evento fixo.</strong> O chaveamento usa todos os times cadastrados.';
      return;
    }
    const count = Array.isArray(event.registrations) ? event.registrations.length : (event.registeredCount || 0);
    activeEventStatus.innerHTML = `🏆 <strong>Evento em uso:</strong> ${safe(event.title || event.name || 'Evento')} • ${count}/${event.teamLimit || 0} times • ${safe(event.matchFormat || currentSettings.matchFormat || 'MD1')} • ${safe(event.structure || 'mata-mata')}`;
  }
  function applyEventToForm(event = null) {
    if (!event || !settingsForm) return;
    if (settingsForm.elements.tournamentName) settingsForm.elements.tournamentName.value = event.title || event.name || currentSettings.tournamentName || 'Rematch Championship';
    if (settingsForm.elements.matchFormat && event.matchFormat) settingsForm.elements.matchFormat.value = event.matchFormat;
    if (settingsForm.elements.structure) settingsForm.elements.structure.value = normalizedStructure(event.structure || currentSettings.structure);
    if (settingsForm.elements.teamLimit && event.teamLimit) settingsForm.elements.teamLimit.value = String(event.teamLimit);
    if (settingsForm.elements.groupCount && event.groupCount) settingsForm.elements.groupCount.value = String(event.groupCount);
    updateActiveEventStatus();
    updateBoardLabels();
  }
  function fillEventSelect(events = []) {
    currentEvents = Array.isArray(events) ? events : [];
    const field = settingsForm?.elements?.activeEventId;
    if (!field) return;
    const selected = String(currentSettings.activeEventId || '');
    field.innerHTML = '<option value="">Usar todos os times cadastrados</option>' + currentEvents.map((event) => {
      const id = String(event.id || '');
      const title = safe(event.title || event.name || 'Evento');
      const count = Array.isArray(event.registrations) ? event.registrations.length : (event.registeredCount || 0);
      return `<option value="${safe(id)}">${title} • ${count}/${event.teamLimit || 0} times</option>`;
    }).join('');
    field.value = selected;
    updateActiveEventStatus();
  }
  function updateBoardLabels() {
    const nameEl = document.getElementById('boardTournamentName');
    const formatEl = document.getElementById('boardMatchFormatLabel');
    const settings = collectSettingsSafe();
    if (nameEl) nameEl.textContent = settings.tournamentName || 'Rematch Championship';
    if (formatEl) formatEl.textContent = `${settings.matchFormat || 'MD1'} • ${settings.teamLimit || 16} TIMES`;
  }
  function fillSettings(settings = {}) {
    currentSettings = { ...currentSettings, ...(settings || {}) };
    if (!settingsForm) return;
    fillEventSelect(currentEvents);
    Object.entries(currentSettings).forEach(([key, value]) => {
      const field = settingsForm.elements[key];
      if (!field) return;
      if (field.type === 'checkbox') field.checked = value !== false;
      else field.value = value ?? '';
    });
    updateBoardLabels();
    updateActiveEventStatus();
  }
  function collectSettingsSafe() {
    if (!settingsForm) return currentSettings;
    return {
      activeEventId: String(settingsForm.elements.activeEventId?.value || '').trim(),
      tournamentName: String(settingsForm.elements.tournamentName?.value || 'Rematch Championship').trim(),
      matchFormat: settingsForm.elements.matchFormat?.value || 'MD1',
      structure: settingsForm.elements.structure?.value || 'single_elimination',
      teamLimit: Number(settingsForm.elements.teamLimit?.value || 16),
      groupCount: Number(settingsForm.elements.groupCount?.value || 4),
      autoCreateMatchChannels: Boolean(settingsForm.elements.autoCreateMatchChannels?.checked),
      discordMatchCategoryId: String(settingsForm.elements.discordMatchCategoryId?.value || '').trim()
    };
  }
  function collectSettings() { return collectSettingsSafe(); }
  function fillSlots(selector, list, fallbackPrefix) {
    document.querySelectorAll(selector).forEach((el) => {
      const index = Number(el.dataset.slot ?? el.dataset.index ?? 0);
      const team = list?.[index] || null;
      el.classList.toggle('is-empty', !team);
      const fallback = `${fallbackPrefix} ${String(index + 1).padStart(2, '0')}`;
      el.innerHTML = teamLabel(team, fallback);
      el.title = team ? teamName(team, '') : '';
    });
  }
  function compactList(items = []) { return items.filter(Boolean).length; }
  function matchRows(_round, items = [], label = 'Rodada') {
    const rows = [];
    for (let i = 0; i < items.length; i += 2) {
      const a = items[i]; const b = items[i + 1];
      if (!a && !b) continue;
      rows.push(`<div class="va-match-card"><strong>${safe(label)} ${String((i / 2) + 1).padStart(2, '0')}</strong><div class="va-match-team">${teamLabel(a, `Vaga ${i + 1}`)}</div><div class="va-match-team">${teamLabel(b, `Vaga ${i + 2}`)}</div></div>`);
    }
    return rows.join('');
  }
  function renderAdaptive() {
    if (!adaptiveEl) return;
    const slotSize = currentBracket.slots.length || 16;
    adaptiveEl.innerHTML = `
      <div class="va-adaptive-round">
        <h3>🧭 Fluxo adaptativo</h3>
        <p class="va-muted">O chaveamento fica salvo pelo evento ativo e é recarregado ao voltar para esta página. Use o editor manual como segurança caso precise avançar/corrigir algo.</p>
        <div class="va-kpi-row">
          <span class="va-badge">Slots: ${compactList(currentBracket.slots)}/${slotSize}</span>
          <span class="va-badge">Oitavas: ${compactList(currentBracket.round16)}/16</span>
          <span class="va-badge">Quartas: ${compactList(currentBracket.quarters)}/8</span>
          <span class="va-badge">Semis: ${compactList(currentBracket.semis)}/4</span>
          <span class="va-badge">Final: ${compactList(currentBracket.finals)}/2</span>
        </div>
      </div>
      ${slotSize > 16 ? `<div class="va-adaptive-round"><h3>Rodada 32</h3><div class="va-match-grid">${matchRows('slots', currentBracket.slots, 'Confronto')}</div></div>` : ''}
      <div class="va-adaptive-round"><h3>Partidas visíveis da árvore</h3><div class="va-match-grid">${matchRows('slots', currentBracket.slots.slice(0, 16), 'Entrada')}</div></div>
      <div class="va-adaptive-round"><h3>Avanços</h3><div class="va-match-grid">${matchRows('round16', currentBracket.round16, 'Oitavas') || '<p class="va-muted">Aguardando vencedores.</p>'}${matchRows('quarters', currentBracket.quarters, 'Quartas') || ''}${matchRows('semis', currentBracket.semis, 'Semifinal') || ''}${matchRows('finals', currentBracket.finals, 'Final') || ''}</div></div>`;
  }
  function render(bracket = {}) {
    currentBracket = {
      slots: Array.isArray(bracket.slots) ? bracket.slots : [],
      round16: Array.isArray(bracket.round16) ? bracket.round16 : [],
      quarters: Array.isArray(bracket.quarters) ? bracket.quarters : [],
      semis: Array.isArray(bracket.semis) ? bracket.semis : [],
      finals: Array.isArray(bracket.finals) ? bracket.finals : [],
      matchProgress: bracket.matchProgress || {},
      eventId: bracket.eventId || ''
    };
    fillSlots('.team-slot[data-slot]', currentBracket.slots, 'Vaga');
    document.querySelectorAll('.advance-slot[data-round="quarters"]').forEach((el) => {
      const i = Number(el.dataset.index || 0); const team = currentBracket.quarters[i] || null;
      el.classList.toggle('is-empty', !team); el.innerHTML = teamLabel(team, `A definir ${String(i + 1).padStart(2, '0')}`);
    });
    document.querySelectorAll('.advance-slot[data-round="semis"]').forEach((el) => {
      const i = Number(el.dataset.index || 0); const team = currentBracket.semis[i] || null;
      el.classList.toggle('is-empty', !team); el.innerHTML = teamLabel(team, `A definir ${String(i + 1).padStart(2, '0')}`);
    });
    document.querySelectorAll('.final-slot[data-round="finals"]').forEach((el) => {
      const i = Number(el.dataset.index || 0); const team = currentBracket.finals[i] || null;
      el.classList.toggle('is-empty', !team); el.innerHTML = teamLabel(team, `Finalista ${String(i + 1).padStart(2, '0')}`);
    });
    renderAdaptive();
  }
  async function load() {
    setStatus('Carregando chaveamento do evento ativo...');
    const data = await VoidArena.request('/api/dashboard/snapshot');
    currentEvents = data.events || [];
    currentTeams = data.teams || [];
    fillSettings(data.settings || {});
    render(data.bracket || {});
    setStatus('Chaveamento carregado e persistido.', 'ok');
  }
  async function saveSettings() {
    setStatus('Salvando configurações do torneio/evento...');
    const data = await VoidArena.request('/api/tournament/settings', { method: 'PUT', body: JSON.stringify(collectSettings()) });
    fillSettings(data.settings || collectSettings());
    setStatus('Configurações salvas.', 'ok');
  }
  async function generate() {
    setStatus('Gerando chaveamento balanceado e sincronizando HUBs...');
    try {
      await saveSettings();
      const data = await VoidArena.request('/api/bracket/generate', { method: 'POST', body: '{}' });
      fillSettings(data.settings || currentSettings);
      render(data.bracket || {});
      const hubs = data.resultHubs;
      setStatus(hubs?.success === false ? `Chaveamento gerado, mas HUBs falharam: ${hubs.message}` : 'Chaveamento salvo, balanceado e HUBs sincronizadas.', hubs?.success === false ? 'err' : 'ok');
    } catch (error) { setStatus(`❌ ${error.message}`, 'err'); }
  }
  async function syncHubs() {
    setStatus('Sincronizando HUBs pelo BOT...');
    try {
      const data = await VoidArena.request('/api/result-hubs/sync', { method: 'POST', body: '{}' });
      const result = data.resultHubs || {};
      const detail = `${result.created || 0} criadas • ${result.reused || 0} atualizadas • ${result.totalMatches || 0} confrontos${result.errors?.length ? ` • ${result.errors.length} erro(s)` : ''}`;
      setStatus(result.success === false ? `HUBs não sincronizaram: ${result.message || detail}` : `HUBs sincronizadas: ${detail}.`, result.success === false || result.errors?.length ? 'err' : 'ok');
      await load();
    } catch (error) { setStatus(`❌ ${error.message}`, 'err'); }
  }
  function manualOption(team = null, selectedId = '') {
    if (!team) return `<option value=""${!selectedId ? ' selected' : ''}>Vazio</option>`;
    const id = teamId(team);
    return `<option value="${safe(id)}"${id === selectedId ? ' selected' : ''}>${safe(teamName(team, 'Time'))}${team.tag ? ` • ${safe(team.tag)}` : ''}</option>`;
  }
  function selectHtml(round, index, current) {
    const selectedId = teamId(current);
    const options = [manualOption(null, selectedId), ...currentTeams.map((team) => manualOption(team, selectedId))].join('');
    return `<label>${safe(round)} ${index + 1}<select data-manual-round="${safe(round)}" data-manual-index="${index}">${options}</select></label>`;
  }
  function openManualEditor() {
    if (!manualModal || !manualBody) return;
    const rounds = [
      ['slots', 'Entrada/Vagas', currentBracket.slots, currentBracket.slots.length || 16],
      ['round16', 'Oitavas', currentBracket.round16, 16],
      ['quarters', 'Quartas', currentBracket.quarters, 8],
      ['semis', 'Semifinal', currentBracket.semis, 4],
      ['finals', 'Final', currentBracket.finals, 2]
    ];
    manualBody.innerHTML = rounds.map(([key, label, arr, size]) => `<section class="va-manual-section"><h3>${label}</h3><div class="va-manual-fields">${Array.from({ length: size }, (_, index) => selectHtml(key, index, arr?.[index] || null)).join('')}</div></section>`).join('');
    if (manualStatus) manualStatus.textContent = 'Ajuste os times e salve para atualizar o site e as HUBs.';
    manualModal.hidden = false;
  }
  function closeManualEditor() { if (manualModal) manualModal.hidden = true; }
  function collectManualBracket() {
    const next = {
      slotSize: currentBracket.slots.length || Number(currentSettings.teamLimit) > 16 ? 32 : 16,
      teamLimit: Number(collectSettings().teamLimit || currentSettings.teamLimit || 16),
      eventId: collectSettings().activeEventId || currentBracket.eventId || '',
      slots: [...(currentBracket.slots || [])].map(teamId),
      round16: [...(currentBracket.round16 || [])].map(teamId),
      quarters: [...(currentBracket.quarters || [])].map(teamId),
      semis: [...(currentBracket.semis || [])].map(teamId),
      finals: [...(currentBracket.finals || [])].map(teamId),
      matchProgress: currentBracket.matchProgress || {}
    };
    document.querySelectorAll('[data-manual-round][data-manual-index]').forEach((select) => {
      const round = select.dataset.manualRound;
      const index = Number(select.dataset.manualIndex || 0);
      if (!Array.isArray(next[round])) next[round] = [];
      next[round][index] = select.value || null;
    });
    return next;
  }
  async function saveManualEditor() {
    if (manualStatus) manualStatus.textContent = 'Salvando posições...';
    try {
      const data = await VoidArena.request('/api/bracket', { method: 'PUT', body: JSON.stringify(collectManualBracket()) });
      render(data.bracket || {});
      closeManualEditor();
      const hubs = data.resultHubs || {};
      setStatus(`Posições salvas. HUBs: ${hubs.created || 0} criadas • ${hubs.reused || 0} atualizadas.`, hubs.errors?.length ? 'err' : 'ok');
    } catch (error) {
      if (manualStatus) manualStatus.textContent = `❌ ${error.message}`;
    }
  }
  document.getElementById('reloadBracketBtn')?.addEventListener('click', load);
  document.getElementById('generateBracketBtn')?.addEventListener('click', generate);
  document.getElementById('saveSettingsBtn')?.addEventListener('click', saveSettings);
  document.getElementById('syncHubsBtn')?.addEventListener('click', syncHubs);
  document.getElementById('openManualEditorBtn')?.addEventListener('click', openManualEditor);
  document.getElementById('closeManualEditorBtn')?.addEventListener('click', closeManualEditor);
  document.getElementById('cancelManualEditorBtn')?.addEventListener('click', closeManualEditor);
  document.getElementById('saveManualEditorBtn')?.addEventListener('click', saveManualEditor);
  settingsForm?.elements?.activeEventId?.addEventListener('change', () => { applyEventToForm(selectedEvent()); });
  settingsForm?.addEventListener('input', updateBoardLabels);
  VoidArena.bootLayout('chaveamento').then(load).catch((error) => setStatus(`❌ ${error.message}`, 'err'));
}());
