const fs = require('node:fs');
const path = require('node:path');

const notificationsFile = path.join(__dirname, 'routes', 'notifications.routes.js');
const teamsFile = path.join(__dirname, 'routes', 'publicTeam.routes.js');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function write(file, content) {
  if (read(file) !== content) fs.writeFileSync(file, content, 'utf8');
}

let notifications = read(notificationsFile);
let teams = read(teamsFile);

const oldRequireSession = `function requireSession(req, res, next) {
  if (!req.session?.userId) return res.status(401).json({ success: false, message: 'Faça login para continuar.' });
  return next();
}`;
const newRequireSession = `async function requireSession(req, res, next) {
  try {
    const user = await getSessionUser(req);
    if (!user) return res.status(401).json({ success: false, message: 'Faça login para continuar.' });
    req.notificationUser = user;
    return next();
  } catch (error) {
    return res.status(503).json({ success: false, message: 'Sua sessão está ativa, mas os Correios ainda estão sincronizando.', detail: error.message });
  }
}`;
if (notifications.includes(oldRequireSession)) notifications = notifications.replace(oldRequireSession, newRequireSession);

notifications = notifications.replace(
  "const siteUrl = String(process.env.SITE_PUBLIC_URL || process.env.PUBLIC_SITE_URL || 'https://void-arena-site.onrender.com').replace(/\\/$/, '');",
  "const siteUrl = String(process.env.SITE_PUBLIC_URL || process.env.PUBLIC_SITE_URL || 'https://hollow-nexus-league.onrender.com').replace(/\\/$/, '');"
);

const oldTarget = `  const users = await storage.readUsers().catch(() => []);
  const target = users.find((user) => String(user.id || '') === String(playerId || '') || String(user.discordId || '') === String(playerId || '')) || null;
  if (!target) return null;`;
const newTarget = `  const users = await storage.readUsers().catch(() => []);
  const rawPlayerId = String(playerId || '').trim().replace(/^<@!?/, '').replace(/>$/, '');
  const rawPlayerName = String(playerName || '').trim().toLowerCase();
  const target = users.find((user) => {
    const identities = [
      user.id,
      user.discordId,
      user.discordTag,
      user.name,
      user.profile?.username
    ].map((value) => String(value || '').trim());
    if (rawPlayerId && identities.some((value) => value === rawPlayerId)) return true;
    if (rawPlayerName && identities.some((value) => value.toLowerCase() === rawPlayerName)) return true;
    return false;
  }) || null;
  if (!target) throw new Error(\`Jogador não encontrado para o convite: \${playerName || playerId || 'destinatário vazio'}. Peça para ele entrar no site uma vez e tente novamente.\`);`;
if (notifications.includes(oldTarget)) notifications = notifications.replace(oldTarget, newTarget);

notifications = notifications.replace(
  '      const user = await getSessionUser(req);\n      const [directMessages, announcements] = await Promise.all([',
  '      const user = req.notificationUser || await getSessionUser(req);\n      const [directMessages, announcements] = await Promise.all(['
);
notifications = notifications.replace(
  '      const user = await getSessionUser(req);\n      const action = String(req.body?.action || \'\').trim().toLowerCase();',
  '      const user = req.notificationUser || await getSessionUser(req);\n      const action = String(req.body?.action || \'\').trim().toLowerCase();'
);

const oldSendInvites = `async function sendTeamInvites({ viewer, team, inviteRequests = [] }) {
  const sent = [];
  for (const invite of inviteRequests) {
    const notification = await createRecruitmentNotification({
      viewer,
      team,
      playerId: invite.playerId,
      playerName: invite.playerName,
      request: null,
      rosterSlot: invite.rosterSlot,
      note: invite.note || \`Convite para entrar como \${invite.rosterSlot === 'reserve' ? 'reserva' : 'titular'} em \${team.name || 'time'}.\`
    }).catch((error) => ({ success: false, message: error.message, playerId: invite.playerId }));
    sent.push({ playerId: invite.playerId, playerName: invite.playerName, rosterSlot: invite.rosterSlot, notification });
  }
  return sent;
}`;
const newSendInvites = `async function sendTeamInvites({ viewer, team, inviteRequests = [] }) {
  const sent = [];
  for (const invite of inviteRequests) {
    const notification = await createRecruitmentNotification({
      viewer,
      team,
      playerId: invite.playerId,
      playerName: invite.playerName,
      request: null,
      rosterSlot: invite.rosterSlot,
      note: invite.note || \`Convite para entrar como \${invite.rosterSlot === 'reserve' ? 'reserva' : 'titular'} em \${team.name || 'time'}.\`
    });
    if (!notification?.id) throw new Error(\`O convite para \${invite.playerName || invite.playerId || 'o jogador'} não foi salvo nos Correios.\`);
    sent.push({ playerId: invite.playerId, playerName: invite.playerName, rosterSlot: invite.rosterSlot, notification, delivered: true });
  }
  return sent;
}`;
if (teams.includes(oldSendInvites)) teams = teams.replace(oldSendInvites, newSendInvites);

const oldRequireLogin = `function requireLogin(req, res, next) {
  if (!req.session?.userId) return res.status(401).json({ success: false, message: 'Faca login para continuar.' });
  return next();
}`;
const newRequireLogin = `async function requireLogin(req, res, next) {
  try {
    const user = await getSessionUser(req);
    if (!user) return res.status(401).json({ success: false, message: 'Faca login para continuar.' });
    req.teamViewer = user;
    return next();
  } catch (error) {
    return res.status(503).json({ success: false, message: 'Sua sessão está ativa, mas os dados do time ainda estão sincronizando.', detail: error.message });
  }
}`;
if (teams.includes(oldRequireLogin)) teams = teams.replace(oldRequireLogin, newRequireLogin);

for (const marker of [
  'req.notificationUser = user;',
  'Jogador não encontrado para o convite',
  'https://hollow-nexus-league.onrender.com',
  'não foi salvo nos Correios',
  'req.teamViewer = user;'
]) {
  if (!notifications.includes(marker) && !teams.includes(marker)) {
    throw new Error(`Correção de convites incompleta: ${marker}`);
  }
}

write(notificationsFile, notifications);
write(teamsFile, teams);
new Function(read(notificationsFile));
new Function(read(teamsFile));
console.log('[Convites/Correios] Identidade canônica, destinatário robusto, erro explícito e entrega confirmada aplicados.');