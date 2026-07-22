const {
  publishTeamRegistrationGuidance,
  publicationState
} = require('../teamRegistrationGuidancePublication');

function registerTeamRegistrationGuidancePublicationRoutes(app) {
  app.get('/api/public/team-registration-guidance-publication', (_req, res) => {
    res.set('Cache-Control', 'no-store');
    return res.json({ success: true, publication: publicationState() });
  });

  setTimeout(() => {
    publishTeamRegistrationGuidance().catch(() => {});
  }, 2800);

  console.log('[Times/Avisos] Publicação idempotente agendada.');
}

module.exports = { registerTeamRegistrationGuidancePublicationRoutes };
