const crypto = require('node:crypto');
const {
  findUserById,
  findUserByDiscordId,
  findUserByEmail,
  saveUser
} = require('../storage');
const { removeRoutes } = require('../utils/expressRoutes');

const CANONICAL_SITE = 'https://hollow-nexus-league.onrender.com';
const SESSION_COOKIE = 'void.arena.login';
const AUTH_COOKIE = 'hnl.discord.auth';
const DEFAULT_MAX_AGE = 1000 * 60 * 60 * 24 * 30;

function clean(value = '') {
  return String(value || '').trim();
}

function sessionSecret() {
  return process.env.SESSION_SECRET || 'abyss-tourment-dev-secret';
}

function maxAgeMs() {
  return Number(process.env.SESSION_MAX_AGE_MS || DEFAULT_MAX_AGE) || DEFAULT_MAX_AGE;
}

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
  if (
    /^https?:\/\//i.test(configured) &&
    !/void-arena-site(?:-[a-z0-9]+)?\.onrender\.com/i.test(configured)
  ) {
    return configured;
  }
  return `${publicSiteUrl()}/auth/discord/callback`;
}

function signPayload(payload = {}) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', sessionSecret()).update(body).digest('base64url');
  return `${body}.${signature}`;
}

function verifyPayload(token = '') {
  try {
    const [body, signature] = clean(token).split('.');
    if (!body || !signature) return null;
    const expected = crypto.createHmac('sha256', sessionSecret()).update(body).digest('base64url');
    if (signature.length !== expected.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload?.userId || !payload?.exp || Date.now() > Number(payload.exp)) return null;
    return payload;
  } catch {
    return null;
  }
}

function parseCookies(header = '') {
  const cookies = {};
  String(header || '').split(';').forEach((part) => {
    const index = part.indexOf('=');
    if (index < 0) return;
    const key = part.slice(0, index).trim();
    const raw = part.slice(index + 1).trim();
    if (!key) return;
    try { cookies[key] = decodeURIComponent(raw); }
    catch { cookies[key] = raw; }
  });
  return cookies;
}

function secureRequest(req) {
  return Boolean(req.secure || String(req.headers['x-forwarded-proto'] || '').includes('https'));
}

function setPersistentAuthCookies(req, res, userId) {
  const age = maxAgeMs();
  const token = signPayload({ userId, exp: Date.now() + age });
  const options = {
    httpOnly: true,
    sameSite: 'lax',
    secure: secureRequest(req),
    path: '/',
    maxAge: age
  };
  res.cookie(SESSION_COOKIE, token, options);
  res.cookie(AUTH_COOKIE, token, options);
}

function resolveSessionUserId(req) {
  if (req.session?.userId) return String(req.session.userId);
  const cookies = parseCookies(req.headers.cookie || '');
  const restored = verifyPayload(cookies[AUTH_COOKIE] || cookies[SESSION_COOKIE] || '');
  if (restored?.userId && req.session) req.session.userId = restored.userId;
  return restored?.userId ? String(restored.userId) : '';
}

function discordAvatarUrl(profile = {}, size = 128) {
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

function saveSession(req, userId) {
  return new Promise((resolve, reject) => {
    if (!req.session) return reject(new Error('Middleware de sessão indisponível.'));
    req.session.userId = userId;
    req.session.authenticatedAt = new Date().toISOString();
    req.session.save((error) => error ? reject(error) : resolve());
  });
}

function regenerateSession(req) {
  return new Promise((resolve, reject) => {
    if (!req.session || typeof req.session.regenerate !== 'function') return resolve();
    req.session.regenerate((error) => error ? reject(error) : resolve());
  });
}

function registerStableDiscordAuthRoutes(app) {
  removeRoutes(app, [
    ['get', '/api/auth/session'],
    ['get', '/auth/discord'],
    ['get', '/auth/discord/callback']
  ]);

  app.get('/api/auth/session', async (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    const userId = resolveSessionUserId(req);
    if (!userId) return res.json({ success: true, authenticated: false, user: null });

    try {
      const user = await findUserById(userId);
      if (!user) return res.json({ success: true, authenticated: false, pending: true, user: null });
      if (req.session && !req.session.userId) req.session.userId = user.id;
      setPersistentAuthCookies(req, res, user.id);
      return res.json({ success: true, authenticated: true, user: safeUser(user) });
    } catch (error) {
      return res.json({ success: true, authenticated: false, pending: true, user: null, message: error.message });
    }
  });

  app.get('/auth/discord', async (req, res) => {
    const { clientId } = discordCredentials();
    const next = safeNext(req.query.next || req.query.redirect || '/pages/perfil.html');

    const currentUserId = resolveSessionUserId(req);
    if (currentUserId) return res.redirect(next);

    if (!clientId) {
      return res.status(501).send('Login Discord não configurado. Defina DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET e DISCORD_CALLBACK_URL no Render.');
    }

    const state = signPayload({
      userId: 'oauth-state',
      next,
      exp: Date.now() + 1000 * 60 * 10,
      nonce: crypto.randomBytes(12).toString('hex')
    });

    if (req.session) {
      req.session.oauthReturnTo = next;
      req.session.oauthState = state;
      await new Promise((resolve) => req.session.save(() => resolve()));
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUrl(),
      response_type: 'code',
      scope: 'identify email',
      state,
      prompt: 'consent'
    });

    return res.redirect(`https://discord.com/oauth2/authorize?${params.toString()}`);
  });

  app.get('/auth/discord/callback', async (req, res) => {
    const code = clean(req.query.code || '');
    const state = clean(req.query.state || '');
    const { clientId, clientSecret } = discordCredentials();

    if (!code || !clientId || !clientSecret) {
      return res.status(400).send('Callback Discord inválido ou variáveis Discord ausentes.');
    }

    const statePayload = verifyPayload(state);
    const next = safeNext(statePayload?.next || req.session?.oauthReturnTo || '/pages/perfil.html');

    try {
      const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'authorization_code',
          code,
          redirect_uri: callbackUrl()
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
        name: username || user?.name || discordTag,
        email: email || user?.email || null,
        avatar: avatar || user?.avatar || null,
        provider: 'discord',
        discordId: profile.id,
        discordTag,
        socials: user?.socials || {},
        profile: {
          ...(user?.profile || {}),
          username: user?.profile?.username || username || discordTag,
          discord: discordTag
        },
        createdAt: user?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      await regenerateSession(req);
      await saveSession(req, user.id);
      setPersistentAuthCookies(req, res, user.id);
      return res.redirect(next);
    } catch (error) {
      return res.status(500).send(`Erro no login Discord: ${error.message}`);
    }
  });

  console.log('[Discord/Auth] OAuth, sessão persistente e status de autenticação registrados.');
}

module.exports = { registerStableDiscordAuthRoutes };
