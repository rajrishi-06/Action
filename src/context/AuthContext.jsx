import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { isSupabaseConfigured } from '../lib/env';

const AuthContext = createContext(null);

/**
 * Session state.
 *
 * Splitting this out of App means data providers can subscribe to the *user*
 * rather than guessing. Previously the task provider fetched once on mount —
 * which happened while the user was still signed out — so after logging in the
 * list stayed empty until a full page reload.
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [status, setStatus] = useState(isSupabaseConfigured ? 'loading' : 'unconfigured');

  useEffect(() => {
    if (!supabase) return undefined;

    let active = true;

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) console.error('Failed to restore session:', error.message);
        setSession(data?.session ?? null);
        setStatus('ready');
      })
      .catch((error) => {
        if (!active) return;
        console.error('Failed to restore session:', error.message);
        setStatus('ready');
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setStatus('ready');
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  const value = useMemo(() => {
    const user = session?.user ?? null;
    return {
      session,
      user,
      userId: user?.id ?? null,
      email: user?.email ?? null,
      /** Best available display name, falling back to the email local part. */
      displayName:
        user?.user_metadata?.full_name ??
        user?.user_metadata?.name ??
        user?.email?.split('@')[0] ??
        'there',
      avatarUrl: user?.user_metadata?.avatar_url ?? null,
      isAuthenticated: Boolean(user),
      isLoading: status === 'loading',
      isConfigured: isSupabaseConfigured,
      signOut,
    };
  }, [session, status, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside an AuthProvider');
  return context;
}
