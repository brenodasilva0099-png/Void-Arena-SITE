const crypto = require('node:crypto');

const PRIMARY_AUTH_COOKIE = 'hnl.discord.auth';
const LEGACY_AUTH_COOKIE = 'void.arena.login';
const DEFAULT_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;

function clean(value = '') {
  return String(value || '').trim();
}

function sessionSecret() {
  return process.env.SESSION_SECRET || 'abyss-tourment-dev-secret';
}

function maxAgeMs() {
  return Number(process.env.SESSION_MAX_AGE_MS || DEFAULT_MAX_AGE_MS) || DEFAULT_MAX_AGE_MS;
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
    if (!payload?.exp || Date.now() > Number(payload.exp)) return null;
    return payload;
  } catch {
    return null;
  }
}

function secureRequest(req) {
  return Boolean(req?.secure || String(req?.headers?.['x-forwarded-proto'] || '').includes('https'));
}

function cookieOptions(req) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: secureRequest(req),
    path: '/',
    maxAge: maxAgeMs()
  };
}

function readIdentity(req) {
  const cookies = parseCookies(req?.headers?.cookie || '');
  const restored = verifyPayload(cookies[PRIMARY_AUTH_COOKIE] || cookies[LEGACY_AUTH_COOKIE] || '') || {};
  return {
    userId: clean(req?.session?.userId || restored.userId || ''),
    discordId: clean(req?.session?.discordId || restored.discordId || ''),
    name: clean(req?.session?.authDisplayName || restored.name || ''),
    avatar: clean(req?.session?.authAvatar || restored.avatar || ''),
    provider: 'discord'
  };
}

function applyIdentityToSession(req, identity = {}) {
  if (!req?.session) return identity;
  if (identity.userId) req.session.userId = identity.userId;
  if (identity.discordId) req.session.discordId = identity.discordId;
  if (identity.name) req.session.authDisplayName = identity.name;
  if (identity.avatar) req.session.authAvatar = identity.avatar;
  return identity;
}

function identityFromUser(user = {}, fallback = {}) {
  return {
    userId: clean(user.id || fallback.userId || ''),
    discordId: clean(user.discordId || fallback.discordId || ''),
    name: clean(user.profile?.username || user.name || user.discordTag || fallback.name || 'Discord'),
    avatar: clean(user.avatar || fallback.avatar || ''),
    provider: 'discord'
  };
}

function setIdentityCookies(req, res, userOrIdentity = {}) {
  const identity = identityFromUser(userOrIdentity, userOrIdentity);
  if (!identity.userId && !identity.discordId) return identity;
  const token = signPayload({
    userId: identity.userId || null,
    discordId: identity.discordId || null,
    name: identity.name || 'Discord',
    avatar: identity.avatar || null,
    provider: 'discord',
    build: 'hnl-canonical-auth-v1',
    exp: Date.now() + maxAgeMs()
  });
  const options = cookieOptions(req);
  res.cookie(PRIMARY_AUTH_COOKIE, token, options);
  res.cookie(LEGACY_AUTH_COOKIE, token, options);
  applyIdentityToSession(req, identity);
  return identity;
}

function clearIdentityCookies(req, res) {
  const options = { path: '/', sameSite: 'lax', secure: secureRequest(req) };
  res.clearCookie(PRIMARY_AUTH_COOKIE, options);
  res.clearCookie(LEGACY_AUTH_COOKIE, options);
}

async function resolveIdentityUser(req, methods = {}) {
  const identity = applyIdentityToSession(req, readIdentity(req));
  if (!identity.userId && !identity.discordId) {
    return { authenticated: false, identity, user: null, storageAvailable: true };
  }

  try {
    let user = null;
    if (identity.userId && typeof methods.findUserById === 'function') {
      user = await methods.findUserById(identity.userId);
    }
    if (!user && identity.discordId && typeof methods.findUserByDiscordId === 'function') {
      user = await methods.findUserByDiscordId(identity.discordId);
    }

    if (user) {
      const resolvedIdentity = identityFromUser(user, identity);
      applyIdentityToSession(req, resolvedIdentity);
      return { authenticated: true, identity: resolvedIdentity, user, storageAvailable: true };
    }

    return { authenticated: true, identity, user: null, storageAvailable: true, pending: true };
  } catch (error) {
    return { authenticated: true, identity, user: null, storageAvailable: false, pending: true, error };
  }
}

function pendingUser(identity = {}) {
  return {
    id: identity.userId || null,
    name: identity.name || 'Discord',
    email: null,
    avatar: identity.avatar || null,
    provider: 'discord',
    discordId: identity.discordId || null,
    discordTag: null,
    profile: identity.name ? { username: identity.name } : {},
    socials: {},
    pendingStorage: true
  };
}

module.exports = {
  PRIMARY_AUTH_COOKIE,
  LEGACY_AUTH_COOKIE,
  clean,
  maxAgeMs,
  signPayload,
  verifyPayload,
  readIdentity,
  applyIdentityToSession,
  identityFromUser,
  setIdentityCookies,
  clearIdentityCookies,
  resolveIdentityUser,
  pendingUser
};