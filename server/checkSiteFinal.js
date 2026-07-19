const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const patches = [
  './patchBotPublicUrlRuntime',
  './patchStaticMaintenanceBypassRuntime',
  './patchBracketGroupStandingsRuntime',
  './patchLeagueExperienceRouteRegistrationRuntime',
  './patchCafeRankingRouteRegistrationRuntime',
  './patchLeagueExperienceRuntime',
  './patchLeagueCompetitionScriptsRuntime',
  './patchLegacyTeamOwnershipRuntime',
  './patchLeagueNavStateRuntime',
  './patchLeagueFinalRuntime',
  './patchLeagueClientStabilityRuntime',
  './patchLeagueExperienceCssRuntime',
  './patchLeagueExperienceFinalChangelogRuntime',
  './patchSiteIntegrityRuntime',
  './patchNavigationIntegrityRuntime'
];

require('./auditRuntimeSafety');
for (const patch of patches) require(patch);

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.isFile() && entry.name.endsWith('.js') ? [full] : [];
  });
}

const files = [
  ...walk(path.join(ROOT, 'server')),
  ...walk(path.join(ROOT, 'site')),
  path.join(ROOT, 'public', 'js', 'core', 'league-experience.js'),
  path.join(ROOT, 'public', 'js', 'core', 'social-icons.js'),
  path.join(ROOT, 'public', 'js', 'core', 'profile-api.js'),
  path.join(ROOT, 'public', 'js', 'core', 'league-navigation.js'),
  path.join(ROOT, 'public', 'js', 'core', 'league-auth-ui.js'),
  path.join(ROOT, 'public', 'js', 'core', 'league-page-integrity.js'),
  path.join(ROOT, 'public', 'js', 'core', 'api.js'),
  path.join(ROOT, 'public', 'js', 'pages', 'grupos.js'),
  path.join(ROOT, 'public', 'js', 'pages', 'chaveamento.js'),
  path.join(ROOT, 'public', 'js', 'pages', 'chaveamento-autosync-fix.js'),
  path.join(ROOT, 'public', 'js', 'pages', 'perfil.js')
].filter((file, index, list) => fs.existsSync(file) && !file.endsWith('checkSiteFinal.js') && list.indexOf(file) === index);

const failures = [];
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { cwd: ROOT, encoding: 'utf8' });
  if (result.status !== 0) failures.push(`${path.relative(ROOT, file)}\n${String(result.stderr || result.stdout || '').trim()}`);
}
console.log(`[Check Final] Sintaxe verificada em ${files.length} arquivo(s).`);
if (failures.length) {
  failures.forEach((failure) => console.error(`\n${failure}`));
  process.exit(1);
}

require('./auditSitePages');
for (const name of ['league-stable-final.json', 'page-integrity.json', 'navigation-integrity.json']) {
  if (!fs.existsSync(path.join(ROOT, 'public', name))) {
    console.error(`[Check Final] Marcador ausente: ${name}`);
    process.exit(1);
  }
}
if (process.exitCode) process.exit(process.exitCode);
console.log('[Check Final] Rotas, assets, menus, chaveamento, grupos, rankings, Café com Leite e navegação aprovados.');
