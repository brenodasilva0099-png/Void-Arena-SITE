const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, 'app.js');
if (!fs.existsSync(file)) process.exit(0);
let src = fs.readFileSync(file, 'utf8');
let changed = false;

if (!src.includes("const memberRolesCache = new Map();")) {
  const helper = `
  const memberRolesCache = new Map();
  const MEMBER_ROLES_CACHE_MS = Math.max(30000, Number(process.env.MEMBER_ROLES_CACHE_MS || 1000 * 60 * 5) || 1000 * 60 * 5);

  function normalizeDiscordIds(values = []) {
    return Array.from(new Set((Array.isArray(values) ? values : [])
      .map((value) => String(value || '').trim())
      .filter((value) => /^\\d{16,22}$/.test(value))))
      .slice(0, 120);
  }

  function cachedMemberRoles(id) {
    const item = memberRolesCache.get(id);
    if (!item || Date.now() - item.cachedAt > MEMBER_ROLES_CACHE_MS) return null;
    return item.roles || [];
  }

  function saveMemberRolesCache(map = {}) {
    Object.entries(map || {}).forEach(([id, roles]) => {
      memberRolesCache.set(String(id), { cachedAt: Date.now(), roles: Array.isArray(roles) ? roles : [] });
    });
  }
`;
  src = src.replace("\n  app.get('/api/discord/channels', requireAuth, async (_req, res) => {", helper + "\n  app.get('/api/discord/channels', requireAuth, async (_req, res) => {");
  changed = true;
}

if (!src.includes("app.post('/api/discord/member-roles/batch'")) {
  const route = `
  app.post('/api/discord/member-roles/batch', requireAuth, async (req, res) => {
    try {
      const ids = normalizeDiscordIds(req.body?.discordIds || []);
      const rolesByDiscordId = {};
      const missing = [];

      ids.forEach((id) => {
        const cached = cachedMemberRoles(id);
        if (cached) rolesByDiscordId[id] = cached;
        else missing.push(id);
      });

      if (missing.length) {
        const data = await tryBotInternalApi('/internal/discord/member-roles/batch', {
          method: 'POST',
          body: JSON.stringify({ discordIds: missing })
        }, { success: true, rolesByDiscordId: {} });
        saveMemberRolesCache(data.rolesByDiscordId || {});
        Object.assign(rolesByDiscordId, data.rolesByDiscordId || {});
      }

      ids.forEach((id) => {
        if (!Array.isArray(rolesByDiscordId[id])) rolesByDiscordId[id] = [];
      });

      return res.json({ success: true, rolesByDiscordId, cached: missing.length < ids.length, requested: ids.length, fetched: missing.length });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Não foi possível carregar cargos dos jogadores: ' + error.message });
    }
  });
`;
  src = src.replace("\n  app.get('/api/discord/channels', requireAuth, async (_req, res) => {", route + "\n  app.get('/api/discord/channels', requireAuth, async (_req, res) => {");
  changed = true;
}

if (changed) fs.writeFileSync(file, src, 'utf8');
console.log(changed ? 'Patch aplicado: cargos dos jogadores com cache no site.' : 'Patch ignorado: cargos dos jogadores já disponíveis.');
