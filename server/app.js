const path = require('node:path');
const crypto = require('node:crypto');
const { Readable } = require('node:stream');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { ChannelType, PermissionsBitField } = require('discord.js');
const {
  findUserByEmail,
  findUserById,
  findUserByDiscordId,
  saveUser,
  readUsers,
  readTeams,
  saveTeam,
  deleteTeam,
  readBracket,
  writeBracket,
  readDatabaseStatus,
  readEvents,
  saveTournamentEvent,
  registerTeamInEvent,
  readChatMessages,
  saveChatMessage,
  updateChatMessage,
  mergeChatMessageDiscordData,
  readChatBridgeSettings,
  writeChatBridgeSettings,
  readStatsBridgeSettings,
  writeStatsBridgeSettings,
  readTeamChats,
  findOrCreateTeamChat,
  findOrCreateDirectChat,
  readTeamChatById,
  readTeamChatMessages,
  saveTeamChatMessage,
  updateTeamChatMessage,
  readTournamentSettings,
  writeTournamentSettings,
  readTrainingSubmissions,
  updateTrainingSubmissionStatus
} = require('./storage');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const BOT_API_URL = String(process.env.BOT_API_URL || 'http://localhost:3002').replace(/\/$/, '');
const BOT_API_KEY = process.env.BOT_API_KEY || process.env.INTERNAL_API_TOKEN || '';

