import { Router } from 'express';
import { getAgentStats } from '../agents/manager.js';
import { getSeoSummary } from '../seo/tracker.js';
import { query } from '../db/database.js';
import { getMcpToolDefinitions } from '../mcp/server.js';

const router = Router();

router.get('/', (req, res) => {
  const agentStats = getAgentStats();
  const seoSummary = getSeoSummary();
  const recentActivity = query(
    'SELECT * FROM activity_log ORDER BY timestamp DESC LIMIT 20'
  );
  const mcpTools = getMcpToolDefinitions();

  res.json({
    success: true,
    data: {
      agents: agentStats,
      seo: seoSummary,
      activity: recentActivity,
      mcpTools: mcpTools.length,
      system: {
        version: '1.0.0',
        uptime: process.uptime(),
        platform: process.platform,
        nodeVersion: process.version,
      },
    },
  });
});

router.get('/activity', (req, res) => {
  const limit = parseInt(req.query.limit || '50', 10);
  const activity = query(
    'SELECT * FROM activity_log ORDER BY timestamp DESC LIMIT ?',
    [limit]
  );
  res.json({ success: true, data: activity });
});

router.get('/mcp-tools', (req, res) => {
  res.json({ success: true, data: getMcpToolDefinitions() });
});

export default router;
