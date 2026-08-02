import { config } from '../config.js';
import { v4 as uuidv4 } from 'uuid';
import { insertRow, findAll, findById, query, run as dbRun, deleteRow } from '../db/database.js';

const DATAFORSEO_BASE = 'https://api.dataforseo.com/v3';

function getAuthHeader() {
  const creds = Buffer.from(`${config.dataforseo.login}:${config.dataforseo.password}`).toString('base64');
  return `Basic ${creds}`;
}

async function apiRequest(endpoint, method = 'GET', body = null) {
  if (!config.dataforseo.hasCredentials) {
    return { mock: true, message: 'DataForSEO credentials not configured — returning mock data' };
  }

  const options = {
    method,
    headers: {
      'Authorization': getAuthHeader(),
      'Content-Type': 'application/json',
    },
  };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${DATAFORSEO_BASE}${endpoint}`, options);
  return res.json();
}

// ── Keyword Management ──

export function getKeywords() {
  return findAll('seo_keywords', {}, 'created_at DESC', 500);
}

export function addKeyword({ keyword, locationCode = 2840, languageCode = 'en', device = 'desktop' }) {
  const id = `kw-${uuidv4().slice(0, 8)}`;
  insertRow('seo_keywords', {
    id,
    keyword,
    location_code: locationCode,
    language_code: languageCode,
    device,
  });
  return findById('seo_keywords', id);
}

export function removeKeyword(id) {
  return deleteRow('seo_keywords', id);
}

// ── Rank Checking ──

export async function checkRank(keywordId) {
  const kw = findById('seo_keywords', keywordId);
  if (!kw) return null;

  if (!config.dataforseo.hasCredentials) {
    // Mock rank data for demo
    const mockRank = Math.floor(Math.random() * 50) + 1;
    const mockUrl = `https://example.com/page-${Math.floor(Math.random() * 10)}`;

    dbRun('INSERT INTO seo_history (keyword_id, rank, url) VALUES (?, ?, ?)', [keywordId, mockRank, mockUrl]);
    dbRun("UPDATE seo_keywords SET last_rank = ?, last_url = ?, last_checked = datetime('now') WHERE id = ?", [mockRank, mockUrl, keywordId]);

    return { keyword: kw.keyword, rank: mockRank, url: mockUrl, mock: true };
  }

  // Real DataForSEO async task workflow
  try {
    const taskResponse = await apiRequest('/serp/google/organic/task_post', 'POST', [{
      language_code: kw.language_code,
      location_code: kw.location_code,
      keyword: kw.keyword,
      device: kw.device,
    }]);

    if (taskResponse.tasks && taskResponse.tasks[0]) {
      const taskId = taskResponse.tasks[0].id;
      // Poll after a delay (in production, use webhooks)
      await new Promise(r => setTimeout(r, 15000));

      const resultResponse = await apiRequest(`/serp/google/organic/task_get/${taskId}`);
      if (resultResponse.tasks && resultResponse.tasks[0]?.result) {
        const items = resultResponse.tasks[0].result[0]?.items || [];
        const firstResult = items[0];
        const rank = firstResult?.rank_absolute || null;
        const url = firstResult?.url || null;

        dbRun('INSERT INTO seo_history (keyword_id, rank, url) VALUES (?, ?, ?)', [keywordId, rank, url]);
        dbRun("UPDATE seo_keywords SET last_rank = ?, last_url = ?, last_checked = datetime('now') WHERE id = ?", [rank, url, keywordId]);

        return { keyword: kw.keyword, rank, url, mock: false };
      }
    }
    return { keyword: kw.keyword, rank: null, url: null, error: 'No results returned' };
  } catch (error) {
    return { keyword: kw.keyword, rank: null, url: null, error: error.message };
  }
}

export async function checkAllRanks() {
  const keywords = getKeywords();
  const results = [];
  for (const kw of keywords) {
    const result = await checkRank(kw.id);
    results.push(result);
  }
  return results;
}

export function getKeywordHistory(keywordId, limit = 30) {
  return query(
    'SELECT * FROM seo_history WHERE keyword_id = ? ORDER BY timestamp DESC LIMIT ?',
    [keywordId, limit]
  );
}

export function getSeoSummary() {
  const keywords = getKeywords();
  const ranked = keywords.filter(k => k.last_rank !== null);
  const avgRank = ranked.length > 0
    ? Math.round(ranked.reduce((s, k) => s + k.last_rank, 0) / ranked.length)
    : null;

  return {
    totalKeywords: keywords.length,
    trackedWithRank: ranked.length,
    averageRank: avgRank,
    top10Count: ranked.filter(k => k.last_rank <= 10).length,
    top30Count: ranked.filter(k => k.last_rank <= 30).length,
    hasCredentials: config.dataforseo.hasCredentials,
  };
}
