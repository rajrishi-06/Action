/**
 * AI proxy.
 *
 * Exists so the model API key stays on the server. Anything in a `VITE_`
 * variable is compiled into the client bundle and readable by anyone who opens
 * devtools, which is why `VITE_GEMINI_API_KEY` is ignored in production builds.
 *
 * Deploy target: Vercel (or any host exposing a Node request/response handler).
 *
 * Required environment variables — set these in your host's dashboard, NOT in
 * a VITE_ variable and NOT in a committed file:
 *   GEMINI_API_KEY        the real model key
 *   SUPABASE_URL          your project URL, used to verify the caller's token
 *   SUPABASE_ANON_KEY     the publishable key, same purpose
 * Optional:
 *   GEMINI_MODEL          defaults to gemini-2.0-flash
 *   AI_RATE_LIMIT         requests per window per user, defaults to 30
 *   AI_RATE_WINDOW_MS     window length, defaults to 60000
 *   ALLOWED_ORIGIN        CORS origin; defaults to same-origin only
 */

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const RATE_LIMIT = Number(process.env.AI_RATE_LIMIT || 30);
const RATE_WINDOW_MS = Number(process.env.AI_RATE_WINDOW_MS || 60_000);

/** Upstream must finish comfortably inside the client's 12s abort. */
const UPSTREAM_TIMEOUT_MS = 9_000;
const MAX_PROMPT_CHARS = 4_000;

/**
 * Per-user request counters.
 *
 * In-memory, so it resets on cold start and is per-instance. That is a real
 * limitation: it throttles a runaway client but will not stop a determined
 * attacker across many instances. For anything beyond personal use, move this
 * to Redis / Upstash and keep the same interface.
 */
const buckets = new Map();

function rateLimit(userId) {
  const now = Date.now();
  const bucket = buckets.get(userId);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(userId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }

  if (bucket.count >= RATE_LIMIT) {
    return { allowed: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { allowed: true, retryAfter: 0 };
}

/** Stop the map growing without bound on a long-lived instance. */
function sweep() {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
}

/**
 * Verify the caller is a signed-in user of this app.
 *
 * Without this the endpoint is an open relay for your API quota — anyone who
 * finds the URL can spend your money.
 */
async function verifyCaller(authHeader) {
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;

  const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: process.env.SUPABASE_ANON_KEY },
  });

  if (!response.ok) return null;
  const user = await response.json();
  return user?.id ?? null;
}

export default async function handler(req, res) {
  const origin = process.env.ALLOWED_ORIGIN;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Vary', 'Origin');
  }

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  for (const name of ['GEMINI_API_KEY', 'SUPABASE_URL', 'SUPABASE_ANON_KEY']) {
    if (!process.env[name]) {
      // Do not name the variable in the response — that is server configuration
      // detail. It is in the logs for you.
      console.error(`[ai] missing required environment variable: ${name}`);
      return res.status(500).json({ error: 'AI is not configured' });
    }
  }

  const userId = await verifyCaller(req.headers.authorization);
  if (!userId) return res.status(401).json({ error: 'Sign in required' });

  sweep();
  const { allowed, retryAfter } = rateLimit(userId);
  if (!allowed) {
    res.setHeader('Retry-After', String(retryAfter));
    return res.status(429).json({ error: 'Too many requests' });
  }

  const { prompt, maxOutputTokens = 512 } = req.body ?? {};

  if (typeof prompt !== 'string' || prompt.trim() === '') {
    return res.status(400).json({ error: 'A prompt is required' });
  }
  if (prompt.length > MAX_PROMPT_CHARS) {
    return res.status(413).json({ error: 'Prompt too long' });
  }

  // Prompts contain task titles, which are personal. Nothing here logs them,
  // and nothing should be added that does without telling users first.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: Math.min(Number(maxOutputTokens) || 512, 1024),
          },
        }),
        signal: controller.signal,
      },
    );

    if (!upstream.ok) {
      console.error(`[ai] upstream responded ${upstream.status}`);
      return res.status(502).json({ error: 'AI provider unavailable' });
    }

    const data = await upstream.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    // The client treats an empty response as "fall back to local heuristics",
    // so this degrades rather than fails.
    return res.status(200).json({ text: text.trim() });
  } catch (error) {
    if (error.name === 'AbortError') {
      return res.status(504).json({ error: 'AI provider timed out' });
    }
    console.error('[ai] request failed:', error.message);
    return res.status(502).json({ error: 'AI provider unavailable' });
  } finally {
    clearTimeout(timer);
  }
}
