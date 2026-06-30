(function () {
  const statusEl = document.getElementById('bracketStatus');
  const miniStatusEl = document.getElementById('bracketMiniStatus');
  const settingsForm = document.getElementById('tournamentSettingsForm');
  let currentBracket = { slots: [], quarters: [], semis: [], finals: [], matchProgress: {} };
  let currentSettings = { tournamentName: 'Rematch Championship', matchFormat: 'MD1', teamLimit: 16, groupCount: 4, structure: 'single_elimination', autoCreateMatchChannels: true, discordMatchCategoryId: '' };

  function safe(value) { return VoidArena.escapeHtml(value || ''); }
  function teamName(team, fallback) { return team?.name || team?.tag || fallback; }
  function teamLabel(team, fallback) {
    const name = teamName(team, fallback);
    const tag = team?.tag && team?.tag !== name ? ` <small>${safe(team.tag)}</small>` : '';
    return `<span>${safe(name)}${tag}</span>`;
  }
  function setStatus(message, type = '') {
    if (statusEl) { statusEl.textContent = message; statusEl.className = `va-status ${type}`.trim(); }
    if (miniStatusEl) miniStatusEl.textContent = message.replace(/^❌\s*/, '');
  }
  function fillSettings(settings = {}) {
    currentSettings = { ...currentSettings, ...(settings || {}) };
    if (!settingsForm) return;
    Object.entries(currentSettings).forEach(([key, value]) => {
      const field = settingsForm.elements[key];
      if (!field) return;
      if (field.type === 'checkbox') field.checked = value !== false;
      else field.value = value ?? '';
    });
    const nameEl = document.getElementById('boardTournamentName');
    const formatEl = document.getElementById('boardMatchFormatLabel');
    if (nameEl) nameEl.textContent = currentSettings.tournamentName || 'Rematch Championship';
    if (formatEl) formatEl.textContent = `${currentSettings.matchFormat || 'MD1'} • ${currentSettings.teamLimit || 16} TIMES`;
  }
  function collectSettings() {
    return {
      tournamentName: String(settingsForm.elements.tournamentName.value || 'Rematch Championship').trim(),
      matchFormat: settingsForm.elements.matchFormat.value || 'MD1',
      structure: settingsForm.elements.structure.value || 'single_elimination',
      teamLimit: Number(settingsForm.elements.teamLimit.value || 16),
      groupCount: Number(settingsForm.elements.groupCount.value || 4),
      autoCreateMatchChannels: Boolean(settingsForm.elements.autoCreateMatchChannels.checked),
      discordMatchCategoryId: String(settingsForm.elements.discordMatchCategoryId.value || '').trim()
    };
  }
  function fillSlots(selector, list, fallbackPrefix) {
    document.querySelectorAll(selector).forEach((el) => {
      const index = Number(el.dataset.slot ?? el.dataset.index ?? 0);
      const team = list?.[index] || null;
      el.classList.toggle('is-empty', !team);
      const fallback = el.dataset.slot !== undefined ? `${fallbackPrefix} ${String(index + 1).padStart(2, '0')}` : `${fallbackPrefix} ${String(index + 1).padStart(2, '0')}`;
      el.innerHTML = teamLabel(team, fallback);
      el.title = team ? teamName(team, '') : '';
    });
  }
  function render(bracket = {}) {
    currentBracket = {
      slots: Array.isArray(bracket.slots) ? bracket.slots : [],
      quarters: Array.isArray(bracket.quarters) ? bracket.quarters : [],
      semis: Array.isArray(bracket.semis) ? bracket.semis : [],
      finals: Array.isArray(bracket.finals) ? bracket.finals : [],
      matchProgress: bracket.matchProgress || {}
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
  }
  async function load() {
    setStatus('Carregando chaveamento...');
    const data = await VoidArena.request('/api/dashboard/snapshot');
    fillSettings(data.settings || {});
    render(data.bracket || {});
    setStatus('Chaveamento carregado na estrutura 5.0.2.', 'ok');
  }
  async function saveSettings() {
    setStatus('Salvando configurações do torneio...');
    const data = await VoidArena.request('/api/tournament/settings', { method: 'PUT', body: JSON.stringify(collectSettings()) });
    fillSettings(data.settings || {});
    setStatus('Configurações salvas.', 'ok');
  }
  async function generate() {
    setStatus('Gerando chaveamento e sincronizando HUBs...');
    try {
      await saveSettings();
      const data = await VoidArena.request('/api/bracket/generate', { method: 'POST', body: '{}' });
      fillSettings(data.settings || currentSettings);
      render(data.bracket || {});
      const hubs = data.resultHubs;
      setStatus(hubs?.success === false ? `Chaveamento gerado, mas HUBs falharam: ${hubs.message}` : 'Chaveamento gerado e HUBs sincronizadas.', hubs?.success === false ? 'err' : 'ok');
    } catch (error) { setStatus(`❌ ${error.message}`, 'err'); }
  }
  async function syncHubs() {
    setStatus('Sincronizando HUBs pelo BOT...');
    try {
      const data = await VoidArena.request('/api/result-hubs/sync', { method: 'POST', body: '{}' });
      const result = data.resultHubs || {};
      const detail = `${result.created || 0} criadas • ${result.reused || 0} atualizadas • ${result.totalMatches || 0} confrontos${result.errors?.length ? ` • ${result.errors.length} erro(s)` : ''}`;
      setStatus(result.success === false ? `HUBs não sincronizaram: ${result.message || detail}` : `HUBs sincronizadas: ${detail}.`, result.success === false || result.errors?.length ? 'err' : 'ok');
    } catch (error) { setStatus(`❌ ${error.message}`, 'err'); }
  }
  document.getElementById('reloadBracketBtn')?.addEventListener('click', load);
  document.getElementById('generateBracketBtn')?.addEventListener('click', generate);
  document.getElementById('saveSettingsBtn')?.addEventListener('click', saveSettings);
  document.getElementById('syncHubsBtn')?.addEventListener('click', syncHubs);
  VoidArena.bootLayout('chaveamento').then(load).catch((error) => setStatus(`❌ ${error.message}`, 'err'));
}());
