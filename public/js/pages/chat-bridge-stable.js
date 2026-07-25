(() => {
  const key = 'chat';
  const $ = (selector) => document.querySelector(selector);
  const titleEl = $('#bridgeTitle');
  const subtitleEl = $('#bridgeSubtitle');
  const channelEl = $('#bridgeChannel');
  const messagesEl = $('#bridgeMessages');
  const statusEl = $('#bridgeStatus');
  const inputEl = $('#bridgeInput');
  const sendBtn = $('#bridgeSendBtn');
  const linkBtn = $('#bridgeLinkBtn');
  const refreshBtn = $('#bridgeRefreshBtn');
  const refreshBtn2 = $('#bridgeRefreshBtn2');
  const mentionBtn = Array.from(document.querySelectorAll('.va-bridge-compose .va-btn.secondary')).find((button) => /marcar/i.test(button.textContent || ''));
  const composeEl = $('.va-bridge-compose');

  let mentionData = { members: [], roles: [] };
  let mentionMenu = null;

  function esc(value = '') {
    return String(value).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[char]));
  }

  function setStatus(message, type = '') {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.className = `va-status va-bridge-status ${type}`.trim();
  }

  async function request(url, options = {}) {
    const response = await fetch(url, {
      credentials: 'same-origin',
      cache: 'no-store',
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {})
      }
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) {
      const next = `${location.pathname}${location.search}${location.hash}`;
      location.href = `/pages/login.html?next=${encodeURIComponent(next)}`;
      throw new Error('Faça login para continuar.');
    }
    if (!response.ok || data.success === false) {
      throw new Error(data.message || `Falha na ponte (${response.status}).`);
    }
    return data;
  }

  function channelLabel(channel = {}) {
    return `${channel.displayName || channel.name || 'canal'} — ${channel.typeName || channel.kind || 'Texto'}`;
  }

  function renderChannels(channels = [], selected = '') {
    const usable = channels.filter((channel) => channel.canBridge || ['text', 'announcement'].includes(channel.kind));
    channelEl.innerHTML = '<option value="">Selecionar canal de texto</option>' + usable
      .map((channel) => `<option value="${esc(channel.id)}">${esc(channelLabel(channel))}</option>`)
      .join('');
    channelEl.value = selected || '';
  }

  function attachmentHtml(attachments = []) {
    return attachments.filter((item) => item.url || item.proxyUrl).map((item) => {
      const url = item.proxyUrl || item.url;
      const name = esc(item.name || 'arquivo');
      const type = String(item.contentType || '').toLowerCase();
      if (type.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(name)) {
        return `<a class="va-bridge-attachment image" href="${esc(url)}" target="_blank" rel="noreferrer"><img src="${esc(url)}" alt="${name}"></a>`;
      }
      return `<a class="va-bridge-attachment file" href="${esc(url)}" target="_blank" rel="noreferrer">📎 ${name}</a>`;
    }).join('');
  }

  function mentionItems() {
    const roles = (mentionData.roles || []).map((item) => ({
      label: item.name || 'Cargo', value: item.mention || `<@&${item.id}>`, type: 'Cargo'
    }));
    const members = (mentionData.members || []).map((item) => ({
      label: item.name || item.username || 'Usuário', value: item.mention || `<@${item.id}>`, type: 'Usuário'
    }));
    return [...roles, ...members];
  }

  function renderText(content = '') {
    let output = esc(content);
    for (const item of mentionItems()) {
      const raw = esc(item.value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      output = output.replace(new RegExp(raw, 'g'), `<span class="va-mention-token">@${esc(item.label)}</span>`);
    }
    return output;
  }

  function renderMessages(messages = []) {
    messagesEl.innerHTML = messages.length ? messages.map((message) => `
      <article class="va-bridge-msg ${esc(message.source || 'site')}">
        <strong>${esc(message.authorName || 'Hollow Nexus')}</strong>
        ${message.content ? `<div>${renderText(message.content)}</div>` : ''}
        ${attachmentHtml(message.attachments || [])}
        <small class="va-muted">${esc(message.source || 'site')} • ${message.createdAt ? new Date(message.createdAt).toLocaleString('pt-BR') : ''}</small>
      </article>
    `).join('') : '<div class="va-bridge-empty">Nenhuma mensagem ainda.</div>';
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function closeMentionMenu() {
    if (mentionMenu) mentionMenu.hidden = true;
  }

  function insertMention(value) {
    const start = inputEl.selectionStart || inputEl.value.length;
    const end = inputEl.selectionEnd || start;
    const before = inputEl.value.slice(0, start);
    const after = inputEl.value.slice(end);
    const spacer = before && !/\s$/.test(before) ? ' ' : '';
    inputEl.value = `${before}${spacer}${value} ${after}`;
    inputEl.focus();
    closeMentionMenu();
  }

  function showMentions() {
    if (!mentionMenu) {
      mentionMenu = document.createElement('div');
      mentionMenu.className = 'va-mention-menu';
      composeEl.appendChild(mentionMenu);
    }
    const items = mentionItems();
    mentionMenu.innerHTML = items.length ? items.map((item) => `
      <button class="va-mention-option" type="button" data-value="${esc(item.value)}">
        <i>@</i><b>${esc(item.label)}</b><small>${esc(item.type)}</small>
      </button>
    `).join('') : '<div class="va-mention-empty">Nenhum cargo ou usuário disponível.</div>';
    mentionMenu.hidden = false;
    mentionMenu.querySelectorAll('[data-value]').forEach((button) => {
      button.addEventListener('click', () => insertMention(button.dataset.value || ''));
    });
  }

  async function load() {
    setStatus('Carregando ponte Discord ↔ Site...');
    const data = await request(`/api/bridge/${key}/state?t=${Date.now()}`);
    mentionData = data.mentions || mentionData;
    titleEl.textContent = data.bridge?.title || 'Chat';
    subtitleEl.textContent = data.settings?.discordChannelId
      ? `Canal Discord vinculado: ${data.settings.discordChannelId}`
      : 'Canal Discord: não vinculado';
    inputEl.placeholder = data.bridge?.placeholder || 'Enviar mensagem para o Discord...';
    renderChannels(data.channels || [], data.settings?.discordChannelId || '');
    renderMessages(data.messages || []);
    setStatus(data.message || 'Ponte carregada.', data.settings?.discordChannelId ? 'ok' : '');
  }

  async function link() {
    setStatus('Vinculando canal...');
    await request(`/api/bridge/${key}/link`, {
      method: 'PUT',
      body: JSON.stringify({ discordChannelId: channelEl.value })
    });
    await load();
    setStatus(channelEl.value ? 'Canal vinculado.' : 'Vínculo removido.', 'ok');
  }

  async function send() {
    const content = inputEl.value.trim();
    if (!content) return setStatus('Digite uma mensagem.', 'err');
    sendBtn.disabled = true;
    try {
      setStatus('Enviando mensagem...');
      await request(`/api/bridge/${key}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content })
      });
      inputEl.value = '';
      await load();
      setStatus('Mensagem enviada.', 'ok');
    } finally {
      sendBtn.disabled = false;
    }
  }

  async function safe(action) {
    try { await action(); }
    catch (error) { setStatus(`❌ ${error.message}`, 'err'); }
  }

  linkBtn?.addEventListener('click', () => safe(link));
  refreshBtn?.addEventListener('click', () => safe(load));
  refreshBtn2?.addEventListener('click', () => safe(load));
  sendBtn?.addEventListener('click', () => safe(send));
  mentionBtn?.addEventListener('click', showMentions);
  inputEl?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      safe(send);
    }
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.va-bridge-compose')) closeMentionMenu();
  });

  safe(load);
  setInterval(() => {
    if (!document.hidden) safe(load);
  }, 8000);
})();
