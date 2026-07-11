const storage = require('../storage');
const { getSessionUser, isOwnerRecord, isAdminRecord } = require('../services/access.service');
const { resolveTeamLogo } = require('../services/bracket.service');
const { removeRoutes } = require('../utils/expressRoutes');

function requireSession(req, res, next) {
  if (!req.session?.userId) return res.status(401).json({ success: false, message: 'Faça login para continuar.' });
  return next();
}

function clean(value = '', max = 160) { return String(value || '').trim().slice(0, max); }
function userName(user = {}) { return user?.profile?.username || user?.name || user?.discordId || 'Jogador'; }
function extractDiscordId(value = '') {
  const raw = String(value || '').trim();
  const mention = raw.match(/^<@!?(\d{16,22})>$/);
  if (mention) return mention[1];
  if (/^\d{16,22}$/.test(raw)) return raw;
  return '';
}
function keyOf(value = '') { return String(value || '').trim().toLowerCase(); }
function canonicalPlayerKey(player = {}) { return keyOf(player.userId || player.discordId || player.id || player.name); }
function isVisibleUser(user = {}) { return !user.deletedAt && !user.hiddenFromPlayersDirectory; }
function publicUser(user = {}) { return { id: user.id || '', name: userName(user), discordId: user.discordId || '', avatar: user.avatar || '', profile: user.profile || {}, socials: user.socials || {} }; }
function publicTeam(team = {}) { return { id: team.id || '', name: team.name || 'Time', tag: team.tag || '', logo: resolveTeamLogo(team), ownerUserId: team.ownerUserId || '', directorName: team.directorName || team.ownerName || '', captainName: team.captainName || team.ownerName || '', captainDiscordId: team.captainDiscordId || '' }; }
function canManageTeam(user = null, team = {}) {
  if (!user) return false;
  if (isOwnerRecord(user)) return true;
  if (String(team.ownerUserId || '') === String(user.id || '')) return true;
  if (String(team.directorUserId || '') && String(team.directorUserId) === String(user.id || '')) return true;
  if (String(team.directorDiscordId || '') && String(team.directorDiscordId) === String(user.discordId || '')) return true;
  if (String(team.captainUserId || '') && String(team.captainUserId) === String(user.id || '')) return true;
  if (String(team.captainDiscordId || '') && String(team.captainDiscordId) === String(user.discordId || '')) return true;
  return false;
}
async function safeSessionUser(req) { try { return await getSessionUser(req); } catch { return null; } }
async function viewerIsAdmin(viewer = null) { if (!viewer) return false; try { return await isAdminRecord(viewer); } catch { return isOwnerRecord(viewer); } }

function addPlayer(map, raw = {}) {
  const key = canonicalPlayerKey(raw);
  if (!key) return;
  const current = map.get(key) || {};
  const teams = [...(current.teams || []), ...(raw.teams || [])].filter(Boolean);
  map.set(key, {
    ...current,
    ...raw,
    teams,
    // Se um perfil real já existe, nunca deixa uma entrada fantasma apagar identidade real.
    id: current.userId ? current.id : (raw.id || current.id || ''),
    userId: current.userId || raw.userId || '',
    discordId: current.discordId || raw.discordId || ''
  });
}

function buildUserIndexes(users = []) {
  const visibleUsers = (Array.isArray(users) ? users : []).filter(isVisibleUser);
  const byId = new Map();
  const byDiscord = new Map();
  const byName = new Map();

  visibleUsers.forEach((user) => {
    if (user.id) byId.set(String(user.id), user);
    if (user.discordId) byDiscord.set(String(user.discordId), user);
    [user.name, user.profile?.username].map(keyOf).filter(Boolean).forEach((name) => {
      if (!byName.has(name)) byName.set(name, user);
    });
  });

  return { visibleUsers, byId, byDiscord, byName };
}

