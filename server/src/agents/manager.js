import { v4 as uuidv4 } from 'uuid';
import { findAll, findById, insertRow, updateRow, deleteRow, run as dbRun, query } from '../db/database.js';
import { getAgentType, AGENT_STATUSES } from './registry.js';
import { broadcast } from '../websocket.js';

// In-memory agent runtime state
const agentRuntimes = new Map();

export function getAllAgents() {
  return findAll('agents', {}, 'created_at DESC', 200);
}

export function getAgent(id) {
  return findById('agents', id);
}

export function createAgent({ name, type, description = '', config = {} }) {
  const typeInfo = getAgentType(type);
  const id = `agent-${type}-${uuidv4().slice(0, 8)}`;
  const mergedConfig = { ...typeInfo.defaultConfig, ...config };

  insertRow('agents', {
    id,
    name,
    type,
    status: 'idle',
    description: description || typeInfo.description,
    config: JSON.stringify(mergedConfig),
  });

  logActivity('agent', `${name} Created`, `New ${typeInfo.name} agent registered`, id);
  broadcast('agent:created', { id, name, type, status: 'idle' });

  return findById('agents', id);
}

export function updateAgent(id, updates) {
  const agent = findById('agents', id);
  if (!agent) return null;

  if (updates.config && typeof updates.config === 'object') {
    updates.config = JSON.stringify(updates.config);
  }

  updateRow('agents', id, updates);
  const updated = findById('agents', id);

  broadcast('agent:updated', updated);
  return updated;
}

export function deleteAgent(id) {
  const agent = findById('agents', id);
  if (!agent) return false;

  stopAgent(id);
  deleteRow('agents', id);
  logActivity('agent', `${agent.name} Deleted`, `Agent removed from system`, null);
  broadcast('agent:deleted', { id });
  return true;
}

export function startAgent(id) {
  const agent = findById('agents', id);
  if (!agent) return null;

  updateRow('agents', id, { status: 'active' });
  agentRuntimes.set(id, {
    startedAt: new Date().toISOString(),
    tasksCompleted: 0,
    errors: 0,
  });

  logActivity('agent', `${agent.name} Started`, 'Agent activated and processing', id);
  broadcast('agent:status', { id, status: 'active' });
  return findById('agents', id);
}

export function stopAgent(id) {
  const agent = findById('agents', id);
  if (!agent) return null;

  updateRow('agents', id, { status: 'idle' });
  agentRuntimes.delete(id);

  logActivity('agent', `${agent.name} Stopped`, 'Agent deactivated', id);
  broadcast('agent:status', { id, status: 'idle' });
  return findById('agents', id);
}

export function pauseAgent(id) {
  const agent = findById('agents', id);
  if (!agent) return null;

  updateRow('agents', id, { status: 'paused' });
  logActivity('agent', `${agent.name} Paused`, 'Agent paused by user', id);
  broadcast('agent:status', { id, status: 'paused' });
  return findById('agents', id);
}

export function getAgentRuntime(id) {
  return agentRuntimes.get(id) || null;
}

export function getAgentStats() {
  const agents = getAllAgents();
  const tasks = findAll('tasks', {}, 'created_at DESC', 1000);
  const activeCount = agents.filter(a => a.status === 'active' || a.status === 'working').length;
  const runningTasks = tasks.filter(t => t.status === 'running').length;
  const reviewCount = tasks.filter(t => t.needs_review === 1).length;

  return {
    totalAgents: agents.length,
    activeAgents: activeCount,
    runningTasks,
    needsReview: reviewCount,
    totalTasks: tasks.length,
    completedTasks: tasks.filter(t => t.status === 'completed').length,
  };
}

function logActivity(type, title, detail, agentId) {
  try {
    dbRun(
      'INSERT INTO activity_log (type, title, detail, agent_id) VALUES (?, ?, ?, ?)',
      [type, title, detail, agentId]
    );
  } catch (e) {
    console.error('Failed to log activity:', e.message);
  }
}
