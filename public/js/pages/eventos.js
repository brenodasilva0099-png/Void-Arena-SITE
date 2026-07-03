(async function () {
  const list = document.getElementById('eventsList');
  const st = document.getElementById('eventsStatus');
  const modal = document.getElementById('eventRegisterModal');
  const form = document.getElementById('eventRegisterForm');
  const title = document.getElementById('eventRegisterTitle');
  const info = document.getElementById('eventRegisterInfo');
  const registerStatus = document.getElementById('eventRegisterStatus');
  const settingsModal = document.getElementById('eventSettingsModal');
  const settingsForm = document.getElementById('eventSettingsForm');
  const settingsTitle = document.getElementById('eventSettingsTitle');
  const settingsStatus = document.getElementById('eventSettingsStatus');
  let events = [];
  let teams = [];

  function esc(value) { return VoidArena.escapeHtml(value || ''); }
  function setStatus(message, type = '') { st.textContent = message; st.className = `va-status ${type}`.trim(); }
  function setRegisterStatus(message, type = '') { registerStatus.textContent = message; registerStatus.className = `va-status ${type}`.trim(); }
  function setSettingsStatus(message, type = '') { settingsStatus.textContent = message; settingsStatus.className = `va-status ${type}`.trim(); }
  function count(event) { return Array.isArray(event.registrations) ? event.registrations.length : Number(event.registeredCount || 0) || 0; }
  function statusLabel(status = '') { return ({ open: 'Aberto', closed: 'Fechado', running: 'Em andamento', finished: 'Finalizado' })[status] || status || 'Aberto'; }
  function statusClass(status = '') { if (status === 'open') return 'ok'; if (status === 'running') return 'warn'; if (status === 'finished') return 'err'; return ''; }
  function feeText(event) { return event.isFree || !String(event.entryFee || event.registrationFee || '').trim() ? 'F2P' : String(event.entryFee || event.registrationFee); }
  function dtToInput(value = '') {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value).slice(0, 16);
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function eventCard(event) {
    const registered = count(event);
    const limit = Number(event.teamLimit || 0) || 0;
    const available = event.status === 'open' && (!limit || registered < limit);
    const description = event.description || 'Evento oficial da Void Arena com inscrição por capitão, validação no Discord e aprovação da organização.';
    const reward = event.reward || event.prize || 'A definir';
    return `<article class="va-event-card" data-event-id="${esc(event.id)}">
      <div class="va-event-topline"><span class="va-badge ${statusClass(event.status)}">${esc(statusLabel(event.status))}</span><span class="va-muted">${registered}/${limit || '?'} times</span><button class="va-icon-btn" type="button" data-config-event="${esc(event.id)}" title="Configurar evento">⚙️</button></div>
      <div class="va-event-main"><div class="va-event-icon">🏆</div><div><h3>${esc(event.title || event.name || 'Evento')}</h3><p>${esc(description)}</p></div></div>
      <div class="va-kpi-row"><span class="va-badge">${esc(event.matchFormat || 'MD1')}</span><span class="va-badge">${esc(event.mode || event.structure || 'Mata-mata')}</span><span class="va-badge">Início: ${esc(event.startAt || 'a definir')}</span><span class="va-badge">Taxa: ${esc(feeText(event))}</span><span class="va-badge">Recompensa: ${esc(reward)}</span></div>
      <div class="va-event-progress"><span style="width:${limit ? Math.min(100, (registered / limit) * 100) : 0}%"></span></div>
      <div class="va-actions"><button class="va-btn primary" type="button" data-register-event="${esc(event.id)}" ${available ? '' : 'disabled'}>${available ? 'Enviar inscrição para validação' : 'Inscrições indisponíveis'}</button></div>
    </article>`;
  }

  async function fetchJson(path) {
    const response = await fetch(path, { credentials: 'include', cache: 'no-store' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) throw new Error(data.message || `Falha na requisição (${response.status}).`);
    return data;
  }

  async function loadTeams() {
    try { const data = await VoidArena.request('/api/teams'); return data.teams || []; }
    catch { const data = await fetchJson('/debug/public/teams'); return data.teams || []; }
  }

  function openRegister(eventId) {
    const event = events.find((item) => String(item.id) === String(eventId));
    if (!event || !modal || !form) return;
    form.elements.eventId.value = event.id;
    title.textContent = `Inscrever em ${event.title || event.name || 'evento'}`;
    info.textContent = `${count(event)}/${event.teamLimit || '?'} times aceitos • ${event.matchFormat || 'MD1'} • ${statusLabel(event.status)} • ${feeText(event)}`;
    form.elements.teamId.innerHTML = '<option value="">Selecione seu time</option>' + teams.map((team) => `<option value="${esc(team.id)}">${esc(team.name)} ${team.tag ? `(${esc(team.tag)})` : ''}</option>`).join('');
    setRegisterStatus(teams.length ? 'A inscrição cria um pedido no canal de validação do Discord. O time só entra no evento após aprovação.' : 'Nenhum time encontrado. Crie um time antes de inscrever.');
    modal.hidden = false;
  }

  function closeRegister() { if (modal) modal.hidden = true; }

  function openSettings(eventId) {
    const event = events.find((item) => String(item.id) === String(eventId));
    if (!event || !settingsModal || !settingsForm) return;
    settingsTitle.textContent = `Editar ${event.title || event.name || 'evento'}`;
    settingsForm.elements.eventId.value = event.id;
    settingsForm.elements.title.value = event.title || event.name || '';
    settingsForm.elements.startAt.value = dtToInput(event.startAt || '');
    settingsForm.elements.status.value = event.status || 'open';
    settingsForm.elements.matchFormat.value = event.matchFormat || 'MD1';
    settingsForm.elements.structure.value = event.structure || 'single_elimination';
    settingsForm.elements.mode.value = event.mode || '';
    settingsForm.elements.teamLimit.value = String(event.teamLimit || 16);
    settingsForm.elements.reward.value = event.reward || event.prize || '';
    settingsForm.elements.entryFee.value = event.entryFee || event.registrationFee || '';
    settingsForm.elements.isFree.checked = event.isFree === true || !String(event.entryFee || event.registrationFee || '').trim();
    settingsForm.elements.paymentInstructions.value = event.paymentInstructions || '';
    settingsForm.elements.description.value = event.description || '';
    setSettingsStatus('');
    settingsModal.hidden = false;
  }

  function closeSettings() { if (settingsModal) settingsModal.hidden = true; }

  async function render() {
    const data = await fetchJson('/api/events');
    events = (data.events || []).sort((a, b) => (a.status === 'open' ? -1 : 1) - (b.status === 'open' ? -1 : 1));
    teams = await loadTeams();
    list.innerHTML = events.length ? events.map(eventCard).join('') : '<div class="va-item">Nenhum evento cadastrado no momento.</div>';
    list.querySelectorAll('[data-register-event]').forEach((btn) => btn.addEventListener('click', () => openRegister(btn.dataset.registerEvent)));
    list.querySelectorAll('[data-config-event]').forEach((btn) => btn.addEventListener('click', () => openSettings(btn.dataset.configEvent)));
    setStatus(events.length ? `Eventos carregados: ${events.length}.` : 'Nenhum evento disponível agora.', events.length ? 'ok' : '');
  }

  modal?.addEventListener('click', (event) => { if (event.target === modal || event.target.closest('[data-event-close]')) closeRegister(); });
  settingsModal?.addEventListener('click', (event) => { if (event.target === settingsModal || event.target.closest('[data-event-settings-close]')) closeSettings(); });
  settingsForm?.elements?.isFree?.addEventListener('change', () => { if (settingsForm.elements.isFree.checked) settingsForm.elements.entryFee.value = ''; });
  settingsForm?.elements?.entryFee?.addEventListener('input', () => { if (settingsForm.elements.entryFee.value.trim()) settingsForm.elements.isFree.checked = false; });

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const eventId = form.elements.eventId.value;
    const teamId = form.elements.teamId.value;
    if (!teamId) return setRegisterStatus('Selecione um time.', 'err');
    setRegisterStatus('Enviando pedido para o canal de validação do Discord...');
    try {
      const data = await VoidArena.request(`/api/events/${encodeURIComponent(eventId)}/register`, { method: 'POST', body: JSON.stringify({ teamId }) });
      setRegisterStatus(data.alreadyRegistered ? 'Esse time já está aceito no evento.' : data.alreadyPending ? 'Esse time já tem validação pendente no Discord.' : 'Pedido enviado para validação no Discord. Aguarde a staff aprovar antes do time entrar no evento.', 'ok');
      await render();
    } catch (error) { setRegisterStatus(`Erro na inscrição: ${error.message}`, 'err'); }
  });

  settingsForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const eventId = settingsForm.elements.eventId.value;
    const body = {
      title: settingsForm.elements.title.value,
      startAt: settingsForm.elements.startAt.value,
      status: settingsForm.elements.status.value,
      matchFormat: settingsForm.elements.matchFormat.value,
      structure: settingsForm.elements.structure.value,
      mode: settingsForm.elements.mode.value,
      teamLimit: Number(settingsForm.elements.teamLimit.value || 16),
      reward: settingsForm.elements.reward.value,
      entryFee: settingsForm.elements.isFree.checked ? '' : settingsForm.elements.entryFee.value,
      isFree: settingsForm.elements.isFree.checked,
      paymentInstructions: settingsForm.elements.paymentInstructions.value,
      description: settingsForm.elements.description.value
    };
    setSettingsStatus('Salvando definições...');
    try {
      await VoidArena.request(`/api/events/${encodeURIComponent(eventId)}`, { method: 'PUT', body: JSON.stringify(body) });
      setSettingsStatus('Definições salvas.', 'ok');
      await render();
      setTimeout(closeSettings, 600);
    } catch (error) { setSettingsStatus(`Erro ao salvar: ${error.message}`, 'err'); }
  });

  try { await VoidArena.bootLayout('eventos'); await render(); } catch (e) { setStatus(`❌ ${e.message}`, 'err'); }
}());
