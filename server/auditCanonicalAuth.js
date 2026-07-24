const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const files = {
  boot: path.join(__dirname, 'bootSite.js'),
  siteIndex: path.join(ROOT, 'site', 'index.js'),
  storage: path.join(__dirname, 'storage.js'),
  session: path.join(__dirname, 'sessionPatch.js'),
  identity: path.join(__dirname, 'authIdentity.js'),
  authRoutes: path.join(__dirname, 'routes', 'discordAuthStable.routes.js'),
  profileRoutes: path.join(__dirname, 'routes', 'profileV2.routes.js'),
  clientPatch: path.join(__dirname, 'patchCanonicalAuthClientRuntime.js'),
  assetsApi: path.join(ROOT, 'public', 'assets', 'api.js'),
  coreApi: path.join(ROOT, 'public', 'js', 'core', 'api.js'),
  profileClient: path.join(ROOT, 'public', 'js', 'pages', 'perfil.js'),
  authUi: path.join(ROOT, 'public', 'js', 'core', 'league-auth-ui.js')
};

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

const source = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, read(file)]));
const failures = [];

function expect(condition, message) {
  if (!condition) failures.push(message);
}

Object.entries(files).forEach(([key, file]) => expect(Boolean(source[key]), `arquivo ausente: ${path.relative(ROOT, file)}`));

expect(source.boot.includes('./patchCanonicalAuthClientRuntime'), 'boot não ativa o cliente canônico de autenticação');
for (const forbidden of [
  './patchDiscordAvatarSessionRuntime',
  './patchDiscordAvatarStabilityRuntime',
  './patchSessionFlowRuntime',
  './patchPersistentDiscordIdentityRuntime',
  './patchDiscordLoginNoWaitRuntime',
  './patchDiscordOAuthStartRuntime',
  './patchDiscordAuthRecoveryGuardRuntime'
]) {
  expect(!source.boot.includes(forbidden), `boot ainda contém patch conflitante: ${forbidden}`);
}

expect(!source.siteIndex.includes('patchDiscordStorageFallbackRuntime'), 'site/index ainda carrega fallback antigo depois da auditoria');
expect(source.storage.includes('STORAGE_READ_RETRIES'), 'storage não separa tentativas de leitura e escrita');
expect(source.storage.includes("data?.code === 'INTERNAL_TOKEN_NOT_CONFIGURED'"), 'storage continua repetindo quando o token interno está ausente');
expect(!source.storage.includes('SITE_BOT_STORAGE_RETRIES || 7'), 'storage voltou às sete tentativas longas');

expect(!source.session.includes('patchStatelessSessionRuntime'), 'sessionPatch ainda injeta o cookie stateless concorrente');
expect(source.session.includes('readIdentity') && source.session.includes('applyIdentityToSession'), 'sessão global não reaplica a identidade canônica');

expect(source.identity.includes("PRIMARY_AUTH_COOKIE = 'hnl.discord.auth'"), 'cookie primário canônico ausente');
expect(source.identity.includes("LEGACY_AUTH_COOKIE = 'void.arena.login'"), 'compatibilidade com cookie legado ausente');
expect(source.identity.includes('discordId') && source.identity.includes('resolveIdentityUser'), 'resolvedor por Discord ID ausente');

expect(source.authRoutes.includes("const AUTH_BUILD = 'hnl-canonical-auth-v1'"), 'rotas não usam o build canônico');
expect(source.authRoutes.includes("['get', '/api/me']"), 'rota /api/me antiga não é removida antes da canônica');
expect(source.authRoutes.includes('findUserByDiscordId'), 'OAuth/sessão não possuem fallback por Discord ID');
expect(source.authRoutes.includes('setIdentityCookies(req, res, user)'), 'callback não grava a identidade persistente completa');
expect(source.authRoutes.includes("app.post('/api/auth/logout'"), 'logout canônico ausente');
expect(!source.authRoutes.includes("req.session.destroy(() => {});\n      return res.status(401)"), 'rota canônica ainda destrói sessão por falha de dados');

expect(source.profileRoutes.includes('resolveIdentityUser'), 'perfil ainda depende somente de req.session.userId');
expect(source.profileRoutes.includes('findUserByDiscordId'), 'perfil não possui fallback por Discord ID');
expect(source.profileRoutes.includes('res.status(503)'), 'perfil não diferencia indisponibilidade temporária de logout real');
expect(!source.profileRoutes.includes("return res.status(401).json({ success: false, message: 'Sessão inválida.' })"), 'perfil ainda transforma dado indisponível em sessão inválida');

expect(source.assetsApi.includes('hnl-canonical-auth-client-v1'), 'assets/api.js não recebeu o cliente canônico');
expect(source.coreApi.includes('hnl-canonical-auth-client-v1'), 'core/api.js não recebeu o cliente canônico');
expect(source.profileClient.includes('hnl-canonical-auth-client-v1'), 'perfil.js não recebeu tratamento visível de indisponibilidade');
expect(source.authUi.includes('hnl-canonical-auth-client-v1'), 'league-auth-ui.js não recebeu o build canônico');

for (const [label, client] of [['assets/api.js', source.assetsApi], ['core/api.js', source.coreApi]]) {
  expect(!/status===401[^\n]{0,300}(?:window\.)?location\.href='\/'/.test(client), `${label} ainda redireciona qualquer 401 para a raiz`);
  expect(client.includes('/api/auth/session'), `${label} não consulta a sessão canônica`);
}

expect(!source.authUi.includes("allButtons().forEach(renderLoggedOut);\n      document.documentElement.dataset.discordAuthenticated = '0';\n    } finally"), 'UI ainda converte falha transitória em logout visual');

if (failures.length) {
  failures.forEach((failure) => console.error(`[Auth Audit] ${failure}`));
  throw new Error(`Auditoria canônica de autenticação falhou com ${failures.length} inconsistência(s).`);
}

console.log('[Auth Audit] OAuth, cookies, sessão global, /api/me, perfil e cliente usam uma única identidade por Discord ID; fallback antigo e espera excessiva ausentes.');

module.exports = { files };
