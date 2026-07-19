const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const CHECK_DIRS = [
  path.join(ROOT, 'server'),
  path.join(ROOT, 'site')
];
const EXTRA_FILES = [
  path.join(ROOT, 'public', 'js', 'core', 'league-auth-ui.js'),
  path.join(ROOT, 'public', 'js', 'core', 'league-page-integrity.js'),
  path.join(ROOT, 'public', 'js', 'core', 'league-polish.js'),
  path.join(ROOT, 'public', 'js', 'core', 'league-experience.js'),
  path.join(ROOT, 'public', 'js', 'pages', 'grupos.js')
];
const SKIP = new Set([
  path.join(ROOT, 'server', 'checkSite.js')
]);

function walkJs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkJs(full);
    return entry.isFile() && entry.name.toLowerCase().endsWith('.js') ? [full] : [];
  });
}

function checkFiles(files, label) {
  const failures = [];
  for (const file of files) {
    const result = spawnSync(process.execPath, ['--check', file], {
      cwd: ROOT,
      encoding: 'utf8'
    });
    if (result.status !== 0) {
      failures.push({
        file: path.relative(ROOT, file).replace(/\\/g, '/'),
        output: String(result.stderr || result.stdout || '').trim()
      });
    }
  }
  console.log(`[Check] ${label}: ${files.length} arquivo(s).`);
  if (failures.length) {
    failures.forEach((failure) => console.error(`\n[Check] ${failure.file}\n${failure.output}`));
    process.exit(1);
  }
}

const initialFiles = Array.from(new Set([
  ...CHECK_DIRS.flatMap(walkJs),
  ...EXTRA_FILES.filter(fs.existsSync)
])).filter((file) => !SKIP.has(file));
checkFiles(initialFiles, 'sintaxe inicial');

require('./patchLeagueExperienceRouteRegistrationRuntime');
require('./patchLeagueExperienceRuntime');
require('./patchLegacyTeamOwnershipRuntime');
require('./patchLeagueNavStateRuntime');
require('./patchLeagueExperienceFinalChangelogRuntime');
require('./patchSiteIntegrityRuntime');
require('./patchNavigationIntegrityRuntime');

const patchedFiles = [
  path.join(ROOT, 'site', 'index.js'),
  path.join(ROOT, 'server', 'routes', 'publicTeam.routes.js'),
  path.join(ROOT, 'server', 'routes', 'leagueExperience.routes.js'),
  path.join(ROOT, 'public', 'js', 'core', 'league-experience.js')
].filter(fs.existsSync);
checkFiles(patchedFiles, 'sintaxe após patches');

require('./auditSitePages');

const finalVersion = path.join(ROOT, 'public', 'league-experience-final.json');
if (!fs.existsSync(finalVersion)) {
  console.error('[Check] Marcador final league-experience-final.json não foi gerado.');
  process.exit(1);
}

if (process.exitCode) process.exit(process.exitCode);
console.log('[Check] Sintaxe antes/depois dos patches, experiência, gestão de clubes, menus, changelog, páginas, assets e navegação aprovados.');
