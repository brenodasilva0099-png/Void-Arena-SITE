const {
  publishNexusCupRules,
  publicationState
} = require('../nexusCupRulesPublication');

function registerNexusCupRulesPublicationRoutes(app) {
  app.get('/api/public/nexus-cup-rules-publication', (_req, res) => {
    res.set('Cache-Control', 'no-store');
    return res.json({ success: true, publication: publicationState() });
  });

  setTimeout(() => {
    publishNexusCupRules().catch(() => {});
  }, 1500);

  console.log('[Nexus Cup/Regras] Publicação idempotente agendada.');
}

module.exports = { registerNexusCupRulesPublicationRoutes };
