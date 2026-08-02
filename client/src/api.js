const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };
  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  const res = await fetch(url, config);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return data;
}

export const api = {
  // Dashboard
  dashboard: () => request('/dashboard'),
  activity: (limit = 50) => request(`/dashboard/activity?limit=${limit}`),
  mcpTools: () => request('/dashboard/mcp-tools'),

  // Agents
  getAgents: () => request('/agents'),
  getAgent: (id) => request(`/agents/${id}`),
  getAgentTypes: () => request('/agents/types'),
  getAgentStats: () => request('/agents/stats'),
  createAgent: (data) => request('/agents', { method: 'POST', body: data }),
  updateAgent: (id, data) => request(`/agents/${id}`, { method: 'PUT', body: data }),
  deleteAgent: (id) => request(`/agents/${id}`, { method: 'DELETE' }),
  startAgent: (id) => request(`/agents/${id}/start`, { method: 'POST' }),
  stopAgent: (id) => request(`/agents/${id}/stop`, { method: 'POST' }),
  pauseAgent: (id) => request(`/agents/${id}/pause`, { method: 'POST' }),

  // Tasks
  getTasks: (agentId) => request(`/tasks${agentId ? `?agent_id=${agentId}` : ''}`),
  getTask: (id) => request(`/tasks/${id}`),
  getTaskLogs: (id) => request(`/tasks/${id}/logs`),
  createTask: (data) => request('/tasks', { method: 'POST', body: data }),
  executeTask: (id) => request(`/tasks/${id}/execute`, { method: 'POST' }),
  approveTask: (id) => request(`/tasks/${id}/approve`, { method: 'POST' }),

  // SEO
  getSeoKeywords: () => request('/seo/keywords'),
  addSeoKeyword: (data) => request('/seo/keywords', { method: 'POST', body: data }),
  deleteSeoKeyword: (id) => request(`/seo/keywords/${id}`, { method: 'DELETE' }),
  checkRank: (id) => request(`/seo/check/${id}`, { method: 'POST' }),
  checkAllRanks: () => request('/seo/check-all', { method: 'POST' }),
  getSeoHistory: (id) => request(`/seo/history/${id}`),
  getSeoSummary: () => request('/seo/summary'),

  // Tailscale
  getTailscaleDevices: () => request('/tailscale/devices'),
  getTailscaleStatus: () => request('/tailscale/status'),

  // Workspace
  getWorkspaceConfig: () => request('/workspace/config'),
  setWorkspaceConfig: (key, value) => request('/workspace/config', { method: 'POST', body: { key, value } }),
  forkWorkspace: (data) => request('/workspace/fork', { method: 'POST', body: data }),
  getWorkspaceForks: () => request('/workspace/forks'),
  getModels: () => request('/workspace/models'),

  // Health
  health: () => request('/health'),
};
