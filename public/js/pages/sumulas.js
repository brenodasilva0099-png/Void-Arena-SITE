(function () {
  'use strict';

  const VA = window.VoidArena;
  const $ = (id) => document.getElementById(id);
  const DEFAULT_LOGO = '/assets/hollow-nexus-official.svg';
  const MAX_SOURCE_BYTES = 12 * 1024 * 1024;
  const MAX_PROOF_CHARACTERS = 2500000;
  const STAT_FIELDS = [
    ['goals', 'G'],
    ['assists', 'A'],
    ['interceptions', 'I'],
    ['defenses', 'D'],
    ['passes', 'P']
  ];
  const STATUS = {
    pending: ['Aguardando validação', ''],
    partial: ['Envio parcial', ''],
    validated: ['Validada', 'is-validated'],
    conflict: ['Divergência', 'is-conflict'],
    rejected: ['Rejeitada', 'is-rejected']
  };

  const state = {
    canSubmit: false,
    isAdmin: false,
    currentUser: null,
    managedTeams: [],
    teams: [],
    events: [],
    results: [],
    selectedPlayers: new Set(),
    stats: {},
    proof: null,
    submitting: false
  };

  function escapeHtml(value = '') {
    return VA?.escapeHtml ? VA.escapeHtml(value) : String(value).replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    })[character]);
  }

  function imageUrl(value = '', fallback = DEFAULT_LOGO) {
    const raw = String(value || '').trim();
    if (/^https:\/\//i.test(raw) || /^data:image\/(?:png|jpe?g|webp);base64,/i.test(raw) || /^\//.test(raw)) {
      return raw;
    }
    return fallback;
  }

  function playerId(player = {}) {
    return String(player.discordId || player.userId || player.id || player.name || '');
  }

  function teamById(id = '') {
    return state.teams.find((team) => String(team.id) === String(id)) || null;
  }

  function currentTeams() {
    return {
      teamA: teamById($('teamAId')?.value),
      teamB: teamById($('teamBId')?.value)
    };
  }

  function playersFromCurrentMatch() {
    const { teamA, teamB } = currentTeams();
    return [...(teamA?.roster || []), ...(teamB?.roster || [])];
  }

  function selectedPlayerRecords() {
    const seen = new Set();
    return playersFromCurrentMatch().filter((player) => {
      const id = playerId(player);
      if (!id || seen.has(id) || !state.selectedPlayers.has(id)) return false;
      seen.add(id);
      return true;
    });
  }

  function setStatus(message = '', type = '') {
    const target = $('submitStatus');
    if (!target) return;
    target.textContent = message;
    target.className = `sumulas-submit-status${type ? ` ${type}` : ''}`;
  }

  function formatBytes(bytes = 0) {
    const value = Number(bytes || 0);
    if (!value) return 'imagem otimizada';
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
    return `${(value / 1024 / 1024).toFixed(1)} MB`;
  }

  function formatDate(value) {
    return VA?.formatDate ? VA.formatDate(value) : new Date(value).toLocaleString('pt-BR');
  }

  function option(value, label) {
    return `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`;
  }

  function populateSelectors() {
    const competition = $('competitionId');
    const teamA = $('teamAId');
    if (competition) {
      competition.innerHTML = option('', 'Selecione a competição') + option('__test__', 'Amistoso / teste') + state.events.map((event) => {
        const suffix = event.status === 'ended' || event.status === 'closed' ? ' · encerrada' : '';
        return option(event.id, `${event.name || event.title}${suffix}`);
      }).join('');
    }
    if (teamA) {
      teamA.innerHTML = option('', 'Selecione seu clube') + state.managedTeams.map((team) => option(team.id, `${team.name}${team.tag ? ` [${team.tag}]` : ''}`)).join('');
      teamA.disabled = !state.canSubmit;
    }
    updateOpponentSelector();
  }

  function updateOpponentSelector() {
    const ownId = $('teamAId')?.value || '';
    const target = $('teamBId');
    if (!target) return;
    target.innerHTML = option('', ownId ? 'Selecione o adversário' : 'Escolha primeiro seu clube') + state.teams
      .filter((team) => String(team.id) !== String(ownId))
      .map((team) => option(team.id, `${team.name}${team.tag ? ` [${team.tag}]` : ''}`))
      .join('');
    target.disabled = !ownId;
  }

  function avatarMarkup(player = {}) {
    const avatar = imageUrl(player.avatar, '');
    if (avatar) return `<img src="${escapeHtml(avatar)}" alt="" loading="lazy" />`;
    return escapeHtml((player.name || '?').slice(0, 1).toUpperCase());
  }

  function rosterMarkup(team = {}) {
    const roster = Array.isArray(team.roster) ? team.roster : [];
    if (!roster.length) return '<p class="sumulas-empty">Este clube ainda não possui jogadores vinculados.</p>';
    return roster.map((player) => {
      const id = playerId(player);
      const selected = state.selectedPlayers.has(id);
      return `<label class="sumulas-player-option${selected ? ' is-selected' : ''}">
        <input type="checkbox" data-player-select value="${escapeHtml(id)}" ${selected ? 'checked' : ''} />
        <span class="sumulas-player-avatar">${avatarMarkup(player)}</span>
        <span class="sumulas-player-copy"><strong>${escapeHtml(player.name || 'Jogador')}</strong><small>${escapeHtml(player.rosterRole || 'Elenco')}${player.discordId ? ' · Discord vinculado' : ''}</small></span>
        <i class="sumulas-linked-dot" title="Conta vinculada"></i>
      </label>`;
    }).join('');
  }

  function setTeamHeader(prefix, team, fallback) {
    const name = $(`${prefix}Name`);
    const logo = $(`${prefix}Logo`);
    if (name) name.textContent = team?.name || fallback;
    if (logo) {
      logo.innerHTML = team ? `<img src="${escapeHtml(imageUrl(team.logo))}" alt="" />` : escapeHtml(prefix === 'teamA' ? 'A' : 'B');
    }
  }

  function renderRosters() {
    const { teamA, teamB } = currentTeams();
    setTeamHeader('teamA', teamA, 'Seu clube');
    setTeamHeader('teamB', teamB, 'Adversário');
    $('teamARoster').innerHTML = teamA ? rosterMarkup(teamA) : '<p class="sumulas-empty">Escolha seu clube.</p>';
    $('teamBRoster').innerHTML = teamB ? rosterMarkup(teamB) : '<p class="sumulas-empty">Escolha o adversário.</p>';
    document.querySelectorAll('[data-player-select]').forEach((input) => {
      input.addEventListener('change', () => {
        if (input.checked) state.selectedPlayers.add(input.value);
        else state.selectedPlayers.delete(input.value);
        input.closest('.sumulas-player-option')?.classList.toggle('is-selected', input.checked);
        refreshParticipants();
      });
    });
    refreshParticipants();
  }

  function renderMvp() {
    const select = $('mvpId');
    const previous = select.value;
    const players = selectedPlayerRecords();
    select.innerHTML = option('', players.length ? 'Selecione o MVP' : 'Selecione primeiro os participantes') + players.map((player) => option(playerId(player), `${player.name} · ${player.rosterRole || 'Elenco'}`)).join('');
    if (players.some((player) => playerId(player) === previous)) select.value = previous;
    select.disabled = players.length === 0;
  }

  function renderStats() {
    const players = selectedPlayerRecords();
    const target = $('playerStatsList');
    if (!players.length) {
      target.innerHTML = '<p class="sumulas-empty">Selecione os participantes para liberar as estatísticas.</p>';
      return;
    }
    target.innerHTML = players.map((player) => {
      const id = playerId(player);
      state.stats[id] ||= {};
      return `<div class="sumulas-stat-row" data-stat-player="${escapeHtml(id)}">
        <div class="sumulas-stat-player"><span class="sumulas-player-avatar">${avatarMarkup(player)}</span><span><strong>${escapeHtml(player.name)}</strong><small>${escapeHtml(player.rosterRole || 'Elenco')}</small></span></div>
        ${STAT_FIELDS.map(([key, label]) => `<label title="${escapeHtml({ goals: 'Gols', assists: 'Assistências', interceptions: 'Interceptações', defenses: 'Defesas', passes: 'Passes' }[key])}"><span>${label}</span><input data-stat="${key}" type="number" min="0" max="999" inputmode="numeric" value="${Number(state.stats[id][key] || 0)}" /></label>`).join('')}
      </div>`;
    }).join('');
    target.querySelectorAll('[data-stat]').forEach((input) => {
      input.addEventListener('input', () => {
        const id = input.closest('[data-stat-player]')?.dataset.statPlayer;
        const value = Math.max(0, Math.min(999, Number(input.value || 0)));
        state.stats[id] ||= {};
        state.stats[id][input.dataset.stat] = Number.isFinite(value) ? Math.trunc(value) : 0;
      });
    });
  }

  function refreshParticipants() {
    for (const id of [...state.selectedPlayers]) {
      if (!playersFromCurrentMatch().some((player) => playerId(player) === id)) state.selectedPlayers.delete(id);
    }
    renderMvp();
    renderStats();
    updateReview();
  }

  function resetMatchSelection() {
    state.selectedPlayers.clear();
    state.stats = {};
    if ($('mvpId')) $('mvpId').value = '';
  }

  function selectAll(team) {
    if (!team?.roster?.length) return;
    const ids = team.roster.map(playerId).filter(Boolean);
    const allSelected = ids.every((id) => state.selectedPlayers.has(id));
    ids.forEach((id) => allSelected ? state.selectedPlayers.delete(id) : state.selectedPlayers.add(id));
    renderRosters();
  }

  function reviewState() {
    const { teamA, teamB } = currentTeams();
    const scoreA = Number($('scoreA')?.value);
    const scoreB = Number($('scoreB')?.value);
    return {
      match: Boolean(teamA && teamB && Number.isInteger(scoreA) && Number.isInteger(scoreB) && scoreA !== scoreB),
      players: selectedPlayerRecords().length > 0,
      mvp: Boolean($('mvpId')?.value && state.selectedPlayers.has($('mvpId').value)),
      proof: Boolean(state.proof?.dataUrl),
      bothTeams: (() => {
        const { teamA, teamB } = currentTeams();
        const selected = selectedPlayerRecords().map(playerId);
        return Boolean(
          teamA?.roster?.some((player) => selected.includes(playerId(player))) &&
          teamB?.roster?.some((player) => selected.includes(playerId(player)))
        );
      })()
    };
  }

  function updateReview() {
    const checks = reviewState();
    Object.entries(checks).forEach(([name, complete]) => document.querySelector(`[data-review="${name}"]`)?.classList.toggle('is-complete', complete));
    const competitionReady = Boolean($('competitionId')?.value && $('round')?.value);
    $('submitReportBtn').disabled = state.submitting || !(state.canSubmit && Object.values(checks).every(Boolean) && competitionReady);
    return !($('submitReportBtn').disabled);
  }

  function readAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
      reader.readAsDataURL(file);
    });
  }

  function loadImage(dataUrl) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('A imagem selecionada é inválida.'));
      image.src = dataUrl;
    });
  }

  async function optimizeProof(file) {
    if (!file || !/^image\/(?:png|jpeg|webp)$/i.test(file.type)) throw new Error('Use uma imagem PNG, JPG ou WEBP.');
    if (file.size > MAX_SOURCE_BYTES) throw new Error('A print original deve ter no máximo 12 MB.');
    const source = await readAsDataUrl(file);
    const image = await loadImage(source);
    let maxSide = 1800;
    let quality = 0.86;
    let output = '';
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      canvas.getContext('2d', { alpha: false }).drawImage(image, 0, 0, canvas.width, canvas.height);
      output = canvas.toDataURL('image/webp', quality);
      if (output.length <= MAX_PROOF_CHARACTERS) break;
      maxSide = Math.round(maxSide * 0.82);
      quality = Math.max(0.56, quality - 0.09);
    }
    if (!output || output.length > MAX_PROOF_CHARACTERS) throw new Error('Não foi possível otimizar esta print. Recorte a imagem e tente novamente.');
    return {
      dataUrl: output,
      name: String(file.name || `comprovante-${Date.now()}.webp`).replace(/\.[^.]+$/, '') + '.webp',
      type: 'image/webp',
      size: Math.round((output.length - output.indexOf(',') - 1) * 0.75),
      originalSize: file.size
    };
  }

  async function receiveProof(file) {
    try {
      setStatus('Otimizando a print sem perder a leitura do placar...');
      state.proof = await optimizeProof(file);
      $('proofImage').src = state.proof.dataUrl;
      $('proofName').textContent = state.proof.name;
      $('proofMeta').textContent = `${formatBytes(state.proof.size)} · WEBP otimizado`;
      $('proofPreview').hidden = false;
      $('proofDropzone').hidden = true;
      setStatus('Comprovante pronto para envio.', 'success');
      updateReview();
    } catch (error) {
      setStatus(error.message, 'error');
    }
  }

  function removeProof() {
    state.proof = null;
    $('proofFile').value = '';
    $('proofImage').removeAttribute('src');
    $('proofPreview').hidden = true;
    $('proofDropzone').hidden = false;
    updateReview();
  }

  function proofFromClipboard(event) {
    const item = [...(event.clipboardData?.items || [])].find((entry) => entry.type.startsWith('image/'));
    if (!item) return;
    event.preventDefault();
    const file = item.getAsFile();
    if (file) receiveProof(new File([file], `print-colada-${Date.now()}.${file.type.includes('png') ? 'png' : 'jpg'}`, { type: file.type }));
  }

  function playerStatsPayload() {
    return Object.fromEntries(selectedPlayerRecords().map((player) => {
      const id = playerId(player);
      return [id, Object.fromEntries(STAT_FIELDS.map(([key]) => [key, Math.max(0, Math.min(999, Math.trunc(Number(state.stats[id]?.[key] || 0))))]))];
    }));
  }

  async function submitReport(event) {
    event.preventDefault();
    updateReview();
    if ($('submitReportBtn').disabled || state.submitting) return;
    const payload = {
      competitionId: $('competitionId').value,
      competitionName: $('competitionId').selectedOptions[0]?.textContent?.replace(/ · encerrada$/, '') || '',
      round: $('round').value,
      teamAId: $('teamAId').value,
      teamBId: $('teamBId').value,
      game: $('game').value,
      scoreA: Number($('scoreA').value),
      scoreB: Number($('scoreB').value),
      participantIds: selectedPlayerRecords().map(playerId),
      mvpId: $('mvpId').value,
      playerStats: playerStatsPayload(),
      proof: state.proof.dataUrl,
      proofName: state.proof.name,
      proofType: state.proof.type,
      proofSize: state.proof.size,
      notes: $('notes').value
    };
    state.submitting = true;
    updateReview();
    setStatus('Enviando a print ao Discord e registrando a súmula...');
    try {
      const data = await VA.request('/api/match-reports', {
        method: 'POST',
        body: JSON.stringify(payload),
        timeoutMs: 45000
      });
      state.results.unshift(data.report);
      setStatus(data.message || 'Súmula enviada com sucesso.', 'success');
      renderMetrics();
      renderHistory();
      setTimeout(() => {
        resetForm();
        switchView('history');
        $('historyView')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 700);
    } catch (error) {
      setStatus(error.message, 'error');
    } finally {
      state.submitting = false;
      updateReview();
    }
  }

  function resetForm() {
    $('matchReportForm').reset();
    resetMatchSelection();
    removeProof();
    updateOpponentSelector();
    renderRosters();
  }

  function normalizeStatus(value = '') {
    const status = String(value || 'pending').toLowerCase();
    return STATUS[status] ? status : 'pending';
  }

  function reportTeams(report = {}) {
    return {
      teamA: report.match?.teamA || report.teamA || {},
      teamB: report.match?.teamB || report.teamB || {}
    };
  }

  function reportScore(report = {}, side = 'A') {
    const direct = Number(report[`score${side}`]);
    if (Number.isFinite(direct)) return direct;
    const final = Number(report[`finalScore${side}`]);
    if (Number.isFinite(final)) return final;
    return '—';
  }

  function teamVisual(team = {}) {
    const logo = imageUrl(team.logo, '');
    return logo ? `<img src="${escapeHtml(logo)}" alt="" loading="lazy" />` : `<span>${escapeHtml((team.tag || team.name || '?').slice(0, 2).toUpperCase())}</span>`;
  }

  function reportSearchText(report = {}) {
    const { teamA, teamB } = reportTeams(report);
    return [
      report.competitionName, report.round, report.game, teamA.name, teamA.tag, teamB.name, teamB.tag,
      report.submittedBy?.name, report.mvp?.name,
      ...(report.participants || []).map((player) => player.name)
    ].filter(Boolean).join(' ').toLocaleLowerCase('pt-BR');
  }

  function participantList(report = {}) {
    const players = Array.isArray(report.participants) ? report.participants : [];
    if (!players.length) return '<p>Nenhum participante registrado.</p>';
    return `<ul>${players.map((player) => `<li>${escapeHtml(player.name || 'Jogador')} <small>· ${escapeHtml(player.rosterRole || 'elenco')}</small></li>`).join('')}</ul>`;
  }

  function statsList(report = {}) {
    const rows = Array.isArray(report.playerStats) ? report.playerStats : [];
    if (!rows.length) return '<p>Nenhuma estatística individual registrada.</p>';
    return `<ul>${rows.map((player) => `<li><strong>${escapeHtml(player.name || 'Jogador')}</strong>: G ${Number(player.goals || 0)} · A ${Number(player.assists || 0)} · I ${Number(player.interceptions || 0)} · D ${Number(player.defenses || 0)} · P ${Number(player.passes || 0)}</li>`).join('')}</ul>`;
  }

  function adminActions(report = {}) {
    if (!state.isAdmin) return '';
    const id = escapeHtml(report.id || report.messageId || report.hubId || '');
    return `<div class="sumulas-admin-actions">
      <button class="hnl-btn primary" type="button" data-report-status="validated" data-report-id="${id}">Validar súmula</button>
      <button class="hnl-btn danger" type="button" data-report-status="rejected" data-report-id="${id}">Rejeitar</button>
      <button class="hnl-btn" type="button" data-report-status="pending" data-report-id="${id}">Voltar para análise</button>
    </div>`;
  }

  function historyCard(report = {}) {
    const { teamA, teamB } = reportTeams(report);
    const status = normalizeStatus(report.status);
    const [statusLabel, statusClass] = STATUS[status];
    const proof = imageUrl(typeof report.proof === 'string' ? report.proof : report.proof?.url, '');
    const stableProof = report.discordChannelId && report.discordMessageId && report.id
      ? `/api/match-reports/${encodeURIComponent(report.id)}/proof`
      : proof;
    const proofMarkup = stableProof
      ? `<a href="${escapeHtml(stableProof)}" target="_blank" rel="noopener"><img src="${escapeHtml(stableProof)}" alt="Comprovante da partida" loading="lazy" /></a>`
      : '<span>Comprovante indisponível para este registro antigo.</span>';
    return `<article class="sumulas-history-card" data-report-card>
      <header class="sumulas-history-card-head">
        <div><strong>${escapeHtml(report.competitionName || 'Amistoso / teste')}</strong><small>${escapeHtml(report.round || 'Fase não informada')}${report.game ? ` · ${escapeHtml(report.game)}` : ''} · ${escapeHtml(formatDate(report.createdAt || report.updatedAt))}</small></div>
        <span class="sumulas-status ${statusClass}">${escapeHtml(statusLabel)}</span>
      </header>
      <div class="sumulas-history-card-body">
        <div class="sumulas-match-score">
          <div class="sumulas-match-team">${teamVisual(teamA)}<strong>${escapeHtml(teamA.name || 'Time A')}</strong></div>
          <div class="sumulas-score-box"><strong>${escapeHtml(reportScore(report, 'A'))} × ${escapeHtml(reportScore(report, 'B'))}</strong><small>placar informado</small></div>
          <div class="sumulas-match-team">${teamVisual(teamB)}<strong>${escapeHtml(teamB.name || 'Time B')}</strong></div>
        </div>
        <div class="sumulas-history-proof">${proofMarkup}</div>
      </div>
      <details class="sumulas-history-details">
        <summary>Ver participantes, MVP e estatísticas</summary>
        <div class="sumulas-history-detail-grid">
          <div><h4>Participantes (${Number(report.participants?.length || 0)})</h4>${participantList(report)}</div>
          <div><h4>Estatísticas</h4>${statsList(report)}</div>
          <div><h4>Controle</h4><p><strong>MVP:</strong> ${escapeHtml(report.mvp?.name || 'Não informado')}</p><p><strong>Enviado por:</strong> ${escapeHtml(report.submittedBy?.name || report.submissions?.[0]?.authorName || 'Registro do sistema')}</p>${report.notes ? `<p><strong>Observação:</strong> ${escapeHtml(report.notes)}</p>` : ''}${report.validationNote ? `<p><strong>Análise:</strong> ${escapeHtml(report.validationNote)}</p>` : ''}${adminActions(report)}</div>
        </div>
      </details>
    </article>`;
  }

  function filteredReports() {
    const search = String($('reportSearch')?.value || '').trim().toLocaleLowerCase('pt-BR');
    const status = $('reportStatusFilter')?.value || '';
    const order = $('reportOrder')?.value || 'newest';
    return state.results.filter((report) => (!search || reportSearchText(report).includes(search)) && (!status || normalizeStatus(report.status) === status)).sort((a, b) => {
      const difference = new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
      return order === 'oldest' ? -difference : difference;
    });
  }

  function renderHistory() {
    const reports = filteredReports();
    $('historyCount').textContent = `${reports.length} ${reports.length === 1 ? 'envio' : 'envios'}`;
    $('reportsHistory').innerHTML = reports.length ? reports.map(historyCard).join('') : '<div class="sumulas-empty">Nenhuma súmula corresponde aos filtros selecionados.</div>';
    $('reportsHistory').querySelectorAll('[data-report-status]').forEach((button) => button.addEventListener('click', () => updateReportStatus(button)));
  }

  function renderMetrics() {
    const total = state.results.length;
    const pending = state.results.filter((report) => ['pending', 'partial', 'conflict'].includes(normalizeStatus(report.status))).length;
    const validated = state.results.filter((report) => normalizeStatus(report.status) === 'validated').length;
    const withProof = state.results.filter((report) => Boolean(typeof report.proof === 'string' ? report.proof : report.proof?.url)).length;
    $('metricTotal').textContent = total;
    $('metricPending').textContent = pending;
    $('metricValidated').textContent = validated;
    $('metricProof').textContent = withProof;
  }

  async function updateReportStatus(button) {
    const status = button.dataset.reportStatus;
    const label = STATUS[status]?.[0] || status;
    if (!window.confirm(`Confirmar: ${label}?`)) return;
    const note = status === 'pending' ? '' : window.prompt('Observação da organização (opcional):', '') || '';
    button.disabled = true;
    try {
      const data = await VA.request(`/api/match-reports/${encodeURIComponent(button.dataset.reportId)}/status`, {
        method: 'PATCH', body: JSON.stringify({ status, note }), timeoutMs: 15000
      });
      const index = state.results.findIndex((report) => [report.id, report.messageId, report.hubId].map(String).includes(String(button.dataset.reportId)));
      if (index >= 0) state.results[index] = data.report;
      renderMetrics();
      renderHistory();
    } catch (error) {
      window.alert(error.message);
      button.disabled = false;
    }
  }

  function switchView(view) {
    document.querySelectorAll('[data-view]').forEach((panel) => { panel.hidden = panel.dataset.view !== view; });
    document.querySelectorAll('[data-view-tab]').forEach((tab) => {
      const active = tab.dataset.viewTab === view;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    if (view === 'history') renderHistory();
  }

  async function reloadHistory() {
    const button = $('reloadReportsBtn');
    button.disabled = true;
    try {
      const data = await VA.request('/api/match-reports', { timeoutMs: 20000 });
      state.results = data.results || [];
      renderMetrics();
      renderHistory();
    } catch (error) {
      $('reportsHistory').innerHTML = `<div class="sumulas-notice is-error">${escapeHtml(error.message)}</div>`;
    } finally {
      button.disabled = false;
    }
  }

  function bindEvents() {
    document.querySelectorAll('[data-view-tab], [data-open-view]').forEach((button) => button.addEventListener('click', () => switchView(button.dataset.viewTab || button.dataset.openView)));
    $('teamAId').addEventListener('change', () => {
      resetMatchSelection();
      updateOpponentSelector();
      renderRosters();
      updateReview();
    });
    $('teamBId').addEventListener('change', () => {
      resetMatchSelection();
      renderRosters();
      updateReview();
    });
    ['competitionId', 'round', 'scoreA', 'scoreB', 'mvpId'].forEach((id) => $(id).addEventListener('input', updateReview));
    $('selectAllTeamA').addEventListener('click', () => selectAll(currentTeams().teamA));
    $('selectAllTeamB').addEventListener('click', () => selectAll(currentTeams().teamB));
    $('proofDropzone').addEventListener('click', () => $('proofFile').click());
    $('proofFile').addEventListener('change', () => $('proofFile').files?.[0] && receiveProof($('proofFile').files[0]));
    $('removeProof').addEventListener('click', removeProof);
    ['dragenter', 'dragover'].forEach((type) => $('proofDropzone').addEventListener(type, (event) => { event.preventDefault(); $('proofDropzone').classList.add('is-dragging'); }));
    ['dragleave', 'drop'].forEach((type) => $('proofDropzone').addEventListener(type, (event) => { event.preventDefault(); $('proofDropzone').classList.remove('is-dragging'); }));
    $('proofDropzone').addEventListener('drop', (event) => event.dataTransfer?.files?.[0] && receiveProof(event.dataTransfer.files[0]));
    document.addEventListener('paste', proofFromClipboard);
    $('matchReportForm').addEventListener('submit', submitReport);
    ['reportSearch', 'reportStatusFilter', 'reportOrder'].forEach((id) => $(id).addEventListener(id === 'reportSearch' ? 'input' : 'change', renderHistory));
    $('reloadReportsBtn').addEventListener('click', reloadHistory);
  }

  async function boot() {
    if (!VA?.bootLayout || !VA?.request) throw new Error('O cliente do site não foi carregado.');
    await VA.bootLayout('sumulas');
    bindEvents();
    try {
      const data = await VA.request('/api/match-reports/bootstrap', { timeoutMs: 25000 });
      Object.assign(state, {
        canSubmit: Boolean(data.canSubmit),
        isAdmin: Boolean(data.isAdmin),
        currentUser: data.currentUser || null,
        managedTeams: data.managedTeams || [],
        teams: data.teams || [],
        events: data.events || [],
        results: data.results || []
      });
      populateSelectors();
      renderRosters();
      renderMetrics();
      renderHistory();
      if (!state.canSubmit) {
        const notice = $('reportPermissionNotice');
        notice.hidden = false;
        notice.innerHTML = '<strong>Nenhum clube gerenciável encontrado.</strong><span>Somente administradores, criadores, diretores e capitães vinculados podem enviar uma súmula. Você ainda pode consultar todos os envios.</span>';
      }
      updateReview();
    } catch (error) {
      const notice = $('reportPermissionNotice');
      notice.hidden = false;
      notice.classList.add('is-error');
      notice.textContent = error.message;
      $('matchReportForm').querySelectorAll('input, select, textarea, button').forEach((element) => { element.disabled = true; });
      $('reportsHistory').innerHTML = `<div class="sumulas-notice is-error">${escapeHtml(error.message)}</div>`;
    }
  }

  document.addEventListener('DOMContentLoaded', () => boot().catch((error) => {
    const main = document.querySelector('.sumulas-main');
    if (main) main.insertAdjacentHTML('afterbegin', `<div class="sumulas-notice is-error">${escapeHtml(error.message)}</div>`);
  }));
}());
