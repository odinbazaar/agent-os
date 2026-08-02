import { Router } from 'express';
import { getAllAgents, getAgent, createAgent, updateAgent, deleteAgent, startAgent, stopAgent, pauseAgent, getAgentStats } from '../agents/manager.js';
import { getAllTypes } from '../agents/registry.js';

const router = Router();

router.get('/', (req, res) => {
  res.json({ success: true, data: getAllAgents() });
});

router.get('/types', (req, res) => {
  res.json({ success: true, data: getAllTypes() });
});

router.get('/stats', (req, res) => {
  res.json({ success: true, data: getAgentStats() });
});

router.get('/:id', (req, res) => {
  const agent = getAgent(req.params.id);
  if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' });
  res.json({ success: true, data: agent });
});

router.post('/', (req, res) => {
  const { name, type, description, config } = req.body;
  if (!name || !type) return res.status(400).json({ success: false, error: 'Name and type are required' });
  const agent = createAgent({ name, type, description, config });
  res.status(201).json({ success: true, data: agent });
});

router.put('/:id', (req, res) => {
  const updated = updateAgent(req.params.id, req.body);
  if (!updated) return res.status(404).json({ success: false, error: 'Agent not found' });
  res.json({ success: true, data: updated });
});

router.delete('/:id', (req, res) => {
  const deleted = deleteAgent(req.params.id);
  if (!deleted) return res.status(404).json({ success: false, error: 'Agent not found' });
  res.json({ success: true });
});

router.post('/:id/start', (req, res) => {
  const agent = startAgent(req.params.id);
  if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' });
  res.json({ success: true, data: agent });
});

router.post('/:id/stop', (req, res) => {
  const agent = stopAgent(req.params.id);
  if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' });
  res.json({ success: true, data: agent });
});

router.post('/:id/pause', (req, res) => {
  const agent = pauseAgent(req.params.id);
  if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' });
  res.json({ success: true, data: agent });
});

export default router;
