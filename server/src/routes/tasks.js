import { Router } from 'express';
import { getAllTasks, getTask, createTask, executeTask, approveTask, getTaskLogs } from '../agents/executor.js';

const router = Router();

router.get('/', (req, res) => {
  const filters = {};
  if (req.query.agent_id) filters.agent_id = req.query.agent_id;
  res.json({ success: true, data: getAllTasks(filters) });
});

router.get('/:id', (req, res) => {
  const task = getTask(req.params.id);
  if (!task) return res.status(404).json({ success: false, error: 'Task not found' });
  res.json({ success: true, data: task });
});

router.get('/:id/logs', (req, res) => {
  const logs = getTaskLogs(req.params.id);
  res.json({ success: true, data: logs });
});

router.post('/', (req, res) => {
  const { agentId, title, description, priority } = req.body;
  if (!title) return res.status(400).json({ success: false, error: 'Title is required' });
  const task = createTask({ agentId, title, description, priority });
  res.status(201).json({ success: true, data: task });
});

router.post('/:id/execute', async (req, res) => {
  const result = await executeTask(req.params.id);
  if (!result) return res.status(404).json({ success: false, error: 'Task not found' });
  res.json({ success: true, data: result });
});

router.post('/:id/approve', (req, res) => {
  const result = approveTask(req.params.id);
  if (!result) return res.status(404).json({ success: false, error: 'Task not found' });
  res.json({ success: true, data: result });
});

export default router;
