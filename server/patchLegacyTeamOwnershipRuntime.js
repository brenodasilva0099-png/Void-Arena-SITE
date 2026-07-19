const fs = require('node:fs');
const path = require('node:path');

const files = [
  path.join(__dirname, 'routes', 'publicTeam.routes.js'),
  path.join(__dirname, 'routes', 'leagueExperience.routes.js')
];
const uiFile = path.join(__dirname, '..', 'public', 'js', 'core', 'league-experience.js');
let changed = false;

const publicTeamOld = `function canManageTeam(user = null, team = {}) {
  if (!user) return false;
  if (isOwnerRecord(user)) return true;
  if (String(team.ownerUserId || '') === String(user.id || '')) return true;
  if (String(team.directorUserId || '') && String(team.directorUserId) === String(user.id || '')) return true;
  if (String(team.directorDiscordId || '') && String(team.directorDiscordId) === String(user.discordId || '')) return true;
  if (String(team.captainUserId || '') && String(team.captainUserId) === String(user.id || '')) return true;
  if (String(team.captainDiscordId || '') && String(team.captainDiscordId) === String(user.discordId || '')) return true;
  return false;
}`;

const leagueOld = `function canManageTeam(user = null, team = {}) {
  if (!user) return false;
  if (isOwnerRecord(user)) return true;
  const userId = String(user.id || '');
  const discordId = String(user.discordId || '');
  return [team.ownerUserId, team.directorUserId, team.captainUserId].some((value) => value && String(value) === userId)
    || [team.ownerDiscordId, team.directorDiscordId, team.captainDiscordId].some((value) => value && String(value) === discordId);
}`;

const enhanced = `function canManageTeam(user = null, team = {}) {
  if (!user) return false;
  if (isOwnerRecord(user)) return true;

  const userId = String(user.id || '').trim();
  const discordId = String(user.discordId || '').trim();
  const storedUserIds = [team.ownerUserId, team.directorUserId, team.captainUserId].map((value) => String(value || '').trim()).filter(Boolean);
  const storedDiscordIds = [team.ownerDiscordId, team.directorDiscordId, team.captainDiscordId].map((value) => String(value || '').trim()).filter(Boolean);

  if (userId && storedUserIds.includes(userId)) return true;
  if (discordId && storedDiscordIds.includes(discordId)) return true;

  // Recuperação exclusiva para clubes legados que não possuem nenhum ID salvo.
  if (storedUserIds.length || storedDiscordIds.length) return false;
  const normalize = (value = '') => String(value || '').trim().toLocaleLowerCase('pt-BR');
  const userNames = new Set([
    user.name,
    user.discordTag,
    user.profile?.username,
    user.profile?.displayName
  ].map(normalize).filter(Boolean));
  return [team.ownerName, team.directorName, team.captainName]
    .map(normalize)
    .filter(Boolean)
    .some((name) => userNames.has(name));
}`;

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let source = fs.readFileSync(file, 'utf8');
  const before = source;
  source = source.replace(publicTeamOld, enhanced).replace(leagueOld, enhanced);
  if (source !== before) {
    fs.writeFileSync(file, source, 'utf8');
    changed = true;
  }
}

if (fs.existsSync(uiFile)) {
  let source = fs.readFileSync(uiFile, 'utf8');
  const before = source;
  if (!source.includes('function publicPersonLink(')) {
    source = source.replace(
      '  function rosterHtml(players = []) {',
      `  function publicPersonLink(name, userId, discordId) {
    const id = String(userId || discordId || '').trim();
    const label = esc(name || 'Não definido');
    return id ? \`<a href="/pages/perfil-jogador.html?id=\${encodeURIComponent(id)}">\${label}</a>\` : label;
  }

  function rosterHtml(players = []) {`
    );
  }
  source = source.replace(
    `<p><strong>Dono/diretor:</strong> \${esc(club.directorName || club.ownerName || 'Não definido')}</p><p><strong>Capitão:</strong> \${esc(club.captainName || 'Não definido')}</p>`,
    `<p><strong>Dono/diretor:</strong> \${publicPersonLink(club.directorName || club.ownerName, club.directorUserId || club.ownerUserId, club.directorDiscordId || club.ownerDiscordId)}</p><p><strong>Capitão:</strong> \${publicPersonLink(club.captainName, club.captainUserId, club.captainDiscordId)}</p>`
  );
  if (source !== before) {
    fs.writeFileSync(uiFile, source, 'utf8');
    changed = true;
  }
}

console.log(changed
  ? '[League/Ownership] Gestão de clubes legados e links públicos recuperados.'
  : '[League/Ownership] Gestão de clubes legados já estava recuperada.');
