const crypto = require('node:crypto');
const {
  findUserById,
  findUserByDiscordId,
  findUserByEmail,
  saveUser
} = require('../storage');
const { removeRoutes } = require('../utils/expressRoutes');
const {
  clean,
  maxAgeMs,
  signPayload,
  verifyPayload,
  readIdentity,
  applyIdentityToSession,
  setIdentityCookies,
  clearIdentityCookies,
  resolveIdentityUser,
  pendingUser
} = require('../authIdentity');

const CANONICAL_SITE = 'https://hollow-nexus-league.onrender.com';
const AUTH_BUILD = 'hnl-canonical-auth-v1';

function safeNext(value = '') {
  const next = clean(value);
  return next.startsWith('/') && !next.startsWith('//') ? next : '/pages/perfil.html';
}

function publicSiteUrl() {
  const configured = clean(
    process.env.CANONICAL_SITE_URL ||
    process.env.PUBLIC_SITE_URL ||
    process.env.SITE_PUBLIC_URL ||
    process.env.SITE_URL ||
    process.env.APP_URL ||
    process.env.FRONTEND_URL ||
    ''
  ).replace(/\/+$/, '');

  if (/^https?:\/\//i.test(configured) && !/void-arena-site(?:-[a-z0-9]+)?\.onrender\.com/i.test(configured)) {
    return configured;
  }
  return CANONICAL_SITE;
}

function callbackUrl() {
  const configured = clean(process.env.DISCORD_CALLBACK_URL || '').replace(/\/+$/, '');
  if (/^https?:\/\//i.test(configured) && !/void-arena-site(?:-[a-z0-9]+)?\.onrender\.com/i.test(configured)) {
    return configured;
  }
  return `${publicSiteUrl()}/auth/discord/callback`;
}

function discordAvatarUrl(profile = {}, size = 256) {
  if (!profile.id || !profile.avatar) return null;
  const extension = String(profile.avatar).startsWith('a_') ? 'gif' : 'png';
  return `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.${extension}?size=${size}`;
}

