(() => {
  'use strict';

  const key = 'chat';
  const $ = (selector, root = document) => root?.querySelector?.(selector) || null;
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
  const historySearchEl = $('#bridgeHistorySearch');
  const messageCountEl = $('#bridgeMessageCount');
  const characterCountEl = $('#bridgeCharacterCount');
  const connectionBadgeEl = $('#bridgeConnectionBadge');
  const composeEl = $('.va-bridge-compose');

  let mentionData = { members: [], roles: [], channels: [], expectedMemberCount: 0, complete: true };
  let mentionMenu = null;
  let mentionFilter = 'all';
  let mentionQuery = '';
  let historyQuery = '';
  let messages = [];
  let historyBefore = '';
  let selectedDiscordChannelId = '';
  let selectedDiscordChannelName = '';
  let loading = false;
  let hasLoadedOnce = false;

  function esc(value = '') {
    return String(value).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[char]));
  }

  function normalize(value = '') {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR')
      .trim();
  }

  function safeMediaUrl(value = '') {
    const url = String(value || '').trim();
    return /^(https?:\/\/|\/)/i.test(url) ? url : '';
  }

  function setStatus(message, type = '') {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.className = `va-status va-bridge-status ${type}`.trim();
  }

  function setConnectionState(connected, label = '') {
    if (!connectionBadgeEl) return;
    connectionBadgeEl.classList.toggle('connected', Boolean(connected));
    const text = $('span', connectionBadgeEl);
    if (text) text.textContent = connected ? (label || 'Canal vinculado') : 'Aguardando canal';
  }

  function requestId() {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
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

  function syncActionState() {
    const selectedValue = channelEl?.value || '';
    if (linkBtn) linkBtn.disabled = loading || !selectedValue || selectedValue === selectedDiscordChannelId;
    if (sendBtn) sendBtn.disabled = loading || !selectedDiscordChannelId || !(inputEl?.value || '').trim();
    if (mentionBtn) mentionBtn.disabled = loading || !selectedDiscordChannelId;
    if (refreshBtn) refreshBtn.disabled = loading;
    if (refreshBtn2) refreshBtn2.disabled = loading;
  }

  function renderChannels(channels = [], selected = '') {
    if (!channelEl) return;
    const usable = channels
      .filter(isTextChannel)
      .sort((a, b) => channelLabel(a).localeCompare(channelLabel(b), 'pt-BR'));
    channelEl.innerHTML = '<option value="">Selecionar canal de texto ou anúncios</option>' + usable
      .map((channel) => `<option value="${esc(channel.id)}">${esc(channelLabel(channel))}</option>`)
      .join('');
    channelEl.value = selected || '';
    channelEl.disabled = usable.length === 0 || loading;
    syncActionState();
  }

  function attachmentHtml(attachments = []) {
    return attachments
      .filter((item) => safeMediaUrl(item.proxyUrl || item.url))
      .map((item) => {
        const url = safeMediaUrl(item.proxyUrl || item.url);
        const name = esc(item.name || 'arquivo');
        const type = String(item.contentType || '').toLowerCase();
        if (type.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(name)) {
          return `<a class="va-bridge-attachment image" href="${esc(url)}" target="_blank" rel="noreferrer"><img src="${esc(url)}" alt="${name}" loading="lazy"></a>`;
        }
        return `<a class="va-bridge-attachment file" href="${esc(url)}" target="_blank" rel="noreferrer">📎 ${name}</a>`;
      }).join('');
  }

  function mentionItems() {
    const roles = (mentionData.roles || []).map((item) => ({
      label: item.name || 'Cargo',
      value: item.mention || `<@&${item.id}>`,
      type: 'cargo',
      category: 'roles',
      group: 'Cargos',
      icon: '@'
    }));
    const members = (mentionData.members || []).map((item) => ({
      label: item.name || item.username || 'Membro',
      value: item.mention || `<@${item.id}>`,
      type: item.isBot ? 'bot' : 'membro',
      category: 'members',
      group: 'Membros',
      icon: '@',
      avatar: safeMediaUrl(item.avatarUrl || item.avatar || item.authorAvatar)
    }));
    const channels = (mentionData.channels || []).filter(isTextChannel).map((item) => ({
      label: item.displayName || item.name || 'canal',
      value: `<#${item.id}>`,
      type: 'canal',
      category: 'channels',
      group: 'Canais',
      icon: '#'
    }));
    const calls = (mentionData.channels || []).filter(isVoiceChannel).map((item) => ({
      label: item.displayName || item.name || 'call',
      value: `<#${item.id}>`,
      type: 'call',
      category: 'calls',
      group: 'Calls',
      icon: '◖'
    }));
    return [...roles, ...members, ...channels, ...calls];
  }

  function renderText(content = '') {
    let output = esc(content);
    for (const item of mentionItems()) {
      const raw = esc(item.value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      output = output.replace(new RegExp(raw, 'g'), `<span class="va-mention-token">${esc(item.icon)} ${esc(item.label)}</span>`);
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

  function messageAvatar(message = {}) {
    const avatar = safeMediaUrl(message.authorAvatar || message.authorAvatarUrl || message.avatarUrl);
    const author = String(message.authorName || 'Discord').trim();
    const initial = author.charAt(0).toLocaleUpperCase('pt-BR') || 'D';
    return avatar
      ? `<span class="va-bridge-avatar"><img src="${esc(avatar)}" alt="" loading="lazy"></span>`
      : `<span class="va-bridge-avatar" aria-hidden="true">${esc(initial)}</span>`;
  }

  function dateInfo(value = '') {
    const date = new Date(value || 0);
    if (!value || Number.isNaN(date.getTime())) return { compact: '', complete: '' };
    return {
      compact: date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
      complete: date.toLocaleString('pt-BR')
    };
  }

  function visibleMessages() {
    const query = normalize(historyQuery);
    if (!query) return messages;
    return messages.filter((message) => normalize(`${message.authorName || ''} ${message.content || ''}`).includes(query));
  }

  function updateMessageCount(visible = messages.length) {
    if (!messageCountEl) return;
    messageCountEl.textContent = historyQuery
      ? `${visible} de ${messages.length}`
      : `${messages.length} ${messages.length === 1 ? 'mensagem' : 'mensagens'}`;
  }

  function renderMessages({ forceBottom = false, resetScroll = false } = {}) {
    if (!messagesEl) return;
    messages = normalizeMessages(messages);
    const list = visibleMessages();
    const previousTop = messagesEl.scrollTop;
    const previousHeight = messagesEl.scrollHeight;
    const wasNearBottom = previousHeight - previousTop - messagesEl.clientHeight < 90;

    messagesEl.innerHTML = list.length ? list.map((message) => {
      const date = dateInfo(message.createdAt);
      const sourceLabel = message.isBot ? 'Enviada pelo BOT' : 'Recebida do Discord';
      const sourceClass = message.isBot ? 'bot' : esc(message.source || 'discord');
      return `
        <article class="va-bridge-msg ${sourceClass}" data-message-id="${esc(message.id || '')}" data-discord-message-id="${esc(message.discordMessageId || '')}" data-discord-channel-id="${esc(message.discordChannelId || selectedDiscordChannelId)}">
          <div class="va-bridge-msg-head">
            <div class="va-bridge-author">
              ${messageAvatar(message)}
              <div class="va-bridge-author-copy">
                <strong>${esc(message.authorName || 'Discord')}${messageBadges(message)}</strong>
                <small>${sourceLabel}${message.editedAt ? ' · editada' : ''}</small>
              </div>
            </div>
            <time class="va-bridge-time" datetime="${esc(message.createdAt || '')}" title="${esc(date.complete)}">${esc(date.compact)}</time>
          </div>
          <div class="va-bridge-msg-content">${renderText(message.content || '')}</div>
          ${attachmentHtml(message.attachments || [])}
          ${message.editable ? '<div class="va-bridge-msg-actions"><button class="va-btn secondary" type="button" data-edit-discord-message>Editar mensagem do BOT</button></div>' : ''}
        </article>
      `;
    }).join('') : `
      <div class="va-bridge-empty">
        <div class="hnl-empty-state">
          <i>${historyQuery ? '⌕' : '💬'}</i>
          <strong>${historyQuery ? 'Nenhuma mensagem encontrada' : 'O histórico está vazio'}</strong>
          <span>${historyQuery ? 'Tente buscar por outro nome ou trecho da mensagem.' : 'Vincule um canal ou aguarde novas mensagens do Discord.'}</span>
        </div>
      </div>`;

    updateMessageCount(list.length);
    if (resetScroll) messagesEl.scrollTop = 0;
    else if (forceBottom || wasNearBottom || !hasLoadedOnce) messagesEl.scrollTop = messagesEl.scrollHeight;
    else messagesEl.scrollTop = previousTop + Math.max(0, messagesEl.scrollHeight - previousHeight);
  }

  function closeMentionMenu() {
    if (mentionMenu) mentionMenu.hidden = true;
  }

  function insertMention(value) {
    if (!inputEl) return;
    const start = inputEl.selectionStart || inputEl.value.length;
    const end = inputEl.selectionEnd || start;
    const before = inputEl.value.slice(0, start);
    const after = inputEl.value.slice(end);
    const spacer = before && !/\s$/.test(before) ? ' ' : '';
    inputEl.value = `${before}${spacer}${value} ${after}`;
    inputEl.focus();
    updateComposer();
    closeMentionMenu();
  }

  function mentionIcon(item = {}) {
    return item.avatar
      ? `<i><img src="${esc(item.avatar)}" alt="" loading="lazy"></i>`
      : `<i aria-hidden="true">${esc(item.icon)}</i>`;
  }

  function renderMentionMenu(keepSearchFocus = false) {
    if (!mentionMenu) return;
    const allItems = mentionItems();
    const query = normalize(mentionQuery);
    const filtered = allItems.filter((item) => {
      const categoryMatch = mentionFilter === 'all' || item.category === mentionFilter;
      const queryMatch = !query || normalize(`${item.label} ${item.type}`).includes(query);
      return categoryMatch && queryMatch;
    });
    const tabs = [
      ['all', 'Todos'],
      ['roles', 'Cargos'],
      ['members', 'Membros'],
      ['channels', 'Canais'],
      ['calls', 'Calls']
    ];
    const groups = ['Cargos', 'Membros', 'Canais', 'Calls'];
    const results = filtered.length ? groups.map((group) => {
      const list = filtered.filter((item) => item.group === group);
      if (!list.length) return '';
      return `<div class="va-mention-group"><span>${group} · ${list.length}</span>${list.map((item) => `
        <button class="va-mention-option" type="button" data-value="${esc(item.value)}">
          ${mentionIcon(item)}<b>${esc(item.label)}</b><small>${esc(item.type)}</small>
        </button>
      `).join('')}</div>`;
    }).join('') : '<div class="va-mention-empty">Nenhum resultado para essa busca.</div>';

    mentionMenu.innerHTML = `
      <div class="va-mention-head"><strong>Inserir menção</strong><button class="va-mention-close" type="button" data-mention-close aria-label="Fechar">×</button></div>
      <input class="va-mention-search" type="search" data-mention-search value="${esc(mentionQuery)}" placeholder="Buscar membro, cargo, canal ou call..." autocomplete="off">
      <div class="va-mention-tabs">${tabs.map(([value, label]) => {
        const actualCount = value === 'all' ? allItems.length : allItems.filter((item) => item.category === value).length;
        const count = value === 'members' && mentionData.expectedMemberCount > actualCount
          ? `${actualCount}/${mentionData.expectedMemberCount}`
          : actualCount;
        return `<button class="va-mention-tab ${mentionFilter === value ? 'active' : ''}" type="button" data-mention-filter="${value}">${label} · ${count}</button>`;
      }).join('')}</div>
      <div class="va-mention-results">${results}</div>`;

    if (keepSearchFocus) {
      requestAnimationFrame(() => {
        const search = $('[data-mention-search]', mentionMenu);
        if (!search) return;
        search.focus();
        search.setSelectionRange(search.value.length, search.value.length);
      });
    }
  }

  function showMentions() {
    if (!composeEl) return;
    if (!mentionMenu) {
      mentionMenu = document.createElement('div');
      mentionMenu.className = 'va-mention-menu';
      composeEl.appendChild(mentionMenu);
    }
    mentionFilter = 'all';
    mentionQuery = '';
    renderMentionMenu();
    mentionMenu.hidden = false;
    requestAnimationFrame(() => $('[data-mention-search]', mentionMenu)?.focus());
  }

  async function refreshMentions() {
    const data = await request(`/api/bridge/${key}/mentions?t=${Date.now()}`);
    mentionData = {
      members: data.members || [],
      roles: data.roles || [],
      channels: data.channels || mentionData.channels || [],
      expectedMemberCount: Number(data.expectedMemberCount || (data.members || []).length),
      complete: data.complete !== false
    };
  }

  function applyHistory(data = {}, replace = true, forceBottom = false) {
    const incoming = Array.isArray(data.messages) ? data.messages : [];
    messages = replace ? incoming : [...incoming, ...messages];
    historyBefore = String(data.before || '');
    if (loadOlderBtn) {
      loadOlderBtn.hidden = !historyBefore;
      loadOlderBtn.disabled = loading || !historyBefore;
    }
    renderMessages({ forceBottom });
  }

  function updateComposer() {
    const length = inputEl?.value?.length || 0;
    if (characterCountEl) {
      characterCountEl.textContent = `${length}/2000`;
      characterCountEl.classList.toggle('near-limit', length >= 1800);
    }
    syncActionState();
  }

  async function load({ silent = false, forceBottom = false } = {}) {
    if (loading) return;
    loading = true;
    syncActionState();
    if (!silent) setStatus('Carregando canais, cargos, calls e histórico real do Discord...');
    try {
      const data = await request(`/api/bridge/${key}/state?t=${Date.now()}`);
      mentionData = {
        members: data.mentions?.members || [],
        roles: data.mentions?.roles || [],
        channels: data.channels || data.mentions?.channels || [],
        expectedMemberCount: Number(data.diagnostics?.expectedMembers || (data.mentions?.members || []).length),
        complete: data.diagnostics?.memberCatalogComplete !== false
      };
      if (titleEl) titleEl.textContent = data.bridge?.title || 'Chat Discord';
      selectedDiscordChannelId = data.settings?.discordChannelId || '';
      selectedDiscordChannelName = data.settings?.discordChannelName || '';
      if (subtitleEl) {
        subtitleEl.textContent = selectedDiscordChannelId
          ? `Canal Discord vinculado: ${selectedDiscordChannelName || selectedDiscordChannelId}`
          : 'Canal Discord: não vinculado';
      }
      setConnectionState(Boolean(selectedDiscordChannelId), selectedDiscordChannelName);
      renderChannels(mentionData.channels, selectedDiscordChannelId);
      applyHistory(data.history || { messages: data.messages || [], before: '' }, true, forceBottom || !hasLoadedOnce);
      hasLoadedOnce = true;

      const errors = data.diagnostics?.errors || [];
      const loadedMembers = Number(data.diagnostics?.members || 0);
      const expectedMembers = Math.max(Number(data.diagnostics?.expectedMembers || 0), loadedMembers);
      const memberLabel = expectedMembers > loadedMembers
        ? `${loadedMembers} de ${expectedMembers} membros`
        : `${loadedMembers} membros`;
      if (errors.length) setStatus(`❌ ${errors.join(' | ')}`, 'err');
      else if (!silent) {
        setStatus(
          `Pronto: ${data.diagnostics?.channels || 0} canais/calls, ${data.diagnostics?.roles || 0} cargos, ${memberLabel} e ${messages.length} mensagens carregadas.`,
          selectedDiscordChannelId ? 'ok' : ''
        );
      }
    } finally {
      loading = false;
      if (channelEl) channelEl.disabled = mentionData.channels.filter(isTextChannel).length === 0;
      if (loadOlderBtn) loadOlderBtn.disabled = !historyBefore;
      updateComposer();
    }
  }

  async function loadOlder() {
    if (!selectedDiscordChannelId || !historyBefore) return;
    if (loadOlderBtn) loadOlderBtn.disabled = true;
    try {
      setStatus('Carregando mensagens mais antigas...');
      const data = await request(`/api/bridge/${key}/history?before=${encodeURIComponent(historyBefore)}&limit=250&t=${Date.now()}`);
      applyHistory(data.history || {}, false, false);
      setStatus(`${messages.length} mensagem(ns) disponíveis no painel.`, 'ok');
    } finally {
      if (loadOlderBtn) loadOlderBtn.disabled = !historyBefore;
    }
  }

  async function link() {
    if (!channelEl?.value) return setStatus('Selecione um canal de texto.', 'err');
    if (linkBtn) {
      linkBtn.disabled = true;
      linkBtn.textContent = 'Vinculando...';
    }
    try {
      setStatus('Vinculando canal e consultando o histórico real do Discord...');
      await request(`/api/bridge/${key}/link`, {
        method: 'PUT',
        body: JSON.stringify({ discordChannelId: channelEl.value })
      });
      await load({ silent: true, forceBottom: true });
      setStatus('Canal vinculado. O histórico foi carregado sem reenviar mensagens.', 'ok');
    } finally {
      if (linkBtn) linkBtn.textContent = 'Vincular canal';
      syncActionState();
    }
  }

  async function send() {
    const content = inputEl?.value.trim() || '';
    if (!content) return setStatus('Digite uma mensagem.', 'err');
    if (!selectedDiscordChannelId) return setStatus('Vincule um canal antes de enviar.', 'err');
    const idempotencyKey = requestId();
    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.textContent = 'Enviando...';
    }
    try {
      setStatus('Enviando uma única mensagem manual pelo BOT...');
      await request(`/api/bridge/${key}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content, requestId: idempotencyKey })
      });
      inputEl.value = '';
      updateComposer();
      await load({ silent: true, forceBottom: true });
      setStatus('Mensagem enviada e confirmada pelo Discord.', 'ok');
    } finally {
      if (sendBtn) sendBtn.textContent = 'Enviar como BOT';
      updateComposer();
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
    await load({ silent: true, forceBottom: false });
    setStatus('Mensagem do BOT editada sem criar outra mensagem.', 'ok');
  }

  async function safe(action) {
    try {
      await action();
    } catch (error) {
      setStatus(`❌ ${error.message}`, 'err');
    }
  }

  channelEl?.addEventListener('change', syncActionState);
  historySearchEl?.addEventListener('input', () => {
    historyQuery = historySearchEl.value;
    renderMessages({ resetScroll: true });
  });
  inputEl?.addEventListener('input', updateComposer);
  linkBtn?.addEventListener('click', () => safe(link));
  refreshBtn?.addEventListener('click', () => safe(() => load({ forceBottom: false })));
  refreshBtn2?.addEventListener('click', () => safe(() => load({ forceBottom: false })));
  loadOlderBtn?.addEventListener('click', () => safe(loadOlder));
  sendBtn?.addEventListener('click', () => safe(send));
  mentionBtn?.addEventListener('click', () => safe(async () => {
    if (!mentionItems().length) await refreshMentions();
    showMentions();
  }));

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

  document.addEventListener('input', (event) => {
    if (!event.target.matches('[data-mention-search]')) return;
    mentionQuery = event.target.value;
    renderMentionMenu(true);
  });

  document.addEventListener('click', (event) => {
    const mentionOption = event.target.closest('.va-mention-option');
    if (mentionOption) {
      insertMention(mentionOption.dataset.value || '');
      return;
    }
    const filter = event.target.closest('[data-mention-filter]');
    if (filter) {
      mentionFilter = filter.dataset.mentionFilter || 'all';
      renderMentionMenu();
      return;
    }
    if (event.target.closest('[data-mention-close]')) {
      closeMentionMenu();
      return;
    }
    if (!event.target.closest('.va-bridge-compose')) closeMentionMenu();
  });

  updateComposer();
  safe(() => load({ forceBottom: true }));
  setInterval(() => {
    if (!document.hidden && !document.querySelector('.va-bridge-edit-box')) safe(() => load({ silent: true }));
  }, 15000);
})();
