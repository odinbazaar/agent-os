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

  addTaskLog(id, 'info', `Görev oluşturuldu: ${title}`);
  broadcast('task:created', { id, agentId, title, status: 'pending' });

  return findById('tasks', id);
}

export async function executeTask(taskId) {
  const task = findById('tasks', taskId);
  if (!task) return null;

  // Update status to running
  updateRow('tasks', taskId, { status: 'running' });
  addTaskLog(taskId, 'info', 'Görev çalıştırılmaya başlandı');
  broadcast('task:status', { id: taskId, status: 'running' });

  if (task.agent_id) {
    updateAgent(task.agent_id, { status: 'working' });
  }

  // Simulate task execution with progressive updates
  taskQueue.set(taskId, { startedAt: Date.now() });

  try {
    // Phase 1: Processing (simulated)
    addTaskLog(taskId, 'info', 'Aşama 1/3: Girdi analiz ediliyor ve çalıştırma planı hazırlanıyor...');
    await delay(1500);

    // Phase 2: Execution
    addTaskLog(taskId, 'info', 'Aşama 2/3: Ana iş yükü çalıştırılıyor (yapay zekâ işlemi %80)...');
    await delay(2000);

    // Phase 3: 80/20 Rule — mark for review
    addTaskLog(taskId, 'info', 'Aşama 3/3: Yapay zekâ işlemi tamamlandı — insan incelemesi için işaretleniyor (%20)');

    const result = {
      completedAt: new Date().toISOString(),
      aiConfidence: 0.87,
      phases: ['analiz', 'çalıştırma', 'incelemeye-hazır'],
      output: `"${task.title}" görevi başarıyla işlendi. Yapay zekâ %80'ini tamamladı — kalan %20 için insan incelemesi bekleniyor.`,
    };

    updateRow('tasks', taskId, {
      status: 'completed',
      result: JSON.stringify(result),
      needs_review: 1,
      completed_at: new Date().toISOString(),
    });

    addTaskLog(taskId, 'success', 'Görev tamamlandı — insan incelemesi gerekiyor (80/20 kuralı)');
    broadcast('task:completed', { id: taskId, result });

    if (task.agent_id) {
      updateAgent(task.agent_id, { status: 'active' });
    }

    return findById('tasks', taskId);
  } catch (error) {
    updateRow('tasks', taskId, { status: 'error' });
    addTaskLog(taskId, 'error', `Görev başarısız: ${error.message}`);
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
  addTaskLog(taskId, 'success', 'Görev insan denetçi tarafından onaylandı');
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
