const fs = require('node:fs');
const path = require('node:path');

const appFile = path.join(__dirname, 'app.js');
const packageFile = path.join(__dirname, '..', 'package.json');
const source = fs.readFileSync(appFile, 'utf8');
const eventRouteSource = fs.readFileSync(path.join(__dirname, 'routes', 'publicEvent.routes.js'), 'utf8');
const teamRouteSource = fs.readFileSync(path.join(__dirname, 'routes', 'publicTeam.routes.js'), 'utf8');
const playerRouteSource = fs.readFileSync(path.join(__dirname, 'routes', 'players.routes.js'), 'utf8');
const experienceRouteSource = fs.readFileSync(path.join(__dirname, 'routes', 'leagueExperience.routes.js'), 'utf8');
const experienceClientSource = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'core', 'league-experience.js'), 'utf8');
const tacticalClientSource = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'core', 'tactical-simulator-v2.js'), 'utf8');
const logoUploadSource = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'pages', 'team-logo-upload.js'), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
const { canManageTeam, canDeleteTeam } = require('./services/teamAccess.service');
const checks = [
  ['rota rígida de assets', "X-Void-Arena-Asset-Route', 'hard-assets-v2"],
  ['MIME explícito de assets', 'function voidArenaAssetContentType'],
  ['proteção nosniff', "res.set('X-Content-Type-Options', 'nosniff')"],
  ['CSS fora da manutenção', "req.path.startsWith('/css/')"],
  ['JavaScript fora da manutenção', "req.path.startsWith('/js/')"],
  ['timeout curto da manutenção', 'AbortSignal.timeout(MAINTENANCE_REFRESH_TIMEOUT_MS)'],
  ['páginas sem espera pelo BOT', 'fetchMaintenanceState({ waitForRefresh: false })']
];

const missing = checks.filter(([, marker]) => !source.includes(marker)).map(([label]) => label);
if (packageJson.dependencies?.express !== '4.21.2') missing.push('versão estável do Express');
if (!fs.existsSync(path.join(__dirname, '..', 'package-lock.json'))) missing.push('lockfile de dependências');
const leadershipTeam = { ownerUserId: 'owner', directorUserId: 'director', captainDiscordId: 'captain-discord' };
if (!canManageTeam({ id: 'director' }, leadershipTeam)) missing.push('acesso do diretor ao clube');
if (!canManageTeam({ discordId: 'captain-discord' }, leadershipTeam)) missing.push('acesso do capitão ao clube');
if (canManageTeam({ id: 'site-admin', roles: ['admin'] }, leadershipTeam)) missing.push('isolamento entre admin global e gestão do clube');
if (!canManageTeam({ id: 'owner' }, leadershipTeam)) missing.push('acesso permanente do criador original ao clube');
if (!canManageTeam({ id: 'legacy-owner' }, { ownerUserId: 'legacy-owner' })) missing.push('compatibilidade com clube antigo sem liderança');
if (!canDeleteTeam({ id: 'owner' }, leadershipTeam)) missing.push('exclusão permitida ao criador original');
if (canDeleteTeam({ id: 'director' }, leadershipTeam) || canDeleteTeam({ discordId: 'captain-discord' }, leadershipTeam)) missing.push('exclusão bloqueada para liderança não criadora');
if (!eventRouteSource.includes("callBot('/internal/event-registration-requests/create'")) missing.push('ponte de inscrição com validação do Discord');
if (!eventRouteSource.includes('if (!canManageTeam(user, team))')) missing.push('inscrição restrita ao capitão/diretor');
if (!teamRouteSource.includes('!isAdmin && !canDeleteTeam(user, existing)')) missing.push('exclusão de times restrita a administrador ou criador');
if (!teamRouteSource.includes('!isAdmin && !canManageTeam(user, existing)')) missing.push('edição de times restrita a administração ou liderança');
if (!playerRouteSource.includes('if (!await viewerIsAdmin(viewer))')) missing.push('exclusão de jogadores restrita a administrador');
if (!experienceRouteSource.includes('Apenas a administração pode editar competições.')) missing.push('edição de competição restrita a administrador');
if (!experienceClientSource.includes('function applyAdminVisibility')) missing.push('opções administrativas ocultas para usuários comuns');
if (!tacticalClientSource.includes("root?.querySelector?.(selector) || null")) missing.push('simulador protegido contra token sem legenda');
if (!tacticalClientSource.includes("id=\"addTacticalStep\"") || !tacticalClientSource.includes("id=\"executeTacticalSequence\"")) missing.push('ações do simulador tático');
if (!logoUploadSource.includes("addEventListener('drop'")) missing.push('upload de logo por arrastar e soltar');
if (missing.length) {
  console.error(`[Runtime Safety] Proteções ausentes: ${missing.join(', ')}.`);
  process.exitCode = 1;
} else {
  console.log('[Runtime Safety] MIME, assets, manutenção, liderança de clubes e ações administrativas aprovados.');
}

module.exports = { missing };
