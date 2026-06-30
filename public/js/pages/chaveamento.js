(function () {
  const statusEl = document.getElementById('bracketStatus');
  const miniStatusEl = document.getElementById('bracketMiniStatus');
  const settingsForm = document.getElementById('tournamentSettingsForm');
  const adaptiveEl = document.getElementById('adaptiveBracket');
  let currentBracket = { slots: [], round16: [], quarters: [], semis: [], finals: [], matchProgress: {} };
  let currentSettings = { tournamentName: 'Rematch Championship', matchFormat: 'MD1', teamLimit: 16, groupCount: 4, structure: 'single_elimination', autoCreateMatchChannels: true, discordMatchCategoryId: '' };

  function safe(value) { return VoidArena.escapeHtml(value || ''); }
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
      const fallback = `${fallbackPrefix} ${String(index + 1).padStart(2, '0')}`;
      el.innerHTML = teamLabel(team, fallback);
      el.title = team ? teamName(team, '') : '';
    });
  }
  function compactList(items = []) { return items.filter(Boolean).length; }
  function matchRows(round, items = [], label = 'Rodada') {
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
    const slotsCount = compactList(currentBracket.slots);
    const round16Count = compactList(currentBracket.round16);
    const quartersCount = compactList(currentBracket.quarters);
    const semisCount = compactList(currentBracket.semis);
    const finalsCount = compactList(currentBracket.finals);
    adaptiveEl.innerHTML = `
      <div class="va-adaptive-round">
        <h3>🧭 Fluxo adaptativo</h3>
        <p class="va-muted">O chaveamento agora se adapta ao limite escolhido. Para 4 times, os confrontos ficam divididos em lados opostos e os vencedores vão direto para a final. Para 8, vão para semifinal. Para 16+, o fluxo segue em fases progressivas.</p>
        <div class="va-kpi-row">
          <span class="va-badge">Slots: ${slotsCount}/${slotSize}</span>
          <span class="va-badge">Oitavas: ${round16Count}/16</span>
          <span class="va-badge">Quartas: ${quartersCount}/8</span>
          <span class="va-badge">Semis: ${semisCount}/4</span>
          <span class="va-badge">Final: ${finalsCount}/2</span>
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
    renderAdaptive();
  }
  async function load() {
    setStatus('Carregando chaveamento...');
    const data = await VoidArena.request('/api/dashboard/snapshot');
    fillSettings(data.settings || {});
    render(data.bracket || {});
    setStatus('Chaveamento carregado na estrutura nova.', 'ok');
  }
  async function saveSettings() {
    setStatus('Salvando configurações do torneio...');
    const data = await VoidArena.request('/api/tournament/settings', { method: 'PUT', body: JSON.stringify(collectSettings()) });
    fillSettings(data.settings || {});
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
      setStatus(hubs?.success === false ? `Chaveamento gerado, mas HUBs falharam: ${hubs.message}` : 'Chaveamento balanceado e HUBs sincronizadas.', hubs?.success === false ? 'err' : 'ok');
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
