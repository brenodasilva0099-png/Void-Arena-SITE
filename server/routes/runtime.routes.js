const { callBot } = require('../services/botApi.service');
const { requireOwner } = require('../services/access.service');
const { removeRoutes } = require('../utils/expressRoutes');

function registerRuntimeRoutes(app) {
  removeRoutes(app, [['get', '/api/runtime/bot']]);

  app.get('/api/runtime/bot', requireOwner, async (req, res) => {
    try {
      const limit = Math.max(20, Math.min(300, Number(req.query?.limit || 160) || 160));
      const data = await callBot(`/internal/logs?limit=${limit}`, { method: 'GET' });
      return res.json(data);
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message, logs: [] });
    }
  });
}

module.exports = { registerRuntimeRoutes };
