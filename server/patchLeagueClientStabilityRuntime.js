const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, '..', 'public', 'js', 'core', 'league-experience.js');
if (!fs.existsSync(file)) process.exit(0);
let source = fs.readFileSync(file, 'utf8');
const before = source;

source = source.replace(
  "const data = await api('/api/teams');\n    const teams = data.teams || [];",
  "const data = await api('/api/league/clubs');\n    const teams = data.clubs || [];"
);

source = source.replace(
  "if (ranking) ranking.innerHTML = (data.teams || []).length ? data.teams.slice(0, 5).map((team, index) => `<div class=\"hnl-profile-row\"><div class=\"hnl-rank ${index < 3 ? 'top' : ''}\">${index + 1}</div><div><strong>${esc(team.name || 'Clube')}</strong><p>${esc(team.tag || '')}</p></div><a class=\"hnl-btn\" href=\"/pages/perfil-clube.html?id=${encodeURIComponent(team.id || '')}\">Ver</a></div>`).join('') : empty('Nenhum clube cadastrado.');",
  "if (ranking) ranking.innerHTML = (data.teams || []).length ? data.teams.slice(0, 5).map((team, index) => `<div class=\"hnl-profile-row\"><img class=\"hnl-club-logo\" src=\"${esc(image(team.logo))}\" alt=\"Logo de ${esc(team.name || 'clube')}\"><div><strong>${index + 1}. ${esc(team.name || 'Clube')}</strong><p>${esc(team.tag || '')}</p></div><a class=\"hnl-btn\" href=\"/pages/perfil-clube.html?id=${encodeURIComponent(team.id || '')}\">Ver</a></div>`).join('') : empty('Nenhum clube cadastrado.');"
);

