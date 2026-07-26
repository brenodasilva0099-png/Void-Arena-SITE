(() => {
  'use strict';

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
  const mentionBtn = $('#bridgeMentionBtn');
  const loadOlderBtn = $('#bridgeLoadOlderBtn');
  const composeEl = $('.va-bridge-compose');

  let mentionData = { members: [], roles: [], channels: [] };
  let mentionMenu = null;
  let messages = [];
  let historyBefore = '';
  let selectedDiscordChannelId = '';
  let loading = false;

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

  function requestId() {
    if (crypto?.randomUUID) return crypto.randomUUID();
    return `manual_${Date.now()}_${Math.random().toString(16).slice(2)}`;
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
    if (response.status === 403) throw new Error(data.message || 'Somente administradores podem controlar o BOT.');
    if (!response.ok || data.success === false) throw new Error(data.message || `Falha na ponte (${response.status}).`);
    return data;
  }

  function isTextChannel(channel = {}) {
    return channel.canBridge === true || ['text', 'announcement'].includes(String(channel.kind || '').toLowerCase());
  }

  function isVoiceChannel(channel = {}) {
    return ['voice', 'stage'].includes(String(channel.kind || '').toLowerCase());
  }

  function channelLabel(channel = {}) {
    const icon = isVoiceChannel(channel) ? '🔊' : channel.kind === 'announcement' ? '📢' : '#';
    return `${icon} ${channel.displayName || channel.name || 'canal'} — ${channel.typeName || channel.kind || 'Texto'}`;
  }

  function renderChannels(channels = [], selected = '') {
    const usable = channels.filter(isTextChannel);
    channelEl.innerHTML = '<option value="">Selecionar canal de texto ou anúncios</option>' + usable
      .map((channel) => `<option value="${esc(channel.id)}">${esc(channelLabel(channel))}</option>`)
      .join('');
    channelEl.value = selected || '';
    channelEl.disabled = usable.length === 0;
    selectedDiscordChannelId = channelEl.value;
    linkBtn.disabled = usable.length === 0 || !channelEl.value;
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
      label: item.name || 'Cargo', value: item.mention || `<@&${item.id}>`, type: 'role', group: 'Cargos', icon: '@'
    }));
    const members = (mentionData.members || []).map((item) => ({
      label: item.name || item.username || 'Usuário', value: item.mention || `<@${item.id}>`, type: 'member', group: 'Usuários', icon: '@'
    }));
    const channels = (mentionData.channels || []).filter(isTextChannel).map((item) => ({
      label: item.displayName || item.name || 'canal', value: `<#${item.id}>`, type: 'channel', group: 'Canais', icon: '#'
    }));
    const calls = (mentionData.channels || []).filter(isVoiceChannel).map((item) => ({
      label: item.displayName || item.name || 'call', value: `<#${item.id}>`, type: 'voice', group: 'Calls', icon: '🔊'
    }));
    return [...roles, ...members, ...channels, ...calls];
  }

  function renderText(content = '') {
    let output = esc(content);
    for (const item of mentionItems()) {
      const raw = esc(item.value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      output = output.replace(new RegExp(raw, 'g'), `<span class="va-mention-token">${item.icon}${esc(item.label)}</span>`);
    }
    return output;
  }

  function normalizeMessages(items = []) {
    const byId = new Map();
    for (const message of items) {
      const id = String(message.discordMessageId || message.id || '');
      if (id) byId.set(id, message);
    }
    return Array.from(byId.values()).sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  }

  function messageBadges(message = {}) {
    return `${message.isBot ? '<span class="va-bridge-bot-badge">BOT</span>' : ''}${message.isCommand ? '<span class="va-bridge-command-badge">COMANDO</span>' : ''}`;
  }

  function renderMessages() {
    messages = normalizeMessages(messages);
    messagesEl.innerHTML = messages.length ? messages.map((message) => `
      <article class="va-bridge-msg ${message.isBot ? 'bot' : esc(message.source || 'discord')}" data-message-id="${esc(message.id || '')}" data-discord-message-id="${esc(message.discordMessageId || '')}" data-discord-channel-id="${esc(message.discordChannelId || selectedDiscordChannelId)}">
        <strong>${esc(message.authorName || 'Discord')}${messageBadges(message)}</strong>
        <div class="va-bridge-msg-content">${renderText(message.content || '')}</div>
        ${attachmentHtml(message.attachments || [])}
        <small class="va-muted">${message.isBot ? 'BOT' : 'Discord'} • ${message.createdAt ? new Date(message.createdAt).toLocaleString('pt-BR') : ''}${message.editedAt ? ' • editada' : ''}</small>
        ${message.editable ? '<div class="va-bridge-msg-actions"><button class="va-btn secondary" type="button" data-edit-discord-message>Editar mensagem do BOT</button></div>' : ''}
      </article>
    `).join('') : '<div class="va-bridge-empty">Nenhuma mensagem encontrada neste canal.</div>';
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
    const groups = ['Cargos', 'Usuários', 'Canais', 'Calls'];
    mentionMenu.innerHTML = items.length ? groups.map((group) => {
      const list = items.filter((item) => item.group === group);
      if (!list.length) return '';
      return `<div class="va-mention-group"><span>${group}</span>${list.map((item) => `
        <button class="va-mention-option" type="button" data-value="${esc(item.value)}">
          <i>${esc(item.icon)}</i><b>${esc(item.label)}</b><small>${esc(item.type)}</small>
        </button>
      `).join('')}</div>`;
    }).join('') : '<div class="va-mention-empty">Nenhum cargo, usuário, canal ou call disponível.</div>';
    mentionMenu.hidden = false;
  }

  async function refreshMentions() {
    const data = await request(`/api/bridge/${key}/mentions?t=${Date.now()}`);
    mentionData = { members: data.members || [], roles: data.roles || [], channels: data.channels || [] };
  }

  function applyHistory(data = {}, replace = true) {
    const incoming = Array.isArray(data.messages) ? data.messages : [];
    messages = replace ? incoming : [...incoming, ...messages];
    historyBefore = String(data.before || '');
    loadOlderBtn.hidden = !historyBefore;
    loadOlderBtn.disabled = !historyBefore;
    renderMessages();
  }

  async function load() {
    if (loading) return;
    loading = true;
    setStatus('Carregando canais, cargos, calls e histórico real do Discord...');
    try {
      const data = await request(`/api/bridge/${key}/state?t=${Date.now()}`);
      mentionData = {
        members: data.mentions?.members || [],
        roles: data.mentions?.roles || [],
        channels: data.channels || data.mentions?.channels || []
      };
      titleEl.textContent = data.bridge?.title || 'Chat Discord';
      selectedDiscordChannelId = data.settings?.discordChannelId || '';
      subtitleEl.textContent = selectedDiscordChannelId
        ? `Canal Discord vinculado: ${data.settings?.discordChannelName || selectedDiscordChannelId}`
        : 'Canal Discord: não vinculado';
      renderChannels(mentionData.channels, selectedDiscordChannelId);
      applyHistory(data.history || { messages: data.messages || [], before: '' }, true);

      const errors = data.diagnostics?.errors || [];
      if (errors.length) setStatus(`❌ ${errors.join(' | ')}`, 'err');
      else setStatus(`Pronto: ${data.diagnostics?.channels || 0} canais/calls, ${data.diagnostics?.roles || 0} cargos, ${data.diagnostics?.members || 0} usuários e ${messages.length} mensagens carregadas.`, selectedDiscordChannelId ? 'ok' : '');
    } finally {
      loading = false;
    }
  }

  async function loadOlder() {
    if (!selectedDiscordChannelId || !historyBefore) return;
    loadOlderBtn.disabled = true;
    try {
      setStatus('Carregando mensagens mais antigas...');
      const data = await request(`/api/bridge/${key}/history?before=${encodeURIComponent(historyBefore)}&limit=250&t=${Date.now()}`);
      applyHistory(data.history || {}, false);
      setStatus(`${messages.length} mensagem(ns) disponíveis no painel.`, 'ok');
    } finally {
      loadOlderBtn.disabled = !historyBefore;
    }
  }

  async function link() {
    if (!channelEl.value) return setStatus('Selecione um canal de texto.', 'err');
    setStatus('Vinculando canal e consultando o histórico real do Discord...');
    await request(`/api/bridge/${key}/link`, {
      method: 'PUT',
      body: JSON.stringify({ discordChannelId: channelEl.value })
    });
    await load();
    setStatus('Canal vinculado. Nenhuma mensagem foi reenviada; o painel apenas carregou o histórico.', 'ok');
  }

  async function send() {
    const content = inputEl.value.trim();
    if (!content) return setStatus('Digite uma mensagem.', 'err');
    if (!selectedDiscordChannelId) return setStatus('Vincule um canal antes de enviar.', 'err');
    sendBtn.disabled = true;
    const idempotencyKey = requestId();
    try {
      setStatus('Enviando uma única mensagem manual pelo BOT...');
      await request(`/api/bridge/${key}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content, requestId: idempotencyKey })
      });
      inputEl.value = '';
      await load();
      setStatus('Mensagem enviada manualmente e confirmada pelo Discord.', 'ok');
    } finally {
      sendBtn.disabled = false;
    }
  }

  function openEdit(article) {
    if (!article || article.querySelector('.va-bridge-edit-box')) return;
    const contentEl = article.querySelector('.va-bridge-msg-content');
    const actionsEl = article.querySelector('.va-bridge-msg-actions');
    const original = messages.find((item) => String(item.discordMessageId || item.id) === String(article.dataset.discordMessageId || article.dataset.messageId));
    const box = document.createElement('div');
    box.className = 'va-bridge-edit-box';
    box.innerHTML = `<textarea maxlength="2000">${esc(original?.content || contentEl?.textContent || '')}</textarea><div class="va-bridge-edit-actions"><button class="va-btn secondary" type="button" data-edit-cancel>Cancelar</button><button class="va-btn primary" type="button" data-edit-save>Salvar edição</button></div>`;
    actionsEl?.after(box);
    box.querySelector('textarea')?.focus();
  }

  async function saveEdit(article) {
    const box = article.querySelector('.va-bridge-edit-box');
    const content = box?.querySelector('textarea')?.value.trim() || '';
    if (!content) return setStatus('A mensagem editada não pode ficar vazia.', 'err');
    const discordMessageId = article.dataset.discordMessageId || '';
    const discordChannelId = article.dataset.discordChannelId || selectedDiscordChannelId;
    const localMessageId = article.dataset.messageId || '';
    setStatus('Editando a mensagem existente do BOT...');
    await request(`/api/bridge/${key}/messages/${encodeURIComponent(localMessageId || discordMessageId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ discordMessageId, discordChannelId, content, requestId: requestId() })
    });
    await load();
    setStatus('Mensagem do BOT editada sem criar uma nova mensagem.', 'ok');
  }

  async function safe(action) {
    try { await action(); }
    catch (error) { setStatus(`❌ ${error.message}`, 'err'); }
  }

  channelEl?.addEventListener('change', () => {
    selectedDiscordChannelId = channelEl.value;
    linkBtn.disabled = !selectedDiscordChannelId;
  });
  linkBtn?.addEventListener('click', () => safe(link));
  refreshBtn?.addEventListener('click', () => safe(load));
  refreshBtn2?.addEventListener('click', () => safe(load));
  loadOlderBtn?.addEventListener('click', () => safe(loadOlder));
  sendBtn?.addEventListener('click', () => safe(send));
  mentionBtn?.addEventListener('click', () => safe(async () => {
    if (!mentionItems().length) await refreshMentions();
    showMentions();
  }));
  mentionMenu?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-value]');
    if (button) insertMention(button.dataset.value || '');
  });
  inputEl?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      safe(send);
    }
  });
  messagesEl?.addEventListener('click', (event) => {
    const article = event.target.closest('.va-bridge-msg');
    if (!article) return;
    if (event.target.closest('[data-edit-discord-message]')) openEdit(article);
    if (event.target.closest('[data-edit-cancel]')) article.querySelector('.va-bridge-edit-box')?.remove();
    if (event.target.closest('[data-edit-save]')) safe(() => saveEdit(article));
  });
  document.addEventListener('click', (event) => {
    const mentionOption = event.target.closest('.va-mention-option');
    if (mentionOption) insertMention(mentionOption.dataset.value || '');
    else if (!event.target.closest('.va-bridge-compose')) closeMentionMenu();
  });

  safe(load);
  setInterval(() => {
    if (!document.hidden && !document.querySelector('.va-bridge-edit-box')) safe(load);
  }, 15000);
})();
