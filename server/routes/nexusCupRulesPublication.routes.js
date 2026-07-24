const {
  publicationState
} = require('../nexusCupRulesPublication');

function registerNexusCupRulesPublicationRoutes(app) {
  app.get('/api/public/nexus-cup-rules-publication', (_req, res) => {
    res.set('Cache-Control', 'no-store');
    return res.json({
      success: true,
      automaticPublication: false,
      mode: 'manual-only',
      publication: publicationState()
    });
  });

  // Nunca publicar, editar ou reenviar mensagens durante boot/redeploy.
  console.log('[Nexus Cup/Regras] Publicação automática desativada; modo somente manual.');
}

module.exports = { registerNexusCupRulesPublicationRoutes };