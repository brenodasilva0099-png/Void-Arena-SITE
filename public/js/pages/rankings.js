(async function () {
  const teamTable = document.getElementById('teamRankingTable');
  const playerTable = document.getElementById('playerRankingTable');
  const statusEl = document.getElementById('rankingStatus');
  const eventFilter = document.getElementById('rankingEventFilter');
  const esc = (value) => VoidArena.escapeHtml(value ?? '');
  let teamsCache = [];

  function n(value) { const number = Number(value || 0); return Number.isFinite(number) ? number : 0; }
  function pct(wins, played) { return played ? Math.round((wins / played) * 1000) / 10 : 0; }
  function teamLogo(team = {}, sizeClass = '') {
    if (team.logo) return `<span class="va-rank-logo ${sizeClass}"><img src="${esc(team.logo)}" alt="${esc(team.name || team.tag || 'Time')}" /></span>`;
    return `<span class="va-rank-logo ${sizeClass}">${esc((team.tag || team.name || 'T').slice(0, 2).toUpperCase())}</span>`;
  }
  function socialIcon(key) { return { discord: '💬', instagram: '📸', youtube: '▶️', tiktok: '🎵', steam: '🎮', xbox: '🟢', website: '🌐', twitter: '𝕏', spotify: '🎧', riot: '🔥', ea: '🎯', psn: '🎮' }[String(key).toLowerCase()] || '🔗'; }
  function socialLabel(key) { return { discord: 'Discord', instagram: 'Instagram', youtube: 'YouTube', tiktok: 'TikTok', steam: 'Steam', xbox: 'Xbox', website: 'Site', twitter: 'Twitter/X', spotify: 'Spotify', riot: 'Riot ID', ea: 'EA ID', psn: 'PSN' }[String(key).toLowerCase()] || key; }
  function socialHref(key, value = '') {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    if (/^discord\.gg\//i.test(raw)) return `https://${raw}`;
    if (key === 'tiktok') return `https://www.tiktok.com/@${raw.replace(/^@/, '')}`;
    if (key === 'instagram') return `https://instagram.com/${raw.replace(/^@/, '')}`;
    if (key === 'twitter') return `https://x.com/${raw.replace(/^@/, '')}`;
    if (key === 'steam' && /^\d{16,20}$/.test(raw)) return `https://steamcommunity.com/profiles/${raw}`;
    return '';
  }
  function connectionCards(socials = {}) {
    const entries = Object.entries(socials || {}).filter(([, v]) => String(v || '').trim());
    if (!entries.length) return '<p class="va-muted">Nenhuma conexão pública cadastrada.</p>';
    return `<div class="va-connections-grid va-social-card-grid">${entries.map(([key, value]) => {
      const raw = String(value || '').trim(); const href = socialHref(key, raw);
      const inner = `<span class="va-social-card-icon">${socialIcon(key)}</span><span class="va-social-card-body"><strong>${socialLabel(key)}</strong><small>${esc(raw)}</small></span><span class="va-social-card-arrow">↗</span>`;
      return href ? `<a class="va-social-card" href="${esc(href)}" target="_blank" rel="noreferrer">${inner}</a>` : `<div class="va-social-card">${inner}</div>`;
    }).join('')}</div>`;
  }
  function normalizeResult(result = {}) {
    const match = result.match || {}; const teamA = match.teamA || result.teamA || {}; const teamB = match.teamB || result.teamB || {}; const games = Array.isArray(result.games) ? result.games : [];
    let goalsA = n(result.goalsA ?? result.totalGoalsA); let goalsB = n(result.goalsB ?? result.totalGoalsB);
    if (!goalsA && !goalsB && games.length) games.forEach((game) => { if (game.status && game.status !== 'validated') return; goalsA += n(game.finalScoreA ?? game.scoreA); goalsB += n(game.finalScoreB ?? game.scoreB); });
    if (!goalsA && !goalsB) { goalsA = n(result.finalScoreA); goalsB = n(result.finalScoreB); }
    return { teamA, teamB, goalsA, goalsB, winnerTeamId: String(result.winnerTeamId || ''), eventId: String(result.eventId || match.eventId || result.tournamentEventId || '').trim(), status: String(result.status || '').toLowerCase() };
  }
  function emptyTeam(team = {}) { return { id: String(team.id || ''), raw: team, name: team.name || team.tag || 'Time', tag: team.tag || '', played: 0, wins: 0, draws: 0, losses: 0, goals: 0, assists: 0, passes: 0, defenses: 0, mvp: 0, interceptions: 0, goalsAgainst: 0, cleanSheets: 0, vap: 0 }; }
  function computeTeams(teams = [], results = [], selectedEventId = '') {
    const map = new Map(); teams.forEach((team) => map.set(String(team.id), emptyTeam(team)));
    const ensure = (team = {}) => { const id = String(team.id || ''); if (!id) return null; if (!map.has(id)) map.set(id, emptyTeam(team)); return map.get(id); };
    results.map(normalizeResult).filter((r) => !selectedEventId || r.eventId === selectedEventId || !r.eventId).forEach((r) => {
      if (r.status !== 'validated' && !r.winnerTeamId) return; const a = ensure(r.teamA); const b = ensure(r.teamB); if (!a || !b) return;
      const draw = !r.winnerTeamId && r.goalsA === r.goalsB; a.played += 1; b.played += 1; a.goals += r.goalsA; b.goals += r.goalsB; a.goalsAgainst += r.goalsB; b.goalsAgainst += r.goalsA;
      if (r.goalsB === 0 && r.goalsA > 0) { a.cleanSheets += 1; a.defenses += 1; }
      if (r.goalsA === 0 && r.goalsB > 0) { b.cleanSheets += 1; b.defenses += 1; }
      if (draw) { a.draws += 1; b.draws += 1; }
      else if (r.winnerTeamId === a.id) { a.wins += 1; b.losses += 1; a.mvp += 1; }
      else if (r.winnerTeamId === b.id) { b.wins += 1; a.losses += 1; b.mvp += 1; }
    });
    map.forEach((row) => { row.assists = Math.max(0, Math.floor(row.goals * 0.6)); row.passes = row.played ? (row.played * 12) + (row.goals * 3) : 0; row.interceptions = row.played ? (row.played * 4) + row.cleanSheets : 0; row.winRate = pct(row.wins, row.played); row.goalDifference = row.goals - row.goalsAgainst; row.vap = Math.round(((row.wins * 3) + row.draws + (row.goals * 0.5) + row.cleanSheets + (row.played ? 2 : 0)) * 10) / 10; });
    return Array.from(map.values()).sort((a, b) => b.vap - a.vap || b.winRate - a.winRate || b.wins - a.wins || b.goalDifference - a.goalDifference || b.goals - a.goals || a.name.localeCompare(b.name));
  }
  function playersFromTeams(teamRows = []) {
    const rows = [];
    teamRows.forEach((team) => {
      const details = Array.isArray(team.raw.playerDetails) && team.raw.playerDetails.length ? team.raw.playerDetails : (Array.isArray(team.raw.players) ? team.raw.players.map((name, i) => ({ name, discordId: team.raw.playerAccounts?.players?.[i] || '' })) : []);
      const reserves = Array.isArray(team.raw.reserveDetails) && team.raw.reserveDetails.length ? team.raw.reserveDetails : (Array.isArray(team.raw.reserves) ? team.raw.reserves.map((name, i) => ({ name, discordId: team.raw.playerAccounts?.reserves?.[i] || '' })) : []);
      [...details.map((p) => [p, 'Titular']), ...reserves.map((p) => [p, 'Reserva'])].forEach(([player, role], index) => {
        const safeName = String(player?.name || player || '').trim(); if (!safeName) return; const share = index < details.length ? 1 : 0.45; const total = Math.max(1, details.length + reserves.length);
        rows.push({ id: player?.id || '', discordId: player?.discordId || '', name: safeName, team: team.name, teamId: team.id, role, passes: Math.round(team.passes * share / total), goals: Math.round(team.goals * share / Math.max(1, details.length)), assists: Math.round(team.assists * share / Math.max(1, details.length)), defenses: role === 'Reserva' ? 0 : Math.round(team.defenses * share / Math.max(1, details.length)), mvp: index === 0 ? team.mvp : 0, interceptions: Math.round(team.interceptions * share / total), points: Math.round((team.vap * share / total) * 10) / 10 });
      });
    });
    return rows.sort((a, b) => b.points - a.points || b.goals - a.goals || a.name.localeCompare(b.name));
  }
  function publicTeamOverlay(team, players) {
    return `<div class="va-modal-card va-public-profile-card va-team-public-card"><button class="va-modal-close va-floating-close" data-rank-close type="button">×</button><div class="va-public-banner va-team-public-banner">${team.logo ? `<img src="${esc(team.logo)}" alt="" />` : ''}</div><div class="va-public-head"><div class="va-public-team-logo">${team.logo ? `<img src="${esc(team.logo)}" alt="Logo ${esc(team.name)}" />` : esc((team.tag || team.name || 'T').slice(0,2).toUpperCase())}</div><div><p class="va-eyebrow">Perfil público do time</p><h2>${esc(team.name)} ${team.tag ? `<span class="va-muted">(${esc(team.tag)})</span>` : ''}</h2><p class="va-muted">Capitão: <button class="va-link-button va-profile-public-link" data-user-open="${esc(team.ownerUserId || team.captainDiscordId || '')}">${esc(team.captainName || team.ownerName || 'não definido')}</button></p><div class="va-kpi-row"><span class="va-badge">Titulares ${(team.playerDetails || []).length}</span><span class="va-badge">Reservas ${(team.reserveDetails || []).length}</span><span class="va-badge">${esc(team.tag || 'TIME')}</span></div></div></div><div class="va-public-section"><h3>Conexões</h3>${connectionCards(team.socials)}</div><div class="va-public-section"><h3>Elenco</h3><div class="va-team-roster">${players.map((p) => `<button class="va-player-row as-button" data-user-open="${esc(p.id || p.discordId || '')}">⚽ ${esc(p.name || 'Jogador')}<span class="va-muted">${esc(p.discordId || '')}</span></button>`).join('') || '<div class="va-player-row">Nenhum jogador detalhado.</div>'}</div></div></div>`;
  }
  async function openTeam(teamId) {
    const data = await VoidArena.request(`/api/teams/${encodeURIComponent(teamId)}/public`); const team = data.team;
    let overlay = document.getElementById('rankingPublicOverlay'); if (!overlay) { overlay = document.createElement('div'); overlay.id = 'rankingPublicOverlay'; overlay.className = 'va-modal-shell'; document.body.appendChild(overlay); overlay.addEventListener('click', (e) => { if (e.target === overlay || e.target.closest('[data-rank-close]')) overlay.hidden = true; }); }
    const players = [...(team.playerDetails || []), ...(team.reserveDetails || [])]; overlay.innerHTML = publicTeamOverlay(team, players); overlay.querySelectorAll('[data-user-open]').forEach((b) => b.addEventListener('click', () => openUser(b.dataset.userOpen))); overlay.hidden = false;
  }
  async function openUser(userId) {
    if (!userId) return; const data = await VoidArena.request(`/api/users/${encodeURIComponent(userId)}/public`); const user = data.user;
    let overlay = document.getElementById('rankingUserOverlay'); if (!overlay) { overlay = document.createElement('div'); overlay.id = 'rankingUserOverlay'; overlay.className = 'va-modal-shell'; document.body.appendChild(overlay); overlay.addEventListener('click', (e) => { if (e.target === overlay || e.target.closest('[data-user-close]')) overlay.hidden = true; }); }
    const p = user.profile || {}; const name = p.username || user.name || 'Jogador'; const banner = p.banner || p.discordBanner || ''; const socials = { discord: user.discordId ? `<@${user.discordId}>` : '', ...(user.socials || {}) };
    overlay.innerHTML = `<div class="va-modal-card va-public-profile-card"><button class="va-modal-close va-floating-close" data-user-close type="button">×</button><div class="va-public-banner" style="${banner ? `background-image:linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.72)),url('${esc(banner)}')` : ''}"></div><div class="va-public-head"><div class="va-profile-page-avatar va-public-avatar">${user.avatar ? `<img src="${esc(user.avatar)}" alt="Avatar" />` : esc(name.slice(0,1).toUpperCase())}</div><div><p class="va-eyebrow">Perfil público do jogador</p><h2>${esc(name)}</h2><p class="va-muted">${esc([p.country, p.region || p.competitiveRegion, p.primaryPosition].filter(Boolean).join(' • ') || user.discordId || '')}</p></div></div><div class="va-public-section"><h3>Conexões</h3>${connectionCards(socials)}</div>${p.bio ? `<div class="va-public-section"><h3>Bio</h3><p class="va-muted">${esc(p.bio)}</p></div>` : ''}</div>`;
    overlay.hidden = false;
  }
  function renderTeams(rows = []) {
    teamTable.innerHTML = '<thead><tr><th>#</th><th>Time</th><th class="num">VAP</th><th class="num">J</th><th class="num">V</th><th class="num">E</th><th class="num">D</th><th>Win-rate</th><th class="num">Gols</th><th class="num">Assist.</th><th class="num">Defesas</th><th class="num">MVP</th><th class="num">Intercep.</th></tr></thead><tbody>' + (rows.length ? rows.map((row, i) => `<tr data-team-open="${esc(row.id)}"><td class="va-rank-pos">#${i + 1}</td><td><button class="va-rank-entity as-button" type="button">${teamLogo(row.raw, 'large')}<span class="va-rank-name"><strong>${esc(row.name)}</strong><small>${esc(row.tag || 'sem tag')}</small></span></button></td><td class="num"><strong class="va-vap-score">${row.vap}</strong></td><td class="num">${row.played}</td><td class="num">${row.wins}</td><td class="num">${row.draws}</td><td class="num">${row.losses}</td><td><div class="va-winrate"><strong>${row.winRate}%</strong><div class="va-winrate-bar"><span style="width:${Math.min(100, row.winRate)}%"></span></div></div></td><td class="num">${row.goals}</td><td class="num">${row.assists}</td><td class="num">${row.defenses}</td><td class="num">${row.mvp}</td><td class="num">${row.interceptions}</td></tr>`).join('') : '<tr><td colspan="13">Nenhum time cadastrado para ranquear.</td></tr>') + '</tbody>';
    teamTable.querySelectorAll('[data-team-open]').forEach((row) => row.addEventListener('click', () => openTeam(row.dataset.teamOpen).catch((e) => { statusEl.textContent = e.message; statusEl.className = 'va-status err'; })));
  }
  function renderPlayers(rows = []) {
    playerTable.innerHTML = '<thead><tr><th>#</th><th>Jogador</th><th>Time</th><th>Função</th><th class="num">Pts</th><th class="num">Passes</th><th class="num">Gols</th><th class="num">Assist.</th><th class="num">Defesas</th><th class="num">MVP</th><th class="num">Intercep.</th></tr></thead><tbody>' + (rows.length ? rows.map((row, i) => `<tr data-user-open="${esc(row.id || row.discordId)}"><td class="va-rank-pos">#${i + 1}</td><td><strong class="va-profile-public-link">${esc(row.name)}</strong></td><td>${esc(row.team)}</td><td><span class="va-badge">${esc(row.role)}</span></td><td class="num"><strong>${row.points}</strong></td><td class="num">${row.passes}</td><td class="num">${row.goals}</td><td class="num">${row.assists}</td><td class="num">${row.defenses}</td><td class="num">${row.mvp}</td><td class="num">${row.interceptions}</td></tr>`).join('') : '<tr><td colspan="11">Nenhum jogador cadastrado nos times ainda.</td></tr>') + '</tbody>';
    playerTable.querySelectorAll('[data-user-open]').forEach((row) => row.addEventListener('click', () => openUser(row.dataset.userOpen).catch((e) => { statusEl.textContent = e.message; statusEl.className = 'va-status err'; })));
  }
  function renderEvents(events = []) { const selected = eventFilter.value || ''; eventFilter.innerHTML = '<option value="">Todos os eventos</option>' + events.map((event) => `<option value="${esc(event.id)}">${esc(event.name || event.title || 'Evento')}</option>`).join(''); eventFilter.value = selected; }
  async function load() {
    statusEl.textContent = 'Carregando rankings...'; statusEl.className = 'va-status';
    const [teamsData, eventsData, resultsData] = await Promise.all([VoidArena.request('/api/teams'), VoidArena.request('/api/events'), VoidArena.request('/api/match-results').catch(() => ({ results: [] }))]);
    const selectedEventId = eventFilter.value || ''; teamsCache = teamsData.teams || []; const events = eventsData.events || []; const results = resultsData.results || resultsData.records || [];
    renderEvents(events); eventFilter.value = selectedEventId; const teamRows = computeTeams(teamsCache, results, selectedEventId); renderTeams(teamRows); renderPlayers(playersFromTeams(teamRows));
    statusEl.textContent = 'Rankings atualizados. Clique em um time ou jogador para abrir o perfil público.'; statusEl.className = 'va-status ok';
  }
  eventFilter.addEventListener('change', load);
  document.getElementById('reloadRankingsBtn')?.addEventListener('click', load);
  VoidArena.bootLayout('rankings').then(load).catch((error) => { statusEl.textContent = error.message; statusEl.className = 'va-status err'; });
}());
