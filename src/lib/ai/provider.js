import { env } from '../env';

/**
 * AI transport.
 *
 * Three modes, in order of preference:
 *
 *  1. `VITE_AI_PROXY_URL` — a server endpoint you control that holds the real
 *     API key and forwards the request. This is the only production-safe
 *     option, and the one the README documents.
 *  2. `VITE_GEMINI_API_KEY` — a direct browser call. Convenient for local
 *     hacking, but the key is embedded in the JS bundle and readable by anyone
 *     who opens devtools, so it is refused in production builds.
 *  3. Nothing configured — every helper falls back to the local heuristics in
 *     `./heuristics.js`, so the whole app keeps working with no AI account.
 */

export const AI_MODE = (() => {
  if (env.aiProxyUrl) return 'proxy';
  if (env.geminiApiKey && env.isDev) return 'direct';
  return 'off';
})();

export const isRemoteAIEnabled = AI_MODE !== 'off';

/**
 * True when a key was supplied but deliberately ignored, so the settings screen
 * can explain why rather than silently doing nothing.
 */
export const hasUnsafeKeyInProduction = Boolean(env.geminiApiKey && !env.isDev && !env.aiProxyUrl);

const GEMINI_ENDPOINT = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

const DEFAULT_TIMEOUT_MS = 12_000;

/** Fail fast rather than leaving a spinner running forever on a hung request. */
async function fetchWithTimeout(url, options, timeout = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Send a prompt to whichever transport is configured.
 * @returns {Promise<string|null>} Raw model text, or null on any failure.
 */
export async function complete(prompt, { signal, maxOutputTokens = 512 } = {}) {
  if (AI_MODE === 'off') return null;

  try {
    if (AI_MODE === 'proxy') {
      const response = await fetchWithTimeout(env.aiProxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, maxOutputTokens }),
        signal,
      });
      if (!response.ok) throw new Error(`AI proxy responded ${response.status}`);
      const data = await response.json();
      const text = data.text ?? data.completion ?? data.output;
      return typeof text === 'string' && text.trim() ? text.trim() : null;
    }

    const response = await fetchWithTimeout(
      `${GEMINI_ENDPOINT(env.geminiModel)}?key=${encodeURIComponent(env.geminiApiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens },
        }),
        signal,
      },
    );

    if (!response.ok) throw new Error(`Gemini responded ${response.status}`);

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return typeof text === 'string' && text.trim() ? text.trim() : null;
  } catch (error) {
    if (error?.name === 'AbortError') return null;
    // AI is an enhancement, never a hard dependency: log and let the caller
    // fall back to heuristics.
    if (env.isDev) console.warn('[ai] request failed, falling back to heuristics:', error.message);
    return null;
  }
}

/** Split a model response into clean, de-duplicated, numbered-prefix-free lines. */
export function parseLines(text, limit = 5) {
  if (!text) return [];
  const seen = new Set();
  return text
    .split('\n')
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
    .filter((line) => {
      if (line.length < 3 || line.length > 140) return false;
      const key = line.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}
