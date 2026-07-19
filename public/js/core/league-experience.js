(function () {
  'use strict';

  const FALLBACK_LOGO = '/assets/hollow-nexus-official.svg';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const qs = new URLSearchParams(location.search);

  async function api(url, options = {}) {
    const response = await fetch(url, {
      credentials: 'include',
      cache: 'no-store',
      headers: { Accept: 'application/json', ...(options.headers || {}) },
      ...options
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) throw new Error(data.message || `HTTP ${response.status}`);
    return data;
  }

  function image(value, fallback = FALLBACK_LOGO) {
    return String(value || fallback);
  }

  function fmt(value) {
    if (!value) return 'Data não definida';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  }

  function notice(message, type = '') {
    return `<div class="hnl-notice ${esc(type)}">${esc(message)}</div>`;
  }

  function empty(message) {
    return `<div class="hnl-empty">${esc(message)}</div>`;
  }

  function socials(raw = {}) {
    const labels = { site: 'Site', discord: 'Discord', instagram: 'Instagram', twitch: 'Twitch', tiktok: 'TikTok', youtube: 'YouTube', twitter: 'X/Twitter', steam: 'Steam', xbox: 'Xbox', spotify: 'Spotify', riot: 'Riot', ea: 'EA', psn: 'PSN', website: 'Site' };
    const links = Object.entries(raw || {}).filter(([, value]) => String(value || '').trim()).map(([key, value]) => {
      const rawValue = String(value || '').trim();
      const href = /^https?:\/\//i.test(rawValue) ? rawValue : '#';
      return `<a href="${esc(href)}" ${href === '#' ? 'data-copy="' + esc(rawValue) + '"' : 'target="_blank" rel="noopener noreferrer"'}>${esc(labels[key] || key)}</a>`;
    });
    return links.length ? `<div class="hnl-socials">${links.join('')}</div>` : '<span class="frm-muted">Nenhuma conexão pública cadastrada.</span>';
  }

  let viewerPromise;
  function viewer() {
    if (!viewerPromise) viewerPromise = api('/api/league/viewer').catch(() => ({ authenticated: false, viewer: null, viewerTeams: [], isAdmin: false }));
    return viewerPromise;
  }

  function teamCard(team = {}) {
    const manage = team.canManage ? `<a class="hnl-btn primary" href="/pages/perfil-clube.html?id=${encodeURIComponent(team.id || '')}#administrar">Administrar</a>` : '';
    return `<article class="hnl-card">
      <div class="hnl-profile-row">
        <img class="hnl-club-logo" src="${esc(image(team.logo))}" alt="Logo de ${esc(team.name || 'clube')}">
        <div><h3><a href="/pages/perfil-clube.html?id=${encodeURIComponent(team.id || '')}">${esc(team.name || 'Clube')}</a></h3><span class="hnl-chip">${esc(team.tag || 'Sem tag')}</span><p>${esc(team.captainName || team.ownerName || 'Capitão não definido')}</p></div>
        <div class="hnl-actions"><a class="hnl-btn" href="/pages/perfil-clube.html?id=${encodeURIComponent(team.id || '')}">Perfil público</a>${manage}</div>
      </div>
    </article>`;
  }

  function playerCard(player = {}, inviteHtml = '') {
    const team = player.team ? `<a href="/pages/perfil-clube.html?id=${encodeURIComponent(player.team.id || '')}">${esc(player.team.name || '')}</a>` : 'Livre no mercado';
    const roles = (player.roles || []).slice(0, 2).map((role) => `<span class="hnl-chip">${esc(role.name)}</span>`).join('');
    return `<article class="hnl-card">
      <div class="hnl-profile-row">
        <img class="hnl-avatar round" src="${esc(image(player.avatar))}" alt="Avatar de ${esc(player.name || 'jogador')}">
        <div><h3><a href="/pages/perfil-jogador.html?id=${encodeURIComponent(player.id || player.discordId || '')}">${esc(player.name || 'Jogador')}</a></h3><p>${team} · ${esc(player.profile?.primaryPosition || 'Posição não informada')}</p><div class="hnl-actions">${roles}</div></div>
        <div class="hnl-actions"><a class="hnl-btn" href="/pages/perfil-jogador.html?id=${encodeURIComponent(player.id || player.discordId || '')}">Ver perfil</a>${inviteHtml}</div>
      </div>
    </article>`;
  }

  async function dashboard() {
    const data = await api('/api/league/overview').catch(() => ({ teams: [], players: [], events: [], stats: {} }));
    const stats = data.stats || {};
    const map = { clubes: stats.clubes || 0, jogadores: stats.jogadores ?? stats.atletas ?? 0, competicoes: stats.competicoes || 0, partidas: stats.partidas || 0 };
    Object.entries(map).forEach(([key, value]) => $$(`[data-hnl-stat="${key}"]`).forEach((node) => { node.textContent = String(value); }));
    const competitions = $('#homeCompetitions');
    if (competitions) competitions.innerHTML = (data.events || []).length ? data.events.slice(0, 4).map((event) => `<div class="hnl-profile-row"><div class="hnl-rank">🏆</div><div><strong>${esc(event.name || event.title || 'Competição')}</strong><p>${fmt(event.startAt)}</p></div><a class="hnl-btn" href="/pages/competicao.html?id=${encodeURIComponent(event.id || '')}">Detalhes</a></div>`).join('') : empty('Nenhuma competição cadastrada.');
    const ranking = $('#homeClubRanking');
    if (ranking) ranking.innerHTML = (data.teams || []).length ? data.teams.slice(0, 5).map((team, index) => `<div class="hnl-profile-row"><div class="hnl-rank ${index < 3 ? 'top' : ''}">${index + 1}</div><div><strong>${esc(team.name || 'Clube')}</strong><p>${esc(team.tag || '')}</p></div><a class="hnl-btn" href="/pages/perfil-clube.html?id=${encodeURIComponent(team.id || '')}">Ver</a></div>`).join('') : empty('Nenhum clube cadastrado.');
  }

  async function clubs() {
    const box = $('#clubsList');
    if (!box) return;
    const data = await api('/api/teams');
    const teams = data.teams || [];
    const input = $('#clubSearch');
    const render = () => {
      const term = String(input?.value || '').trim().toLowerCase();
      const filtered = teams.filter((team) => `${team.name || ''} ${team.tag || ''}`.toLowerCase().includes(term));
      box.innerHTML = filtered.length ? filtered.map(teamCard).join('') : empty('Nenhum clube encontrado.');
    };
    input?.addEventListener('input', render);
    render();
  }

  async function players() {
    const box = $('#playersList');
    if (!box) return;
    const data = await api('/api/league/players');
    const players = data.players || [];
    const input = $('#playerSearch');
    const render = () => {
      const term = String(input?.value || '').trim().toLowerCase();
      const filtered = players.filter((player) => `${player.name || ''} ${player.profile?.primaryPosition || ''} ${player.team?.name || ''}`.toLowerCase().includes(term));
      box.innerHTML = filtered.length ? filtered.map((player) => playerCard(player)).join('') : empty('Nenhum jogador encontrado.');
    };
    input?.addEventListener('input', render);
    render();
  }

  async function playerProfile() {
    const box = $('#playerPublicProfile');
    if (!box) return;
    const id = qs.get('id');
    if (!id) { box.innerHTML = empty('Jogador não informado.'); return; }
    const data = await api(`/api/league/players/${encodeURIComponent(id)}`);
    const player = data.player || {};
    const stats = player.stats || {};
    box.innerHTML = `<section class="hnl-card hnl-profile-hero player">
      <img src="${esc(image(player.avatar))}" alt="Avatar de ${esc(player.name || 'jogador')}">
      <div><span class="hnl-section-kicker">👤 Perfil público</span><h1>${esc(player.name || 'Jogador')}</h1><p>${esc(player.profile?.bio || 'Este jogador ainda não adicionou uma biografia.')}</p><div class="hnl-actions">${(player.roles || []).map((role) => `<span class="hnl-chip">${esc(role.name)}</span>`).join('')}</div></div>
      ${player.team ? `<a class="hnl-btn" href="/pages/perfil-clube.html?id=${encodeURIComponent(player.team.id || '')}">${esc(player.team.name || 'Clube')}</a>` : '<span class="hnl-chip green">Livre no mercado</span>'}
    </section>
    <section class="hnl-grid cols-4" style="margin-top:14px">
      <div class="hnl-stat"><strong>${stats.points || 0}</strong><span>Pontos</span></div><div class="hnl-stat"><strong>${stats.goals || 0}</strong><span>Gols</span></div><div class="hnl-stat"><strong>${stats.assists || 0}</strong><span>Assistências</span></div><div class="hnl-stat"><strong>${stats.passes || 0}</strong><span>Passes</span></div>
    </section>
    <section class="hnl-grid cols-2" style="margin-top:14px"><article class="hnl-card"><h2>Informações</h2><p><strong>Posição principal:</strong> ${esc(player.profile?.primaryPosition || 'Não informada')}</p><p><strong>Posição secundária:</strong> ${esc(player.profile?.secondaryPosition || 'Não informada')}</p><p><strong>Região:</strong> ${esc(player.profile?.competitiveRegion || player.profile?.region || 'Não informada')}</p><p><strong>País:</strong> ${esc(player.profile?.country || 'Não informado')}</p></article><article class="hnl-card"><h2>Conexões</h2>${socials(player.socials || {})}</article></section>`;
  }

  function rosterHtml(players = []) {
    return players.length ? players.map((player) => `<div class="hnl-profile-row"><img class="hnl-avatar round" src="${esc(image(player.avatar))}" alt="${esc(player.name || '')}"><div><strong><a href="/pages/perfil-jogador.html?id=${encodeURIComponent(player.id || player.discordId || '')}">${esc(player.name || 'Jogador')}</a></strong><p>${esc(player.rosterRole || 'Jogador')}${player.isCaptain ? ' · Capitão' : ''}</p></div><a class="hnl-btn" href="/pages/perfil-jogador.html?id=${encodeURIComponent(player.id || player.discordId || '')}">Perfil</a></div>`).join('') : empty('Elenco ainda não preenchido.');
  }

  async function clubProfile() {
    const box = $('#clubPublicProfile');
    if (!box) return;
    const id = qs.get('id');
    if (!id) { box.innerHTML = empty('Clube não informado.'); return; }
    const data = await api(`/api/league/clubs/${encodeURIComponent(id)}`);
    const club = data.club || {};
    box.innerHTML = `<section class="hnl-card hnl-profile-hero">
      <img src="${esc(image(club.logo))}" alt="Logo de ${esc(club.name || 'clube')}">
      <div><span class="hnl-section-kicker">🛡️ Clube participante</span><h1>${esc(club.name || 'Clube')} ${club.tag ? `<small>[${esc(club.tag)}]</small>` : ''}</h1><p>${esc(club.description || 'O clube ainda não adicionou uma descrição pública.')}</p>${socials(club.socials || {})}</div>
      ${club.canManage ? '<a class="hnl-btn primary" href="#administrar">Administrar clube</a>' : ''}
    </section>
    <section class="hnl-grid cols-2" style="margin-top:14px"><article class="hnl-card"><h2>Direção</h2><p><strong>Dono/diretor:</strong> ${esc(club.directorName || club.ownerName || 'Não definido')}</p><p><strong>Capitão:</strong> ${esc(club.captainName || 'Não definido')}</p><p><strong>Região:</strong> ${esc(club.region || 'Não informada')}</p></article><article class="hnl-card"><h2>Elenco (${club.rosterCount || 0})</h2><div class="hnl-grid">${rosterHtml(club.roster || [])}</div></article></section>
    ${club.canManage ? `<section class="hnl-card" id="administrar" style="margin-top:14px"><h2>Administração do clube</h2><div id="clubManageStatus"></div><form id="clubEditForm" class="hnl-form-grid"><div class="hnl-field"><label>Nome</label><input class="hnl-input" name="name" value="${esc(club.name || '')}" required></div><div class="hnl-field"><label>Tag</label><input class="hnl-input" name="tag" value="${esc(club.tag || '')}" required></div><div class="hnl-field full"><label>Logo (URL)</label><input class="hnl-input" name="logo" value="${esc(club.logo || '')}"></div><div class="hnl-field full"><label>Descrição</label><textarea class="hnl-textarea" name="description">${esc(club.description || '')}</textarea></div><div class="hnl-actions full"><button class="hnl-btn primary" type="submit">Salvar alterações</button><button class="hnl-btn danger" type="button" id="deleteClub">Excluir clube</button></div></form><hr style="border-color:rgba(255,255,255,.08);margin:20px 0"><h3>Convidar jogador</h3><div class="hnl-form-grid"><div class="hnl-field"><label>Jogador</label><select class="hnl-select" id="clubInvitePlayer"></select></div><div class="hnl-field"><label>Vaga</label><select class="hnl-select" id="clubInviteSlot"><option value="player">Titular</option><option value="reserve">Reserva</option></select></div><div class="hnl-field full"><label>Mensagem</label><textarea class="hnl-textarea" id="clubInviteNote"></textarea></div><div class="hnl-actions full"><button class="hnl-btn primary" id="sendClubInvite" type="button">Enviar convite</button></div></div></section>` : ''}`;

    if (!club.canManage) return;
    const playersData = await api('/api/league/players').catch(() => ({ players: [] }));
    const select = $('#clubInvitePlayer');
    if (select) select.innerHTML = (playersData.players || []).map((player) => `<option value="${esc(player.id || player.discordId || '')}">${esc(player.name || 'Jogador')} ${player.team ? '— ' + esc(player.team.name) : '— Livre'}</option>`).join('');
    $('#clubEditForm')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      try {
        await api(`/api/teams/${encodeURIComponent(club.id)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.get('name'), tag: form.get('tag'), logo: form.get('logo'), description: form.get('description'), players: (club.playerDetails || []).map((item) => item.name), reserves: (club.reserveDetails || []).map((item) => item.name), playerDetails: club.playerDetails || [], reserveDetails: club.reserveDetails || [] }) });
        $('#clubManageStatus').innerHTML = notice('Clube atualizado.', 'success');
      } catch (error) { $('#clubManageStatus').innerHTML = notice(error.message, 'error'); }
    });
    $('#deleteClub')?.addEventListener('click', async () => {
      if (!confirm(`Excluir o clube ${club.name}? Essa ação não apaga os perfis dos jogadores.`)) return;
      try { await api(`/api/teams/${encodeURIComponent(club.id)}`, { method: 'DELETE' }); location.assign('/pages/clubes.html'); }
      catch (error) { $('#clubManageStatus').innerHTML = notice(error.message, 'error'); }
    });
    $('#sendClubInvite')?.addEventListener('click', async () => {
      try {
        await api(`/api/teams/${encodeURIComponent(club.id)}/invite-player`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: $('#clubInvitePlayer')?.value, rosterSlot: $('#clubInviteSlot')?.value, note: $('#clubInviteNote')?.value }) });
        $('#clubManageStatus').innerHTML = notice('Convite enviado ao Correio do jogador.', 'success');
      } catch (error) { $('#clubManageStatus').innerHTML = notice(error.message, 'error'); }
    });
  }

  async function createClub() {
    const form = $('#createClubForm');
    if (!form) return;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      const status = $('#createClubStatus');
      try {
        const result = await api('/api/league/clubs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        status.innerHTML = notice('Clube criado. Abrindo o perfil público...', 'success');
        setTimeout(() => location.assign(`/pages/perfil-clube.html?id=${encodeURIComponent(result.club?.id || result.team?.id || '')}`), 700);
      } catch (error) { status.innerHTML = notice(error.message, 'error'); }
    });
  }

  async function market() {
    const box = $('#marketPlayers');
    if (!box) return;
    const [playersData, viewerData] = await Promise.all([api('/api/league/players'), viewer()]);
    const players = playersData.players || [];
    const teams = viewerData.viewerTeams || [];
    const teamOptions = teams.map((team) => `<option value="${esc(team.id)}">${esc(team.name)}</option>`).join('');
    box.innerHTML = players.length ? players.map((player) => {
      const invite = teams.length ? `<button class="hnl-btn primary" data-invite-player="${esc(player.id || player.discordId || '')}" data-player-name="${esc(player.name || '')}">Convidar</button>` : '';
      return playerCard(player, invite);
    }).join('') : empty('Nenhum jogador registrado.');
    if (!teams.length) $('#marketInfo').innerHTML = notice(viewerData.authenticated ? 'Você não administra nenhum clube. Crie um clube ou peça vínculo de capitão/diretor.' : 'Entre com Discord para convidar jogadores.', '');
    $$('[data-invite-player]').forEach((button) => button.addEventListener('click', () => {
      const panel = $('#frmModalPanel');
      if (!panel) return;
      panel.innerHTML = `<h2>Convidar ${esc(button.dataset.playerName || 'jogador')}</h2><div class="hnl-field"><label>Clube</label><select class="hnl-select" id="marketInviteTeam">${teamOptions}</select></div><div class="hnl-field" style="margin-top:10px"><label>Vaga</label><select class="hnl-select" id="marketInviteSlot"><option value="player">Titular</option><option value="reserve">Reserva</option></select></div><div class="hnl-field" style="margin-top:10px"><label>Mensagem</label><textarea class="hnl-textarea" id="marketInviteNote"></textarea></div><div id="marketInviteStatus"></div><div class="hnl-actions" style="margin-top:12px"><button class="hnl-btn primary" id="marketInviteSend">Enviar convite</button><button class="hnl-btn" id="marketInviteClose">Cancelar</button></div>`;
      $('#frmModal')?.classList.add('open');
      $('#marketInviteClose')?.addEventListener('click', () => $('#frmModal')?.classList.remove('open'));
      $('#marketInviteSend')?.addEventListener('click', async () => {
        try {
          await api(`/api/teams/${encodeURIComponent($('#marketInviteTeam')?.value || '')}/invite-player`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: button.dataset.invitePlayer, rosterSlot: $('#marketInviteSlot')?.value, note: $('#marketInviteNote')?.value }) });
          $('#marketInviteStatus').innerHTML = notice('Convite enviado.', 'success');
        } catch (error) { $('#marketInviteStatus').innerHTML = notice(error.message, 'error'); }
      });
    }));
  }

  async function rankings() {
    const [teamsData, playersData] = await Promise.all([api('/api/teams'), api('/api/league/cafe-ranking')]);
    const teams = teamsData.teams || [];
    const players = playersData.ranking || [];
    const clubBody = $('#clubRanking');
    const playerBody = $('#playerRanking');
    if (clubBody) clubBody.innerHTML = teams.length ? teams.map((team, index) => `<tr><td><span class="hnl-rank ${index < 3 ? 'top' : ''}">${index + 1}</span></td><td><div class="hnl-profile-row" style="padding:0;border:0;background:transparent"><img class="hnl-club-logo" src="${esc(image(team.logo))}"><div><a href="/pages/perfil-clube.html?id=${encodeURIComponent(team.id || '')}"><strong>${esc(team.name || 'Clube')}</strong></a><small>${esc(team.tag || '')}</small></div></div></td><td>${Number(team.points || 0)}</td><td>${Number(team.wins || 0)}</td><td>${Number(team.goals || 0)}</td></tr>`).join('') : '<tr><td colspan="5">Nenhum clube cadastrado.</td></tr>';
    if (playerBody) playerBody.innerHTML = players.length ? players.map((player, index) => `<tr><td><span class="hnl-rank ${index < 3 ? 'top' : ''}">${index + 1}</span></td><td><div class="hnl-profile-row" style="padding:0;border:0;background:transparent"><img class="hnl-avatar round" src="${esc(image(player.avatar))}"><div><a href="/pages/perfil-jogador.html?id=${encodeURIComponent(player.id || player.discordId || '')}"><strong>${esc(player.name || 'Jogador')}</strong></a><small>${esc(player.profile?.primaryPosition || '')}</small></div></div></td><td>${player.points || 0}</td><td>${player.goals || 0}</td><td>${player.passes || 0}</td></tr>`).join('') : '<tr><td colspan="5">Nenhum jogador cadastrado.</td></tr>';
  }

  async function cafe() {
    const box = $('#cafeRanking');
    if (!box) return;
    const data = await api('/api/league/cafe-ranking');
    const ranking = data.ranking || [];
    const select = $('#cafeSort');
    const render = () => {
      const metric = select?.value || 'points';
      const sorted = [...ranking].sort((a, b) => Number(b[metric] || 0) - Number(a[metric] || 0) || Number(b.points || 0) - Number(a.points || 0));
      box.innerHTML = sorted.length ? `<div class="hnl-table-wrap"><table class="hnl-table"><thead><tr><th>#</th><th>Jogador</th><th>Pontos</th><th>Gols</th><th>Passes</th><th>Assist.</th><th>Jogos</th><th>MVP</th></tr></thead><tbody>${sorted.map((player, index) => `<tr><td><span class="hnl-rank ${index < 3 ? 'top' : ''}">${index + 1}</span></td><td><div class="hnl-profile-row" style="padding:0;border:0;background:transparent"><img class="hnl-avatar round" src="${esc(image(player.avatar))}"><div><a href="${esc(player.profileUrl || '#')}"><strong>${esc(player.name || 'Jogador')}</strong></a><small>${esc(player.profile?.primaryPosition || 'Membro')}</small></div></div></td><td>${player.points || 0}</td><td>${player.goals || 0}</td><td>${player.passes || 0}</td><td>${player.assists || 0}</td><td>${player.matches || 0}</td><td>${player.mvp || 0}</td></tr>`).join('')}</tbody></table></div>` : empty('Nenhum membro encontrado.');
    };
    select?.addEventListener('change', render);
    render();
  }

  async function calendar() {
    const box = $('#calendarGrid');
    if (!box) return;
    const data = await api('/api/league/calendar');
    const eventsByDay = new Map();
    (data.events || []).forEach((event) => {
      const date = new Date(event.startsAt || '');
      if (Number.isNaN(date.getTime())) return;
      const day = date.getDate();
      const list = eventsByDay.get(day) || [];
      list.push(event);
      eventsByDay.set(day, list);
    });
    const heads = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => `<div class="hnl-calendar-head">${day}</div>`).join('');
    let days = '<div class="hnl-calendar-day out"></div>'.repeat(3);
    for (let day = 1; day <= 31; day += 1) {
      days += `<div class="hnl-calendar-day"><strong>${day}</strong>${(eventsByDay.get(day) || []).map((event) => `<a class="hnl-calendar-event ${event.type === 'community' ? 'community' : ''}" href="${esc(event.href || '#')}">${esc(event.title)}<br><small>${fmt(event.startsAt)}</small></a>`).join('')}</div>`;
    }
    box.innerHTML = heads + days;
    const editor = $('#calendarEditor');
    if (editor) {
      editor.hidden = !data.isAdmin;
      if (data.isAdmin) {
        $('#nexusCupAt').value = String(data.settings?.nexusCupAt || '').slice(0, 16);
        $('#cafeComLeiteAt').value = String(data.settings?.cafeComLeiteAt || '').slice(0, 16);
        $('#calendarNote').value = data.settings?.note || '';
        $('#calendarForm')?.addEventListener('submit', async (event) => {
          event.preventDefault();
          try {
            await api('/api/league/calendar', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nexusCupAt: $('#nexusCupAt').value, cafeComLeiteAt: $('#cafeComLeiteAt').value, note: $('#calendarNote').value }) });
            $('#calendarSaveStatus').innerHTML = notice('Calendário salvo.', 'success');
            setTimeout(() => location.reload(), 500);
          } catch (error) { $('#calendarSaveStatus').innerHTML = notice(error.message, 'error'); }
        });
      }
    }
  }

  async function competitions() {
    const box = $('#competitionsList');
    if (!box) return;
    const data = await api('/api/events');
    const events = data.events || [];
    box.innerHTML = events.length ? events.map((event) => `<article class="hnl-card"><span class="hnl-chip ${event.status === 'open' ? 'green' : ''}">${esc(event.status || 'open')}</span><h2>${esc(event.name || event.title || 'Competição')}</h2><p>${esc(event.description || 'Sem descrição.')}</p><div class="hnl-actions"><span class="hnl-chip">${esc(event.matchFormat || 'MD1')}</span><span class="hnl-chip">${event.registeredCount || 0}/${event.teamLimit || 16} clubes</span></div><p>${fmt(event.startAt)}</p><a class="hnl-btn primary" href="/pages/competicao.html?id=${encodeURIComponent(event.id || '')}">Abrir detalhes</a></article>`).join('') : empty('Nenhuma competição cadastrada.');
  }

  async function competitionDetail() {
    const box = $('#competitionDetail');
    if (!box) return;
    const id = qs.get('id');
    if (!id) { box.innerHTML = empty('Competição não informada.'); return; }
    const [data, viewerData] = await Promise.all([api(`/api/league/competitions/${encodeURIComponent(id)}`), viewer()]);
    const event = data.competition || {};
    box.innerHTML = `<section class="hnl-card"><span class="hnl-section-kicker">🏆 Competição oficial</span><h1>${esc(event.name || event.title || 'Competição')}</h1><p>${esc(event.description || 'Sem descrição cadastrada.')}</p><div class="hnl-grid cols-4"><div class="hnl-stat"><strong>${esc(event.matchFormat || 'MD1')}</strong><span>Formato</span></div><div class="hnl-stat"><strong>${event.teamLimit || 16}</strong><span>Limite</span></div><div class="hnl-stat"><strong>${(event.registrations || []).length}</strong><span>Inscritos</span></div><div class="hnl-stat"><strong>${esc(event.status || 'open')}</strong><span>Status</span></div></div><p><strong>Início:</strong> ${fmt(event.startAt)}</p></section>${viewerData.isAdmin ? `<section class="hnl-card" style="margin-top:14px"><h2>Editar competição</h2><div id="competitionEditStatus"></div><form id="competitionEditForm" class="hnl-form-grid"><div class="hnl-field"><label>Nome</label><input class="hnl-input" name="name" value="${esc(event.name || event.title || '')}"></div><div class="hnl-field"><label>Início</label><input class="hnl-input" type="datetime-local" name="startAt" value="${esc(String(event.startAt || '').slice(0, 16))}"></div><div class="hnl-field"><label>Formato</label><select class="hnl-select" name="matchFormat">${['MD1','MD2','MD3','MD5'].map((value) => `<option ${value === event.matchFormat ? 'selected' : ''}>${value}</option>`).join('')}</select></div><div class="hnl-field"><label>Limite de clubes</label><input class="hnl-input" type="number" min="2" max="64" name="teamLimit" value="${event.teamLimit || 16}"></div><div class="hnl-field full"><label>Descrição</label><textarea class="hnl-textarea" name="description">${esc(event.description || '')}</textarea></div><div class="hnl-actions full"><button class="hnl-btn primary">Salvar competição</button></div></form></section>` : ''}`;
    $('#competitionEditForm')?.addEventListener('submit', async (eventSubmit) => {
      eventSubmit.preventDefault();
      const payload = Object.fromEntries(new FormData(eventSubmit.currentTarget).entries());
      try { await api(`/api/league/competitions/${encodeURIComponent(id)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); $('#competitionEditStatus').innerHTML = notice('Competição atualizada.', 'success'); }
      catch (error) { $('#competitionEditStatus').innerHTML = notice(error.message, 'error'); }
    });
  }

  async function transfers() {
    const box = $('#transferHistory');
    if (!box) return;
    const [playersData, teamsData, transfersData, viewerData] = await Promise.all([api('/api/league/players'), api('/api/teams'), api('/api/league/transfers'), viewer()]);
    const form = $('#transferForm');
    const teams = teamsData.teams || [];
    if (form) {
      $('#transferPlayer').innerHTML = (playersData.players || []).map((player) => `<option value="${esc(player.id || player.discordId || '')}">${esc(player.name || '')}</option>`).join('');
      $('#transferFrom').innerHTML = teams.map((team) => `<option value="${esc(team.id || '')}">${esc(team.name || '')}</option>`).join('');
      $('#transferTo').innerHTML = (viewerData.viewerTeams || []).map((team) => `<option value="${esc(team.id || '')}">${esc(team.name || '')}</option>`).join('');
      form.hidden = !(viewerData.viewerTeams || []).length;
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const payload = Object.fromEntries(new FormData(form).entries());
        try { await api('/api/league/transfers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); $('#transferStatus').innerHTML = notice('Solicitação registrada.', 'success'); }
        catch (error) { $('#transferStatus').innerHTML = notice(error.message, 'error'); }
      });
    }
    const transfers = transfersData.transfers || [];
    box.innerHTML = transfers.length ? transfers.map((item) => `<div class="hnl-profile-row"><div class="hnl-rank">↔</div><div><strong>${esc(item.player?.name || 'Jogador')}</strong><p>${esc(item.fromTeam?.name || '?')} → ${esc(item.toTeam?.name || '?')}</p></div><span class="hnl-chip">${esc(item.status || 'pending')}</span></div>`).join('') : empty('Nenhuma solicitação de transferência registrada.');
  }

  function tactics() {
    const board = $('#tacticBoard');
    if (!board) return;
    const list = $('#tacticTokenList');
    const key = 'hnl:tactic-board:v2';
    let tokens = [];
    try { tokens = JSON.parse(localStorage.getItem(key) || '[]'); } catch { tokens = []; }
    if (!Array.isArray(tokens) || !tokens.length) tokens = [
      { id: 'a1', team: 'ally', name: 'Goleiro', role: 'GOL', x: 12, y: 50 },
      { id: 'a2', team: 'ally', name: 'Defensor', role: 'DEF', x: 28, y: 38 },
      { id: 'a3', team: 'ally', name: 'Ala', role: 'ALA', x: 40, y: 20 },
      { id: 'a4', team: 'ally', name: 'Meia', role: 'MEI', x: 40, y: 72 },
      { id: 'a5', team: 'ally', name: 'Atacante', role: 'ATA', x: 48, y: 50 },
      { id: 'e1', team: 'enemy', name: 'Goleiro', role: 'GOL', x: 88, y: 50 },
      { id: 'e2', team: 'enemy', name: 'Defensor', role: 'DEF', x: 72, y: 38 },
      { id: 'e3', team: 'enemy', name: 'Ala', role: 'ALA', x: 60, y: 20 },
      { id: 'e4', team: 'enemy', name: 'Meia', role: 'MEI', x: 60, y: 72 },
      { id: 'e5', team: 'enemy', name: 'Atacante', role: 'ATA', x: 52, y: 50 },
      { id: 'ball', team: 'ball', name: 'Bola', role: '', x: 50, y: 50 }
    ];

    function render() {
      board.querySelectorAll('.hnl-token').forEach((node) => node.remove());
      tokens.forEach((token) => {
        const node = document.createElement('div');
        node.className = `hnl-token ${token.team === 'enemy' ? 'enemy' : ''} ${token.team === 'ball' ? 'ball' : ''}`;
        node.dataset.id = token.id;
        node.style.left = `${token.x}%`;
        node.style.top = `${token.y}%`;
        node.innerHTML = token.team === 'ball' ? '⚽' : `${esc(token.name)}<small>${esc(token.role)}</small>`;
        node.addEventListener('pointerdown', (event) => {
          node.setPointerCapture(event.pointerId);
          const move = (moveEvent) => {
            const rect = board.getBoundingClientRect();
            token.x = Math.max(3, Math.min(97, ((moveEvent.clientX - rect.left) / rect.width) * 100));
            token.y = Math.max(3, Math.min(97, ((moveEvent.clientY - rect.top) / rect.height) * 100));
            node.style.left = `${token.x}%`; node.style.top = `${token.y}%`;
          };
          node.addEventListener('pointermove', move);
          node.addEventListener('pointerup', () => node.removeEventListener('pointermove', move), { once: true });
        });
        node.addEventListener('dblclick', () => {
          if (token.team === 'ball') return;
          const next = prompt('Nome do jogador', token.name);
          if (next) token.name = next.slice(0, 24);
          const role = prompt('Posição/função', token.role);
          if (role) token.role = role.slice(0, 12).toUpperCase();
          render();
        });
        board.appendChild(node);
      });
      if (list) list.innerHTML = tokens.filter((token) => token.team !== 'ball').map((token) => `<button class="hnl-btn ghost" data-edit-token="${esc(token.id)}">${token.team === 'enemy' ? '🔴' : '🔵'} ${esc(token.name)} · ${esc(token.role)}</button>`).join('');
      $$('[data-edit-token]').forEach((button) => button.addEventListener('click', () => {
        const token = tokens.find((item) => item.id === button.dataset.editToken);
        if (!token) return;
        const next = prompt('Nome do jogador', token.name); if (next) token.name = next.slice(0, 24);
        const role = prompt('Posição/função', token.role); if (role) token.role = role.slice(0, 12).toUpperCase();
        render();
      }));
    }

    function add(team) {
      const count = tokens.filter((token) => token.team === team).length;
      if (count >= 5) return alert('Limite de 5 jogadores por lado.');
      tokens.push({ id: `${team}_${Date.now()}`, team, name: `Jogador ${count + 1}`, role: 'POS', x: team === 'enemy' ? 70 : 30, y: 18 + count * 14 });
      render();
    }
    $('#addAlly')?.addEventListener('click', () => add('ally'));
    $('#addEnemy')?.addEventListener('click', () => add('enemy'));
    $('#addBall')?.addEventListener('click', () => { if (!tokens.some((token) => token.team === 'ball')) tokens.push({ id: 'ball', team: 'ball', name: 'Bola', role: '', x: 50, y: 50 }); render(); });
    $('#saveTactic')?.addEventListener('click', () => { localStorage.setItem(key, JSON.stringify(tokens)); $('#tacticStatus').innerHTML = notice('Prancheta salva neste navegador.', 'success'); });
    $('#resetTactic')?.addEventListener('click', () => { localStorage.removeItem(key); location.reload(); });
    render();
  }

  async function simpleCompetitive() {
    const box = $('#competitiveData');
    if (!box) return;
    const [teams, events] = await Promise.all([api('/api/teams').catch(() => ({ teams: [] })), api('/api/events').catch(() => ({ events: [] }))]);
    box.innerHTML = `<div class="hnl-grid cols-2"><article class="hnl-card"><h2>Clubes disponíveis</h2>${(teams.teams || []).length ? (teams.teams || []).map((team) => `<div class="hnl-profile-row"><img class="hnl-club-logo" src="${esc(image(team.logo))}"><div><strong>${esc(team.name)}</strong><p>${esc(team.tag || '')}</p></div><a class="hnl-btn" href="/pages/perfil-clube.html?id=${encodeURIComponent(team.id || '')}">Ver</a></div>`).join('') : empty('Nenhum clube cadastrado.')}</article><article class="hnl-card"><h2>Competições</h2>${(events.events || []).length ? (events.events || []).map((event) => `<div class="hnl-profile-row"><div class="hnl-rank">🏆</div><div><strong>${esc(event.name || event.title)}</strong><p>${fmt(event.startAt)}</p></div><a class="hnl-btn" href="/pages/competicao.html?id=${encodeURIComponent(event.id || '')}">Abrir</a></div>`).join('') : empty('Nenhuma competição cadastrada.')}</article></div>`;
  }

  function globalInteractions() {
    document.addEventListener('click', (event) => {
      const copy = event.target.closest('[data-copy]');
      if (copy) { event.preventDefault(); navigator.clipboard?.writeText(copy.dataset.copy || ''); copy.textContent = 'Copiado'; }
    });
  }

  async function run() {
    globalInteractions();
    const module = document.body?.dataset?.hnlModule || document.body?.dataset?.frmModule || '';
    const handlers = { dashboard, clubs, players, 'player-profile': playerProfile, 'club-profile': clubProfile, 'create-club': createClub, market, rankings, cafe, calendar, competitions, 'competition-detail': competitionDetail, transfers, tactics, bracket: simpleCompetitive, groups: simpleCompetitive, results: simpleCompetitive };
    try { if (handlers[module]) await handlers[module](); }
    catch (error) {
      console.error('[HNL Experience]', error);
      const target = $('#pageStatus') || $('.frm-main');
      if (target && target.id === 'pageStatus') target.innerHTML = notice(error.message, 'error');
    }
    document.documentElement.dataset.hnlExperienceReady = '1';
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();
})();
