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
  const roleNotifyRoleSearch = document.getElementById('roleNotifyRoleSearch');
  const roleNotifyRoleCards = document.getElementById('roleNotifyRoleCards');
  const roleNotifyRoleCount = document.getElementById('roleNotifyRoleCount');
  let roleNotifyRolesCache = [];
  const roleNotificationStatus = document.getElementById('roleNotificationStatus');
  const roleNotificationHistory = document.getElementById('roleNotificationHistory');
  const dmHistoryDiscordId = document.getElementById('dmHistoryDiscordId');
  const dmHistoryPlayerSelect = document.getElementById('dmHistoryPlayerSelect');
  const dmHistoryPlayerSearch = document.getElementById('dmHistoryPlayerSearch');
  const dmHistoryPlayerCards = document.getElementById('dmHistoryPlayerCards');
  const dmHistoryPlayerCount = document.getElementById('dmHistoryPlayerCount');
  let dmHistoryPlayersCache = [];
  const dmHistoryList = document.getElementById('dmHistoryList');
  const dmHistoryRefreshBtn = document.getElementById('dmHistoryRefreshBtn');
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

  function selectedRoleSet() { return new Set(selectedRoleIds().map(String)); }

  function roleSearchText(role = {}) { return [role.name, role.id, role.guildName, role.mention].join(' ').toLowerCase(); }

  function syncRoleCount() {
    if (!roleNotifyRoleCount) return;
    const count = selectedRoleIds().length;
    roleNotifyRoleCount.textContent = String(count) + ' selecionado(s)';
  }

  function toggleRoleId(roleId = '') {
    if (!roleNotifyRoles || !roleId) return;
    const option = Array.from(roleNotifyRoles.options || []).find((item) => String(item.value) === String(roleId));
    if (!option) return;
    option.selected = !option.selected;
    syncRoleCount();
    renderRoleCards();
  }

  function renderRoleCards(roles = roleNotifyRolesCache) {
    if (!roleNotifyRoleCards) return;
    roleNotifyRolesCache = Array.isArray(roles) ? roles : [];
    const selected = selectedRoleSet();
    const query = String(roleNotifyRoleSearch?.value || '').trim().toLowerCase();
    const filtered = roleNotifyRolesCache.filter((role) => !query || roleSearchText(role).includes(query)).slice(0, 120);
    syncRoleCount();
    if (!filtered.length) { roleNotifyRoleCards.innerHTML = '<div class="va-role-card empty"><strong>Nenhum cargo encontrado</strong><span>Ajuste a busca.</span></div>'; return; }
    roleNotifyRoleCards.innerHTML = filtered.map((role) => {
      const id = String(role.id || '');
      const active = selected.has(id);
      const guild = role.guildName ? ' • ' + esc(role.guildName) : '';
      const dot = role.color && role.color !== '#000000' ? '<span class="va-role-dot" style="background:' + esc(role.color) + '"></span>' : '<span class="va-role-dot"></span>';
      return '<button type="button" class="va-role-card ' + (active ? 'active' : '') + '" data-role-card-id="' + esc(id) + '">' + dot + '<span><strong>' + esc(role.name || id) + '</strong><small>' + esc(id + guild) + '</small></span><em>' + (active ? 'Selecionado' : 'Selecionar') + '</em></button>';
    }).join('');
    roleNotifyRoleCards.querySelectorAll('[data-role-card-id]').forEach((card) => { card.addEventListener('click', () => toggleRoleId(card.dataset.roleCardId || '')); });
  }
  function renderRoleOptions(roles = []) {
    if (!roleNotifyRoles) return;
    const current = new Set(selectedRoleIds());
    const sorted = [...roles].sort((a, b) => String(a.guildName || '').localeCompare(String(b.guildName || '')) || String(a.name || '').localeCompare(String(b.name || '')));
    roleNotifyRoles.innerHTML = sorted.map((role) => `<option value="${esc(role.id)}" ${current.has(String(role.id)) ? 'selected' : ''}>${esc(roleLabel(role))}</option>`).join('');
    renderRoleCards(sorted);
  }

  function playerLabel(player = {}) {
    const registered = player.registered ? ' • cadastrado no site' : '';
    const guild = player.guildName ? ' • ' + player.guildName : '';
    return String(player.name || player.username || player.discordId || '') + registered + guild;
  }

  function renderDmPlayerOptions(players = []) {
    if (!dmHistoryPlayerSelect) return;
    const current = String(dmHistoryPlayerSelect.value || dmHistoryDiscordId?.value || '');
    const sorted = [...players].sort((a, b) => Number(b.registered) - Number(a.registered) || String(a.name || '').localeCompare(String(b.name || '')));
    dmHistoryPlayerSelect.innerHTML = '<option value="">Selecionar jogador/membro...</option>' + sorted.map((player) => '<option value="' + esc(player.discordId || '') + '" ' + (current && current === String(player.discordId || '') ? 'selected' : '') + '>' + esc(playerLabel(player)) + '</option>').join('');
  }
  function dmPlayerInitials(player = {}) {
    const name = String(player.name || player.username || player.discordId || '?').trim();
    return name.split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase() || '?';
  }

  function renderDmPlayerCards(players = dmHistoryPlayersCache) {
    if (!dmHistoryPlayerCards) return;
    dmHistoryPlayersCache = Array.isArray(players) ? players : [];
    const query = String(dmHistoryPlayerSearch?.value || '').trim().toLowerCase();
    const selectedId = String(dmHistoryPlayerSelect?.value || dmHistoryDiscordId?.value || '');
    const filtered = dmHistoryPlayersCache.filter((player) => {
      const roles = (player.roles || []).map((role) => role.name || '').join(' ');
      const haystack = [player.name, player.username, player.discordId, player.guildName, roles, player.registered ? 'cadastrado site' : ''].join(' ').toLowerCase();
      return !query || haystack.includes(query);
    }).slice(0, 80);
    if (dmHistoryPlayerCount) dmHistoryPlayerCount.textContent = String(filtered.length) + ' de ' + String(dmHistoryPlayersCache.length || 0);
    if (!filtered.length) {
      dmHistoryPlayerCards.innerHTML = '<div class="va-player-card empty"><strong>Nenhum jogador encontrado</strong><span>Ajuste a busca ou use o Discord ID manual.</span></div>';
      return;
    }
    dmHistoryPlayerCards.innerHTML = filtered.map((player) => {
      const roles = (player.roles || []).slice(0, 3).map((role) => role.name).filter(Boolean).join(', ');
      const active = selectedId && selectedId === String(player.discordId || '');
      const registered = player.registered ? '<span class="va-player-pill ok">cadastrado no site</span>' : '<span class="va-player-pill">membro Discord</span>';
      const avatar = player.avatar ? '<img src="' + esc(player.avatar) + '" alt="" />' : '<span>' + esc(dmPlayerInitials(player)) + '</span>';
      return '<button type="button" class="va-player-card ' + (active ? 'active' : '') + '" data-dm-player-id="' + esc(player.discordId || '') + '">' +
        '<span class="va-player-avatar">' + avatar + '</span>' +
        '<span class="va-player-info"><strong>' + esc(player.name || player.username || player.discordId || 'Jogador') + '</strong><small>' + esc(player.discordId || '') + (player.guildName ? ' • ' + esc(player.guildName) : '') + '</small><em>' + esc(roles || 'Sem cargos exibidos') + '</em></span>' +
        '<span class="va-player-meta">' + registered + '<span>Ver conversa</span></span>' +
      '</button>';
    }).join('');
    dmHistoryPlayerCards.querySelectorAll('[data-dm-player-id]').forEach((card) => {
      card.addEventListener('click', () => {
        const id = card.dataset.dmPlayerId || '';
        if (!id) return;
        if (dmHistoryPlayerSelect) dmHistoryPlayerSelect.value = id;
        if (dmHistoryDiscordId) dmHistoryDiscordId.value = id;
        renderDmPlayerCards();
        loadDmHistory(id);
      });
    });
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
      const [rolesData, historyData, playersData] = await Promise.all([
        VoidArena.request('/api/discord/roles', { timeoutMs: 12000 }).catch((error) => ({ success: false, roles: [], message: error.message })),
        VoidArena.request('/api/admin/role-notifications/history', { timeoutMs: 12000 }).catch((error) => ({ success: false, campaigns: [], message: error.message })),
        VoidArena.request('/api/admin/role-notifications/players', { timeoutMs: 16000 }).catch((error) => ({ success: false, players: [], message: error.message }))
      ]);
      renderRoleOptions(rolesData.roles || []);
      renderRoleHistory(historyData.campaigns || []);
      renderDmPlayerOptions(playersData.players || []);
      renderDmPlayerCards(playersData.players || []);
      status(roleNotificationStatus, String(rolesData.roles?.length || 0) + ' cargo(s) carregado(s). Histórico: ' + String(historyData.campaigns?.length || 0) + ' envio(s). Jogadores: ' + String(playersData.players?.length || 0) + '.', 'ok');
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
    const id = String(discordId || dmHistoryPlayerSelect?.value || dmHistoryDiscordId?.value || '').trim();
    if (!id) return;
    if (dmHistoryDiscordId) dmHistoryDiscordId.value = id;
    if (dmHistoryPlayerSelect && id) dmHistoryPlayerSelect.value = id;
    dmHistoryList.innerHTML = '<div class="va-item"><strong>Carregando conversa...</strong></div>';
    try {
      const data = await VoidArena.request(`/api/admin/role-notifications/dm-history/${encodeURIComponent(id)}`, { timeoutMs: 12000 });
      renderDmHistory(data);
      renderDmPlayerCards();
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
  roleNotifyRoleSearch?.addEventListener('input', () => renderRoleCards());
  document.getElementById('loadDmHistoryBtn')?.addEventListener('click', () => loadDmHistory());
  dmHistoryRefreshBtn?.addEventListener('click', () => loadDmHistory());
  dmHistoryPlayerSelect?.addEventListener('change', () => { if (dmHistoryPlayerSelect.value) loadDmHistory(dmHistoryPlayerSelect.value); });
  dmHistoryPlayerSearch?.addEventListener('input', () => renderDmPlayerCards());
  document.getElementById('loadMatchVoicesBtn')?.addEventListener('click', loadMatchVoices);
  document.getElementById('deleteMatchVoicesBtn')?.addEventListener('click', deleteMatchVoices);
  document.getElementById('clearAllMatchVoicesBtn')?.addEventListener('click', clearAllMatchVoices);
  announcementForm?.addEventListener('submit', sendAnnouncement);
  roleNotificationForm?.addEventListener('submit', sendRoleNotification);
  VoidArena.bootLayout('config').then(load).catch((error) => status(configStatus, `❌ ${error.message}`, 'err'));
}());