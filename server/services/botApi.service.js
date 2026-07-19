const BOT_API_URL = String(process.env.BOT_API_URL || process.env.BOT_PUBLIC_URL || 'http://localhost:3002').replace(/\/$/, '');
const BOT_API_KEY = process.env.BOT_API_KEY || process.env.INTERNAL_API_TOKEN || '';

function botHeaders(extra = {}) {
  return {
    'Content-Type': 'application/json',
    ...(BOT_API_KEY ? {
      'x-bot-api-key': BOT_API_KEY,
      'x-internal-token': BOT_API_KEY,
      'x-site-realtime-token': BOT_API_KEY
    } : {}),
    ...extra
  };
}

async function callBot(pathname, options = {}) {
  const response = await fetch(`${BOT_API_URL}${pathname}`, {
    ...options,
    headers: botHeaders(options.headers || {})
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    throw new Error(data.message || `Falha na ponte interna com o bot (${response.status}).`);
  }
  return data;
}

async function tryBot(pathname, options = {}, fallback = null) {
  try {
    return await callBot(pathname, options);
  } catch (error) {
    if (fallback && typeof fallback === 'object') return { ...fallback, internalError: error.message };
    return fallback;
  }
}

async function fetchGuildBrand() {
  const data = await tryBot('/public/guild-brand', {
    method: 'GET',
    headers: { Accept: 'application/json' }
  }, { success: false, guild: null });
  return data?.guild || null;
}

module.exports = {
  BOT_API_URL,
  BOT_API_KEY,
  botHeaders,
  callBot,
  tryBot,
  fetchGuildBrand
};
