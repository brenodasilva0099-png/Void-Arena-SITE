function normalizeBracketData(data = {}) {
  const fill = (items, size) => {
    const arr = Array.isArray(items) ? items.slice(0, size) : [];
    while (arr.length < size) arr.push(null);
    return arr.map((item) => typeof item === 'string' ? item : (item?.id || null));
  };
  const fillProgress = (items, size) => {
    const arr = Array.isArray(items) ? items.slice(0, size) : [];
    while (arr.length < size) arr.push(1);
    return arr.map((value) => {
      const number = Number(value);
      return Number.isFinite(number) && number > 0 ? Math.floor(number) : 1;
    });
  };
  return {
    slots: fill(data.slots, 16),
    quarters: fill(data.quarters, 8),
    semis: fill(data.semis, 4),
    finals: fill(data.finals, 2),
    matchProgress: {
      slots: fillProgress(data.matchProgress?.slots, 16),
      quarters: fillProgress(data.matchProgress?.quarters, 8),
      semis: fillProgress(data.matchProgress?.semis, 4),
      finals: fillProgress(data.matchProgress?.finals, 2)
    },
    generatedAt: data.generatedAt || null,
    updatedAt: data.updatedAt || null
  };
}

function sanitizeTeam(team = {}) {
  return {
    id: team.id,
    name: team.name || 'Time',
    tag: team.tag || '',
    logo: team.logo || '',
    players: Array.isArray(team.players) ? team.players : [],
    reserves: Array.isArray(team.reserves) ? team.reserves : [],
    playerAccounts: team.playerAccounts || {},
    ownerUserId: team.ownerUserId || '',
    createdAt: team.createdAt || null,
    updatedAt: team.updatedAt || null
  };
}

function normalizeBracketForResponse(bracket = {}, teams = []) {
  const byId = new Map(teams.map((team) => [team.id, sanitizeTeam(team)]));
  const normalized = normalizeBracketData(bracket);
  const mapSlots = (items) => items.map((id) => id ? (byId.get(id) || { id, name: 'Time removido', tag: '---' }) : null);
  return {
    ...normalized,
    slots: mapSlots(normalized.slots),
    quarters: mapSlots(normalized.quarters),
    semis: mapSlots(normalized.semis),
    finals: mapSlots(normalized.finals)
  };
}

function shuffle(items = []) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateBracketSlots(teams = [], size = 16) {
  const picked = shuffle(teams).slice(0, size);
  const slots = Array(size).fill(null);
  picked.forEach((team, index) => { slots[index] = team?.id || null; });
  return slots;
}

function generateGroups(teams = [], settings = {}) {
  const count = Math.max(1, Number(settings.groupCount || 2) || 2);
  const groups = Array.from({ length: count }, (_, index) => ({ name: `Grupo ${String.fromCharCode(65 + index)}`, teams: [] }));
  teams.forEach((team, index) => groups[index % count].teams.push(sanitizeTeam(team)));
  return groups;
}

module.exports = {
  normalizeBracketData,
  normalizeBracketForResponse,
  sanitizeTeam,
  generateBracketSlots,
  generateGroups
};
