(function () {
  'use strict';

  const BUILD = '2026-07-23-dashboard-competition-v1';
  const ACTIVE_STATUSES = new Set(['open', 'active', 'running']);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

  function titleOf(event = {}) {
    return String(event.name || event.title || 'Competição')
      .replace(/\s+/g, ' ')
      .replace(/\bnexus\s+cup\b/i, 'Nexus Cup')
      .replace(/\s+(\d+[ªº])\s*-?\s*edição\b/i, ' — $1 Edição')
      .trim();
  }

  function statusLabel(status = '') {
    const key = String(status || '').toLowerCase();
    return ({
      open: 'Inscrições abertas',
      active: 'Competição ativa',
      running: 'Em andamento',
      upcoming: 'Em breve',
      closed: 'Inscrições encerradas',
      finished: 'Finalizada',
      archived: 'Arquivada'
    })[key] || 'Competição oficial';
  }

  function structureLabel(value = '') {
    const key = String(value || '').toLowerCase();
    return ({
      single_elimination: 'Mata-mata',
      groups: 'Fase de grupos',
      groups_playoffs: 'Grupos + playoffs'
    })[key] || String(value || 'Mata-mata').replaceAll('_', ' ');
  }

  function formatDate(value) {
    if (!value) return 'Data não definida';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function feeLabel(event = {}) {
    const value = event.feeLabel ?? event.entryFee ?? event.registrationFee;
    if (value == null || value === '') return 'Gratuita';
    if (typeof value === 'number' || /^\d+(?:[.,]\d+)?$/.test(String(value).trim())) {
      const amount = Number(String(value).replace(',', '.'));
      return Number.isFinite(amount) ? amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : String(value);
    }
    return String(value);
  }

  function registrationsOf(event = {}) {
    return Array.isArray(event.registrations) ? event.registrations.length : number(event.registeredCount);
  }

  function eventOrder(event = {}) {
    const status = String(event.status || '').toLowerCase();
    const activeOrder = ACTIVE_STATUSES.has(status) ? 0 : status === 'upcoming' ? 1 : 2;
    const time = new Date(event.startAt || event.date || 0).getTime();
    return [activeOrder, Number.isFinite(time) ? time : Number.MAX_SAFE_INTEGER];
  }

  function mergeEvents(overviewEvents = [], detailedEvents = []) {
    const map = new Map();
    [...overviewEvents, ...detailedEvents].forEach((event) => {
      const key = String(event?.id || event?.name || event?.title || '').trim();
      if (!key) return;
      map.set(key, { ...(map.get(key) || {}), ...event });
    });
    return Array.from(map.values()).sort((a, b) => {
      const left = eventOrder(a);
      const right = eventOrder(b);
      return left[0] - right[0] || left[1] - right[1];
    });
  }

  function card(event = {}, index = 0) {
    const id = String(event.id || '');
    const status = String(event.status || 'upcoming').toLowerCase();
    const active = ACTIVE_STATUSES.has(status);
    const registered = registrationsOf(event);
    const limit = Math.max(1, number(event.teamLimit, 16));
    const progress = Math.max(0, Math.min(100, Math.round((registered / limit) * 100)));
    const description = String(event.description || 'Acompanhe inscrições, formato, clubes confirmados e todas as etapas da competição.').trim();
    const detailHref = `/pages/competicao.html?id=${encodeURIComponent(id)}`;
    const canRegister = active && registered < limit;

    return `<article class="hnl-home-comp-card${index === 0 ? ' is-featured' : ''}">
      <header class="hnl-home-comp-head">
        <div class="hnl-home-comp-status"><span class="hnl-chip${active ? ' green' : ''}">${esc(statusLabel(status))}</span><span class="hnl-chip">Oficial</span></div>
        <div class="hnl-home-comp-mark" aria-hidden="true">♕</div>
      </header>
      <h3>${esc(titleOf(event))}</h3>
      ${index === 0 ? `<p class="hnl-home-comp-description">${esc(description)}</p>` : ''}
      <div class="hnl-home-comp-meta">
        <span><small>Início</small><strong>${esc(formatDate(event.startAt || event.date))}</strong></span>
        <span><small>Formato</small><strong>${esc(event.matchFormat || 'MD1')}</strong></span>
        <span><small>Estrutura</small><strong>${esc(structureLabel(event.structure || event.mode))}</strong></span>
        <span><small>Entrada</small><strong>${esc(feeLabel(event))}</strong></span>
      </div>
      <div class="hnl-home-comp-progress">
        <div><span>Clubes confirmados</span><strong>${registered}/${limit}</strong></div>
        <div class="hnl-home-comp-track"><i style="width:${progress}%"></i></div>
      </div>
      <footer class="hnl-home-comp-actions">
        ${canRegister ? `<a class="hnl-btn primary" href="${detailHref}#inscricao">Inscrever meu time</a>` : ''}
        <a class="hnl-btn" href="${detailHref}">Ver detalhes</a>
        <a class="hnl-home-comp-all" href="/pages/competicoes.html">Todas as competições →</a>
      </footer>
    </article>`;
  }

  async function request(url) {
    const response = await fetch(url, { credentials: 'include', cache: 'no-store', headers: { Accept: 'application/json' } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) throw new Error(data.message || `HTTP ${response.status}`);
    return data;
  }

  async function waitForBaseExperience() {
    for (let index = 0; index < 100; index += 1) {
      if (document.documentElement.dataset.hnlExperienceReady === '1') return;
      await new Promise((resolve) => window.setTimeout(resolve, 50));
    }
  }

  async function render() {
    const box = document.getElementById('homeCompetitions');
    if (!box) return;

    const panel = box.closest('.hnl-card');
    panel?.classList.add('hnl-home-competition-panel');
    box.classList.add('hnl-home-competition-list');
    box.innerHTML = '<div class="hnl-home-comp-loading">Carregando competições...</div>';

    const [overview, eventsData] = await Promise.all([
      request('/api/league/overview').catch(() => ({ events: [] })),
      request('/api/events').catch(() => ({ events: [] }))
    ]);
    const events = mergeEvents(overview.events || [], eventsData.events || []);
    box.innerHTML = events.length
      ? events.slice(0, 3).map(card).join('')
      : '<div class="hnl-home-comp-empty"><strong>Nenhuma competição disponível.</strong><span>Quando uma nova edição for criada, ela aparecerá aqui.</span></div>';
    document.documentElement.dataset.hnlDashboardCompetitionBuild = BUILD;
  }

  async function boot() {
    await waitForBaseExperience();
    try {
      await render();
    } catch (error) {
      console.error('[Dashboard Competition Highlight]', error);
      const box = document.getElementById('homeCompetitions');
      if (box) box.innerHTML = '<div class="hnl-home-comp-empty"><strong>Não foi possível carregar as competições agora.</strong><span>Atualize a página em alguns instantes.</span></div>';
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
}());
