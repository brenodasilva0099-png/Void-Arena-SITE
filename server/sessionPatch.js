const expressSessionPath = require.resolve('express-session');
const originalSession = require('express-session');
const { createSessionStore } = require('./sessionStore');
const { readIdentity, applyIdentityToSession } = require('./authIdentity');

function patchedSession(options = {}) {
  const nextOptions = { ...(options || {}) };
  const cookie = { ...(nextOptions.cookie || {}) };

  nextOptions.rolling = nextOptions.rolling !== false;
  cookie.maxAge = Number(process.env.SESSION_MAX_AGE_MS || cookie.maxAge || 1000 * 60 * 60 * 24 * 30) || 1000 * 60 * 60 * 24 * 30;
  nextOptions.cookie = cookie;

  if (!nextOptions.store && String(process.env.SESSION_STORE || 'file').toLowerCase() !== 'memory') {
    nextOptions.store = createSessionStore();
  }

  const sessionMiddleware = originalSession(nextOptions);

  // A sessão do Express pode usar disco efêmero no Render. A identidade assinada
  // por Discord ID é reaplicada em toda requisição antes de qualquer rota.
  return function canonicalSessionMiddleware(req, res, next) {
    return sessionMiddleware(req, res, (error) => {
      if (error) return next(error);
      applyIdentityToSession(req, readIdentity(req));
      return next();
    });
  };
}

Object.assign(patchedSession, originalSession);
require.cache[expressSessionPath].exports = patchedSession;

console.log('[Discord/Auth] Sessão global usa uma única identidade canônica; cookie concorrente removido.');