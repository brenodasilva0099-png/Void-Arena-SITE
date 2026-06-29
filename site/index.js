require('dotenv').config();

const http = require('node:http');
const { createServer } = require('../server/app');
const { createRealtimeServer } = require('../server/realtime');
const { applyFinalFixes } = require('../server/finalFixes');

const PORT = Number(process.env.PORT || 3000);

// Site/API isolado. Na opção 2, o site não escreve no JSON local.
// Todo banco/storage é acessado pela API interna protegida do bot via BOT_API_URL + BOT_API_KEY.
const app = createServer({ client: null });
applyFinalFixes(app);

const server = http.createServer(app);
createRealtimeServer(server, { app });

server.listen(PORT, () => {
  console.log(`🌐 Site Void Arena rodando em: http://localhost:${PORT}`);
  console.log(`⚡ Realtime WebSocket ativo em: /realtime`);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Erro não tratado no site:', error);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Exceção não tratada no site:', error);
});
