const { callBot } = require('../services/botApi.service');

function requireSession(req, res, next) {
  if (!req.session?.userId) return res.status(401).json({ success: false, message: 'Faça login para continuar.' });
  return next();
}

function registerPlacarRoutes(app) {
  app.get('/api/placar', requireSession, async (_req, res) => {
    try {
      const data = await callBot('/internal/placar', { method: 'GET' });
      return res.json(data);
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message, leaderboards: { '3v3': [], '5v5': [] }, queues: { '3v3': [], '5v5': [] }, matches: [] });
    }
  });

  app.get('/api/placar/:mode', requireSession, async (req, res) => {
    try {
      const mode = String(req.params.mode || '3v3').trim();
      const data = await callBot(`/internal/placar/${encodeURIComponent(mode)}`, { method: 'GET' });
      return res.json(data);
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message, players: [] });
    }
  });
}

module.exports = { registerPlacarRoutes };