function buildDirectory(users = [], teams = []) {
  const { visibleUsers, byId, byDiscord, byName } = buildUserIndexes(users);
  const map = new Map();

  // Primeiro entram os perfis reais logados pelo site/Discord. Depois o elenco só adiciona vínculo.
  visibleUsers.forEach((user) => addPlayer(map, {
    id: user.id || user.discordId || userName(user),
    userId: user.id || '',
    discordId: user.discordId || '',
    name: userName(user),
    avatar: user.avatar || '',
    profile: user.profile || {},
    socials: user.socials || {},
    rosterRole: 'Livre',
    status: 'free',
    statusLabel: 'Sem clube',
    teams: []
  }));

  (Array.isArray(teams) ? teams : []).forEach((team) => {
    const teamCard = publicTeam(team);
    const roster = [];
    (Array.isArray(team.playerDetails) ? team.playerDetails : []).forEach((item) => roster.push({ ...item, rosterRole: 'Titular' }));
    (Array.isArray(team.reserveDetails) ? team.reserveDetails : []).forEach((item) => roster.push({ ...item, rosterRole: 'Reserva' }));
    if (!roster.length) {
      (Array.isArray(team.players) ? team.players : []).forEach((name, index) => roster.push({ name, discordId: team.playerAccounts?.players?.[index] || '', rosterRole: 'Titular' }));
      (Array.isArray(team.reserves) ? team.reserves : []).forEach((name, index) => roster.push({ name, discordId: team.playerAccounts?.reserves?.[index] || '', rosterRole: 'Reserva' }));
    }

    roster.forEach((entry) => {
      const rawName = clean(entry.name || entry.playerName || '', 80);
      const discordId = extractDiscordId(entry.discordId || entry.account || '');
      const user = byId.get(String(entry.id || entry.userId || '')) || byDiscord.get(discordId) || byName.get(keyOf(rawName)) || null;
      addPlayer(map, {
        id: user?.id || entry.id || discordId || `roster_${team.id}_${rawName || Math.random().toString(16).slice(2)}`,
        userId: user?.id || '',
        discordId: user?.discordId || discordId || '',
        name: user ? userName(user) : (rawName || 'Jogador'),
        avatar: user?.avatar || entry.avatar || '',
        profile: user?.profile || entry.profile || {},
        socials: user?.socials || entry.socials || {},
        rosterRole: entry.rosterRole || 'Titular',
        status: 'club',
        statusLabel: 'Com clube',
        teams: [teamCard]
      });
    });

    [team.ownerUserId, team.directorUserId, team.captainUserId].filter(Boolean).forEach((id) => {
      const user = byId.get(String(id));
      if (user) addPlayer(map, { id: user.id, userId: user.id, discordId: user.discordId || '', name: userName(user), avatar: user.avatar || '', profile: user.profile || {}, socials: user.socials || {}, rosterRole: String(id) === String(team.captainUserId) ? 'Capitão' : 'Diretoria', status: 'club', statusLabel: 'Com clube', teams: [teamCard] });
    });
  });

  return Array.from(map.values()).map((player) => {
    const seen = new Set();
    const teamsUnique = (player.teams || []).filter((team) => team?.id && !seen.has(team.id) && seen.add(team.id));
    const profile = player.profile || {};
    return { ...player, directoryId: String(player.userId || player.discordId || player.id || player.name || '').trim(), teams: teamsUnique, teamName: teamsUnique[0]?.name || '', teamTag: teamsUnique[0]?.tag || '', teamLogo: teamsUnique[0]?.logo || '', primaryPosition: profile.primaryPosition || '', secondaryPosition: profile.secondaryPosition || '', country: profile.country || '', region: profile.region || profile.competitiveRegion || '', status: teamsUnique.length ? 'club' : 'free', statusLabel: teamsUnique.length ? 'Com clube' : 'Sem clube', roles: [] };
  }).sort((a, b) => (a.status === b.status ? 0 : a.status === 'free' ? -1 : 1) || String(a.name || '').localeCompare(String(b.name || '')));
}

