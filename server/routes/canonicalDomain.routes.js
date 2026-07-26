const CANONICAL_ORIGIN = 'https://hollownexus.com.br';
const CANONICAL_HOST = 'hollownexus.com.br';
const HOME_PATH = '/pages/dashboard.html';
const LEGACY_HOSTS = new Set([
  'hollow-nexus-league.onrender.com',
  'www.hollownexus.com.br'
]);

function normalizeHost(value = '') {
  return String(value || '')
    .split(',')[0]
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/:\d+$/, '')
    .toLowerCase();
}

function requestHost(req) {
  // O Host enviado pelo navegador representa o domínio realmente acessado.
  // No Render, x-forwarded-host pode conter o hostname interno .onrender.com
  // mesmo quando o usuário abriu o domínio personalizado.
  const direct = normalizeHost(req.headers.host || req.get?.('host') || '');
  if (direct) return direct;
  return normalizeHost(req.headers['x-forwarded-host'] || '');
}

function routerStack(app) {
  if (Array.isArray(app?._router?.stack)) return app._router.stack;
  if (Array.isArray(app?.router?.stack)) return app.router.stack;
  return null;
}

function expressReadyInsertionIndex(stack = []) {
  const expressInitIndex = stack.findIndex((layer) =>
    layer?.name === 'expressInit' || layer?.handle?.name === 'expressInit'
  );
  if (expressInitIndex >= 0) return expressInitIndex + 1;

  const queryIndex = stack.findIndex((layer) =>
    layer?.name === 'query' || layer?.handle?.name === 'query'
  );
  if (queryIndex >= 0) return queryIndex + 1;

  // Nunca inserir no índice zero: antes do expressInit, res.set/res.status
  // ainda não existem no ServerResponse nativo.
  return Math.min(2, stack.length);
}

function registerCanonicalDomainRoutes(app) {
  const stack = routerStack(app);
  const insertionPoint = stack?.length || 0;

  app.use((req, res, next) => {
    const host = requestHost(req);
    if (host && host !== CANONICAL_HOST && LEGACY_HOSTS.has(host)) {
      const target = `${CANONICAL_ORIGIN}${req.originalUrl || '/'}`;
      res.set('Cache-Control', 'no-store');
      return res.redirect(308, target);
    }

    // A raiz antiga dependia de public/index.html e podia cair no manipulador
    // genérico do Express. A Home oficial agora é resolvida explicitamente.
    if ((req.method === 'GET' || req.method === 'HEAD') && req.path === '/') {
      res.set('Cache-Control', 'no-store');
      return res.redirect(302, HOME_PATH);
    }

    return next();
  });

  app.use((_req, res, next) => {
    res.set('Content-Security-Policy', 'upgrade-insecure-requests');
    res.set('X-Hollow-Nexus-Canonical-Host', CANONICAL_HOST);
    return next();
  });

  const updatedStack = routerStack(app);
  if (updatedStack && updatedStack.length > insertionPoint) {
    const canonicalLayers = updatedStack.splice(insertionPoint);
    const insertAt = expressReadyInsertionIndex(updatedStack);
    updatedStack.splice(insertAt, 0, ...canonicalLayers);
  }

  console.log(`[Domain] Domínio oficial ativo: ${CANONICAL_ORIGIN}; middleware posicionado após expressInit e raiz abre ${HOME_PATH}.`);
}

module.exports = { registerCanonicalDomainRoutes, CANONICAL_ORIGIN };