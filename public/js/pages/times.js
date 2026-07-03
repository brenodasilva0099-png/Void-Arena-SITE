(async function () {
  const list = document.getElementById('teamsList');
  const st = document.getElementById('teamsStatus');

  function setStatus(message, type = '') {
    if (!st) return;
    st.textContent = message;
    st.className = `va-status ${type}`.trim();
  }

  function esc(v) {
    return (window.VoidArena?.escapeHtml || ((value) => String(value || '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[char]))))(v || '');
  }

  function logo(team) {
    const label = esc((team.tag || team.name || '?').slice(0, 2).toUpperCase());
    return `<div class="va-team-logo">${team.logo ? `<img src="${esc(team.logo)}" alt="Logo ${esc(team.name)}" />` : label}</div>`;
  }

  function playerRow(player, kind) {
    const name = typeof player === 'string' ? player : (player?.name || player?.account || 'Jogador');
    const discordId = typeof player === 'object' ? (player.discordId || '') : '';
    const account = typeof player === 'object' ? (player.account || '') : '';
    const cap = player?.isCaptain ? '<span class="va-badge ok">👑 Capitão</span>' : '';
    const acc = discordId ? `<span class="va-muted">Discord: ${esc(discordId)}</span>` : (account ? `<span class="va-muted">${esc(account)}</span>` : '');
    return `<div class="va-player-row" data-player-id="${esc(player?.id || discordId || '')}"><span>${kind} ${esc(name)} ${cap}</span><span>${acc}</span></div>`;
  }

  function teamPlayers(team, key, fallbackKey) {
    const detailed = Array.isArray(team[key]) ? team[key] : [];
    if (detailed.length) return detailed;
    return Array.isArray(team[fallbackKey]) ? team[fallbackKey].map((name) => ({ name })) : [];
  }

  function openTeam(team) {
    if (!team) return;
    let overlay = document.getElementById('teamProfileOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'teamProfileOverlay';
      overlay.className = 'va-modal-shell';
      overlay.hidden = true;
      document.body.appendChild(overlay);
      overlay.addEventListener('click', (event) => {
        if (event.target === overlay || event.target.closest('[data-team-close]')) overlay.hidden = true;
      });
    }

    const players = teamPlayers(team, 'playerDetails', 'players');
    const reserves = teamPlayers(team, 'reserveDetails', 'reserves');

    overlay.innerHTML = `<div class="va-modal-card">
      <div class="va-modal-head"><div><p class="va-eyebrow">Perfil público do time</p><h2>${esc(team.name)} ${team.tag ? `<span class="va-muted">(${esc(team.tag)})</span>` : ''}</h2><p class="va-muted">Capitão: ${esc(team.captainName || team.ownerName || 'não definido')}</p></div><button class="va-modal-close" type="button" data-team-close>×</button></div>
      <div class="va-team-card-head">${logo(team)}<div><strong>${esc(team.name)}</strong><p class="va-muted">Titulares: ${players.length} • Reservas: ${reserves.length}</p></div></div>
      <h3>Titulares</h3><div class="va-team-roster">${players.map((p) => playerRow(p, '⚽')).join('') || '<div class="va-player-row">Nenhum titular detalhado.</div>'}</div>
      <h3>Reservas</h3><div class="va-team-roster">${reserves.map((p) => playerRow(p, '🧤')).join('') || '<div class="va-player-row">Nenhum reserva.</div>'}</div>
      <div class="va-kpi-row">${team.socials?.discord ? `<a class="va-mini-link" href="${esc(team.socials.discord)}" target="_blank" rel="noreferrer">Discord</a>` : ''}${team.socials?.youtube ? `<a class="va-mini-link" href="${esc(team.socials.youtube)}" target="_blank" rel="noreferrer">YouTube</a>` : ''}${team.socials?.instagram ? `<a class="va-mini-link" href="${esc(team.socials.instagram)}" target="_blank" rel="noreferrer">Instagram</a>` : ''}</div>
    </div>`;
    overlay.hidden = false;
  }

  function card(team) {
    const players = teamPlayers(team, 'playerDetails', 'players');
    const reserves = teamPlayers(team, 'reserveDetails', 'reserves');
    return `<article class="va-team-card" data-team-id="${esc(team.id)}">
      <div class="va-team-card-head">${logo(team)}<div><strong>${esc(team.name)} ${team.tag ? `(${esc(team.tag)})` : ''}</strong><div class="va-muted">Capitão: ${esc(team.captainName || team.ownerName || 'não definido')}</div></div></div>
      <div class="va-kpi-row"><span class="va-badge">Titulares ${players.length}</span><span class="va-badge">Reservas ${reserves.length}</span><span class="va-badge">Perfil público</span></div>
    </article>`;
  }

  async function requestJson(path) {
    const response = await fetch(path, { credentials: 'include', cache: 'no-store' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) throw new Error(data.message || `Falha na requisição (${response.status}).`);
    return data;
  }

  async function loadTeams() {
    try {
      return await VoidArena.request('/api/teams');
    } catch (primaryError) {
      const fallback = await requestJson('/debug/public/teams');
      fallback.fallbackReason = primaryError.message;
      return fallback;
    }
  }

  try {
    setStatus('Carregando layout e times...');
    if (window.VoidArena?.bootLayout) {
      await VoidArena.bootLayout('times').catch((error) => {
        console.warn('Layout carregou com fallback:', error.message);
      });
    }

    const data = await loadTeams();
    const teams = Array.isArray(data.teams) ? data.teams : [];
    list.innerHTML = teams.length ? teams.map(card).join('') : '<div class="va-item">Nenhum time cadastrado.</div>';
    list.querySelectorAll('[data-team-id]').forEach((el) => {
      el.addEventListener('click', () => openTeam(teams.find((team) => String(team.id) === String(el.dataset.teamId))));
    });
    setStatus(teams.length ? `Times carregados: ${teams.length}. Clique em um time para abrir o perfil público.` : 'Nenhum time cadastrado.', teams.length ? 'ok' : 'err');
  } catch (e) {
    if (list) list.innerHTML = '<div class="va-item">Não foi possível carregar os times.</div>';
    setStatus(`❌ ${e.message}`, 'err');
  }
}());
