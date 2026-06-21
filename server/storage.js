const BOT_API_URL = String(process.env.BOT_API_URL || 'http://localhost:3002').replace(/\/$/, '');
const BOT_API_KEY = process.env.BOT_API_KEY || process.env.INTERNAL_API_TOKEN || '';

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

async function callBotStorage(method, args = []) {
  if (!BOT_API_URL) {
    throw new Error('BOT_API_URL não configurado. O SITE separado precisa chamar a API interna do BOT.');
  }

  const response = await fetch(`${BOT_API_URL}/internal/storage/${method}`, {
    method: 'POST',
    headers: internalHeaders(),
    body: JSON.stringify({ args })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    throw new Error(data.message || `Falha no storage remoto do bot (${response.status}).`);
  }

  return data.result;
}

function remoteStorageMethod(method) {
  return (...args) => callBotStorage(method, args);
}

module.exports = {
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
