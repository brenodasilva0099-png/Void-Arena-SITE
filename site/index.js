require('dotenv').config();

const http = require('node:http');
const { createServer } = require('../server/app');
const { createRealtimeServer } = require('../server/realtime');
const { registerOrganizedRoutes } = require('../server/bootstrap/organizedRoutes');
const { registerDebugRoutes } = require('../server/routes/debug.routes');
const { registerPublicEventRoutes } = require('../server/routes/publicEvent.routes');
const { registerPublicTeamRoutes } = require('../server/routes/publicTeam.routes');
const { registerEventNotifyRoutes } = require('../server/routes/eventNotify.routes');

const PORT = Number(process.env.PORT || 3000);

// Site/API separado. O banco principal continua no BOT via BOT_API_URL + BOT_API_KEY.
const app = createServer({ client: null });
registerOrganizedRoutes(app);
registerDebugRoutes(app);
registerPublicTeamRoutes(app);
registerPublicEventRoutes(app);
registerEventNotifyRoutes(app);

const server = http.createServer(app);
createRealtimeServer(server, { app });

server.listen(PORT, () => {
  console.log(`Site Void Arena 5.1.2 rodando em: http://localhost:${PORT}`);
  console.log('Realtime WebSocket ativo em: /realtime');
});

process.on('unhandledRejection', (error) => {
  console.error('Erro nao tratado no site:', error);
});

process.on('uncaughtException', (error) => {
  console.error('Excecao nao tratada no site:', error);
});
