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

const HNL_CAMP_ONE = Object.freeze({
  id: 'hnl-camp-1',
  slug: 'hnl-camp-1',
  name: 'HNL Camp 1º',
  title: 'HNL Camp 1º',
  seasonId: SEASON_ONE.id,
  status: 'upcoming',
  matchFormat: 'A definir',
  mode: 'A definir',
  structure: 'tbd',
  teamLimit: 8,
  minimumTeams: 4,
  startAt: '',
  description: 'Primeiro campeonato da Hollow Nexus T1. A organização definirá data, formato, estrutura e abertura das inscrições.',
  reward: '',
  prize: '',
  entryFee: '',
  registrationFee: '',
  registrations: [],
  isSeasonDraft: true
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

function isHnlCampOne(event = {}) {
  const values = [event.id, event.slug, event.name, event.title].map(normalize).filter(Boolean);
  return values.some((value) => value === 'hnl camp 1' || value === 'hnl camp primeiro');
}

function withSeasonCompetitions(events = []) {
  const visible = (Array.isArray(events) ? events : []).filter(isVisibleCompetition);
  let found = false;
  const competitions = visible.map((event) => {
    if (!isHnlCampOne(event)) return event;
    found = true;
    return {
      ...HNL_CAMP_ONE,
      ...event,
      seasonId: event.seasonId || SEASON_ONE.id,
      registrations: Array.isArray(event.registrations) ? event.registrations : []
    };
  });
  return found ? competitions : [{ ...HNL_CAMP_ONE }, ...competitions];
}

function publicSeason(events = []) {
  const competitions = withSeasonCompetitions(events).filter(isSeasonOneCompetition);
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
  HNL_CAMP_ONE,
  isRotaAoAbismo,
  isVisibleCompetition,
  seasonIdOf,
  isSeasonOneCompetition,
  isHnlCampOne,
  withSeasonCompetitions,
  publicSeason
};
