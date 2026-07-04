const storage = require('../storage');
const { callBot } = require('../services/botApi.service');
const { getSessionUser, isOwnerRecord } = require('../services/access.service');
const { removeRoutes } = require('../utils/expressRoutes');

const PERMISSION_KEYS = ['events','teams','bracket','results','rankings','scoring','chat','teamChats','scrims','stats','matches','forms','backup','config','jogadores','recrutamento','placar'];

function requireSession(req, res, next) {
  if (!req.session?.userId) return res.status(401).json({ success: false, message: 'Faça login para continuar.' });
  return next();
}

function emptyPermissions() {
  return Object.fromEntries(PERMISSION_KEYS.map((key) => [key, false]));
}

function allPermissions() {
  return Object.fromEntries(PERMISSION_KEYS.map((key) => [key, true]));
}

function normalizeRoleIds(roles = []) {
  return Array.from(new Set((Array.isArray(roles) ? roles : [])
    .map((role) => typeof role === 'string' ? role : (role?.id || role?.roleId || ''))
    .map((id) => String(id || '').trim())
    .filter(Boolean)));
}

function applyPermissionConfig(target, config = {}) {
  PERMISSION_KEYS.forEach((key) => {
    if (config[key] === true) target[key] = true;
  });
  if (config.teams || config.rankings) target.jogadores = true;
  if (config.teams) target.recrutamento = true;
  if (config.rankings) target.placar = true;
}

async function permissionsForUser(user = {}) {
  if (isOwnerRecord(user)) return { isOwner: true, permissions: allPermissions(), roles: [], matchedRoleIds: [] };
  const permissions = emptyPermissions();
  const discordId = String(user?.discordId || '').trim();
  if (!discordId) return { isOwner: false, permissions, roles: [], matchedRoleIds: [], message: 'Sem Discord vinculado.' };
  const [permData, memberData] = await Promise.all([
    callBot('/internal/storage/readRolePermissions', { method: 'POST', body: JSON.stringify({ args: [] }) }).catch(() => ({ result: {} })),
    callBot(`/internal/discord/member-roles/${encodeURIComponent(discordId)}`, { method: 'GET' }).catch(() => ({ roles: [] }))
  ]);
  const rolePermissions = permData.result || {};
  const roles = Array.isArray(memberData.roles) ? memberData.roles : [];
  const matchedRoleIds = [];
  normalizeRoleIds(roles).forEach((roleId) => {
    const config = rolePermissions[String(roleId || '').trim()];
    if (!config) return;
    matchedRoleIds.push(roleId);
    applyPermissionConfig(permissions, config);
  });
  return { isOwner: false, permissions, roles, matchedRoleIds };
}

function registerPermissionAccessRoutes(app) {
  removeRoutes(app, [['get', '/api/me/permissions']]);
  app.get('/api/me/permissions', requireSession, async (req, res) => {
    try {
      const user = await getSessionUser(req);
      if (!user) return res.status(401).json({ success: false, message: 'Sessão inválida.' });
      const data = await permissionsForUser(user);
      return res.json({ success: true, ...data });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message, permissions: emptyPermissions(), roles: [] });
    }
  });
}

module.exports = { registerPermissionAccessRoutes, permissionsForUser, PERMISSION_KEYS };
