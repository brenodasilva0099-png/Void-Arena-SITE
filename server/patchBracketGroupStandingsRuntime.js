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
    result[id] = { played, wins, draws, losses, goalsFor, points: wins * 3 + draws };
  }
  return result;
}
`;
  source = source.replace('\nfunction normalizeBracketData(data = {}) {', `${helper}\nfunction normalizeBracketData(data = {}) {`);
}

source = source.replace(
  '    groups: normalizeGroups(data.groups || []),\n    matchProgress:',
  '    groups: normalizeGroups(data.groups || []),\n    groupStandings: normalizeGroupStandings(data.groupStandings || data.standings || {}),\n    matchProgress:'
);

if (source !== before) fs.writeFileSync(file, source, 'utf8');
console.log(source !== before ? '[Bracket] Pontuação dos grupos preservada no chaveamento.' : '[Bracket] Pontuação dos grupos já é preservada.');
