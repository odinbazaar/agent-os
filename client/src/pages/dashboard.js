import { api } from '../api.js';
import { statusBadge, timeAgo, escapeHtml } from '../components/ui.js';
import { ws } from '../websocket.js';
import { navigate } from '../router.js';

export async function renderDashboard(container) {
  let data;
  try {
    const res = await api.dashboard();
    data = res.data;
  } catch (e) {
    data = {
      agents: { totalAgents: 0, activeAgents: 0, runningTasks: 0, needsReview: 0, completedTasks: 0 },
      seo: { totalKeywords: 0, averageRank: null, top10Count: 0 },
      activity: [],
      mcpTools: 5,
      system: { version: '1.0.0', uptime: 0 },
    };
  }

  const uptime = formatUptime(data.system.uptime);

  container.innerHTML = `
    <div class="animate-fade">
      <div class="flex items-center justify-between" style="margin-bottom:var(--space-lg)">
        <div>
          <h1 class="page-title">Komuta Merkezi</h1>
          <p class="page-subtitle">Agent OS operasyonel özeti — tüm sistemler gerçek zamanlı izleniyor</p>
        </div>
        <div class="flex gap-sm">
          <button class="btn btn-primary" id="btn-new-agent">
            <span>+</span> Yeni Ajan
          </button>
        </div>
      </div>

      <!-- Metrics Grid -->
      <div class="grid grid-4 stagger" style="margin-bottom:var(--space-xl)">
        <div class="glass-card metric-card">
          <div class="metric-card-header">
            <span class="metric-card-label">Aktif Ajanlar</span>
            <span class="metric-card-icon">🤖</span>
          </div>
          <div class="metric-card-value text-cyan" id="metric-active">${data.agents.activeAgents}</div>
          <div class="metric-card-trend neutral">
            <span>toplam ${data.agents.totalAgents} kayıtlı</span>
          </div>
        </div>
        <div class="glass-card metric-card">
          <div class="metric-card-header">
            <span class="metric-card-label">Çalışan Görevler</span>
            <span class="metric-card-icon">⚡</span>
          </div>
          <div class="metric-card-value text-green" id="metric-tasks">${data.agents.runningTasks}</div>
          <div class="metric-card-trend neutral">
            <span>toplam ${data.agents.completedTasks} tamamlandı</span>
          </div>
        </div>
        <div class="glass-card metric-card">
          <div class="metric-card-header">
            <span class="metric-card-label">Ortalama SEO Sırası</span>
            <span class="metric-card-icon">📈</span>
          </div>
          <div class="metric-card-value text-orange" id="metric-seo">${data.seo.averageRank ?? '—'}</div>
          <div class="metric-card-trend neutral">
            <span>${data.seo.totalKeywords} kelime takipte</span>
          </div>
        </div>
        <div class="glass-card metric-card">
          <div class="metric-card-header">
            <span class="metric-card-label">Çalışma Süresi</span>
            <span class="metric-card-icon">🕐</span>
          </div>
          <div class="metric-card-value text-purple" id="metric-uptime">${uptime}</div>
          <div class="metric-card-trend neutral">
            <span>${data.mcpTools} MCP aracı yüklü</span>
          </div>
        </div>
      </div>

      <div class="grid" style="grid-template-columns:1fr 1fr;gap:var(--space-lg)">
        <!-- Agent Status Grid -->
        <div class="glass-card" style="padding:0;overflow:hidden">
          <div class="flex items-center justify-between" style="padding:var(--space-lg);border-bottom:1px solid var(--glass-border)">
            <h3 class="section-title" style="margin:0">Ajan Filosu</h3>
            <button class="btn btn-sm" onclick="location.hash='#/agents'">Tümünü Gör →</button>
          </div>
          <div id="agent-fleet-list">
            ${await renderAgentFleet()}
          </div>
        </div>

        <!-- Activity Feed -->
        <div class="glass-card" style="padding:0;overflow:hidden">
          <div class="flex items-center justify-between" style="padding:var(--space-lg);border-bottom:1px solid var(--glass-border)">
            <h3 class="section-title" style="margin:0">Son Aktiviteler</h3>
            <span class="text-sm text-muted">Canlı akış</span>
          </div>
          <div class="activity-feed" id="activity-feed" style="max-height:360px;overflow-y:auto">
            ${renderActivityItems(data.activity)}
          </div>
        </div>
      </div>

      <!-- MCP Tools Overview -->
      <div class="glass-card" style="margin-top:var(--space-lg);padding:var(--space-lg)">
        <h3 class="section-title">MCP Araç Kaydı</h3>
        <div class="grid grid-auto" id="mcp-tools-grid">
          ${await renderMcpTools()}
        </div>
      </div>
    </div>
  `;

  // Event: New Agent button
  container.querySelector('#btn-new-agent')?.addEventListener('click', () => navigate('/agents'));

  // Live WebSocket updates
  const unsubs = [];
  unsubs.push(ws.on('agent:status', async () => {
    const el = document.getElementById('agent-fleet-list');
    if (el) el.innerHTML = await renderAgentFleet();
  }));

  return () => unsubs.forEach(fn => fn());
}

