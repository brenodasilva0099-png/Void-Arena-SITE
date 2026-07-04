(function () {
  const statusEl = document.getElementById('placarStatus');
  const table3 = document.getElementById('placar3v3Table');
  const table5 = document.getElementById('placar5v5Table');
  const queue3 = document.getElementById('queue3v3');
  const queue5 = document.getElementById('queue5v5');
  const ranksEl = document.getElementById('placarRanks');
  const esc = (value) => VoidArena.escapeHtml(value ?? '');

  function setStatus(message, type = '') {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.className = `va-status ${type}`.trim();
  }

  function avatar(player = {}) {
    return `<span class="va-placar-avatar">${player.avatar ? `<img src="${esc(player.avatar)}" alt="${esc(player.name)}" />` : esc((player.name || '?').slice(0, 1).toUpperCase())}</span>`;
  }

  function renderRanks(ranks = []) {
    if (!ranksEl) return;
    ranksEl.innerHTML = ranks.map((rank) => `<div class="va-rank-chip"><strong>${rank.emoji} ${esc(rank.name)}</strong><span>${rank.min}+ pts</span></div>`).join('');
  }

  function renderTable(table, players = [], mode = '3v3') {
    if (!table) return;
    table.innerHTML = '<thead><tr><th>#</th><th>Jogador</th><th>Patente</th><th class="num">Pts</th><th class="num">J</th><th class="num">V</th><th class="num">E</th><th class="num">D</th><th>Win-rate</th><th class="num">Gols</th><th class="num">Assist.</th><th class="num">Defesas</th><th class="num">MVP</th></tr></thead><tbody>' + (players.length ? players.map((p, index) => `<tr><td class="va-rank-pos">#${index + 1}</td><td><div class="va-placar-player">${avatar(p)}<span><strong>${esc(p.name)}</strong><small>${esc(p.discordId)}</small></span></div></td><td><span class="va-patente">${esc(p.rankEmoji)} ${esc(p.rankName)}</span></td><td class="num"><span class="va-placar-points">${p.points}</span></td><td class="num">${p.matches}</td><td class="num">${p.wins}</td><td class="num">${p.draws}</td><td class="num">${p.losses}</td><td><div class="va-winrate"><strong>${p.winRate}%</strong><div class="va-winrate-bar"><span style="width:${Math.min(100, Number(p.winRate || 0))}%"></span></div></div></td><td class="num">${p.goals}</td><td class="num">${p.assists}</td><td class="num">${p.defenses}</td><td class="num">${p.mvp}</td></tr>`).join('') : `<tr><td colspan="13">Nenhum jogador pontuou no ${mode.toUpperCase()} ainda.</td></tr>`) + '</tbody>';
  }

  async function load() {
    setStatus('Carregando placar...');
    const data = await VoidArena.request('/api/placar');
    renderRanks(data.ranks || []);
    if (queue3) queue3.textContent = `${data.queues?.['3v3']?.length || 0}/6`;
    if (queue5) queue5.textContent = `${data.queues?.['5v5']?.length || 0}/10`;
    renderTable(table3, data.leaderboards?.['3v3'] || [], '3v3');
    renderTable(table5, data.leaderboards?.['5v5'] || [], '5v5');
    setStatus(`Placar atualizado. Canal Discord do placar: 1522782784987463801.`, 'ok');
  }

  document.getElementById('reloadPlacarBtn')?.addEventListener('click', () => load().catch((error) => setStatus(`❌ ${error.message}`, 'err')));
  VoidArena.bootLayout('placar').then(load).catch((error) => setStatus(`❌ ${error.message}`, 'err'));
}());
