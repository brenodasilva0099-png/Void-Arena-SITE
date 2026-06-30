(async function () {
  const list = document.getElementById('teamsList');
  const st = document.getElementById('teamsStatus');
  function esc(v) { return VoidArena.escapeHtml(v || ''); }
  function logo(team) {
    return `<div class="va-team-logo">${team.logo ? `<img src="${esc(team.logo)}" alt="Logo ${esc(team.name)}" />` : esc((team.tag || team.name || '?').slice(0, 2).toUpperCase())}</div>`;
  }
  function playerRow(player, kind) {
    const cap = player.isCaptain ? '<span class="va-badge ok">👑 Capitão</span>' : '';
    const acc = player.discordId ? `<span class="va-muted">Discord: ${esc(player.discordId)}</span>` : (player.account ? `<span class="va-muted">${esc(player.account)}</span>` : '');
    return `<div class="va-player-row" data-player-id="${esc(player.id || player.discordId || '')}"><span>${kind} ${esc(player.name)} ${cap}</span><span>${acc}</span></div>`;
  }
  function openTeam(team) {
    let overlay = document.getElementById('teamProfileOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'teamProfileOverlay';
      overlay.className = 'va-modal-shell';
      overlay.hidden = true;
      document.body.appendChild(overlay);
      overlay.addEventListener('click', (event) => { if (event.target === overlay || event.target.closest('[data-team-close]')) overlay.hidden = true; });
    }
    overlay.innerHTML = `<div class="va-modal-card">
      <div class="va-modal-head"><div><p class="va-eyebrow">Perfil público do time</p><h2>${esc(team.name)} ${team.tag ? `<span class="va-muted">(${esc(team.tag)})</span>` : ''}</h2><p class="va-muted">Capitão: ${esc(team.captainName || team.ownerName || 'não definido')}</p></div><button class="va-modal-close" type="button" data-team-close>×</button></div>
      <div class="va-team-card-head">${logo(team)}<div><strong>${esc(team.name)}</strong><p class="va-muted">Titulares: ${(team.playerDetails || team.players || []).length} • Reservas: ${(team.reserveDetails || team.reserves || []).length}</p></div></div>
      <h3>Titulares</h3><div class="va-team-roster">${(team.playerDetails || []).map((p) => playerRow(p, '⚽')).join('') || '<div class="va-player-row">Nenhum titular detalhado.</div>'}</div>
      <h3>Reservas</h3><div class="va-team-roster">${(team.reserveDetails || []).map((p) => playerRow(p, '🧤')).join('') || '<div class="va-player-row">Nenhum reserva.</div>'}</div>
      <div class="va-kpi-row">${team.socials?.discord ? `<a class="va-mini-link" href="${esc(team.socials.discord)}" target="_blank" rel="noreferrer">Discord</a>` : ''}${team.socials?.youtube ? `<a class="va-mini-link" href="${esc(team.socials.youtube)}" target="_blank" rel="noreferrer">YouTube</a>` : ''}${team.socials?.instagram ? `<a class="va-mini-link" href="${esc(team.socials.instagram)}" target="_blank" rel="noreferrer">Instagram</a>` : ''}</div>
    </div>`;
    overlay.hidden = false;
  }
  function card(team) {
    const players = team.playerDetails || [];
    const reserves = team.reserveDetails || [];
    return `<article class="va-team-card" data-team-id="${esc(team.id)}">
      <div class="va-team-card-head">${logo(team)}<div><strong>${esc(team.name)} ${team.tag ? `(${esc(team.tag)})` : ''}</strong><div class="va-muted">Capitão: ${esc(team.captainName || team.ownerName || 'não definido')}</div></div></div>
      <div class="va-kpi-row"><span class="va-badge">Titulares ${players.length || (team.players || []).length}</span><span class="va-badge">Reservas ${reserves.length || (team.reserves || []).length}</span><span class="va-badge">Perfil público</span></div>
    </article>`;
  }
  try {
    await VoidArena.bootLayout('times');
    const data = await VoidArena.request('/api/teams');
    const teams = data.teams || [];
    list.innerHTML = teams.length ? teams.map(card).join('') : '<div class="va-item">Nenhum time cadastrado.</div>';
    list.querySelectorAll('[data-team-id]').forEach((el) => {
      el.addEventListener('click', () => openTeam(teams.find((team) => String(team.id) === String(el.dataset.teamId))));
    });
    st.textContent = 'Times carregados. Clique em um time para abrir o perfil público.';
    st.className = 'va-status ok';
  } catch (e) { st.textContent = `❌ ${e.message}`; st.className = 'va-status err'; }
}());
