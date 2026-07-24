const fs = require('node:fs');
const path = require('node:path');

const AUTH_FILE = path.join(__dirname, 'routes', 'discordAuthStable.routes.js');
const MARKER = 'hnl-persistent-discord-identity-v1';

if (!fs.existsSync(AUTH_FILE)) {
  throw new Error('[Discord/Auth] Arquivo de rotas não encontrado para aplicar identidade persistente.');
}

let source = fs.readFileSync(AUTH_FILE, 'utf8');

if (!source.includes(MARKER)) {
  const oldCookies = `function setPersistentAuthCookies(req, res, userId) {
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
}`;

  const newCookies = `function setPersistentAuthCookies(req, res, userOrId, discordId = '') {
  const persistentIdentityBuild = '${MARKER}';
  const user = userOrId && typeof userOrId === 'object' ? userOrId : {};
  const userId = clean(user.id || userOrId || '');
  const safeDiscordId = clean(user.discordId || discordId || '');
  const age = maxAgeMs();
  const token = signPayload({
    userId,
    discordId: safeDiscordId,
    name: clean(user.profile?.username || user.name || user.discordTag || '').slice(0, 120),
    avatar: clean(user.avatar || '').slice(0, 1000),
    provider: 'discord',
    build: persistentIdentityBuild,
    exp: Date.now() + age
  });
  const options = {
    httpOnly: true,
    sameSite: 'lax',
    secure: secureRequest(req),
    path: '/',
    maxAge: age
  };
  res.cookie(SESSION_COOKIE, token, options);
  res.cookie(AUTH_COOKIE, token, options);
}`;

  const oldResolve = `function resolveSessionUserId(req) {
  if (req.session?.userId) return String(req.session.userId);
  const cookies = parseCookies(req.headers.cookie || '');
  const restored = verifyPayload(cookies[AUTH_COOKIE] || cookies[SESSION_COOKIE] || '');
  if (restored?.userId && req.session) req.session.userId = restored.userId;
  return restored?.userId ? String(restored.userId) : '';
}`;

  const newResolve = `function resolveSessionIdentity(req) {
  const cookies = parseCookies(req.headers.cookie || '');
  const restored = verifyPayload(cookies[AUTH_COOKIE] || cookies[SESSION_COOKIE] || '') || {};
  const identity = {
    userId: clean(req.session?.userId || restored.userId || ''),
    discordId: clean(req.session?.discordId || restored.discordId || ''),
    name: clean(restored.name || ''),
    avatar: clean(restored.avatar || '')
  };
  if (req.session) {
    if (identity.userId) req.session.userId = identity.userId;
    if (identity.discordId) req.session.discordId = identity.discordId;
  }
  return identity;
}

function resolveSessionUserId(req) {
  return resolveSessionIdentity(req).userId;
}`;

  const oldSaveSession = `function saveSession(req, userId) {
  return new Promise((resolve, reject) => {
    if (!req.session) return reject(new Error('Middleware de sessão indisponível.'));
    req.session.userId = userId;
    req.session.authenticatedAt = new Date().toISOString();
    req.session.save((error) => error ? reject(error) : resolve());
  });
}`;

  const newSaveSession = `function saveSession(req, userId, discordId = '') {
  return new Promise((resolve, reject) => {
    if (!req.session) return reject(new Error('Middleware de sessão indisponível.'));
    req.session.userId = userId;
    req.session.discordId = clean(discordId || '');
    req.session.authenticatedAt = new Date().toISOString();
    req.session.save((error) => error ? reject(error) : resolve());
  });
}`;

  if (!source.includes(oldCookies) || !source.includes(oldResolve) || !source.includes(oldSaveSession)) {
    throw new Error('[Discord/Auth] Estrutura da sessão mudou; identidade persistente não foi aplicada para evitar alteração insegura.');
  }

  source = source
    .replace(oldCookies, newCookies)
    .replace(oldResolve, newResolve)
    .replace(oldSaveSession, newSaveSession);

  const sessionStart = "  app.get('/api/auth/session', async (req, res) => {";
  const discordStart = "  app.get('/auth/discord', async (req, res) => {";
  const sessionIndex = source.indexOf(sessionStart);
  const discordIndex = source.indexOf(discordStart, sessionIndex + sessionStart.length);

  if (sessionIndex < 0 || discordIndex <= sessionIndex) {
    throw new Error('[Discord/Auth] Rotas de sessão não localizadas; patch cancelado.');
  }

  const sessionRoute = `  app.get('/api/auth/session', async (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    const identity = resolveSessionIdentity(req);
    if (!identity.userId && !identity.discordId) {
      return res.json({ success: true, authenticated: false, user: null });
    }

    try {
      let user = identity.userId ? await findUserById(identity.userId) : null;
      if (!user && identity.discordId) user = await findUserByDiscordId(identity.discordId);

      if (!user) {
        return res.json({
          success: true,
          authenticated: true,
          pending: true,
          storageAvailable: false,
          user: {
            id: identity.userId || null,
            name: identity.name || 'Discord',
            avatar: identity.avatar || null,
            provider: 'discord',
            discordId: identity.discordId || null,
            profile: identity.name ? { username: identity.name } : {},
            socials: {}
          },
          message: 'Sessão preservada enquanto os dados persistentes ficam disponíveis.'
        });
      }

      if (req.session) {
        req.session.userId = user.id;
        req.session.discordId = user.discordId || identity.discordId || '';
      }
      setPersistentAuthCookies(req, res, user);
      return res.json({ success: true, authenticated: true, user: safeUser(user) });
    } catch (error) {
      return res.json({
        success: true,
        authenticated: true,
        pending: true,
        storageAvailable: false,
        user: {
          id: identity.userId || null,
          name: identity.name || 'Discord',
          avatar: identity.avatar || null,
          provider: 'discord',
          discordId: identity.discordId || null,
          profile: identity.name ? { username: identity.name } : {},
          socials: {}
        },
        message: error.message
      });
    }
  });

`;

  source = source.slice(0, sessionIndex) + sessionRoute + source.slice(discordIndex);
  source = source
    .replace('await saveSession(req, user.id);', 'await saveSession(req, user.id, profile.id);')
    .replace('setPersistentAuthCookies(req, res, user.id);', 'setPersistentAuthCookies(req, res, user);');

  try {
    new Function(source);
  } catch (error) {
    throw new Error(`[Discord/Auth] Identidade persistente gerou JavaScript inválido: ${error.message}`);
  }

  fs.writeFileSync(AUTH_FILE, source, 'utf8');
  console.log('[Discord/Auth] Sessão persistente por Discord ID aplicada; deploy não derruba login.');
} else {
  console.log('[Discord/Auth] Identidade persistente já estava aplicada.');
}
