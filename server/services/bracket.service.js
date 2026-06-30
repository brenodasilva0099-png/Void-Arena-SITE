const SUPPORTED_TEAM_LIMITS = [4, 8, 12, 16, 20, 24, 28, 32];

function bracketSlotSize(limit = 16) {
  const number = Number(limit || 16);
  return number > 16 ? 32 : 16;
}

function normalizeTeamLimit(value = 16) {
  const number = Number(value || 16);
  return SUPPORTED_TEAM_LIMITS.includes(number) ? number : 16;
}

function normalizeBracketData(data = {}) {
  const size = Math.max(16, Number(data.slotSize || data.teamLimit || (Array.isArray(data.slots) && data.slots.length > 16 ? 32 : 16)) || 16);
  const slotSize = size > 16 ? 32 : 16;
  const fill = (items, targetSize) => {
    const arr = Array.isArray(items) ? items.slice(0, targetSize) : [];
    while (arr.length < targetSize) arr.push(null);
    return arr.map((item) => typeof item === 'string' ? item : (item?.id || null));
  };
  const fillProgress = (items, targetSize) => {
    const arr = Array.isArray(items) ? items.slice(0, targetSize) : [];
    while (arr.length < targetSize) arr.push(1);
    return arr.map((value) => {
      const number = Number(value);
      return Number.isFinite(number) && number > 0 ? Math.floor(number) : 1;
    });
  };
  return {
    slotSize,
    teamLimit: normalizeTeamLimit(data.teamLimit || slotSize),
    slots: fill(data.slots, slotSize),
    round16: fill(data.round16, 16),
    quarters: fill(data.quarters, 8),
    semis: fill(data.semis, 4),
    finals: fill(data.finals, 2),
    matchProgress: {
      slots: fillProgress(data.matchProgress?.slots, slotSize),
      round16: fillProgress(data.matchProgress?.round16, 16),
      quarters: fillProgress(data.matchProgress?.quarters, 8),
      semis: fillProgress(data.matchProgress?.semis, 4),
      finals: fillProgress(data.matchProgress?.finals, 2)
    },
    generatedAt: data.generatedAt || null,
    updatedAt: data.updatedAt || null
  };
}

function sanitizeTeam(team = {}, usersById = new Map()) {
  const owner = usersById.get(String(team.ownerUserId || '')) || null;
  return {
    id: team.id,
    name: team.name || 'Time',
    tag: team.tag || '',
    logo: team.logo || '',
    players: Array.isArray(team.players) ? team.players : [],
    reserves: Array.isArray(team.reserves) ? team.reserves : [],
    playerAccounts: team.playerAccounts || {},
    ownerUserId: team.ownerUserId || '',
    ownerName: owner?.profile?.username || owner?.name || team.ownerName || team.captainName || '',
    ownerAvatar: owner?.avatar || '',
    captainName: owner?.profile?.username || owner?.name || team.captainName || '',
    createdAt: team.createdAt || null,
    updatedAt: team.updatedAt || null,
    socials: team.socials || {}
  };
}

function normalizeBracketForResponse(bracket = {}, teams = [], users = []) {
  const usersById = new Map(users.map((user) => [String(user.id || ''), user]));
  const byId = new Map(teams.map((team) => { const safe = sanitizeTeam(team, usersById); return [safe.id, safe]; }));
  const normalized = normalizeBracketData(bracket);
  const mapSlots = (items) => items.map((id) => id ? (byId.get(id) || { id, name: 'Time removido', tag: '---' }) : null);
  return {
    ...normalized,
    slots: mapSlots(normalized.slots),
    round16: mapSlots(normalized.round16),
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

function basePairPositions(slotSize = 16) {
  if (slotSize > 16) return Array.from({ length: 32 }, (_, index) => index);
  // Ordem visual balanceada no board premium: metade esquerda primeiro, metade direita depois.
  return [0, 1, 8, 9, 2, 3, 10, 11, 4, 5, 12, 13, 6, 7, 14, 15];
}

function generateBracketSlots(teams = [], limit = 16) {
  const teamLimit = normalizeTeamLimit(limit);
  const slotSize = bracketSlotSize(teamLimit);
  const picked = shuffle(teams).slice(0, teamLimit);
  const slots = Array(slotSize).fill(null);
  const order = basePairPositions(slotSize).slice(0, teamLimit);
  picked.forEach((team, index) => {
    const slotIndex = order[index] ?? index;
    slots[slotIndex] = team?.id || null;
  });
  return slots;
}

function generateAdaptiveBracket(teams = [], limit = 16) {
  const teamLimit = normalizeTeamLimit(limit);
  const slotSize = bracketSlotSize(teamLimit);
  const picked = shuffle(teams).slice(0, teamLimit);
  if (slotSize === 16) {
    return { slotSize, teamLimit, slots: generateBracketSlots(picked, teamLimit), round16: [] };
  }

  const byeCount = Math.max(0, 32 - teamLimit);
  const prelimTeamCount = teamLimit - byeCount;
  const prelimTeams = picked.slice(0, prelimTeamCount);
  const byeTeams = picked.slice(prelimTeamCount);
  const slots = Array(32).fill(null);
  const round16 = Array(16).fill(null);

  prelimTeams.forEach((team, index) => { slots[index] = team?.id || null; });
  byeTeams.forEach((team, index) => {
    const target = prelimTeamCount / 2 + index;
    if (target < round16.length) round16[target] = team?.id || null;
  });

  return { slotSize, teamLimit, slots, round16 };
}

function generateGroups(teams = [], settings = {}) {
  const count = Math.max(1, Number(settings.groupCount || 2) || 2);
  const groups = Array.from({ length: count }, (_, index) => ({ name: `Grupo ${String.fromCharCode(65 + index)}`, teams: [] }));
  teams.forEach((team, index) => groups[index % count].teams.push(sanitizeTeam(team)));
  return groups;
}

function matchPairsForSlots(slots = []) {
  const pairs = [];
  for (let i = 0; i < slots.length; i += 2) {
    pairs.push([i, i + 1, slots[i], slots[i + 1]]);
  }
  return pairs;
}

function nextTargetForSlotMatch(matchIndex = 0, slotSize = 16) {
  // 4 times: duas semifinais visuais, vencedores vão direto para a final.
  if (slotSize === 16 && [0, 4].includes(matchIndex)) {
    return { round: 'finals', index: matchIndex === 0 ? 0 : 1 };
  }
  // 8 times: quatro quartas visuais, vencedores vão para semifinais.
  if (slotSize === 16 && [0, 1, 4, 5].includes(matchIndex)) {
    return { round: 'semis', index: ({ 0: 0, 1: 1, 4: 2, 5: 3 })[matchIndex] };
  }
  // 16 times: oitavas completas, vencedores vão para quartas.
  if (slotSize === 16) return { round: 'quarters', index: matchIndex };
  // 32 mode: rodada inicial alimenta as quartas/oitavas simplificadas da estrutura atual.
  return { round: 'quarters', index: Math.floor(matchIndex / 2) };
}

module.exports = {
  SUPPORTED_TEAM_LIMITS,
  bracketSlotSize,
  normalizeTeamLimit,
  normalizeBracketData,
  normalizeBracketForResponse,
  sanitizeTeam,
  generateBracketSlots,
  generateAdaptiveBracket,
  generateGroups,
  matchPairsForSlots,
  nextTargetForSlotMatch
};
