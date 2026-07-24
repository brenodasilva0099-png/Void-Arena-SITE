const {
  publicationState
} = require('../teamRegistrationGuidancePublication');

function registerTeamRegistrationGuidancePublicationRoutes(app) {
  app.get('/api/public/team-registration-guidance-publication', (_req, res) => {
    res.set('Cache-Control', 'no-store');
    return res.json({
      success: true,
      automaticPublication: false,
      mode: 'manual-only',
      publication: publicationState()
    });
  });

  // Nunca publicar, editar ou reenviar mensagens durante boot/redeploy.
  console.log('[Times/Avisos] Publicação automática desativada; modo somente manual.');
}

module.exports = { registerTeamRegistrationGuidancePublicationRoutes };