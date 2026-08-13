const BOT_API_URL = String(process.env.BOT_API_URL || process.env.BOT_PUBLIC_URL || 'http://localhost:3002').replace(/\/$/, '');
const BOT_API_KEY = process.env.BOT_API_KEY || process.env.INTERNAL_API_TOKEN || process.env.SITE_REALTIME_TOKEN || '';
const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function positiveInteger(value, fallback, maximum) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return fallback;
  return Math.min(maximum, Math.trunc(number));
}

function bridgeError(message, { status = 0, code = '', retryable = false } = {}) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  error.retryable = retryable;
  return error;
}

function networkFailure(error) {
  if (!error || Number(error.status || 0) > 0) return false;
  return /fetch|network|socket|econn|tempo limite|timed out|aborted|abort/i.test(String(error.message || error.name || ''));
}

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
  const method = String(options.method || 'GET').toUpperCase();
  const configuredRetries = options.retryCount ?? (method === 'GET' ? process.env.SITE_BOT_API_RETRIES || 2 : 0);
  const retryCount = positiveInteger(configuredRetries, 0, 3);
  const retryDelayMs = positiveInteger(options.retryDelayMs ?? process.env.SITE_BOT_API_RETRY_DELAY_MS, 1500, 10000);
  const { retryCount: _retryCount, retryDelayMs: _retryDelayMs, ...fetchOptions } = options;
  let lastError = null;

  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    try {
      const response = await fetch(`${BOT_API_URL}${pathname}`, {
        ...fetchOptions,
        headers: botHeaders(fetchOptions.headers || {})
      });
      const raw = await response.text();
      let data = {};

      try {
        data = raw.trim() ? JSON.parse(raw) : {};
      } catch {
        throw bridgeError('O BOT ainda está iniciando e não retornou uma resposta válida.', {
          status: response.status,
          code: 'BOT_NON_JSON_RESPONSE',
          retryable: response.ok || RETRYABLE_STATUS_CODES.has(response.status)
        });
      }

      if (!response.ok || data.success === false) {
        throw bridgeError(data.message || `Falha na ponte interna com o bot (${response.status}).`, {
          status: response.status,
          code: String(data.code || ''),
          retryable: RETRYABLE_STATUS_CODES.has(response.status)
        });
      }

      return data;
    } catch (error) {
      lastError = error;
      const canRetry = error?.retryable === true || networkFailure(error);
      if (!canRetry || attempt >= retryCount) throw error;
      const delay = retryDelayMs * (attempt + 1);
      console.warn(`[Bot Bridge] Tentativa ${attempt + 1} falhou em ${pathname}; nova tentativa em ${delay}ms.`);
      await wait(delay);
    }
  }

  throw lastError || new Error('BOT indisponível.');
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
