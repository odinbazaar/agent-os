import { Router } from 'express';
import { findAll, insertRow, query, run as dbRun } from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Get workspace configurations
router.get('/config', (req, res) => {
  const configs = findAll('workspace_configs', {}, 'key ASC', 100);
  const configMap = {};
  configs.forEach(c => { configMap[c.key] = c.value; });
  res.json({ success: true, data: configMap });
});

// Set workspace configuration
router.post('/config', (req, res) => {
  const { key, value } = req.body;
  if (!key) return res.status(400).json({ success: false, error: 'Key is required' });

  const existing = query('SELECT * FROM workspace_configs WHERE key = ?', [key]);
  if (existing.length > 0) {
    dbRun("UPDATE workspace_configs SET value = ?, updated_at = datetime('now') WHERE key = ?", [value, key]);
  } else {
    insertRow('workspace_configs', { key, value });
  }
  res.json({ success: true });
});

// Fork workspace (create a new configuration snapshot)
router.post('/fork', (req, res) => {
  const { name, model = 'claude', description = '' } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Fork name is required' });

  const forkId = `fork-${uuidv4().slice(0, 8)}`;
  const forkData = {
    id: forkId,
    name,
    model,
    description,
    parentWorkspace: 'agent-os-main',
    createdAt: new Date().toISOString(),
    status: 'created',
  };

  // Store fork as a config entry
  insertRow('workspace_configs', {
    key: `fork:${forkId}`,
    value: JSON.stringify(forkData),
  });

  res.json({ success: true, data: forkData });
});

// List all forks
router.get('/forks', (req, res) => {
  const forks = query('SELECT * FROM workspace_configs WHERE key LIKE ?', ['fork:%']);
  const parsed = forks.map(f => {
    try { return JSON.parse(f.value); } catch { return null; }
  }).filter(Boolean);
  res.json({ success: true, data: parsed });
});

// Available models for forking
router.get('/models', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 'claude', name: 'Claude', role: 'Sistem kurulumu ve operasyonel yönetim', status: 'kullanılabilir' },
      { id: 'hermes', name: 'Hermes', role: 'Otonom görev yönetimi ve rakip analizi', status: 'kullanılabilir' },
      { id: 'fable5', name: 'Fable 5', role: 'Mimari planlama ve stratejik yapılandırma', status: 'kullanılabilir' },
      { id: 'gpt56soul', name: 'GPT 5.6 Soul', role: 'Karmaşık görevler ve en yüksek performanslı işleme', status: 'kullanılabilir' },
    ],
  });
});

export default router;
