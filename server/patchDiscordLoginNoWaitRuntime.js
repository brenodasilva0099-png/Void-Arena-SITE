const fs = require('node:fs');
const path = require('node:path');

const AUTH_FILE = path.join(__dirname, 'routes', 'discordAuthStable.routes.js');
const MARKER = 'hnl-discord-login-no-wait-v1';

if (!fs.existsSync(AUTH_FILE)) {
  console.warn('[Discord/Auth] Rota estável não encontrada para aplicar login sem espera.');
  module.exports = {};
} else {
  let source = fs.readFileSync(AUTH_FILE, 'utf8');

  if (!source.includes(MARKER)) {
    const helpers = `
const HNL_LOGIN_BUILD = '${MARKER}';
const pendingDiscordSyncs = new Map();

function pendingDiscordUserFromProfile(profile = {}) {
  const email = profile.email ? clean(profile.email).toLowerCase() : '';
  const username = clean(profile.global_name || profile.username || 'Discord');
  const discordTag = profile.discriminator && profile.discriminator !== '0'
    ? \`${'${profile.username || username}'}#${'${profile.discriminator}'}\`
    : clean(profile.username || username);
  return safeUser({
    id: null,
    name: username || discordTag,
    email: email || null,
    avatar: discordAvatarUrl(profile, 256),
    provider: 'discord',
    discordId: profile.id,
    discordTag,
    profile: { username: username || discordTag, discord: discordTag },
    socials: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
}

async function syncPendingDiscordUser(pending = {}) {
  let user = pending.discordId ? await findUserByDiscordId(pending.discordId) : null;
  if (!user && pending.email) user = await findUserByEmail(pending.email);
  return saveUser({
    ...(user || {}),
    id: user?.id || crypto.randomUUID(),
    name: pending.name || user?.name || pending.discordTag || 'Discord',
    email: pending.email || user?.email || null,
    avatar: pending.avatar || user?.avatar || null,
    provider: 'discord',
    discordId: pending.discordId || user?.discordId || null,
    discordTag: pending.discordTag || user?.discordTag || null,
    socials: user?.socials || pending.socials || {},
    profile: { ...(user?.profile || {}), ...(pending.profile || {}) },
    createdAt: user?.createdAt || pending.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
}

function startPendingDiscordSync(req, pending = {}) {
  const key = String(pending.discordId || pending.email || '').trim();
  if (!key || pendingDiscordSyncs.has(key)) return pendingDiscordSyncs.get(key) || null;
  const sessionRef = req.session;
  const promise = syncPendingDiscordUser(pending)
    .then((user) => {
      if (sessionRef && user?.id) {
        sessionRef.userId = user.id;
        sessionRef.cachedDiscordUser = safeUser(user);
        delete sessionRef.pendingDiscordUser;
        sessionRef.authenticatedAt = new Date().toISOString();
        sessionRef.save?.(() => {});
      }
      return user;
    })
    .catch((error) => {
      console.warn('[Discord/Auth] Sincronização em segundo plano pendente:', error.message);
      return null;
    })
    .finally(() => pendingDiscordSyncs.delete(key));
  pendingDiscordSyncs.set(key, promise);
  return promise;
}
`;

    source = source.replace('\nfunction registerStableDiscordAuthRoutes(app) {', `${helpers}\nfunction registerStableDiscordAuthRoutes(app) {`);

    const sessionStart = "  app.get('/api/auth/session', async (req, res) => {";
    const discordStart = "  app.get('/auth/discord', async (req, res) => {";
    const sessionIndex = source.indexOf(sessionStart);
    const discordIndex = source.indexOf(discordStart, sessionIndex + sessionStart.length);
    if (sessionIndex >= 0 && discordIndex > sessionIndex) {
      const sessionRoute = `  app.get('/api/auth/session', async (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    const userId = resolveSessionUserId(req);
    const pending = req.session?.pendingDiscordUser || null;
    const cached = req.session?.cachedDiscordUser || pending;

    if (!userId && pending) {
      startPendingDiscordSync(req, pending);
      return res.json({
        success: true,
        authenticated: true,
        pendingSync: true,
        storageAvailable: false,
        build: HNL_LOGIN_BUILD,
        user: safeUser(pending),
        message: 'Login Discord reconhecido. Sincronizando os dados da Arena em segundo plano.'
      });
    }

    if (!userId) return res.json({ success: true, authenticated: false, pendingSync: false, build: HNL_LOGIN_BUILD, user: null });

    try {
      const user = await findUserById(userId);
      if (!user) {
        if (cached) return res.json({ success: true, authenticated: true, pendingSync: true, storageAvailable: false, build: HNL_LOGIN_BUILD, user: safeUser(cached) });
        return res.json({ success: true, authenticated: false, pending: true, build: HNL_LOGIN_BUILD, user: null });
      }
      if (req.session) {
        req.session.userId = user.id;
        req.session.cachedDiscordUser = safeUser(user);
      }
      setPersistentAuthCookies(req, res, user.id);
      return res.json({ success: true, authenticated: true, pendingSync: false, storageAvailable: true, build: HNL_LOGIN_BUILD, user: safeUser(user) });
    } catch (error) {
      if (cached) return res.json({ success: true, authenticated: true, pendingSync: true, storageAvailable: false, build: HNL_LOGIN_BUILD, user: safeUser(cached), message: error.message });
      return res.json({ success: true, authenticated: false, pending: true, storageAvailable: false, build: HNL_LOGIN_BUILD, user: null, message: error.message });
    }
  });

`;
      source = source.slice(0, sessionIndex) + sessionRoute + source.slice(discordIndex);
    }

    const callbackStart = "  app.get('/auth/discord/callback', async (req, res) => {";
    const callbackIndex = source.indexOf(callbackStart);
    const logAnchor = "  console.log('[Discord/Auth]";
    const logIndex = source.indexOf(logAnchor, callbackIndex + callbackStart.length);
    if (callbackIndex >= 0 && logIndex > callbackIndex) {
      const callbackRoute = `  app.get('/auth/discord/callback', async (req, res) => {
    const code = clean(req.query.code || '');
    const state = clean(req.query.state || '');
    const { clientId, clientSecret } = discordCredentials();

    if (!code || !clientId || !clientSecret) {
      return res.redirect(303, '/pages/login.html?auth=discord_failed');
    }

    const statePayload = verifyPayload(state);
    const next = safeNext(statePayload?.next || req.session?.oauthReturnTo || '/pages/perfil.html');

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
        headers: { Authorization: \`Bearer ${'${tokenData.access_token}'}\` }
      });
      const profile = await profileResponse.json().catch(() => ({}));
      if (!profileResponse.ok || !profile.id) {
        throw new Error(profile.message || 'Não foi possível carregar o perfil Discord.');
      }

      const pending = pendingDiscordUserFromProfile(profile);
      await regenerateSession(req);
      req.session.pendingDiscordUser = pending;
      req.session.cachedDiscordUser = pending;
      req.session.authenticatedAt = new Date().toISOString();
      req.session.oauthReturnTo = next;
      await new Promise((resolve) => req.session.save(() => resolve()));

      startPendingDiscordSync(req, pending);
      return res.redirect(303, next);
    } catch (error) {
      console.error('[Discord/Auth] Falha no OAuth:', error);
      return res.redirect(303, \`/pages/login.html?auth=discord_failed&next=${'${encodeURIComponent(next)}'}\`);
    }
  });

`;
      source = source.slice(0, callbackIndex) + callbackRoute + source.slice(logIndex);
    }

    try {
      new Function(source);
    } catch (error) {
      throw new Error(`[Discord/Auth] Patch sem espera gerou JavaScript inválido: ${error.message}`);
    }

    fs.writeFileSync(AUTH_FILE, source, 'utf8');
    console.log('[Discord/Auth] Callback imediato e sincronização em segundo plano aplicados.');
  } else {
    console.log('[Discord/Auth] Callback imediato já estava aplicado.');
  }
}
