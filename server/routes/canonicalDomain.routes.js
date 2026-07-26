const CANONICAL_ORIGIN = 'https://hollownexus.com.br';
const CANONICAL_HOST = 'hollownexus.com.br';
const LEGACY_HOSTS = new Set([
  'hollow-nexus-league.onrender.com',
  'www.hollownexus.com.br'
]);

function requestHost(req) {
  const forwarded = String(req.headers['x-forwarded-host'] || '').split(',')[0].trim();
  const direct = String(req.headers.host || '').trim();
  return (forwarded || direct).replace(/:\d+$/, '').toLowerCase();
}

function registerCanonicalDomainRoutes(app) {
  app.use((req, res, next) => {
    const host = requestHost(req);
    if (!LEGACY_HOSTS.has(host)) return next();

    const target = `${CANONICAL_ORIGIN}${req.originalUrl || '/'}`;
    res.set('Cache-Control', 'no-store');
    return res.redirect(308, target);
  });

  app.use((_req, res, next) => {
    res.set('Content-Security-Policy', "upgrade-insecure-requests");
    res.set('X-Hollow-Nexus-Canonical-Host', CANONICAL_HOST);
    return next();
  });

  console.log(`[Domain] Domínio oficial ativo: ${CANONICAL_ORIGIN}; Render e www redirecionam preservando a rota.`);
}

module.exports = { registerCanonicalDomainRoutes, CANONICAL_ORIGIN };
