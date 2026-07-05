(function () {
  const systemList = document.getElementById('systemStatusList');
  const backupSummary = document.getElementById('backupSummary');
  const configStatus = document.getElementById('configStatus');
  const backupStatus = document.getElementById('backupStatus');
  const categoryForm = document.getElementById('discordCategoryForm');
  const categoryStatus = document.getElementById('discordCategoryStatus');
  const announcementForm = document.getElementById('siteAnnouncementForm');
  const announcementStatus = document.getElementById('announcementStatus');
  const matchVoicesForm = document.getElementById('matchVoicesForm');
  const matchVoiceList = document.getElementById('matchVoiceList');
  const matchVoiceStatus = document.getElementById('matchVoiceStatus');

  function item(title, text) { return `<div class="va-item"><strong>${VoidArena.escapeHtml(title)}</strong><div class="va-muted">${text}</div></div>`; }
  function status(el, msg, type = '') { if (!el) return; el.textContent = msg; el.className = `va-status ${type}`.trim(); }
  function dbSummary(db = {}) {
    return `Usuários: ${db.users || 0} • Times: ${db.teams || 0} • Eventos: ${db.events || 0} • Partidas: ${db.trainingSubmissions || 0} • Mensagens: ${db.messages || 0}`;
  }
  function esc(value = '') { return VoidArena.escapeHtml(value); }
  function categoryId() { return String(matchVoicesForm?.elements?.categoryId?.value || '1523133579570184194').trim(); }

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

  async function createDiscordCategory(event) {
    event.preventDefault();
    const name = String(categoryForm?.elements?.name?.value || '').trim();
    if (!name) return status(categoryStatus, 'Digite o nome da categoria.', 'err');
    status(categoryStatus, 'Criando categoria no Discord...');
    try {
      const data = await VoidArena.request('/api/discord/categories', { method: 'POST', body: JSON.stringify({ name }) });
      status(categoryStatus, `✅ ${data.message || 'Categoria pronta.'} ${data.category?.name ? `• ${data.category.name}` : ''}`, 'ok');
      categoryForm.reset();
    } catch (error) {
      status(categoryStatus, `❌ ${error.message}`, 'err');
    }
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
    } catch (error) { status(announcementStatus, `❌ ${error.message}`, 'err'); }
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
      status(matchVoiceStatus, `${data.channels?.length || 0} call(s) encontrada(s).`, 'ok');
    } catch (error) {
      status(matchVoiceStatus, `❌ ${error.message}`, 'err');
    }
  }

  async function deleteMatchVoices() {
    const channelIds = Array.from(document.querySelectorAll('[data-match-voice-id]:checked')).map((input) => input.dataset.matchVoiceId).filter(Boolean);
    if (!channelIds.length) return status(matchVoiceStatus, 'Selecione pelo menos uma call para apagar.', 'err');
    if (!confirm(`Apagar ${channelIds.length} call(s) selecionada(s)?`)) return;
    status(matchVoiceStatus, 'Apagando calls selecionadas...');
    try {
      const data = await VoidArena.request('/api/discord/match-voices', { method: 'DELETE', body: JSON.stringify({ channelIds, categoryId: categoryId() }), timeoutMs: 15000 });
      status(matchVoiceStatus, `✅ ${data.message || `${data.deleted?.length || 0} call(s) apagada(s).`}`, 'ok');
      await loadMatchVoices();
    } catch (error) {
      status(matchVoiceStatus, `❌ ${error.message}`, 'err');
    }
  }

  document.getElementById('reloadConfigBtn')?.addEventListener('click', load);
  document.getElementById('createBackupBtn')?.addEventListener('click', createBackup);
  document.getElementById('restoreBackupBtn')?.addEventListener('click', restoreBackup);
  document.getElementById('openInboxPreviewBtn')?.addEventListener('click', () => VoidArena.openNotifications?.());
  document.getElementById('loadMatchVoicesBtn')?.addEventListener('click', loadMatchVoices);
  document.getElementById('deleteMatchVoicesBtn')?.addEventListener('click', deleteMatchVoices);
  categoryForm?.addEventListener('submit', createDiscordCategory);
  announcementForm?.addEventListener('submit', sendAnnouncement);
  VoidArena.bootLayout('config').then(load).catch((error) => status(configStatus, `❌ ${error.message}`, 'err'));
}());
