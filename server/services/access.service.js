const storage = require('../storage');

const DEFAULT_OWNER_DISCORD_IDS = ['1235713276277559326'];
const DEFAULT_OWNER_EMAILS = ['abyss.projectdev@gmail.com', 'brenodasilva0099@gmail.com'];

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

function isOwnerRecord(user = {}) {
  if (!user) return false;
  const email = String(user.email || '').trim().toLowerCase();
  const discordId = String(user.discordId || '').trim();
  const userId = String(user.id || '').trim();
  return ownerEmails().includes(email) || ownerDiscordIds().includes(discordId) || ownerDiscordIds().includes(userId);
}

async function getSessionUser(req) {
  if (!req?.session?.userId) return null;
  return storage.findUserById(req.session.userId).catch(() => null);
}

async function isOwnerSession(req) {
  const user = await getSessionUser(req);
  return isOwnerRecord(user);
}

function requireOwner(req, res, next) {
  isOwnerSession(req)
    .then((ok) => ok ? next() : res.status(403).json({ success: false, message: 'Apenas o administrador pode usar essa função.' }))
    .catch((error) => res.status(500).json({ success: false, message: error.message }));
}

module.exports = {
  DEFAULT_OWNER_DISCORD_IDS,
  isOwnerRecord,
  isOwnerSession,
  requireOwner,
  getSessionUser
};
