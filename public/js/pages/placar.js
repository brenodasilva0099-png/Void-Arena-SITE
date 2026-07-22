(function () {
  'use strict';

  const statusEl = document.getElementById('placarStatus');
  const table3 = document.getElementById('placar3v3Table');
  const table5 = document.getElementById('placar5v5Table');
  const queue3 = document.getElementById('queue3v3');
  const queue5 = document.getElementById('queue5v5');
  const ranksEl = document.getElementById('placarRanks');
  const consoleEl = document.getElementById('placarConsole');
  const loginEl = document.getElementById('placarLoginRequired');

  function escapeHtml(value = '') {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
  }

  function number(value) {
    const parsed = Number(value || 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function setStatus(message, type = '') {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.className = `hnl-placar-status ${type}`.trim();
  }

  async function getJson(url) {
    const response = await fetch(`${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`, {
      credentials: 'include',
      cache: 'no-store',
      headers: { Accept: 'application/json' }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) {
      const error = new Error(data.message || `Falha ao carregar o placar (${response.status}).`);
      error.status = response.status;
      throw error;
    }
    return data;
  }

  function avatar(player = {}) {
    const name = escapeHtml(player.name || 'Jogador');
    if (player.avatar) {
      return `<span class="hnl-placar-avatar"><img src="${escapeHtml(player.avatar)}" alt="Avatar de ${name}" loading="lazy"></span>`;
    }
    return `<span class="hnl-placar-avatar">${name.slice(0, 1).toUpperCase() || '?'}</span>`;
  }

  function renderRanks(ranks = []) {
    if (!ranksEl) return;
    ranksEl.innerHTML = ranks.length
      ? ranks.map((rank) => `<div class="hnl-rank-chip"><strong>${escapeHtml(rank.emoji || '•')} ${escapeHtml(rank.name || 'Patente')}</strong><span>${number(rank.min)}+ pts</span></div>`).join('')
      : '<div class="hnl-rank-chip"><strong>Patentes</strong><span>aguardando o bot</span></div>';
  }

  function renderTable(table, players = [], mode = '3v3') {
    if (!table) return;
    const rows = Array.isArray(players) ? players : [];
    table.innerHTML = `<thead><tr><th>#</th><th>Jogador</th><th>Patente</th><th class="num">Pts</th><th class="num">J</th><th class="num">V</th><th class="num">E</th><th class="num">D</th><th>Win-rate</th><th class="num">Gols</th><th class="num">Assist.</th><th class="num">Defesas</th><th class="num">MVP</th></tr></thead><tbody>${rows.length ? rows.map((player, index) => {
      const matches = number(player.matches);
      const wins = number(player.wins);
      const rate = Number.isFinite(Number(player.winRate)) ? Number(player.winRate) : (matches ? (wins / matches) * 100 : 0);
      return `<tr><td class="hnl-score">#${index + 1}</td><td><div class="hnl-placar-player">${avatar(player)}<span><strong>${escapeHtml(player.name || 'Jogador')}</strong><small>${escapeHtml(player.discordId || 'Discord reconhecido pelo bot')}</small></span></div></td><td><span class="hnl-patent">${escapeHtml(player.rankEmoji || '•')} ${escapeHtml(player.rankName || 'Inicial')}</span></td><td class="num"><span class="hnl-score">${number(player.points)}</span></td><td class="num">${matches}</td><td class="num">${wins}</td><td class="num">${number(player.draws)}</td><td class="num">${number(player.losses)}</td><td>${rate.toFixed(1)}%</td><td class="num">${number(player.goals)}</td><td class="num">${number(player.assists)}</td><td class="num">${number(player.defenses)}</td><td class="num">${number(player.mvp)}</td></tr>`;
    }).join('') : `<tr><td colspan="13">Nenhum jogador pontuou no Café com Leite ${mode.toUpperCase()} ainda.</td></tr>`}</tbody>`;
  }

  function selectTab(mode) {
    document.querySelectorAll('[data-placar-tab]').forEach((button) => {
      const active = button.dataset.placarTab === mode;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    document.querySelectorAll('[data-placar-panel]').forEach((panel) => {
      panel.hidden = panel.dataset.placarPanel !== mode;
    });
  }

  function showLoginRequired() {
    if (consoleEl) consoleEl.hidden = true;
    if (loginEl) loginEl.hidden = false;
    setStatus('Entre com Discord para que o bot reconheça sua conta e carregue o ranking.', 'err');
  }

  async function load() {
    setStatus('Sincronizando filas, patentes e rankings com o bot...');
    const session = await getJson('/api/auth/session');
    if (!session.authenticated) {
      showLoginRequired();
      return;
    }

    if (consoleEl) consoleEl.hidden = false;
    if (loginEl) loginEl.hidden = true;
    const data = await getJson('/api/placar');
    renderRanks(data.ranks || []);
    if (queue3) queue3.textContent = `${data.queues?.['3v3']?.length || 0}/6`;
    if (queue5) queue5.textContent = `${data.queues?.['5v5']?.length || 0}/10`;
    renderTable(table3, data.leaderboards?.['3v3'] || [], '3x3');
    renderTable(table5, data.leaderboards?.['5v5'] || [], '5x5');
    setStatus('Placar Café com Leite atualizado com os dados do bot.', 'ok');
  }

  document.querySelectorAll('[data-placar-tab]').forEach((button) => {
    button.addEventListener('click', () => selectTab(button.dataset.placarTab || '3v3'));
  });
  document.getElementById('reloadPlacarBtn')?.addEventListener('click', () => {
    load().catch((error) => error.status === 401 ? showLoginRequired() : setStatus(error.message, 'err'));
  });

  selectTab('3v3');
  load().catch((error) => error.status === 401 ? showLoginRequired() : setStatus(error.message, 'err'));
}());
