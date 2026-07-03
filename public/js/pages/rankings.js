(async function () {
  const list = document.getElementById('rankingList');
  const st = document.getElementById('rankingStatus');

  try {
    await VoidArena.bootLayout('rankings');
    const [teamsData, resultsData] = await Promise.all([
      VoidArena.request('/api/teams'),
      VoidArena.request('/api/match-results').catch(() => ({ results: [] }))
    ]);

    const teams = teamsData.teams || [];
    const results = resultsData.results || resultsData.records || [];
    const wins = new Map();

    results.forEach((item) => {
      if (item.status !== 'validated' && !item.winnerTeamId) return;
      const id = String(item.winnerTeamId || '');
      if (!id) return;
      wins.set(id, (wins.get(id) || 0) + 1);
    });

    const ranked = teams
      .map((team) => ({ ...team, wins: wins.get(String(team.id)) || 0 }))
      .sort((a, b) => b.wins - a.wins || String(a.name || '').localeCompare(String(b.name || '')));

    list.innerHTML = ranked.length
      ? ranked.map((t, i) => `<div class="va-item"><strong>#${i + 1} ${VoidArena.escapeHtml(t.name)}</strong><div class="va-muted">${t.wins} vitória(s) validada(s). Pontuação completa em <a href="/pages/pontuacao.html">Pontuação</a>.</div></div>`).join('')
      : '<div class="va-item">Nenhum time para ranquear.</div>';

    st.textContent = 'Ranking carregado. Use a página Pontuação para ver VAP completo.';
    st.className = 'va-status ok';
  } catch (e) {
    st.textContent = `❌ ${e.message}`;
    st.className = 'va-status err';
  }
}());
