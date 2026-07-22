function id(value = '') {
  return String(value || '').trim();
}

function matches(user = {}, userIds = [], discordIds = []) {
  const userId = id(user.id);
  const discordId = id(user.discordId);
  return Boolean(
    (userId && userIds.map(id).filter(Boolean).includes(userId))
    || (discordId && discordIds.map(id).filter(Boolean).includes(discordId))
  );
}

function isTeamCreator(user = null, team = {}) {
  if (!user) return false;
  return matches(user, [team.ownerUserId], [team.ownerDiscordId]);
}

function canManageTeam(user = null, team = {}) {
  if (!user) return false;

  // O criador original continua responsável pelo clube mesmo depois de
  // nomear diretor e capitão. Administradores são acrescentados nas rotas,
  // onde a permissão global pode ser validada de forma assíncrona.
  if (isTeamCreator(user, team)) return true;

  const leaderUserIds = [team.directorUserId, team.captainUserId].map(id).filter(Boolean);
  const leaderDiscordIds = [team.directorDiscordId, team.captainDiscordId].map(id).filter(Boolean);
  if (matches(user, leaderUserIds, leaderDiscordIds)) return true;
  return false;
}

function canDeleteTeam(user = null, team = {}) {
  return isTeamCreator(user, team);
}

module.exports = { isTeamCreator, canManageTeam, canDeleteTeam };
