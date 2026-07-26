const storage = require('../storage');
const { callBot } = require('../services/botApi.service');
const localBridgeSettings = require('../localBridgeSettings');
const { getSessionUser, requireAdmin } = require('../services/access.service');

const BRIDGES = {
  chat: {
    title: 'Chat Discord',
    siteChannelId: 'site-main',
    readSettings: () => storage.readChatBridgeSettings(),
    writeSettings: (settings) => storage.writeChatBridgeSettings(settings),
    placeholder: 'Escreva exatamente o que o BOT deve enviar...'
  },
  estatisticas: {
    title: 'Estatísticas',
    siteChannelId: 'stats-main',
    readSettings: () => storage.readStatsBridgeSettings(),
    writeSettings: (settings) => storage.writeStatsBridgeSettings(settings),
    placeholder: 'Enviar mensagem para estatísticas...'
  },
  scrims: {
    title: 'Scrims',
    siteChannelId: 'scrims-main',
    readSettings: () => localBridgeSettings.readBridgeSettings('scrims'),
    writeSettings: (settings) => localBridgeSettings.writeBridgeSettings('scrims', settings),
    placeholder: 'Enviar mensagem de scrim/contato entre times...'
  }
};

function bridgeConfig(key = '') {
  return BRIDGES[String(key || '').trim()] || null;
}

function publicMessage(message = {}, botUserId = '') {
  const source = String(message.source || 'discord');
  const authorId = String(message.authorId || '');
  const isBot = Boolean(message.isBot) || Boolean(botUserId && authorId === String(botUserId));
  return {
    id: message.id || message.discordMessageId || '',
    channelId: message.channelId || '',
    source,
    authorId,
    authorName: message.authorName || (isBot ? 'Hollow Nexus BOT' : 'Discord'),
    authorAvatar: message.authorAvatar || '',
    content: message.content || '',
    attachments: Array.isArray(message.attachments) ? message.attachments : [],
    createdAt: message.createdAt || null,
    updatedAt: message.updatedAt || null,
    editedAt: message.editedAt || null,
    discordMessageId: message.discordMessageId || '',
    discordChannelId: message.discordChannelId || '',
    isBot,
    isCommand: Boolean(message.isCommand),
    editable: Boolean(message.editable) || Boolean(message.discordMessageId && (source === 'site' || isBot))
  };
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callBotWithWake(pathname, options = {}) {
  let lastError = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await callBot(pathname, options);
    } catch (error) {
      lastError = error;
      if (attempt === 0) await callBot('/public/status', { method: 'GET' }).catch(() => null);
      if (attempt < 2) await wait(700 + attempt * 900);
    }
  }
  throw lastError || new Error('BOT indisponível.');
}

async function readChannels() {
  try {
    const data = await callBotWithWake('/internal/discord/channels', { method: 'GET' });
    return {
      success: true,
      channels: Array.isArray(data.channels) ? data.channels : [],
      botUserId: String(data.botUserId || ''),
      botTag: String(data.botTag || ''),
      message: data.message || '',
      error: ''
    };
  } catch (error) {
    return { success: false, channels: [], botUserId: '', botTag: '', message: '', error: error.message };
  }
}

async function readMentions() {
  const [catalogResult, allMembersResult] = await Promise.allSettled([
    callBotWithWake('/internal/discord/mentions', { method: 'GET' }),
    callBotWithWake('/internal/discord/members/all?limit=5000', { method: 'GET' })
  ]);

  const catalog = catalogResult.status === 'fulfilled' ? catalogResult.value : {};
  const allMembers = allMembersResult.status === 'fulfilled' ? allMembersResult.value : {};
  const membersById = new Map();

  for (const member of [
    ...(Array.isArray(catalog.members) ? catalog.members : []),
    ...(Array.isArray(allMembers.members) ? allMembers.members : [])
  ]) {
    const id = String(member?.id || member?.discordId || '').trim();
    if (!id) continue;
    const previous = membersById.get(id) || {};
    membersById.set(id, {
      ...previous,
      ...member,
      id,
      discordId: id,
      mention: member.mention || previous.mention || '<@' + id + '>'
    });
  }

  const members = Array.from(membersById.values())
    .sort((left, right) => String(left.name || left.username || '').localeCompare(String(right.name || right.username || ''), 'pt-BR'));
  const roles = Array.isArray(catalog.roles) ? catalog.roles : [];
  const errors = [
    catalogResult.status === 'rejected' ? catalogResult.reason?.message : '',
    allMembersResult.status === 'rejected' ? allMembersResult.reason?.message : ''
  ].filter(Boolean);

  return {
    success: catalogResult.status === 'fulfilled' || allMembersResult.status === 'fulfilled',
    members,
    roles,
    memberCount: members.length,
    roleCount: roles.length,
    message: catalog.message || allMembers.message || '',
    error: members.length || roles.length ? '' : errors.join(' · ')
  };
}

