import { api } from '../api.js';
import { showToast, escapeHtml } from '../components/ui.js';

export async function renderSeoTracker(container) {
  let keywords = [];
  let summary = {};

  try {
    const [kwRes, sumRes] = await Promise.all([api.getSeoKeywords(), api.getSeoSummary()]);
    keywords = kwRes.data;
    summary = sumRes.data;
  } catch (e) {
    console.error('Failed to load SEO data:', e);
  }

  container.innerHTML = `
    <div class="animate-fade">
      <div class="flex items-center justify-between" style="margin-bottom:var(--space-lg)">
        <div>
          <h1 class="page-title">SEO Rank Tracker</h1>
          <p class="page-subtitle">DataForSEO integration · Track your search visibility</p>
        </div>
        <div class="flex gap-sm">
          <button class="btn" id="btn-check-all">🔄 Check All Ranks</button>
          <button class="btn btn-primary" id="btn-add-keyword">+ Add Keyword</button>
        </div>
      </div>

      <!-- API Status -->
      <div class="seo-status-bar">
        <span class="seo-status-dot ${summary.hasCredentials ? 'live' : 'mock'}"></span>
        <span class="text-sm" style="font-weight:500">${summary.hasCredentials ? 'DataForSEO Connected' : 'Demo Mode (Mock Data)'}</span>
        <span class="text-sm text-muted" style="margin-left:auto">
          ${!summary.hasCredentials ? 'Add credentials to .env for live data' : 'Live API connected'}
        </span>
      </div>

      <!-- SEO Metrics -->
      <div class="grid grid-4 stagger" style="margin-bottom:var(--space-lg)">
        <div class="glass-card metric-card">
          <div class="metric-card-header">
            <span class="metric-card-label">Keywords Tracked</span>
            <span class="metric-card-icon">🔑</span>
          </div>
          <div class="metric-card-value text-cyan">${summary.totalKeywords || 0}</div>
        </div>
        <div class="glass-card metric-card">
          <div class="metric-card-header">
            <span class="metric-card-label">Average Rank</span>
            <span class="metric-card-icon">📊</span>
          </div>
          <div class="metric-card-value text-orange">${summary.averageRank ?? '—'}</div>
        </div>
        <div class="glass-card metric-card">
          <div class="metric-card-header">
            <span class="metric-card-label">Top 10 Keywords</span>
            <span class="metric-card-icon">🏆</span>
          </div>
          <div class="metric-card-value text-green">${summary.top10Count || 0}</div>
        </div>
        <div class="glass-card metric-card">
          <div class="metric-card-header">
            <span class="metric-card-label">Top 30 Keywords</span>
            <span class="metric-card-icon">📈</span>
          </div>
          <div class="metric-card-value text-purple">${summary.top30Count || 0}</div>
        </div>
      </div>

      <!-- Keywords Table -->
      <div class="glass-card" style="padding:0;overflow:hidden">
        <div class="flex items-center justify-between" style="padding:var(--space-lg);border-bottom:1px solid var(--glass-border)">
          <h3 class="section-title" style="margin:0">Tracked Keywords</h3>
          <span class="text-sm text-muted">${keywords.length} keywords</span>
        </div>
        ${keywords.length > 0 ? `
          <div class="table-container" style="border:none;border-radius:0">
            <table>
              <thead>
                <tr>
                  <th>Keyword</th>
                  <th>Rank</th>
                  <th>URL</th>
                  <th>Device</th>
                  <th>Last Checked</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${keywords.map(kw => `
                  <tr>
                    <td><strong>${escapeHtml(kw.keyword)}</strong></td>
                    <td>
                      <span class="text-mono" style="font-size:1.1rem;font-weight:700;color:${getRankColor(kw.last_rank)}">
                        ${kw.last_rank ?? '—'}
                      </span>
                    </td>
                    <td class="text-sm text-muted" style="max-width:200px;overflow:hidden;text-overflow:ellipsis">${escapeHtml(kw.last_url) || '—'}</td>
                    <td><span class="badge badge-idle">${escapeHtml(kw.device)}</span></td>
                    <td class="text-sm text-muted">${escapeHtml(kw.last_checked) || 'Never'}</td>
                    <td>
                      <div class="flex gap-xs">
                        <button class="btn btn-sm" data-check-kw="${escapeHtml(kw.id)}" title="Check rank">🔍</button>
                        <button class="btn btn-sm btn-danger" data-delete-kw="${escapeHtml(kw.id)}" title="Delete">🗑</button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : `
          <div class="empty-state">
            <div class="icon">🔑</div>
            <p>No keywords tracked yet. Add your first keyword to start monitoring.</p>
          </div>
        `}
      </div>
    </div>
  `;

  // Add keyword
  container.querySelector('#btn-add-keyword')?.addEventListener('click', async () => {
    const keyword = prompt('Enter keyword to track:');
    if (!keyword) return;
    try {
      await api.addSeoKeyword({ keyword });
      showToast(`Keyword "${keyword}" added`, 'success');
      renderSeoTracker(container);
    } catch (e) {
      showToast(e.message, 'error');
    }
  });

  // Check all
  container.querySelector('#btn-check-all')?.addEventListener('click', async () => {
    showToast('Checking all keyword ranks...', 'info');
    try {
      await api.checkAllRanks();
      showToast('All ranks updated', 'success');
      renderSeoTracker(container);
    } catch (e) {
      showToast(e.message, 'error');
    }
  });

  // Per-keyword check
  container.querySelectorAll('[data-check-kw]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.checkKw;
      try {
        await api.checkRank(id);
        showToast('Rank updated', 'success');
        renderSeoTracker(container);
      } catch (e) {
        showToast(e.message, 'error');
      }
    });
  });

  // Delete keyword
  container.querySelectorAll('[data-delete-kw]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.deleteKw;
      try {
        await api.deleteSeoKeyword(id);
        showToast('Keyword removed', 'info');
        renderSeoTracker(container);
      } catch (e) {
        showToast(e.message, 'error');
      }
    });
  });
}

function getRankColor(rank) {
  if (rank === null || rank === undefined) return 'var(--text-muted)';
  if (rank <= 3) return 'var(--green)';
  if (rank <= 10) return 'var(--cyan)';
  if (rank <= 30) return 'var(--orange)';
  return 'var(--red)';
}
