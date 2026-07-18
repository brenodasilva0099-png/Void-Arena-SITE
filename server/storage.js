const BOT_API_URL = String(process.env.BOT_API_URL || process.env.BOT_PUBLIC_URL || 'http://localhost:3002').replace(/\/$/, '');
const BOT_API_KEY = process.env.BOT_API_KEY || process.env.INTERNAL_API_TOKEN || '';
const STORAGE_TIMEOUT_MS = Number(process.env.SITE_BOT_STORAGE_TIMEOUT_MS || process.env.SITE_BOT_FETCH_TIMEOUT_MS || 20000) || 20000;
const STORAGE_RETRIES = Math.max(1, Number(process.env.SITE_BOT_STORAGE_RETRIES || 7) || 7);

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

async function wakeBotStorage() {
  if (!BOT_API_URL) return false;
  try {
    const response = await fetch(`${BOT_API_URL}/public/maintenance?t=${Date.now()}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      timeoutMs: Math.min(STORAGE_TIMEOUT_MS, 15000)
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

  let lastError = null;
  wakeBotStorage().catch(() => false);

  for (let attempt = 1; attempt <= STORAGE_RETRIES; attempt += 1) {
    try {
      const response = await fetch(`${BOT_API_URL}/internal/storage/${method}`, {
        method: 'POST',
        timeoutMs: STORAGE_TIMEOUT_MS,
        headers: internalHeaders(),
        body: JSON.stringify({ args })
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok && data.success !== false) return data.result;

      const error = new Error(data.message || `Falha no storage remoto do bot (${response.status}).`);
      error.status = response.status;
      if (!isTransientStatus(response.status)) throw error;
      lastError = error;
    } catch (error) {
      lastError = error;
      const status = Number(error?.status || 0);
      if (status && !isTransientStatus(status)) throw error;
    }

    if (attempt < STORAGE_RETRIES) {
      wakeBotStorage().catch(() => false);
      const delay = Math.min(8000, 1200 * attempt + 500 * Math.max(0, attempt - 2));
      await wait(delay);
    }
  }

  const suffix = lastError?.message ? ` ${lastError.message}` : '';
  throw new Error(`BOT storage indisponível após ${STORAGE_RETRIES} tentativas.${suffix}`);
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
