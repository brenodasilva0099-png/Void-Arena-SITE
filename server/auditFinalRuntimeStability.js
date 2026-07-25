const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

const siteIndex = read('site/index.js');
const hubRoute = read('server/routes/hubResultBridgeDisabled.routes.js');
const stabilityRoute = read('server/routes/finalRuntimeStability.routes.js');
const navigation = read('public/js/core/league-navigation.js');

expect(siteIndex.includes('registerHubResultBridgeDisabledRoutes(app);'), 'site/index não registra o bloqueio HUB→SITE');
expect(siteIndex.includes('registerFinalRuntimeStabilityRoutes(app);'), 'site/index não registra a estabilidade final');
expect(siteIndex.indexOf('registerHubResultBridgeDisabledRoutes(app);') < siteIndex.indexOf('registerFinalRuntimeStabilityRoutes(app);'), 'estabilidade final não está registrada por último');

expect(hubRoute.includes("code: 'HUB_RESULT_SITE_BRIDGE_DISABLED'"), 'rota de bloqueio não retorna código explícito');
expect(hubRoute.includes("['post', '/internal/results/submit']"), 'rota submit da HUB não é removida');
expect(hubRoute.includes("['post', '/internal/results/state']"), 'rota state da HUB não é removida');
expect(hubRoute.includes("['get', '/api/match-results']"), 'endpoint que exibe resultados da HUB não é removido');
expect(hubRoute.includes('res.status(410)'), 'ponte HUB não falha como recurso removido');
expect(hubRoute.includes('results: []') && hubRoute.includes('records: []'), 'site ainda pode exibir resultados antigos da HUB');

expect(stabilityRoute.includes("removeRoutes(app, [['get', '/api/auth/session']])"), 'sessão antiga não é removida antes da rota fail-safe');
expect(stabilityRoute.includes("return res.status(200).json(sessionFallback(req, error));"), 'falha de storage ainda pode gerar 500 na sessão');
expect(stabilityRoute.includes("registerStablePage(app, '/pages/permissoes.html'"), 'rota estável de permissões ausente');
expect(stabilityRoute.includes("registerStablePage(app, '/pages/atualizacoes.html'"), 'rota estável de atualizações ausente');

expect(navigation.includes('hnl-navigation-no-page-prefetch-v1'), 'cliente ainda não tem marcador sem prefetch');
expect(!navigation.includes('fetch(item.url.href'), 'cliente ainda pré-carrega páginas HTML');
expect(!/addEventListener\(['"](?:pointerover|focusin)['"][\s\S]{0,120}prefetch/.test(navigation), 'listener de prefetch ainda está registrado');

for (const page of ['public/pages/permissoes.html', 'public/pages/atualizacoes.html']) {
  expect(fs.existsSync(path.join(ROOT, page)), `arquivo obrigatório ausente: ${page}`);
}

if (failures.length) {
  failures.forEach((failure) => console.error(`[Runtime Stability Audit] ${failure}`));
  throw new Error(`Auditoria final de estabilidade falhou com ${failures.length} pendência(s).`);
}

console.log('[Runtime Stability Audit] Sessão sem 500, páginas estáveis, prefetch removido e resultados HUB→SITE ocultos/bloqueados.');