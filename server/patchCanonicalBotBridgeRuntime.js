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

const configuredApiUrl = cleanUrl(process.env.BOT_API_URL);
const configuredPublicUrl = cleanUrl(process.env.BOT_PUBLIC_URL);
const selectedUrl = !isInvalidBotUrl(configuredApiUrl)
  ? configuredApiUrl
  : (!isInvalidBotUrl(configuredPublicUrl) ? configuredPublicUrl : CANONICAL_BOT_URL);

process.env.BOT_API_URL = selectedUrl;
process.env.BOT_PUBLIC_URL = selectedUrl;
process.env.SITE_BOT_STORAGE_TIMEOUT_MS = process.env.SITE_BOT_STORAGE_TIMEOUT_MS || '25000';
process.env.SITE_BOT_STORAGE_RETRIES = process.env.SITE_BOT_STORAGE_RETRIES || '8';

console.log(`[Bot Bridge] URL canônica ativa: ${selectedUrl}`);
