/**
 * Runtime configuration.
 *
 * Vite inlines `import.meta.env.*` at build time, so anything read here ends up
 * in the client bundle. Only ever put publishable values in these variables —
 * the Supabase anon key is designed for that (it is useless without Row Level
 * Security policies, which `supabase/tables.sql` sets up).
 */

const read = (key) => {
  const value = import.meta.env[key];
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
};

export const env = {
  supabaseUrl: read('VITE_SUPABASE_URL'),
  supabaseAnonKey: read('VITE_SUPABASE_ANON_KEY'),
  /**
   * Optional server-side proxy for AI requests. Strongly preferred over
   * `VITE_GEMINI_API_KEY`: a key shipped to the browser is public.
   */
  aiProxyUrl: read('VITE_AI_PROXY_URL'),
  /** Development-only escape hatch. See `src/lib/ai/provider.js`. */
  geminiApiKey: read('VITE_GEMINI_API_KEY'),
  geminiModel: read('VITE_GEMINI_MODEL') ?? 'gemini-2.0-flash',
  isDev: import.meta.env.DEV,
};

/** True when Supabase is configured well enough to attempt a connection. */
export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);

/** Human-readable list of what is missing, for the setup screen. */
export function missingSupabaseVars() {
  const missing = [];
  if (!env.supabaseUrl) missing.push('VITE_SUPABASE_URL');
  if (!env.supabaseAnonKey) missing.push('VITE_SUPABASE_ANON_KEY');
  return missing;
}
