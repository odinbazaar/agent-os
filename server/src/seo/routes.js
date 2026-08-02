import { Router } from 'express';
import { getKeywords, addKeyword, removeKeyword, checkRank, checkAllRanks, getKeywordHistory, getSeoSummary } from './tracker.js';

const router = Router();

router.get('/keywords', (req, res) => {
  res.json({ success: true, data: getKeywords() });
});

router.post('/keywords', (req, res) => {
  const { keyword, locationCode, languageCode, device } = req.body;
  if (!keyword) return res.status(400).json({ success: false, error: 'Keyword is required' });
  const result = addKeyword({ keyword, locationCode, languageCode, device });
  res.json({ success: true, data: result });
});

router.delete('/keywords/:id', (req, res) => {
  removeKeyword(req.params.id);
  res.json({ success: true });
});

router.post('/check/:id', async (req, res) => {
  const result = await checkRank(req.params.id);
  if (!result) return res.status(404).json({ success: false, error: 'Keyword not found' });
  res.json({ success: true, data: result });
});

router.post('/check-all', async (req, res) => {
  const results = await checkAllRanks();
  res.json({ success: true, data: results });
});

router.get('/history/:keywordId', (req, res) => {
  const history = getKeywordHistory(req.params.keywordId);
  res.json({ success: true, data: history });
});

router.get('/summary', (req, res) => {
  res.json({ success: true, data: getSeoSummary() });
});

export default router;
