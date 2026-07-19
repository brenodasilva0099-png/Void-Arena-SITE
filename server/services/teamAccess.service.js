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

function canManageTeam(user = null, team = {}) {
  if (!user) return false;

  const leaderUserIds = [team.directorUserId, team.captainUserId].map(id).filter(Boolean);
  const leaderDiscordIds = [team.directorDiscordId, team.captainDiscordId].map(id).filter(Boolean);
  if (matches(user, leaderUserIds, leaderDiscordIds)) return true;
  if (leaderUserIds.length || leaderDiscordIds.length) return false;

  // Compatibilidade com clubes antigos: se nenhuma liderança foi registrada,
  // o criador assume provisoriamente a função de diretor.
  return matches(user, [team.ownerUserId], [team.ownerDiscordId]);
}

module.exports = { canManageTeam };
