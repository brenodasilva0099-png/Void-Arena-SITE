(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const esc = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));

  async function request(url, options = {}) {
    const response = await fetch(url, {
      credentials: 'include',
      cache: 'no-store',
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {})
      }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) throw new Error(data.message || `Falha (${response.status}).`);
    return data;
  }

  function notice(message, type = 'info') {
    return `<div class="hnl-notice ${esc(type)}">${esc(message)}</div>`;
  }

  function setupClubInvite() {
    if (!location.pathname.endsWith('/perfil-clube.html')) return false;
    const manage = $('#editar-clube');
    if (!manage) return false;

    const headings = Array.from(manage.querySelectorAll('h3'));
    const heading = headings.find((item) => /convidar jogador|convite por link|link reutilizável/i.test(item.textContent || ''));
    if (!heading) return false;

    const grid = heading.nextElementSibling;
    if (!(grid instanceof HTMLElement)) return false;
    if (grid.dataset.stableInviteReady === '1') return true;

    grid.dataset.stableInviteReady = '1';
    heading.textContent = 'Link reutilizável do clube';
    grid.innerHTML = `
      <div class="hnl-field full">
        <p class="frm-muted">Gere um único link e envie para quantos jogadores precisar. Cada jogador abre logado, aceita e entra no elenco.</p>
      </div>
      <div class="hnl-field">
        <label>Vaga</label>
        <select class="hnl-select" id="stableInviteSlot">
          <option value="player">Titular</option>
          <option value="reserve">Reserva</option>
        </select>
      </div>
      <div class="hnl-field full">
        <label>Mensagem</label>
        <textarea class="hnl-textarea" id="stableInviteNote" placeholder="Mensagem opcional para os jogadores"></textarea>
      </div>
      <div class="hnl-actions full">
        <button class="hnl-btn primary" id="stableGenerateInvite" type="button">Gerar link reutilizável</button>
      </div>
      <div class="hnl-field full" id="stableInviteResult"></div>`;

    $('#stableGenerateInvite')?.addEventListener('click', async () => {
      const button = $('#stableGenerateInvite');
      const resultBox = $('#stableInviteResult');
      const params = new URLSearchParams(location.search);
      const teamId = params.get('id') || manage.dataset.teamId || '';
      if (!teamId) {
        if (resultBox) resultBox.innerHTML = notice('Não consegui identificar o clube.', 'error');
        return;
      }

      if (button) button.disabled = true;
      try {
        const data = await request(`/api/teams/${encodeURIComponent(teamId)}/invite-link`, {
          method: 'POST',
          body: JSON.stringify({
            rosterSlot: $('#stableInviteSlot')?.value || 'player',
            note: $('#stableInviteNote')?.value || ''
          })
        });
        const link = String(data.inviteUrl || '');
        if (resultBox) resultBox.innerHTML = `
          ${notice('Link criado. Envie para todos os jogadores que devem entrar.', 'success')}
          <label style="display:block;margin-top:10px">Link do convite</label>
          <input class="hnl-input" id="stableInviteLink" readonly value="${esc(link)}">
          <div class="hnl-actions" style="margin-top:10px">
            <button class="hnl-btn primary" id="stableCopyInvite" type="button">Copiar link</button>
            <a class="hnl-btn" href="${esc(link)}" target="_blank" rel="noopener">Abrir link</a>
          </div>`;
        $('#stableCopyInvite')?.addEventListener('click', async () => {
          try { await navigator.clipboard.writeText(link); }
          catch { $('#stableInviteLink')?.select(); document.execCommand('copy'); }
          const copy = $('#stableCopyInvite');
          if (copy) copy.textContent = 'Copiado';
        });
      } catch (error) {
        if (resultBox) resultBox.innerHTML = notice(error.message, 'error');
      } finally {
        if (button) button.disabled = false;
      }
    });

    return true;
  }

  async function setupInvitePage() {
    if (!location.pathname.endsWith('/convite-time.html')) return;
    const token = new URLSearchParams(location.search).get('token') || '';
    const status = $('#teamInviteStatus');
    const details = $('#teamInviteDetails');
    const actions = $('#teamInviteActions');
    if (!token || !status || !details || !actions) return;

    try {
      const data = await request(`/api/team-invites/${encodeURIComponent(token)}`);
      const team = data.team || {};
      const invite = data.invite || {};
      status.innerHTML = notice('Convite válido.', 'success');
      details.innerHTML = `
        <div class="hnl-profile-row" style="margin-top:12px">
          ${team.logo ? `<img class="hnl-avatar" src="${esc(team.logo)}" alt="Logo">` : ''}
          <div><h2>${esc(team.name || 'Clube')} ${team.tag ? `[${esc(team.tag)}]` : ''}</h2>
          <p>Entrada como <strong>${invite.rosterSlot === 'reserve' ? 'Reserva' : 'Titular'}</strong>.</p>
          ${invite.note ? `<p>${esc(invite.note)}</p>` : ''}
          <p>Este link pode ser usado por vários jogadores até expirar.</p></div>
        </div>`;
      actions.hidden = false;

      $('#acceptTeamInvite')?.addEventListener('click', async () => {
        try {
          const result = await request(`/api/team-invites/${encodeURIComponent(token)}/accept`, { method: 'POST', body: '{}' });
          status.innerHTML = notice(result.message || 'Você entrou no elenco.', 'success');
          actions.hidden = true;
        } catch (error) { status.innerHTML = notice(error.message, 'error'); }
      }, { once: true });

      $('#rejectTeamInvite')?.addEventListener('click', async () => {
        try {
          const result = await request(`/api/team-invites/${encodeURIComponent(token)}/reject`, { method: 'POST', body: '{}' });
          status.innerHTML = notice(result.message || 'Convite recusado.', 'info');
          actions.hidden = true;
        } catch (error) { status.innerHTML = notice(error.message, 'error'); }
      }, { once: true });
    } catch (error) {
      status.innerHTML = notice(error.message, 'error');
      actions.hidden = true;
    }
  }

  function boot() {
    setupInvitePage();
    if (setupClubInvite()) return;
    const observer = new MutationObserver(() => {
      if (setupClubInvite()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 15000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