async function readDiscordHistory(discordChannelId, { before = '', limit = 250 } = {}) {
  const channelId = String(discordChannelId || '').trim();
  if (!channelId) return { success: true, messages: [], before: '', hasMore: false, skipped: true };
  try {
    const params = new URLSearchParams({
      discordChannelId: channelId,
      limit: String(Math.max(1, Math.min(1000, Number(limit || 250))))
    });
    if (before) params.set('before', String(before));
    const data = await callBotWithWake(`/internal/discord/channel-history?${params.toString()}`, { method: 'GET' });
    return {
      success: data.success !== false,
      messages: Array.isArray(data.messages) ? data.messages : [],
      before: String(data.before || ''),
      hasMore: Boolean(data.hasMore),
      botUserId: String(data.botUserId || ''),
      error: data.success === false ? (data.message || 'Falha ao consultar histórico.') : ''
    };
  } catch (error) {
    return { success: false, messages: [], before: '', hasMore: false, botUserId: '', error: error.message };
  }
}

function findSelectedChannel(channels = [], id = '') {
  return channels.find((channel) => String(channel.id || '') === String(id || '')) || null;
}

async function fallbackStoredMessages(bridge, botUserId = '') {
  const messages = await storage.readChatMessages({ channelId: bridge.siteChannelId, limit: 100 }).catch(() => []);
  return messages.map((message) => publicMessage(message, botUserId));
}