function identitiesForPlayer(player = {}) {
  return new Set([player.id, player.userId, player.discordId, player.directoryId, player.name].map(keyOf).filter(Boolean));
}
function exactUserIdentityForPlayer(player = {}) {
  return new Set([player.userId, player.discordId].map(keyOf).filter(Boolean));
}
function samePerson(a = {}, b = {}) {
  const ids = identitiesForPlayer(a);
  return [b.id, b.discordId, b.name].map(keyOf).filter(Boolean).some((value) => ids.has(value));
}
function entryMatches(entry = {}, identities = new Set()) {
  const values = [entry.name, entry.id, entry.userId, entry.discordId, entry.account, extractDiscordId(entry.discordId || entry.account || '')].map(keyOf).filter(Boolean);
  return values.some((value) => identities.has(value));
}
function cleanRosterArrays(names = [], accounts = [], details = [], identities = new Set()) {
  const safeNames = Array.isArray(names) ? names : [];
  const safeAccounts = Array.isArray(accounts) ? accounts : [];
  const safeDetails = Array.isArray(details) ? details : [];
  const nextNames = [];
  const nextAccounts = [];
  const nextDetails = [];
  let removed = 0;

  const max = Math.max(safeNames.length, safeDetails.length);
  for (let i = 0; i < max; i += 1) {
    const detail = safeDetails[i] || {};
    const name = safeNames[i] || detail.name || '';
    const account = safeAccounts[i] || detail.discordId || detail.account || '';
    if (entryMatches({ ...detail, name, account }, identities)) {
      removed += 1;
      continue;
    }
    if (name) nextNames.push(name);
    if (account || i < safeAccounts.length) nextAccounts.push(account || '');
    if (Object.keys(detail).length) nextDetails.push(detail);
  }

  return { names: nextNames, accounts: nextAccounts, details: nextDetails, removed };
}
function removePlayerFromTeam(team = {}, player = {}) {
  const ids = identitiesForPlayer(player);
  if (!ids.size) return { changed: false, removed: 0, team };
  const players = cleanRosterArrays(team.players, team.playerAccounts?.players, team.playerDetails, ids);
  const reserves = cleanRosterArrays(team.reserves, team.playerAccounts?.reserves, team.reserveDetails, ids);
  const removed = players.removed + reserves.removed;
  if (!removed) return { changed: false, removed: 0, team };
  const next = {
    ...team,
    players: players.names,
    reserves: reserves.names,
    playerAccounts: { ...(team.playerAccounts || {}), players: players.accounts, reserves: reserves.accounts },
    playerDetails: players.details,
    reserveDetails: reserves.details,
    updatedAt: new Date().toISOString()
  };
  return { changed: true, removed, team: next };
}

function registerPlayerDirectoryStableRoutes(app) {
  removeRoutes(app, [['get', '/api/players/directory'], ['delete', '/api/players/:playerId']]);

  app.get('/api/players/directory', requireSession, async (req, res) => {
    try {
      const [users, teams, viewer] = await Promise.all([storage.readUsers().catch(() => []), storage.readTeams().catch(() => []), safeSessionUser(req)]);
      const players = buildDirectory(users, teams);
      const isAdmin = await viewerIsAdmin(viewer);
      res.set('Cache-Control', 'no-store');
      return res.json({ success: true, players, teams: (teams || []).map(publicTeam), viewer: publicUser(viewer || {}), viewerTeams: (teams || []).filter((team) => canManageTeam(viewer, team)).map(publicTeam), isAdmin, diagnostics: { rawUsers: Array.isArray(users) ? users.length : 0, rawTeams: Array.isArray(teams) ? teams.length : 0, visiblePlayers: players.length } });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message, players: [], teams: [], viewerTeams: [] });
    }
  });

  app.delete('/api/players/:playerId', requireSession, async (req, res) => {
    try {
      const viewer = await safeSessionUser(req);
      if (!await viewerIsAdmin(viewer)) return res.status(403).json({ success: false, message: 'Apenas administrador pode excluir jogadores.' });

      const rawPlayerId = decodeURIComponent(String(req.params.playerId || '')).trim();
      if (!rawPlayerId) throw new Error('Jogador inválido.');

      const [users, teams] = await Promise.all([storage.readUsers().catch(() => []), storage.readTeams().catch(() => [])]);
      const directory = buildDirectory(users, teams);
      const target = directory.find((player) => [player.directoryId, player.userId, player.discordId, player.id, player.name].some((value) => keyOf(value) === keyOf(rawPlayerId)));
      if (!target) return res.status(404).json({ success: false, message: 'Jogador não encontrado.' });
      if (samePerson(target, viewer)) return res.status(400).json({ success: false, message: 'Você não pode excluir o próprio perfil por aqui.' });

      let hiddenUser = false;
      const exactIds = exactUserIdentityForPlayer(target);
      const user = users.find((item) => [item.id, item.discordId].map(keyOf).filter(Boolean).some((value) => exactIds.has(value)));
      if (user && isVisibleUser(user)) {
        await storage.saveUser({ ...user, hiddenFromPlayersDirectory: true, hiddenAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        hiddenUser = true;
      }

      let removedFromTeams = 0;
      for (const team of teams) {
        const result = removePlayerFromTeam(team, target);
        if (!result.changed) continue;
        removedFromTeams += result.removed;
        await storage.saveTeam(result.team);
      }

      const [nextUsers, nextTeams] = await Promise.all([storage.readUsers().catch(() => []), storage.readTeams().catch(() => [])]);
      const players = buildDirectory(nextUsers, nextTeams);
      return res.json({ success: true, playerId: rawPlayerId, hiddenUser, removedFromTeams, players, message: hiddenUser || removedFromTeams ? 'Jogador removido/ocultado do banco e dos elencos vinculados.' : 'Nenhum vínculo ativo encontrado para esse jogador.' });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });
}

module.exports = { registerPlayerDirectoryStableRoutes };
