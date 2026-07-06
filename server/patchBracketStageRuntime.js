const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, 'services', 'bracket.service.js');
if (!fs.existsSync(file)) process.exit(0);
let src = fs.readFileSync(file, 'utf8');
let changed = false;

if (!src.includes('function normalizeGroupStandings')) {
  const helper = [
    '',
    'function normalizeGroupStandings(raw = {}) {',
    '  if (!raw || typeof raw !== "object") return {};',
    '  const output = {};',
    '  Object.entries(raw).forEach(([teamId, item]) => {',
    '    const id = String(teamId || "").trim();',
    '    if (!id) return;',
    '    output[id] = {',
    '      played: Math.max(0, Number(item?.played || item?.j || 0) || 0),',
    '      wins: Math.max(0, Number(item?.wins || item?.v || 0) || 0),',
    '      draws: Math.max(0, Number(item?.draws || item?.e || 0) || 0),',
    '      losses: Math.max(0, Number(item?.losses || item?.d || 0) || 0),',
    '      goalsFor: Math.max(0, Number(item?.goalsFor || item?.gp || 0) || 0),',
    '      goalsAgainst: Math.max(0, Number(item?.goalsAgainst || item?.gc || 0) || 0),',
    '      points: Math.max(0, Number(item?.points || item?.pts || 0) || 0)',
    '    };',
    '  });',
    '  return output;',
    '}',
    ''
  ].join('\n');
  src = src.replace('\nfunction normalizeBracketData(data = {}) {', helper + '\nfunction normalizeBracketData(data = {}) {');
  changed = true;
}

if (!src.includes('groupStandings: normalizeGroupStandings(data.groupStandings)')) {
  src = src.replace(
    '    groups: normalizeGroups(data.groups || []),\n    matchProgress:',
    '    groups: normalizeGroups(data.groups || []),\n    groupStandings: normalizeGroupStandings(data.groupStandings),\n    matchProgress:'
  );
  changed = true;
}

if (!src.includes('groupStandings: normalized.groupStandings')) {
  src = src.replace(
    '    groups: mapGroups(normalized.groups)\n  };',
    '    groups: mapGroups(normalized.groups),\n    groupStandings: normalized.groupStandings\n  };'
  );
  changed = true;
}

if (changed) fs.writeFileSync(file, src, 'utf8');
console.log(changed ? 'Patch aplicado: standings da fase de grupos preservados no site.' : 'Patch ignorado: standings já preservados.');
