const storage = require('../storage');
const { callBot } = require('../services/botApi.service');
const localBridgeSettings = require('../localBridgeSettings');
const { getSessionUser } = require('../services/access.service');

async function requireSession(req, res, next) {
  try {
    const user = await getSessionUser(req);
    if (!user) return res.status(401).json({ success: false, message: 'Faça login para continuar.' });
    req.bridgeUser = user;
    return next();
  } catch (error) {
    return res.status(503).json({ success: false, message: 'O chat ainda está sincronizando.', detail: error.message });
  }
}

const BRIDGES = {
  chat: {
    title: 'Chat',
    siteChannelId: 'site-main',
    readSettings: () => storage.readChatBridgeSettings(),
    writeSettings: (settings) => storage.writeChatBridgeSettings(settings),
    placeholder: 'Enviar mensagem para o chat geral...'
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

function publicMessage(message = {}) {
  return {
    id: message.id,
    channelId: message.channelId,
    source: message.source || 'site',
    authorId: message.authorId || '',
    authorName: message.authorName || 'Hollow Nexus',
    authorAvatar: message.authorAvatar || '',
    content: message.content || '',
    attachments: Array.isArray(message.attachments) ? message.attachments : [],
    createdAt: message.createdAt || null,
    updatedAt: message.updatedAt || null,
    discordMessageId: message.discordMessageId || '',
    discordChannelId: message.discordChannelId || ''
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
      if (attempt === 0) {
        await callBot('/public/status', { method: 'GET' }).catch(() => null);
      }
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
      message: data.message || '',
      error: ''
    };
  } catch (error) {
    return { success: false, channels: [], message: '', error: error.message };
  }
}

async function readMentions() {
  try {
    const data = await callBotWithWake('/internal/discord/mentions', { method: 'GET' });
    return {
      success: true,
      members: Array.isArray(data.members) ? data.members : [],
      roles: Array.isArray(data.roles) ? data.roles : [],
      message: data.message || '',
      error: ''
    };
  } catch (error) {
    return { success: false, members: [], roles: [], message: '', error: error.message };
  }
}

async function importHistory(bridge, settings) {
  if (!settings?.discordChannelId) {
    return { success: true, imported: 0, skipped: 0, reason: 'Canal Discord não vinculado.' };
  }
  try {
    return await callBotWithWake('/internal/discord/import-history', {
      method: 'POST',
      body: JSON.stringify({
        discordChannelId: settings.discordChannelId,
        siteChannelId: bridge.siteChannelId,
        limit: 100
      })
    });
  } catch (error) {
    return { success: false, imported: 0, skipped: 0, reason: error.message };
  }
}

function registerBridgeRoutes(app) {
  app.get('/api/bridge/:key/state', requireSession, async (req, res) => {
    try {
      const bridge = bridgeConfig(req.params.key);
      if (!bridge) return res.status(404).json({ success: false, message: 'Ponte inválida.' });

      const settings = await bridge.readSettings().catch(() => ({
        enabled: false,
        siteChannelId: bridge.siteChannelId,
        discordChannelId: ''
      }));

      const [channelsData, mentions] = await Promise.all([readChannels(), readMentions()]);
      const history = await importHistory(bridge, settings);
      const messages = await storage.readChatMessages({ channelId: bridge.siteChannelId, limit: 120 }).catch(() => []);
      const errors = [channelsData.error, mentions.error, history.success === false ? history.reason : ''].filter(Boolean);

      return res.json({
        success: true,
        bridge: { key: req.params.key, title: bridge.title, placeholder: bridge.placeholder },
        settings: {
          enabled: Boolean(settings.enabled),
          siteChannelId: bridge.siteChannelId,
          discordChannelId: settings.discordChannelId || ''
        },
        history,
        messages: messages.map(publicMessage),
        channels: channelsData.channels,
        mentions: {
          members: mentions.members,
          roles: mentions.roles,
          channels: channelsData.channels
        },
        diagnostics: {
          botCatalogAvailable: channelsData.success || mentions.success,
          channels: channelsData.channels.length,
          members: mentions.members.length,
          roles: mentions.roles.length,
          errors
        },
        message: errors.length
          ? `BOT não entregou todo o catálogo: ${errors.join(' | ')}`
          : (channelsData.message || mentions.message || (history.imported ? `Histórico importado: ${history.imported} mensagem(ns).` : ''))
      });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

  app.get('/api/bridge/:key/mentions', requireSession, async (req, res) => {
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

  app.put('/api/bridge/:key/link', requireSession, async (req, res) => {
    try {
      const bridge = bridgeConfig(req.params.key);
      if (!bridge) return res.status(404).json({ success: false, message: 'Ponte inválida.' });
      const discordChannelId = String(req.body?.discordChannelId || '').trim();

      if (discordChannelId) {
        const channelsData = await readChannels();
        if (!channelsData.success) {
          return res.status(503).json({ success: false, message: channelsData.error || 'Não foi possível consultar os canais do Discord.' });
        }
        const selected = channelsData.channels.find((channel) => String(channel.id || '') === discordChannelId);
        if (!selected || !(selected.canBridge || ['text', 'announcement'].includes(selected.kind))) {
          return res.status(400).json({ success: false, message: 'Selecione um canal de texto ou anúncios válido.' });
        }
      }

      const settings = await bridge.writeSettings({
        enabled: Boolean(discordChannelId),
        siteChannelId: bridge.siteChannelId,
        discordChannelId
      });
      const history = discordChannelId ? await importHistory(bridge, settings) : { imported: 0, skipped: 0 };
      return res.json({
        success: true,
        settings: { ...settings, siteChannelId: bridge.siteChannelId, discordChannelId },
        history
      });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

  app.post('/api/bridge/:key/messages', requireSession, async (req, res) => {
    try {
      const bridge = bridgeConfig(req.params.key);
      if (!bridge) return res.status(404).json({ success: false, message: 'Ponte inválida.' });
      const content = String(req.body?.content || '').trim().slice(0, 1800);
      if (!content) return res.status(400).json({ success: false, message: 'Digite uma mensagem.' });

      const user = req.bridgeUser || await getSessionUser(req);
      const settings = await bridge.readSettings().catch(() => ({ discordChannelId: '' }));
      const saved = await storage.saveChatMessage({
        channelId: bridge.siteChannelId,
        source: 'site',
        authorId: user?.id || user?.discordId || '',
        authorName: user?.profile?.username || user?.name || 'Usuário Hollow Nexus',
        authorAvatar: user?.avatar || '',
        content,
        attachments: [],
        createdAt: new Date().toISOString()
      });

      let discord = { success: false, skipped: true, message: 'Canal Discord não vinculado.' };
      if (settings.discordChannelId) {
        discord = await callBotWithWake('/internal/discord/send-message', {
          method: 'POST',
          body: JSON.stringify({
            discordChannelId: settings.discordChannelId,
            content: `**${user?.profile?.username || user?.name || 'Hollow Nexus'}:** ${content}`,
            allowedMentions: { parse: ['users', 'roles'] },
            manual: true
          })
        });
      }

      return res.json({ success: true, message: publicMessage(saved), discord });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

  console.log('[Chat/Bridge] Catálogo Discord com retry, histórico e menções completas registrado.');
}

module.exports = { registerBridgeRoutes };