const fs = require('node:fs');
const path = require('node:path');

const appFile = path.join(__dirname, 'app.js');
const packageFile = path.join(__dirname, '..', 'package.json');
const source = fs.readFileSync(appFile, 'utf8');
const packageJson = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
const { canManageTeam } = require('./services/teamAccess.service');
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
if (canManageTeam({ id: 'owner' }, leadershipTeam)) missing.push('proprietário sem cargo não deve gerir clube com liderança definida');
if (!canManageTeam({ id: 'legacy-owner' }, { ownerUserId: 'legacy-owner' })) missing.push('compatibilidade com clube antigo sem liderança');
if (missing.length) {
  console.error(`[Runtime Safety] Proteções ausentes: ${missing.join(', ')}.`);
  process.exitCode = 1;
} else {
  console.log('[Runtime Safety] MIME, assets, manutenção e liderança de clubes aprovados.');
}

module.exports = { missing };
