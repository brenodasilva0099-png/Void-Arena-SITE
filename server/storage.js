const BOT_API_URL = String(process.env.BOT_API_URL || process.env.BOT_PUBLIC_URL || 'http://localhost:3002').replace(/\/$/, '');
const BOT_API_KEY = process.env.BOT_API_KEY || process.env.INTERNAL_API_TOKEN || '';
const STORAGE_TIMEOUT_MS = Number(process.env.SITE_BOT_STORAGE_TIMEOUT_MS || process.env.SITE_BOT_FETCH_TIMEOUT_MS || 8500) || 8500;
const STORAGE_READ_RETRIES = Math.max(1, Number(process.env.SITE_BOT_STORAGE_READ_RETRIES || 2) || 2);
const STORAGE_WRITE_RETRIES = Math.max(1, Number(process.env.SITE_BOT_STORAGE_WRITE_RETRIES || 4) || 4);
const READ_CACHE = new Map();

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function internalHeaders(extra = {}) {
  return {
    'Content-Type': 'application/json',
    ...(BOT_API_KEY ? {
      'x-bot-api-key': BOT_API_KEY,
      'x-internal-token': BOT_API_KEY
    } : {}),
    ...extra
  };
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientStatus(status) {
  return [408, 425, 429, 500, 502, 503, 504].includes(Number(status));
}

function isReadOnlyMethod(method = '') {
  const name = String(method || '');
  if (name.startsWith('findOrCreate')) return false;
  return /^(read|find|get|list)/.test(name);
}

function retriesFor(method = '') {
  return isReadOnlyMethod(method) ? STORAGE_READ_RETRIES : STORAGE_WRITE_RETRIES;
}

function isConfigurationFailure(status, data = {}) {
  return [401, 403, 404].includes(Number(status)) || data?.code === 'INTERNAL_TOKEN_NOT_CONFIGURED';
}

function cacheKey(method = '', args = []) {
  return `${String(method)}:${JSON.stringify(args || [])}`;
}

function storeReadCache(method, args, value) {
  if (!isReadOnlyMethod(method)) return;
  READ_CACHE.set(cacheKey(method, args), {
    value: clone(value),
    savedAt: new Date().toISOString()
  });
}

function cachedRead(method, args) {
  if (!isReadOnlyMethod(method)) return null;
  const cached = READ_CACHE.get(cacheKey(method, args));
  return cached ? { ...cached, value: clone(cached.value) } : null;
}

async function wakeBotStorage() {
  if (!BOT_API_URL) return false;
  try {
    const response = await fetch(`${BOT_API_URL}/public/maintenance?t=${Date.now()}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      timeoutMs: Math.min(STORAGE_TIMEOUT_MS, 8000)
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function callBotStorage(method, args = []) {
  if (!BOT_API_URL) {
    throw new Error('BOT_API_URL não configurado. O SITE separado precisa chamar a API interna do BOT.');
  }

  const maxAttempts = retriesFor(method);
  let lastError = null;
  wakeBotStorage().catch(() => false);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(`${BOT_API_URL}/internal/storage/${method}`, {
        method: 'POST',
        timeoutMs: STORAGE_TIMEOUT_MS,
        headers: internalHeaders(),
        body: JSON.stringify({ args })
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok && data.success !== false) {
        storeReadCache(method, args, data.result);
        return data.result;
      }

      const error = new Error(data.message || `Falha no storage remoto do bot (${response.status}).`);
      error.status = response.status;
      error.code = data.code || '';
      if (isConfigurationFailure(response.status, data) || !isTransientStatus(response.status)) throw error;
      lastError = error;
    } catch (error) {
      lastError = error;
      const status = Number(error?.status || 0);
      if (error?.code === 'INTERNAL_TOKEN_NOT_CONFIGURED' || (status && !isTransientStatus(status))) break;
    }

    if (attempt < maxAttempts) {
      wakeBotStorage().catch(() => false);
      const delay = Math.min(3500, 700 * attempt + 300 * Math.max(0, attempt - 1));
      await wait(delay);
    }
  }

  const cached = cachedRead(method, args);
  if (cached) {
    console.warn(`[Storage/Cache] BOT indisponível em ${method}; usando última leitura válida de ${cached.savedAt}.`);
    return cached.value;
  }

  const suffix = lastError?.message ? ` ${lastError.message}` : '';
  throw new Error(`BOT storage indisponível em ${method} após ${maxAttempts} tentativa(s).${suffix}`);
}

function remoteStorageMethod(method) {
  return (...args) => callBotStorage(method, args);
}

module.exports = {
  wakeBotStorage,
  callBotStorage,
  readDatabaseStatus: remoteStorageMethod('readDatabaseStatus'),
  readEvents: remoteStorageMethod('readEvents'),
  saveTournamentEvent: remoteStorageMethod('saveTournamentEvent'),
  registerTeamInEvent: remoteStorageMethod('registerTeamInEvent'),
  readTournamentSettings: remoteStorageMethod('readTournamentSettings'),
  writeTournamentSettings: remoteStorageMethod('writeTournamentSettings'),
  readChatMessages: remoteStorageMethod('readChatMessages'),
  saveChatMessage: remoteStorageMethod('saveChatMessage'),
  updateChatMessage: remoteStorageMethod('updateChatMessage'),
  mergeChatMessageDiscordData: remoteStorageMethod('mergeChatMessageDiscordData'),
  readChatBridgeSettings: remoteStorageMethod('readChatBridgeSettings'),
  writeChatBridgeSettings: remoteStorageMethod('writeChatBridgeSettings'),
  readStatsBridgeSettings: remoteStorageMethod('readStatsBridgeSettings'),
  writeStatsBridgeSettings: remoteStorageMethod('writeStatsBridgeSettings'),
  readTeamChats: remoteStorageMethod('readTeamChats'),
  findOrCreateTeamChat: remoteStorageMethod('findOrCreateTeamChat'),
  findOrCreateDirectChat: remoteStorageMethod('findOrCreateDirectChat'),
  readTeamChatById: remoteStorageMethod('readTeamChatById'),
  readTeamChatMessages: remoteStorageMethod('readTeamChatMessages'),
  saveTeamChatMessage: remoteStorageMethod('saveTeamChatMessage'),
  updateTeamChatMessage: remoteStorageMethod('updateTeamChatMessage'),
  readUsers: remoteStorageMethod('readUsers'),
  findUserByEmail: remoteStorageMethod('findUserByEmail'),
  findUserById: remoteStorageMethod('findUserById'),
  findUserByDiscordId: remoteStorageMethod('findUserByDiscordId'),
  saveUser: remoteStorageMethod('saveUser'),
  readTeams: remoteStorageMethod('readTeams'),
  saveTeam: remoteStorageMethod('saveTeam'),
  deleteTeam: remoteStorageMethod('deleteTeam'),
  readBracket: remoteStorageMethod('readBracket'),
  readTrainingSubmissions: remoteStorageMethod('readTrainingSubmissions'),
  updateTrainingSubmissionStatus: remoteStorageMethod('updateTrainingSubmissionStatus'),
  writeBracket: remoteStorageMethod('writeBracket')
};