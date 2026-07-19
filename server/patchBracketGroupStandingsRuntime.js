const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, 'services', 'bracket.service.js');
if (!fs.existsSync(file)) process.exit(0);
let source = fs.readFileSync(file, 'utf8');
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

if (!source.includes('    generateGroups,')) {
  source = source.replace(
    '    generateBracketSlots,\n    generateAdaptiveBracket',
    '    generateBracketSlots,\n    generateAdaptiveBracket,\n    generateGroups'
  );
  source = source.replace(
    '  generateBracketSlots,\n  generateAdaptiveBracket',
    '  generateBracketSlots,\n  generateAdaptiveBracket,\n  generateGroups'
  );
}

if (source !== before) fs.writeFileSync(file, source, 'utf8');
console.log(source !== before ? '[Bracket] Sorteio e pontuação dos grupos garantidos no serviço.' : '[Bracket] Sorteio e pontuação dos grupos já estão disponíveis.');
