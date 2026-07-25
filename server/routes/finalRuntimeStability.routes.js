const path = require('node:path');
const storage = require('../storage');
const { removeRoutes } = require('../utils/expressRoutes');
const {
  readIdentity,
  applyIdentityToSession,
  setIdentityCookies,
  resolveIdentityUser,
  pendingUser
} = require('../authIdentity');

const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');
const BUILD = 'hnl-final-runtime-stability-v1';

function safeSessionUser(user = {}) {
  return {
    id: user.id || null,
    name: user.name || user.profile?.username || 'Discord',
    email: user.email || null,
    avatar: user.avatar || null,
    provider: user.provider || 'discord',
    discordId: user.discordId || null,
    discordTag: user.discordTag || null,
    profile: user.profile || {},
    socials: user.socials || {},
    createdAt: user.createdAt || null,
    updatedAt: user.updatedAt || null
  };
}

function sessionFallback(req, error = null) {
  const identity = applyIdentityToSession(req, readIdentity(req));
  const authenticated = Boolean(identity.userId || identity.discordId);
  return {
    success: true,
    authenticated,
    pending: authenticated,
    storageAvailable: false,
    build: BUILD,
    user: authenticated ? pendingUser(identity) : null,
    message: authenticated
      ? 'Sessão Discord preservada; os dados persistentes estão sincronizando.'
      : 'Nenhuma sessão Discord ativa.',
    ...(error ? { internalWarning: String(error.message || error).slice(0, 240) } : {})
  };
}

function registerStablePage(app, routePath, fileName) {
  removeRoutes(app, [['get', routePath]]);
  app.get(routePath, (_req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('X-Content-Type-Options', 'nosniff');
    res.type('html');
    return res.sendFile(path.join(PUBLIC_DIR, 'pages', fileName), (error) => {
      if (!error || res.headersSent) return;
      console.error(`[Runtime/Pages] Falha ao servir ${routePath}:`, error.message);
      return res.status(404).type('text/plain; charset=utf-8').send('Página não encontrada.');
    });
  });
}

function registerFinalRuntimeStabilityRoutes(app) {
  removeRoutes(app, [['get', '/api/auth/session']]);

  app.get('/api/auth/session', async (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    try {
      const result = await resolveIdentityUser(req, {
        findUserById: storage.findUserById,
        findUserByDiscordId: storage.findUserByDiscordId
      });

      if (!result.authenticated) {
        return res.json({ success: true, authenticated: false, pending: false, storageAvailable: true, build: BUILD, user: null });
      }

      if (result.user) {
        try { setIdentityCookies(req, res, result.user); }
        catch (cookieError) { console.warn('[Runtime/Auth] Sessão resolvida, mas cookie não pôde ser renovado:', cookieError.message); }
        return res.json({
          success: true,
          authenticated: true,
          pending: false,
          storageAvailable: true,
          build: BUILD,
          user: safeSessionUser(result.user)
        });
      }

      return res.json({
        success: true,
        authenticated: true,
        pending: true,
        storageAvailable: Boolean(result.storageAvailable),
        build: BUILD,
        user: pendingUser(result.identity),
        message: result.error?.message || 'Sessão Discord preservada; os dados persistentes estão sincronizando.'
      });
    } catch (error) {
      console.error('[Runtime/Auth] Falha protegida em /api/auth/session:', error.message);
      return res.status(200).json(sessionFallback(req, error));
    }
  });

  registerStablePage(app, '/permissoes.html', 'permissoes.html');
  registerStablePage(app, '/pages/permissoes.html', 'permissoes.html');
  registerStablePage(app, '/atualizacoes.html', 'atualizacoes.html');
  registerStablePage(app, '/pages/atualizacoes.html', 'atualizacoes.html');

  console.log(`[Runtime/Stability] Sessão fail-safe e páginas administrativas estáveis registradas (${BUILD}).`);
}

module.exports = { registerFinalRuntimeStabilityRoutes, BUILD };