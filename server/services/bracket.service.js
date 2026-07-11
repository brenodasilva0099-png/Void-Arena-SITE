const SUPPORTED_TEAM_LIMITS = [4, 8, 12, 16, 20, 24, 28, 32];

function normalizeTeamLimit(value = 16) {
  const number = Number(value || 16);
  return SUPPORTED_TEAM_LIMITS.includes(number) ? number : 16;
}

function bracketSlotSize(limit = 16) {
  return normalizeTeamLimit(limit);
}

function extractImageUrl(value = '') {
  if (value && typeof value === 'object') {
    return extractImageUrl(value.url || value.src || value.href || value.proxyUrl || value.data || value.base64 || '');
  }
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^data:image\/[^;]+;base64,/i.test(raw)) return raw;
  const srcMatch = raw.match(/(?:src|href)=["']([^"']+)["']/i);
  if (srcMatch?.[1]) return srcMatch[1].trim();
  const markdownMatch = raw.match(/!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/i);
  if (markdownMatch?.[1]) return markdownMatch[1].trim();
  const urlMatch = raw.match(/https?:\/\/[^\s"'<>]+/i);
  if (urlMatch?.[0]) return urlMatch[0].trim();
  return raw;
}

function safeTeamLogo(value = '') {
  const raw = extractImageUrl(value);
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw.slice(0, 2400);
  // Logos coladas/enviadas em base64 podem passar de 2.5MB. Não truncar no meio do base64.
  if (/^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,/i.test(raw)) return raw.slice(0, 9000000);
  if (/^\/(assets|uploads|images|img|public)\//i.test(raw)) return raw.slice(0, 1600);
  return '';
}

function resolveTeamLogo(team = {}) {
  const values = [team.logo, team.logoUrl, team.logoURL, team.teamLogo, team.teamLogoUrl, team.badge, team.badgeUrl, team.escudo, team.image, team.imageUrl, team.avatar, team.icon, team.logoOriginal];
  for (const value of values) {
    const logo = safeTeamLogo(value);
    if (logo) return logo;
  }
  return '';
}

function sanitizeGroupName(value = '', index = 0) {
  const fallback = `Grupo ${String.fromCharCode(65 + index)}`;
  return String(value || fallback).trim().slice(0, 40) || fallback;
}

function normalizeGroups(groups = []) {
  if (!Array.isArray(groups)) return [];
  return groups.map((group, index) => ({
    name: sanitizeGroupName(group?.name, index),
    teams: (Array.isArray(group?.teams) ? group.teams : Array.isArray(group?.teamIds) ? group.teamIds : [])
      .map((item) => typeof item === 'string' ? item : (item?.id || null))
      .filter(Boolean)
  })).filter((group) => group.teams.length);
}

function normalizeBracketData(data = {}) {
  const inferred = data.teamLimit || data.slotSize || (Array.isArray(data.slots) ? data.slots.length : 16) || 16;
  const teamLimit = normalizeTeamLimit(inferred);
  const slotSize = bracketSlotSize(teamLimit);
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
    teamLimit,
    slots: fill(data.slots, slotSize),
    round16: fill(data.round16, 16),
    quarters: fill(data.quarters, 8),
    semis: fill(data.semis, 4),
    finals: fill(data.finals, 2),
    groups: normalizeGroups(data.groups || []),
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
  const logo = resolveTeamLogo(team);
  return {
    id: team.id,
    name: team.name || 'Time',
    tag: team.tag || '',
    logo,
    logoOriginal: team.logo || logo || '',
    logoUrl: logo,
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
  const mapSlots = (items) => items.map((id) => id ? (byId.get(id) || { id, name: 'Time removido', tag: '---', logo: '' }) : null);
  const mapGroups = (groups = []) => groups.map((group) => ({
    name: group.name,
    teams: mapSlots(group.teams || [])
  }));
  return {
    ...normalized,
    slots: mapSlots(normalized.slots),
    round16: mapSlots(normalized.round16),
    quarters: mapSlots(normalized.quarters),
    semis: mapSlots(normalized.semis),
    finals: mapSlots(normalized.finals),
    groups: mapGroups(normalized.groups)
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

function generateBracketSlots(teams = [], limit = 16) {
  const teamLimit = normalizeTeamLimit(limit);
  const picked = shuffle(teams).slice(0, teamLimit);
  const slots = Array(teamLimit).fill(null);
  picked.forEach((team, index) => { slots[index] = team?.id || null; });
  return slots;
}

function generateAdaptiveBracket(teams = [], limit = 16) {
  const teamLimit = normalizeTeamLimit(limit);
  const slotSize = bracketSlotSize(teamLimit);
  const picked = shuffle(teams).slice(0, teamLimit);

  if (teamLimit <= 16) {
    return { slotSize, teamLimit, slots: picked.map((team) => team?.id || null), round16: [] };
  }

  return { slotSize, teamLimit, slots: picked.map((team) => team?.id || null), round16: [] };
}

module.exports = {
  SUPPORTED_TEAM_LIMITS,
  normalizeTeamLimit,
  bracketSlotSize,
  safeTeamLogo,
  resolveTeamLogo,
  sanitizeTeam,
  normalizeBracketData,
  normalizeBracketForResponse,
  generateBracketSlots,
  generateAdaptiveBracket
};
