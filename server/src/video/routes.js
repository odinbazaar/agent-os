import { Router } from 'express';
import { findById, updateRow } from '../db/database.js';
import { createTask, addTaskLog } from '../agents/executor.js';
import { chat, hasLlm, parseJsonResponse } from '../llm/client.js';
import { generateImage, saveImage, hasImageGen } from '../llm/image.js';
import { broadcast } from '../websocket.js';

const router = Router();

const VIDEO_AGENT_ID = 'agent-video-001';

// Her sahne bir görsel üretimi demek; maliyeti sınırlamak için üst sınır.
const MAX_SCENES = 6;
const STORYBOARD_CONCURRENCY = 3;

const SCRIPT_SYSTEM = `Sen kısa form video senaryosu yazan bir içerik yönetmenisin.
Yanıtını SADECE geçerli JSON olarak ver, kod bloğu veya açıklama ekleme.
Anlatım ve başlık Türkçe olsun.
gorsel_prompt alanı ise İngilizce olmalı — görsel üretim modeli İngilizce istemlerde belirgin biçimde daha iyi sonuç veriyor.`;

function scriptSchema(sceneCount) {
  return `{
  "baslik": "video başlığı",
  "hook": "ilk 3 saniyede izleyiciyi tutacak cümle",
  "sahneler": [
    {
      "no": 1,
      "zaman": "0:00-0:05",
      "anlatim": "seslendirme metni (Türkçe)",
      "gorsel_tarif": "sahnede ne görünüyor (Türkçe)",
      "gorsel_prompt": "image generation prompt in ENGLISH, cinematic, specific"
    }
  ],
  "cta": "kapanış çağrısı",
  "tahmini_sure_sn": 60
}
Tam ${sceneCount} sahne yaz.`;
}

/** Süreye göre makul sahne sayısı — 15 sn'de 2, 60 sn'de 4, 600 sn'de 6. */
function sceneCountFor(durationSec) {
  if (durationSec <= 20) return 2;
  if (durationSec <= 45) return 3;
  if (durationSec <= 90) return 4;
  if (durationSec <= 300) return 5;
  return MAX_SCENES;
}

// ── Senaryo üretimi ──

router.post('/script', async (req, res, next) => {
  try {
    const { topic, durationSec = 60, format = 'short-form' } = req.body;
    if (!topic) return res.status(400).json({ success: false, error: 'Konu zorunlu' });

    if (!hasLlm()) {
      return res.status(503).json({
        success: false,
        error: 'Senaryo üretimi için NVIDIA_API_KEY tanımlı olmalı',
      });
    }

    const duration = Math.min(Math.max(parseInt(durationSec, 10) || 60, 5), 600);
    const sceneCount = sceneCountFor(duration);

    const task = createTask({
      agentId: VIDEO_AGENT_ID,
      title: `Senaryo: ${topic}`,
      description: `Süre: ${duration} sn, Format: ${format === 'standard' ? 'standart' : 'kısa form'}`,
      priority: 'normal',
    });

    updateRow('tasks', task.id, { status: 'running' });
    addTaskLog(task.id, 'info', `Senaryo üretiliyor (${sceneCount} sahne, ${duration} sn)`);

    const user = [
      `Video konusu: ${topic}`,
      `Hedef süre: ${duration} saniye`,
      `Format: ${format === 'standard' ? 'standart (1-10 dk)' : 'kısa form (dikey, ≤60 sn)'}`,
      '',
      'Şu JSON şemasında yanıt ver:',
      scriptSchema(sceneCount),
    ].join('\n');

    const started = Date.now();
    const { content, model, usage } = await chat({ system: SCRIPT_SYSTEM, user, maxTokens: 1400 });
    const elapsed = Date.now() - started;

    const script = parseJsonResponse(content);
    if (!script?.sahneler?.length) {
      updateRow('tasks', task.id, { status: 'error' });
      addTaskLog(task.id, 'error', 'Model senaryoyu beklenen şemada döndürmedi');
      return res.status(502).json({ success: false, error: 'Senaryo üretilemedi — model şemaya uymadı' });
    }

    script.sahneler = script.sahneler.slice(0, MAX_SCENES);

    const result = {
      completedAt: new Date().toISOString(),
      mode: 'video-script',
      model,
      durationMs: elapsed,
      usage,
      script,
    };

    updateRow('tasks', task.id, {
      status: 'completed',
      result: JSON.stringify(result),
      needs_review: 1,
      completed_at: new Date().toISOString(),
    });

    addTaskLog(task.id, 'success', `Senaryo hazır — ${script.sahneler.length} sahne (${(elapsed / 1000).toFixed(1)} sn)`);
    broadcast('task:completed', { id: task.id, result });

    res.json({ success: true, data: { taskId: task.id, script, model } });
  } catch (error) {
    next(error);
  }
});

// ── Storyboard üretimi ──

router.post('/storyboard/:taskId', async (req, res, next) => {
  try {
    const task = findById('tasks', req.params.taskId);
    if (!task) return res.status(404).json({ success: false, error: 'Görev bulunamadı' });

    if (!hasImageGen()) {
      return res.status(503).json({
        success: false,
        error: 'Görsel üretimi için NVIDIA_API_KEY tanımlı olmalı',
      });
    }

    let stored;
    try {
      stored = JSON.parse(task.result || '{}');
    } catch {
      stored = {};
    }

    const scenes = stored.script?.sahneler;
    if (!scenes?.length) {
      return res.status(400).json({ success: false, error: 'Bu görevde senaryo yok — önce senaryo üretin' });
    }

    addTaskLog(task.id, 'info', `Storyboard üretiliyor (${scenes.length} kare)`);
    const started = Date.now();

    const frames = [];
    for (let i = 0; i < scenes.length; i += STORYBOARD_CONCURRENCY) {
      const batch = scenes.slice(i, i + STORYBOARD_CONCURRENCY);
      const settled = await Promise.all(batch.map(async (scene, offset) => {
        const index = i + offset;
        const prompt = scene.gorsel_prompt || scene.gorsel_tarif || stored.script.baslik;

        try {
          const { base64, seed } = await generateImage({
            prompt: `storyboard frame, ${prompt}`,
          });
          const url = saveImage(base64, `storyboard/${task.id}-${index + 1}.png`);
          return { no: scene.no ?? index + 1, zaman: scene.zaman, url, seed, prompt };
        } catch (error) {
          return { no: scene.no ?? index + 1, zaman: scene.zaman, error: error.message, prompt };
        }
      }));
      frames.push(...settled);
    }

    const elapsed = Date.now() - started;
    const failed = frames.filter(f => f.error).length;

    const result = { ...stored, storyboard: { frames, generatedAt: new Date().toISOString(), durationMs: elapsed } };
    updateRow('tasks', task.id, { result: JSON.stringify(result) });

    addTaskLog(
      task.id,
      failed ? 'warning' : 'success',
      `Storyboard tamamlandı — ${frames.length - failed}/${frames.length} kare (${(elapsed / 1000).toFixed(1)} sn)`
    );

    res.json({ success: true, data: { taskId: task.id, frames, failed } });
  } catch (error) {
    next(error);
  }
});

export default router;
