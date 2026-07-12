(function () {
  const systemList = document.getElementById('systemStatusList');
  const backupSummary = document.getElementById('backupSummary');
  const configStatus = document.getElementById('configStatus');
  const backupStatus = document.getElementById('backupStatus');
  const announcementForm = document.getElementById('siteAnnouncementForm');
  const announcementStatus = document.getElementById('announcementStatus');
  const announcementList = document.getElementById('announcementList');
  const roleNotificationForm = document.getElementById('roleNotificationForm');
  const roleNotifyRoles = document.getElementById('roleNotifyRoles');
  const roleNotificationStatus = document.getElementById('roleNotificationStatus');
  const roleNotificationHistory = document.getElementById('roleNotificationHistory');
  const dmHistoryDiscordId = document.getElementById('dmHistoryDiscordId');
  const dmHistoryList = document.getElementById('dmHistoryList');
  const matchVoicesForm = document.getElementById('matchVoicesForm');
  const matchVoiceList = document.getElementById('matchVoiceList');
  const matchVoiceStatus = document.getElementById('matchVoiceStatus');

  function item(title, text) { return `<div class="va-item"><strong>${VoidArena.escapeHtml(title)}</strong><div class="va-muted">${text}</div></div>`; }
  function status(el, msg, type = '') { if (!el) return; el.textContent = msg; el.className = `va-status ${type}`.trim(); }
  function dbSummary(db = {}) { return `Usuários: ${db.users || 0} • Times: ${db.teams || 0} • Eventos: ${db.events || 0} • Partidas: ${db.trainingSubmissions || 0} • Mensagens: ${db.messages || 0}`; }
  function esc(value = '') { return VoidArena.escapeHtml(value); }
  function categoryId() { return String(matchVoicesForm?.elements?.categoryId?.value || '1523133579570184194').trim(); }
  function listedVoiceIds() { return Array.from(document.querySelectorAll('[data-match-voice-id]')).map((input) => input.dataset.matchVoiceId).filter(Boolean); }
  function roleLabel(role = {}) { return `${role.name || role.id}${role.guildName ? ` • ${role.guildName}` : ''}`; }

  async function load() {
    status(configStatus, 'Carregando status...');
    status(backupStatus, 'Consultando backup...');
    const [site, bot, latest] = await Promise.all([
      VoidArena.request('/api/health').catch((e) => ({ success: false, message: e.message })),
      VoidArena.request('/api/bot/internal-health').catch((e) => ({ success: false, message: e.message })),
      VoidArena.request('/api/backups/github/latest').catch((e) => ({ success: false, message: e.message }))
    ]);
    const db = site.data || {};
    const botDb = bot.database || {};
    systemList.innerHTML = [
      item('SITE', site.success ? `Online • ${dbSummary(db)}` : `Erro: ${esc(site.message || 'indisponível')}`),
      item('BOT', bot.success ? `API interna online • Bot ${bot.online ? 'online' : 'iniciando/offline'} • Guilds: ${bot.guilds || 0}` : `Erro: ${esc(bot.message || 'indisponível')}`),
      item('Banco do BOT', bot.success ? dbSummary(botDb) : 'Não foi possível consultar o banco remoto.')
    ].join('');
    if (latest.success) {
      const summary = latest.summary || {};
      const when = latest.githubBackup?.savedAt || latest.exportedAt || null;
      backupSummary.innerHTML = item('Último backup no GitHub', `${dbSummary(summary)} • ${VoidArena.formatDate(when)}${latest.githubBackup?.path ? ` • ${esc(latest.githubBackup.path)}` : ''}`);
      status(backupStatus, 'Backup carregado.', 'ok');
    } else {
      backupSummary.innerHTML = item('Último backup no GitHub', `Não encontrado ou indisponível: ${esc(latest.message || '')}`);
      status(backupStatus, 'Backup indisponível.', 'err');
    }
    status(configStatus, 'Status carregado.', 'ok');
    await loadAnnouncements();
    await loadRoleNotifications();
  }

  async function createBackup() {
    status(backupStatus, 'Salvando backup no GitHub...');
    try {
      const data = await VoidArena.request('/api/backups/github/export', { method: 'POST', body: JSON.stringify({ reason: 'site-configuracoes-5.0.1' }) });
      const path = data.manifest?.backupPath || data.manifest?.path || 'backup salvo';
      status(backupStatus, `✅ Backup salvo: ${path}`, 'ok');
      await load();
    } catch (error) { status(backupStatus, `❌ ${error.message}`, 'err'); }
  }

  async function restoreBackup() {
    if (!confirm('Restaurar o último backup do GitHub? Isso substitui o banco atual do BOT.')) return;
    status(backupStatus, 'Restaurando último backup...');
    try {
      const data = await VoidArena.request('/api/backups/github/restore-latest', { method: 'POST', body: '{}' });
      status(backupStatus, `✅ Backup restaurado. ${dbSummary(data.status || data.summary || {})}`, 'ok');
      await load();
    } catch (error) { status(backupStatus, `❌ ${error.message}`, 'err'); }
  }

  function renderAnnouncements(items = []) {
    if (!announcementList) return;
    if (!items.length) {
      announcementList.innerHTML = '<div class="va-item"><strong>Nenhuma notificação enviada</strong><div class="va-muted">Os avisos enviados aparecerão aqui para remoção futura.</div></div>';
      return;
    }
    announcementList.innerHTML = `<div class="va-actions"><button id="deleteAnnouncementsBtn" class="va-btn danger" type="button">Excluir notificações selecionadas</button></div>` + items.map((note) => `
      <label class="va-item" style="display:grid;grid-template-columns:auto 1fr;gap:12px;align-items:start">
        <input type="checkbox" data-announcement-id="${esc(note.id)}" />
        <span><strong>${esc(note.title || 'Aviso')}</strong><div class="va-muted">${esc(note.message || note.note || '')}</div><small class="va-muted">${esc(VoidArena.formatDate(note.createdAt))}</small></span>
      </label>`).join('');
    document.getElementById('deleteAnnouncementsBtn')?.addEventListener('click', deleteAnnouncements);
  }

  async function loadAnnouncements() {
    if (!announcementList) return;
    try {
      const data = await VoidArena.request('/api/notifications/announcements', { timeoutMs: 9000 });
      renderAnnouncements(data.announcements || []);
    } catch (error) {
      announcementList.innerHTML = `<div class="va-item"><strong>Não foi possível carregar avisos</strong><div class="va-muted">${esc(error.message)}</div></div>`;
    }
  }

  async function deleteAnnouncements() {
    const ids = Array.from(document.querySelectorAll('[data-announcement-id]:checked')).map((input) => input.dataset.announcementId).filter(Boolean);
    if (!ids.length) return status(announcementStatus, 'Selecione pelo menos uma notificação enviada.', 'err');
    if (!confirm(`Excluir ${ids.length} notificação(ões) dos Correios?`)) return;
    status(announcementStatus, 'Removendo notificações...');
    try {
      const data = await VoidArena.request('/api/notifications/announcements', { method: 'DELETE', body: JSON.stringify({ ids }), timeoutMs: 12000 });
      status(announcementStatus, `✅ ${data.message || 'Notificações removidas.'}`, 'ok');
      await loadAnnouncements();
    } catch (error) { status(announcementStatus, `❌ ${error.message}`, 'err'); }
  }

  async function sendAnnouncement(event) {
    event.preventDefault();
    const title = String(announcementForm?.elements?.title?.value || '').trim();
    const message = String(announcementForm?.elements?.message?.value || '').trim();
    if (!message) return status(announcementStatus, 'Digite a mensagem do aviso.', 'err');
    status(announcementStatus, 'Enviando para os Correios...');
    try {
      const data = await VoidArena.request('/api/notifications/announcement', { method: 'POST', body: JSON.stringify({ title, message }) });
      status(announcementStatus, `✅ ${data.message || 'Aviso enviado.'}`, 'ok');
      announcementForm.elements.message.value = '';
      await loadAnnouncements();
    } catch (error) { status(announcementStatus, `❌ ${error.message}`, 'err'); }
  }

  async function enableBrowserNotifications() {
    try {
      const result = await VoidArena.enableBrowserNotifications?.();
      status(announcementStatus, result || 'Permissão de notificação atualizada.', 'ok');
    } catch (error) { status(announcementStatus, `❌ ${error.message}`, 'err'); }
  }

  function selectedRoleIds() {
    return Array.from(roleNotifyRoles?.selectedOptions || []).map((option) => option.value).filter(Boolean);
  }

  function renderRoleOptions(roles = []) {
    if (!roleNotifyRoles) return;
    const current = new Set(selectedRoleIds());
    const sorted = [...roles].sort((a, b) => String(a.guildName || '').localeCompare(String(b.guildName || '')) || String(a.name || '').localeCompare(String(b.name || '')));
    roleNotifyRoles.innerHTML = sorted.map((role) => `<option value="${esc(role.id)}" ${current.has(String(role.id)) ? 'selected' : ''}>${esc(roleLabel(role))}</option>`).join('');
  }

  function targetLine(target = {}) {
    const roles = (target.roles || []).slice(0, 4).map((role) => role.name).filter(Boolean).join(', ');
    const replyHint = target.dmDelivered ? ' • DM enviada' : (target.dmError ? ` • DM falhou: ${target.dmError}` : '');
    return `<div class="va-item" style="display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center"><span><strong>${esc(target.name || target.discordId)}</strong><div class="va-muted">${esc(target.discordId || '')}${roles ? ` • ${esc(roles)}` : ''}${replyHint}</div><small class="va-muted">Site: ${target.siteDelivered ? 'entregue' : 'não enviado'} • Discord: ${target.dmDelivered ? 'entregue' : 'não enviado'}</small></span><button class="va-btn mini" type="button" data-role-dm-history="${esc(target.discordId || '')}">Ver conversa</button></div>`;
  }

  function renderRoleHistory(campaigns = []) {
    if (!roleNotificationHistory) return;
    if (!campaigns.length) {
      roleNotificationHistory.innerHTML = '<div class="va-item"><strong>Nenhum envio por cargo ainda</strong><div class="va-muted">Quando você enviar uma mensagem por cargo, o histórico aparece aqui.</div></div>';
      return;
    }
    roleNotificationHistory.innerHTML = campaigns.map((campaign) => {
      const counts = campaign.counts || {};
      const roles = (campaign.roles || []).map((role) => role.name || role.id).join(', ');
      const targets = (campaign.targets || []).slice(0, 30).map(targetLine).join('');
      return `<section class="va-item"><strong>${esc(campaign.title || 'Aviso')}</strong><div class="va-muted">${esc(campaign.message || '')}</div><small class="va-muted">${esc(VoidArena.formatDate(campaign.createdAt))} • ${esc(campaign.deliveryMode || 'both')} • cargos: ${esc(roles || '-')}</small><div class="va-kpi-row" style="margin-top:8px"><span class="va-badge">Alvos ${counts.targets || 0}</span><span class="va-badge ok">Site ${counts.siteDelivered || 0}</span><span class="va-badge ok">DM ${counts.dmDelivered || 0}</span>${counts.dmFailed ? `<span class="va-badge danger">Falhas ${counts.dmFailed}</span>` : ''}</div><div class="va-list" style="margin-top:10px">${targets || '<div class="va-muted">Sem alvos registrados.</div>'}</div></section>`;
    }).join('');
    roleNotificationHistory.querySelectorAll('[data-role-dm-history]').forEach((btn) => btn.addEventListener('click', () => loadDmHistory(btn.dataset.roleDmHistory)));
  }

  async function loadRoleNotifications() {
    if (!roleNotificationForm) return;
    status(roleNotificationStatus, 'Carregando cargos e histórico...');
    try {
      const [rolesData, historyData] = await Promise.all([
        VoidArena.request('/api/discord/roles', { timeoutMs: 12000 }).catch((error) => ({ success: false, roles: [], message: error.message })),
        VoidArena.request('/api/admin/role-notifications/history', { timeoutMs: 12000 }).catch((error) => ({ success: false, campaigns: [], message: error.message }))
      ]);
      renderRoleOptions(rolesData.roles || []);
      renderRoleHistory(historyData.campaigns || []);
      status(roleNotificationStatus, `${rolesData.roles?.length || 0} cargo(s) carregado(s). Histórico: ${historyData.campaigns?.length || 0} envio(s).`, 'ok');
    } catch (error) { status(roleNotificationStatus, `❌ ${error.message}`, 'err'); }
  }

  async function sendRoleNotification(event) {
    event.preventDefault();
    const roleIds = selectedRoleIds();
    const title = String(roleNotificationForm?.elements?.title?.value || '').trim();
    const message = String(roleNotificationForm?.elements?.message?.value || '').trim();
    const deliveryMode = String(roleNotificationForm?.elements?.deliveryMode?.value || 'both');
    if (!roleIds.length) return status(roleNotificationStatus, 'Selecione pelo menos um cargo.', 'err');
    if (!message) return status(roleNotificationStatus, 'Digite a mensagem.', 'err');
    const modeLabel = deliveryMode === 'site' ? 'somente no site' : deliveryMode === 'discord' ? 'somente por DM Discord' : 'no site e por DM Discord';
    if (!confirm(`Enviar esta mensagem para usuários cadastrados com ${roleIds.length} cargo(s), ${modeLabel}?`)) return;
    status(roleNotificationStatus, 'Enviando notificação por cargo...');
    try {
      const data = await VoidArena.request('/api/admin/role-notifications', { method: 'POST', body: JSON.stringify({ roleIds, title, message, deliveryMode }), timeoutMs: 60000 });
      const counts = data.campaign?.counts || {};
      status(roleNotificationStatus, `✅ Enviado. Alvos: ${counts.targets || 0}. Site: ${counts.siteDelivered || 0}. DM: ${counts.dmDelivered || 0}.`, 'ok');
      roleNotificationForm.elements.message.value = '';
      await loadRoleNotifications();
    } catch (error) { status(roleNotificationStatus, `❌ ${error.message}`, 'err'); }
  }

  function renderDmHistory(data = {}) {
    if (!dmHistoryList) return;
    const messages = data.messages || [];
    if (!messages.length) {
      dmHistoryList.innerHTML = `<div class="va-item"><strong>Nenhuma conversa encontrada</strong><div class="va-muted">Não achei mensagens salvas para esse Discord ID.</div></div>`;
      return;
    }
    const replies = messages.filter((msg) => String(msg.direction || '').toLowerCase() === 'inbound').length;
    dmHistoryList.innerHTML = `<div class="va-item"><strong>${replies ? `✅ ${replies} resposta(s) do jogador` : 'Sem resposta do jogador ainda'}</strong><div class="va-muted">Discord ID: ${esc(data.discordId || '')}</div></div>` + messages.map((msg) => {
      const inbound = String(msg.direction || '').toLowerCase() === 'inbound';
      return `<div class="va-item"><strong>${inbound ? 'Resposta do jogador' : 'Mensagem enviada pelo bot'}</strong><div class="va-muted">${esc(msg.content || '')}</div><small class="va-muted">${esc(VoidArena.formatDate(msg.createdAt))}${msg.deliveredToDiscord === false ? ' • falhou no Discord' : ''}</small></div>`;
    }).join('');
  }

  async function loadDmHistory(discordId = '') {
    const id = String(discordId || dmHistoryDiscordId?.value || '').trim();
    if (!id) return;
    if (dmHistoryDiscordId) dmHistoryDiscordId.value = id;
    dmHistoryList.innerHTML = '<div class="va-item"><strong>Carregando conversa...</strong></div>';
    try {
      const data = await VoidArena.request(`/api/admin/role-notifications/dm-history/${encodeURIComponent(id)}`, { timeoutMs: 12000 });
      renderDmHistory(data);
    } catch (error) { dmHistoryList.innerHTML = `<div class="va-item"><strong>Erro ao carregar conversa</strong><div class="va-muted">${esc(error.message)}</div></div>`; }
  }

  function renderMatchVoices(channels = []) {
    if (!matchVoiceList) return;
    if (!channels.length) {
      matchVoiceList.innerHTML = '<div class="va-item"><strong>Nenhuma call encontrada</strong><div class="va-muted">Não achei calls de voz dentro dessa categoria.</div></div>';
      return;
    }
    matchVoiceList.innerHTML = channels.map((channel) => `
      <label class="va-item" style="display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center">
        <input type="checkbox" data-match-voice-id="${esc(channel.id)}" />
        <span><strong>${esc(channel.name)}</strong><div class="va-muted">${esc(channel.parentName || 'Categoria')} • ${channel.members || 0}/${channel.userLimit || 0 || '∞'} jogador(es)</div></span>
        <span class="va-badge">${channel.managed ? 'Time' : 'Call'}</span>
      </label>`).join('');
  }

  async function loadMatchVoices() {
    status(matchVoiceStatus, 'Carregando calls privadas...');
    try {
      const data = await VoidArena.request(`/api/discord/match-voices?categoryId=${encodeURIComponent(categoryId())}`, { timeoutMs: 12000 });
      renderMatchVoices(data.channels || []);
      status(matchVoiceStatus, `${data.channels?.length || 0} call(s) encontrada(s).${data.fallback ? ' Modo compatibilidade: redeploy do BOT ativa exclusão.' : ''}`, 'ok');
    } catch (error) { status(matchVoiceStatus, `❌ ${error.message}`, 'err'); }
  }

  async function deleteVoiceIds(channelIds = [], modeLabel = 'selecionada(s)') {
    if (!channelIds.length) return status(matchVoiceStatus, 'Nenhuma call carregada para apagar.', 'err');
    if (!confirm(`Apagar ${channelIds.length} call(s) ${modeLabel}?`)) return;
    status(matchVoiceStatus, 'Apagando calls...');
    try {
      const data = await VoidArena.request('/api/discord/match-voices', { method: 'DELETE', body: JSON.stringify({ channelIds, categoryId: categoryId() }), timeoutMs: 20000 });
      status(matchVoiceStatus, `✅ ${data.message || `${data.deleted?.length || 0} call(s) apagada(s).`}`, 'ok');
      await loadMatchVoices();
    } catch (error) { status(matchVoiceStatus, `❌ ${error.message}`, 'err'); }
  }

  async function deleteMatchVoices() {
    const channelIds = Array.from(document.querySelectorAll('[data-match-voice-id]:checked')).map((input) => input.dataset.matchVoiceId).filter(Boolean);
    if (!channelIds.length) return status(matchVoiceStatus, 'Selecione pelo menos uma call para apagar.', 'err');
    await deleteVoiceIds(channelIds, 'selecionada(s)');
  }

  async function clearAllMatchVoices() {
    const channelIds = listedVoiceIds();
    await deleteVoiceIds(channelIds, 'listada(s) nessa categoria');
  }

  document.getElementById('reloadConfigBtn')?.addEventListener('click', load);
  document.getElementById('createBackupBtn')?.addEventListener('click', createBackup);
  document.getElementById('restoreBackupBtn')?.addEventListener('click', restoreBackup);
  document.getElementById('openInboxPreviewBtn')?.addEventListener('click', () => VoidArena.openNotifications?.());
  document.getElementById('enableBrowserNotificationsBtn')?.addEventListener('click', enableBrowserNotifications);
  document.getElementById('reloadRoleNotifyBtn')?.addEventListener('click', loadRoleNotifications);
  document.getElementById('loadDmHistoryBtn')?.addEventListener('click', () => loadDmHistory());
  document.getElementById('loadMatchVoicesBtn')?.addEventListener('click', loadMatchVoices);
  document.getElementById('deleteMatchVoicesBtn')?.addEventListener('click', deleteMatchVoices);
  document.getElementById('clearAllMatchVoicesBtn')?.addEventListener('click', clearAllMatchVoices);
  announcementForm?.addEventListener('submit', sendAnnouncement);
  roleNotificationForm?.addEventListener('submit', sendRoleNotification);
  VoidArena.bootLayout('config').then(load).catch((error) => status(configStatus, `❌ ${error.message}`, 'err'));
}());