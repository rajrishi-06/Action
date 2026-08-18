import { createClient } from '@supabase/supabase-js';
import { env, isSupabaseConfigured } from './env';

/**
 * The Supabase client, or `null` when the app has not been configured yet.
 *
 * Returning `null` instead of constructing a client with `undefined`
 * credentials is deliberate: the old behaviour threw during module evaluation
 * and rendered a blank white page with a stack trace in the console. Now the
 * app boots and shows an actionable setup screen instead.
 */
export const supabase = isSupabaseConfigured
  ? createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    })
  : null;

/** Throw a clear error rather than a `null` dereference deep inside a caller. */
export function requireSupabase() {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.',
    );
  }
  return supabase;
}
