import { api } from '../api.js';
import { showToast, showModal, escapeHtml } from '../components/ui.js';

export async function renderVideoAgent(container) {
  let tasks = [];
  try {
    const res = await api.getTasks('agent-video-001');
    tasks = res.data || [];
  } catch {}

  container.innerHTML = `
    <div class="animate-fade">
      <div class="flex items-center justify-between" style="margin-bottom:var(--space-lg)">
        <div>
          <h1 class="page-title">Video Ajanı</h1>
          <p class="page-subtitle">Yapay zekâ destekli video üretimi · Higsfield için optimize</p>
        </div>
        <button class="btn btn-primary" id="btn-new-video">🎬 Yeni Video Brifingi</button>
      </div>

      <!-- 80/20 Rule Display -->
      <div class="glass-card" style="padding:var(--space-lg);margin-bottom:var(--space-lg)">
        <div class="flex items-center justify-between" style="margin-bottom:var(--space-md)">
          <h3 class="section-title" style="margin:0">Üretim Verimliliği — 80/20 Kuralı</h3>
          <span class="text-sm text-muted">Yapay zekâ %80 · İnsan incelemesi %20</span>
        </div>
        <div class="ratio-display" style="width:100%">
          <div class="ratio-segment ratio-ai" style="width:80%">🤖 Yapay Zekâ — %80</div>
          <div class="ratio-segment ratio-human" style="width:20%">👤 İnsan — %20</div>
        </div>
        <p class="text-sm text-muted" style="margin-top:var(--space-sm)">
          Taslak, kurgu ve ilk üretimi yapay zekâ tamamlar. Son kalite kontrolünü operatör yapar.
        </p>
      </div>

      <!-- Workflow Steps -->
      <div class="glass-card" style="padding:var(--space-lg);margin-bottom:var(--space-lg)">
        <h3 class="section-title">Üretim Akışı</h3>
        <div class="video-workflow">
          <div class="workflow-step completed">
            <div class="workflow-step-icon">📝</div>
            <strong>Senaryo</strong>
            <p class="text-sm text-muted" style="margin-top:4px">Yapay zekâ brifingden senaryo üretir</p>
          </div>
          <div class="workflow-step completed">
            <div class="workflow-step-icon">🎬</div>
            <strong>Üretim</strong>
            <p class="text-sm text-muted" style="margin-top:4px">Higsfield kısa form içeriği işler</p>
          </div>
          <div class="workflow-step active">
            <div class="workflow-step-icon">✂️</div>
            <strong>Kurgu</strong>
            <p class="text-sm text-muted" style="margin-top:4px">Yapay zekâ birleştirir ve efekt uygular</p>
          </div>
          <div class="workflow-step">
            <div class="workflow-step-icon">👁️</div>
            <strong>İnceleme</strong>
            <p class="text-sm text-muted" style="margin-top:4px">İnsan kalite kontrolü (%20)</p>
          </div>
        </div>
      </div>

      <div class="grid" style="grid-template-columns:1fr 1fr;gap:var(--space-lg)">
        <!-- Technical Specs -->
        <div class="glass-card" style="padding:var(--space-lg)">
          <h3 class="section-title">Teknik Parametreler</h3>
          <div style="display:flex;flex-direction:column;gap:var(--space-md)">
            <div class="settings-row">
              <div>
                <div class="settings-label">Maksimum Süre</div>
                <div class="settings-hint">Videolar 10 dakika ile sınırlı</div>
              </div>
              <span class="badge badge-working">10 dk</span>
            </div>
            <div class="settings-row">
              <div>
                <div class="settings-label">Kısa Form Motoru</div>
                <div class="settings-hint">Higsfield — ≤60 sn içerik için optimize</div>
              </div>
              <span class="badge badge-active">Higsfield</span>
            </div>
            <div class="settings-row">
              <div>
                <div class="settings-label">Uzun Form İçerik</div>
                <div class="settings-hint">20-30 dk videolar Boardroom metoduyla</div>
              </div>
              <span class="badge badge-paused">Manuel</span>
            </div>
            <div class="settings-row" style="border:none">
              <div>
                <div class="settings-label">Çıktı Formatı</div>
                <div class="settings-hint">Standart video çıktı formatı</div>
              </div>
              <span class="badge badge-idle">MP4 / 1080p</span>
            </div>
          </div>
        </div>

        <!-- Recent Video Tasks -->
        <div class="glass-card" style="padding:var(--space-lg)">
          <h3 class="section-title">Son Video Görevleri</h3>
          ${tasks.length > 0 ? tasks.slice(0, 5).map(t => `
            <div class="activity-item" style="padding:var(--space-sm) 0">
              <span class="activity-dot task"></span>
              <div class="activity-body">
                <div class="activity-title text-sm">${escapeHtml(t.title)}</div>
                <div class="activity-detail">${escapeHtml(t.status)}</div>
              </div>
            </div>
          `).join('') : `
            <div class="empty-state" style="padding:var(--space-lg)">
              <div class="icon">🎬</div>
              <p class="text-sm">Henüz video görevi yok. Başlamak için bir brifing oluşturun.</p>
            </div>
          `}
        </div>
      </div>

      <!-- Higsfield Warning -->
      <div class="security-warning" style="margin-top:var(--space-lg);background:var(--yellow-dim);border-color:rgba(255,171,0,0.2)">
        <span class="icon">⚠️</span>
        <div>
          <strong style="color:var(--yellow)">Kısa Form Optimizasyon Notu</strong>
          <p class="text-sm text-secondary" style="margin-top:4px">
            Higsfield kısa form içerik (≤60 saniye) için optimize edilmiştir. Uzun form videolarda (20-30 dakika)
            Boardroom eğitim metodolojisi ile manuel akış kullanın. Video Ajanı en fazla 10 dakikalık içerik işler.
          </p>
        </div>
      </div>
    </div>
  `;

  // New video brief
  container.querySelector('#btn-new-video')?.addEventListener('click', async () => {
    const result = await showModal({
      title: '🎬 Yeni Video Brifingi',
      content: `
        <div class="form-group">
          <label class="form-label">Video Konusu</label>
          <input class="input" id="video-topic" placeholder="örn. SaaS onboarding için ürün tanıtımı" />
        </div>
        <div class="form-group">
          <label class="form-label">Süre (saniye, en fazla 600)</label>
          <input class="input" id="video-duration" type="number" value="60" min="5" max="600" />
        </div>
        <div class="form-group">
          <label class="form-label">Format</label>
          <select class="select" id="video-format">
            <option value="short-form">Kısa form (≤60 sn) — Higsfield optimize</option>
            <option value="standard">Standart (1-10 dk)</option>
          </select>
        </div>
      `,
      actions: [
        { label: 'İptal', value: null },
        { label: 'Brifing Oluştur', class: 'btn-primary', value: 'create' },
      ],
    });

    if (result === 'create') {
      const topic = document.getElementById('video-topic')?.value;
      const duration = document.getElementById('video-duration')?.value;
      const format = document.getElementById('video-format')?.value;
      if (!topic) return showToast('Konu zorunlu', 'error');
      try {
        await api.createTask({
          agentId: 'agent-video-001',
          title: `Video: ${topic}`,
          description: `Süre: ${duration} sn, Format: ${format === 'standard' ? 'standart' : 'kısa form'}`,
          priority: 'normal',
        });
        showToast('Video brifingi oluşturuldu', 'success');
        renderVideoAgent(container);
      } catch (e) {
        showToast(e.message, 'error');
      }
    }
  });
}
