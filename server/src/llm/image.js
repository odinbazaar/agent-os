/**
 * Görsel üretimi — NVIDIA NIM üzerinden FLUX.1-dev.
 *
 * Chat modellerinden farklı bir tabanda duruyor (ai.api.nvidia.com/v1/genai),
 * bu yüzden ayrı istemci. Aynı NVIDIA anahtarını kullanır.
 */

import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// data/media altında duruyor; data'nın kendisi servis edilmiyor (SQLite orada).
export const MEDIA_DIR = join(__dirname, '..', '..', 'data', 'media');

const IMAGE_ENDPOINT = 'black-forest-labs/flux.1-dev';

// FLUX yalnızca belirli ölçüleri kabul ediyor (768, 832, 896, 960, 1024, ...).
const DEFAULT_WIDTH = 1216;
const DEFAULT_HEIGHT = 768;

const TIMEOUT_MS = 90000;

export function hasImageGen() {
  return config.llm.hasCredentials;
}

/**
 * @returns {Promise<{base64: string, seed: number}>}
 */
export async function generateImage({ prompt, width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT, steps = 20, seed }) {
  if (!hasImageGen()) {
    throw new Error('Görsel üretimi yapılandırılmadı (NVIDIA_API_KEY eksik)');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${config.llm.imageBaseUrl}/${IMAGE_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.llm.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        width,
        height,
        steps,
        ...(seed !== undefined ? { seed } : {}),
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Görsel API HTTP ${res.status}: ${body.slice(0, 200)}`);
    }

    const json = await res.json();
    const artifact = json.artifacts?.[0];
    if (!artifact?.base64) {
      throw new Error('Görsel API beklenen base64 çıktıyı döndürmedi');
    }

    return { base64: artifact.base64, seed: artifact.seed };
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('Görsel üretimi zaman aşımına uğradı');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Base64 görseli kalıcı diske yazar ve tarayıcının erişeceği yolu döndürür.
 * data/ dizini Coolify'da kalıcı volume olduğu için deploy'lar arasında kalır.
 */
export function saveImage(base64, relativePath) {
  const fullPath = join(MEDIA_DIR, relativePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, Buffer.from(base64, 'base64'));
  return `/media/${relativePath.replace(/\\/g, '/')}`;
}