function safeUser(user = {}) {
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

function discordCredentials() {
  return {
    clientId: clean(
      process.env.DISCORD_CLIENT_ID ||
      process.env.DISCORD_OAUTH_CLIENT_ID ||
      process.env.DISCORD_APP_ID ||
      process.env.CLIENT_ID ||
      ''
    ),
    clientSecret: clean(
      process.env.DISCORD_CLIENT_SECRET ||
      process.env.DISCORD_OAUTH_CLIENT_SECRET ||
      process.env.CLIENT_SECRET ||
      ''
    )
  };
}

function regenerateSession(req) {
  return new Promise((resolve, reject) => {
    if (!req.session || typeof req.session.regenerate !== 'function') return resolve();
    req.session.regenerate((error) => error ? reject(error) : resolve());
  });
}

function saveSession(req) {
  return new Promise((resolve, reject) => {
    if (!req.session || typeof req.session.save !== 'function') return resolve();
    req.session.save((error) => error ? reject(error) : resolve());
  });
}

async function resolvedAuth(req) {
  return resolveIdentityUser(req, { findUserById, findUserByDiscordId });
}

function sessionPayload(result = {}) {
  if (!result.authenticated) {
    return { success: true, authenticated: false, pending: false, build: AUTH_BUILD, user: null };
  }
  if (result.user) {
    return {
      success: true,
      authenticated: true,
      pending: false,
      storageAvailable: true,
      build: AUTH_BUILD,
      user: safeUser(result.user)
    };
  }
  return {
    success: true,
    authenticated: true,
    pending: true,
    storageAvailable: Boolean(result.storageAvailable),
    build: AUTH_BUILD,
    user: pendingUser(result.identity),
    message: result.error?.message || 'Sessão Discord preservada; os dados persistentes ainda não responderam.'
  };
}

function registerStableDiscordAuthRoutes(app) {
  removeRoutes(app, [
    ['get', '/api/auth/session'],
    ['get', '/api/me'],
    ['get', '/auth/discord'],
    ['get', '/auth/discord/callback'],
    ['get', '/auth/google'],
    ['get', '/auth/google/callback'],
    ['post', '/api/auth/register'],
    ['post', '/api/auth/login'],
    ['post', '/api/auth/logout'],
    ['post', '/api/logout']
  ]);

  app.use((req, _res, next) => {
    applyIdentityToSession(req, readIdentity(req));
    return next();
  });

  const discordOnlyPayload = {
    success: false,
    code: 'DISCORD_ONLY_AUTH',
    message: 'O acesso à Hollow Nexus League é feito exclusivamente pelo Discord.',
    loginUrl: '/pages/login.html'
  };

  app.get('/auth/google', (_req, res) => res.redirect(303, '/pages/login.html?auth=discord_only'));
  app.get('/auth/google/callback', (_req, res) => res.redirect(303, '/pages/login.html?auth=discord_only'));
  app.post('/api/auth/register', (_req, res) => res.status(410).json(discordOnlyPayload));
  app.post('/api/auth/login', (_req, res) => res.status(410).json(discordOnlyPayload));

  app.get('/api/auth/session', async (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    const result = await resolvedAuth(req);
    if (result.user) setIdentityCookies(req, res, result.user);
    return res.json(sessionPayload(result));
  });

  app.get('/api/me', async (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const result = await resolvedAuth(req);
    if (!result.authenticated) {
      return res.status(401).json({ success: false, authenticated: false, message: 'Não autenticado.' });
    }
    if (result.user) {
      setIdentityCookies(req, res, result.user);
      return res.json({ success: true, authenticated: true, pending: false, user: safeUser(result.user) });
    }
    return res.json({
      success: true,
      authenticated: true,
      pending: true,
      storageAvailable: Boolean(result.storageAvailable),
      user: pendingUser(result.identity),
      message: result.error?.message || 'Dados persistentes temporariamente indisponíveis.'
    });
  });

  app.get('/auth/discord', async (req, res) => {
    const { clientId } = discordCredentials();
    const next = safeNext(req.query.next || req.query.redirect || '/pages/perfil.html');
    const current = await resolvedAuth(req);

    // Cookie Discord válido continua autenticado mesmo se o storage estiver reiniciando.
    if (current.authenticated && (current.user || current.identity.discordId)) {
      if (current.user) setIdentityCookies(req, res, current.user);
      return res.redirect(303, next);
    }

    if (!clientId) {
      return res.redirect(303, `/pages/login.html?auth=discord_not_configured&next=${encodeURIComponent(next)}`);
    }

    const state = signPayload({
      kind: 'discord-oauth-state',
      next,
      nonce: crypto.randomBytes(18).toString('hex'),
      exp: Date.now() + 1000 * 60 * 10
    });

    if (req.session) {
      req.session.oauthReturnTo = next;
      req.session.oauthState = state;
      await saveSession(req).catch(() => {});
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUrl(),
      response_type: 'code',
      scope: 'identify email',
      state,
      prompt: 'consent'
    });

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    return res.redirect(302, `https://discord.com/oauth2/authorize?${params.toString()}`);
  });

  app.get('/auth/discord/callback', async (req, res) => {
    const code = clean(req.query.code || '');
    const state = clean(req.query.state || '');
    const { clientId, clientSecret } = discordCredentials();
    const statePayload = verifyPayload(state);
    const next = safeNext(statePayload?.next || req.session?.oauthReturnTo || '/pages/perfil.html');

    if (!statePayload || statePayload.kind !== 'discord-oauth-state') {
      return res.redirect(303, `/pages/login.html?auth=discord_state_error&next=${encodeURIComponent(next)}`);
    }
    if (!code || !clientId || !clientSecret) {
      return res.redirect(303, `/pages/login.html?auth=discord_failed&next=${encodeURIComponent(next)}`);
    }

    try {
      const redirectUri = callbackUrl();
      const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri
        })
      });
      const tokenData = await tokenResponse.json().catch(() => ({}));
      if (!tokenResponse.ok || !tokenData.access_token) {
        throw new Error(tokenData.error_description || tokenData.error || 'Falha ao trocar o código do Discord.');
      }

      const profileResponse = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });
      const profile = await profileResponse.json().catch(() => ({}));
      if (!profileResponse.ok || !profile.id) {
        throw new Error(profile.message || 'Não foi possível carregar o perfil Discord.');
      }

      const email = profile.email ? clean(profile.email).toLowerCase() : '';
      const username = clean(profile.global_name || profile.username || 'Discord');
      const discordTag = profile.discriminator && profile.discriminator !== '0'
        ? `${profile.username || username}#${profile.discriminator}`
        : clean(profile.username || username);
      const avatar = discordAvatarUrl(profile, 256);

      let user = await findUserByDiscordId(profile.id);
      if (!user && email) user = await findUserByEmail(email);

      user = await saveUser({
        ...(user || {}),
        id: user?.id || crypto.randomUUID(),
        name: user?.name || username || discordTag,
        email: user?.email || email || null,
        avatar: avatar || user?.avatar || null,
        provider: 'discord',
        discordId: profile.id,
        discordTag,
        socials: user?.socials || {},
        profile: {
          ...(user?.profile || {}),
          username: user?.profile?.username || username || discordTag,
          discord: user?.profile?.discord || discordTag
        },
        createdAt: user?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      await regenerateSession(req);
      applyIdentityToSession(req, {
        userId: user.id,
        discordId: profile.id,
        name: user.profile?.username || user.name || username,
        avatar: user.avatar || avatar || ''
      });
      req.session.authenticatedAt = new Date().toISOString();
      await saveSession(req);
      setIdentityCookies(req, res, user);
      return res.redirect(303, next);
    } catch (error) {
      console.error('[Discord/Auth] Falha no OAuth canônico:', error);
      return res.redirect(303, `/pages/login.html?auth=discord_failed&next=${encodeURIComponent(next)}`);
    }
  });

  const logout = async (req, res) => {
    clearIdentityCookies(req, res);
    if (!req.session || typeof req.session.destroy !== 'function') {
      return res.json({ success: true });
    }
    return req.session.destroy(() => res.json({ success: true }));
  };

  app.post('/api/auth/logout', logout);
  app.post('/api/logout', logout);

  console.log(`[Discord/Auth] Implementação canônica registrada (${AUTH_BUILD}); sessão, /api/me e OAuth usam a mesma identidade.`);
}

module.exports = { registerStableDiscordAuthRoutes };