const expressSessionPath = require.resolve('express-session');
const originalSession = require('express-session');
const { createSessionStore } = require('./sessionStore');

function patchedSession(options = {}) {
  const nextOptions = { ...(options || {}) };

  if (!nextOptions.store && String(process.env.SESSION_STORE || 'file').toLowerCase() !== 'memory') {
    nextOptions.store = createSessionStore();
  }

  return originalSession(nextOptions);
}

Object.assign(patchedSession, originalSession);
require.cache[expressSessionPath].exports = patchedSession;

console.log('Patch de sessao persistente carregado.');
