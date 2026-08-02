import { WebSocketServer } from 'ws';

let wss = null;
const clients = new Set();

export function initWebSocket(server) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    clients.add(ws);
    console.log(`[WS] Client connected (${clients.size} total)`);

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'system:connected',
      data: { message: 'Connected to Agent OS', timestamp: new Date().toISOString() },
    }));

    ws.on('close', () => {
      clients.delete(ws);
      console.log(`[WS] Client disconnected (${clients.size} total)`);
    });

    ws.on('error', (err) => {
      console.error('[WS] Error:', err.message);
      clients.delete(ws);
    });
  });

  return wss;
}

export function broadcast(type, data) {
  if (!wss) return;

  const message = JSON.stringify({ type, data, timestamp: new Date().toISOString() });

  for (const client of clients) {
    if (client.readyState === 1) { // WebSocket.OPEN
      try {
        client.send(message);
      } catch (e) {
        clients.delete(client);
      }
    }
  }
}
