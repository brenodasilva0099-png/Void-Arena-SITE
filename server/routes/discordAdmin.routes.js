const { callBot } = require('../services/botApi.service');
const { requireOwner } = require('../services/access.service');
const { removeRoutes } = require('../utils/expressRoutes');

function filterMatchVoicesFromChannels(data = {}, categoryId = '') {
  const channels = Array.isArray(data.channels) ? data.channels : [];
  return channels
    .filter((channel) => (!categoryId || String(channel.parentId || '') === String(categoryId)) && ['voice', 'stage'].includes(String(channel.kind || '').toLowerCase()))
    .map((channel) => ({
      id: channel.id,
      name: channel.name,
      guildId: channel.guildId,
      guildName: channel.guildName,
      parentId: channel.parentId || '',
      parentName: channel.parentName || '',
      userLimit: channel.userLimit || 0,
      members: channel.members || 0,
      managed: String(channel.name || '').startsWith('👤・')
    }));
}

function registerDiscordAdminRoutes(app) {
  removeRoutes(app, [
    ['post', '/api/discord/categories'],
    ['get', '/api/discord/match-voices'],
    ['post', '/api/discord/match-voices/create'],
    ['delete', '/api/discord/match-voices']
  ]);

  app.post('/api/discord/categories', requireOwner, async (req, res) => {
    try {
      const name = String(req.body?.name || '').trim().slice(0, 80);
      const guildId = String(req.body?.guildId || '').trim();
      if (!name) return res.status(400).json({ success: false, message: 'Informe o nome da categoria.' });

      const data = await callBot('/internal/discord/categories', {
        method: 'POST',
        body: JSON.stringify({ name, guildId })
      });

      return res.json(data);
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

  app.get('/api/discord/match-voices', requireOwner, async (req, res) => {
    const categoryId = String(req.query?.categoryId || req.query?.discordMatchCategoryId || '').trim();
    try {
      const query = categoryId ? `?categoryId=${encodeURIComponent(categoryId)}` : '';
      const data = await callBot(`/internal/discord/match-voices${query}`, { method: 'GET' });
      return res.json(data);
    } catch (error) {
      try {
        const fallback = await callBot('/internal/discord/channels', { method: 'GET' });
        return res.json({
          success: true,
          fallback: true,
          categoryId,
          message: 'Listagem em modo compatibilidade. Para apagar/criar calls, redeploy/reinicie o BOT com a rota nova.',
          channels: filterMatchVoicesFromChannels(fallback, categoryId)
        });
      } catch (fallbackError) {
        return res.status(400).json({ success: false, message: error.message || fallbackError.message, channels: [] });
      }
    }
  });

  app.post('/api/discord/match-voices/create', requireOwner, async (req, res) => {
    try {
      const teamName = String(req.body?.teamName || req.body?.name || '').trim().slice(0, 80);
      const categoryId = String(req.body?.categoryId || req.body?.discordMatchCategoryId || '').trim();
      const playerIds = Array.isArray(req.body?.playerIds) ? req.body.playerIds.map((id) => String(id || '').trim()).filter(Boolean) : [];
      if (!teamName) return res.status(400).json({ success: false, message: 'Escolha/informe o time para criar a call.' });
      const data = await callBot('/internal/discord/match-voices/create', {
        method: 'POST',
        body: JSON.stringify({ teamName, categoryId, playerIds })
      });
      return res.json(data);
    } catch (error) {
      return res.status(400).json({ success: false, message: `${error.message} Redeploy/reinicie o BOT para ativar criação manual de call pelo site.` });
    }
  });

  app.delete('/api/discord/match-voices', requireOwner, async (req, res) => {
    try {
      const channelIds = Array.isArray(req.body?.channelIds) ? req.body.channelIds : [];
      const categoryId = String(req.body?.categoryId || req.body?.discordMatchCategoryId || '').trim();
      const data = await callBot('/internal/discord/match-voices/delete', {
        method: 'POST',
        body: JSON.stringify({ channelIds, categoryId })
      });
      return res.json(data);
    } catch (error) {
      return res.status(400).json({ success: false, message: `${error.message} Redeploy/reinicie o BOT para ativar a função de apagar calls pelo site.` });
    }
  });
}

module.exports = { registerDiscordAdminRoutes };
