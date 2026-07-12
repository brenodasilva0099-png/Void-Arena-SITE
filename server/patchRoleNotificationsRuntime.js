const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, 'app.js');
if (!fs.existsSync(file)) process.exit(0);
let src = fs.readFileSync(file, 'utf8');
let changed = false;

if (!src.includes("ROLE_NOTIFY_HISTORY_CHANNEL")) {
  const route = `
  const ROLE_NOTIFY_HISTORY_CHANNEL = 'role-notification-history';
  const ROLE_NOTIFY_SITE_CHANNEL = 'user-notifications';

  function rnText(value = '', max = 1200) { return String(value || '').trim().slice(0, max); }
  function rnJson(value, fallback = {}) { try { return JSON.parse(value || '{}'); } catch { return fallback; } }
  function rnName(user = {}) { return user?.profile?.username || user?.profile?.displayName || user?.name || user?.discordId || 'Void Arena'; }
  function rnPublicUser(user = {}) { return { id: user.id || '', name: rnName(user), discordId: user.discordId || '', avatar: user.avatar || '' }; }
  function rnIds(values = []) { return Array.from(new Set((Array.isArray(values) ? values : [values]).map((v) => String(v || '').trim()).filter((v) => /^\d{16,22}$/.test(v)))).slice(0, 20); }
  function rnParse(message = {}) { const data = rnJson(message.content || '{}', {}); return { id: message.id || data.id || '', createdAt: data.createdAt || message.createdAt || null, ...data }; }

  async function rnReadHistory(limit = 80) {
    const rows = await readChatMessages({ channelId: ROLE_NOTIFY_HISTORY_CHANNEL, limit }).catch(() => []);
    return rows.map(rnParse).filter((item) => item.type === 'role_notification_batch').sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }

  function rnBuildDm({ title, message, sender, siteUrl }) {
    return ['🔔 **' + title + '**', '', message, '', sender ? 'Enviado por: **' + sender + '**' : '', siteUrl ? 'Void Arena: ' + siteUrl : '', 'Hollow Nexus • Void Arena'].filter(Boolean).join('\n');
  }

  app.get('/api/admin/role-notifications/history', requireOwner, async (_req, res) => {
    try { return res.json({ success: true, campaigns: await rnReadHistory(100) }); }
    catch (error) { return res.status(500).json({ success: false, message: error.message, campaigns: [] }); }
  });

  app.get('/api/admin/role-notifications/dm-history/:discordId', requireOwner, async (req, res) => {
    try {
      const discordId = String(req.params.discordId || '').trim();
      if (!/^\d{16,22}$/.test(discordId)) return res.status(400).json({ success: false, message: 'Discord ID inválido.', messages: [] });
      const data = await callBotInternalApi('/internal/discord/dm-history/' + encodeURIComponent(discordId) + '?limit=150', { method: 'GET' });
      const replies = (data.messages || []).filter((m) => String(m.direction || '').toLowerCase() === 'inbound');
      return res.json({ success: true, discordId, messages: data.messages || [], replies: replies.length, hasReply: replies.length > 0 });
    } catch (error) { return res.status(500).json({ success: false, message: error.message, messages: [] }); }
  });

  app.post('/api/admin/role-notifications', requireOwner, async (req, res) => {
    try {
      const sender = await findUserById(req.session.userId);
      const roleIds = rnIds(req.body?.roleIds || []);
      const title = rnText(req.body?.title || 'Aviso da Void Arena', 120) || 'Aviso da Void Arena';
      const message = rnText(req.body?.message || '', 1200);
      const mode = ['both', 'site', 'discord'].includes(String(req.body?.deliveryMode || '').toLowerCase()) ? String(req.body.deliveryMode).toLowerCase() : 'both';
      if (!roleIds.length) return res.status(400).json({ success: false, message: 'Selecione pelo menos um cargo.' });
      if (!message) return res.status(400).json({ success: false, message: 'Digite a mensagem.' });

      const users = (await readUsers().catch(() => [])).filter((user) => /^\d{16,22}$/.test(String(user.discordId || '')));
      const ids = users.map((user) => String(user.discordId));
      const rolesData = await callBotInternalApi('/internal/discord/member-roles/batch', { method: 'POST', body: JSON.stringify({ discordIds: ids }) });
      const allRoles = await callBotInternalApi('/internal/discord/roles', { method: 'GET' }).catch(() => ({ roles: [] }));
      const roleMap = new Map((allRoles.roles || []).map((role) => [String(role.id), role]));
      const selectedRoles = roleIds.map((id) => roleMap.get(id) || { id, name: id });
      const selected = new Set(roleIds);
      const targets = users.filter((user) => (rolesData.rolesByDiscordId?.[user.discordId] || []).some((role) => selected.has(String(role.id)))).slice(0, 80);
      if (!targets.length) return res.status(400).json({ success: false, message: 'Nenhum usuário cadastrado no site possui os cargos selecionados.' });

      const createdAt = new Date().toISOString();
      const batchId = crypto.randomUUID();
      const senderPublic = rnPublicUser(sender || {});
      const siteEnabled = mode === 'both' || mode === 'site';
      const dmEnabled = mode === 'both' || mode === 'discord';
      const siteUrl = String(process.env.SITE_PUBLIC_URL || process.env.PUBLIC_SITE_URL || 'https://void-arena-site.onrender.com').replace(/\/$/, '');
      const results = [];

      for (const user of targets) {
        const roles = rolesData.rolesByDiscordId?.[user.discordId] || [];
        const result = { userId: user.id || '', discordId: user.discordId || '', name: rnName(user), avatar: user.avatar || '', roles, siteDelivered: false, dmDelivered: false, siteMessageId: '', dmError: '' };
        if (siteEnabled) {
          const saved = await saveChatMessage({ channelId: ROLE_NOTIFY_SITE_CHANNEL, source: 'system', authorId: sender?.id || '', authorName: rnName(sender || {}), content: JSON.stringify({ type: 'role_notification', title, message, note: message, status: 'unread', batchId, targetUserId: user.id || '', targetDiscordId: user.discordId || '', discordId: user.discordId || '', roleIds, roles: selectedRoles, deliveryMode: mode, sender: senderPublic, createdAt }), attachments: [], createdAt });
          result.siteDelivered = true; result.siteMessageId = saved?.id || '';
        }
        if (dmEnabled) {
          try {
            const dm = await callBotInternalApi('/internal/discord/message-player', { method: 'POST', body: JSON.stringify({ discordId: user.discordId, content: rnBuildDm({ title, message, sender: rnName(sender || {}), siteUrl }), authorId: sender?.id || 'void-arena-site', authorName: rnName(sender || {}), meta: { type: 'role_notification', batchId, roleIds, title } }) });
            result.dmDelivered = Boolean(dm.deliveredToDiscord);
            result.discordMessageId = dm.discordMessageId || '';
            result.discordChannelId = dm.discordChannelId || '';
          } catch (error) { result.dmError = error.message; }
        }
        results.push(result);
      }

      const campaign = { type: 'role_notification_batch', batchId, title, message, deliveryMode: mode, roleIds, roles: selectedRoles, sender: senderPublic, targets: results, counts: { targets: results.length, siteDelivered: results.filter((r) => r.siteDelivered).length, dmDelivered: results.filter((r) => r.dmDelivered).length, dmFailed: results.filter((r) => dmEnabled && !r.dmDelivered).length }, createdAt };
      const saved = await saveChatMessage({ channelId: ROLE_NOTIFY_HISTORY_CHANNEL, source: 'system', authorId: sender?.id || '', authorName: rnName(sender || {}), content: JSON.stringify(campaign), attachments: [], createdAt });
      return res.json({ success: true, campaign: { ...campaign, id: saved?.id || '' } });
    } catch (error) { return res.status(500).json({ success: false, message: error.message }); }
  });

`;
  src = src.replace("  app.get('/api/database/status', requireAuth, async (_req, res) => {", route + "  app.get('/api/database/status', requireAuth, async (_req, res) => {");
  changed = true;
}

if (changed) fs.writeFileSync(file, src, 'utf8');
console.log(changed ? 'Patch aplicado: notificações por cargo nas configurações.' : 'Patch ignorado: notificações por cargo já ativas.');