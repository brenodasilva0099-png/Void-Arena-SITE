(function () {
  const params = new URLSearchParams(location.search);
  const token = String(params.get('token') || '').trim();
  const status = document.getElementById('teamInviteStatus');
  const details = document.getElementById('teamInviteDetails');
  const actions = document.getElementById('teamInviteActions');
  const acceptBtn = document.getElementById('acceptTeamInvite');
  const rejectBtn = document.getElementById('rejectTeamInvite');

  function esc(value = '') {
    return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
  }

  async function request(pathname, options = {}) {
    const response = await fetch(pathname, {
      credentials: 'include',
      cache: 'no-store',
      headers: { Accept: 'application/json', ...(options.headers || {}) },
      ...options
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) {
      const next = `${location.pathname}${location.search}`;
      location.assign(`/auth/discord?next=${encodeURIComponent(next)}`);
      throw new Error('Faça login com Discord para continuar.');
    }
    if (!response.ok || data.success === false) throw new Error(data.message || `HTTP ${response.status}`);
    return data;
  }

  async function load() {
    if (!token) throw new Error('Link de convite inválido.');
    const data = await request(`/api/team-invites/${encodeURIComponent(token)}?t=${Date.now()}`);
    const invite = data.invite || {};
    const team = data.team || {};
    status.textContent = 'Convite válido.';
    status.className = 'va-status ok';
    details.innerHTML = `<div class="hnl-profile-row" style="margin-top:14px"><img class="hnl-club-logo" src="${esc(team.logo || '/assets/hollow-nexus-official.svg')}" alt="Logo"><div><h2>${esc(team.name || 'Clube')} ${team.tag ? `[${esc(team.tag)}]` : ''}</h2><p>Vaga: <strong>${invite.rosterSlot === 'reserve' ? 'Reserva' : 'Titular'}</strong></p>${invite.note ? `<p>${esc(invite.note)}</p>` : ''}<small>Expira em ${invite.expiresAt ? new Date(invite.expiresAt).toLocaleString('pt-BR') : 'breve'}</small></div></div>`;
    actions.hidden = false;
  }

  async function act(action) {
    acceptBtn.disabled = true;
    rejectBtn.disabled = true;
    status.textContent = action === 'accept' ? 'Entrando no clube...' : 'Recusando convite...';
    try {
      const data = await request(`/api/team-invites/${encodeURIComponent(token)}/${action}`, { method: 'POST' });
      status.textContent = data.message || (action === 'accept' ? 'Você entrou no clube.' : 'Convite recusado.');
      status.className = 'va-status ok';
      actions.hidden = true;
      if (action === 'accept' && data.team?.id) {
        setTimeout(() => location.assign(`/pages/perfil-clube.html?id=${encodeURIComponent(data.team.id)}`), 700);
      }
    } catch (error) {
      status.textContent = error.message;
      status.className = 'va-status err';
      acceptBtn.disabled = false;
      rejectBtn.disabled = false;
    }
  }

  acceptBtn.addEventListener('click', () => act('accept'));
  rejectBtn.addEventListener('click', () => act('reject'));
  load().catch((error) => {
    status.textContent = error.message;
    status.className = 'va-status err';
    actions.hidden = true;
  });
}());