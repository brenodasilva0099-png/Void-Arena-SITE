const { WebSocketServer } = require('ws');

function safeJson(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return JSON.stringify({ type: 'error', message: 'payload inválido' });
  }
}

function createRealtimeServer(server, { app } = {}) {
  const wss = new WebSocketServer({
    server,
    path: '/realtime'
  });

  function broadcast(event = {}) {
    const payload = {
      type: event.type || 'dashboard:update',
      payload: event.payload || {},
      source: event.source || 'site',
      createdAt: event.createdAt || new Date().toISOString()
    };

    const message = safeJson(payload);

    wss.clients.forEach((client) => {
      if (client.readyState === client.OPEN) {
        client.send(message);
      }
    });

    return {
      sent: wss.clients.size,
      event: payload
    };
  }

  wss.on('connection', (socket) => {
    socket.isAlive = true;

    socket.on('pong', () => {
      socket.isAlive = true;
    });

    socket.send(safeJson({
      type: 'realtime:connected',
      payload: { ok: true },
      source: 'site',
      createdAt: new Date().toISOString()
    }));
  });

  const heartbeat = setInterval(() => {
    wss.clients.forEach((socket) => {
      if (socket.isAlive === false) {
        socket.terminate();
        return;
      }

      socket.isAlive = false;
      socket.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(heartbeat));

  const realtime = {
    wss,
    broadcast
  };

  if (app) {
    app.locals.realtime = realtime;
  }

  return realtime;
}

module.exports = {
  createRealtimeServer
};
