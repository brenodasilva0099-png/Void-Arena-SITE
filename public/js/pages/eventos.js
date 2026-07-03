(async function () {
  const list = document.getElementById('eventsList');
  const st = document.getElementById('eventsStatus');
  const modal = document.getElementById('eventRegisterModal');
  const form = document.getElementById('eventRegisterForm');
  const title = document.getElementById('eventRegisterTitle');
  const info = document.getElementById('eventRegisterInfo');
  const registerStatus = document.getElementById('eventRegisterStatus');
  let events = [];
  let teams = [];

  function esc(value) { return VoidArena.escapeHtml(value || ''); }
  function setStatus(message, type = '') { st.textContent = message; st.className = `va-status ${type}`.trim(); }
  function setRegisterStatus(message, type = '') { registerStatus.textContent = message; registerStatus.className = `va-status ${type}`.trim(); }
  function count(event) { return Array.isArray(event.registrations) ? event.registrations.length : Number(event.registeredCount || 0) || 0; }
  function statusLabel(status = '') {
    const map = { open: 'Aberto', closed: 'Fechado', running: 'Em andamento', finished: 'Finalizado' };
    return map[status] || status || 'Aberto';
  }
  function statusClass(status = '') {
    if (status === 'open') return 'ok';
    if (status === 'running') return 'warn';
    if (status === 'finished') return 'err';
    return '';
  }

  function eventCard(event) {
    const registered = count(event);
    const limit = Number(event.teamLimit || 0) || 0;
    const available = event.status === 'open' && (!limit || registered < limit);
    const description = event.description || 'Evento oficial da Void Arena com inscrição por capitão, validação da organização e sincronização com o Discord.';
    return `<article class="va-event-card" data-event-id="${esc(event.id)}">
      <div class="va-event-topline"><span class="va-badge ${statusClass(event.status)}">${esc(statusLabel(event.status))}</span><span class="va-muted">${registered}/${limit || '?'} times</span></div>
      <div class="va-event-main"><div class="va-event-icon">🏆</div><div><h3>${esc(event.title || event.name || 'Evento')}</h3><p>${esc(description)}</p></div></div>
      <div class="va-kpi-row"><span class="va-badge">${esc(event.matchFormat || 'MD1')}</span><span class="va-badge">${esc(event.mode || event.structure || 'Mata-mata')}</span><span class="va-badge">Início: ${esc(event.startAt || 'a definir')}</span></div>
      <div class="va-event-progress"><span style="width:${limit ? Math.min(100, (registered / limit) * 100) : 0}%"></span></div>
      <div class="va-actions"><button class="va-btn primary" type="button" data-register-event="${esc(event.id)}" ${available ? '' : 'disabled'}>${available ? 'Inscrever meu time' : 'Inscrições indisponíveis'}</button></div>
    </article>`;
  }

  async function fetchJson(path) {
    const response = await fetch(path, { credentials: 'include', cache: 'no-store' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) throw new Error(data.message || `Falha na requisição (${response.status}).`);
    return data;
  }

  async function loadTeams() {
    try {
      const data = await VoidArena.request('/api/teams');
      return data.teams || [];
    } catch {
      const data = await fetchJson('/debug/public/teams');
      return data.teams || [];
    }
  }

  function openRegister(eventId) {
    const event = events.find((item) => String(item.id) === String(eventId));
    if (!event || !modal || !form) return;
    form.elements.eventId.value = event.id;
    title.textContent = `Inscrever em ${event.title || event.name || 'evento'}`;
    info.textContent = `${count(event)}/${event.teamLimit || '?'} times inscritos • ${event.matchFormat || 'MD1'} • ${statusLabel(event.status)}`;
    form.elements.teamId.innerHTML = '<option value="">Selecione seu time</option>' + teams.map((team) => `<option value="${esc(team.id)}">${esc(team.name)} ${team.tag ? `(${esc(team.tag)})` : ''}</option>`).join('');
    setRegisterStatus(teams.length ? 'Escolha o time que você criou ou representa.' : 'Nenhum time encontrado. Crie um time antes de inscrever.');
    modal.hidden = false;
  }

  function closeRegister() {
    if (modal) modal.hidden = true;
  }

  async function render() {
    const data = await fetchJson('/api/events');
    events = (data.events || []).sort((a, b) => (a.status === 'open' ? -1 : 1) - (b.status === 'open' ? -1 : 1));
    teams = await loadTeams();
    list.innerHTML = events.length ? events.map(eventCard).join('') : '<div class="va-item">Nenhum evento cadastrado no momento.</div>';
    list.querySelectorAll('[data-register-event]').forEach((btn) => btn.addEventListener('click', () => openRegister(btn.dataset.registerEvent)));
    setStatus(events.length ? `Eventos carregados: ${events.length}.` : 'Nenhum evento disponível agora.', events.length ? 'ok' : '');
  }

  modal?.addEventListener('click', (event) => { if (event.target === modal || event.target.closest('[data-event-close]')) closeRegister(); });
  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const eventId = form.elements.eventId.value;
    const teamId = form.elements.teamId.value;
    if (!teamId) return setRegisterStatus('Selecione um time.', 'err');
    setRegisterStatus('Enviando inscrição...');
    try {
      const data = await VoidArena.request(`/api/events/${encodeURIComponent(eventId)}/register`, { method: 'POST', body: JSON.stringify({ teamId }) });
      setRegisterStatus(data.alreadyRegistered ? 'Esse time já estava inscrito.' : 'Inscrição enviada. Agora aguarde a validação da organização.', 'ok');
      await render();
    } catch (error) {
      setRegisterStatus(`Erro na inscrição: ${error.message}`, 'err');
    }
  });

  try {
    await VoidArena.bootLayout('eventos');
    await render();
  } catch (e) { setStatus(`❌ ${e.message}`, 'err'); }
}());
