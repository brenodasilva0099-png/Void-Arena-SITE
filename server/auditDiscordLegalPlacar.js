const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const failures = [];

function requireMarkers(relative, markers) {
  const source = read(relative);
  markers.forEach((marker) => {
    if (!source.includes(marker)) failures.push(`${relative}: marcador ausente ${marker}`);
  });
  return source;
}

const login = requireMarkers('public/pages/login.html', [
  'data-discord-oauth',
  'Continuar com Discord',
  'Reconhecimento automático',
  'Cargos e permissões',
  'Clube e inscrições',
  'Ranking e vantagens',
  '/pages/termos.html',
  '/pages/privacidade.html'
]);
if (/id="(?:loginForm|registerForm)"|type="password"|auth\/google/i.test(login)) {
  failures.push('public/pages/login.html: formulário ou provedor legado ainda presente');
}

requireMarkers('public/pages/termos.html', [
  'Versão 2026.07.21',
  'Login exclusivo pelo Discord',
  'Placar Café com Leite',
  'R$ 35',
  'R$ 15',
  'Atualizações destes Termos',
  'Lei Geral de Proteção de Dados'
]);

requireMarkers('public/pages/privacidade.html', [
  'Versão 2026.07.21',
  'Dados recebidos no login Discord',
  'Não recebemos sua senha do Discord',
  'Direitos do titular',
  'Cookies e sessão'
]);

requireMarkers('public/pages/placar.html', [
  'class="frm-shell"',
  'Placar Café com Leite',
  'Ranking Café com Leite 3x3 e 5x5',
  'id="placar3v3Table"',
  'id="placar5v5Table"',
  '/js/pages/placar.js',
  'Placar Café com Leite</b>'
]);

requireMarkers('public/pages/atualizacoes.html', [
  'release-2026-07-21-discord-legal-placar',
  'Site + Bot',
  'Login único pelo Discord',
  'Placar 3x3 e 5x5'
]);

const authUi = requireMarkers('public/js/core/league-auth-ui.js', [
  '2026-07-21-discord-only-auth-v1',
  '/pages/login.html?next=',
  '[data-discord-oauth]',
  'Entrar com Discord'
]);
const placarJs = requireMarkers('public/js/pages/placar.js', [
  '/api/auth/session',
  '/api/placar',
  "data-placar-tab",
  'showLoginRequired'
]);
try { new vm.Script(authUi, { filename: 'league-auth-ui.js' }); }
catch (error) { failures.push(`public/js/core/league-auth-ui.js: ${error.message}`); }
try { new vm.Script(placarJs, { filename: 'placar.js' }); }
catch (error) { failures.push(`public/js/pages/placar.js: ${error.message}`); }

const authRoutes = requireMarkers('server/routes/discordAuthStable.routes.js', [
  "['get', '/auth/google']",
  "['post', '/api/auth/register']",
  "['post', '/api/auth/login']",
  'DISCORD_ONLY_AUTH',
  "app.get('/auth/discord'"
]);
if (!authRoutes.includes("res.status(410).json(discordOnlyPayload)")) {
  failures.push('server/routes/discordAuthStable.routes.js: bloqueio HTTP das rotas locais ausente');
}

requireMarkers('server/routes/placar.routes.js', [
  "app.get('/api/placar'",
  "callBot('/internal/placar'",
  "'3v3'",
  "'5v5'"
]);

const publicationSource = requireMarkers('server/nexusCupRulesPublication.js', [
  "const CHANNEL_ID = '1524621308682436740'",
  'NEXUS CUP — REGRAS OFICIAIS',
  '8 equipes',
  '2 grupos de 4',
  'Vitória 2×1: **3 pts**',
  'Vitória 2×0: **4 pts**',
  'Regra da cera',
  '20s',
  'Quatro jogadores na área',
  'clipe como prova',
  "allowedMentions: { parse: [] }",
  'existingPublication'
]);
try {
  const sandbox = { module: { exports: {} }, exports: {}, require: () => ({}), console, setTimeout };
  new vm.Script(publicationSource, { filename: 'nexusCupRulesPublication.js' });
  if (publicationSource.includes('@everyone') || publicationSource.includes('@here')) {
    failures.push('server/nexusCupRulesPublication.js: menção coletiva não permitida');
  }
} catch (error) {
  failures.push(`server/nexusCupRulesPublication.js: ${error.message}`);
}

requireMarkers('site/index.js', [
  'registerNexusCupRulesPublicationRoutes',
  "../server/routes/nexusCupRulesPublication.routes"
]);

try {
  const { RULES_MESSAGE } = require('./nexusCupRulesPublication');
  if (RULES_MESSAGE.length > 2000) failures.push(`mensagem das regras excede o limite do Discord: ${RULES_MESSAGE.length}/2000`);
  if (RULES_MESSAGE.length < 1200) failures.push('mensagem das regras está curta demais para cobrir as quatro artes');
} catch (error) {
  failures.push(`mensagem das regras não pôde ser validada: ${error.message}`);
}

if (failures.length) {
  console.error('[Discord/Legal/Placar Audit] Falhas:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log('[Discord/Legal/Placar Audit] Login Discord exclusivo, páginas legais, changelog e Placar 3x3/5x5 aprovados.');
}

module.exports = { failures };
