(function () {
  const key = document.body.dataset.bridgeKey || 'chat';
  const active = document.body.dataset.page || key;
  const titleEl = document.getElementById('bridgeTitle');
  const subtitleEl = document.getElementById('bridgeSubtitle');
  const channelEl = document.getElementById('bridgeChannel');
  const messagesEl = document.getElementById('bridgeMessages');
  const statusEl = document.getElementById('bridgeStatus');
  const inputEl = document.getElementById('bridgeInput');
  const sendBtn = document.getElementById('bridgeSendBtn');
  const linkBtn = document.getElementById('bridgeLinkBtn');
  const refreshBtn = document.getElementById('bridgeRefreshBtn');

  function esc(value) { return VoidArena.escapeHtml(value || ''); }
  function setStatus(message, type = '') { statusEl.textContent = message; statusEl.className = `va-status va-bridge-status ${type}`.trim(); }
  function channelLabel(channel = {}) { return `${channel.displayName || channel.name || 'canal'} — ${channel.typeName || channel.kind || 'Texto'}`; }
  function renderChannels(channels = [], selected = '') {
    const usable = channels.filter((channel) => channel.canBridge || ['text', 'announcement'].includes(channel.kind));
    channelEl.innerHTML = '<option value="">Selecionar canal de texto</option>' + usable.map((channel) => `<option value="${esc(channel.id)}">${esc(channelLabel(channel))}</option>`).join('');
    channelEl.value = selected || '';
  }
  function renderMessages(messages = []) {
    messagesEl.innerHTML = messages.length ? messages.map((msg) => `<article class="va-bridge-msg"><strong>${esc(msg.authorName || 'Void Arena')}</strong><div>${esc(msg.content || '')}</div><small class="va-muted">${esc(msg.source || 'site')} • ${msg.createdAt ? new Date(msg.createdAt).toLocaleString('pt-BR') : ''}</small></article>`).join('') : '<div class="va-bridge-empty">Nenhuma mensagem ainda. Vincule um canal ou envie uma mensagem por aqui.</div>';
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
  async function load() {
    setStatus('Carregando ponte Discord ↔ Site...');
    const data = await VoidArena.request(`/api/bridge/${encodeURIComponent(key)}/state`);
    titleEl.textContent = data.bridge?.title || titleEl.textContent;
    subtitleEl.textContent = data.settings?.discordChannelId ? `Canal Discord vinculado: ${data.settings.discordChannelId}` : 'Canal Discord: não vinculado';
    inputEl.placeholder = data.bridge?.placeholder || inputEl.placeholder;
    renderChannels(data.channels || [], data.settings?.discordChannelId || '');
    renderMessages(data.messages || []);
    setStatus(data.message || 'Ponte carregada.', data.settings?.discordChannelId ? 'ok' : '');
  }
  async function link() {
    setStatus('Vinculando canal...');
    const data = await VoidArena.request(`/api/bridge/${encodeURIComponent(key)}/link`, { method: 'PUT', body: JSON.stringify({ discordChannelId: channelEl.value }) });
    subtitleEl.textContent = data.settings?.discordChannelId ? `Canal Discord vinculado: ${data.settings.discordChannelId}` : 'Canal Discord: não vinculado';
    setStatus(data.settings?.discordChannelId ? 'Canal vinculado.' : 'Vínculo removido.', 'ok');
  }
  async function send() {
    const content = inputEl.value.trim();
    if (!content) return setStatus('Digite uma mensagem.', 'err');
    setStatus('Enviando mensagem...');
    await VoidArena.request(`/api/bridge/${encodeURIComponent(key)}/messages`, { method: 'POST', body: JSON.stringify({ content }) });
    inputEl.value = '';
    await load();
    setStatus('Mensagem enviada.', 'ok');
  }
  linkBtn.addEventListener('click', link);
  refreshBtn.addEventListener('click', load);
  sendBtn.addEventListener('click', send);
  inputEl.addEventListener('keydown', (event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(); } });
  VoidArena.bootLayout(active).then(load).catch((error) => setStatus(`❌ ${error.message}`, 'err'));
}());
