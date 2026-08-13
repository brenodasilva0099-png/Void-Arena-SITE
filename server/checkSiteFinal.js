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
  './patchNavigationIntegrityRuntime',
  './patchLeagueProfilesCompetitionsHomeRuntime',
  './patchProfileInlineCriticalExtrasRuntime',
  './patchAuditInlineProfileRuntime',
  './patchAdvancedTacticalSimulatorRuntime',
  './patchBracketStylesheetFinalRuntime',
  './patchCanonicalAuthClientRuntime',
  './patchFormsStaticAssetRuntime',
  './patchFinalNavigationNoPrefetchRuntime',
  './patchAdminChatNavigationRuntime',
  './patchCurrentSumulasNavigationRuntime'
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
  path.join(ROOT, 'public', 'assets', 'api.js'),
  path.join(ROOT, 'public', 'js', 'core', 'league-experience.js'),
  path.join(ROOT, 'public', 'js', 'core', 'league-home-competitions-upgrade.js'),
  path.join(ROOT, 'public', 'js', 'core', 'tactical-simulator-v2.js'),
  path.join(ROOT, 'public', 'js', 'core', 'social-icons.js'),
  path.join(ROOT, 'public', 'js', 'core', 'profile-api.js'),
  path.join(ROOT, 'public', 'js', 'core', 'league-navigation.js'),
  path.join(ROOT, 'public', 'js', 'core', 'league-auth-ui.js'),
  path.join(ROOT, 'public', 'js', 'core', 'league-page-integrity.js'),
  path.join(ROOT, 'public', 'js', 'core', 'api.js'),
  path.join(ROOT, 'public', 'js', 'formularios.js'),
  path.join(ROOT, 'public', 'js', 'pages', 'grupos.js'),
  path.join(ROOT, 'public', 'js', 'pages', 'chaveamento.js'),
  path.join(ROOT, 'public', 'js', 'pages', 'chaveamento-autosync-fix.js'),
  path.join(ROOT, 'public', 'js', 'pages', 'configuracoes.js'),
  path.join(ROOT, 'public', 'js', 'pages', 'chat-bridge-stable.js'),
  path.join(ROOT, 'public', 'js', 'permissoes.js'),
  path.join(ROOT, 'public', 'js', 'pages', 'perfil.js'),
  path.join(ROOT, 'public', 'js', 'pages', 'sumulas.js')
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

require('./auditCanonicalAuth');
require('./auditSitePages');
require('./auditFinalRuntimeStability');
for (const name of ['league-stable-final.json', 'page-integrity.json', 'navigation-integrity.json', 'league-home-competition-profile.json', 'tactical-simulator-version.json']) {
  if (!fs.existsSync(path.join(ROOT, 'public', name))) {
    console.error(`[Check Final] Marcador ausente: ${name}`);
    process.exit(1);
  }
}
const tacticalPage = fs.readFileSync(path.join(ROOT, 'public', 'pages', 'prancheta-tatica.html'), 'utf8');
for (const marker of ['/css/tactical-simulator-v2.css', '/js/core/tactical-simulator-v2.js']) {
  if (!tacticalPage.includes(marker)) {
    console.error(`[Check Final] Prancheta sem recurso obrigatório: ${marker}`);
    process.exit(1);
  }
}

const sumulasPage = fs.readFileSync(path.join(ROOT, 'public', 'pages', 'sumulas.html'), 'utf8');
const sumulasClient = fs.readFileSync(path.join(ROOT, 'public', 'js', 'pages', 'sumulas.js'), 'utf8');
const sumulasRoutes = fs.readFileSync(path.join(ROOT, 'server', 'routes', 'matchReports.routes.js'), 'utf8');
for (const [label, source, marker] of [
  ['página', sumulasPage, 'Central de Súmulas'],
  ['página', sumulasPage, 'Todos os envios'],
  ['página', sumulasPage, 'proofFile'],
  ['cliente', sumulasClient, 'async function optimizeProof'],
  ['cliente', sumulasClient, "VA.request('/api/match-reports'"],
  ['servidor', sumulasRoutes, "app.post('/api/match-reports'"],
  ['servidor', sumulasRoutes, "callBot('/internal/discord/send-match-report'"],
  ['servidor', sumulasRoutes, 'discord.proofUrl'],
  ['servidor', sumulasRoutes, "app.get('/api/match-reports/:reportId/proof'"],
  ['servidor', sumulasRoutes, 'resolve-match-report-attachment']
]) {
  if (!source.includes(marker)) {
    console.error(`[Check Final] Central de Súmulas incompleta em ${label}: ${marker}`);
    process.exit(1);
  }
}

