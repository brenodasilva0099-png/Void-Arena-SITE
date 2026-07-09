const storage = require('../storage');
const { callBot } = require('./botApi.service');

const DEFAULT_OWNER_DISCORD_IDS = ['1235713276277559326'];
const DEFAULT_OWNER_EMAILS = ['abyss.projectdev@gmail.com', 'brenodasilva0099@gmail.com'];
const DEFAULT_ADMIN_ROLE_IDS = ['1297731552620576828'];

function splitList(...values) {
  return Array.from(new Set(values
    .flatMap((value) => Array.isArray(value) ? value : String(value || '').split(','))
    .map((item) => String(item || '').trim())
    .filter(Boolean)));
}

function ownerDiscordIds() {
  return splitList(process.env.OWNER_DISCORD_IDS, process.env.ADMIN_DISCORD_IDS, DEFAULT_OWNER_DISCORD_IDS);
}

function ownerEmails() {
  return splitList(process.env.OWNER_EMAILS, process.env.ADMIN_EMAILS, DEFAULT_OWNER_EMAILS)
    .map((item) => item.toLowerCase());
}

function adminRoleIds() {
  return splitList(
    process.env.ADMIN_ROLE_IDS,
    process.env.OWNER_ROLE_IDS,
    process.env.NEXUS_CORE_ROLE_ID,
    DEFAULT_ADMIN_ROLE_IDS
  );
}

function isOwnerRecord(user = {}) {
  if (!user) return false;
  const email = String(user.email || '').trim().toLowerCase();
  const discordId = String(user.discordId || '').trim();
  const userId = String(user.id || '').trim();
  return ownerEmails().includes(email) || ownerDiscordIds().includes(discordId) || ownerDiscordIds().includes(userId);
}

async function readMemberRoleIds(discordId = '') {
  const id = String(discordId || '').trim();
  if (!id) return [];
  const data = await callBot(`/internal/discord/member-roles/${encodeURIComponent(id)}`, { method: 'GET' }).catch(() => ({ roles: [] }));
  return (Array.isArray(data.roles) ? data.roles : [])
    .map((role) => String(role.id || role.roleId || '').trim())
    .filter(Boolean);
}

async function hasAdminRole(user = {}) {
  const discordId = String(user?.discordId || user?.id || '').trim();
  if (!discordId) return false;
  const allowed = new Set(adminRoleIds());
  const memberRoleIds = await readMemberRoleIds(discordId);
  return memberRoleIds.some((roleId) => allowed.has(String(roleId || '').trim()));
}

async function isAdminRecord(user = {}) {
  if (isOwnerRecord(user)) return true;
  return hasAdminRole(user);
}

async function reactivateUserIfNeeded(user = null) {
  if (!user) return null;
  if (!user.deletedAt && !user.hiddenFromPlayersDirectory) return user;
  const next = {
    ...user,
    deletedAt: null,
    hiddenFromPlayersDirectory: false,
    reactivatedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  return storage.saveUser(next).catch(() => user);
}

async function getSessionUser(req) {
  if (!req?.session?.userId) return null;
  const user = await storage.findUserById(req.session.userId).catch(() => null);
  return reactivateUserIfNeeded(user);
}

async function isOwnerSession(req) {
  const user = await getSessionUser(req);
  return isOwnerRecord(user);
}

async function isAdminSession(req) {
  const user = await getSessionUser(req);
  return isAdminRecord(user);
}

function requireOwner(req, res, next) {
  isAdminSession(req)
    .then((ok) => ok ? next() : res.status(403).json({ success: false, message: 'Apenas o administrador pode usar essa função.' }))
    .catch((error) => res.status(500).json({ success: false, message: error.message }));
}

function requireAdmin(req, res, next) {
  requireOwner(req, res, next);
}

module.exports = {
  DEFAULT_OWNER_DISCORD_IDS,
  DEFAULT_ADMIN_ROLE_IDS,
  isOwnerRecord,
  isAdminRecord,
  hasAdminRole,
  isOwnerSession,
  isAdminSession,
  requireOwner,
  requireAdmin,
  getSessionUser,
  readMemberRoleIds,
  adminRoleIds,
  reactivateUserIfNeeded
};
