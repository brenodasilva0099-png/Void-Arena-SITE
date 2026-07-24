const CANONICAL_SITE_URL = 'https://hollow-nexus-league.onrender.com';
const CANONICAL_DISCORD_CALLBACK_URL = `${CANONICAL_SITE_URL}/auth/discord/callback`;
const CANONICAL_BOT_URL = 'https://void-arena-bot-i4i9.onrender.com';

function cleanUrl(value = '') {
  return String(value || '').trim().replace(/\/+$/, '');
}

function isInvalidBotUrl(value = '') {
  const url = cleanUrl(value).toLowerCase();
  if (!url) return true;
  return (
    url.includes('localhost') ||
    url.includes('127.0.0.1') ||
    url === 'https://void-arena-bot.onrender.com' ||
    url === 'http://void-arena-bot.onrender.com' ||
    /void-arena-bot\.onrender\.com$/i.test(url)
  );
}

function isInvalidSiteUrl(value = '') {
  const url = cleanUrl(value).toLowerCase();
  if (!url) return true;
  return (
    url.includes('localhost') ||
    url.includes('127.0.0.1') ||
    /void-arena-site(?:-[a-z0-9]+)?\.onrender\.com$/i.test(url)
  );
}

function isInvalidDiscordCallback(value = '') {
  const url = cleanUrl(value);
  if (!url) return true;
  if (isInvalidSiteUrl(url)) return true;
  return url !== CANONICAL_DISCORD_CALLBACK_URL;
}

const configuredApiUrl = cleanUrl(process.env.BOT_API_URL);
const configuredPublicUrl = cleanUrl(process.env.BOT_PUBLIC_URL);
const selectedBotUrl = !isInvalidBotUrl(configuredApiUrl)
  ? configuredApiUrl
  : (!isInvalidBotUrl(configuredPublicUrl) ? configuredPublicUrl : CANONICAL_BOT_URL);

process.env.BOT_API_URL = selectedBotUrl;
process.env.BOT_PUBLIC_URL = selectedBotUrl;
process.env.SITE_BOT_STORAGE_TIMEOUT_MS = process.env.SITE_BOT_STORAGE_TIMEOUT_MS || '25000';
process.env.SITE_BOT_STORAGE_RETRIES = process.env.SITE_BOT_STORAGE_RETRIES || '8';

const configuredSiteUrl = cleanUrl(
  process.env.CANONICAL_SITE_URL ||
  process.env.PUBLIC_SITE_URL ||
  process.env.SITE_PUBLIC_URL ||
  process.env.SITE_URL ||
  process.env.APP_URL ||
  process.env.FRONTEND_URL
);
const selectedSiteUrl = isInvalidSiteUrl(configuredSiteUrl) ? CANONICAL_SITE_URL : configuredSiteUrl;

process.env.CANONICAL_SITE_URL = selectedSiteUrl;
process.env.PUBLIC_SITE_URL = selectedSiteUrl;
process.env.SITE_PUBLIC_URL = selectedSiteUrl;
process.env.DISCORD_CALLBACK_URL = isInvalidDiscordCallback(process.env.DISCORD_CALLBACK_URL)
  ? CANONICAL_DISCORD_CALLBACK_URL
  : cleanUrl(process.env.DISCORD_CALLBACK_URL);

console.log(`[Bot Bridge] URL canônica ativa: ${selectedBotUrl}`);
console.log(`[Discord OAuth] Callback canônico ativo: ${process.env.DISCORD_CALLBACK_URL}`);