async function callBotInternalApi(pathname, options = {}) {
  if (!BOT_API_URL) throw new Error('BOT_API_URL não configurado.');
  const headers = {
    'Content-Type': 'application/json',
    ...(BOT_API_KEY ? { 'x-bot-api-key': BOT_API_KEY, 'x-internal-token': BOT_API_KEY } : {}),
    ...(options.headers || {})
  };
  const response = await fetch(`${BOT_API_URL}${pathname}`, {
    ...options,
    headers
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    throw new Error(data.message || `Falha na ponte interna do bot (${response.status}).`);
  }
  return data;
}

async function tryBotInternalApi(pathname, options = {}, fallback = null) {
  try {
    return await callBotInternalApi(pathname, options);
  } catch (error) {
    if (fallback) return { ...fallback, internalError: error.message };
    throw error;
  }
}


function discordChannelKind(type) {
  switch (type) {
    case ChannelType.GuildText: return 'text';
    case ChannelType.GuildAnnouncement: return 'announcement';
    case ChannelType.GuildVoice: return 'voice';
    case ChannelType.GuildStageVoice: return 'stage';
    case ChannelType.GuildForum: return 'forum';
    case ChannelType.GuildCategory: return 'category';
    default: return 'other';
  }
}

function discordChannelTypeName(type) {
  const labels = {
    text: 'Texto',
    announcement: 'Anúncios',
    voice: 'Voz',
    stage: 'Palco',
    forum: 'Fórum',
    category: 'Categoria',
    other: 'Outro'
  };
  return labels[discordChannelKind(type)] || labels.other;
}

function canUseAsChatBridge(channel) {
  return channel?.type === ChannelType.GuildText || channel?.type === ChannelType.GuildAnnouncement;
}


function normalizeSteamProfileId(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const profileMatch = raw.match(/steamcommunity\.com\/profiles\/(\d{16,20})/i);
  if (profileMatch) return profileMatch[1];

  const digitsOnly = raw.replace(/\D/g, '');
  if (digitsOnly.length >= 16 && digitsOnly.length <= 20) return digitsOnly;

  return raw.slice(0, 80);
}

function normalizeXboxGamertag(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const playUserMatch = raw.match(/xbox\.com\/[a-z-]+\/play\/user\/([^/?#]+)/i);
  if (playUserMatch) {
    try {
      return decodeURIComponent(playUserMatch[1]).trim();
    } catch {
      return playUserMatch[1].trim();
    }
  }

  const legacyMatch = raw.match(/[?&](?:gamertag|gamerTag)=([^&#]+)/i);
  if (legacyMatch) {
    try {
      return decodeURIComponent(legacyMatch[1]).trim();
    } catch {
      return legacyMatch[1].trim();
    }
  }

  return raw.slice(0, 80);
}

function normalizeUserSocials(raw = {}) {
  return {
    site: String(raw.site || '').trim(),
    discord: String(raw.discord || '').trim(),
    instagram: String(raw.instagram || '').trim(),
    twitch: String(raw.twitch || '').trim(),
    tiktok: String(raw.tiktok || '').trim(),
    youtube: String(raw.youtube || '').trim(),
    twitter: String(raw.twitter || '').trim()
  };
}

function normalizeUserProfile(raw = {}) {
  const source = String(raw.bannerSource || '').trim();

  return {
    username: String(raw.username || '').trim(),
    realName: String(raw.realName || '').trim(),
    country: String(raw.country || '').trim(),
    timezone: String(raw.timezone || '').trim(),
    bio: String(raw.bio || '').trim().slice(0, 220),
    steamId: normalizeSteamProfileId(raw.steamId || ''),
    xboxGamertag: normalizeXboxGamertag(raw.xboxGamertag || ''),
    region: String(raw.region || '').trim(),
    primaryPosition: String(raw.primaryPosition || '').trim(),
    secondaryPosition: String(raw.secondaryPosition || '').trim(),
    banner: String(raw.banner || '').trim(),
    discordBanner: String(raw.discordBanner || '').trim(),
    bannerSource: source === 'discord' ? 'discord' : source === 'custom' ? 'custom' : ''
  };
}

const DEFAULT_OWNER_EMAILS = ['abyss.projectdev@gmail.com', 'brenodasilva0099@gmail.com'];
const DEFAULT_OWNER_DISCORD_IDS = ['1235713276277559326'];

function splitUniqueEnvList(...values) {
  return Array.from(new Set(values.flatMap((value) => Array.isArray(value) ? value : String(value || '').split(',')).map((item) => String(item || '').trim()).filter(Boolean)));
}

const OWNER_EMAILS = splitUniqueEnvList(process.env.OWNER_EMAILS, process.env.ADMIN_EMAILS, DEFAULT_OWNER_EMAILS).map((item) => item.toLowerCase());
const OWNER_DISCORD_IDS = splitUniqueEnvList(process.env.OWNER_DISCORD_IDS, process.env.ADMIN_DISCORD_IDS, DEFAULT_OWNER_DISCORD_IDS);
const OWNER_USER_IDS = splitUniqueEnvList(process.env.OWNER_USER_IDS, process.env.ADMIN_USER_IDS);
const ADMIN_EMAILS = splitUniqueEnvList(process.env.ADMIN_EMAILS, process.env.OWNER_EMAILS, DEFAULT_OWNER_EMAILS).map((item) => item.toLowerCase());
const ADMIN_DISCORD_IDS = splitUniqueEnvList(process.env.ADMIN_DISCORD_IDS, process.env.OWNER_DISCORD_IDS, DEFAULT_OWNER_DISCORD_IDS);
const ADMIN_USER_IDS = splitUniqueEnvList(process.env.ADMIN_USER_IDS, process.env.OWNER_USER_IDS);

function isOwnerUser(user) {
  if (!user) return false;
  const email = String(user.email || '').trim().toLowerCase();
  const discordId = String(user.discordId || '').trim();
  const userId = String(user.id || '').trim();
  return OWNER_EMAILS.includes(email) || OWNER_DISCORD_IDS.includes(discordId) || OWNER_USER_IDS.includes(userId);
}

function isAdminUser(user) {
  if (!user) return false;
  if (isOwnerUser(user)) return true;
  const email = String(user.email || '').trim().toLowerCase();
  const discordId = String(user.discordId || '').trim();
  const userId = String(user.id || '').trim();
  return ADMIN_EMAILS.includes(email) || ADMIN_DISCORD_IDS.includes(discordId) || ADMIN_USER_IDS.includes(userId);
}

async function requireAdmin(req, res, next) {
  const user = await findUserById(req.session.userId);
  if (!user || !isAdminUser(user)) {
    return res.status(403).json({ success: false, message: 'Apenas o administrador pode usar essa função.' });
  }
  req.adminUser = user;
  return next();
}

function safeUser(user) {
  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email || null,
    avatar: user.avatar || null,
    provider: user.provider || 'email',
    discordId: user.discordId || null,
    isAdmin: isAdminUser(user),
    isOwner: isOwnerUser(user),
    socials: normalizeUserSocials(user.socials || {}),
    profile: normalizeUserProfile(user.profile || {}),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt || null
  };
}

function getGoogleCallbackUrl() {
  return process.env.GOOGLE_CALLBACK_URL || `http://localhost:${Number(process.env.PORT || 3000)}/auth/google/callback`;
}

function getDiscordCallbackUrl() {
  return process.env.DISCORD_CALLBACK_URL || `http://localhost:${Number(process.env.PORT || 3000)}/auth/discord/callback`;
}

let maintenanceCache = {
  checkedAt: 0,
  data: { enabled: false }
};

async function fetchMaintenanceState() {
  const now = Date.now();

  if (now - maintenanceCache.checkedAt < 4000) {
    return maintenanceCache.data;
  }

  try {
    const response = await fetch(`${BOT_API_URL}/public/maintenance`, {
      headers: { Accept: 'application/json' }
    });
    const data = await response.json().catch(() => ({}));
    maintenanceCache = {
      checkedAt: now,
      data: data.maintenance || { enabled: false }
    };
  } catch {
    maintenanceCache = {
      checkedAt: now,
      data: { enabled: false }
    };
  }

  return maintenanceCache.data;
}

function maintenanceHtml(state = {}) {
  const message = String(state.message || 'Void Arena está atualizando. Voltamos em instantes.');
  const eta = Number(state.etaMinutes || 3) || 3;

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Void Arena em manutenção</title>
  <style>
    :root { color-scheme: dark; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background:
        radial-gradient(circle at top, rgba(130, 76, 255, .28), transparent 34%),
        radial-gradient(circle at bottom right, rgba(34, 211, 238, .16), transparent 36%),
        #070711;
      color: #f8f7ff;
      font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      overflow: hidden;
    }
    .card {
      width: min(92vw, 560px);
      padding: 34px;
      border: 1px solid rgba(168, 85, 247, .35);
      border-radius: 26px;
      background: rgba(11, 12, 28, .82);
      box-shadow: 0 24px 80px rgba(0, 0, 0, .42), 0 0 40px rgba(124, 58, 237, .15);
      text-align: center;
      backdrop-filter: blur(18px);
    }
    .orb {
      width: 68px;
      height: 68px;
      margin: 0 auto 18px;
      border-radius: 999px;
      background: linear-gradient(135deg, #8b5cf6, #22d3ee);
      box-shadow: 0 0 34px rgba(139, 92, 246, .55);
      display: grid;
      place-items: center;
      font-size: 32px;
    }
    h1 {
      margin: 0 0 10px;
      font-size: clamp(28px, 5vw, 42px);
      letter-spacing: -0.04em;
    }
    p {
      margin: 0 auto;
      color: #c9c4e8;
      line-height: 1.6;
      font-size: 16px;
      max-width: 460px;
    }
    .pill {
      margin: 22px auto 0;
      width: fit-content;
      padding: 10px 14px;
      border-radius: 999px;
      color: #ddd6fe;
      background: rgba(124, 58, 237, .16);
      border: 1px solid rgba(167, 139, 250, .32);
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: .08em;
    }
  </style>
</head>
<body>
  <main class="card">
    <div class="orb">🛠️</div>
    <h1>Void Arena em manutenção</h1>
    <p>${message}</p>
    <div class="pill">Previsão: ${eta} min</div>
  </main>
</body>
</html>`;
}

function createServer({ client }) {
  const app = express();
  app.set('trust proxy', 1);

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.use(
    session({
      name: 'abyss.tourment.sid',
      secret: process.env.SESSION_SECRET || 'abyss-tourment-dev-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 24 * 7,
        secure: 'auto'
      }
    })
  );


  app.get('/api/maintenance', async (_req, res) => {
    const maintenance = await fetchMaintenanceState();
    return res.json({ success: true, maintenance });
  });

  app.use(async (req, res, next) => {
    if (
      req.path === '/api/maintenance' ||
      req.path.startsWith('/assets/') ||
      req.path === '/favicon.png'
    ) {
      return next();
    }

    const maintenance = await fetchMaintenanceState();

    if (maintenance?.enabled) {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      return res.status(503).send(maintenanceHtml(maintenance));
    }

    return next();
  });

  app.use(express.static(PUBLIC_DIR));

  app.post('/internal/realtime/broadcast', (req, res) => {
    const token = req.headers['x-site-realtime-token'] || req.headers['x-bot-api-key'] || req.headers['x-internal-token'];
    const expected = process.env.SITE_REALTIME_TOKEN || BOT_API_KEY || process.env.INTERNAL_API_TOKEN || '';

    if (expected && token !== expected) {
      return res.status(401).json({ success: false, message: 'Token realtime inválido.' });
    }

    const event = {
      type: req.body?.type || 'dashboard:update',
      payload: req.body?.payload || {},
      source: req.body?.source || 'bot',
      createdAt: req.body?.createdAt || new Date().toISOString()
    };

    const result = req.app.locals.realtime?.broadcast?.(event) || { sent: 0, event };

    return res.json({ success: true, ...result });
  });

  function discordAvatarUrl(user, size = 128) {
    if (!user?.id || !user?.avatar) return null;
    const extension = String(user.avatar).startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${extension}?size=${size}`;
  }

  function discordBannerUrl(user, size = 1024) {
    if (!user?.id || !user?.banner) return null;
    const extension = String(user.banner).startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/banners/${user.id}/${user.banner}.${extension}?size=${size}`;
  }

  function mergeDiscordBannerIntoProfile(currentProfile = {}, discordBanner = null) {
    const profile = normalizeUserProfile(currentProfile || {});
    const previousDiscordBanner = profile.discordBanner || '';
    const shouldUseDiscordBanner = Boolean(discordBanner) && (
      !profile.banner ||
      profile.bannerSource === 'discord' ||
      profile.banner === previousDiscordBanner
    );

    return normalizeUserProfile({
      ...profile,
      discordBanner: discordBanner || previousDiscordBanner,
      banner: shouldUseDiscordBanner ? discordBanner : profile.banner,
      bannerSource: shouldUseDiscordBanner ? 'discord' : (profile.banner ? (profile.bannerSource || 'custom') : profile.bannerSource)
    });
  }

  async function fetchDiscordBotUserFromApi() {
    const token = process.env.DISCORD_TOKEN;
    if (!token) return null;

    try {
      const response = await fetch('https://discord.com/api/v10/users/@me', {
        headers: { Authorization: `Bot ${token}` }
      });

      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  async function fetchDiscordApplicationFromApi() {
    const token = process.env.DISCORD_TOKEN;
    if (!token) return null;

    try {
      const response = await fetch('https://discord.com/api/v10/applications/@me', {
        headers: { Authorization: `Bot ${token}` }
      });

      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  async function fetchDiscordGuildBrandFromBot() {
    const botUrl = String(process.env.BOT_API_URL || 'https://void-arena-bot.onrender.com').replace(/\/$/, '');

    try {
      const response = await fetch(`${botUrl}/public/guild-brand?t=${Date.now()}`, {
        headers: { Accept: 'application/json' }
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.success === false) return null;

      return data.guild || null;
    } catch {
      return null;
    }
  }

  async function refreshDiscordProfile(user) {
    if (!user?.discordId || !client?.users?.fetch) return user;

    try {
      const freshUser = await client.users.fetch(user.discordId, { force: true });
      const freshName = freshUser.globalName || freshUser.username || user.name;
      const freshAvatar = freshUser.avatar
        ? discordAvatarUrl({ id: freshUser.id, avatar: freshUser.avatar }, 128)
        : null;
      const freshBanner = freshUser.banner
        ? discordBannerUrl({ id: freshUser.id, banner: freshUser.banner }, 1024)
        : null;
      const nextProfile = mergeDiscordBannerIntoProfile(user.profile || {}, freshBanner);
      const currentProfile = normalizeUserProfile(user.profile || {});

      if (
        freshName !== user.name ||
        freshAvatar !== user.avatar ||
        nextProfile.discordBanner !== currentProfile.discordBanner ||
        nextProfile.banner !== currentProfile.banner ||
        nextProfile.bannerSource !== currentProfile.bannerSource
      ) {
        return await saveUser({
          ...user,
          name: freshName || user.name,
          avatar: freshAvatar || null,
          profile: nextProfile,
          updatedAt: new Date().toISOString()
        });
      }
    } catch {}

    return user;
  }

  app.get('/api/health', async (_req, res) => {
    const db = await readDatabaseStatus().catch((error) => ({ error: error.message }));
    res.json({
      success: true,
      service: 'Void Arena',
      status: 'ok',
      version: '4.9_option_2_bot_api_database',
      uptime: process.uptime(),
      data: db
    });
  });

  app.get('/api/bot', async (_req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    const guildBrand = await fetchDiscordGuildBrandFromBot();
    const apiBotUser = await fetchDiscordBotUserFromApi();
    const apiApplication = await fetchDiscordApplicationFromApi();

    let freshUser = client?.user || null;
    let application = null;

    try {
      if (client?.user?.fetch) {
        freshUser = await client.user.fetch(true);
      }
    } catch {}

    try {
      if (client?.application?.fetch) {
        application = await client.application.fetch();
      }
    } catch {}

    const username = apiBotUser?.username || freshUser?.username || client?.user?.username || null;
    const tag = apiBotUser?.discriminator && apiBotUser.discriminator !== '0'
      ? `${username}#${apiBotUser.discriminator}`
      : freshUser?.tag || client?.user?.tag || username;
    const applicationName = apiApplication?.name || application?.name || null;
    const botId = apiBotUser?.id || freshUser?.id || client?.user?.id || null;
    const serverName = guildBrand?.name || 'Hollow Nexus';
    const guildIcon = guildBrand?.icon || null;
    const avatar = guildIcon || '/assets/logo.png';

    return res.json({
      success: true,
      online: Boolean(client?.user || apiBotUser || guildBrand),
      name: serverName,
      username,
      applicationName,
      serverName,
      guildName: serverName,
      displayName: serverName,
      tag,
      id: botId,
      guildId: guildBrand?.id || null,
      guilds: client?.guilds?.cache?.size || (guildBrand ? 1 : 0),
      avatar,
      guildIcon,
      botAvatar: null,
      fetchedAt: new Date().toISOString()
    });
  });


  app.get('/api/me', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: 'Não autenticado.' });
    }

    let user = await findUserById(req.session.userId);

    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ success: false, message: 'Sessão inválida.' });
    }

    user = await refreshDiscordProfile(user);
    return res.json({ success: true, user: safeUser(user) });
  });

  app.put('/api/me/socials', requireAuth, async (req, res) => {
    let user = await findUserById(req.session.userId);

    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ success: false, message: 'Sessão inválida.' });
    }

    user = await saveUser({
      ...user,
      socials: normalizeUserSocials(req.body || {}),
      updatedAt: new Date().toISOString()
    });

    return res.json({ success: true, user: safeUser(user) });
  });

  app.put('/api/me/profile', requireAuth, async (req, res) => {
    let user = await findUserById(req.session.userId);

    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ success: false, message: 'Sessão inválida.' });
    }

    const body = req.body || {};
    const profilePayload = body.profile && typeof body.profile === 'object' ? body.profile : body;
    const socialsPayload = body.socials && typeof body.socials === 'object' ? body.socials : body;

    user = await saveUser({
      ...user,
      profile: normalizeUserProfile({ ...(user.profile || {}), ...profilePayload }),
      socials: normalizeUserSocials({ ...(user.socials || {}), ...socialsPayload }),
      updatedAt: new Date().toISOString()
    });

    return res.json({ success: true, user: safeUser(user) });
  });


  app.get('/auth/google', (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = getGoogleCallbackUrl();

    if (!clientId) {
      return res.status(501).send('Login Google ainda não configurado. Defina GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e GOOGLE_CALLBACK_URL no Render.');
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      prompt: 'select_account'
    });

    return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  });

  app.get('/auth/google/callback', async (req, res) => {
    const code = String(req.query.code || '');
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = getGoogleCallbackUrl();

    if (!code || !clientId || !clientSecret) {
      return res.status(400).send('Callback Google inválido ou variáveis Google ausentes.');
    }

    try {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        })
      });

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok) {
        throw new Error(tokenData.error_description || tokenData.error || 'Falha no login Google.');
      }

      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });

      const profile = await userInfoResponse.json();

      if (!userInfoResponse.ok || !profile.email || !profile.email_verified) {
        throw new Error('Conta Google não verificada.');
      }

      const email = String(profile.email || '').toLowerCase();
      let user = await findUserByEmail(email);

      user = await saveUser({
        ...(user || {}),
        id: user?.id || crypto.randomUUID(),
        name: profile.name || user?.name || email,
        email,
        avatar: profile.picture || user?.avatar || null,
        provider: user?.provider || 'google',
        googleId: profile.sub || user?.googleId || '',
        socials: user?.socials || {},
        profile: normalizeUserProfile({
          ...(user?.profile || {}),
          username: profile.name || user?.profile?.username || email
        }),
        createdAt: user?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      req.session.userId = user.id;
      req.session.save(() => res.redirect('/pages/inscricao.html'));
    } catch (error) {
      return res.status(500).send(`Erro no login Google: ${error.message}`);
    }
  });

  app.post('/api/auth/register', async (req, res) => {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Preencha nome, e-mail e senha.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'A senha precisa ter pelo menos 6 caracteres.' });
    }

    const existing = await findUserByEmail(email);

    if (existing) {
      return res.status(409).json({ success: false, message: 'Já existe uma conta com esse e-mail.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await saveUser({
      id: crypto.randomUUID(),
      name,
      email,
      passwordHash,
      provider: 'email',
      socials: {},
      profile: { username: name },
      createdAt: new Date().toISOString()
    });

    req.session.userId = user.id;
    return res.status(201).json({ success: true, user: safeUser(user) });
  });

  app.post('/api/auth/login', async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Preencha e-mail e senha.' });
    }

    const user = await findUserByEmail(email);

    if (!user || !user.passwordHash) {
      return res.status(401).json({ success: false, message: 'E-mail ou senha inválidos.' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);

    if (!ok) {
      return res.status(401).json({ success: false, message: 'E-mail ou senha inválidos.' });
    }

    req.session.userId = user.id;
    return res.json({ success: true, user: safeUser(user) });
  });


  function requireAuth(req, res, next) {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: 'Faça login para continuar.' });
    }

    return next();
  }

  async function requireOwner(req, res, next) {
    const user = await findUserById(req.session.userId);

    if (!user || !isOwnerUser(user)) {
      return res.status(403).json({ success: false, message: 'Apenas o DONO pode usar essa área.' });
    }

    req.ownerUser = user;
    return next();
  }

  const PERMISSION_KEYS = ['forms', 'events', 'matches', 'stats', 'bracket', 'teams', 'backup', 'config'];

  function emptyPermissions() {
    return Object.fromEntries(PERMISSION_KEYS.map((key) => [key, false]));
  }

  function allPermissions() {
    return Object.fromEntries(PERMISSION_KEYS.map((key) => [key, true]));
  }

  async function permissionsForUser(user = {}) {
    if (isOwnerUser(user)) {
      return { isOwner: true, permissions: allPermissions(), roles: [] };
    }

    const permissions = emptyPermissions();
    const discordId = String(user.discordId || '').trim();

    if (!discordId) {
      return { isOwner: false, permissions, roles: [] };
    }

    const [rolePermissionsData, memberRolesData] = await Promise.all([
      callBotInternalApi('/internal/storage/readRolePermissions', {
        method: 'POST',
        body: JSON.stringify({ args: [] })
      }).catch(() => ({ result: {} })),
      callBotInternalApi(`/internal/discord/member-roles/${encodeURIComponent(discordId)}`, {
        method: 'GET'
      }).catch(() => ({ roles: [] }))
    ]);

    const rolePermissions = rolePermissionsData.result || {};
    const roles = Array.isArray(memberRolesData.roles) ? memberRolesData.roles : [];

    roles.forEach((role) => {
      const config = rolePermissions[role.id];
      if (!config) return;

      PERMISSION_KEYS.forEach((key) => {
        if (config[key]) permissions[key] = true;
      });
    });

    return { isOwner: false, permissions, roles };
  }

  app.get('/api/me/permissions', requireAuth, async (req, res) => {
    const user = await findUserById(req.session.userId);
    if (!user) return res.status(401).json({ success: false, message: 'Sessão inválida.' });

    const data = await permissionsForUser(user);
    return res.json({ success: true, ...data });
  });

  app.get('/api/owner/role-permissions', requireOwner, async (_req, res) => {
    const [permissionData, mentions] = await Promise.all([
      callBotInternalApi('/internal/storage/readRolePermissions', {
        method: 'POST',
        body: JSON.stringify({ args: [] })
      }).catch(() => ({ result: {} })),
      callBotInternalApi('/internal/discord/mentions', {
        method: 'GET'
      }).catch(() => ({ roles: [] }))
    ]);

    return res.json({
      success: true,
      permissions: permissionData.result || {},
      roles: mentions.roles || [],
      permissionKeys: PERMISSION_KEYS
    });
  });

  app.put('/api/owner/role-permissions', requireOwner, async (req, res) => {
    const permissions = req.body?.permissions || {};

    const data = await callBotInternalApi('/internal/storage/writeRolePermissions', {
      method: 'POST',
      body: JSON.stringify({ args: [permissions] })
    });

    req.app.locals.realtime?.broadcast?.({
      type: 'permissions:update',
      payload: {},
      source: 'site'
    });

    return res.json({ success: true, permissions: data.result || {} });
  });




  app.get('/api/player-applications', requireAdmin, async (_req, res) => {
    try {
      const data = await callBotInternalApi('/internal/player-applications', {
        method: 'GET'
      });

      return res.json({ success: true, applications: data.applications || [] });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  app.post('/api/player-applications', requireAuth, async (req, res) => {
    const user = await findUserById(req.session.userId);
    if (!user) return res.status(401).json({ success: false, message: 'Sessão inválida.' });

    try {
      const payload = {
        ...(req.body || {}),
        source: 'site',
        userId: user.id,
        discordId: user.discordId || '',
        discordTag: user.profile?.username || user.name || '',
        userName: user.profile?.displayName || user.profile?.username || user.name || 'Jogador',
        userAvatar: user.avatar || user.profile?.avatar || ''
      };

      const data = await callBotInternalApi('/internal/player-applications/create', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      return res.json({ success: true, application: data.application });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

  app.patch('/api/player-applications/:id/status', requireAdmin, async (req, res) => {
    try {
      const data = await callBotInternalApi(`/internal/player-applications/${encodeURIComponent(req.params.id)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: req.body?.status,
          notes: req.body?.notes
        })
      });

      return res.json(data);
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

  app.post('/api/player-applications/:id/comment', requireAdmin, async (req, res) => {
    const content = String(req.body?.content || '').trim();

    if (!content) {
      return res.status(400).json({ success: false, message: 'Escreva uma mensagem.' });
    }

    try {
      const data = await callBotInternalApi(`/internal/player-applications/${encodeURIComponent(req.params.id)}/comment`, {
        method: 'POST',
        body: JSON.stringify({
          content,
          authorId: req.adminUser?.id || '',
          authorDiscordId: req.adminUser?.discordId || '',
          authorName: req.adminUser?.profile?.username || req.adminUser?.name || 'Equipe Hollow Nexus'
        })
      });

      return res.json(data);
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });


  app.get('/api/match-results', requireAuth, async (_req, res) => {
    const results = await readResultRecords();
    return res.json({ success: true, results: results.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()) });
  });

  app.get('/api/training-submissions', requireAuth, async (req, res) => {
    const user = await findUserById(req.session.userId);
    if (!user) return res.status(401).json({ success: false, message: 'Sessão inválida.' });

    const admin = isAdminUser(user);
    const submissions = await readTrainingSubmissions({
      limit: 160,
      ...(admin ? {} : { playerDiscordId: user.discordId || '', playerId: user.id })
    });

    return res.json({ success: true, submissions, isAdmin: admin });
  });


  app.get('/api/training-submissions/:id/video', requireAuth, async (req, res) => {
    const user = await findUserById(req.session.userId);
    if (!user) return res.status(401).send('Sessão inválida.');

    const admin = isAdminUser(user);
    const submissions = await readTrainingSubmissions({ limit: 500 });
    const submission = submissions.find((item) => String(item.id) === String(req.params.id));

    if (!submission) return res.status(404).send('Vídeo não encontrado.');

    const ownsSubmission =
      String(submission.playerId || '') === String(user.id || '') ||
      String(submission.playerDiscordId || '') === String(user.discordId || '');

    if (!admin && !ownsSubmission) {
      return res.status(403).send('Você não tem acesso a este vídeo.');
    }

    try {
      const headers = {
        ...(BOT_API_KEY ? { 'x-bot-api-key': BOT_API_KEY, 'x-internal-token': BOT_API_KEY } : {}),
        'User-Agent': 'Void-Arena-Site-Video-Proxy/1.0'
      };

      if (req.headers.range) headers.Range = req.headers.range;

      const upstream = await fetch(`${BOT_API_URL}/internal/training-submissions/${encodeURIComponent(req.params.id)}/video`, {
        method: 'GET',
        headers
      });

      if (!upstream.ok && upstream.status !== 206) {
        const errorText = await upstream.text().catch(() => 'Não foi possível abrir o vídeo.');
        return res.status(upstream.status || 502).send(errorText);
      }

      const passthroughHeaders = [
        'content-type',
        'content-length',
        'content-range',
        'accept-ranges',
        'cache-control',
        'content-disposition'
      ];

      passthroughHeaders.forEach((name) => {
        const value = upstream.headers.get(name);
        if (value) res.setHeader(name, value);
      });

      res.status(upstream.status === 206 ? 206 : 200);

      if (!upstream.body) return res.end();

      return Readable.fromWeb(upstream.body).pipe(res);
    } catch (error) {
      console.error('Erro no proxy SITE→BOT de vídeo:', error);
      return res.status(502).send('Erro ao carregar vídeo.');
    }
  });

  app.post('/api/training-submissions/:id/comment', requireAdmin, async (req, res) => {
    const content = String(req.body?.content || '').trim();

    if (!content) {
      return res.status(400).json({ success: false, message: 'Escreva um comentário.' });
    }

    try {
      const data = await callBotInternalApi(`/internal/training-submissions/${encodeURIComponent(req.params.id)}/comment`, {
        method: 'POST',
        body: JSON.stringify({
          content,
          authorId: req.adminUser?.id || '',
          authorDiscordId: req.adminUser?.discordId || '',
          authorName: req.adminUser?.profile?.username || req.adminUser?.name || 'Equipe Void Arena'
        })
      });

      return res.json(data);
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  app.patch('/api/training-submissions/:id/status' , requireAdmin, async (req, res) => {
    const submission = await updateTrainingSubmissionStatus(req.params.id, {
      status: req.body?.status,
      reviewNote: req.body?.reviewNote,
      reviewedBy: req.adminUser?.id || ''
    });

    return res.json({ success: true, submission });
  });

  app.get('/api/database/status', requireAuth, async (_req, res) => {
    const database = await readDatabaseStatus();
    return res.json({ success: true, database });
  });

  app.get('/api/discord/channels', requireAuth, async (_req, res) => {
    try {
      if (!client?.guilds?.cache) {
        const data = await tryBotInternalApi('/internal/discord/channels', { method: 'GET' }, {
          success: true,
          channels: [],
          message: 'Bot ainda não está online.'
        });
        return res.json(data);
      }

      const guilds = Array.from(client.guilds.cache.values());
      const channels = [];

      for (const guild of guilds) {
        let guildChannels = guild.channels.cache;

        try {
          const fetched = await guild.channels.fetch();
          if (fetched) guildChannels = fetched;
        } catch {}

        const channelList = Array.from(guildChannels.values()).filter(Boolean);
        const channelById = new Map(channelList.map((channel) => [channel.id, channel]));

        channelList
          .filter((channel) => ['text', 'announcement', 'voice', 'stage', 'forum', 'category'].includes(discordChannelKind(channel.type)))
          .sort((a, b) => (a.rawPosition ?? a.position ?? 0) - (b.rawPosition ?? b.position ?? 0))
          .forEach((channel) => {
            const parent = channel.parent || channelById.get(channel.parentId);
            channels.push({
              id: channel.id,
              name: channel.name || 'canal',
              displayName: channel.type === ChannelType.GuildCategory
                ? `📁 ${channel.name || 'Categoria'}`
                : `${parent?.name ? `${parent.name} / ` : ''}${channel.name || 'canal'}`,
              guildId: guild.id,
              guildName: guild.name,
              type: channel.type,
              kind: discordChannelKind(channel.type),
              typeName: discordChannelTypeName(channel.type),
              parentId: channel.parentId || '',
              parentName: parent?.name || '',
              position: channel.rawPosition ?? channel.position ?? 0,
              canBridge: canUseAsChatBridge(channel)
            });
          });
      }

      return res.json({ success: true, channels });
    } catch (error) {
      return res.status(500).json({ success: false, message: `Não foi possível carregar canais do Discord: ${error.message}` });
    }
  });



  app.get('/api/discord/mentions', requireAuth, async (_req, res) => {
    try {
      if (!client?.guilds?.cache) {
        const data = await tryBotInternalApi('/internal/discord/mentions', { method: 'GET' }, {
          success: true,
          members: [],
          roles: [],
          message: 'Bot ainda não está online.'
        });
        return res.json(data);
      }

      const guilds = Array.from(client.guilds.cache.values());
      const members = [];
      const roles = [];

      for (const guild of guilds) {
        try {
          const fetchedRoles = await guild.roles.fetch();
          const roleList = Array.from((fetchedRoles || guild.roles.cache).values())
            .filter((role) => role && role.id !== guild.id && !role.managed)
            .sort((a, b) => (b.position || 0) - (a.position || 0))
            .slice(0, 80);

          roleList.forEach((role) => {
            roles.push({
              id: role.id,
              name: role.name,
              guildId: guild.id,
              guildName: guild.name,
              mention: `<@&${role.id}>`
            });
          });
        } catch {}

        try {
          let memberCollection = guild.members.cache;
          try {
            const fetchedMembers = await guild.members.fetch({ limit: 100 });
            if (fetchedMembers) memberCollection = fetchedMembers;
          } catch {}

          Array.from(memberCollection.values())
            .filter((member) => member?.user && !member.user.bot)
            .slice(0, 100)
            .forEach((member) => {
              members.push({
                id: member.user.id,
                name: member.displayName || member.user.globalName || member.user.username,
                username: member.user.username,
                guildId: guild.id,
                guildName: guild.name,
                avatar: member.user.displayAvatarURL?.({ size: 64 }) || '',
                mention: `<@${member.user.id}>`
              });
            });
        } catch {}
      }

      return res.json({ success: true, members, roles });
    } catch (error) {
      return res.status(500).json({ success: false, message: `Não foi possível carregar membros/cargos: ${error.message}` });
    }
  });



  function safeChatMessage(message = {}) {
    const attachments = Array.isArray(message.attachments)
      ? message.attachments.map((item) => ({
          url: item?.url || '',
          proxyUrl: item?.proxyUrl || item?.proxyURL || '',
          name: item?.name || 'arquivo',
          contentType: item?.contentType || '',
          size: Number(item?.size || 0) || 0,
          width: Number(item?.width || 0) || 0,
          height: Number(item?.height || 0) || 0
        })).filter((item) => item.url || item.proxyUrl)
      : [];

    return {
      id: message.id,
      channelId: message.channelId || 'site-main',
      source: message.source || 'site',
      authorId: message.authorId || '',
      authorName: message.authorName || 'Usuário',
      authorAvatar: message.authorAvatar || '',
      content: message.content || '',
      attachments,
      discordMessageId: message.discordMessageId || '',
      discordChannelId: message.discordChannelId || '',
      createdAt: message.createdAt || null,
      updatedAt: message.updatedAt || null,
      editedAt: message.editedAt || null
    };
  }

  function normalizeIdentity(value = '') {
    return String(value || '').trim().toLowerCase();
  }

  function userIdentityValues(user = {}) {
    return [user?.id, user?.discordId, user?.name, user?.profile?.username]
      .map(normalizeIdentity)
      .filter(Boolean);
  }

  function teamAccountValues(team = {}) {
    const accounts = team.playerAccounts || {};
    return [
      ...(Array.isArray(accounts.players) ? accounts.players : []),
      ...(Array.isArray(accounts.reserves) ? accounts.reserves : []),
      ...(Array.isArray(team.players) ? team.players : []),
      ...(Array.isArray(team.reserves) ? team.reserves : [])
    ].map(normalizeIdentity).filter(Boolean);
  }


  function requireSiteInternalToken(req, res, next) {
    const expected = process.env.SITE_REALTIME_TOKEN || BOT_API_KEY || process.env.INTERNAL_API_TOKEN || '';
    if (!expected) return next();
    const token = req.headers['x-site-realtime-token'] || req.headers['x-bot-api-key'] || req.headers['x-internal-token'] || req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (token !== expected) return res.status(401).json({ success: false, message: 'Token interno invÃ¡lido.' });
    return next();
  }

  function parseResultRecord(message = {}) {
    try {
      const raw = String(message.content || '');
      if (!raw.startsWith('RESULT_JSON:')) return null;
      const result = JSON.parse(raw.slice('RESULT_JSON:'.length));
      return { ...result, messageId: message.id, createdAt: result.createdAt || message.createdAt, updatedAt: message.updatedAt || message.createdAt };
    } catch {
      return null;
    }
  }

  async function readResultRecords() {
    const messages = await readChatMessages({ channelId: 'results-main', limit: 500 });
    return messages.map(parseResultRecord).filter(Boolean);
  }

  async function saveResultRecord(result = {}) {
    const content = `RESULT_JSON:${JSON.stringify(result).slice(0, 1850)}`;
    if (result.messageId) {
      return updateChatMessage(result.messageId, { content }, { channelId: 'results-main', source: 'system' });
    }
    return saveChatMessage({
      channelId: 'results-main',
      source: 'system',
      authorId: 'void-arena-results',
      authorName: 'Resultados Void Arena',
      content,
      attachments: [],
      createdAt: result.createdAt || new Date().toISOString()
    });
  }

  function scoreWinner(result = {}) {
    const scoreA = Number(result.finalScoreA ?? result.scoreA ?? 0);
    const scoreB = Number(result.finalScoreB ?? result.scoreB ?? 0);
    const teamAId = String(result.match?.teamA?.id || '').trim();
    const teamBId = String(result.match?.teamB?.id || '').trim();
    if (scoreA > scoreB) return teamAId;
    if (scoreB > scoreA) return teamBId;
    return '';
  }

  function computeResultStatus(result = {}) {
    const submissions = Array.isArray(result.submissions) ? result.submissions : [];
    const staff = submissions.find((item) => item.isStaff);
    if (staff) {
      return { status: 'validated', final: staff };
    }

    const captains = submissions.filter((item) => item.authorDiscordId);
    if (captains.length >= 2) {
      const a = captains[captains.length - 2];
      const b = captains[captains.length - 1];
      const same = Number(a.scoreA) === Number(b.scoreA)
        && Number(a.scoreB) === Number(b.scoreB)
        && Number(a.playedGames) === Number(b.playedGames)
        && Number(a.remainingGames) === Number(b.remainingGames);

      return same ? { status: 'validated', final: b } : { status: 'conflict', final: null };
    }

    return { status: 'pending', final: submissions[submissions.length - 1] || null };
  }

  async function applyResultToBracket(result = {}) {
    const winnerTeamId = String(result.winnerTeamId || '').trim();
    const roundKey = String(result.match?.roundKey || result.roundKey || '').trim();
    const matchIndex = Number(result.match?.matchIndex ?? result.matchIndex ?? 0) || 0;

    if (!winnerTeamId) return { applied: false, reason: 'Resultado sem vencedor.' };

    const teams = await readTeams();
    const bracket = await readBracket();
    const next = {
      slots: Array.isArray(bracket.slots) ? [...bracket.slots] : [],
      quarters: Array.isArray(bracket.quarters) ? [...bracket.quarters] : [],
      semis: Array.isArray(bracket.semis) ? [...bracket.semis] : [],
      finals: Array.isArray(bracket.finals) ? [...bracket.finals] : [],
      matchProgress: normalizeMatchProgressBody(bracket.matchProgress || {}),
      generatedAt: bracket.generatedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (roundKey === 'slots') next.quarters[matchIndex] = winnerTeamId;
    else if (roundKey === 'quarters') next.semis[Math.floor(matchIndex / 2)] = winnerTeamId;
    else if (roundKey === 'semis') next.finals[matchIndex < 2 ? 0 : 1] = winnerTeamId;
    else if (roundKey === 'finals') return { applied: false, reason: 'Final validada; nÃ£o existe prÃ³xima fase.' };
    else return { applied: false, reason: 'Rodada invÃ¡lida.' };

    const saved = await writeBracket(next);
    return { applied: true, bracket: normalizeBracketForResponse(saved, teams) };
  }

  async function syncResultHubsForBracket(bracket = {}, settings = {}, source = 'site') {
    const [teams, users] = await Promise.all([readTeams(), readUsers()]);
    return callBotInternalApi('/internal/results/sync-hubs', {
      method: 'POST',
      body: JSON.stringify({
        bracket,
        settings,
        teams: teams.map((team) => ({
          ...sanitizeTeam(team),
          ownerUserId: team.ownerUserId || '',
          players: Array.isArray(team.players) ? team.players : [],
          reserves: Array.isArray(team.reserves) ? team.reserves : [],
          playerAccounts: team.playerAccounts || {}
        })),
        users: users.map((user) => ({
          id: user.id,
          name: user.name,
          discordId: user.discordId || '',
          avatar: user.avatar || null,
          profile: normalizeUserProfile(user.profile || {})
        })),
        resultsChannelId: '1521257495727706234',
        source
      })
    }).catch((error) => ({ success: false, message: error.message, created: 0, errors: [{ message: error.message }] }));
  }

  function userCanRepresentTeam(user = {}, team = {}) {
    if (!user || !team) return false;
    if (team.ownerUserId && String(team.ownerUserId) === String(user.id)) return true;
    const userIds = userIdentityValues(user);
    const teamValues = teamAccountValues(team);
    return userIds.some((id) => teamValues.includes(id));
  }


  async function userCanManageTeamRecord(userId, team = {}) {
    const user = await findUserById(userId);
    if (!user) return false;
    if (isAdminUser(user)) return true;
    return String(team.ownerUserId || '') === String(userId || '');
  }

  function safeTournamentEvent(event = {}, teams = []) {
    const teamById = new Map(teams.map((team) => [team.id, sanitizeTeam(team)]));
    const registrations = Array.isArray(event.registrations) ? event.registrations : [];
    const registeredTeams = registrations
      .map((registration) => ({
        ...registration,
        team: teamById.get(registration.teamId) || null
      }))
      .filter((registration) => registration.team);

    return {
      id: event.id,
      name: event.name || event.title || 'Campeonato',
      title: event.title || event.name || 'Campeonato',
      mode: event.mode || 'Rematch',
      matchFormat: event.matchFormat || 'MD3',
      structure: event.structure || 'Grupos + Playoffs',
      teamLimit: Number(event.teamLimit || 16),
      minimumTeams: Number(event.minimumTeams || 4),
      startAt: event.startAt || '',
      status: event.status || 'open',
      description: event.description || '',
      logo: event.logo || '',
      banner: event.banner || '',
      accentColor: event.accentColor || '#8b5cf6',
      registrations: registeredTeams,
      registeredTeams: registeredTeams.map((registration) => registration.team),
      registeredCount: registeredTeams.length,
      createdAt: event.createdAt || null,
      updatedAt: event.updatedAt || null
    };
  }


  function normalizeDiscordAttachment(attachment = {}) {
    return {
      url: attachment.url || '',
      proxyUrl: attachment.proxyURL || attachment.proxyUrl || '',
      name: attachment.name || 'arquivo',
      contentType: attachment.contentType || '',
      size: Number(attachment.size || 0) || 0,
      width: Number(attachment.width || 0) || 0,
      height: Number(attachment.height || 0) || 0
    };
  }

  function normalizeDiscordEmbedMedia(embed = {}, index = 0) {
    const image = embed.image || embed.thumbnail || {};
    const url = image.url || image.proxyURL || image.proxyUrl || embed.url || '';

    if (!url) return null;

    return {
      url,
      proxyUrl: image.proxyURL || image.proxyUrl || '',
      name: embed.title || `embed-imagem-${index + 1}`,
      contentType: 'image/*',
      size: 0,
      width: Number(image.width || 0) || 0,
      height: Number(image.height || 0) || 0
    };
  }

  function extractDiscordMessageMedia(discordMessage = {}) {
    const attachments = Array.from(discordMessage?.attachments?.values?.() || [])
      .map(normalizeDiscordAttachment)
      .filter((attachment) => attachment.url || attachment.proxyUrl);

    const embedMedia = Array.from(discordMessage?.embeds || [])
      .map(normalizeDiscordEmbedMedia)
      .filter(Boolean);

    const seen = new Set();

    return [...attachments, ...embedMedia]
      .filter((attachment) => {
        const key = attachment.url || attachment.proxyUrl;
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 8);
  }

  function messageNeedsDiscordHydration(message = {}) {
    return Boolean(
      message.source === 'discord' &&
      message.discordMessageId &&
      message.discordChannelId &&
      (
        !Array.isArray(message.attachments) ||
        message.attachments.length === 0 ||
        !String(message.content || '').trim()
      )
    );
  }

  async function hydrateDiscordMessageAttachments(messages = []) {
    if (!client?.channels?.fetch) return messages;

    const nextMessages = [];

    for (const message of messages) {
      if (!messageNeedsDiscordHydration(message)) {
        nextMessages.push(message);
        continue;
      }

      try {
        const discordChannel = await client.channels.fetch(message.discordChannelId);
        const discordMessage = await discordChannel?.messages?.fetch?.(message.discordMessageId);
        const attachments = extractDiscordMessageMedia(discordMessage);
        const content = discordMessage?.content || message.content || '';

        console.log(
          `[ponte] hidratação ${message.discordMessageId}: content=${String(content || '').length} attachments=${attachments.length}`
        );

        if (!attachments.length && !content) {
          nextMessages.push(message);
          continue;
        }

        const updated = await mergeChatMessageDiscordData(message.id, {
          content,
          attachments: attachments.length ? attachments : message.attachments
        }, {
          channelId: message.channelId
        });

        nextMessages.push(updated);
      } catch (error) {
        console.error('Erro ao hidratar anexos do Discord:', error.message);
        nextMessages.push(message);
      }
    }

    return nextMessages;
  }

  async function importDiscordChannelHistory({ discordChannelId, siteChannelId, limit = 100 } = {}) {
    const safeDiscordChannelId = String(discordChannelId || '').trim();
    const safeSiteChannelId = String(siteChannelId || 'site-main').trim() || 'site-main';
    const maxLimit = Math.max(1, Math.min(100, Number(limit || 100)));

    if (!safeDiscordChannelId) {
      return { imported: 0, skipped: 0, reason: 'Canal Discord não informado.' };
    }

    if (!client?.channels?.fetch) {
      const data = await tryBotInternalApi('/internal/discord/import-history', {
        method: 'POST',
        body: JSON.stringify({
          discordChannelId: safeDiscordChannelId,
          siteChannelId: safeSiteChannelId,
          limit: maxLimit
        })
      }, { success: true, imported: 0, skipped: 0, reason: 'Bot Discord indisponível.' });
      return {
        imported: Number(data.imported || 0),
        skipped: Number(data.skipped || 0),
        reason: data.reason || data.internalError || undefined
      };
    }

    const channel = await client.channels.fetch(safeDiscordChannelId);
    if (!channel?.isTextBased?.() || !channel.messages?.fetch) {
      return { imported: 0, skipped: 0, reason: 'Canal Discord inválido para histórico.' };
    }

    const existing = await readChatMessages({ channelId: safeSiteChannelId, limit: 100 });
    const existingDiscordIds = new Set(existing.map((message) => message.discordMessageId).filter(Boolean));
    const fetched = await channel.messages.fetch({ limit: maxLimit });
    const discordMessages = Array.from(fetched.values())
      .filter((message) => !message.author?.bot)
      .sort((a, b) => a.createdTimestamp - b.createdTimestamp);

    let imported = 0;
    let skipped = 0;

    for (const message of discordMessages) {
      if (existingDiscordIds.has(message.id)) {
        skipped += 1;
        continue;
      }

      const attachments = extractDiscordMessageMedia(message);
      await saveChatMessage({
        channelId: safeSiteChannelId,
        source: 'discord',
        authorId: message.author?.id || '',
        authorName: message.member?.displayName || message.author?.globalName || message.author?.username || 'Discord',
        authorAvatar: message.author?.displayAvatarURL?.({ size: 128 }) || '',
        content: message.content || '',
        attachments,
        discordMessageId: message.id,
        discordChannelId: message.channelId,
        createdAt: message.createdAt?.toISOString?.() || new Date(message.createdTimestamp || Date.now()).toISOString()
      });
      imported += 1;
    }

    return { imported, skipped };
  }

  app.get('/api/chat/messages', requireAuth, async (req, res) => {
    const messages = await readChatMessages({
      channelId: req.query.channelId || 'site-main',
      limit: req.query.limit || 50
    });

    const hydratedMessages = await hydrateDiscordMessageAttachments(messages);
    return res.json({ success: true, messages: hydratedMessages.map(safeChatMessage) });
  });

  app.post('/api/chat/messages', requireAuth, async (req, res) => {
    const user = await findUserById(req.session.userId);
    const content = String(req.body.content || '').trim();

    if (!content) {
      return res.status(400).json({ success: false, message: 'Escreva uma mensagem.' });
    }

    const bridge = await readChatBridgeSettings();
    const authorName = user?.profile?.username || user?.name || 'Usuário Abyss';
    let discordMessageId = '';
    let discordChannelId = '';

    if (bridge.enabled && bridge.discordChannelId) {
      try {
        if (client?.channels?.fetch) {
          const discordChannel = await client.channels.fetch(bridge.discordChannelId);
          if (discordChannel?.isTextBased?.()) {
            const sent = await discordChannel.send({
              content: `**${authorName} via site:** ${content}`,
              allowedMentions: { parse: ['users', 'roles'] }
            });
            discordMessageId = sent.id;
            discordChannelId = sent.channelId;
          }
        } else {
          const sent = await callBotInternalApi('/internal/discord/send-message', {
            method: 'POST',
            body: JSON.stringify({
              discordChannelId: bridge.discordChannelId,
              content: `**${authorName} via site:** ${content}`,
              allowedMentions: { parse: ['users', 'roles'] }
            })
          });
          discordMessageId = sent.discordMessageId || '';
          discordChannelId = sent.discordChannelId || bridge.discordChannelId;
        }
      } catch (error) {
        console.error('Erro ao enviar mensagem do site para o Discord:', error.message);
      }
    }

    const message = await saveChatMessage({
      channelId: req.body.channelId || bridge.siteChannelId || 'site-main',
      source: 'site',
      authorId: user?.id || req.session.userId,
      authorName,
      authorAvatar: user?.avatar || '',
      content,
      attachments: [],
      discordMessageId,
      discordChannelId
    });

    return res.status(201).json({ success: true, message: safeChatMessage(message) });
  });


  app.patch('/api/chat/messages/:messageId', requireAuth, async (req, res) => {
    const user = await findUserById(req.session.userId);
    const content = String(req.body.content || '').trim();

    if (!content) {
      return res.status(400).json({ success: false, message: 'A mensagem não pode ficar vazia.' });
    }

    try {
      const message = await updateChatMessage(req.params.messageId, { content }, {
        channelId: req.body.channelId || 'site-main',
        authorId: user?.id || req.session.userId,
        source: 'site'
      });

      if (message.discordMessageId && message.discordChannelId) {
        try {
          const nextContent = `**${message.authorName || 'Usuário Abyss'} via site:** ${message.content}`;
          if (client?.channels?.fetch) {
            const discordChannel = await client.channels.fetch(message.discordChannelId);
            const discordMessage = await discordChannel?.messages?.fetch?.(message.discordMessageId);
            if (discordMessage?.editable) {
              await discordMessage.edit({
                content: nextContent,
                allowedMentions: { parse: ['users', 'roles'] }
              });
            }
          } else {
            await callBotInternalApi('/internal/discord/edit-message', {
              method: 'PATCH',
              body: JSON.stringify({
                discordChannelId: message.discordChannelId,
                discordMessageId: message.discordMessageId,
                content: nextContent,
                allowedMentions: { parse: ['users', 'roles'] }
              })
            });
          }
        } catch (error) {
          console.error('Erro ao editar mensagem enviada ao Discord:', error.message);
        }
      }

      return res.json({ success: true, message: safeChatMessage(message) });
    } catch (error) {
      return res.status(404).json({ success: false, message: error.message });
    }
  });

  app.get('/api/chat/bridge/settings', requireAuth, async (_req, res) => {
    const settings = await readChatBridgeSettings();
    return res.json({ success: true, settings });
  });

  app.put('/api/chat/bridge/settings', requireAuth, async (req, res) => {
    const settings = await writeChatBridgeSettings({
      enabled: Boolean(req.body.enabled),
      siteChannelId: req.body.siteChannelId || 'site-main',
      discordChannelId: req.body.discordChannelId || ''
    });

    let history = { imported: 0, skipped: 0 };
    if (settings.enabled && settings.discordChannelId) {
      history = await importDiscordChannelHistory({
        discordChannelId: settings.discordChannelId,
        siteChannelId: settings.siteChannelId || 'site-main',
        limit: 100
      }).catch((error) => ({ imported: 0, skipped: 0, error: error.message }));
    }

    return res.json({ success: true, settings, history });
  });




  app.get('/api/stats/messages', requireAuth, async (req, res) => {
    const settings = await readStatsBridgeSettings();
    const messages = await readChatMessages({
      channelId: req.query.channelId || settings.siteChannelId || 'stats-main',
      limit: req.query.limit || 50
    });

    const hydratedMessages = await hydrateDiscordMessageAttachments(messages);
    return res.json({ success: true, messages: hydratedMessages.map(safeChatMessage) });
  });

  app.post('/api/stats/messages', requireAuth, async (req, res) => {
    const user = await findUserById(req.session.userId);
    const content = String(req.body.content || '').trim();

    if (!content) {
      return res.status(400).json({ success: false, message: 'Escreva uma mensagem.' });
    }

    const bridge = await readStatsBridgeSettings();
    const authorName = user?.profile?.username || user?.name || 'Usuário Abyss';
    let discordMessageId = '';
    let discordChannelId = '';

    if (bridge.enabled && bridge.discordChannelId) {
      try {
        if (client?.channels?.fetch) {
          const discordChannel = await client.channels.fetch(bridge.discordChannelId);
          if (discordChannel?.isTextBased?.()) {
            const sent = await discordChannel.send({
              content: `**${authorName} via estatísticas do site:** ${content}`,
              allowedMentions: { parse: ['users', 'roles'] }
            });
            discordMessageId = sent.id;
            discordChannelId = sent.channelId;
          }
        } else {
          const sent = await callBotInternalApi('/internal/discord/send-message', {
            method: 'POST',
            body: JSON.stringify({
              discordChannelId: bridge.discordChannelId,
              content: `**${authorName} via estatísticas do site:** ${content}`,
              allowedMentions: { parse: ['users', 'roles'] }
            })
          });
          discordMessageId = sent.discordMessageId || '';
          discordChannelId = sent.discordChannelId || bridge.discordChannelId;
        }
      } catch (error) {
        console.error('Erro ao enviar mensagem de estatísticas para o Discord:', error.message);
      }
    }

    const message = await saveChatMessage({
      channelId: req.body.channelId || bridge.siteChannelId || 'stats-main',
      source: 'site',
      authorId: user?.id || req.session.userId,
      authorName,
      authorAvatar: user?.avatar || '',
      content,
      attachments: [],
      discordMessageId,
      discordChannelId
    });

    return res.status(201).json({ success: true, message: safeChatMessage(message) });
  });

  app.patch('/api/stats/messages/:messageId', requireAuth, async (req, res) => {
    const user = await findUserById(req.session.userId);
    const bridge = await readStatsBridgeSettings();
    const content = String(req.body.content || '').trim();

    if (!content) {
      return res.status(400).json({ success: false, message: 'A mensagem não pode ficar vazia.' });
    }

    try {
      const message = await updateChatMessage(req.params.messageId, { content }, {
        channelId: req.body.channelId || bridge.siteChannelId || 'stats-main',
        authorId: user?.id || req.session.userId,
        source: 'site'
      });

      if (message.discordMessageId && message.discordChannelId) {
        try {
          const nextContent = `**${message.authorName || 'Usuário Abyss'} via estatísticas do site:** ${message.content}`;
          if (client?.channels?.fetch) {
            const discordChannel = await client.channels.fetch(message.discordChannelId);
            const discordMessage = await discordChannel?.messages?.fetch?.(message.discordMessageId);
            if (discordMessage?.editable) {
              await discordMessage.edit({
                content: nextContent,
                allowedMentions: { parse: ['users', 'roles'] }
              });
            }
          } else {
            await callBotInternalApi('/internal/discord/edit-message', {
              method: 'PATCH',
              body: JSON.stringify({
                discordChannelId: message.discordChannelId,
                discordMessageId: message.discordMessageId,
                content: nextContent,
                allowedMentions: { parse: ['users', 'roles'] }
              })
            });
          }
        } catch (error) {
          console.error('Erro ao editar mensagem de estatísticas enviada ao Discord:', error.message);
        }
      }

      return res.json({ success: true, message: safeChatMessage(message) });
    } catch (error) {
      return res.status(404).json({ success: false, message: error.message });
    }
  });

  app.get('/api/stats/bridge/settings', requireAuth, async (_req, res) => {
    const settings = await readStatsBridgeSettings();
    return res.json({ success: true, settings });
  });

  app.put('/api/stats/bridge/settings', requireAuth, async (req, res) => {
    const settings = await writeStatsBridgeSettings({
      enabled: Boolean(req.body.enabled),
      siteChannelId: req.body.siteChannelId || 'stats-main',
      discordChannelId: req.body.discordChannelId || ''
    });

    let history = { imported: 0, skipped: 0 };
    if (settings.enabled && settings.discordChannelId) {
      history = await importDiscordChannelHistory({
        discordChannelId: settings.discordChannelId,
        siteChannelId: settings.siteChannelId || 'stats-main',
        limit: 100
      }).catch((error) => ({ imported: 0, skipped: 0, error: error.message }));
    }

    return res.json({ success: true, settings, history });
  });


  function safeTeamChatConversation(chat = {}, teams = [], users = [], viewerId = '') {
    const teamById = new Map(teams.map((team) => [team.id, sanitizeTeam(team)]));
    const userById = new Map(users.map((user) => [user.id, safeUser(user)]));
    const linkedTeams = Array.isArray(chat.teamIds)
      ? chat.teamIds.map((id) => teamById.get(id)).filter(Boolean)
      : [];
    const participants = Array.isArray(chat.participantIds)
      ? chat.participantIds.map((id) => userById.get(id)).filter(Boolean)
      : [];
    const otherParticipant = participants.find((user) => String(user.id) !== String(viewerId)) || participants[0] || null;

    return {
      id: chat.id,
      type: chat.type || 'team',
      channelId: chat.channelId,
      title: chat.type === 'direct'
        ? (otherParticipant?.profile?.username || otherParticipant?.name || chat.title || 'Screen')
        : (linkedTeams.length === 2 ? `${linkedTeams[0].name} × ${linkedTeams[1].name}` : (chat.title || 'Chat entre times')),
      status: chat.status || 'active',
      teamIds: Array.isArray(chat.teamIds) ? chat.teamIds : [],
      participantIds: Array.isArray(chat.participantIds) ? chat.participantIds : [],
      teams: linkedTeams,
      participants,
      otherParticipant,
      createdBy: chat.createdBy || '',
      createdAt: chat.createdAt || null,
      updatedAt: chat.updatedAt || null,
      lastMessageAt: chat.lastMessageAt || null
    };
  }

  app.get('/api/team-chats', requireAuth, async (req, res) => {
    const [chats, teams, users] = await Promise.all([readTeamChats(), readTeams(), readUsers()]);
    const viewerId = req.session.userId;
    const conversations = chats
      .filter((chat) => chat.status !== 'archived')
      .filter((chat) => chat.type === 'direct' && Array.isArray(chat.participantIds) && chat.participantIds.includes(viewerId))
      .sort((a, b) => new Date(b.lastMessageAt || b.updatedAt || b.createdAt || 0).getTime() - new Date(a.lastMessageAt || a.updatedAt || a.createdAt || 0).getTime())
      .map((chat) => safeTeamChatConversation(chat, teams, users, viewerId));

    return res.json({ success: true, conversations });
  });

  app.post('/api/team-chats', requireAuth, async (req, res) => {
    const users = await readUsers();
    const participantUserId = String(req.body.participantUserId || '').trim();
    const contact = users.find((user) => user.id === participantUserId);

    if (!participantUserId || participantUserId === req.session.userId) {
      return res.status(400).json({ success: false, message: 'Selecione uma pessoa diferente da sua conta.' });
    }

    if (!contact) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado para abrir a screen.' });
    }

    try {
      const conversation = await findOrCreateDirectChat({
        participantAId: req.session.userId,
        participantBId: participantUserId,
        createdBy: req.session.userId
      });

      return res.status(201).json({
        success: true,
        conversation: safeTeamChatConversation(conversation, [], users, req.session.userId)
      });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

  function canAccessScreenConversation(chat = {}, userId = '') {
    if (chat.type !== 'direct') return true;
    return Array.isArray(chat.participantIds) && chat.participantIds.includes(String(userId));
  }

  app.get('/api/team-chats/:conversationId/messages', requireAuth, async (req, res) => {
    const chat = await readTeamChatById(req.params.conversationId);
    if (!chat) return res.status(404).json({ success: false, message: 'Screen não encontrada.' });
    if (!canAccessScreenConversation(chat, req.session.userId)) return res.status(403).json({ success: false, message: 'Você não tem acesso a essa screen.' });

    const messages = await readTeamChatMessages(req.params.conversationId, {
      limit: req.query.limit || 80
    });

    return res.json({ success: true, messages: messages.map(safeChatMessage) });
  });

  app.post('/api/team-chats/:conversationId/messages', requireAuth, async (req, res) => {
    const user = await findUserById(req.session.userId);
    const chat = await readTeamChatById(req.params.conversationId);
    if (!chat) return res.status(404).json({ success: false, message: 'Screen não encontrada.' });
    if (!canAccessScreenConversation(chat, req.session.userId)) return res.status(403).json({ success: false, message: 'Você não tem acesso a essa screen.' });
    const content = String(req.body.content || '').trim();

    if (!content) {
      return res.status(400).json({ success: false, message: 'Escreva uma mensagem.' });
    }

    try {
      const message = await saveTeamChatMessage(req.params.conversationId, {
        source: 'site',
        authorId: user?.id || req.session.userId,
        authorName: user?.profile?.username || user?.name || 'Usuário Abyss',
        authorAvatar: user?.avatar || '',
        content,
        attachments: []
      });

      return res.status(201).json({ success: true, message: safeChatMessage(message) });
    } catch (error) {
      return res.status(404).json({ success: false, message: error.message });
    }
  });


  app.patch('/api/team-chats/:conversationId/messages/:messageId', requireAuth, async (req, res) => {
    const user = await findUserById(req.session.userId);
    const chat = await readTeamChatById(req.params.conversationId);
    if (!chat) return res.status(404).json({ success: false, message: 'Screen não encontrada.' });
    if (!canAccessScreenConversation(chat, req.session.userId)) return res.status(403).json({ success: false, message: 'Você não tem acesso a essa screen.' });
    const content = String(req.body.content || '').trim();

    if (!content) {
      return res.status(400).json({ success: false, message: 'A mensagem não pode ficar vazia.' });
    }

    try {
      const message = await updateTeamChatMessage(req.params.conversationId, req.params.messageId, { content }, {
        authorId: user?.id || req.session.userId,
        source: 'site'
      });

      return res.json({ success: true, message: safeChatMessage(message) });
    } catch (error) {
      return res.status(404).json({ success: false, message: error.message });
    }
  });

  function normalizeTeamPayload(body, existing = {}) {
    const name = String(body.name || '').trim();
    const tag = String(body.tag || '').trim().toUpperCase();
    const players = Array.isArray(body.players)
      ? body.players.map((player) => String(player || '').trim()).filter(Boolean).slice(0, 5)
      : [];
    const reserves = Array.isArray(body.reserves)
      ? body.reserves.map((reserve) => String(reserve || '').trim()).filter(Boolean).slice(0, 5)
      : [];

    if (!name) throw new Error('Informe o nome do time.');
    if (!tag) throw new Error('Informe a tag do time.');
    if (tag.length > 6) throw new Error('A tag pode ter no máximo 6 caracteres.');
    if (!players.length) throw new Error('Informe pelo menos um titular.');

    const receivedLogo = typeof body.logo === 'string' ? body.logo.trim() : '';
    const logo = receivedLogo && (receivedLogo.startsWith('data:image/') || /^https?:\/\//i.test(receivedLogo))
      ? receivedLogo
      : existing.logo || null;

    const socials = {
      site: String(body.socials?.site || body.socialSite || '').trim(),
      email: String(body.socials?.email || body.socialEmail || '').trim(),
      discord: String(body.socials?.discord || body.socialDiscord || '').trim(),
      twitter: String(body.socials?.twitter || body.socialTwitter || '').trim(),
      youtube: String(body.socials?.youtube || body.socialYoutube || '').trim(),
      tiktok: String(body.socials?.tiktok || body.socialTiktok || '').trim(),
      instagram: String(body.socials?.instagram || body.socialInstagram || '').trim()
    };

    const playerAccounts = {
      players: Array.isArray(body.playerAccounts?.players)
        ? body.playerAccounts.players.map((value) => String(value || '').trim()).slice(0, 5)
        : [],
      reserves: Array.isArray(body.playerAccounts?.reserves)
        ? body.playerAccounts.reserves.map((value) => String(value || '').trim()).slice(0, 5)
        : []
    };

    while (playerAccounts.players.length < players.length) playerAccounts.players.push('');
    while (playerAccounts.reserves.length < reserves.length) playerAccounts.reserves.push('');

    return { name, tag, players, reserves, logo, socials, playerAccounts };
  }

  function sanitizeTeam(team) {
    return {
      id: team.id,
      name: team.name,
      tag: team.tag,
      logo: team.logo || null,
      players: Array.isArray(team.players) ? team.players : [],
      reserves: Array.isArray(team.reserves) ? team.reserves : [],
      socials: team.socials || {},
      playerAccounts: team.playerAccounts || { players: [], reserves: [] },
      ownerUserId: team.ownerUserId || null,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt
    };
  }

  function normalizeBracketArray(rawSlots, teams, size) {
    const teamById = new Map(teams.map((team) => [team.id, sanitizeTeam(team)]));
    const slots = Array.isArray(rawSlots) ? rawSlots.slice(0, size) : [];

    while (slots.length < size) slots.push(null);

    return slots.map((slot) => {
      if (!slot) return null;
      const id = typeof slot === 'string' ? slot : slot.id;
      return teamById.get(id) || null;
    });
  }

  function normalizeBracketForResponse(bracket, teams) {
    return {
      slots: normalizeBracketArray(bracket.slots, teams, 16),
      quarters: normalizeBracketArray(bracket.quarters, teams, 8),
      semis: normalizeBracketArray(bracket.semis, teams, 4),
      finals: normalizeBracketArray(bracket.finals, teams, 2),
      matchProgress: bracket.matchProgress || { slots: [], quarters: [], semis: [], finals: [] },
      generatedAt: bracket.generatedAt || null,
      updatedAt: bracket.updatedAt || null
    };
  }

  function normalizeBracketIds(body, teams) {
    const validIds = new Set(teams.map((team) => team.id));
    const normalize = (items, size) => {
      const result = Array.isArray(items) ? items.slice(0, size) : [];
      while (result.length < size) result.push(null);
      return result.map((slot) => {
        const id = typeof slot === 'string' ? slot : slot?.id;
        return id && validIds.has(id) ? id : null;
      });
    };

    return {
      slots: normalize(body.slots, 16),
      quarters: normalize(body.quarters, 8),
      semis: normalize(body.semis, 4),
      finals: normalize(body.finals, 2)
    };
  }

  function normalizeMatchProgressBody(raw = {}) {
    const normalize = (items, size) => {
      const result = Array.isArray(items) ? items.slice(0, size) : [];
      while (result.length < size) result.push(1);
      return result.map((value) => {
        const number = Number(value);
        return Number.isFinite(number) && number > 0 ? Math.floor(number) : 1;
      });
    };

    return {
      slots: normalize(raw.slots, 16),
      quarters: normalize(raw.quarters, 8),
      semis: normalize(raw.semis, 4),
      finals: normalize(raw.finals, 2)
    };
  }

  function generateBracketSlots(teams, teamLimit = 16) {
    const limit = Math.max(4, Math.min(32, Number(teamLimit || 16)));
    const bracketSize = Math.min(16, limit);
    const selected = teams.slice(0, bracketSize).map(sanitizeTeam);
    const slots = Array(16).fill(null);

    // Distribui em ordem espelhada para ficar parecido com chaveamento de copa.
    const order = [0, 15, 7, 8, 3, 12, 4, 11, 1, 14, 6, 9, 2, 13, 5, 10];
    selected.forEach((team, index) => {
      slots[order[index]] = team;
    });

    return slots;
  }

  function generateTournamentGroups(teams = [], settings = {}) {
    const teamLimit = Math.max(4, Math.min(32, Number(settings.teamLimit || 16)));
    const groupCount = Math.max(2, Math.min(8, Number(settings.groupCount || 4)));
    const selected = teams.slice(0, teamLimit).map(sanitizeTeam);
    const groups = Array.from({ length: groupCount }, (_item, index) => ({
      id: `group_${index + 1}`,
      name: `Grupo ${String.fromCharCode(65 + index)}`,
      teamIds: [],
      teams: []
    }));

    selected.forEach((team, index) => {
      const group = groups[index % groupCount];
      group.teamIds.push(team.id);
      group.teams.push(team);
    });

    return groups;
  }

  function teamChannelName(team = {}) {
    return String(team.name || team.tag || 'time')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 36) || 'time';
  }

  function uniqueIds(items = []) {
    return Array.from(new Set(items.map((item) => String(item || '').trim()).filter(Boolean)));
  }

  function extractDiscordId(value = '', usersById = new Map(), usersByDiscordId = new Map()) {
    const raw = String(value || '').trim();
    if (!raw) return '';

    const mention = raw.match(/^<@!?(\d+)>$/);
    if (mention) return mention[1];

    if (/^\d{16,22}$/.test(raw)) {
      if (usersByDiscordId.has(raw)) return raw;
      return raw;
    }

    const user = usersById.get(raw);
    return user?.discordId || '';
  }

  function teamDiscordMemberIds(team = {}, users = []) {
    const usersById = new Map(users.map((user) => [String(user.id), user]));
    const usersByDiscordId = new Map(users.map((user) => [String(user.discordId || ''), user]).filter(([id]) => id));

    const ids = [];

    if (team.ownerUserId) {
      const owner = usersById.get(String(team.ownerUserId));
      if (owner?.discordId) ids.push(owner.discordId);
    }

    const accounts = [
      ...(Array.isArray(team.playerAccounts?.players) ? team.playerAccounts.players : []),
      ...(Array.isArray(team.playerAccounts?.reserves) ? team.playerAccounts.reserves : [])
    ];

    accounts.forEach((value) => {
      const discordId = extractDiscordId(value, usersById, usersByDiscordId);
      if (discordId) ids.push(discordId);
    });

    return uniqueIds(ids);
  }

  function bracketInitialMatches(bracket = {}, teams = []) {
    const byId = new Map(teams.map((team) => [team.id, sanitizeTeam(team)]));
    const slots = Array.isArray(bracket.slots) ? bracket.slots : [];
    const pairs = [];

    for (let index = 0; index < 16; index += 2) {
      const teamAId = typeof slots[index] === 'string' ? slots[index] : slots[index]?.id;
      const teamBId = typeof slots[index + 1] === 'string' ? slots[index + 1] : slots[index + 1]?.id;
      const teamA = byId.get(teamAId);
      const teamB = byId.get(teamBId);

      if (teamA && teamB) {
        pairs.push({
          round: 'oitavas',
          index: Math.floor(index / 2) + 1,
          teamA,
          teamB
        });
      }
    }

    return pairs;
  }

  async function resolveDiscordGuildForMatches(settings = {}) {
    const channelId = settings.discordMatchCategoryId || settings.discordChannelId || '';

    if (channelId && client?.channels?.fetch) {
      try {
        const channel = await client.channels.fetch(channelId);
        if (channel?.guild) return channel.guild;
      } catch {}
    }

    const [statsBridge, chatBridge] = await Promise.all([
      readStatsBridgeSettings().catch(() => null),
      readChatBridgeSettings().catch(() => null)
    ]);

    const bridgeChannelId = statsBridge?.discordChannelId || chatBridge?.discordChannelId || '';
    if (bridgeChannelId && client?.channels?.fetch) {
      try {
        const channel = await client.channels.fetch(bridgeChannelId);
        if (channel?.guild) return channel.guild;
      } catch {}
    }

    return client?.guilds?.cache?.first?.() || null;
  }

  async function findOrCreateDiscordMatchChannel(match = {}, settings = {}, users = []) {
    if (!client?.user) {
      return { ok: false, skipped: true, reason: 'Bot Discord ainda não está online.' };
    }

    const guild = await resolveDiscordGuildForMatches(settings);
    if (!guild?.channels?.create) {
      return { ok: false, skipped: true, reason: 'Nenhum servidor Discord disponível para criar canal.' };
    }

    const baseName = `partida-${match.round}-${String(match.index).padStart(2, '0')}-${teamChannelName(match.teamA)}-vs-${teamChannelName(match.teamB)}`.slice(0, 92);
    await guild.channels.fetch().catch(() => null);
    const existing = guild.channels.cache.find((channel) => channel.type === ChannelType.GuildText && channel.name === baseName);

    if (existing) {
      return {
        ok: true,
        reused: true,
        channelId: existing.id,
        channelName: existing.name,
        url: existing.url || ''
      };
    }

    const memberIds = uniqueIds([
      ...teamDiscordMemberIds(match.teamA, users),
      ...teamDiscordMemberIds(match.teamB, users)
    ]);

    const permissionOverwrites = [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionsBitField.Flags.ViewChannel]
      },
      {
        id: client.user.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.AttachFiles,
          PermissionsBitField.Flags.EmbedLinks,
          PermissionsBitField.Flags.ManageChannels
        ]
      },
      ...memberIds.map((id) => ({
        id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.AttachFiles,
          PermissionsBitField.Flags.EmbedLinks
        ]
      }))
    ];

    const category = settings.discordMatchCategoryId
      ? await guild.channels.fetch(settings.discordMatchCategoryId).catch(() => null)
      : null;

    const channel = await guild.channels.create({
      name: baseName,
      type: ChannelType.GuildText,
      parent: category?.type === ChannelType.GuildCategory ? category.id : undefined,
      permissionOverwrites,
      topic: `Partida ${match.round} ${match.index}: ${match.teamA.name} vs ${match.teamB.name} | Void Arena`
    });

    await channel.send({
      content: [
        `🏟️ **Canal da partida criado**`,
        `**${match.teamA.name}** vs **${match.teamB.name}**`,
        `Rodada: **${match.round} ${match.index}**`,
        memberIds.length
          ? `Acesso liberado para jogadores/capitães vinculados aos times.`
          : `⚠️ Nenhum Discord ID foi encontrado nos jogadores/capitães vinculados aos times. Ajuste os perfis para privar corretamente.`
      ].join('\n'),
      allowedMentions: { parse: [] }
    }).catch(() => {});

    return {
      ok: true,
      created: true,
      channelId: channel.id,
      channelName: channel.name,
      url: channel.url || '',
      memberIds
    };
  }

  async function createDiscordChannelsForBracket(bracket = {}, settings = {}) {
    if (settings.autoCreateMatchChannels === false) {
      return { enabled: false, results: [] };
    }

    const [teams, users] = await Promise.all([readTeams(), readUsers()]);
    const matches = bracketInitialMatches(bracket, teams);
    const results = [];

    for (const match of matches) {
      try {
        const result = await findOrCreateDiscordMatchChannel(match, settings, users);
        results.push({
          round: match.round,
          index: match.index,
          teamA: match.teamA.name,
          teamB: match.teamB.name,
          ...result
        });
      } catch (error) {
        results.push({
          round: match.round,
          index: match.index,
          teamA: match.teamA?.name || '',
          teamB: match.teamB?.name || '',
          ok: false,
          error: error.message
        });
      }
    }

    return { enabled: true, results };
  }


  app.get('/api/dashboard/snapshot', requireAuth, async (_req, res) => {
    const [teams, bracket, events, users, settings] = await Promise.all([
      readTeams(),
      readBracket(),
      readEvents(),
      readUsers(),
      readTournamentSettings()
    ]);

    return res.json({
      success: true,
      generatedAt: new Date().toISOString(),
      teams: teams.map(sanitizeTeam),
      bracket: normalizeBracketForResponse(bracket, teams),
      events: events.map((event) => safeTournamentEvent(event, teams)),
      users: users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email || null,
        provider: user.provider || 'email',
        discordId: user.discordId || null,
        avatar: user.avatar || null,
        socials: normalizeUserSocials(user.socials || {}),
        profile: normalizeUserProfile(user.profile || {}),
        createdAt: user.createdAt || null,
        updatedAt: user.updatedAt || null
      })),
      settings
    });
  });

  app.get('/api/users/lookup', requireAuth, async (_req, res) => {
    const users = await readUsers();
    const refreshedUsers = await Promise.all(users.map((user) => refreshDiscordProfile(user)));

    return res.json({
      success: true,
      users: refreshedUsers.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email || null,
        provider: user.provider || 'email',
        discordId: user.discordId || null,
        avatar: user.avatar || null,
        socials: normalizeUserSocials(user.socials || {}),
        profile: normalizeUserProfile(user.profile || {}),
        createdAt: user.createdAt || null,
        updatedAt: user.updatedAt || null
      }))
    });
  });


  function normalizeEventPayload(body = {}, existing = {}) {
    const title = String(body.title || body.name || existing.title || existing.name || 'Novo evento').trim().slice(0, 80);
    const allowedStatuses = new Set(['open', 'closed', 'running', 'finished']);
    const teamLimit = [4, 8, 16, 32].includes(Number(body.teamLimit)) ? Number(body.teamLimit) : Number(existing.teamLimit || 16) || 16;
    const minimumTeams = Math.max(2, Math.min(teamLimit, Number(body.minimumTeams || existing.minimumTeams || 4) || 4));
    return {
      id: String(body.id || existing.id || '').trim() || undefined,
      name: title,
      title,
      mode: String(body.mode || existing.mode || 'Mata-mata').trim().slice(0, 60),
      matchFormat: String(body.matchFormat || existing.matchFormat || 'MD3').trim().slice(0, 12),
      structure: String(body.structure || existing.structure || '').trim().slice(0, 60),
      teamLimit,
      minimumTeams,
      startAt: String(body.startAt || existing.startAt || '').trim().slice(0, 40),
      status: allowedStatuses.has(String(body.status || existing.status || 'open')) ? String(body.status || existing.status || 'open') : 'open',
      description: String(body.description || existing.description || '').trim().slice(0, 260),
      registrations: Array.isArray(existing.registrations) ? existing.registrations : []
    };
  }

  app.get('/api/events', requireAuth, async (_req, res) => {
    const [events, teams] = await Promise.all([readEvents(), readTeams()]);
    return res.json({ success: true, events: events.map((event) => safeTournamentEvent(event, teams)) });
  });

  app.post('/api/events', requireAuth, requireAdmin, async (req, res) => {
    try {
      const payload = normalizeEventPayload(req.body || {});
      const event = await saveTournamentEvent(payload);
      const teams = await readTeams();
      return res.status(201).json({ success: true, event: safeTournamentEvent(event, teams) });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

  app.put('/api/events/:eventId', requireAuth, requireAdmin, async (req, res) => {
    try {
      const events = await readEvents();
      const existing = events.find((item) => item.id === req.params.eventId);
      if (!existing) return res.status(404).json({ success: false, message: 'Evento não encontrado.' });
      const payload = normalizeEventPayload({ ...req.body, id: existing.id }, existing);
      const event = await saveTournamentEvent({ ...existing, ...payload });
      const teams = await readTeams();
      return res.json({ success: true, event: safeTournamentEvent(event, teams) });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

  app.post('/api/events/:eventId/register', requireAuth, async (req, res) => {
    const [teams, user] = await Promise.all([readTeams(), findUserById(req.session.userId)]);
    const teamId = String(req.body.teamId || '').trim();
    const team = teams.find((item) => item.id === teamId);

    if (!team) {
      return res.status(404).json({ success: false, message: 'Time não encontrado para inscrição.' });
    }

    if (!userCanRepresentTeam(user, team)) {
      return res.status(403).json({ success: false, message: 'Você só pode inscrever um time que você criou ou está vinculado.' });
    }

    try {
      const result = await registerTeamInEvent(req.params.eventId, teamId, req.session.userId);
      const freshEvents = await readEvents();
      const event = freshEvents.find((item) => item.id === req.params.eventId) || result.event;
      return res.status(result.alreadyRegistered ? 200 : 201).json({
        success: true,
        alreadyRegistered: Boolean(result.alreadyRegistered),
        registration: result.registration,
        event: safeTournamentEvent(event, teams)
      });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

  app.get('/api/tournament/settings', requireAuth, async (_req, res) => {
    const settings = await readTournamentSettings();
    return res.json({ success: true, settings });
  });

  app.put('/api/tournament/settings', requireAuth, requireAdmin, async (req, res) => {
    const allowedFormats = new Set(['MD1', 'MD2', 'MD3', 'MD5']);
    const allowedStructures = new Set(['single_elimination', 'groups', 'groups_playoffs']);

    const teamLimit = [4, 8, 16, 32].includes(Number(req.body.teamLimit)) ? Number(req.body.teamLimit) : 16;
    const groupCount = [2, 4, 8].includes(Number(req.body.groupCount)) ? Number(req.body.groupCount) : 4;

    const payload = {
      tournamentName: String(req.body.tournamentName || 'Rematch Championship').trim().slice(0, 60),
      matchFormat: allowedFormats.has(String(req.body.matchFormat)) ? String(req.body.matchFormat) : 'MD1',
      structure: allowedStructures.has(String(req.body.structure)) ? String(req.body.structure) : 'single_elimination',
      teamLimit,
      groupCount,
      autoCreateMatchChannels: req.body.autoCreateMatchChannels !== false,
      discordMatchCategoryId: String(req.body.discordMatchCategoryId || '').trim()
    };

    const settings = await writeTournamentSettings(payload);
    return res.json({ success: true, settings });
  });

  app.get('/api/teams', requireAuth, async (_req, res) => {
    const teams = await readTeams();
    const bracket = await readBracket();

    return res.json({
      success: true,
      teams: teams.map(sanitizeTeam),
      bracket: normalizeBracketForResponse(bracket, teams)
    });
  });

  app.post('/api/teams', requireAuth, async (req, res) => {
    try {
      const payload = normalizeTeamPayload(req.body);
      const now = new Date().toISOString();
      const team = await saveTeam({
        id: crypto.randomUUID(),
        ...payload,
        ownerUserId: req.session.userId,
        createdAt: now,
        updatedAt: now
      });

      return res.status(201).json({ success: true, team: sanitizeTeam(team) });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

  app.put('/api/teams/:teamId', requireAuth, async (req, res) => {
    try {
      const teams = await readTeams();
      const existing = teams.find((team) => team.id === req.params.teamId);

      if (!existing) {
        return res.status(404).json({ success: false, message: 'Time não encontrado.' });
      }

      const canManage = await userCanManageTeamRecord(req.session.userId, existing);
      if (!canManage) {
        return res.status(403).json({ success: false, message: 'Você não tem permissão para editar esse time.' });
      }

      const payload = normalizeTeamPayload(req.body, existing);
      const team = await saveTeam({
        ...existing,
        ...payload,
        updatedAt: new Date().toISOString()
      });

      return res.json({ success: true, team: sanitizeTeam(team) });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

  app.delete('/api/teams/:teamId', requireAuth, async (req, res) => {
    const teamsBeforeDelete = await readTeams();
    const targetTeam = teamsBeforeDelete.find((team) => team.id === req.params.teamId);
    if (!targetTeam) {
      return res.status(404).json({ success: false, message: 'Time não encontrado.' });
    }
    const canManage = await userCanManageTeamRecord(req.session.userId, targetTeam);
    if (!canManage) {
      return res.status(403).json({ success: false, message: 'Você não tem permissão para excluir esse time.' });
    }

    const removed = await deleteTeam(req.params.teamId);

    if (!removed) {
      return res.status(404).json({ success: false, message: 'Time não encontrado.' });
    }

    const teams = await readTeams();
    const bracket = await readBracket();
    const remainingIds = new Set(teams.map((team) => team.id));
    const clean = (items) => (Array.isArray(items) ? items : []).map((slot) => {
      const id = typeof slot === 'string' ? slot : slot?.id;
      return id && remainingIds.has(id) ? id : null;
    });

    await writeBracket({
      slots: clean(bracket.slots),
      quarters: clean(bracket.quarters),
      semis: clean(bracket.semis),
      finals: clean(bracket.finals),
      matchProgress: bracket.matchProgress,
      generatedAt: bracket.generatedAt,
      updatedAt: new Date().toISOString()
    });

    return res.json({ success: true });
  });

  app.post('/api/bracket/generate', requireAuth, requireAdmin, async (_req, res) => {
    const teams = await readTeams();
    const settings = await readTournamentSettings();

    if (!teams.length) {
      return res.status(400).json({ success: false, message: 'Cadastre pelo menos um time antes de gerar.' });
    }

    const selectedTeams = teams.slice(0, settings.teamLimit || 16);
    const groups = generateTournamentGroups(selectedTeams, settings);
    const slots = generateBracketSlots(selectedTeams, settings.teamLimit || 16);
    const bracket = await writeBracket({
      slots: slots.map((team) => team?.id || null),
      matchProgress: normalizeMatchProgressBody({}),
      generatedAt: new Date().toISOString()
    });

    let matchChannels = { enabled: false, results: [] };
    if (settings.autoCreateMatchChannels !== false) {
      matchChannels = await createDiscordChannelsForBracket(bracket, settings);
    }

    return res.json({
      success: true,
      bracket: normalizeBracketForResponse(bracket, teams),
      groups,
      matchChannels,
      settings
    });
  });


  app.post('/api/bracket/match-channels', requireAuth, requireAdmin, async (_req, res) => {
    const [bracket, settings] = await Promise.all([readBracket(), readTournamentSettings()]);
    const matchChannels = await createDiscordChannelsForBracket(bracket, settings);
    return res.json({ success: true, matchChannels });
  });

  app.put('/api/bracket', requireAuth, requireAdmin, async (req, res) => {
    const teams = await readTeams();
    const existing = await readBracket();
    const normalized = normalizeBracketIds(req.body || {}, teams);

    const bracket = await writeBracket({
      slots: normalized.slots,
      quarters: normalized.quarters,
      semis: normalized.semis,
      finals: normalized.finals,
      matchProgress: normalizeMatchProgressBody(req.body?.matchProgress || existing.matchProgress),
      generatedAt: existing.generatedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    return res.json({
      success: true,
      bracket: normalizeBracketForResponse(bracket, teams)
    });
  });

  app.post('/internal/results/submit', requireSiteInternalToken, async (req, res) => {
    try {
      const payload = req.body || {};
      const hubId = `${payload.roundKey || payload.match?.roundKey || 'slots'}_${Number(payload.matchIndex ?? payload.match?.matchIndex ?? 0) || 0}`;
      const records = await readResultRecords();
      let result = records.find((item) => item.hubId === hubId) || null;

      const submission = {
        authorDiscordId: String(payload.authorDiscordId || '').trim(),
        authorName: String(payload.authorName || 'CapitÃ£o').trim().slice(0, 120),
        scoreA: Number(payload.scoreA || 0) || 0,
        scoreB: Number(payload.scoreB || 0) || 0,
        playedGames: Number(payload.playedGames || 0) || 0,
        remainingGames: Number(payload.remainingGames || 0) || 0,
        proof: payload.proof || null,
        isStaff: Boolean(payload.isStaff),
        createdAt: payload.createdAt || new Date().toISOString()
      };

      if (!result) {
        result = {
          id: `result_${hubId}`,
          hubId,
          match: payload.match || {},
          submissions: [],
          status: 'pending',
          finalScoreA: null,
          finalScoreB: null,
          playedGames: 0,
          remainingGames: 0,
          proof: null,
          winnerTeamId: '',
          advanced: false,
          createdAt: new Date().toISOString()
        };
      }

      const key = submission.authorDiscordId || submission.authorName;
      const existingIndex = result.submissions.findIndex((item) => (item.authorDiscordId || item.authorName) === key);
      if (existingIndex >= 0) result.submissions[existingIndex] = submission;
      else result.submissions.push(submission);

      const computed = computeResultStatus(result);
      result.status = computed.status;
      if (computed.final) {
        result.finalScoreA = Number(computed.final.scoreA || 0);
        result.finalScoreB = Number(computed.final.scoreB || 0);
        result.playedGames = Number(computed.final.playedGames || 0);
        result.remainingGames = Number(computed.final.remainingGames || 0);
        result.proof = computed.final.proof || null;
        result.winnerTeamId = scoreWinner(result);
      }

      let bracketApply = { applied: false };
      if (result.status === 'validated' && result.winnerTeamId && !result.advanced) {
        bracketApply = await applyResultToBracket(result);
        result.advanced = Boolean(bracketApply.applied);
        result.advancedAt = bracketApply.applied ? new Date().toISOString() : null;
      }

      result.updatedAt = new Date().toISOString();
      const savedMessage = await saveResultRecord(result);
      result.messageId = savedMessage.id || result.messageId || '';

      req.app.locals.realtime?.broadcast?.({
        type: 'match-result:update',
        payload: { result, bracket: bracketApply.bracket || null },
        source: 'bot'
      });

      return res.json({ success: true, result, bracketApply });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy(() => {
      res.clearCookie('abyss.tourment.sid');
      res.json({ success: true });
    });
  });

  app.get('/auth/discord', (req, res) => {
    const clientId = process.env.DISCORD_CLIENT_ID || process.env.CLIENT_ID;
    const callbackUrl = getDiscordCallbackUrl();

    if (!clientId || !callbackUrl) {
      return res.status(501).send('Login com Discord ainda não configurado. Preencha DISCORD_CLIENT_ID e DISCORD_CALLBACK_URL no .env.');
    }

    const state = crypto.randomBytes(16).toString('hex');
    req.session.discordOAuthState = state;

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUrl,
      response_type: 'code',
      scope: 'identify email',
      state
    });

    return res.redirect(`https://discord.com/oauth2/authorize?${params.toString()}`);
  });

  app.get('/auth/discord/callback', async (req, res) => {
    const code = String(req.query.code || '');
    const state = String(req.query.state || '');
    const clientId = process.env.DISCORD_CLIENT_ID || process.env.CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    const callbackUrl = getDiscordCallbackUrl();

    if (!code || !state || state !== req.session.discordOAuthState) {
      return res.redirect('/?auth=discord_state_error');
    }

    if (!clientId || !clientSecret || !callbackUrl) {
      return res.redirect('/?auth=discord_not_configured');
    }

    try {
      const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'authorization_code',
          code,
          redirect_uri: callbackUrl
        })
      });

      if (!tokenResponse.ok) throw new Error('Falha ao trocar code por token.');
      const tokenData = await tokenResponse.json();

      const profileResponse = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });

      if (!profileResponse.ok) throw new Error('Falha ao buscar perfil do Discord.');
      const profile = await profileResponse.json();

      const avatar = discordAvatarUrl({ id: profile.id, avatar: profile.avatar }, 128);
      const discordBanner = discordBannerUrl({ id: profile.id, banner: profile.banner }, 1024);

      let user = await findUserByDiscordId(profile.id);

      if (!user && profile.email) {
        user = await findUserByEmail(profile.email);
      }

      const currentProfile = user?.profile || { username: profile.global_name || profile.username || 'Usuário Discord' };
      const profileWithDiscordBanner = mergeDiscordBannerIntoProfile(currentProfile, discordBanner);

      user = await saveUser({
        id: user?.id || crypto.randomUUID(),
        name: user?.name || profile.global_name || profile.username || 'Usuário Discord',
        email: user?.email || profile.email || null,
        passwordHash: user?.passwordHash || null,
        provider: user?.provider === 'email' ? 'email+discord' : 'discord',
        discordId: profile.id,
        avatar,
        socials: user?.socials || {},
        profile: {
          ...profileWithDiscordBanner,
          username: profileWithDiscordBanner.username || profile.global_name || profile.username || 'Usuário Discord'
        },
        createdAt: user?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      req.session.userId = user.id;
      delete req.session.discordOAuthState;

      return req.session.save((sessionError) => {
        if (sessionError) {
          console.error('Erro ao salvar sessão Discord:', sessionError);
          return res.redirect('/?auth=discord_error');
        }

        return res.redirect('/pages/dashboard.html');
      });
    } catch (error) {
      console.error('Erro no login Discord:', error);
      return res.redirect('/?auth=discord_error');
    }
  });

  app.get('/dashboard', (_req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'pages', 'dashboard.html'));
  });

  app.get('*', (_req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
  });


  app.post('/api/events/:eventId/registration-request', requireAuth, async (req, res) => {
    const user = await findUserById(req.session.userId);
    if (!user) return res.status(401).json({ success: false, message: 'Sessão inválida.' });

    const eventId = String(req.params.eventId || '').trim();
    const teamId = String(req.body?.teamId || '').trim();

    if (!eventId || !teamId) {
      return res.status(400).json({ success: false, message: 'Evento ou time inválido.' });
    }

    try {
      const teams = await readTeams();
      const team = teams.find((item) => String(item.id) === teamId);

      if (!team) {
        return res.status(404).json({ success: false, message: 'Time não encontrado.' });
      }

      if (!isAdminUser(user) && !userCanRepresentTeam(user, team)) {
        return res.status(403).json({ success: false, message: 'Apenas o dono/capitão/responsável pode validar esse time.' });
      }

      const data = await callBotInternalApi('/internal/event-registration-requests/create', {
        method: 'POST',
        body: JSON.stringify({
          eventId,
          teamId,
          teamName: team.name || '',
          teamTag: team.tag || '',
          userId: user.id,
          responsibleDiscordId: user.discordId || '',
          responsibleName: user.profile?.username || user.name || '',
          validationChannelId: '1519857078024540270'
        })
      });

      return res.json({
        success: true,
        ...data,
        message: data.alreadyRegistered
          ? 'Esse time já está inscrito no evento.'
          : 'Pedido de validação criado. Vá para o canal de validação no Discord e preencha o formulário.'
      });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });


  return app;
}

module.exports = { createServer };
