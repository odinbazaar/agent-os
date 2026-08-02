import { v4 as uuidv4 } from 'uuid';
import { findAll, findById, insertRow, updateRow, query, run as dbRun } from '../db/database.js';
import { getAgent, updateAgent } from './manager.js';
import { broadcast } from '../websocket.js';

// In-memory task queue
const taskQueue = new Map();

export function getAllTasks(filters = {}) {
  if (filters.agent_id) {
    return findAll('tasks', { agent_id: filters.agent_id }, 'created_at DESC', 200);
  }
  return findAll('tasks', {}, 'created_at DESC', 200);
}

export function getTask(id) {
  return findById('tasks', id);
}

export function createTask({ agentId, title, description = '', priority = 'normal' }) {
  const id = `task-${uuidv4().slice(0, 8)}`;

  insertRow('tasks', {
    id,
    agent_id: agentId,
    title,
    description,
    status: 'pending',
    priority,
    needs_review: 0,
  });

  addTaskLog(id, 'info', `Task created: ${title}`);
  broadcast('task:created', { id, agentId, title, status: 'pending' });

  return findById('tasks', id);
}

export async function executeTask(taskId) {
  const task = findById('tasks', taskId);
  if (!task) return null;

  // Update status to running
  updateRow('tasks', taskId, { status: 'running' });
  addTaskLog(taskId, 'info', 'Task execution started');
  broadcast('task:status', { id: taskId, status: 'running' });

  if (task.agent_id) {
    updateAgent(task.agent_id, { status: 'working' });
  }

  // Simulate task execution with progressive updates
  taskQueue.set(taskId, { startedAt: Date.now() });

  try {
    // Phase 1: Processing (simulated)
    addTaskLog(taskId, 'info', 'Phase 1/3: Analyzing input and preparing execution plan...');
    await delay(1500);

    // Phase 2: Execution
    addTaskLog(taskId, 'info', 'Phase 2/3: Executing primary workload (AI processing 80%)...');
    await delay(2000);

    // Phase 3: 80/20 Rule — mark for review
    addTaskLog(taskId, 'info', 'Phase 3/3: AI processing complete — marking for human review (20%)');
    
    const result = {
      completedAt: new Date().toISOString(),
      aiConfidence: 0.87,
      phases: ['analysis', 'execution', 'review-ready'],
      output: `Task "${task.title}" processed successfully. AI completed 80% — awaiting human review for final 20%.`,
    };

    updateRow('tasks', taskId, {
      status: 'completed',
      result: JSON.stringify(result),
      needs_review: 1,
      completed_at: new Date().toISOString(),
    });

    addTaskLog(taskId, 'success', 'Task completed — needs human review (80/20 rule)');
    broadcast('task:completed', { id: taskId, result });

    if (task.agent_id) {
      updateAgent(task.agent_id, { status: 'active' });
    }

    return findById('tasks', taskId);
  } catch (error) {
    updateRow('tasks', taskId, { status: 'error' });
    addTaskLog(taskId, 'error', `Task failed: ${error.message}`);
    broadcast('task:error', { id: taskId, error: error.message });

    if (task.agent_id) {
      updateAgent(task.agent_id, { status: 'error' });
    }

    return findById('tasks', taskId);
  } finally {
    taskQueue.delete(taskId);
  }
}

export function approveTask(taskId) {
  const task = findById('tasks', taskId);
  if (!task) return null;

  updateRow('tasks', taskId, { needs_review: 0 });
  addTaskLog(taskId, 'success', 'Task approved by human reviewer');
  broadcast('task:approved', { id: taskId });

  return findById('tasks', taskId);
}

export function getTaskLogs(taskId) {
  return query('SELECT * FROM task_logs WHERE task_id = ? ORDER BY timestamp ASC', [taskId]);
}

export function addTaskLog(taskId, level, message) {
  try {
    dbRun(
      'INSERT INTO task_logs (task_id, level, message) VALUES (?, ?, ?)',
      [taskId, level, message]
    );
    broadcast('task:log', { taskId, level, message, timestamp: new Date().toISOString() });
  } catch (e) {
    console.error('Failed to add task log:', e.message);
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
