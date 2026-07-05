const { callBot } = require('../services/botApi.service');
const { requireOwner } = require('../services/access.service');
const { removeRoutes } = require('../utils/expressRoutes');

function registerDiscordAdminRoutes(app) {
  removeRoutes(app, [['post', '/api/discord/categories']]);

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
}

module.exports = { registerDiscordAdminRoutes };
