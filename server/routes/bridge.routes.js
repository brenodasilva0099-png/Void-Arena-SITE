const storage = require('../storage');
const { callBot } = require('../services/botApi.service');
const localBridgeSettings = require('../localBridgeSettings');

function requireSession(req, res, next) {
  if (!req.session?.userId) return res.status(401).json({ success: false, message: 'Faça login para continuar.' });
  return next();
}

const BRIDGES = {
  chat: { title: 'Chat', siteChannelId: 'site-main', readSettings: () => storage.readChatBridgeSettings(), writeSettings: (settings) => storage.writeChatBridgeSettings(settings), placeholder: 'Enviar mensagem para o chat geral...' },
  estatisticas: { title: 'Estatísticas', siteChannelId: 'stats-main', readSettings: () => storage.readStatsBridgeSettings(), writeSettings: (settings) => storage.writeStatsBridgeSettings(settings), placeholder: 'Enviar mensagem para estatísticas...' },
  scrims: { title: 'Scrims', siteChannelId: 'scrims-main', readSettings: () => localBridgeSettings.readBridgeSettings('scrims'), writeSettings: (settings) => localBridgeSettings.writeBridgeSettings('scrims', settings), placeholder: 'Enviar mensagem de scrim/contato entre times...' }
};
function bridgeConfig(key = '') { return BRIDGES[String(key || '').trim()] || null; }
function publicMessage(message = {}) { return { id: message.id, channelId: message.channelId, source: message.source || 'site', authorId: message.authorId || '', authorName: message.authorName || 'Void Arena', authorAvatar: message.authorAvatar || '', content: message.content || '', attachments: Array.isArray(message.attachments) ? message.attachments : [], createdAt: message.createdAt || null, updatedAt: message.updatedAt || null, discordMessageId: message.discordMessageId || '', discordChannelId: message.discordChannelId || '' }; }
async function readChannels() { const data = await callBot('/internal/discord/channels', { method: 'GET' }).catch((error) => ({ success: false, channels: [], message: error.message })); return { channels: Array.isArray(data.channels) ? data.channels : [], channelMessage: data.message || data.internalError || '' }; }
async function importHistory(bridge, settings) {
  if (!settings?.discordChannelId) return { imported: 0, skipped: 0, reason: 'Canal Discord não vinculado.' };
  return callBot('/internal/discord/import-history', { method: 'POST', body: JSON.stringify({ discordChannelId: settings.discordChannelId, siteChannelId: bridge.siteChannelId, limit: 100 }) }).catch((error) => ({ success: false, imported: 0, skipped: 0, reason: error.message }));
}

function registerBridgeRoutes(app) {
  app.get('/api/bridge/:key/state', requireSession, async (req, res) => {
    try {
      const bridge = bridgeConfig(req.params.key);
      if (!bridge) return res.status(404).json({ success: false, message: 'Ponte inválida.' });
      const settings = await bridge.readSettings().catch(() => ({ enabled: false, siteChannelId: bridge.siteChannelId, discordChannelId: '' }));
      const [history, channelsData] = await Promise.all([importHistory(bridge, settings), readChannels()]);
      const messages = await storage.readChatMessages({ channelId: bridge.siteChannelId, limit: 120 }).catch(() => []);
      return res.json({ success: true, bridge: { key: req.params.key, title: bridge.title, placeholder: bridge.placeholder }, settings: { enabled: Boolean(settings.enabled), siteChannelId: bridge.siteChannelId, discordChannelId: settings.discordChannelId || '' }, history, messages: messages.map(publicMessage), channels: channelsData.channels, message: channelsData.channelMessage || (history.imported ? `Histórico importado: ${history.imported} mensagem(ns).` : '') });
    } catch (error) { return res.status(400).json({ success: false, message: error.message }); }
  });
  app.put('/api/bridge/:key/link', requireSession, async (req, res) => {
    try {
      const bridge = bridgeConfig(req.params.key);
      if (!bridge) return res.status(404).json({ success: false, message: 'Ponte inválida.' });
      const discordChannelId = String(req.body?.discordChannelId || '').trim();
      const settings = await bridge.writeSettings({ enabled: Boolean(discordChannelId), siteChannelId: bridge.siteChannelId, discordChannelId });
      if (discordChannelId) await importHistory(bridge, settings);
      return res.json({ success: true, settings: { ...settings, siteChannelId: bridge.siteChannelId, discordChannelId } });
    } catch (error) { return res.status(400).json({ success: false, message: error.message }); }
  });
  app.post('/api/bridge/:key/messages', requireSession, async (req, res) => {
    try {
      const bridge = bridgeConfig(req.params.key);
      if (!bridge) return res.status(404).json({ success: false, message: 'Ponte inválida.' });
      const content = String(req.body?.content || '').trim().slice(0, 1800);
      if (!content) return res.status(400).json({ success: false, message: 'Digite uma mensagem.' });
      const user = await storage.findUserById(req.session.userId).catch(() => null);
      const settings = await bridge.readSettings().catch(() => ({ discordChannelId: '' }));
      const saved = await storage.saveChatMessage({ channelId: bridge.siteChannelId, source: 'site', authorId: user?.id || req.session.userId || '', authorName: user?.profile?.username || user?.name || 'Usuário Void Arena', authorAvatar: user?.avatar || '', content, attachments: [], createdAt: new Date().toISOString() });
      let discord = { success: false, skipped: true, message: 'Canal Discord não vinculado.' };
      if (settings.discordChannelId) discord = await callBot('/internal/discord/send-message', { method: 'POST', body: JSON.stringify({ discordChannelId: settings.discordChannelId, content: `**${user?.profile?.username || user?.name || 'Void Arena'}:** ${content}`, allowedMentions: { parse: ['users', 'roles'] } }) }).catch((error) => ({ success: false, message: error.message }));
      return res.json({ success: true, message: publicMessage(saved), discord });
    } catch (error) { return res.status(400).json({ success: false, message: error.message }); }
  });
}
module.exports = { registerBridgeRoutes };
