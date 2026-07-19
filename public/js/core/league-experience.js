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

  function readable(value = '') {
    return String(value || '')
      .replaceAll('ª', '__HNL_ORD_F__')
      .replaceAll('º', '__HNL_ORD_M__')
      .normalize('NFKC')
      .replaceAll('__HNL_ORD_F__', 'ª')
      .replaceAll('__HNL_ORD_M__', 'º')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function competitionTitle(event = {}) {
    return readable(event.name || event.title || 'Competição')
      .replace(/\bnexus\s+cup\b/i, 'Nexus Cup')
      .replace(/\s+(\d+[ªº]\s+edição)\b/i, ' — $1');
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
    return `<article class="hnl-card hnl-club-card">
      <div class="hnl-profile-row">
        <img class="hnl-club-logo" src="${esc(image(team.logo))}" alt="Logo de ${esc(team.name || 'clube')}">
        <div class="hnl-club-card-copy"><h3><a href="/pages/perfil-clube.html?id=${encodeURIComponent(team.id || '')}">${esc(team.name || 'Clube')}</a></h3><div class="hnl-actions"><span class="hnl-chip">${esc(team.tag || 'Sem tag')}</span>${team.region ? `<span class="hnl-chip">${esc(team.region)}</span>` : ''}</div><p>${esc(team.description || 'Clube participante da Hollow Nexus League.')}</p><small>Diretor: ${esc(team.directorName || team.ownerName || 'Não definido')} · Capitão: ${esc(team.captainName || 'Não definido')}</small>${socials(team.socials || {})}</div>
        <div class="hnl-actions"><a class="hnl-btn" href="/pages/perfil-clube.html?id=${encodeURIComponent(team.id || '')}">Perfil público</a></div>
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
    if (competitions) competitions.innerHTML = (data.events || []).length ? data.events.slice(0, 4).map((event) => `<div class="hnl-profile-row"><div class="hnl-rank">♕</div><div><strong>${esc(competitionTitle(event))}</strong><p>${fmt(event.startAt)}</p></div><a class="hnl-btn" href="/pages/competicao.html?id=${encodeURIComponent(event.id || '')}">Detalhes</a></div>`).join('') : empty('Nenhuma competição cadastrada.');
    const ranking = $('#homeClubRanking');
    if (ranking) ranking.innerHTML = (data.teams || []).length ? data.teams.slice(0, 5).map((team, index) => `<div class="hnl-profile-row"><img class="hnl-club-logo" src="${esc(image(team.logo))}" alt="Logo de ${esc(team.name || 'clube')}"><div><strong>${index + 1}. ${esc(team.name || 'Clube')}</strong><p>${esc(team.tag || '')}</p></div><a class="hnl-btn" href="/pages/perfil-clube.html?id=${encodeURIComponent(team.id || '')}">Ver</a></div>`).join('') : empty('Nenhum clube cadastrado.');
  }

  async function clubs() {
    const box = $('#clubsList');
    if (!box) return;
    const data = await api('/api/league/clubs');
    const teams = data.clubs || [];
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

  function publicPersonLink(name, userId, discordId) {
    const id = String(userId || discordId || '').trim();
    const label = esc(name || 'Não definido');
    return id ? `<a href="/pages/perfil-jogador.html?id=${encodeURIComponent(id)}">${label}</a>` : label;
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
      <div><span class="hnl-section-kicker">◈ Clube participante</span><h1>${esc(club.name || 'Clube')} ${club.tag ? `<small>[${esc(club.tag)}]</small>` : ''}</h1><p>${esc(club.description || 'O clube ainda não adicionou uma descrição pública.')}</p></div>
      <span class="hnl-chip">${esc(club.region || 'Região não informada')}</span>
    </section>
    <section class="hnl-grid cols-2" style="margin-top:14px"><article class="hnl-card"><h2>Direção</h2><p><strong>Diretor:</strong> ${esc(club.directorName || club.ownerName || 'Não definido')}</p><p><strong>Capitão:</strong> ${esc(club.captainName || 'Não definido')}</p></article><article class="hnl-card"><h2>Conexões oficiais</h2>${socials(club.socials || {})}</article></section>
    <section class="hnl-card" style="margin-top:14px"><h2>Elenco (${club.rosterCount || 0})</h2><div class="hnl-grid cols-2">${rosterHtml(club.roster || [])}</div></section>
    ${club.canManage ? `<section class="hnl-card" id="editar-clube" style="margin-top:14px"><div class="hnl-console-head"><div><h2>Edição do clube</h2><p class="hnl-edit-lock">◌ Área exclusiva do diretor e do capitão vinculados.</p></div></div><div id="clubManageStatus"></div><form id="clubEditForm" class="hnl-form-grid"><div class="hnl-field"><label>Nome</label><input class="hnl-input" name="name" value="${esc(club.name || '')}" required></div><div class="hnl-field"><label>Tag</label><input class="hnl-input" name="tag" value="${esc(club.tag || '')}" required></div><div class="hnl-field"><label>Região</label><input class="hnl-input" name="region" value="${esc(club.region || '')}"></div><div class="hnl-field"><label>Logo (URL)</label><input class="hnl-input" name="logo" value="${esc(club.logo || '')}"></div><div class="hnl-field full"><label>Descrição</label><textarea class="hnl-textarea" name="description">${esc(club.description || '')}</textarea></div><div class="hnl-field full"><h3>Conexões públicas</h3><p class="frm-muted">Preencha somente os canais oficiais do clube.</p></div><div class="hnl-field"><label>Discord</label><input class="hnl-input" name="socialDiscord" value="${esc(club.socials?.discord || '')}"></div><div class="hnl-field"><label>Instagram</label><input class="hnl-input" name="socialInstagram" value="${esc(club.socials?.instagram || '')}"></div><div class="hnl-field"><label>X / Twitter</label><input class="hnl-input" name="socialTwitter" value="${esc(club.socials?.twitter || '')}"></div><div class="hnl-field"><label>TikTok</label><input class="hnl-input" name="socialTiktok" value="${esc(club.socials?.tiktok || '')}"></div><div class="hnl-field"><label>YouTube</label><input class="hnl-input" name="socialYoutube" value="${esc(club.socials?.youtube || '')}"></div><div class="hnl-field"><label>Twitch</label><input class="hnl-input" name="socialTwitch" value="${esc(club.socials?.twitch || '')}"></div><div class="hnl-field full"><label>Site</label><input class="hnl-input" name="socialWebsite" value="${esc(club.socials?.website || club.socials?.site || '')}"></div><div class="hnl-actions full"><button class="hnl-btn primary" type="submit">Salvar alterações</button></div></form><hr style="border-color:rgba(255,255,255,.08);margin:20px 0"><h3>Convidar jogador</h3><div class="hnl-form-grid"><div class="hnl-field"><label>Jogador</label><select class="hnl-select" id="clubInvitePlayer"></select></div><div class="hnl-field"><label>Vaga</label><select class="hnl-select" id="clubInviteSlot"><option value="player">Titular</option><option value="reserve">Reserva</option></select></div><div class="hnl-field full"><label>Mensagem</label><textarea class="hnl-textarea" id="clubInviteNote"></textarea></div><div class="hnl-actions full"><button class="hnl-btn primary" id="sendClubInvite" type="button">Enviar convite</button></div></div></section>` : ''}`;

    if (!club.canManage) return;
    const playersData = await api('/api/league/players').catch(() => ({ players: [] }));
    const select = $('#clubInvitePlayer');
    if (select) select.innerHTML = (playersData.players || []).map((player) => `<option value="${esc(player.id || player.discordId || '')}">${esc(player.name || 'Jogador')} ${player.team ? '— ' + esc(player.team.name) : '— Livre'}</option>`).join('');
    $('#clubEditForm')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      try {
        await api(`/api/teams/${encodeURIComponent(club.id)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.get('name'), tag: form.get('tag'), region: form.get('region'), logo: form.get('logo'), description: form.get('description'), socials: { discord: form.get('socialDiscord'), instagram: form.get('socialInstagram'), twitter: form.get('socialTwitter'), tiktok: form.get('socialTiktok'), youtube: form.get('socialYoutube'), twitch: form.get('socialTwitch'), website: form.get('socialWebsite') }, players: (club.playerDetails || []).map((item) => item.name), reserves: (club.reserveDetails || []).map((item) => item.name), playerDetails: club.playerDetails || [], reserveDetails: club.reserveDetails || [] }) });
        $('#clubManageStatus').innerHTML = notice('Clube atualizado.', 'success');
      } catch (error) { $('#clubManageStatus').innerHTML = notice(error.message, 'error'); }
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
    if (!teams.length) $('#marketInfo').innerHTML = notice(viewerData.authenticated ? 'Você não está vinculado como capitão ou diretor de nenhum clube.' : 'Entre com Discord para convidar jogadores.', '');
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
    const data = await api('/api/league/rankings');
    const clubs = data.clubs || [];
    const players = data.players || [];
    const clubBody = $('#clubRanking');
    const playerBody = $('#playerRanking');
    if (clubBody) clubBody.innerHTML = clubs.length ? clubs.map((team, index) => `<tr><td><span class="hnl-rank ${index < 3 ? 'top' : ''}">${index + 1}</span></td><td><div class="hnl-profile-row hnl-table-person"><img class="hnl-club-logo" src="${esc(image(team.logo))}" alt="Logo"><div><a href="/pages/perfil-clube.html?id=${encodeURIComponent(team.id || '')}"><strong>${esc(team.name || 'Clube')}</strong></a><small>${esc(team.tag || '')}</small></div></div></td><td>${numberValue(team.points)}</td><td>${numberValue(team.wins)}</td><td>${numberValue(team.goals)}</td></tr>`).join('') : '<tr><td colspan="5">Nenhum clube cadastrado.</td></tr>';
    if (playerBody) playerBody.innerHTML = players.length ? players.map((player, index) => `<tr><td><span class="hnl-rank ${index < 3 ? 'top' : ''}">${index + 1}</span></td><td><div class="hnl-profile-row hnl-table-person"><img class="hnl-avatar round" src="${esc(image(player.avatar))}" alt="Avatar"><div>${player.profileUrl ? `<a href="${esc(player.profileUrl)}"><strong>${esc(player.name || 'Jogador')}</strong></a>` : `<strong>${esc(player.name || 'Jogador')}</strong>`}<small>${esc(player.profile?.primaryPosition || 'Membro')}</small></div></div></td><td>${numberValue(player.points)}</td><td>${numberValue(player.goals)}</td><td>${numberValue(player.passes)}</td></tr>`).join('') : '<tr><td colspan="5">Nenhum jogador cadastrado.</td></tr>';
    if (data.degraded && $('#pageStatus')) $('#pageStatus').innerHTML = notice('Alguns dados ainda estão sincronizando com o BOT; o que já foi carregado permanece disponível.', '');
  }

  function numberValue(value) { const parsed = Number(value || 0); return Number.isFinite(parsed) ? parsed : 0; }

  async function cafe() {
    const box = $('#cafeRanking');
    if (!box) return;
    const data = await api('/api/league/cafe-ranking');
    const ranking = data.ranking || [];
    const select = $('#cafeSort');
    const search = $('#cafeSearch');
    const direction = $('#cafeDirection');
    const buttons = $('#cafeMetricButtons');
    const metrics = [
      ['points', 'Pontuação'], ['goals', 'Gols'], ['passes', 'Passes'], ['assists', 'Assistências'], ['wins', 'Vitórias'], ['matches', 'Jogos'], ['mvp', 'MVP']
    ];
    let metric = select?.value || 'points';
    let descending = true;
    if (buttons) buttons.innerHTML = metrics.map(([key, label]) => `<button class="hnl-btn ${key === metric ? 'primary' : ''}" type="button" data-cafe-metric="${key}">${label}</button>`).join('');
    const render = () => {
      const term = String(search?.value || '').trim().toLocaleLowerCase('pt-BR');
      const filtered = ranking.filter((player) => String(player.name || '').toLocaleLowerCase('pt-BR').includes(term));
      const sorted = [...filtered].sort((a, b) => {
        const diff = numberValue(b[metric]) - numberValue(a[metric]);
        return (descending ? diff : -diff) || numberValue(b.points) - numberValue(a.points) || String(a.name).localeCompare(String(b.name), 'pt-BR');
      });
      box.innerHTML = sorted.length ? `<div class="hnl-table-wrap"><table class="hnl-table"><thead><tr><th>#</th><th>Jogador</th><th>Pontos</th><th>Gols</th><th>Passes</th><th>Assist.</th><th>Jogos</th><th>MVP</th></tr></thead><tbody>${sorted.map((player, index) => `<tr><td><span class="hnl-rank ${index < 3 ? 'top' : ''}">${index + 1}</span></td><td><div class="hnl-profile-row hnl-table-person"><img class="hnl-avatar round" src="${esc(image(player.avatar))}" alt="Avatar"><div>${player.profileUrl ? `<a href="${esc(player.profileUrl)}"><strong>${esc(player.name || 'Jogador')}</strong></a>` : `<strong>${esc(player.name || 'Jogador')}</strong>`}<small>${esc(player.profile?.primaryPosition || player.roles?.[0]?.name || 'Membro')}</small></div></div></td><td>${numberValue(player.points)}</td><td>${numberValue(player.goals)}</td><td>${numberValue(player.passes)}</td><td>${numberValue(player.assists)}</td><td>${numberValue(player.matches)}</td><td>${numberValue(player.mvp)}</td></tr>`).join('')}</tbody></table></div>` : empty('Nenhum membro encontrado para esse filtro.');
      if (direction) direction.textContent = descending ? 'Maior primeiro' : 'Menor primeiro';
      if (select) select.value = metric;
      if (buttons) buttons.querySelectorAll('[data-cafe-metric]').forEach((button) => button.classList.toggle('primary', button.dataset.cafeMetric === metric));
    };
    buttons?.addEventListener('click', (event) => { const button = event.target.closest('[data-cafe-metric]'); if (!button) return; metric = button.dataset.cafeMetric || 'points'; render(); });
    select?.addEventListener('change', () => { metric = select.value || 'points'; render(); });
    search?.addEventListener('input', render);
    direction?.addEventListener('click', () => { descending = !descending; render(); });
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
    const data = await api('/api/league/competitions');
    const events = data.competitions || [];
    const activeStatuses = new Set(['open', 'running', 'active']);
    const finishedStatuses = new Set(['closed', 'finished', 'archived']);
    const statusLabel = (status) => ({ open: 'Inscrições abertas', running: 'Em andamento', active: 'Ativa', closed: 'Inscrições encerradas', finished: 'Finalizada', upcoming: 'Em breve' })[String(status || '').toLowerCase()] || 'Em breve';
    const structureLabel = (value) => ({ single_elimination: 'Mata-mata', groups: 'Fase de grupos', groups_playoffs: 'Grupos + playoffs' })[String(value || '')] || String(value || 'Mata-mata').replaceAll('_', ' ');
    const totalRegistered = events.reduce((sum, event) => sum + Number(event.registeredCount || event.registrations?.length || 0), 0);
    const totalSlots = events.reduce((sum, event) => sum + Math.max(0, Number(event.teamLimit || 16) - Number(event.registeredCount || event.registrations?.length || 0)), 0);
    $$('[data-competition-stat="active"]').forEach((node) => { node.textContent = String(events.filter((event) => activeStatuses.has(String(event.status || 'open').toLowerCase())).length); });
    $$('[data-competition-stat="registered"]').forEach((node) => { node.textContent = String(totalRegistered); });
    $$('[data-competition-stat="slots"]').forEach((node) => { node.textContent = String(totalSlots); });

    function category(event) {
      const status = String(event.status || 'open').toLowerCase();
      if (activeStatuses.has(status)) return 'active';
      if (finishedStatuses.has(status)) return 'finished';
      return 'upcoming';
    }

    function competitionCard(event) {
      const registered = Number(event.registeredCount || event.registrations?.length || 0);
      const limit = Math.max(1, Number(event.teamLimit || 16));
      const progress = Math.min(100, Math.round((registered / limit) * 100));
      const fee = event.feeLabel || event.entryFee || event.registrationFee || 'Gratuita';
      const reward = event.reward || event.prize || 'Premiação conforme regulamento';
      return `<article class="hnl-card hnl-competition-feature"><div class="hnl-competition-head"><div><div class="hnl-actions"><span class="hnl-chip ${activeStatuses.has(String(event.status || 'open').toLowerCase()) ? 'green' : ''}">${esc(statusLabel(event.status || 'open'))}</span><span class="hnl-chip">Edição oficial</span></div><h2 class="hnl-competition-title">${esc(competitionTitle(event))}</h2><p class="hnl-competition-description">${esc(event.description || 'Competição oficial da Hollow Nexus League. Confira formato, vagas e calendário antes de inscrever o clube.')}</p></div><div class="hnl-competition-mark" aria-hidden="true">♕</div></div><div class="hnl-competition-meta"><div><small>Formato</small><strong>${esc(event.matchFormat || 'MD1')}</strong></div><div><small>Estrutura</small><strong>${esc(structureLabel(event.structure || event.mode))}</strong></div><div><small>Início</small><strong>${esc(fmt(event.startAt))}</strong></div><div><small>Entrada</small><strong>${esc(fee)}</strong></div></div><div class="hnl-registration-progress"><header><span>Clubes confirmados</span><strong>${registered}/${limit}</strong></header><div class="hnl-progress-track"><span style="width:${progress}%"></span></div></div><p><strong>Premiação:</strong> ${esc(reward)}</p><div class="hnl-actions"><a class="hnl-btn primary" href="/pages/competicao.html?id=${encodeURIComponent(event.id || '')}">Ver competição</a><a class="hnl-btn" href="/pages/regulamento.html">Regulamento</a><a class="hnl-btn ghost" href="/pages/chaveamento.html">Chaveamento</a></div></article>`;
    }

    function render(filter = 'active') {
      const filtered = events.filter((event) => category(event) === filter);
      box.innerHTML = filtered.length ? filtered.map(competitionCard).join('') : empty(filter === 'active' ? 'Nenhuma competição ativa no momento.' : filter === 'finished' ? 'Nenhuma competição encerrada.' : 'Nenhuma próxima competição anunciada.');
      $$('[data-competition-filter]').forEach((button) => button.classList.toggle('active', button.dataset.competitionFilter === filter));
    }

    $$('[data-competition-filter]').forEach((button) => button.addEventListener('click', () => render(button.dataset.competitionFilter || 'active')));
    render('active');
  }

  async function competitionDetail() {
    const box = $('#competitionDetail');
    if (!box) return;
    const id = qs.get('id');
    if (!id) { box.innerHTML = empty('Competição não informada.'); return; }
    const [data, viewerData] = await Promise.all([api(`/api/league/competitions/${encodeURIComponent(id)}`), viewer()]);
    const event = data.competition || {};
    box.innerHTML = `<section class="hnl-card"><span class="hnl-section-kicker">♕ Competição oficial</span><h1>${esc(competitionTitle(event))}</h1><p>${esc(event.description || 'Sem descrição cadastrada.')}</p><div class="hnl-grid cols-4"><div class="hnl-stat"><strong>${esc(event.matchFormat || 'MD1')}</strong><span>Formato</span></div><div class="hnl-stat"><strong>${event.teamLimit || 16}</strong><span>Limite</span></div><div class="hnl-stat"><strong>${(event.registrations || []).length}</strong><span>Inscritos</span></div><div class="hnl-stat"><strong>${esc(event.status || 'open')}</strong><span>Status</span></div></div><p><strong>Início:</strong> ${fmt(event.startAt)}</p></section>${viewerData.isAdmin ? `<section class="hnl-card" style="margin-top:14px"><h2>Editar competição</h2><div id="competitionEditStatus"></div><form id="competitionEditForm" class="hnl-form-grid"><div class="hnl-field"><label>Nome</label><input class="hnl-input" name="name" value="${esc(event.name || event.title || '')}"></div><div class="hnl-field"><label>Início</label><input class="hnl-input" type="datetime-local" name="startAt" value="${esc(String(event.startAt || '').slice(0, 16))}"></div><div class="hnl-field"><label>Formato</label><select class="hnl-select" name="matchFormat">${['MD1','MD2','MD3','MD5'].map((value) => `<option ${value === event.matchFormat ? 'selected' : ''}>${value}</option>`).join('')}</select></div><div class="hnl-field"><label>Limite de clubes</label><input class="hnl-input" type="number" min="2" max="64" name="teamLimit" value="${event.teamLimit || 16}"></div><div class="hnl-field full"><label>Descrição</label><textarea class="hnl-textarea" name="description">${esc(event.description || '')}</textarea></div><div class="hnl-actions full"><button class="hnl-btn primary">Salvar competição</button></div></form></section>` : ''}`;
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
    const [playersData, teamsData, transfersData, viewerData] = await Promise.all([api('/api/league/players'), api('/api/league/clubs'), api('/api/league/transfers'), viewer()]);
    const form = $('#transferForm');
    const teams = teamsData.clubs || teamsData.teams || [];
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

  async function results() {
    const box = $('#resultsList');
    if (!box) return;
    const data = await api('/api/match-results');
    const resultsList = data.results || [];
    box.innerHTML = resultsList.length ? resultsList.map((result) => `<article class="hnl-card"><span class="hnl-chip ${result.status === 'validated' ? 'green' : ''}">${esc(result.status || 'pending')}</span><h2>${esc(result.match?.teamA?.name || result.teamA?.name || 'Equipe A')} ${numberValue(result.finalScoreA ?? result.scoreA)} × ${numberValue(result.finalScoreB ?? result.scoreB)} ${esc(result.match?.teamB?.name || result.teamB?.name || 'Equipe B')}</h2><p>${fmt(result.updatedAt || result.createdAt)}</p></article>`).join('') : empty('Nenhum resultado registrado.');
  }

  async function notificationsPage() {
    const box = $('#notificationsPage') || $('#mailPage');
    if (!box) return;
    const data = await api('/api/notifications').catch(() => ({ notifications: [] }));
    const items = data.notifications || [];
    box.innerHTML = items.length ? items.map((item) => `<article class="hnl-card"><span class="hnl-chip">${esc(item.status || 'nova')}</span><h2>${esc(item.title || 'Notificação')}</h2><p>${esc(item.note || item.message || '')}</p></article>`).join('') : empty('Nenhuma notificação no momento.');
  }

  function globalInteractions() {
    document.addEventListener('click', (event) => {
      const copy = event.target.closest('[data-copy]');
      if (copy) { event.preventDefault(); navigator.clipboard?.writeText(copy.dataset.copy || ''); copy.textContent = 'Copiado'; }
    });
  }

  document.addEventListener('error', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLImageElement)) return;
    if (target.dataset.hnlFallbackApplied === '1') return;
    target.dataset.hnlFallbackApplied = '1';
    target.src = FALLBACK_LOGO;
  }, true);

  async function run() {
    globalInteractions();
    const module = document.body?.dataset?.hnlModule || document.body?.dataset?.frmModule || '';
    const handlers = { dashboard, clubs, players, 'player-profile': playerProfile, 'club-profile': clubProfile, 'create-club': createClub, market, rankings, cafe, calendar, competitions, 'competition-detail': competitionDetail, transfers, tactics, results, notifications: notificationsPage, mail: notificationsPage };
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
