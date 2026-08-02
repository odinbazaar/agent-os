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
          <h1 class="page-title">Video Agent</h1>
          <p class="page-subtitle">AI-powered video content production · Higsfield optimized</p>
        </div>
        <button class="btn btn-primary" id="btn-new-video">🎬 New Video Brief</button>
      </div>

      <!-- 80/20 Rule Display -->
      <div class="glass-card" style="padding:var(--space-lg);margin-bottom:var(--space-lg)">
        <div class="flex items-center justify-between" style="margin-bottom:var(--space-md)">
          <h3 class="section-title" style="margin:0">Production Efficiency — 80/20 Rule</h3>
          <span class="text-sm text-muted">AI handles 80% · Human reviews 20%</span>
        </div>
        <div class="ratio-display" style="width:100%">
          <div class="ratio-segment ratio-ai" style="width:80%">🤖 AI — 80%</div>
          <div class="ratio-segment ratio-human" style="width:20%">👤 Human — 20%</div>
        </div>
        <p class="text-sm text-muted" style="margin-top:var(--space-sm)">
          AI completes drafting, editing & initial production. Human operator performs final quality review.
        </p>
      </div>

      <!-- Workflow Steps -->
      <div class="glass-card" style="padding:var(--space-lg);margin-bottom:var(--space-lg)">
        <h3 class="section-title">Production Workflow</h3>
        <div class="video-workflow">
          <div class="workflow-step completed">
            <div class="workflow-step-icon">📝</div>
            <strong>Script</strong>
            <p class="text-sm text-muted" style="margin-top:4px">AI generates video script from brief</p>
          </div>
          <div class="workflow-step completed">
            <div class="workflow-step-icon">🎬</div>
            <strong>Production</strong>
            <p class="text-sm text-muted" style="margin-top:4px">Higsfield renders short-form content</p>
          </div>
          <div class="workflow-step active">
            <div class="workflow-step-icon">✂️</div>
            <strong>Editing</strong>
            <p class="text-sm text-muted" style="margin-top:4px">AI assembles and applies effects</p>
          </div>
          <div class="workflow-step">
            <div class="workflow-step-icon">👁️</div>
            <strong>Review</strong>
            <p class="text-sm text-muted" style="margin-top:4px">Human quality check (20%)</p>
          </div>
        </div>
      </div>

      <div class="grid" style="grid-template-columns:1fr 1fr;gap:var(--space-lg)">
        <!-- Technical Specs -->
        <div class="glass-card" style="padding:var(--space-lg)">
          <h3 class="section-title">Technical Parameters</h3>
          <div style="display:flex;flex-direction:column;gap:var(--space-md)">
            <div class="settings-row">
              <div>
                <div class="settings-label">Max Duration</div>
                <div class="settings-hint">Videos are limited to 10 minutes</div>
              </div>
              <span class="badge badge-working">10 min</span>
            </div>
            <div class="settings-row">
              <div>
                <div class="settings-label">Short-form Engine</div>
                <div class="settings-hint">Higsfield — optimized for ≤60s content</div>
              </div>
              <span class="badge badge-active">Higsfield</span>
            </div>
            <div class="settings-row">
              <div>
                <div class="settings-label">Long-form Content</div>
                <div class="settings-hint">20-30min videos via Boardroom methodology</div>
              </div>
              <span class="badge badge-paused">Manual</span>
            </div>
            <div class="settings-row" style="border:none">
              <div>
                <div class="settings-label">Output Format</div>
                <div class="settings-hint">Standard video output format</div>
              </div>
              <span class="badge badge-idle">MP4 / 1080p</span>
            </div>
          </div>
        </div>

        <!-- Recent Video Tasks -->
        <div class="glass-card" style="padding:var(--space-lg)">
          <h3 class="section-title">Recent Video Tasks</h3>
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
              <p class="text-sm">No video tasks yet. Create a brief to start.</p>
            </div>
          `}
        </div>
      </div>

      <!-- Higsfield Warning -->
      <div class="security-warning" style="margin-top:var(--space-lg);background:var(--yellow-dim);border-color:rgba(255,171,0,0.2)">
        <span class="icon">⚠️</span>
        <div>
          <strong style="color:var(--yellow)">Short-form Optimization Note</strong>
          <p class="text-sm text-secondary" style="margin-top:4px">
            Higsfield is optimized for short-form content (≤60 seconds). For long-form videos (20-30 minutes), 
            use the Boardroom training methodology with manual workflows. The Video Agent handles content up to 10 minutes.
          </p>
        </div>
      </div>
    </div>
  `;

  // New video brief
  container.querySelector('#btn-new-video')?.addEventListener('click', async () => {
    const result = await showModal({
      title: '🎬 New Video Brief',
      content: `
        <div class="form-group">
          <label class="form-label">Video Topic</label>
          <input class="input" id="video-topic" placeholder="e.g. Product demo for SaaS onboarding" />
        </div>
        <div class="form-group">
          <label class="form-label">Duration (seconds, max 600)</label>
          <input class="input" id="video-duration" type="number" value="60" min="5" max="600" />
        </div>
        <div class="form-group">
          <label class="form-label">Format</label>
          <select class="select" id="video-format">
            <option value="short-form">Short-form (≤60s) — Higsfield optimized</option>
            <option value="standard">Standard (1-10 min)</option>
          </select>
        </div>
      `,
      actions: [
        { label: 'Cancel', value: null },
        { label: 'Create Brief', class: 'btn-primary', value: 'create' },
      ],
    });

    if (result === 'create') {
      const topic = document.getElementById('video-topic')?.value;
      const duration = document.getElementById('video-duration')?.value;
      if (!topic) return showToast('Topic is required', 'error');
      try {
        await api.createTask({
          agentId: 'agent-video-001',
          title: `Video: ${topic}`,
          description: `Duration: ${duration}s, Format: short-form`,
          priority: 'normal',
        });
        showToast('Video brief created!', 'success');
        renderVideoAgent(container);
      } catch (e) {
        showToast(e.message, 'error');
      }
    }
  });
}
