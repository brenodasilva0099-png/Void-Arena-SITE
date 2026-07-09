const { callBot } = require('../services/botApi.service');
const { getSessionUser, isOwnerRecord, adminRoleIds } = require('../services/access.service');

const PUBLIC_KEYS = new Set(['dashboard', 'inicio', 'perfil', 'terms', 'termos']);
const ADMIN_ONLY_KEYS = new Set([
  'chat',
  'scrims',
  'estatisticas',
  'stats',
  'analise',
  'analise-partidas',
  'analysis',
  'partidas',
  'matches',
  'formularios',
  'formulario',
  'forms',
  'permissoes',
  'config',
  'configuracoes',
  'backup',
  'backups'
]);
const STRICT_PERMISSION_KEYS = new Set(['forms', 'matches', 'stats', 'chat', 'scrims', 'config', 'backup']);
const PAGE_TO_PERMISSION = {
  dashboard: null,
  inicio: null,
  perfil: null,
  eventos: 'events',
  events: 'events',
  times: 'teams',
  teams: 'teams',
  chaveamento: 'bracket',
  bracket: 'bracket',
  grupos: 'bracket',
  'fase-de-grupos': 'bracket',
  groupstage: 'bracket',
  resultados: 'results',
  results: 'results',
  rankings: 'rankings',
  jogadores: 'players',
  players: 'players',
  recrutamento: 'recruitment',
  recruitment: 'recruitment',
  pontuacao: 'scoring',
  scoring: 'scoring',
  placar: 'placar',
  chat: 'chat',
  scrims: 'scrims',
  estatisticas: 'stats',
  stats: 'stats',
  analise: 'matches',
  'analise-partidas': 'matches',
  analysis: 'matches',
  partidas: 'matches',
  matches: 'matches',
  formularios: 'forms',
  formulario: 'forms',
  forms: 'forms',
  permissoes: 'config',
  config: 'config',
  configuracoes: 'config',
  backup: 'backup',
  backups: 'backup',
  termos: null,
  terms: null
};

const FALLBACK_KEYS = {
  players: ['rankings'],
  recruitment: ['teams'],
  placar: ['rankings']
};

function requireSession(req, res, next) {
  if (!req.session?.userId) return res.status(401).json({ success: false, message: 'Faça login para continuar.' });
  return next();
}

function cleanKey(value = '') {
  return String(value || '').trim().toLowerCase();
}

function normalizePermissions(raw = {}) {
  return raw && typeof raw === 'object' ? raw : {};
}

function configuredKeys(permissions = {}) {
  const keys = new Set();
  Object.values(permissions).forEach((byRole) => {
    if (!byRole || typeof byRole !== 'object') return;
    Object.entries(byRole).forEach(([key, enabled]) => { if (enabled === true) keys.add(key); });
  });
  return keys;
}

function roleIdsFromBot(payload = {}) {
  return (Array.isArray(payload.roles) ? payload.roles : []).map((role) => String(role.id || '').trim()).filter(Boolean);
}

function hasAdminRoleId(roleIds = []) {
  const allowed = new Set(adminRoleIds());
  return roleIds.some((id) => allowed.has(String(id || '').trim()));
}

async function readRolePermissions() {
  const data = await callBot('/internal/storage/readRolePermissions', {
    method: 'POST',
    body: JSON.stringify({ args: [] })
  }).catch(() => ({ result: {} }));
  return normalizePermissions(data.result || {});
}

async function readMemberRoles(discordId = '') {
  if (!discordId) return [];
  const data = await callBot(`/internal/discord/member-roles/${encodeURIComponent(discordId)}`, { method: 'GET' }).catch(() => ({ roles: [] }));
  return roleIdsFromBot(data);
}

function isAdminLike(user = {}, roleIds = []) {
  return isOwnerRecord(user) || hasAdminRoleId(roleIds);
}

function isPageAllowed({ pageKey, user, roleIds, permissions }) {
  const key = cleanKey(pageKey);
  const admin = isAdminLike(user, roleIds);
  if (admin) return { allowed: true, reason: 'admin' };
  if (PUBLIC_KEYS.has(key)) return { allowed: true, reason: 'public' };
  if (ADMIN_ONLY_KEYS.has(key)) return { allowed: false, reason: 'admin_only' };

  const permissionKey = PAGE_TO_PERMISSION[key];
  if (!permissionKey) return { allowed: true, reason: 'unmapped' };

  const allConfigured = configuredKeys(permissions);
  const keysToTry = [permissionKey, ...(FALLBACK_KEYS[permissionKey] || [])];
  const hasAnyConfigForPage = keysToTry.some((item) => allConfigured.has(item));
  if (!hasAnyConfigForPage) {
    if (STRICT_PERMISSION_KEYS.has(permissionKey)) return { allowed: false, reason: 'strict_not_configured', permissionKey, keysToTry };
    return { allowed: true, reason: 'public_view', permissionKey, keysToTry };
  }

  const ids = new Set(roleIds.map((id) => String(id || '').trim()).filter(Boolean));
  const allowed = Object.entries(permissions).some(([roleId, rolePermissions]) => (
    ids.has(String(roleId)) && keysToTry.some((item) => rolePermissions?.[item] === true)
  ));

  return { allowed, reason: allowed ? 'role_match' : 'missing_role', permissionKey, keysToTry };
}

function buildAccessMap(user, roleIds, permissions) {
  const map = {};
  Object.keys(PAGE_TO_PERMISSION).forEach((key) => {
    map[key] = isPageAllowed({ pageKey: key, user, roleIds, permissions }).allowed;
  });
  return map;
}

function registerAccessControlRoutes(app) {
  app.get('/api/access/me', requireSession, async (req, res) => {
    try {
      const user = await getSessionUser(req);
      if (!user) return res.status(401).json({ success: false, message: 'Sessão inválida.' });
      const [permissions, roleIds] = await Promise.all([
        readRolePermissions(),
        readMemberRoles(user.discordId || user.id)
      ]);
      const isAdmin = isAdminLike(user, roleIds);
      return res.json({
        success: true,
        userId: user.id || '',
        discordId: user.discordId || '',
        isOwner: isOwnerRecord(user),
        isAdmin,
        adminRoleIds: adminRoleIds(),
        roleIds,
        permissions,
        access: buildAccessMap(user, roleIds, permissions)
      });
    } catch (error) {
      return res.json({ success: true, degraded: true, message: error.message, access: {}, permissions: {}, roleIds: [] });
    }
  });

  app.get('/api/access/page/:pageKey', requireSession, async (req, res) => {
    try {
      const user = await getSessionUser(req);
      if (!user) return res.status(401).json({ success: false, message: 'Sessão inválida.' });
      const [permissions, roleIds] = await Promise.all([
        readRolePermissions(),
        readMemberRoles(user.discordId || user.id)
      ]);
      const decision = isPageAllowed({ pageKey: req.params.pageKey, user, roleIds, permissions });
      return res.status(decision.allowed ? 200 : 403).json({ success: decision.allowed, ...decision, roleIds, isAdmin: isAdminLike(user, roleIds) });
    } catch (error) {
      return res.json({ success: true, allowed: true, degraded: true, message: error.message });
    }
  });
}

module.exports = { registerAccessControlRoutes };
