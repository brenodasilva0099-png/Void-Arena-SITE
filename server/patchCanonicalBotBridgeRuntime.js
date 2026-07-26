const CANONICAL_SITE_URL = 'https://hollownexus.com.br';
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

const configuredApiUrl = cleanUrl(process.env.BOT_API_URL);
const configuredPublicUrl = cleanUrl(process.env.BOT_PUBLIC_URL);
const selectedBotUrl = !isInvalidBotUrl(configuredApiUrl)
  ? configuredApiUrl
  : (!isInvalidBotUrl(configuredPublicUrl) ? configuredPublicUrl : CANONICAL_BOT_URL);

process.env.BOT_API_URL = selectedBotUrl;
process.env.BOT_PUBLIC_URL = selectedBotUrl;
process.env.SITE_BOT_STORAGE_TIMEOUT_MS = process.env.SITE_BOT_STORAGE_TIMEOUT_MS || '25000';
process.env.SITE_BOT_STORAGE_RETRIES = process.env.SITE_BOT_STORAGE_RETRIES || '8';

// O domínio público oficial é fixo. Variáveis antigas do Render não podem
// voltar a expor hollow-nexus-league.onrender.com no navegador ou no OAuth.
process.env.CANONICAL_SITE_URL = CANONICAL_SITE_URL;
process.env.PUBLIC_SITE_URL = CANONICAL_SITE_URL;
process.env.SITE_PUBLIC_URL = CANONICAL_SITE_URL;
process.env.SITE_URL = CANONICAL_SITE_URL;
process.env.APP_URL = CANONICAL_SITE_URL;
process.env.FRONTEND_URL = CANONICAL_SITE_URL;
process.env.DISCORD_CALLBACK_URL = CANONICAL_DISCORD_CALLBACK_URL;

console.log(`[Bot Bridge] URL canônica ativa: ${selectedBotUrl}`);
console.log(`[Domain] SITE público canônico: ${CANONICAL_SITE_URL}`);
console.log(`[Discord OAuth] Callback canônico ativo: ${CANONICAL_DISCORD_CALLBACK_URL}`);
