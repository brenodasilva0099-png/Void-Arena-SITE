const SEASON_ONE = Object.freeze({
  id: 'hollow-nexus-t1',
  number: 1,
  title: 'Temporada 1',
  name: 'Hollow Nexus T1',
  shortName: 'HN T1',
  status: 'preparing',
  statusLabel: 'Em preparação',
  startsAt: null,
  endsAt: null,
  description: 'Primeiro ciclo oficial da Hollow Nexus League. Os próximos campeonatos serão organizados dentro desta temporada, com calendário, súmulas, resultados e rankings reunidos no mesmo histórico.'
});

function normalize(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function isRotaAoAbismo(event = {}) {
  const values = [event.id, event.slug, event.name, event.title].map(normalize).filter(Boolean);
  return values.some((value) => value === 'rota ao abismo' || value.includes('rota ao abismo'));
}

function isVisibleCompetition(event = {}) {
  const status = normalize(event.status || '');
  return !['deleted', 'hidden', 'archived'].includes(status) && !isRotaAoAbismo(event);
}

function seasonIdOf(event = {}) {
  return String(event.seasonId || event.season?.id || '').trim();
}

function isSeasonOneCompetition(event = {}) {
  return seasonIdOf(event) === SEASON_ONE.id;
}

function publicSeason(events = []) {
  const competitions = (Array.isArray(events) ? events : []).filter(isVisibleCompetition).filter(isSeasonOneCompetition);
  const activeStatuses = new Set(['open', 'active', 'running']);
  const finishedStatuses = new Set(['closed', 'finished', 'ended', 'completed']);
  const registeredClubIds = new Set();

  competitions.forEach((event) => {
    (Array.isArray(event.registrations) ? event.registrations : []).forEach((registration) => {
      const id = String(registration?.teamId || registration?.id || '').trim();
      if (id) registeredClubIds.add(id);
    });
  });

  return {
    ...SEASON_ONE,
    competitionCount: competitions.length,
    activeCompetitionCount: competitions.filter((event) => activeStatuses.has(normalize(event.status))).length,
    finishedCompetitionCount: competitions.filter((event) => finishedStatuses.has(normalize(event.status))).length,
    registeredClubCount: registeredClubIds.size,
    competitionIds: competitions.map((event) => String(event.id || '')).filter(Boolean)
  };
}

module.exports = {
  SEASON_ONE,
  isRotaAoAbismo,
  isVisibleCompetition,
  seasonIdOf,
  isSeasonOneCompetition,
  publicSeason
};