async function renderAgentFleet() {
  try {
    const res = await api.getAgents();
    const agents = res.data;
    if (!agents.length) return '<div class="empty-state"><p>Kayıtlı ajan yok</p></div>';

    return agents.map(a => {
      const config = tryParse(a.config);
      return `
        <div class="activity-item" style="cursor:pointer" onclick="location.hash='#/agents'">
          <span style="font-size:1.3rem">${getAgentIcon(a.type)}</span>
          <div class="activity-body">
            <div class="activity-title">${escapeHtml(a.name)}</div>
            <div class="activity-detail">${escapeHtml(a.type)}</div>
          </div>
          ${statusBadge(a.status)}
        </div>
      `;
    }).join('');
  } catch {
    return '<div class="empty-state"><p>Ajanlar yüklenemedi</p></div>';
  }
}

function renderActivityItems(activities) {
  if (!activities || !activities.length) {
    return '<div class="empty-state" style="padding:var(--space-xl)"><p class="text-muted">Henüz aktivite yok</p></div>';
  }
  return activities.map(a => `
    <div class="activity-item">
      <span class="activity-dot ${a.type}"></span>
      <div class="activity-body">
        <div class="activity-title">${escapeHtml(a.title)}</div>
        <div class="activity-detail">${escapeHtml(a.detail)}</div>
      </div>
      <span class="activity-time">${timeAgo(a.timestamp)}</span>
    </div>
  `).join('');
}

async function renderMcpTools() {
  try {
    const res = await api.mcpTools();
    return res.data.map(t => `
      <div class="glass-card interactive" style="padding:var(--space-md)">
        <div class="flex items-center gap-sm" style="margin-bottom:var(--space-sm)">
          <span>${getCategoryIcon(t.category)}</span>
          <strong style="font-size:0.875rem">${escapeHtml(t.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))}</strong>
        </div>
        <p class="text-sm text-secondary" style="line-height:1.4">${escapeHtml(t.description.slice(0, 80))}...</p>
        <div style="margin-top:var(--space-sm)">
          <span class="badge badge-working">Simülasyon</span>
        </div>
      </div>
    `).join('');
  } catch {
    return '<p class="text-muted">MCP araçları yüklenemedi</p>';
  }
}

function getAgentIcon(type) {
  const icons = { 'hermes-apollo': '🎙️', 'hermes-oracle': '🔮', 'lead-generation': '🎯', 'delegate': '🔄', 'video-agent': '🎬', 'seo-tracker': '📊', 'custom': '⚙️' };
  return icons[type] || '⚙️';
}

function getCategoryIcon(cat) {
  const icons = { interaction: '💬', intelligence: '🧠', growth: '📈', orchestration: '🔗', content: '🎨', analytics: '📊' };
  return icons[cat] || '⚙️';
}

function tryParse(json) {
  try { return JSON.parse(json); } catch { return {}; }
}

function formatUptime(seconds) {
  if (!seconds) return '0 dk';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h} sa ${m} dk`;
  return `${m} dk`;
}