const formsPage = fs.readFileSync(path.join(ROOT, 'public', 'pages', 'formularios.html'), 'utf8');
const appSource = fs.readFileSync(path.join(ROOT, 'server', 'app.js'), 'utf8');
const formsScript = fs.readFileSync(path.join(ROOT, 'public', 'js', 'formularios.js'), 'utf8');
const adminAccessPatch = fs.readFileSync(path.join(ROOT, 'server', 'patchAdminDiscordAccessRuntime.js'), 'utf8');
const accessServiceSource = fs.readFileSync(path.join(ROOT, 'server', 'services', 'access.service.js'), 'utf8');
const accessControlSource = fs.readFileSync(path.join(ROOT, 'server', 'routes', 'accessControl.routes.js'), 'utf8');
const expectedAdminDiscordIds = [
  '623932415034916865',
  '544971683157508097',
  '517113675618975759'
];

for (const discordId of expectedAdminDiscordIds) {
  if (
    !appSource.includes(`'${discordId}'`)
    || !adminAccessPatch.includes(`'${discordId}'`)
    || !accessServiceSource.includes(`'${discordId}'`)
  ) {
    console.error(`[Check Final] Discord ID administrativo ausente ou não sincronizado: ${discordId}`);
    process.exit(1);
  }
}

for (const marker of [
  'DEFAULT_ADMIN_DISCORD_IDS',
  'DEFAULT_ADMIN_DISCORD_IDS, DEFAULT_OWNER_DISCORD_IDS',
  "app.get('/api/player-applications', requireAdmin",
  'isAdmin: isAdminUser(user)'
]) {
  if (!appSource.includes(marker)) {
    console.error(`[Check Final] Proteção administrativa incompleta: ${marker}`);
    process.exit(1);
  }
}

for (const [label, source, marker] of [
  ['serviço central', accessServiceSource, 'isAdminIdRecord,'],
  ['controle de páginas', accessControlSource, 'isOwnerRecord(user) || isAdminIdRecord(user) || hasAdminRoleId(roleIds)']
]) {
  if (!source.includes(marker)) {
    console.error(`[Check Final] Proteção administrativa incompleta em ${label}: ${marker}`);
    process.exit(1);
  }
}

for (const [label, source, marker] of [
  ['página', formsPage, '/js/formularios.js?v=hnl-forms-static-v1'],
  ['servidor', appSource, 'hnl-forms-static-route-v1'],
  ['servidor', appSource, "app.get('/js/formularios.js'"],
  ['servidor', appSource, 'application/javascript; charset=utf-8'],
  ['cliente', formsScript, 'async function loadForms()'],
  ['cliente', formsScript, 'function recoveryNotice(item = {})'],
  ['cliente', formsScript, 'Recuperação parcial do histórico'],
  ['cliente', formsScript, 'Não recuperado']
]) {
  if (!source.includes(marker)) {
    console.error(`[Check Final] Formulários sem recurso obrigatório em ${label}: ${marker}`);
    process.exit(1);
  }
}

const publicationRoutes = [
  path.join(ROOT, 'server', 'routes', 'nexusCupRulesPublication.routes.js'),
  path.join(ROOT, 'server', 'routes', 'teamRegistrationGuidancePublication.routes.js')
];
for (const file of publicationRoutes) {
  const source = fs.readFileSync(file, 'utf8');
  if (!source.includes("mode: 'manual-only'")) {
    console.error(`[Check Final] Publicador sem modo manual-only: ${path.relative(ROOT, file)}`);
    process.exit(1);
  }
  if (/setTimeout\s*\(|publishNexusCupRules\s*\(|publishTeamRegistrationGuidance\s*\(/.test(source)) {
    console.error(`[Check Final] Publicação automática detectada no boot: ${path.relative(ROOT, file)}`);
    process.exit(1);
  }
}

if (process.exitCode) process.exit(process.exitCode);
console.log('[Check Final] Sessão sem 500, chat administrativo manual, ponte HUB removida, calls protegidas no BOT, navegação sem prefetch, formulários recuperáveis, publicações Discord manuais e módulos da League aprovados.');
