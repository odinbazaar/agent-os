import { Router } from 'express';
import { getDevices, getNetworkStatus } from './client.js';

const router = Router();

router.get('/devices', async (req, res) => {
  const result = await getDevices();
  res.json({ success: true, data: result });
});

router.get('/status', async (req, res) => {
  const result = await getNetworkStatus();
  res.json({ success: true, data: result });
});

export default router;
