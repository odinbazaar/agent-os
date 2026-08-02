import { api } from '../api.js';
import { escapeHtml } from '../components/ui.js';

export async function renderSettings(container) {
  let tailscaleStatus = {};
  let devices = [];

  try {
    const [statusRes, devicesRes] = await Promise.all([
      api.getTailscaleStatus(),
      api.getTailscaleDevices(),
    ]);
    tailscaleStatus = statusRes.data;
    const devData = devicesRes.data;
    devices = devData.devices || devData || [];
  } catch (e) {
    console.error('Failed to load settings:', e);
  }

  const isMock = tailscaleStatus.mock;

  container.innerHTML = `
    <div class="animate-fade">
      <div style="margin-bottom:var(--space-lg)">
        <h1 class="page-title">Settings</h1>
        <p class="page-subtitle">Tailscale remote access, API configuration, and system preferences</p>
      </div>

      <!-- Tailscale Section -->
      <div class="glass-card" style="padding:var(--space-lg);margin-bottom:var(--space-lg)">
        <div class="flex items-center justify-between" style="margin-bottom:var(--space-lg)">
          <h3 class="section-title" style="margin:0">🌐 Tailscale Remote Access</h3>
          <span class="badge ${isMock ? 'badge-paused' : 'badge-active'}">${isMock ? 'Demo Mode' : 'Connected'}</span>
        </div>

        <!-- Security Warning -->
        <div class="security-warning" style="margin-bottom:var(--space-lg)">
          <span class="icon">🔒</span>
          <div>
            <strong style="color:var(--red)">Security Notice</strong>
            <p class="text-sm text-secondary" style="margin-top:4px">
              Tailscale enables remote access to your local files and services. Configure ACLs (Access Control Lists) 
              to restrict which devices and users can access sensitive data. Review your Tailscale admin console regularly.
            </p>
          </div>
        </div>

        <!-- Tailscale Info -->
        <div class="grid grid-3" style="margin-bottom:var(--space-lg)">
          <div class="glass-card metric-card">
            <div class="metric-card-label">Tailnet</div>
            <div class="metric-card-value text-cyan" style="font-size:1.2rem">${escapeHtml(tailscaleStatus.tailnet) || '—'}</div>
          </div>
          <div class="glass-card metric-card">
            <div class="metric-card-label">Connected Devices</div>
            <div class="metric-card-value text-green">${tailscaleStatus.connectedDevices ?? '—'}</div>
          </div>
          <div class="glass-card metric-card">
            <div class="metric-card-label">Total Devices</div>
            <div class="metric-card-value text-purple">${tailscaleStatus.totalDevices ?? '—'}</div>
          </div>
        </div>

        <!-- Device List -->
        ${Array.isArray(devices) && devices.length > 0 ? `
          <h4 style="font-size:0.85rem;font-weight:600;margin-bottom:var(--space-md)">Network Devices</h4>
          <div class="table-container">
            <table>
              <thead><tr><th>Hostname</th><th>OS</th><th>IP</th><th>Status</th><th>Last Seen</th></tr></thead>
              <tbody>
                ${devices.map(d => `
                  <tr>
                    <td><strong>${escapeHtml(d.hostname || d.name) || '—'}</strong></td>
                    <td class="text-sm">${escapeHtml(d.os) || '—'}</td>
                    <td class="text-mono text-sm">${escapeHtml(d.ip || d.addresses?.[0]) || '—'}</td>
                    <td><span class="badge ${d.online ? 'badge-active' : 'badge-idle'}">${d.online ? 'Online' : 'Offline'}</span></td>
                    <td class="text-sm text-muted">${d.lastSeen ? new Date(d.lastSeen).toLocaleString() : '—'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        ${isMock ? `
          <div style="margin-top:var(--space-md);padding:var(--space-md);background:var(--yellow-dim);border-radius:var(--radius-md);border:1px solid rgba(255,171,0,0.15)">
            <p class="text-sm"><strong style="color:var(--yellow)">Demo Mode:</strong> Add your Tailscale API key to <code>.env</code> to connect to your actual tailnet.</p>
          </div>
        ` : ''}
      </div>

      <!-- API Configuration -->
      <div class="glass-card" style="padding:var(--space-lg);margin-bottom:var(--space-lg)">
        <h3 class="section-title">🔑 API Configuration</h3>
        <div class="settings-section">
          <div class="settings-row">
            <div>
              <div class="settings-label">DataForSEO API</div>
              <div class="settings-hint">Used for SEO rank tracking</div>
            </div>
            <span class="badge" id="dataforseo-status">Loading...</span>
          </div>
          <div class="settings-row">
            <div>
              <div class="settings-label">Tailscale API</div>
              <div class="settings-hint">Used for remote device management</div>
            </div>
            <span class="badge ${isMock ? 'badge-paused' : 'badge-active'}">${isMock ? 'Not Configured' : 'Connected'}</span>
          </div>
          <div class="settings-row" style="border:none">
            <div>
              <div class="settings-label">MCP Protocol</div>
              <div class="settings-hint">Model Context Protocol for tool communication</div>
            </div>
            <span class="badge badge-working">Simulation</span>
          </div>
        </div>
        <p class="text-sm text-muted" style="margin-top:var(--space-md)">
          API keys are managed via <code style="background:var(--bg-hover);padding:2px 6px;border-radius:4px">.env</code> file in the project root. 
          Copy <code style="background:var(--bg-hover);padding:2px 6px;border-radius:4px">.env.example</code> and fill in your credentials.
        </p>
      </div>

      <!-- System Info -->
      <div class="glass-card" style="padding:var(--space-lg)">
        <h3 class="section-title">ℹ️ System Information</h3>
        <div class="settings-section">
          <div class="settings-row">
            <div class="settings-label">Agent OS Version</div>
            <span class="text-mono">1.0.0</span>
          </div>
          <div class="settings-row">
            <div class="settings-label">Architecture</div>
            <span class="text-mono">Modular AI OS</span>
          </div>
          <div class="settings-row">
            <div class="settings-label">Backend</div>
            <span class="text-mono">Express + SQLite</span>
          </div>
          <div class="settings-row" style="border:none">
            <div class="settings-label">Frontend</div>
            <span class="text-mono">Vite + Vanilla JS</span>
          </div>
        </div>
      </div>
    </div>
  `;

  // Check DataForSEO status
  try {
    const seoRes = await api.getSeoSummary();
    const el = document.getElementById('dataforseo-status');
    if (el) {
      const has = seoRes.data.hasCredentials;
      el.className = `badge ${has ? 'badge-active' : 'badge-paused'}`;
      el.textContent = has ? 'Connected' : 'Not Configured';
    }
  } catch {}
}
