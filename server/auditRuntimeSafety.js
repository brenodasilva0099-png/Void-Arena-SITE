const fs = require('node:fs');
const path = require('node:path');

const appFile = path.join(__dirname, 'app.js');
const packageFile = path.join(__dirname, '..', 'package.json');
const source = fs.readFileSync(appFile, 'utf8');
const packageJson = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
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
if (missing.length) {
  console.error(`[Runtime Safety] Proteções ausentes: ${missing.join(', ')}.`);
  process.exitCode = 1;
} else {
  console.log('[Runtime Safety] MIME, assets e manutenção não bloqueante aprovados.');
}

module.exports = { missing };
