import { api } from '../api.js';
import { statusBadge, showModal, showToast, escapeHtml } from '../components/ui.js';
import { ws } from '../websocket.js';

let unsubAgentStatus = null;

export async function renderAgents(container) {
  let agents = [];
  let agentTypes = [];

  try {
    const [agentRes, typeRes] = await Promise.all([api.getAgents(), api.getAgentTypes()]);
    agents = agentRes.data;
    agentTypes = typeRes.data;
  } catch (e) {
    console.error('Failed to load agents:', e);
  }

  container.innerHTML = `
    <div class="animate-fade">
      <div class="flex items-center justify-between" style="margin-bottom:var(--space-lg)">
        <div>
          <h1 class="page-title">Agent Management</h1>
          <p class="page-subtitle">${agents.length} agents registered · Manage your AI workforce</p>
        </div>
        <div class="flex gap-sm">
          <button class="btn" id="btn-start-all">▶ Start All</button>
          <button class="btn" id="btn-stop-all">⏹ Stop All</button>
          <button class="btn btn-primary" id="btn-create-agent">+ Create Agent</button>
        </div>
      </div>

      <div class="grid grid-auto stagger" id="agents-grid">
        ${agents.map(a => renderAgentCard(a)).join('')}
      </div>

      ${agents.length === 0 ? `
        <div class="empty-state">
          <div class="icon">🤖</div>
          <p>No agents found. Create your first agent to get started.</p>
        </div>
      ` : ''}
    </div>
  `;

  // Create agent
  container.querySelector('#btn-create-agent')?.addEventListener('click', async () => {
    const typeOptions = agentTypes.map(t => `<option value="${escapeHtml(t.id)}">${t.icon} ${escapeHtml(t.name)}</option>`).join('');
    const result = await showModal({
      title: 'Create New Agent',
      content: `
        <div class="form-group">
          <label class="form-label">Agent Name</label>
          <input class="input" id="modal-name" placeholder="e.g. My SEO Bot" />
        </div>
        <div class="form-group">
          <label class="form-label">Agent Type</label>
          <select class="select" id="modal-type">${typeOptions}</select>
        </div>
        <div class="form-group">
          <label class="form-label">Description (optional)</label>
          <textarea class="textarea" id="modal-desc" placeholder="What should this agent do?"></textarea>
        </div>
      `,
      actions: [
        { label: 'Cancel', class: '', value: null },
        { label: 'Create Agent', class: 'btn-primary', value: 'create' },
      ],
    });

    if (result === 'create') {
      const name = document.getElementById('modal-name')?.value;
      const type = document.getElementById('modal-type')?.value;
      const description = document.getElementById('modal-desc')?.value;
      if (!name) return showToast('Name is required', 'error');
      try {
        await api.createAgent({ name, type, description });
        showToast(`Agent "${name}" created!`, 'success');
        renderAgents(container);
      } catch (e) {
        showToast(e.message, 'error');
      }
    }
  });

  // Start/Stop all
  container.querySelector('#btn-start-all')?.addEventListener('click', async () => {
    for (const a of agents.filter(a => a.status === 'idle')) {
      try { await api.startAgent(a.id); } catch {}
    }
    showToast('All idle agents started', 'success');
    renderAgents(container);
  });

  container.querySelector('#btn-stop-all')?.addEventListener('click', async () => {
    for (const a of agents.filter(a => a.status !== 'idle')) {
      try { await api.stopAgent(a.id); } catch {}
    }
    showToast('All agents stopped', 'info');
    renderAgents(container);
  });

  // Card action buttons
  container.querySelectorAll('[data-agent-action]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const { agentId, agentAction } = btn.dataset;
      try {
        if (agentAction === 'start') await api.startAgent(agentId);
        else if (agentAction === 'stop') await api.stopAgent(agentId);
        else if (agentAction === 'pause') await api.pauseAgent(agentId);
        else if (agentAction === 'delete') {
          const confirmed = await showModal({
            title: 'Delete Agent',
            content: '<p>Are you sure you want to delete this agent? This action cannot be undone.</p>',
            actions: [{ label: 'Cancel', value: null }, { label: 'Delete', class: 'btn-danger', value: 'del' }],
          });
          if (confirmed !== 'del') return;
          await api.deleteAgent(agentId);
          showToast('Agent deleted', 'info');
        }
        renderAgents(container);
      } catch (e) {
        showToast(e.message, 'error');
      }
    });
  });

  // WebSocket updates — the page re-renders itself on every action, so drop the
  // previous subscription before registering a new one.
  if (unsubAgentStatus) unsubAgentStatus();
  unsubAgentStatus = ws.on('agent:status', () => renderAgents(container));

  return () => {
    if (unsubAgentStatus) unsubAgentStatus();
    unsubAgentStatus = null;
  };
}

function renderAgentCard(agent) {
  const icons = { 'hermes-apollo': '🎙️', 'hermes-oracle': '🔮', 'lead-generation': '🎯', 'delegate': '🔄', 'video-agent': '🎬', 'seo-tracker': '📊', 'custom': '⚙️' };
  const colors = { 'hermes-apollo': 'var(--cyan)', 'hermes-oracle': 'var(--purple)', 'lead-generation': 'var(--orange)', 'delegate': 'var(--green)', 'video-agent': 'var(--red)', 'seo-tracker': 'var(--yellow)', 'custom': 'var(--text-muted)' };
  const dimColors = { 'hermes-apollo': 'var(--cyan-dim)', 'hermes-oracle': 'var(--purple-dim)', 'lead-generation': 'var(--orange-dim)', 'delegate': 'var(--green-dim)', 'video-agent': 'var(--red-dim)', 'seo-tracker': 'var(--yellow-dim)', 'custom': 'rgba(139,143,163,0.15)' };

  const icon = icons[agent.type] || '⚙️';
  const color = colors[agent.type] || 'var(--text-muted)';
  const dimColor = dimColors[agent.type] || 'rgba(139,143,163,0.15)';
  const isActive = agent.status === 'active' || agent.status === 'working';
  const id = escapeHtml(agent.id);

  return `
    <div class="glass-card agent-card interactive" style="--agent-color:${color};--agent-color-dim:${dimColor}">
      <div class="agent-card-header">
        <div>
          <div class="agent-card-name">${escapeHtml(agent.name)}</div>
          <div class="agent-card-type">${escapeHtml(agent.type)}</div>
        </div>
        <div class="agent-card-icon">${icon}</div>
      </div>
      <p class="agent-card-desc">${escapeHtml(agent.description) || 'No description'}</p>
      <div class="agent-card-footer">
        ${statusBadge(agent.status)}
        <div class="agent-card-actions">
          ${isActive
            ? `<button class="btn btn-sm" data-agent-id="${id}" data-agent-action="stop" title="Stop">⏹</button>
               <button class="btn btn-sm" data-agent-id="${id}" data-agent-action="pause" title="Pause">⏸</button>`
            : `<button class="btn btn-sm btn-success" data-agent-id="${id}" data-agent-action="start" title="Start">▶</button>`
          }
          <button class="btn btn-sm btn-danger" data-agent-id="${id}" data-agent-action="delete" title="Delete">🗑</button>
        </div>
      </div>
    </div>
  `;
}
