import { config } from '../config.js';
import { v4 as uuidv4 } from 'uuid';
import { insertRow, findAll, findById, query, run as dbRun, deleteRow } from '../db/database.js';

const DATAFORSEO_BASE = 'https://api.dataforseo.com/v3';

// How deep into the SERP we look for the target domain.
const SERP_DEPTH = 100;

// How many keywords are checked at once during a bulk check.
const BULK_CONCURRENCY = 5;

const TARGET_DOMAIN_KEY = 'seo_target_domain';

function getAuthHeader() {
  const creds = Buffer.from(`${config.dataforseo.login}:${config.dataforseo.password}`).toString('base64');
  return `Basic ${creds}`;
}

async function apiRequest(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Authorization': getAuthHeader(),
      'Content-Type': 'application/json',
    },
  };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${DATAFORSEO_BASE}${endpoint}`, options);
  const json = await res.json();

  if (!res.ok) {
    throw new Error(`DataForSEO HTTP ${res.status}: ${json?.status_message || res.statusText}`);
  }
  return json;
}

// ── Target Domain ──

/**
 * The domain whose ranking we are tracking. Without it a SERP response tells us
 * nothing — the first result is simply whoever ranks first, not the user.
 */
export function getTargetDomain() {
  const row = query('SELECT value FROM workspace_configs WHERE key = ?', [TARGET_DOMAIN_KEY])[0];
  return row?.value || null;
}

export function setTargetDomain(domain) {
  const value = normalizeDomain(domain) || '';
  const existing = query('SELECT id FROM workspace_configs WHERE key = ?', [TARGET_DOMAIN_KEY]);

  if (existing.length > 0) {
    dbRun("UPDATE workspace_configs SET value = ?, updated_at = datetime('now') WHERE key = ?", [value, TARGET_DOMAIN_KEY]);
  } else {
    insertRow('workspace_configs', { key: TARGET_DOMAIN_KEY, value });
  }
  return value;
}

/** "https://www.Example.com/path" → "example.com" */
export function normalizeDomain(value) {
  if (!value) return null;
  let d = String(value).trim().toLowerCase();
  d = d.replace(/^https?:\/\//, '');
  d = d.split('/')[0];
  d = d.replace(/^www\./, '');
  d = d.split(':')[0];
  return d || null;
}

function domainOf(item) {
  if (item?.domain) return normalizeDomain(item.domain);
  if (item?.url) {
    try {
      return normalizeDomain(new URL(item.url).hostname);
    } catch {
      return null;
    }
  }
  return null;
}

/** Matches the domain itself and its subdomains (blog.example.com counts). */
function matchesTarget(itemDomain, target) {
  if (!itemDomain || !target) return false;
  return itemDomain === target || itemDomain.endsWith(`.${target}`);
}

// ── Keyword Management ──

export function getKeywords() {
  return findAll('seo_keywords', {}, 'created_at DESC', 500);
}

// DataForSEO konum kodu 2792 = Türkiye. Farklı bir pazar takip edilecekse
// istek gövdesinde locationCode/languageCode geçilerek değiştirilebilir.
export function addKeyword({ keyword, locationCode = 2792, languageCode = 'tr', device = 'desktop', targetDomain = null }) {
  const id = `kw-${uuidv4().slice(0, 8)}`;
  insertRow('seo_keywords', {
    id,
    keyword,
    location_code: locationCode,
    language_code: languageCode,
    device,
    target_domain: normalizeDomain(targetDomain),
  });
  return findById('seo_keywords', id);
}

export function removeKeyword(id) {
  return deleteRow('seo_keywords', id);
}

// ── Rank Checking ──

function saveRank(keywordId, rank, url) {
  dbRun('INSERT INTO seo_history (keyword_id, rank, url) VALUES (?, ?, ?)', [keywordId, rank, url]);
  dbRun(
    "UPDATE seo_keywords SET last_rank = ?, last_url = ?, last_checked = datetime('now') WHERE id = ?",
    [rank, url, keywordId]
  );
}

export async function checkRank(keywordId) {
  const kw = findById('seo_keywords', keywordId);
  if (!kw) return null;

  if (!config.dataforseo.hasCredentials) {
    // Mock rank data for demo
    const mockRank = Math.floor(Math.random() * 50) + 1;
    const mockUrl = `https://example.com/page-${Math.floor(Math.random() * 10)}`;
    saveRank(keywordId, mockRank, mockUrl);
    return { keyword: kw.keyword, rank: mockRank, url: mockUrl, mock: true };
  }

  const target = normalizeDomain(kw.target_domain) || getTargetDomain();
  if (!target) {
    return {
      keyword: kw.keyword,
      rank: null,
      url: null,
      error: 'Takip edilecek domain tanımlı değil — SEO sayfasından hedef domaini ayarlayın',
    };
  }

  try {
    // Live endpoint returns the SERP in one call. The task_post/task_get pair
    // would need polling, which does not fit a request triggered from the UI.
    const response = await apiRequest('/serp/google/organic/live/advanced', 'POST', [{
      keyword: kw.keyword,
      language_code: kw.language_code,
      location_code: kw.location_code,
      device: kw.device,
      depth: SERP_DEPTH,
    }]);

    const task = response?.tasks?.[0];
    if (!task) throw new Error('DataForSEO boş yanıt döndürdü');
    if (task.status_code && task.status_code !== 20000) {
      throw new Error(`${task.status_code}: ${task.status_message}`);
    }

    const items = task.result?.[0]?.items || [];
    const hit = items.find(item => item.type === 'organic' && matchesTarget(domainOf(item), target));

    // No hit means the domain is not in the top SERP_DEPTH results — that is a
    // real, recordable outcome, not an error.
    const rank = hit?.rank_absolute ?? null;
    const url = hit?.url ?? null;

    saveRank(keywordId, rank, url);

    return { keyword: kw.keyword, rank, url, target, mock: false, checkedDepth: SERP_DEPTH };
  } catch (error) {
    return { keyword: kw.keyword, rank: null, url: null, target, error: error.message };
  }
}

export async function checkAllRanks() {
  const keywords = getKeywords();
  const results = [];

  // Bounded concurrency — sequential calls would take minutes for a long list,
  // unbounded ones would hammer the API.
  for (let i = 0; i < keywords.length; i += BULK_CONCURRENCY) {
    const batch = keywords.slice(i, i + BULK_CONCURRENCY);
    const settled = await Promise.all(batch.map(kw => checkRank(kw.id)));
    results.push(...settled);
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
    hasCredentials: Boolean(config.dataforseo.hasCredentials),
    targetDomain: getTargetDomain(),
  };
}
