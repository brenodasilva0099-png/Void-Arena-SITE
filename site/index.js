require('dotenv').config();

const http = require('node:http');
const { createServer } = require('../server/app');
const { createRealtimeServer } = require('../server/realtime');
const { registerStaticAssetGuard } = require('../server/routes/staticAssetGuard.routes');
const { registerOrganizedRoutes } = require('../server/bootstrap/organizedRoutes');
const { registerDebugRoutes } = require('../server/routes/debug.routes');
const { registerPublicEventRoutes } = require('../server/routes/publicEvent.routes');
const { registerPublicTeamRoutes } = require('../server/routes/publicTeam.routes');
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

const PORT = Number(process.env.PORT || 3000);

const app = createServer({ client: null });
registerStaticAssetGuard(app);
registerOrganizedRoutes(app);
registerDebugRoutes(app);
registerPublicTeamRoutes(app);
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

const server = http.createServer(app);
createRealtimeServer(server, { app });

server.listen(PORT, () => {
  console.log(`Site Void Arena 5.1.3 rodando em: http://localhost:${PORT}`);
  console.log('Realtime WebSocket ativo em: /realtime');
});

process.on('unhandledRejection', (error) => console.error('Erro nao tratado no site:', error));
process.on('uncaughtException', (error) => console.error('Excecao nao tratada no site:', error));
