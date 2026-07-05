const { callBot } = require('../services/botApi.service');
const { requireOwner } = require('../services/access.service');
const { removeRoutes } = require('../utils/expressRoutes');

function registerDiscordAdminRoutes(app) {
  removeRoutes(app, [
    ['post', '/api/discord/categories'],
    ['get', '/api/discord/match-voices'],
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
    try {
      const categoryId = String(req.query?.categoryId || req.query?.discordMatchCategoryId || '').trim();
      const query = categoryId ? `?categoryId=${encodeURIComponent(categoryId)}` : '';
      const data = await callBot(`/internal/discord/match-voices${query}`, { method: 'GET' });
      return res.json(data);
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message, channels: [] });
    }
  });

  app.delete('/api/discord/match-voices', requireOwner, async (req, res) => {
    try {
      const channelIds = Array.isArray(req.body?.channelIds) ? req.body.channelIds : [];
      const categoryId = String(req.body?.categoryId || req.body?.discordMatchCategoryId || '').trim();
      const data = await callBot('/internal/discord/match-voices', {
        method: 'DELETE',
        body: JSON.stringify({ channelIds, categoryId })
      });
      return res.json(data);
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });
}

module.exports = { registerDiscordAdminRoutes };
