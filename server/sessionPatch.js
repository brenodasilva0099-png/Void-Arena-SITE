const expressSessionPath = require.resolve('express-session');
const originalSession = require('express-session');
const { createSessionStore } = require('./sessionStore');

function patchedSession(options = {}) {
  const nextOptions = { ...(options || {}) };
  const cookie = { ...(nextOptions.cookie || {}) };

  nextOptions.rolling = nextOptions.rolling !== false;
  cookie.maxAge = Number(process.env.SESSION_MAX_AGE_MS || cookie.maxAge || 1000 * 60 * 60 * 24 * 30) || 1000 * 60 * 60 * 24 * 30;
  nextOptions.cookie = cookie;

  if (!nextOptions.store && String(process.env.SESSION_STORE || 'file').toLowerCase() !== 'memory') {
    nextOptions.store = createSessionStore();
  }

  return originalSession(nextOptions);
}

Object.assign(patchedSession, originalSession);
require.cache[expressSessionPath].exports = patchedSession;

try {
  require('./patchStatelessSessionRuntime');
} catch (error) {
  console.error('Patch de sessão sem disco falhou:', error.message);
}

console.log('Patch de sessao persistente carregado.');