function registerBridgeRoutes(app) {
  app.get('/api/bridge/:key/state', requireAdmin, async (req, res) => {
    try {
      const bridge = bridgeConfig(req.params.key);
      if (!bridge) return res.status(404).json({ success: false, message: 'Ponte inválida.' });

      const settings = await bridge.readSettings().catch(() => ({ enabled: false, siteChannelId: bridge.siteChannelId, discordChannelId: '' }));
      const [channelsData, mentions] = await Promise.all([readChannels(), readMentions()]);
      const selected = findSelectedChannel(channelsData.channels, settings.discordChannelId);
      const history = settings.discordChannelId
        ? await readDiscordHistory(settings.discordChannelId, { limit: 250 })
        : { success: true, messages: [], before: '', hasMore: false, botUserId: channelsData.botUserId };
      const historyMessages = history.success
        ? history.messages.map((message) => publicMessage(message, history.botUserId || channelsData.botUserId))
        : await fallbackStoredMessages(bridge, channelsData.botUserId);
      const errors = [channelsData.error, mentions.error, history.error].filter(Boolean);

      return res.json({
        success: true,
        bridge: { key: req.params.key, title: bridge.title, placeholder: bridge.placeholder },
        settings: {
          enabled: Boolean(settings.enabled),
          siteChannelId: bridge.siteChannelId,
          discordChannelId: settings.discordChannelId || '',
          discordChannelName: selected?.displayName || selected?.name || ''
        },
        history: {
          messages: historyMessages,
          before: history.before || '',
          hasMore: history.hasMore
        },
        messages: historyMessages,
        channels: channelsData.channels,
        mentions: { members: mentions.members, roles: mentions.roles, channels: channelsData.channels },
        diagnostics: {
          botCatalogAvailable: channelsData.success || mentions.success,
          channels: channelsData.channels.length,
          members: mentions.members.length,
          roles: mentions.roles.length,
          errors
        },
        message: errors.length ? `BOT não entregou todo o catálogo: ${errors.join(' | ')}` : 'Painel administrativo conectado em modo manual.'
      });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

  app.get('/api/bridge/:key/history', requireAdmin, async (req, res) => {
    try {
      const bridge = bridgeConfig(req.params.key);
      if (!bridge) return res.status(404).json({ success: false, message: 'Ponte inválida.' });
      const settings = await bridge.readSettings().catch(() => ({ discordChannelId: '' }));
      if (!settings.discordChannelId) return res.status(400).json({ success: false, message: 'Vincule um canal primeiro.' });
      const history = await readDiscordHistory(settings.discordChannelId, {
        before: req.query.before || '',
        limit: req.query.limit || 250
      });
      if (!history.success) return res.status(503).json({ success: false, message: history.error || 'Falha ao consultar histórico.' });
      return res.json({
        success: true,
        history: {
          messages: history.messages.map((message) => publicMessage(message, history.botUserId)),
          before: history.before || '',
          hasMore: history.hasMore
        }
      });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

  app.get('/api/bridge/:key/mentions', requireAdmin, async (req, res) => {
    try {
      const bridge = bridgeConfig(req.params.key);
      if (!bridge) return res.status(404).json({ success: false, message: 'Ponte inválida.' });
      const [mentions, channelsData] = await Promise.all([readMentions(), readChannels()]);
      const errors = [mentions.error, channelsData.error].filter(Boolean);
      return res.json({
        success: true,
        members: mentions.members,
        roles: mentions.roles,
        channels: channelsData.channels,
        message: errors.length ? errors.join(' | ') : (mentions.message || channelsData.message || '')
      });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message, members: [], roles: [], channels: [] });
    }
  });

  app.put('/api/bridge/:key/link', requireAdmin, async (req, res) => {
    try {
      const bridge = bridgeConfig(req.params.key);
      if (!bridge) return res.status(404).json({ success: false, message: 'Ponte inválida.' });
      const discordChannelId = String(req.body?.discordChannelId || '').trim();
      if (discordChannelId) {
        const channelsData = await readChannels();
        if (!channelsData.success) return res.status(503).json({ success: false, message: channelsData.error || 'Não foi possível consultar os canais do Discord.' });
        const selected = findSelectedChannel(channelsData.channels, discordChannelId);
        if (!selected || !(selected.canBridge || ['text', 'announcement'].includes(selected.kind))) {
          return res.status(400).json({ success: false, message: 'Selecione um canal de texto ou anúncios válido.' });
        }
      }
      const settings = await bridge.writeSettings({ enabled: Boolean(discordChannelId), siteChannelId: bridge.siteChannelId, discordChannelId });
      return res.json({ success: true, settings, message: 'Canal vinculado. Nenhuma mensagem foi enviada ou repetida.' });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

  app.post('/api/bridge/:key/messages', requireAdmin, async (req, res) => {
    try {
      const bridge = bridgeConfig(req.params.key);
      if (!bridge) return res.status(404).json({ success: false, message: 'Ponte inválida.' });
      const content = String(req.body?.content || '').trim().slice(0, 2000);
      const requestId = String(req.body?.requestId || '').trim().slice(0, 120);
      if (!content) return res.status(400).json({ success: false, message: 'Digite uma mensagem.' });
      if (!requestId) return res.status(400).json({ success: false, message: 'Identificador manual ausente. Atualize a página e tente novamente.' });

      const user = await getSessionUser(req);
      const settings = await bridge.readSettings().catch(() => ({ discordChannelId: '' }));
      if (!settings.discordChannelId) return res.status(400).json({ success: false, message: 'Vincule um canal antes de enviar.' });

      const discord = await callBotWithWake('/internal/discord/send-message', {
        method: 'POST',
        body: JSON.stringify({
          discordChannelId: settings.discordChannelId,
          content,
          requestId,
          manual: true,
          allowedMentions: { parse: ['users', 'roles'], repliedUser: false }
        })
      });
      if (discord.success === false) throw new Error(discord.message || 'O BOT não confirmou o envio.');

      const saved = await storage.saveChatMessage({
        channelId: bridge.siteChannelId,
        source: 'site',
        authorId: discord.botUserId || user?.discordId || user?.id || '',
        authorName: discord.botTag || 'Hollow Nexus BOT',
        authorAvatar: '',
        content,
        attachments: [],
        discordMessageId: discord.discordMessageId || '',
        discordChannelId: discord.discordChannelId || settings.discordChannelId,
        createdAt: discord.createdAt || new Date().toISOString()
      });

      return res.json({ success: true, message: publicMessage(saved, discord.botUserId), discord, requestId });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

  app.patch('/api/bridge/:key/messages/:messageId', requireAdmin, async (req, res) => {
    try {
      const bridge = bridgeConfig(req.params.key);
      if (!bridge) return res.status(404).json({ success: false, message: 'Ponte inválida.' });
      const content = String(req.body?.content || '').trim().slice(0, 2000);
      const discordMessageId = String(req.body?.discordMessageId || '').trim();
      const discordChannelId = String(req.body?.discordChannelId || '').trim();
      const requestId = String(req.body?.requestId || '').trim().slice(0, 120);
      if (!content) return res.status(400).json({ success: false, message: 'A mensagem não pode ficar vazia.' });
      if (!discordMessageId || !discordChannelId) return res.status(400).json({ success: false, message: 'Mensagem Discord não identificada.' });

      const discord = await callBotWithWake('/internal/discord/edit-message', {
        method: 'PATCH',
        body: JSON.stringify({
          discordChannelId,
          discordMessageId,
          content,
          requestId,
          manual: true,
          allowedMentions: { parse: ['users', 'roles'], repliedUser: false }
        })
      });
      if (discord.success === false) throw new Error(discord.message || 'O BOT não confirmou a edição.');

      const localId = String(req.params.messageId || '').trim();
      let localMessage = null;
      if (localId && localId !== discordMessageId) {
        localMessage = await storage.updateChatMessage(localId, { content }, { channelId: bridge.siteChannelId }).catch(() => null);
      }
      return res.json({ success: true, message: localMessage ? publicMessage(localMessage, discord.botUserId) : null, discord });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

  console.log('[Chat/Admin] Histórico real, menções completas, envio idempotente e edição de mensagens do BOT registrados para administradores.');
}

module.exports = { registerBridgeRoutes };
