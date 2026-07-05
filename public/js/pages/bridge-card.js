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
  const mentionBtn = Array.from(document.querySelectorAll('.va-bridge-compose .va-btn.secondary')).find((btn) => /marcar/i.test(btn.textContent || ''));
  const composeEl = document.querySelector('.va-bridge-compose');
  let mentionData = { members: [], roles: [] };
  let mentionOpen = false;
  let mentionSelectedIndex = 0;

  function esc(value) { return VoidArena.escapeHtml(value || ''); }
  function norm(value = '') { return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
  function setStatus(message, type = '') { statusEl.textContent = message; statusEl.className = `va-status va-bridge-status ${type}`.trim(); }
  function channelLabel(channel = {}) { return `${channel.displayName || channel.name || 'canal'} — ${channel.typeName || channel.kind || 'Texto'}`; }
  function renderChannels(channels = [], selected = '') {
    const usable = channels.filter((channel) => channel.canBridge || ['text', 'announcement'].includes(channel.kind));
    channelEl.innerHTML = '<option value="">Selecionar canal de texto</option>' + usable.map((channel) => `<option value="${esc(channel.id)}">${esc(channelLabel(channel))}</option>`).join('');
    channelEl.value = selected || '';
  }
  function attachmentHtml(attachments = []) {
    const rows = attachments.filter((item) => item.url || item.proxyUrl).map((item) => {
      const url = item.proxyUrl || item.url;
      const type = String(item.contentType || '').toLowerCase();
      const name = esc(item.name || 'arquivo');
      if (type.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(name)) return `<a class="va-bridge-attachment image" href="${esc(url)}" target="_blank" rel="noreferrer"><img src="${esc(url)}" alt="${name}" /></a>`;
      return `<a class="va-bridge-attachment file" href="${esc(url)}" target="_blank" rel="noreferrer">📎 ${name}</a>`;
    });
    return rows.length ? `<div class="va-bridge-attachments">${rows.join('')}</div>` : '';
  }
  function mentionItems() {
    const roles = (mentionData.roles || []).map((item) => ({ ...item, type: 'role', label: item.name || 'Cargo', insert: item.mention || `<@&${item.id}>`, icon: '#', sub: item.guildName || 'Cargo' }));
    const members = (mentionData.members || []).map((item) => ({ ...item, type: 'member', label: item.name || item.username || 'Usuário', insert: item.mention || `<@${item.id}>`, icon: item.avatar ? `<img src="${esc(item.avatar)}" alt="" />` : '@', sub: item.username ? `@${item.username}` : (item.guildName || 'Usuário') }));
    return [...roles, ...members];
  }
  function mentionMap() {
    const map = new Map();
    mentionItems().forEach((item) => map.set(item.insert, item));
    return map;
  }
  function renderContent(content = '') {
    let html = esc(content);
    mentionMap().forEach((item, raw) => {
      const safeRaw = esc(raw).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      html = html.replace(new RegExp(safeRaw, 'g'), `<span class="va-mention-token">@${esc(item.label)}</span>`);
    });
    return html;
  }
  function renderMessages(messages = []) {
    messagesEl.innerHTML = messages.length ? messages.map((msg) => `<article class="va-bridge-msg ${esc(msg.source || 'site')}"><strong>${esc(msg.authorName || 'Void Arena')}</strong>${msg.content ? `<div>${renderContent(msg.content)}</div>` : ''}${attachmentHtml(msg.attachments || [])}<small class="va-muted">${esc(msg.source || 'site')} • ${msg.createdAt ? new Date(msg.createdAt).toLocaleString('pt-BR') : ''}</small></article>`).join('') : '<div class="va-bridge-empty">Nenhuma mensagem ainda. Vincule um canal ou envie uma mensagem por aqui.</div>';
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
  async function loadMentions() {
    const data = await VoidArena.request(`/api/bridge/${encodeURIComponent(key)}/mentions`, { timeoutMs: 9000 });
    mentionData = { members: data.members || [], roles: data.roles || [] };
    return mentionData;
  }
  function getMentionQuery() {
    const pos = inputEl.selectionStart || 0;
    const before = inputEl.value.slice(0, pos);
    const match = before.match(/(^|\s)@([^\s@<>]*)$/);
    if (!match) return null;
    return { query: match[2] || '', start: pos - match[2].length - 1, end: pos };
  }
  function ensureMentionMenu() {
    let menu = document.getElementById('bridgeMentionMenu');
    if (!menu) {
      menu = document.createElement('div');
      menu.id = 'bridgeMentionMenu';
      menu.className = 'va-mention-menu';
      menu.hidden = true;
      composeEl?.appendChild(menu);
    }
    return menu;
  }
  function filteredMentions(forceAll = false) {
    const token = getMentionQuery();
    const q = forceAll ? '' : norm(token?.query || '');
    return mentionItems().filter((item) => !q || norm(`${item.label} ${item.username || ''} ${item.sub || ''}`).includes(q)).slice(0, 30);
  }
  function renderMentionMenu(forceAll = false, loading = false) {
    const menu = ensureMentionMenu();
    mentionOpen = true;
    if (loading) {
      menu.hidden = false;
      menu.innerHTML = '<div class="va-mention-empty">Carregando usuários e cargos do Discord...</div>';
      return;
    }
    const items = filteredMentions(forceAll);
    mentionSelectedIndex = Math.min(mentionSelectedIndex, Math.max(0, items.length - 1));
    if (!items.length) {
      menu.hidden = false;
      menu.innerHTML = '<div class="va-mention-empty">Nenhum usuário ou cargo encontrado. Confirme se o BOT está online e com acesso aos membros/cargos.</div>';
      return;
    }
    const roleItems = items.filter((item) => item.type === 'role');
    const memberItems = items.filter((item) => item.type === 'member');
    let globalIndex = 0;
    function group(title, list) {
      if (!list.length) return '';
      return `<div class="va-mention-group"><span>${title}</span>${list.map((item) => {
        const index = globalIndex++;
        return `<button type="button" class="va-mention-option ${index === mentionSelectedIndex ? 'active' : ''}" data-mention-index="${index}" data-mention-value="${esc(item.insert)}"><i>${item.icon}</i><b>${esc(item.label)}</b><small>${esc(item.sub || '')}</small></button>`;
      }).join('')}</div>`;
    }
    menu.innerHTML = group('Cargos', roleItems) + group('Usuários', memberItems);
    menu.hidden = false;
    menu.querySelectorAll('[data-mention-value]').forEach((btn) => btn.addEventListener('click', () => insertMention(btn.dataset.mentionValue || '')));
  }
  function closeMentionMenu() {
    const menu = ensureMentionMenu();
    menu.hidden = true;
    mentionOpen = false;
    mentionSelectedIndex = 0;
  }
  function insertMention(value = '') {
    if (!value) return;
    const token = getMentionQuery();
    const start = token ? token.start : inputEl.selectionStart;
    const end = token ? token.end : inputEl.selectionEnd;
    const before = inputEl.value.slice(0, start);
    const after = inputEl.value.slice(end);
    const spacer = before && !/\s$/.test(before) ? ' ' : '';
    const next = `${before}${spacer}${value} ${after}`;
    inputEl.value = next;
    const caret = (before + spacer + value + ' ').length;
    inputEl.focus();
    inputEl.setSelectionRange(caret, caret);
    closeMentionMenu();
  }
  async function showAllMentions() {
    renderMentionMenu(true, true);
    if (!mentionData.members?.length && !mentionData.roles?.length) await loadMentions().catch((error) => setStatus(`❌ ${error.message}`, 'err'));
    mentionSelectedIndex = 0;
    renderMentionMenu(true);
  }
  async function load() {
    setStatus('Carregando ponte Discord ↔ Site e histórico do canal...');
    const data = await VoidArena.request(`/api/bridge/${encodeURIComponent(key)}/state`);
    mentionData = data.mentions || mentionData;
    titleEl.textContent = data.bridge?.title || titleEl.textContent;
    subtitleEl.textContent = data.settings?.discordChannelId ? `Canal Discord vinculado: ${data.settings.discordChannelId}` : 'Canal Discord: não vinculado';
    inputEl.placeholder = data.bridge?.placeholder || inputEl.placeholder;
    renderChannels(data.channels || [], data.settings?.discordChannelId || '');
    renderMessages(data.messages || []);
    setStatus(data.message || (data.history?.imported ? `Histórico importado: ${data.history.imported} mensagem(ns).` : 'Ponte carregada.'), data.settings?.discordChannelId ? 'ok' : '');
  }
  async function link() {
    setStatus('Vinculando canal e puxando histórico...');
    const data = await VoidArena.request(`/api/bridge/${encodeURIComponent(key)}/link`, { method: 'PUT', body: JSON.stringify({ discordChannelId: channelEl.value }) });
    subtitleEl.textContent = data.settings?.discordChannelId ? `Canal Discord vinculado: ${data.settings.discordChannelId}` : 'Canal Discord: não vinculado';
    await load();
    setStatus(data.settings?.discordChannelId ? 'Canal vinculado e histórico carregado.' : 'Vínculo removido.', 'ok');
  }
  async function send() {
    const content = inputEl.value.trim();
    if (!content) return setStatus('Digite uma mensagem.', 'err');
    setStatus('Enviando mensagem...');
    await VoidArena.request(`/api/bridge/${encodeURIComponent(key)}/messages`, { method: 'POST', body: JSON.stringify({ content }) });
    inputEl.value = '';
    closeMentionMenu();
    await load();
    setStatus('Mensagem enviada.', 'ok');
  }
  linkBtn.addEventListener('click', link);
  refreshBtn.addEventListener('click', load);
  sendBtn.addEventListener('click', send);
  mentionBtn?.addEventListener('click', showAllMentions);
  inputEl.addEventListener('input', async () => {
    if (getMentionQuery()) {
      if (!mentionData.members?.length && !mentionData.roles?.length) await loadMentions().catch(() => null);
      renderMentionMenu(false);
    } else closeMentionMenu();
  });
  inputEl.addEventListener('keydown', (event) => {
    if (mentionOpen && ['ArrowDown', 'ArrowUp', 'Enter', 'Tab', 'Escape'].includes(event.key)) {
      const items = filteredMentions(false);
      if (event.key === 'Escape') { event.preventDefault(); closeMentionMenu(); return; }
      if (event.key === 'ArrowDown') { event.preventDefault(); mentionSelectedIndex = Math.min(items.length - 1, mentionSelectedIndex + 1); renderMentionMenu(false); return; }
      if (event.key === 'ArrowUp') { event.preventDefault(); mentionSelectedIndex = Math.max(0, mentionSelectedIndex - 1); renderMentionMenu(false); return; }
      if ((event.key === 'Enter' || event.key === 'Tab') && items[mentionSelectedIndex]) { event.preventDefault(); insertMention(items[mentionSelectedIndex].insert); return; }
    }
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(); }
  });
  document.addEventListener('click', (event) => { if (!event.target.closest('.va-bridge-compose')) closeMentionMenu(); });
  VoidArena.bootLayout(active).then(async () => { await loadMentions().catch(() => null); await load(); }).catch((error) => setStatus(`❌ ${error.message}`, 'err'));
}());
