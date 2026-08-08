(function () {
  'use strict';

  const FALLBACK_LOGO = '/assets/hollow-nexus-official.svg';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
  const logo = (value) => String(value || FALLBACK_LOGO);
  const formatDate = (value) => {
    if (!value) return 'Data não definida';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  };
  const titleOf = (event = {}) => String(event.name || event.title || 'Competição').replace(/\s+/g, ' ').trim();
  const isCompletedNexusCup = (event = {}) => String(event.id || '').trim() === 'coliseu-void-arena';
  const officialEvent = (event = {}) => isCompletedNexusCup(event) ? { ...event, status: 'finished' } : event;
  const api = async (url, options = {}) => {
    const response = await fetch(url, { credentials: 'include', cache: 'no-store', headers: { Accept: 'application/json', ...(options.headers || {}) }, ...options });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) throw new Error(data.message || `HTTP ${response.status}`);
    return data;
  };
  const waitForExperience = async () => {
    for (let index = 0; index < 80; index += 1) {
      if (document.documentElement.dataset.hnlExperienceReady === '1') return;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  };

  function registrationTeam(registration = {}) {
    return registration.team || registration.club || registration.teamData || {
      id: registration.teamId || '',
      name: registration.teamName || 'Clube inscrito',
      tag: registration.teamTag || '',
      logo: registration.teamLogo || ''
    };
  }

  function statusLabel(status = '') {
    const key = String(status || '').toLowerCase();
    return ({ open: 'Inscrições abertas', running: 'Em andamento', active: 'Ativa', closed: 'Inscrições encerradas', finished: 'Finalizada', archived: 'Arquivada', upcoming: 'Em breve' })[key] || 'Em breve';
  }

  function structureLabel(value = '') {
    return ({ single_elimination: 'Mata-mata', groups: 'Fase de grupos', groups_playoffs: 'Grupos + playoffs' })[String(value || '')] || String(value || 'Mata-mata').replaceAll('_', ' ');
  }

  function registeredTeamsHtml(event = {}, isAdmin = false) {
    const registrations = Array.isArray(event.registrations) ? event.registrations : [];
    if (!registrations.length) return '<div class="hnl-empty hnl-registration-empty">Nenhum clube validado e inscrito ainda.</div>';
    return `<div class="hnl-registered-clubs">${registrations.map((registration, index) => {
      const team = registrationTeam(registration);
      const teamId = String(registration.teamId || team.id || '').trim();
      const profileHref = team.id ? `/pages/perfil-clube.html?id=${encodeURIComponent(team.id)}` : '/pages/clubes.html';
      return `<article class="hnl-registered-club">
        <span class="hnl-registration-position">${index + 1}</span>
        <img src="${esc(logo(team.logo))}" alt="Logo de ${esc(team.name || 'clube')}">
        <div><a href="${profileHref}"><strong>${esc(team.name || 'Clube')}</strong></a><small>${esc(team.tag || 'Sem tag')} · Inscrição validada</small></div>
        <span class="hnl-chip green">✓ Validado</span>
        ${isAdmin && teamId ? `<button class="hnl-btn danger mini" type="button" data-remove-registration="${esc(teamId)}" data-event-id="${esc(event.id || '')}" data-team-name="${esc(team.name || 'clube')}">Remover</button>` : ''}
      </article>`;
    }).join('')}</div>`;
  }

  async function loadCompetitionData() {
    const [eventsData, viewerData] = await Promise.all([
      api('/api/events'),
      api('/api/league/viewer').catch(() => ({ isAdmin: false }))
    ]);
    return { events: (eventsData.events || []).map(officialEvent), isAdmin: Boolean(viewerData.isAdmin) };
  }

  async function removeRegistration(button, rerender) {
    const eventId = button.dataset.eventId || '';
    const teamId = button.dataset.removeRegistration || '';
    const teamName = button.dataset.teamName || 'clube';
    if (!eventId || !teamId) return;
    if (!window.confirm(`Remover ${teamName} desta competição? O clube não será excluído do site.`)) return;
    const original = button.textContent;
    button.disabled = true;
    button.textContent = 'Removendo...';
    try {
      await api(`/api/events/${encodeURIComponent(eventId)}/registrations/${encodeURIComponent(teamId)}`, { method: 'DELETE' });
      await rerender();
    } catch (error) {
      window.alert(error.message);
      button.disabled = false;
      button.textContent = original;
    }
  }

  async function upgradeCompetitions() {
    const box = $('#competitionsList');
    if (!box) return;
    let filter = 'active';
    let filterTouched = false;

    const render = async () => {
      const { events, isAdmin } = await loadCompetitionData();
      const activeStatuses = new Set(['open', 'running', 'active']);
      const finishedStatuses = new Set(['closed', 'finished', 'archived']);
      const category = (event) => activeStatuses.has(String(event.status || 'open').toLowerCase()) ? 'active' : finishedStatuses.has(String(event.status || '').toLowerCase()) ? 'finished' : 'upcoming';
      if (!filterTouched && !events.some((event) => category(event) === 'active')) {
        filter = events.some((event) => category(event) === 'upcoming') ? 'upcoming' : 'finished';
      }
      const visible = events.filter((event) => category(event) === filter);
      const registeredTotal = events.reduce((sum, event) => sum + (Array.isArray(event.registrations) ? event.registrations.length : number(event.registeredCount)), 0);
      const slotsTotal = events.filter((event) => category(event) === 'active').reduce((sum, event) => sum + Math.max(0, number(event.teamLimit || 16) - (Array.isArray(event.registrations) ? event.registrations.length : number(event.registeredCount))), 0);
      $$('[data-competition-stat="active"]').forEach((node) => { node.textContent = String(events.filter((event) => activeStatuses.has(String(event.status || 'open').toLowerCase())).length); });
      $$('[data-competition-stat="registered"]').forEach((node) => { node.textContent = String(registeredTotal); });
      $$('[data-competition-stat="slots"]').forEach((node) => { node.textContent = String(slotsTotal); });
      $$('[data-competition-filter]').forEach((node) => node.classList.toggle('active', node.dataset.competitionFilter === filter));

      box.innerHTML = visible.length ? visible.map((event) => {
        const registrations = Array.isArray(event.registrations) ? event.registrations : [];
        const registered = registrations.length || number(event.registeredCount);
        const limit = Math.max(1, number(event.teamLimit || 16));
        const progress = Math.min(100, Math.round((registered / limit) * 100));
        const active = activeStatuses.has(String(event.status || 'open').toLowerCase());
        const finished = finishedStatuses.has(String(event.status || '').toLowerCase());
        const fee = event.feeLabel || event.entryFee || event.registrationFee || 'Gratuita';
        const officialResult = isCompletedNexusCup(event)
          ? '<div class="hnl-competition-result-note"><div><strong>🏆 Pódio confirmado</strong><span>1º Flow · 2º Griffin Gaming · 3º Império</span></div><a class="hnl-btn primary" href="/pages/resultados.html">Ver resultado oficial</a></div>'
          : '';
        return `<article class="hnl-card hnl-competition-feature hnl-competition-expanded ${finished ? 'is-finished' : ''}">
          <div class="hnl-competition-head"><div><div class="hnl-actions"><span class="hnl-chip ${active ? 'green' : finished ? 'hnl-finished-chip' : ''}">${esc(statusLabel(event.status))}</span><span class="hnl-chip">Competição oficial</span></div><h2 class="hnl-competition-title">${esc(titleOf(event))}</h2><p class="hnl-competition-description">${esc(finished ? 'Competição encerrada com resultado oficial publicado pela Hollow Nexus League.' : (event.description || 'Competição oficial da Hollow Nexus League.'))}</p></div><div class="hnl-competition-mark" aria-hidden="true">${finished ? '🏆' : '♕'}</div></div>
          <div class="hnl-competition-meta"><div><small>Formato</small><strong>${esc(event.matchFormat || 'MD1')}</strong></div><div><small>Estrutura</small><strong>${esc(structureLabel(event.structure || event.mode))}</strong></div><div><small>${finished ? 'Situação' : 'Início'}</small><strong>${finished ? 'Encerrada' : esc(formatDate(event.startAt))}</strong></div><div><small>Entrada</small><strong>${esc(fee)}</strong></div></div>
          <div class="hnl-registration-progress"><header><span>Clubes confirmados</span><strong>${registered}/${limit}</strong></header><div class="hnl-progress-track"><span style="width:${progress}%"></span></div></div>
          <section class="hnl-registration-roster"><div class="hnl-section-heading"><div><span class="hnl-section-kicker">Inscrições confirmadas</span><h3>Clubes validados no evento</h3></div><span class="hnl-chip">${registered} clube(s)</span></div>${registeredTeamsHtml(event, isAdmin)}</section>
          ${officialResult}<div class="hnl-actions">${active && registered < limit ? `<a class="hnl-btn primary" href="/pages/competicao.html?id=${encodeURIComponent(event.id || '')}#inscricao">Inscrever meu time</a>` : ''}<a class="hnl-btn" href="/pages/competicao.html?id=${encodeURIComponent(event.id || '')}">Ver competição</a><a class="hnl-btn" href="/pages/regulamento.html">Regulamento</a><a class="hnl-btn ghost" href="/pages/chaveamento.html">Chaveamento</a></div>
        </article>`;
      }).join('') : '<div class="hnl-empty">Nenhuma competição nesta categoria.</div>';

      $$('[data-remove-registration]', box).forEach((button) => button.addEventListener('click', () => removeRegistration(button, render)));
    };

    $$('[data-competition-filter]').forEach((button) => button.addEventListener('click', () => { filterTouched = true; filter = button.dataset.competitionFilter || 'active'; render().catch(console.error); }));
    await render();
  }

  async function upgradeCompetitionDetail() {
    const box = $('#competitionDetail');
    const eventId = new URLSearchParams(location.search).get('id');
    if (!box || !eventId) return;

    const render = async () => {
      const { events, isAdmin } = await loadCompetitionData();
      const event = events.find((item) => String(item.id || '') === String(eventId));
      if (!event) return;
      box.querySelector('[data-hnl-registration-detail]')?.remove();
      const section = document.createElement('section');
      section.className = 'hnl-card hnl-registration-detail';
      section.dataset.hnlRegistrationDetail = '1';
      section.innerHTML = `<div class="hnl-section-heading"><div><span class="hnl-section-kicker">Clubes confirmados</span><h2>Times validados e inscritos</h2><p>Somente inscrições aprovadas pela staff aparecem nesta relação.</p></div><span class="hnl-chip green">${event.registrations?.length || 0}/${event.teamLimit || 16}</span></div>${registeredTeamsHtml(event, isAdmin)}`;
      const firstCard = box.querySelector(':scope > section');
      firstCard?.insertAdjacentElement('afterend', section);
      $$('[data-remove-registration]', section).forEach((button) => button.addEventListener('click', () => removeRegistration(button, render)));
      if (location.hash === '#inscricao') document.getElementById('detailRegisterTeam')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    await render();
  }

  function clubMiniCard(team = {}) {
    return `<a class="hnl-home-mini-card" href="/pages/perfil-clube.html?id=${encodeURIComponent(team.id || '')}"><img src="${esc(logo(team.logo))}" alt=""><span><strong>${esc(team.name || 'Clube')}</strong><small>${esc(team.tag || 'Sem tag')} · ${number(team.rosterCount || team.players?.length)} jogador(es)</small></span><b>→</b></a>`;
  }

  function playerMiniCard(player = {}) {
    return `<a class="hnl-home-mini-card" href="/pages/perfil-jogador.html?id=${encodeURIComponent(player.id || player.discordId || '')}"><img class="round" src="${esc(logo(player.avatar))}" alt=""><span><strong>${esc(player.name || 'Jogador')}</strong><small>${esc(player.profile?.primaryPosition || 'Posição não informada')}${player.team?.name ? ` · ${esc(player.team.name)}` : ' · Livre no mercado'}</small></span><b>→</b></a>`;
  }

  async function upgradeDashboard() {
    const target = $('#homeNextCompetition');
    if (!target) return;
    const [overview, eventsData] = await Promise.all([
      api('/api/league/overview').catch(() => ({ teams: [], players: [], events: [], stats: {} })),
      api('/api/events').catch(() => ({ events: [] }))
    ]);
    const teams = overview.teams || overview.clubs || [];
    const players = overview.players || overview.users || [];
    const events = (eventsData.events || overview.events || []).map(officialEvent);
    const active = events.filter((event) => ['open', 'active', 'running'].includes(String(event.status || '').toLowerCase())).sort((a, b) => new Date(a.startAt || 0) - new Date(b.startAt || 0));
    const next = active[0] || events[0] || null;
    if (next) {
      const registered = next.registrations?.length || number(next.registeredCount);
      const limit = Math.max(1, number(next.teamLimit || 16));
      const progress = Math.min(100, Math.round((registered / limit) * 100));
      target.innerHTML = `<div class="hnl-home-next-copy"><span class="hnl-chip green">Próxima competição</span><h2>${esc(titleOf(next))}</h2><p>${esc(next.description || 'Inscrições, calendário e organização competitiva em uma única plataforma.')}</p><div class="hnl-home-next-meta"><span><small>Início</small><b>${esc(formatDate(next.startAt))}</b></span><span><small>Formato</small><b>${esc(next.matchFormat || 'MD1')}</b></span><span><small>Clubes</small><b>${registered}/${limit}</b></span></div><div class="hnl-progress-track"><span style="width:${progress}%"></span></div><div class="hnl-actions"><a class="hnl-btn primary" href="/pages/competicao.html?id=${encodeURIComponent(next.id || '')}">Abrir competição</a><a class="hnl-btn" href="/pages/competicoes.html">Ver todas</a></div></div><div class="hnl-home-next-mark">♕</div>`;
    } else target.innerHTML = '<div class="hnl-empty">Nenhuma competição ativa. A próxima edição aparecerá aqui.</div>';
    const clubs = $('#homeRecentClubs');
    if (clubs) clubs.innerHTML = teams.length ? teams.slice(-4).reverse().map(clubMiniCard).join('') : '<div class="hnl-empty">Nenhum clube cadastrado.</div>';
    const playerBox = $('#homeRecentPlayers');
    if (playerBox) playerBox.innerHTML = players.length ? players.slice(-5).reverse().map(playerMiniCard).join('') : '<div class="hnl-empty">Nenhum jogador registrado.</div>';
    const season = $('#homeSeasonPulse');
    if (season) season.innerHTML = `<div class="hnl-home-pulse-item"><strong>${teams.length}</strong><span>clubes construindo a temporada</span></div><div class="hnl-home-pulse-item"><strong>${players.length}</strong><span>jogadores na plataforma</span></div><div class="hnl-home-pulse-item"><strong>${events.length}</strong><span>competições organizadas</span></div><div class="hnl-home-pulse-item"><strong>${overview.stats?.partidas || 0}</strong><span>partidas registradas</span></div>`;
  }

  async function run() {
    await waitForExperience();
    const module = document.body?.dataset?.hnlModule || '';
    try {
      if (module === 'competitions') await upgradeCompetitions();
      else if (module === 'competition-detail') await upgradeCompetitionDetail();
      else if (module === 'dashboard') await upgradeDashboard();
    } catch (error) {
      console.error('[HNL Upgrade]', error);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();
}());
