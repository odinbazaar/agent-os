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
          <h1 class="page-title">SEO Sıra Takibi</h1>
          <p class="page-subtitle">DataForSEO entegrasyonu · Arama görünürlüğünüzü izleyin</p>
        </div>
        <div class="flex gap-sm">
          <button class="btn" id="btn-check-all">🔄 Tüm Sıraları Kontrol Et</button>
          <button class="btn btn-primary" id="btn-add-keyword">+ Kelime Ekle</button>
        </div>
      </div>

      <!-- API Status -->
      <div class="seo-status-bar">
        <span class="seo-status-dot ${summary.hasCredentials ? 'live' : 'mock'}"></span>
        <span class="text-sm" style="font-weight:500">${summary.hasCredentials ? 'DataForSEO Bağlı' : 'Demo Modu (Örnek Veri)'}</span>
        <span class="text-sm text-muted" style="margin-left:auto">
          ${!summary.hasCredentials ? 'Canlı veri için .env dosyasına kimlik bilgisi ekleyin' : 'Canlı API bağlantısı aktif'}
        </span>
      </div>

      <!-- SEO Metrics -->
      <div class="grid grid-4 stagger" style="margin-bottom:var(--space-lg)">
        <div class="glass-card metric-card">
          <div class="metric-card-header">
            <span class="metric-card-label">Takip Edilen Kelime</span>
            <span class="metric-card-icon">🔑</span>
          </div>
          <div class="metric-card-value text-cyan">${summary.totalKeywords || 0}</div>
        </div>
        <div class="glass-card metric-card">
          <div class="metric-card-header">
            <span class="metric-card-label">Ortalama Sıra</span>
            <span class="metric-card-icon">📊</span>
          </div>
          <div class="metric-card-value text-orange">${summary.averageRank ?? '—'}</div>
        </div>
        <div class="glass-card metric-card">
          <div class="metric-card-header">
            <span class="metric-card-label">İlk 10'daki Kelime</span>
            <span class="metric-card-icon">🏆</span>
          </div>
          <div class="metric-card-value text-green">${summary.top10Count || 0}</div>
        </div>
        <div class="glass-card metric-card">
          <div class="metric-card-header">
            <span class="metric-card-label">İlk 30'daki Kelime</span>
            <span class="metric-card-icon">📈</span>
          </div>
          <div class="metric-card-value text-purple">${summary.top30Count || 0}</div>
        </div>
      </div>

      <!-- Keywords Table -->
      <div class="glass-card" style="padding:0;overflow:hidden">
        <div class="flex items-center justify-between" style="padding:var(--space-lg);border-bottom:1px solid var(--glass-border)">
          <h3 class="section-title" style="margin:0">Takip Edilen Kelimeler</h3>
          <span class="text-sm text-muted">${keywords.length} kelime</span>
        </div>
        ${keywords.length > 0 ? `
          <div class="table-container" style="border:none;border-radius:0">
            <table>
              <thead>
                <tr>
                  <th>Kelime</th>
                  <th>Sıra</th>
                  <th>URL</th>
                  <th>Cihaz</th>
                  <th>Son Kontrol</th>
                  <th>İşlemler</th>
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
                    <td class="text-sm text-muted">${escapeHtml(kw.last_checked) || 'Hiç'}</td>
                    <td>
                      <div class="flex gap-xs">
                        <button class="btn btn-sm" data-check-kw="${escapeHtml(kw.id)}" title="Sırayı kontrol et">🔍</button>
                        <button class="btn btn-sm btn-danger" data-delete-kw="${escapeHtml(kw.id)}" title="Sil">🗑</button>
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
            <p>Henüz takip edilen kelime yok. İzlemeye başlamak için ilk kelimenizi ekleyin.</p>
          </div>
        `}
      </div>
    </div>
  `;

  // Add keyword
  container.querySelector('#btn-add-keyword')?.addEventListener('click', async () => {
    const keyword = prompt('Takip edilecek kelimeyi girin:');
    if (!keyword) return;
    try {
      await api.addSeoKeyword({ keyword });
      showToast(`"${keyword}" kelimesi eklendi`, 'success');
      renderSeoTracker(container);
    } catch (e) {
      showToast(e.message, 'error');
    }
  });

  // Check all
  container.querySelector('#btn-check-all')?.addEventListener('click', async () => {
    showToast('Tüm kelimelerin sırası kontrol ediliyor...', 'info');
    try {
      await api.checkAllRanks();
      showToast('Tüm sıralar güncellendi', 'success');
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
        showToast('Sıra güncellendi', 'success');
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
        showToast('Kelime kaldırıldı', 'info');
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
