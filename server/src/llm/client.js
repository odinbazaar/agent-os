/**
 * LLM client — NVIDIA NIM (OpenAI uyumlu chat completions).
 *
 * Kimlik bilgisi tanımlı değilse hasCredentials false döner ve çağıranlar
 * simülasyon moduna düşer; uygulama anahtarsız da çalışmaya devam eder.
 */

import { config } from '../config.js';

const DEFAULT_TIMEOUT_MS = 60000;

export function hasLlm() {
  return config.llm.hasCredentials;
}

export function llmInfo() {
  return {
    provider: 'NVIDIA NIM',
    model: config.llm.model,
    configured: config.llm.hasCredentials,
  };
}

/**
 * Bazı modeller JSON'u kod bloğu içinde döndürür; bazıları yanıtın başına
 * düşünce metni ekler. İlk geçerli JSON nesnesini çıkarmayı dener.
 */
export function parseJsonResponse(text) {
  if (!text) return null;

  const cleaned = text
    .replace(/^\s*```(?:json)?/i, '')
    .replace(/```\s*$/, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {}

  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {}
  }
  return null;
}

/**
 * @returns {Promise<{content: string, model: string, usage: object|null}>}
 */
export async function chat({
  system,
  user,
  temperature = 0.3,
  maxTokens = 900,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
  if (!config.llm.hasCredentials) {
    throw new Error('LLM yapılandırılmadı (NVIDIA_API_KEY eksik)');
  }

  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: user });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${config.llm.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.llm.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.llm.model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`LLM HTTP ${res.status}: ${body.slice(0, 200)}`);
    }

    const json = await res.json();
    const content = json.choices?.[0]?.message?.content ?? '';

    return { content, model: json.model || config.llm.model, usage: json.usage || null };
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`LLM zaman aşımı (${timeoutMs / 1000} sn)`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
