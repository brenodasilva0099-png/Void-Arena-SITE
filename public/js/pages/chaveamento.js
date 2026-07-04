(function () {
  const statusEl = document.getElementById('bracketStatus');
  const miniStatusEl = document.getElementById('bracketMiniStatus');
  const settingsForm = document.getElementById('tournamentSettingsForm');
  const adaptiveEl = document.getElementById('adaptiveBracket');
  const activeEventStatus = document.getElementById('activeEventStatus');
  const manualModal = document.getElementById('manualBracketModal');
  const manualBody = document.getElementById('manualEditorBody');
  const manualStatus = document.getElementById('manualEditorStatus');
  const SUPPORTED_LIMITS = [4, 8, 12, 16, 20, 24, 28, 32];
  const VISUAL_ORDER = [0, 1, 8, 9, 2, 3, 10, 11, 4, 5, 12, 13, 6, 7, 14, 15];
  let currentBracket = { slots: [], round16: [], quarters: [], semis: [], finals: [], matchProgress: {}, slotSize: 16, teamLimit: 16 };
  let currentSettings = { activeEventId: '', teamSource: 'all', tournamentName: 'Rematch Championship', matchFormat: 'MD1', teamLimit: 16, groupCount: 4, structure: 'single_elimination', autoCreateMatchChannels: true, discordMatchCategoryId: '' };
  let currentEvents = []; let currentTeams = [];
  function safe(value) { return VoidArena.escapeHtml(value || ''); }
  function normalizeLimit(value = 16) { const n = Number(value || 16); return SUPPORTED_LIMITS.includes(n) ? n : 16; }
  function boardLimit() { return normalizeLimit(currentBracket.teamLimit || currentSettings.teamLimit || currentBracket.slotSize || 16); }
  function teamId(team) { return typeof team === 'string' ? team : String(team?.id || ''); }
  function teamName(team, fallback) { return team?.name || team?.tag || fallback; }
  function initials(team, fallback = '?') { return safe((team?.tag || team?.name || fallback).slice(0, 2).toUpperCase()); }
  function teamLabel(team, fallback) { if (!team) return `<span>${safe(fallback)}</span>`; const logo = team.logo ? `<img src="${safe(team.logo)}" alt="" />` : initials(team, fallback); const tag = team?.tag && team?.tag !== team?.name ? `<small>${safe(team.tag)}</small>` : ''; return `<span class="va-inline-team-logo">${logo}</span><span>${safe(teamName(team, fallback))}${tag}</span>`; }
  function setStatus(message, type = '') { if (statusEl) { statusEl.textContent = message; statusEl.className = `va-status ${type}`.trim(); } if (miniStatusEl) miniStatusEl.textContent = String(message || '').replace(/^❌\s*/, ''); }
  function selectedEvent() { const id = String(settingsForm?.elements?.activeEventId?.value || currentSettings.activeEventId || '').trim(); return currentEvents.find((event) => String(event.id || '') === id) || null; }
  function selectedTeamSource() { return String(settingsForm?.elements?.teamSource?.value || currentSettings.teamSource || 'all') === 'registered' ? 'registered' : 'all'; }
  function normalizedStructure(value = '') { const raw = String(value || '').toLowerCase(); if (raw.includes('grupo') && raw.includes('play')) return 'groups_playoffs'; if (raw.includes('grupo')) return 'groups'; return ['single_elimination', 'groups', 'groups_playoffs'].includes(value) ? value : 'single_elimination'; }
  function updateActiveEventStatus() { if (!activeEventStatus) return; const event = selectedEvent(); const sourceLabel = selectedTeamSource() === 'registered' ? 'times inscritos/aprovados no evento' : 'todos os times cadastrados'; if (!event) { activeEventStatus.innerHTML = `🧭 <strong>Sem evento fixo.</strong> O chaveamento usa ${sourceLabel}.`; return; } const count = Array.isArray(event.registrations) ? event.registrations.length : (event.registeredCount || 0); activeEventStatus.innerHTML = `🏆 <strong>Evento em uso:</strong> ${safe(event.title || event.name || 'Evento')} • Origem: <strong>${safe(sourceLabel)}</strong> • ${count}/${event.teamLimit || 0} inscritos • ${safe(event.matchFormat || currentSettings.matchFormat || 'MD1')}`; }
  function applyEventToForm(event = null) { if (!event || !settingsForm) { updateActiveEventStatus(); return; } if (settingsForm.elements.tournamentName) settingsForm.elements.tournamentName.value = event.title || event.name || currentSettings.tournamentName || 'Rematch Championship'; if (settingsForm.elements.matchFormat && event.matchFormat) settingsForm.elements.matchFormat.value = event.matchFormat; if (settingsForm.elements.structure) settingsForm.elements.structure.value = normalizedStructure(event.structure || currentSettings.structure); if (settingsForm.elements.teamLimit && event.teamLimit) settingsForm.elements.teamLimit.value = String(normalizeLimit(event.teamLimit)); if (settingsForm.elements.groupCount && event.groupCount) settingsForm.elements.groupCount.value = String(event.groupCount); updateBoardLabels(); }
  function fillEventSelect(events = []) { currentEvents = Array.isArray(events) ? events : []; const field = settingsForm?.elements?.activeEventId; if (!field) return; const selected = String(currentSettings.activeEventId || ''); field.innerHTML = '<option value="">Sem evento fixo</option>' + currentEvents.map((event) => { const id = String(event.id || ''); const title = safe(event.title || event.name || 'Evento'); const count = Array.isArray(event.registrations) ? event.registrations.length : (event.registeredCount || 0); return `<option value="${safe(id)}">${title} • ${count}/${event.teamLimit || 0} inscritos</option>`; }).join(''); field.value = selected; updateActiveEventStatus(); }
  function collectSettingsSafe() { if (!settingsForm) return currentSettings; return { activeEventId: String(settingsForm.elements.activeEventId?.value || '').trim(), teamSource: selectedTeamSource(), tournamentName: String(settingsForm.elements.tournamentName?.value || 'Rematch Championship').trim(), matchFormat: settingsForm.elements.matchFormat?.value || 'MD1', structure: settingsForm.elements.structure?.value || 'single_elimination', teamLimit: normalizeLimit(settingsForm.elements.teamLimit?.value || 16), groupCount: Number(settingsForm.elements.groupCount?.value || 4), autoCreateMatchChannels: Boolean(settingsForm.elements.autoCreateMatchChannels?.checked), discordMatchCategoryId: String(settingsForm.elements.discordMatchCategoryId?.value || '').trim() }; }
  function collectSettings() { return collectSettingsSafe(); }
  function updateBoardLabels() { const nameEl = document.getElementById('boardTournamentName'); const formatEl = document.getElementById('boardMatchFormatLabel'); const settings = collectSettingsSafe(); if (nameEl) nameEl.textContent = settings.tournamentName || 'Rematch Championship'; if (formatEl) formatEl.textContent = `${settings.matchFormat || 'MD1'} • ${settings.teamLimit || 16} TIMES`; updateActiveEventStatus(); }
  function fillSettings(settings = {}) { currentSettings = { ...currentSettings, teamSource: 'all', ...(settings || {}), teamLimit: normalizeLimit(settings.teamLimit || currentSettings.teamLimit || 16) }; if (!settingsForm) return; fillEventSelect(currentEvents); Object.entries(currentSettings).forEach(([key, value]) => { const field = settingsForm.elements[key]; if (!field) return; if (field.type === 'checkbox') field.checked = value !== false; else field.value = value ?? ''; }); updateBoardLabels(); }
  function compactList(items = []) { return items.filter(Boolean).length; }
  function modelSlots(limit) { return VISUAL_ORDER.slice(0, Math.min(16, normalizeLimit(limit))); }
  function setHidden(el, hidden) { if (el) el.classList.toggle('is-model-hidden', Boolean(hidden)); }
  function applyBracketModel(limit, hasRound16 = false) {
    const model = normalizeLimit(limit);
    const board = document.querySelector('.bracket-board');
    if (board) board.dataset.bracketModel = String(model);
    const visibleSlots = model > 16 || hasRound16 ? VISUAL_ORDER : modelSlots(model);
    document.querySelectorAll('.team-slot[data-slot]').forEach((el) => setHidden(el, !visibleSlots.includes(Number(el.dataset.slot || 0))));
    document.querySelectorAll('.advance-slot[data-round="quarters"]').forEach((el) => { const idx = Number(el.dataset.index || 0); setHidden(el, model <= 8 || (model === 12 && idx > 5)); });
    document.querySelectorAll('.advance-slot[data-round="semis"]').forEach((el) => { const idx = Number(el.dataset.index || 0); setHidden(el, model === 4 ? ![0, 2].includes(idx) : model === 8 ? ![0, 1, 2, 3].includes(idx) : false); });
    document.querySelectorAll('.connector').forEach((el) => setHidden(el, model <= 8));
    document.querySelectorAll('.bracket-side').forEach((side) => {
      const top = side.querySelector('.top-label'); const mid = side.querySelector('.mid-label'); const final = side.querySelector('.final-label');
      if (model === 4) { if (top) top.textContent = 'Semifinal'; setHidden(mid, true); setHidden(final, true); }
      else if (model === 8) { if (top) top.textContent = 'Quartas'; if (mid) mid.textContent = 'Semifinal'; setHidden(mid, false); setHidden(final, true); }
      else { if (top) top.textContent = model > 16 ? 'Oitavas' : (model === 12 ? 'Entrada' : 'Oitavas'); if (mid) mid.textContent = 'Quartas'; if (final) final.textContent = 'Semifinal'; setHidden(mid, false); setHidden(final, false); }
    });
  }
  function visualBoardSlots() {
    const limit = boardLimit();
    const hasRound16 = currentBracket.round16.some(Boolean);
    if (limit > 16 && hasRound16) return currentBracket.round16;
    if ((currentBracket.slots || []).length >= 16 && limit === 16) return currentBracket.slots.slice(0, 16);
    const visual = Array(16).fill(null);
    const source = (currentBracket.slots || []).slice(0, Math.min(limit, 16));
    modelSlots(limit).forEach((slotIndex, index) => { visual[slotIndex] = source[index] || null; });
    return visual;
  }
  function fillSlots(selector, list, fallbackPrefix) { document.querySelectorAll(selector).forEach((el) => { const index = Number(el.dataset.slot ?? el.dataset.index ?? 0); const team = list?.[index] || null; el.classList.toggle('is-empty', !team); const fallback = `${fallbackPrefix} ${String(index + 1).padStart(2, '0')}`; el.innerHTML = teamLabel(team, fallback); el.title = team ? teamName(team, '') : ''; }); }
  function matchRows(_round, items = [], label = 'Rodada', showEmpty = false, size = null) { const rows = []; const total = size || items.length; for (let i = 0; i < total; i += 2) { const a = items[i]; const b = items[i + 1]; if (!showEmpty && !a && !b) continue; rows.push(`<div class="va-match-card"><strong>${safe(label)} ${String((i / 2) + 1).padStart(2, '0')}</strong><div class="va-match-team">${teamLabel(a, `Vaga ${i + 1}`)}</div><div class="va-match-team">${teamLabel(b, `Vaga ${i + 2}`)}</div></div>`); } return rows.join(''); }
  function renderAdaptive() {
    if (!adaptiveEl) return;
    const limit = boardLimit();
    if (limit <= 16) { adaptiveEl.innerHTML = `<div class="va-adaptive-round"><h3>Modelo ${limit} times</h3><p class="va-muted">Modelo fixo aplicado no chaveamento principal acima.</p><div class="va-match-grid">${matchRows('slots', currentBracket.slots, 'Entrada', true, limit)}${matchRows('quarters', currentBracket.quarters, 'Quartas') || ''}${matchRows('semis', currentBracket.semis, 'Semifinal') || ''}${matchRows('finals', currentBracket.finals, 'Final') || ''}</div></div>`; return; }
    const preliminaryTeamCount = Math.max(0, (limit - 16) * 2);
    const directTeams = (currentBracket.round16 || []).filter(Boolean);
    adaptiveEl.innerHTML = `<div class="va-adaptive-round"><h3>Modelo ${limit} times • Entrada</h3><p class="va-muted">Primeira rodada com ${preliminaryTeamCount} jogadores/times em disputa. Os vencedores completam as oitavas da árvore principal.</p><div class="va-kpi-row"><span class="va-badge">Limite: ${limit} times</span><span class="va-badge">Pré-rodada: ${preliminaryTeamCount} vagas</span><span class="va-badge">Direto nas oitavas: ${compactList(directTeams)}/${16 - (limit - 16)}</span></div><div class="va-match-grid va-prestage-grid">${matchRows('slots', (currentBracket.slots || []).slice(0, preliminaryTeamCount), 'Pré-rodada', true, preliminaryTeamCount)}</div></div><div class="va-adaptive-round"><h3>Classificados / byes</h3><div class="va-match-grid">${matchRows('round16', currentBracket.round16, 'Oitavas', true, 16)}${matchRows('quarters', currentBracket.quarters, 'Quartas') || ''}${matchRows('semis', currentBracket.semis, 'Semifinal') || ''}${matchRows('finals', currentBracket.finals, 'Final') || ''}</div></div>`;
  }
  function render(bracket = {}) {
    currentBracket = { slotSize: normalizeLimit(bracket.slotSize || bracket.teamLimit || currentSettings.teamLimit || 16), teamLimit: normalizeLimit(bracket.teamLimit || currentSettings.teamLimit || bracket.slotSize || 16), slots: Array.isArray(bracket.slots) ? bracket.slots : [], round16: Array.isArray(bracket.round16) ? bracket.round16 : [], quarters: Array.isArray(bracket.quarters) ? bracket.quarters : [], semis: Array.isArray(bracket.semis) ? bracket.semis : [], finals: Array.isArray(bracket.finals) ? bracket.finals : [], matchProgress: bracket.matchProgress || {}, eventId: bracket.eventId || '' };
    const limit = boardLimit(); const hasRound16 = currentBracket.round16.some(Boolean); applyBracketModel(limit, hasRound16);
    fillSlots('.team-slot[data-slot]', visualBoardSlots(), limit > 16 && !hasRound16 ? 'Pré-vaga' : 'Vaga');
    document.querySelectorAll('.advance-slot[data-round="quarters"]').forEach((el) => { const i = Number(el.dataset.index || 0); const team = currentBracket.quarters[i] || null; el.classList.toggle('is-empty', !team); el.innerHTML = teamLabel(team, `A definir ${String(i + 1).padStart(2, '0')}`); });
    document.querySelectorAll('.advance-slot[data-round="semis"]').forEach((el) => { const i = Number(el.dataset.index || 0); const team = currentBracket.semis[i] || null; el.classList.toggle('is-empty', !team); el.innerHTML = teamLabel(team, `A definir ${String(i + 1).padStart(2, '0')}`); });
    document.querySelectorAll('.final-slot[data-round="finals"]').forEach((el) => { const i = Number(el.dataset.index || 0); const team = currentBracket.finals[i] || null; el.classList.toggle('is-empty', !team); el.innerHTML = teamLabel(team, `Finalista ${String(i + 1).padStart(2, '0')}`); });
    renderAdaptive();
  }
  async function load() { setStatus('Carregando chaveamento do evento ativo...'); const data = await VoidArena.request('/api/dashboard/snapshot'); currentEvents = data.events || []; currentTeams = data.teams || []; fillSettings(data.settings || {}); render(data.bracket || {}); setStatus('Chaveamento carregado e persistido.', 'ok'); }
  async function saveSettings() { setStatus('Salvando configurações do torneio/evento...'); const payload = collectSettings(); const data = await VoidArena.request('/api/tournament/settings-v2', { method: 'PUT', body: JSON.stringify(payload) }); fillSettings(data.settings || payload); render({ ...currentBracket, teamLimit: payload.teamLimit, slotSize: payload.teamLimit }); setStatus(`Modelo ${payload.teamLimit} times salvo.`, 'ok'); return payload; }
  async function generate() { setStatus('Gerando chaveamento balanceado e sincronizando HUBs...'); try { const payload = await saveSettings(); const data = await VoidArena.request('/api/bracket/generate-v2', { method: 'POST', body: JSON.stringify(payload) }); fillSettings(data.settings || currentSettings); render(data.bracket || {}); const hubs = data.resultHubs; setStatus(hubs?.success === false ? `Chaveamento gerado, mas HUBs falharam: ${hubs.message}` : `Modelo ${payload.teamLimit} times aplicado usando ${data.sourceLabel || 'times selecionados'} e HUBs sincronizadas.`, hubs?.success === false ? 'err' : 'ok'); } catch (error) { setStatus(`❌ ${error.message}`, 'err'); } }
  async function syncHubs() { setStatus('Sincronizando HUBs pelo BOT...'); try { const data = await VoidArena.request('/api/result-hubs/sync', { method: 'POST', body: '{}' }); const result = data.resultHubs || {}; const detail = `${result.created || 0} criadas • ${result.reused || 0} atualizadas • ${result.totalMatches || 0} confrontos${result.errors?.length ? ` • ${result.errors.length} erro(s)` : ''}`; setStatus(result.success === false ? `HUBs não sincronizaram: ${result.message || detail}` : `HUBs sincronizadas: ${detail}.`, result.success === false || result.errors?.length ? 'err' : 'ok'); await load(); } catch (error) { setStatus(`❌ ${error.message}`, 'err'); } }
  function manualOption(team = null, selectedId = '') { if (!team) return `<option value=""${!selectedId ? ' selected' : ''}>Vazio</option>`; const id = teamId(team); return `<option value="${safe(id)}"${id === selectedId ? ' selected' : ''}>${safe(teamName(team, 'Time'))}${team.tag ? ` • ${safe(team.tag)}` : ''}</option>`; }
  function selectHtml(round, index, current) { const selectedId = teamId(current); const options = [manualOption(null, selectedId), ...currentTeams.map((team) => manualOption(team, selectedId))].join(''); return `<label>${safe(round)} ${index + 1}<select data-manual-round="${safe(round)}" data-manual-index="${index}">${options}</select></label>`; }
  function openManualEditor() { if (!manualModal || !manualBody) return; const limit = boardLimit(); const rounds = [['slots', 'Entrada/Vagas', currentBracket.slots, limit], ['round16', 'Oitavas', currentBracket.round16, 16], ['quarters', 'Quartas', currentBracket.quarters, 8], ['semis', 'Semifinal', currentBracket.semis, 4], ['finals', 'Final', currentBracket.finals, 2]]; manualBody.innerHTML = rounds.map(([key, label, arr, size]) => `<section class="va-manual-section"><h3>${label}</h3><div class="va-manual-fields">${Array.from({ length: size }, (_, index) => selectHtml(key, index, arr?.[index] || null)).join('')}</div></section>`).join(''); if (manualStatus) manualStatus.textContent = 'Ajuste os times e salve para atualizar o site e as HUBs.'; manualModal.hidden = false; }
  function closeManualEditor() { if (manualModal) manualModal.hidden = true; }
  function collectManualBracket() { const settings = collectSettings(); const limit = normalizeLimit(settings.teamLimit); const fill = (arr = [], size) => { const next = [...arr].map(teamId).slice(0, size); while (next.length < size) next.push(null); return next; }; const next = { slotSize: limit, teamLimit: limit, eventId: settings.activeEventId || currentBracket.eventId || '', slots: fill(currentBracket.slots, limit), round16: fill(currentBracket.round16, 16), quarters: fill(currentBracket.quarters, 8), semis: fill(currentBracket.semis, 4), finals: fill(currentBracket.finals, 2), matchProgress: currentBracket.matchProgress || {} }; document.querySelectorAll('[data-manual-round][data-manual-index]').forEach((select) => { const round = select.dataset.manualRound; const index = Number(select.dataset.manualIndex || 0); if (!Array.isArray(next[round])) next[round] = []; next[round][index] = select.value || null; }); return next; }
  async function saveManualEditor() { if (manualStatus) manualStatus.textContent = 'Salvando posições...'; try { const data = await VoidArena.request('/api/bracket', { method: 'PUT', body: JSON.stringify(collectManualBracket()) }); render(data.bracket || {}); closeManualEditor(); const hubs = data.resultHubs || {}; setStatus(`Posições salvas. HUBs: ${hubs.created || 0} criadas • ${hubs.reused || 0} atualizadas.`, hubs.errors?.length ? 'err' : 'ok'); } catch (error) { if (manualStatus) manualStatus.textContent = `❌ ${error.message}`; } }
  document.getElementById('reloadBracketBtn')?.addEventListener('click', load);
  document.getElementById('generateBracketBtn')?.addEventListener('click', generate);
  document.getElementById('saveSettingsBtn')?.addEventListener('click', saveSettings);
  document.getElementById('syncHubsBtn')?.addEventListener('click', syncHubs);
  document.getElementById('openManualEditorBtn')?.addEventListener('click', openManualEditor);
  document.getElementById('closeManualEditorBtn')?.addEventListener('click', closeManualEditor);
  document.getElementById('cancelManualEditorBtn')?.addEventListener('click', closeManualEditor);
  document.getElementById('saveManualEditorBtn')?.addEventListener('click', saveManualEditor);
  settingsForm?.elements?.activeEventId?.addEventListener('change', () => { applyEventToForm(selectedEvent()); });
  settingsForm?.elements?.teamSource?.addEventListener('change', updateActiveEventStatus);
  settingsForm?.addEventListener('input', () => { updateBoardLabels(); applyBracketModel(collectSettingsSafe().teamLimit); });
  VoidArena.bootLayout('chaveamento').then(load).catch((error) => setStatus(`❌ ${error.message}`, 'err'));
}());
