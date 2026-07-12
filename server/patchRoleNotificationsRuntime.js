const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const appFile = path.join(__dirname, 'app.js');
const configHtmlFile = path.join(ROOT, 'public/pages/configuracoes.html');
const configJsFile = path.join(ROOT, 'public/js/pages/configuracoes.js');
let changed = false;

if (fs.existsSync(appFile)) {
  let src = fs.readFileSync(appFile, 'utf8');

  if (!src.includes("ROLE_NOTIFY_HISTORY_CHANNEL")) {
    const route = String.raw`
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

  app.get('/api/admin/role-notifications/players', requireOwner, async (_req, res) => {
    try {
      const [users, membersData] = await Promise.all([
        readUsers().catch(() => []),
        callBotInternalApi('/internal/discord/members/all?limit=700', { method: 'GET' }).catch(() => ({ members: [] }))
      ]);
      const byDiscordId = new Map();
      (membersData.members || []).forEach((member) => {
        const discordId = String(member.discordId || member.id || '').trim();
        if (!/^\d{16,22}$/.test(discordId)) return;
        byDiscordId.set(discordId, {
          id: member.id || discordId,
          discordId,
          name: member.name || member.username || discordId,
          username: member.username || '',
          avatar: member.avatar || '',
          guildName: member.guildName || '',
          roles: Array.isArray(member.roles) ? member.roles : [],
          registered: false
        });
      });
      (users || []).forEach((user) => {
        const discordId = String(user.discordId || '').trim();
        if (!/^\d{16,22}$/.test(discordId)) return;
        const current = byDiscordId.get(discordId) || {};
        byDiscordId.set(discordId, {
          ...current,
          id: user.id || current.id || discordId,
          siteUserId: user.id || '',
          discordId,
          name: rnName(user) || current.name || discordId,
          username: user?.profile?.username || current.username || '',
          avatar: user.avatar || current.avatar || '',
          roles: current.roles || [],
          registered: true
        });
      });
      const players = Array.from(byDiscordId.values()).sort((a, b) => Number(b.registered) - Number(a.registered) || String(a.name || '').localeCompare(String(b.name || '')));
      return res.json({ success: true, players, count: players.length });
    } catch (error) { return res.status(500).json({ success: false, message: error.message, players: [] }); }
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

  if (changed) fs.writeFileSync(appFile, src, 'utf8');
}

if (fs.existsSync(configHtmlFile)) {
  let html = fs.readFileSync(configHtmlFile, 'utf8');
  const oldBlock = '<div class="va-card" style="box-shadow:none"><h3>Conversa / respostas</h3><p class="va-muted">Clique em “Ver conversa” em um alvo do histórico ou informe um Discord ID.</p><div class="va-actions"><input id="dmHistoryDiscordId" placeholder="Discord ID do usuário" /><button id="loadDmHistoryBtn" class="va-btn" type="button">Ver conversa</button></div><div id="dmHistoryList" class="va-list"></div></div>';
  const newBlock = '<div class="va-card" style="box-shadow:none"><h3>Conversa / respostas</h3><p class="va-muted">Selecione um jogador/membro do servidor para ver mensagens enviadas pelo bot e respostas recebidas por DM. O campo de ID fica como busca manual reserva.</p><label>Selecionar jogador do servidor<select id="dmHistoryPlayerSelect" size="8"><option value="">Carregando jogadores...</option></select></label><div class="va-actions"><input id="dmHistoryDiscordId" placeholder="Discord ID manual / reserva" /><button id="loadDmHistoryBtn" class="va-btn" type="button">Ver conversa</button></div><div id="dmHistoryList" class="va-list"></div></div>';
  if (html.includes(oldBlock)) {
    html = html.replace(oldBlock, newBlock);
    fs.writeFileSync(configHtmlFile, html, 'utf8');
    changed = true;
  }
}

if (fs.existsSync(configJsFile)) {
  let js = fs.readFileSync(configJsFile, 'utf8');
  let jsChanged = false;

  if (!js.includes('dmHistoryPlayerSelect')) {
    js = js.replace("  const dmHistoryDiscordId = document.getElementById('dmHistoryDiscordId');", "  const dmHistoryDiscordId = document.getElementById('dmHistoryDiscordId');\n  const dmHistoryPlayerSelect = document.getElementById('dmHistoryPlayerSelect');");
    jsChanged = true;
  }

  if (!js.includes('function renderDmPlayerOptions')) {
    const helpers = String.raw`
  function playerLabel(player = {}) {
    const registered = player.registered ? ' • cadastrado no site' : '';
    const guild = player.guildName ? ' • ' + player.guildName : '';
    return `${player.name || player.username || player.discordId}${registered}${guild}`;
  }

  function renderDmPlayerOptions(players = []) {
    if (!dmHistoryPlayerSelect) return;
    const current = String(dmHistoryPlayerSelect.value || dmHistoryDiscordId?.value || '');
    const sorted = [...players].sort((a, b) => Number(b.registered) - Number(a.registered) || String(a.name || '').localeCompare(String(b.name || '')));
    dmHistoryPlayerSelect.innerHTML = '<option value="">Selecionar jogador/membro...</option>' + sorted.map((player) => `<option value="${esc(player.discordId || '')}" ${current && current === String(player.discordId || '') ? 'selected' : ''}>${esc(playerLabel(player))}</option>`).join('');
  }
`;
    js = js.replace('  function targetLine(target = {}) {', helpers + '\n  function targetLine(target = {}) {');
    jsChanged = true;
  }

  const oldLoad = String.raw`      const [rolesData, historyData] = await Promise.all([
        VoidArena.request('/api/discord/roles', { timeoutMs: 12000 }).catch((error) => ({ success: false, roles: [], message: error.message })),
        VoidArena.request('/api/admin/role-notifications/history', { timeoutMs: 12000 }).catch((error) => ({ success: false, campaigns: [], message: error.message }))
      ]);
      renderRoleOptions(rolesData.roles || []);
      renderRoleHistory(historyData.campaigns || []);
      status(roleNotificationStatus, `${rolesData.roles?.length || 0} cargo(s) carregado(s). Histórico: ${historyData.campaigns?.length || 0} envio(s).`, 'ok');`;
  const newLoad = String.raw`      const [rolesData, historyData, playersData] = await Promise.all([
        VoidArena.request('/api/discord/roles', { timeoutMs: 12000 }).catch((error) => ({ success: false, roles: [], message: error.message })),
        VoidArena.request('/api/admin/role-notifications/history', { timeoutMs: 12000 }).catch((error) => ({ success: false, campaigns: [], message: error.message })),
        VoidArena.request('/api/admin/role-notifications/players', { timeoutMs: 16000 }).catch((error) => ({ success: false, players: [], message: error.message }))
      ]);
      renderRoleOptions(rolesData.roles || []);
      renderRoleHistory(historyData.campaigns || []);
      renderDmPlayerOptions(playersData.players || []);
      status(roleNotificationStatus, `${rolesData.roles?.length || 0} cargo(s) carregado(s). Histórico: ${historyData.campaigns?.length || 0} envio(s). Jogadores: ${playersData.players?.length || 0}.`, 'ok');`;
  if (js.includes(oldLoad)) {
    js = js.replace(oldLoad, newLoad);
    jsChanged = true;
  }

  const oldIdLine = "    const id = String(discordId || dmHistoryDiscordId?.value || '').trim();";
  const newIdLine = "    const id = String(discordId || dmHistoryPlayerSelect?.value || dmHistoryDiscordId?.value || '').trim();";
  if (js.includes(oldIdLine)) {
    js = js.replace(oldIdLine, newIdLine);
    jsChanged = true;
  }

  const oldSetLine = "    if (dmHistoryDiscordId) dmHistoryDiscordId.value = id;";
  const newSetLine = "    if (dmHistoryDiscordId) dmHistoryDiscordId.value = id;\n    if (dmHistoryPlayerSelect && id) dmHistoryPlayerSelect.value = id;";
  if (js.includes(oldSetLine) && !js.includes('dmHistoryPlayerSelect && id')) {
    js = js.replace(oldSetLine, newSetLine);
    jsChanged = true;
  }

  const oldListener = "  document.getElementById('loadDmHistoryBtn')?.addEventListener('click', () => loadDmHistory());";
  const newListener = "  document.getElementById('loadDmHistoryBtn')?.addEventListener('click', () => loadDmHistory());\n  dmHistoryPlayerSelect?.addEventListener('change', () => { if (dmHistoryPlayerSelect.value) loadDmHistory(dmHistoryPlayerSelect.value); });";
  if (js.includes(oldListener) && !js.includes('dmHistoryPlayerSelect?.addEventListener')) {
    js = js.replace(oldListener, newListener);
    jsChanged = true;
  }

  if (jsChanged) {
    fs.writeFileSync(configJsFile, js, 'utf8');
    changed = true;
  }
}

console.log(changed ? 'Patch aplicado: notificações por cargo e seletor de jogador nas conversas.' : 'Patch ignorado: notificações por cargo já ativas.');
