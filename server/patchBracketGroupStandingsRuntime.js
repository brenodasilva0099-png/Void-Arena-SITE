const fs = require('node:fs');
const path = require('node:path');

const serviceFile = path.join(__dirname, 'services', 'bracket.service.js');
const routeFile = path.join(__dirname, 'routes', 'bracketV2.routes.js');
let changed = false;

if (fs.existsSync(serviceFile)) {
  let source = fs.readFileSync(serviceFile, 'utf8');
  const before = source;

  if (!source.includes('function normalizeGroupStandings(')) {
    const helper = `
function normalizeGroupStandings(value = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result = {};
  for (const [teamId, raw] of Object.entries(value)) {
    const id = String(teamId || '').trim();
    if (!id) continue;
    const played = Math.max(0, Number(raw?.played ?? raw?.p ?? 0) || 0);
    const wins = Math.max(0, Number(raw?.wins ?? raw?.v ?? 0) || 0);
    const draws = Math.max(0, Number(raw?.draws ?? raw?.e ?? 0) || 0);
    const losses = Math.max(0, Number(raw?.losses ?? raw?.d ?? 0) || 0);
    const goalsFor = Math.max(0, Number(raw?.goalsFor ?? raw?.goals ?? raw?.g ?? raw?.gp ?? 0) || 0);
    const goalsAgainst = Math.max(0, Number(raw?.goalsAgainst ?? raw?.gc ?? 0) || 0);
    result[id] = { played, wins, draws, losses, goalsFor, goalsAgainst, points: wins * 3 + draws };
  }
  return result;
}
`;
    source = source.replace('\nfunction normalizeBracketData(data = {}) {', `${helper}\nfunction normalizeBracketData(data = {}) {`);
  }

  if (!source.includes('function generateGroups(')) {
    const helper = `
function generateGroups(teams = [], settings = {}) {
  const requested = Number(settings.groupCount || 4) || 4;
  const groupCount = Math.max(1, Math.min(Math.max(1, teams.length), requested));
  const shuffled = shuffle(Array.isArray(teams) ? teams : []);
  const groups = Array.from({ length: groupCount }, (_, index) => ({
    name: \`Grupo \${String.fromCharCode(65 + index)}\`,
    teams: []
  }));
  shuffled.forEach((team, index) => groups[index % groupCount].teams.push(team));
  return groups.filter((group) => group.teams.length);
}
`;
    source = source.replace('\nfunction generateBracketSlots(teams = [], limit = 16) {', `${helper}\nfunction generateBracketSlots(teams = [], limit = 16) {`);
  }

  source = source.replace(
    '    groups: normalizeGroups(data.groups || []),\n    matchProgress:',
    '    groups: normalizeGroups(data.groups || []),\n    groupStandings: normalizeGroupStandings(data.groupStandings || data.standings || {}),\n    matchProgress:'
  );

  if (!source.includes('\n  generateGroups\n')) {
    source = source.replace(
      '  generateBracketSlots,\n  generateAdaptiveBracket\n};',
      '  generateBracketSlots,\n  generateAdaptiveBracket,\n  generateGroups\n};'
    );
  }

  if (source !== before) {
    fs.writeFileSync(serviceFile, source, 'utf8');
    changed = true;
  }
}

if (fs.existsSync(routeFile)) {
  let source = fs.readFileSync(routeFile, 'utf8');
  const before = source;
  source = source.replace(
    "const bracket = await storage.writeBracket({ slotSize: generated.slotSize, teamLimit: limit, eventId: settings.activeEventId || '', teamSource: safeTeamSource(settings.teamSource), slots: generated.slots, round16: generated.round16, quarters: [], semis: [], finals: [], matchProgress: {}, generatedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });",
    "const bracket = await storage.writeBracket({ slotSize: generated.slotSize, teamLimit: limit, eventId: settings.activeEventId || '', teamSource: safeTeamSource(settings.teamSource), slots: generated.slots, round16: generated.round16, quarters: [], semis: [], finals: [], groups: groups.map((group) => ({ name: group.name, teams: (group.teams || []).map((team) => team.id).filter(Boolean) })), groupStandings: {}, matchProgress: {}, generatedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });"
  );
  if (source !== before) {
    fs.writeFileSync(routeFile, source, 'utf8');
    changed = true;
  }
}

console.log(changed ? '[Bracket] Sorteio, grupos persistidos e pontuação garantidos.' : '[Bracket] Sorteio e pontuação dos grupos já estão disponíveis.');
