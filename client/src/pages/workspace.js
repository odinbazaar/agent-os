import { api } from '../api.js';
import { showToast, showModal, escapeHtml } from '../components/ui.js';

export async function renderWorkspace(container) {
  let models = [];
  let forks = [];
  let config = {};

  try {
    const [modRes, forkRes, cfgRes] = await Promise.all([
      api.getModels(),
      api.getWorkspaceForks(),
      api.getWorkspaceConfig(),
    ]);
    models = modRes.data;
    forks = forkRes.data;
    config = cfgRes.data;
  } catch (e) {
    console.error('Failed to load workspace data:', e);
  }

  container.innerHTML = `
    <div class="animate-fade">
      <div class="flex items-center justify-between" style="margin-bottom:var(--space-lg)">
        <div>
          <h1 class="page-title">Workspace & Forking</h1>
          <p class="page-subtitle">Manage conversation forks, model selection, and workspace configuration</p>
        </div>
        <button class="btn btn-primary" id="btn-fork">🔀 Fork Workspace</button>
      </div>

      <!-- Forking Explanation -->
      <div class="glass-card" style="padding:var(--space-lg);margin-bottom:var(--space-lg)">
        <h3 class="section-title">Conversation Forking System</h3>
        <p class="text-secondary" style="line-height:1.6;margin-bottom:var(--space-md)">
          Agent OS uses a <strong style="color:var(--cyan)">forking</strong> methodology instead of traditional installation.
          Each fork creates a new system instance from the current template, allowing isolated environments 
          for different tools and workflows. Select a model for each fork based on its specialization.
        </p>
        <div class="grid grid-4" style="margin-top:var(--space-md)">
          ${models.map(m => `
            <div class="glass-card interactive" style="padding:var(--space-md);text-align:center">
              <div style="font-size:2rem;margin-bottom:var(--space-sm)">${getModelIcon(m.id)}</div>
              <strong style="font-size:0.9rem">${escapeHtml(m.name)}</strong>
              <p class="text-sm text-muted" style="margin-top:4px;line-height:1.4">${escapeHtml(m.role)}</p>
              <span class="badge badge-active" style="margin-top:var(--space-sm)">${escapeHtml(m.status)}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Active Forks -->
      <div class="glass-card" style="padding:0;overflow:hidden;margin-bottom:var(--space-lg)">
        <div class="flex items-center justify-between" style="padding:var(--space-lg);border-bottom:1px solid var(--glass-border)">
          <h3 class="section-title" style="margin:0">Active Forks</h3>
          <span class="text-sm text-muted">${forks.length} forks</span>
        </div>
        ${forks.length > 0 ? `
          <div class="table-container" style="border:none;border-radius:0">
            <table>
              <thead><tr><th>Name</th><th>Model</th><th>Description</th><th>Created</th><th>Status</th></tr></thead>
              <tbody>
                ${forks.map(f => `
                  <tr>
                    <td><strong>${escapeHtml(f.name)}</strong></td>
                    <td><span class="badge badge-working">${escapeHtml(f.model)}</span></td>
                    <td class="text-sm text-muted">${escapeHtml(f.description) || '—'}</td>
                    <td class="text-sm text-mono">${new Date(f.createdAt).toLocaleDateString()}</td>
                    <td><span class="badge badge-active">${escapeHtml(f.status)}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : `
          <div class="empty-state">
            <div class="icon">🔀</div>
            <p>No forks created yet. Fork your workspace to create isolated agent environments.</p>
          </div>
        `}
      </div>

      <!-- Workspace Config -->
      <div class="glass-card" style="padding:var(--space-lg)">
        <div class="flex items-center justify-between" style="margin-bottom:var(--space-md)">
          <h3 class="section-title" style="margin:0">Workspace Configuration</h3>
          <button class="btn btn-sm" id="btn-add-config">+ Add Key</button>
        </div>
        <div id="config-entries">
          ${Object.keys(config).length > 0 ? Object.entries(config).filter(([k]) => !k.startsWith('fork:')).map(([key, value]) => `
            <div class="settings-row">
              <div>
                <div class="settings-label text-mono">${escapeHtml(key)}</div>
                <div class="settings-hint">${escapeHtml(typeof value === 'string' && value.length > 60 ? value.slice(0, 60) + '...' : value)}</div>
              </div>
            </div>
          `).join('') : '<p class="text-muted text-sm">No custom configuration set</p>'}
        </div>
      </div>
    </div>
  `;

  // Fork workspace
  container.querySelector('#btn-fork')?.addEventListener('click', async () => {
    const modelOptions = models.map(m => `<option value="${escapeHtml(m.id)}">${escapeHtml(m.name)} — ${escapeHtml(m.role)}</option>`).join('');
    const result = await showModal({
      title: '🔀 Fork Workspace',
      content: `
        <div class="form-group">
          <label class="form-label">Fork Name</label>
          <input class="input" id="fork-name" placeholder="e.g. Boat Manufacturing CRM" />
        </div>
        <div class="form-group">
          <label class="form-label">Base Model</label>
          <select class="select" id="fork-model">${modelOptions}</select>
        </div>
        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea class="textarea" id="fork-desc" placeholder="What will this fork be used for?"></textarea>
        </div>
      `,
      actions: [
        { label: 'Cancel', value: null },
        { label: 'Create Fork', class: 'btn-primary', value: 'fork' },
      ],
    });

    if (result === 'fork') {
      const name = document.getElementById('fork-name')?.value;
      const model = document.getElementById('fork-model')?.value;
      const description = document.getElementById('fork-desc')?.value;
      if (!name) return showToast('Fork name is required', 'error');
      try {
        await api.forkWorkspace({ name, model, description });
        showToast(`Workspace forked: "${name}"`, 'success');
        renderWorkspace(container);
      } catch (e) {
        showToast(e.message, 'error');
      }
    }
  });

  // Add config key
  container.querySelector('#btn-add-config')?.addEventListener('click', async () => {
    const key = prompt('Configuration key:');
    if (!key) return;
    const value = prompt('Value:');
    try {
      await api.setWorkspaceConfig(key, value || '');
      showToast('Configuration saved', 'success');
      renderWorkspace(container);
    } catch (e) {
      showToast(e.message, 'error');
    }
  });
}

function getModelIcon(id) {
  const icons = { claude: '🟣', hermes: '⚡', fable5: '🏗️', gpt56soul: '💎' };
  return icons[id] || '🤖';
}
