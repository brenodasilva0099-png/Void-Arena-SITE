(function () {
  const systemList = document.getElementById('systemStatusList');
  const backupSummary = document.getElementById('backupSummary');
  const configStatus = document.getElementById('configStatus');
  const backupStatus = document.getElementById('backupStatus');
  const categoryForm = document.getElementById('discordCategoryForm');
  const categoryStatus = document.getElementById('discordCategoryStatus');
  function item(title, text) { return `<div class="va-item"><strong>${VoidArena.escapeHtml(title)}</strong><div class="va-muted">${text}</div></div>`; }
  function status(el, msg, type = '') { if (!el) return; el.textContent = msg; el.className = `va-status ${type}`.trim(); }
  function dbSummary(db = {}) {
    return `Usuários: ${db.users || 0} • Times: ${db.teams || 0} • Eventos: ${db.events || 0} • Partidas: ${db.trainingSubmissions || 0} • Mensagens: ${db.messages || 0}`;
  }
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
      item('SITE', site.success ? `Online • ${dbSummary(db)}` : `Erro: ${VoidArena.escapeHtml(site.message || 'indisponível')}`),
      item('BOT', bot.success ? `API interna online • Bot ${bot.online ? 'online' : 'iniciando/offline'} • Guilds: ${bot.guilds || 0}` : `Erro: ${VoidArena.escapeHtml(bot.message || 'indisponível')}`),
      item('Banco do BOT', bot.success ? dbSummary(botDb) : 'Não foi possível consultar o banco remoto.')
    ].join('');
    if (latest.success) {
      const summary = latest.summary || {};
      const when = latest.githubBackup?.savedAt || latest.exportedAt || null;
      backupSummary.innerHTML = item('Último backup no GitHub', `${dbSummary(summary)} • ${VoidArena.formatDate(when)}${latest.githubBackup?.path ? ` • ${VoidArena.escapeHtml(latest.githubBackup.path)}` : ''}`);
      status(backupStatus, 'Backup carregado.', 'ok');
    } else {
      backupSummary.innerHTML = item('Último backup no GitHub', `Não encontrado ou indisponível: ${VoidArena.escapeHtml(latest.message || '')}`);
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
  document.getElementById('reloadConfigBtn')?.addEventListener('click', load);
  document.getElementById('createBackupBtn')?.addEventListener('click', createBackup);
  document.getElementById('restoreBackupBtn')?.addEventListener('click', restoreBackup);
  categoryForm?.addEventListener('submit', createDiscordCategory);
  VoidArena.bootLayout('config').then(load).catch((error) => status(configStatus, `❌ ${error.message}`, 'err'));
}());
