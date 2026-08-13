require('dotenv').config();

const CANONICAL_SITE_URL = 'https://hollownexus.com.br';
const CANONICAL_DISCORD_CALLBACK_URL = `${CANONICAL_SITE_URL}/auth/discord/callback`;

// Definido antes dos requires: nenhuma rota ou fallback antigo pode capturar
// as variáveis do Render antes da troca para o domínio oficial.
process.env.CANONICAL_SITE_URL = CANONICAL_SITE_URL;
process.env.PUBLIC_SITE_URL = CANONICAL_SITE_URL;
process.env.SITE_PUBLIC_URL = CANONICAL_SITE_URL;
process.env.SITE_URL = CANONICAL_SITE_URL;
process.env.APP_URL = CANONICAL_SITE_URL;
process.env.FRONTEND_URL = CANONICAL_SITE_URL;
process.env.DISCORD_CALLBACK_URL = CANONICAL_DISCORD_CALLBACK_URL;

const http = require('node:http');
const { createServer } = require('../server/app');
const { createRealtimeServer } = require('../server/realtime');
const { registerCanonicalDomainRoutes } = require('../server/routes/canonicalDomain.routes');
const { registerStaticAssetGuard } = require('../server/routes/staticAssetGuard.routes');
const { registerOrganizedRoutes } = require('../server/bootstrap/organizedRoutes');
const { registerDebugRoutes } = require('../server/routes/debug.routes');
const { registerPublicEventRoutes } = require('../server/routes/publicEvent.routes');
const { registerPublicTeamRoutes } = require('../server/routes/publicTeam.routes');
const { registerStableTeamInviteRoutes } = require('../server/routes/teamInviteStable.routes');
const { registerEventNotifyRoutes } = require('../server/routes/eventNotify.routes');
const { registerBracketV2Routes } = require('../server/routes/bracketV2.routes');
const { registerBridgeRoutes } = require('../server/routes/bridge.routes');
const { registerProfileV2Routes } = require('../server/routes/profileV2.routes');
const { registerPlacarRoutes } = require('../server/routes/placar.routes');
const { registerPlayersRoutes } = require('../server/routes/players.routes');
const { registerPlayerDirectoryStableRoutes } = require('../server/routes/playerDirectoryStable.routes');
const { registerTeamExtrasRoutes } = require('../server/routes/teamExtras.routes');
const { registerDiscordAdminRoutes } = require('../server/routes/discordAdmin.routes');
const { registerNotificationRoutes } = require('../server/routes/notifications.routes');
const { registerAccessControlRoutes } = require('../server/routes/accessControl.routes');
const { registerRuntimeRoutes } = require('../server/routes/runtime.routes');
const { registerDiscordServerLinkRoutes } = require('../server/routes/discordServerLink.routes');
const { registerStableDiscordAuthRoutes } = require('../server/routes/discordAuthStable.routes');
const { registerLeagueRoutes } = require('../server/routes/league.routes');
const { registerLeagueExperienceRoutes } = require('../server/routes/leagueExperience.routes');
const { registerCafeRankingRoutes } = require('../server/routes/cafeRanking.routes');
const { registerRouteAuditRoutes } = require('../server/routes/routeAudit.routes');
const { registerLeagueStableRoutes } = require('../server/routes/leagueStable.routes');
const { registerNexusCupRulesPublicationRoutes } = require('../server/routes/nexusCupRulesPublication.routes');
const { registerTeamRegistrationGuidancePublicationRoutes } = require('../server/routes/teamRegistrationGuidancePublication.routes');
const { registerHubResultBridgeDisabledRoutes } = require('../server/routes/hubResultBridgeDisabled.routes');
const { registerFinalRuntimeStabilityRoutes } = require('../server/routes/finalRuntimeStability.routes');
const { registerChatBridgeAssetRoutes } = require('../server/routes/chatBridgeAssets.routes');
const { registerProfileAssetsStableRoutes } = require('../server/routes/profileAssetsStable.routes');
const { registerMatchReportRoutes } = require('../server/routes/matchReports.routes');

const PORT = Number(process.env.PORT || 3000);

const app = createServer({ client: null });
registerCanonicalDomainRoutes(app);
registerStableDiscordAuthRoutes(app);
registerStableTeamInviteRoutes(app);
registerStaticAssetGuard(app);
registerOrganizedRoutes(app);
registerDebugRoutes(app);
registerPublicTeamRoutes(app);
registerStableTeamInviteRoutes(app);
registerPublicEventRoutes(app);
registerEventNotifyRoutes(app);
registerBracketV2Routes(app);
registerBridgeRoutes(app);
registerProfileV2Routes(app);
registerPlacarRoutes(app);
registerPlayersRoutes(app);
registerPlayerDirectoryStableRoutes(app);
registerTeamExtrasRoutes(app);
registerDiscordAdminRoutes(app);
registerNotificationRoutes(app);
registerAccessControlRoutes(app);
registerRuntimeRoutes(app);
registerDiscordServerLinkRoutes(app);
registerLeagueRoutes(app);
registerLeagueExperienceRoutes(app);
registerCafeRankingRoutes(app);
registerRouteAuditRoutes(app);
registerLeagueStableRoutes(app);
registerMatchReportRoutes(app);
registerNexusCupRulesPublicationRoutes(app);
registerTeamRegistrationGuidancePublicationRoutes(app);
// Registros finais: removem rotas antigas e impedem que outra camada as sobrescreva.
registerHubResultBridgeDisabledRoutes(app);
registerFinalRuntimeStabilityRoutes(app);
registerStableTeamInviteRoutes(app);
registerChatBridgeAssetRoutes(app);
registerProfileAssetsStableRoutes(app);

// Última barreira: registra a causa real de qualquer falha HTTP. Para a raiz,
// mantém a Home acessível mesmo se uma rota antiga de arquivo estático falhar.
app.use((error, req, res, next) => {
  console.error(`[HTTP/Error] ${req.method} ${req.originalUrl || req.url}:`, error?.stack || error?.message || error);
  if (res.headersSent) return next(error);
  if ((req.method === 'GET' || req.method === 'HEAD') && req.path === '/') {
    return res.redirect(302, '/pages/dashboard.html');
  }
  return res.status(Number(error?.status || error?.statusCode || 500) || 500)
    .type('text/plain; charset=utf-8')
    .send('Não foi possível carregar esta rota. O erro foi registrado no servidor.');
});

const server = http.createServer(app);
createRealtimeServer(server, { app });

server.listen(PORT, () => {
  console.log(`Site Hollow Nexus League rodando em: http://localhost:${PORT}`);
  console.log(`Domínio público oficial: ${CANONICAL_SITE_URL}`);
  console.log(`Callback Discord oficial: ${CANONICAL_DISCORD_CALLBACK_URL}`);
  console.log('Home oficial: /pages/dashboard.html');
  console.log('Realtime WebSocket ativo em: /realtime');
});

process.on('unhandledRejection', (error) => console.error('Erro nao tratado no site:', error));
process.on('uncaughtException', (error) => console.error('Excecao nao tratada no site:', error));
