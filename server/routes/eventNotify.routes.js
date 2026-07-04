const storage = require('../storage');
const { requireOwner } = require('../services/access.service');

function registerEventNotifyRoutes(app) {
  app.post('/api/events/:eventId/manual-dm', requireOwner, async (req, res) => {
    try {
      const eventId = String(req.params.eventId || '').trim();
      const events = await storage.readEvents();
      const event = events.find((item) => String(item.id || '') === eventId);

      if (!event) {
        return res.status(404).json({ success: false, message: 'Evento não encontrado.' });
      }

      const now = new Date().toISOString();
      const saved = await storage.saveTournamentEvent({
        ...event,
        manualDmRequestedAt: now,
        updatedAt: now
      });

      return res.json({
        success: true,
        event: saved,
        notice: {
          requested: true,
          edited: 0,
          sent: 0,
          message: 'Reenvio solicitado. O BOT vai detectar a atualização e enviar/editar as DMs dos capitães em até 30 segundos.'
        }
      });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });
}

module.exports = { registerEventNotifyRoutes };