source = source.replace(/  async function rankings\(\) \{[\s\S]*?\n  \}\n\n  async function cafe\(\) \{/m, `  async function rankings() {
    const data = await api('/api/league/rankings');
    const clubs = data.clubs || [];
    const players = data.players || [];
    const clubBody = $('#clubRanking');
    const playerBody = $('#playerRanking');
    if (clubBody) clubBody.innerHTML = clubs.length ? clubs.map((team, index) => \`<tr><td><span class="hnl-rank \${index < 3 ? 'top' : ''}">\${index + 1}</span></td><td><div class="hnl-profile-row hnl-table-person"><img class="hnl-club-logo" src="\${esc(image(team.logo))}" alt="Logo"><div><a href="/pages/perfil-clube.html?id=\${encodeURIComponent(team.id || '')}"><strong>\${esc(team.name || 'Clube')}</strong></a><small>\${esc(team.tag || '')}</small></div></div></td><td>\${numberValue(team.points)}</td><td>\${numberValue(team.wins)}</td><td>\${numberValue(team.goals)}</td></tr>\`).join('') : '<tr><td colspan="5">Nenhum clube cadastrado.</td></tr>';
    if (playerBody) playerBody.innerHTML = players.length ? players.map((player, index) => \`<tr><td><span class="hnl-rank \${index < 3 ? 'top' : ''}">\${index + 1}</span></td><td><div class="hnl-profile-row hnl-table-person"><img class="hnl-avatar round" src="\${esc(image(player.avatar))}" alt="Avatar"><div>\${player.profileUrl ? \`<a href="\${esc(player.profileUrl)}"><strong>\${esc(player.name || 'Jogador')}</strong></a>\` : \`<strong>\${esc(player.name || 'Jogador')}</strong>\`}<small>\${esc(player.profile?.primaryPosition || 'Membro')}</small></div></div></td><td>\${numberValue(player.points)}</td><td>\${numberValue(player.goals)}</td><td>\${numberValue(player.passes)}</td></tr>\`).join('') : '<tr><td colspan="5">Nenhum jogador cadastrado.</td></tr>';
    if (data.degraded && $('#pageStatus')) $('#pageStatus').innerHTML = notice('Alguns dados ainda estão sincronizando com o BOT; o que já foi carregado permanece disponível.', '');
  }

  function numberValue(value) { const parsed = Number(value || 0); return Number.isFinite(parsed) ? parsed : 0; }

  async function cafe() {`);

source = source.replace(/  async function cafe\(\) \{[\s\S]*?\n  \}\n\n  async function calendar\(\) \{/m, `  async function cafe() {
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
    if (buttons) buttons.innerHTML = metrics.map(([key, label]) => \`<button class="hnl-btn \${key === metric ? 'primary' : ''}" type="button" data-cafe-metric="\${key}">\${label}</button>\`).join('');
    const render = () => {
      const term = String(search?.value || '').trim().toLocaleLowerCase('pt-BR');
      const filtered = ranking.filter((player) => String(player.name || '').toLocaleLowerCase('pt-BR').includes(term));
      const sorted = [...filtered].sort((a, b) => {
        const diff = numberValue(b[metric]) - numberValue(a[metric]);
        return (descending ? diff : -diff) || numberValue(b.points) - numberValue(a.points) || String(a.name).localeCompare(String(b.name), 'pt-BR');
      });
      box.innerHTML = sorted.length ? \`<div class="hnl-table-wrap"><table class="hnl-table"><thead><tr><th>#</th><th>Jogador</th><th>Pontos</th><th>Gols</th><th>Passes</th><th>Assist.</th><th>Jogos</th><th>MVP</th></tr></thead><tbody>\${sorted.map((player, index) => \`<tr><td><span class="hnl-rank \${index < 3 ? 'top' : ''}">\${index + 1}</span></td><td><div class="hnl-profile-row hnl-table-person"><img class="hnl-avatar round" src="\${esc(image(player.avatar))}" alt="Avatar"><div>\${player.profileUrl ? \`<a href="\${esc(player.profileUrl)}"><strong>\${esc(player.name || 'Jogador')}</strong></a>\` : \`<strong>\${esc(player.name || 'Jogador')}</strong>\`}<small>\${esc(player.profile?.primaryPosition || player.roles?.[0]?.name || 'Membro')}</small></div></div></td><td>\${numberValue(player.points)}</td><td>\${numberValue(player.goals)}</td><td>\${numberValue(player.passes)}</td><td>\${numberValue(player.assists)}</td><td>\${numberValue(player.matches)}</td><td>\${numberValue(player.mvp)}</td></tr>\`).join('')}</tbody></table></div>\` : empty('Nenhum membro encontrado para esse filtro.');
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

  async function calendar() {`);

source = source.replace(
  "const data = await api('/api/events');\n    const events = data.events || [];",
  "const data = await api('/api/league/competitions');\n    const events = data.competitions || [];"
);

source = source.replace(
  "const [playersData, teamsData, transfersData, viewerData] = await Promise.all([api('/api/league/players'), api('/api/teams'), api('/api/league/transfers'), viewer()]);",
  "const [playersData, teamsData, transfersData, viewerData] = await Promise.all([api('/api/league/players'), api('/api/league/clubs'), api('/api/league/transfers'), viewer()]);"
);
source = source.replace("const teams = teamsData.teams || [];", "const teams = teamsData.clubs || teamsData.teams || [];");

source = source.replace(/  async function simpleCompetitive\(\) \{[\s\S]*?\n  \}\n\n  function globalInteractions\(\) \{/m, `  async function results() {
    const box = $('#resultsList');
    if (!box) return;
    const data = await api('/api/match-results');
    const resultsList = data.results || [];
    box.innerHTML = resultsList.length ? resultsList.map((result) => \`<article class="hnl-card"><span class="hnl-chip \${result.status === 'validated' ? 'green' : ''}">\${esc(result.status || 'pending')}</span><h2>\${esc(result.match?.teamA?.name || result.teamA?.name || 'Equipe A')} \${numberValue(result.finalScoreA ?? result.scoreA)} × \${numberValue(result.finalScoreB ?? result.scoreB)} \${esc(result.match?.teamB?.name || result.teamB?.name || 'Equipe B')}</h2><p>\${fmt(result.updatedAt || result.createdAt)}</p></article>\`).join('') : empty('Nenhum resultado registrado.');
  }

  async function notificationsPage() {
    const box = $('#notificationsPage') || $('#mailPage');
    if (!box) return;
    const data = await api('/api/notifications').catch(() => ({ notifications: [] }));
    const items = data.notifications || [];
    box.innerHTML = items.length ? items.map((item) => \`<article class="hnl-card"><span class="hnl-chip">\${esc(item.status || 'nova')}</span><h2>\${esc(item.title || 'Notificação')}</h2><p>\${esc(item.note || item.message || '')}</p></article>\`).join('') : empty('Nenhuma notificação no momento.');
  }

  function globalInteractions() {`);

source = source.replace(
  "const handlers = { dashboard, clubs, players, 'player-profile': playerProfile, 'club-profile': clubProfile, 'create-club': createClub, market, rankings, cafe, calendar, competitions, 'competition-detail': competitionDetail, transfers, tactics, bracket: simpleCompetitive, groups: simpleCompetitive, results: simpleCompetitive };",
  "const handlers = { dashboard, clubs, players, 'player-profile': playerProfile, 'club-profile': clubProfile, 'create-club': createClub, market, rankings, cafe, calendar, competitions, 'competition-detail': competitionDetail, transfers, tactics, results, notifications: notificationsPage, mail: notificationsPage };"
);

if (!source.includes("document.addEventListener('error', (event) =>")) {
  source = source.replace(
    "  async function run() {",
    `  document.addEventListener('error', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLImageElement)) return;
    if (target.dataset.hnlFallbackApplied === '1') return;
    target.dataset.hnlFallbackApplied = '1';
    target.src = FALLBACK_LOGO;
  }, true);

  async function run() {`
  );
}

if (source !== before) fs.writeFileSync(file, source, 'utf8');
console.log(source !== before
  ? '[League/Client] Listagens, rankings, Café com Leite e resultados estabilizados.'
  : '[League/Client] Cliente League já estava estabilizado.');
