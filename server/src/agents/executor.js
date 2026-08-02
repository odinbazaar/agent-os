import { v4 as uuidv4 } from 'uuid';
import { findAll, findById, insertRow, updateRow, query, run as dbRun } from '../db/database.js';
import { getAgent, updateAgent } from './manager.js';
import { getAgentType } from './registry.js';
import { broadcast } from '../websocket.js';
import { chat, hasLlm, parseJsonResponse } from '../llm/client.js';

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

  taskQueue.set(taskId, { startedAt: Date.now() });

  try {
    const result = hasLlm()
      ? await runWithLlm(task, taskId)
      : await runSimulated(task, taskId);

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

// ── Yürütme modları ──

const SYSTEM_PROMPT = `Sen Agent OS adlı yapay zekâ işletim sisteminin görev yürütücüsüsün.
Sana verilen görevi analiz eder, uygulanabilir bir yürütme planı ve çıktı üretirsin.
Yanıtını SADECE geçerli JSON olarak ver, kod bloğu veya açıklama ekleme.
Tüm metinler Türkçe olsun.`;

const RESPONSE_SCHEMA = `{
  "ozet": "görevin tek cümlelik özeti",
  "adimlar": [{"baslik": "kısa başlık", "aciklama": "ne yapılacağı"}],
  "ciktilar": ["üretilen somut çıktılar"],
  "riskler": ["dikkat edilmesi gereken noktalar"],
  "insan_kontrolu": ["operatörün doğrulaması gereken maddeler"],
  "tahmini_sure_dk": 30
}`;

async function runWithLlm(task, taskId) {
  const agent = task.agent_id ? getAgent(task.agent_id) : null;
  const typeInfo = agent ? getAgentType(agent.type) : null;

  addTaskLog(taskId, 'info', 'Aşama 1/3: Görev modele gönderiliyor...');

  const user = [
    `Görev başlığı: ${task.title}`,
    task.description ? `Açıklama: ${task.description}` : null,
    agent ? `Yürüten ajan: ${agent.name} (${agent.type})` : null,
    typeInfo?.capabilities?.length ? `Ajan yetenekleri: ${typeInfo.capabilities.join(', ')}` : null,
    `Öncelik: ${task.priority}`,
    '',
    `Şu JSON şemasında yanıt ver:`,
    RESPONSE_SCHEMA,
  ].filter(Boolean).join('\n');

  const started = Date.now();
  const { content, model, usage } = await chat({ system: SYSTEM_PROMPT, user });
  const elapsed = Date.now() - started;

  addTaskLog(taskId, 'info', `Aşama 2/3: ${model} yanıtladı (${(elapsed / 1000).toFixed(1)} sn, ${usage?.completion_tokens ?? '?'} token)`);

  const parsed = parseJsonResponse(content);
  if (!parsed) {
    // Model şemaya uymadıysa çıktıyı kaybetmek yerine ham metni saklıyoruz.
    addTaskLog(taskId, 'warning', 'Model yanıtı JSON olarak ayrıştırılamadı, ham metin saklandı');
  }

  addTaskLog(taskId, 'info', 'Aşama 3/3: Çıktı hazır — insan incelemesi için işaretleniyor (%20)');

  return {
    completedAt: new Date().toISOString(),
    mode: 'llm',
    model,
    durationMs: elapsed,
    usage,
    ...(parsed ? parsed : { ozet: 'Model yanıtı şemaya uymadı', ham_yanit: content }),
  };
}

async function runSimulated(task, taskId) {
  addTaskLog(taskId, 'info', 'Aşama 1/3: Girdi analiz ediliyor ve çalıştırma planı hazırlanıyor...');
  await delay(1500);

  addTaskLog(taskId, 'info', 'Aşama 2/3: Ana iş yükü çalıştırılıyor (yapay zekâ işlemi %80)...');
  await delay(2000);

  addTaskLog(taskId, 'info', 'Aşama 3/3: Yapay zekâ işlemi tamamlandı — insan incelemesi için işaretleniyor (%20)');

  return {
    completedAt: new Date().toISOString(),
    mode: 'simulation',
    aiConfidence: 0.87,
    phases: ['analiz', 'çalıştırma', 'incelemeye-hazır'],
    ozet: `"${task.title}" görevi simülasyon modunda işlendi. Gerçek model çıktısı için NVIDIA_API_KEY tanımlayın.`,
  };
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
