import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { getDb } from './db/database.js';
import { initWebSocket } from './websocket.js';

// Routes
import agentRoutes from './routes/agents.js';
import taskRoutes from './routes/tasks.js';
import dashboardRoutes from './routes/dashboard.js';
import workspaceRoutes from './routes/workspace.js';
import seoRoutes from './seo/routes.js';
import tailscaleRoutes from './tailscale/routes.js';

const app = express();
const server = createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    if (!req.url.includes('/ws')) {
      console.log(`[${req.method}] ${req.url} → ${res.statusCode} (${ms}ms)`);
    }
  });
  next();
});

// Initialize database
getDb();
console.log('✓ Database initialized');

// Initialize WebSocket
initWebSocket(server);
console.log('✓ WebSocket server ready');

// API Routes
app.use('/api/agents', agentRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/workspace', workspaceRoutes);
app.use('/api/seo', seoRoutes);
app.use('/api/tailscale', tailscaleRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Serve the built client (production). In dev the Vite server handles this.
const __dirname = dirname(fileURLToPath(import.meta.url));
const clientDist = join(__dirname, '..', '..', 'client', 'dist');

if (existsSync(clientDist)) {
  app.use(express.static(clientDist));

  // SPA fallback — anything that is not an API call returns index.html
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
    res.sendFile(join(clientDist, 'index.html'));
  });
  console.log('✓ Serving client build from client/dist');
} else {
  console.log('○ No client build found — run "npm run build" (dev uses Vite on :5173)');
}

// JSON error handler — without this, failures return an HTML stack trace that
// the client cannot parse (and that leaks internals in production).
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.url}:`, err.message);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({
    success: false,
    error: config.nodeEnv === 'production' ? 'Internal server error' : err.message,
  });
});

// Start server
server.listen(config.port, config.host, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════╗');
  console.log('  ║         🤖 AGENT OS v1.0.0           ║');
  console.log('  ║    AI Operating System — Backend      ║');
  console.log('  ╠══════════════════════════════════════╣');
  console.log(`  ║  API:  http://localhost:${config.port}        ║`);
  console.log(`  ║  WS:   ws://localhost:${config.port}/ws      ║`);
  console.log('  ╚══════════════════════════════════════╝');
  console.log('');
  console.log(`  DataForSEO: ${config.dataforseo.hasCredentials ? '✓ Configured' : '○ Mock mode'}`);
  console.log(`  Tailscale:  ${config.tailscale.hasCredentials ? '✓ Configured' : '○ Mock mode'}`);
  console.log('');
});
