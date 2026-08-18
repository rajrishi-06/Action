import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

const MODES = {
  signin: { title: 'Welcome back', cta: 'Sign in', alt: 'signup', altPrompt: 'New here?', altLabel: 'Create an account' },
  signup: { title: 'Create your account', cta: 'Create account', alt: 'signin', altPrompt: 'Already have an account?', altLabel: 'Sign in' },
  magic: { title: 'Sign in with a link', cta: 'Email me a link', alt: 'signin', altPrompt: 'Prefer a password?', altLabel: 'Use a password' },
};

const FEATURES = [
  'Type “report friday 4pm #work !high” and it just parses',
  'Board, calendar and focus timer over the same tasks',
  'Insights from when you actually finish things',
];

/**
 * Sign in / sign up.
 *
 * The previous screen hard-coded a banner saying Google sign-in was unavailable
 * while still rendering the Google button, used `alert()` for confirmations, and
 * advertised magic links that were never implemented. All three are fixed here.
 */
export function AuthView() {
  const toast = useToast();

  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);

  const config = MODES[mode];

  const switchMode = (next) => {
    setMode(next);
    setError(null);
    setSent(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'magic') {
        const { error: magicError } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: window.location.origin },
        });
        if (magicError) throw magicError;
        setSent(true);
        return;
      }

      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;

        // Supabase returns a user with no session when confirmation is required.
        if (!data.session) {
          setSent(true);
          return;
        }
        toast.success('Account created');
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
    } catch (caught) {
      setError(caught.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-canvas">
      {/* Product pitch, hidden on small screens where it would just push the form down. */}
      <aside className="relative hidden w-1/2 flex-col justify-between bg-gradient-to-br from-brand-700 via-brand-600 to-accent-500 p-10 text-white lg:flex">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="" width="36" height="36" className="h-9 w-9 rounded-lg bg-white/95 object-contain p-0.5" />
          <span className="font-display text-2xl font-bold">Action</span>
        </div>

        <div className="max-w-md">
          <h2 className="font-display text-3xl font-bold leading-tight">
            Plan it, focus on it, finish it.
          </h2>
          <ul className="mt-6 space-y-3">
            {FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5 text-sm text-white/90">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-white/70">Your data stays in your own Supabase project.</p>
      </aside>

      <main className="flex flex-1 items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-sm"
        >
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <img src="/logo.png" alt="" width="32" height="32" className="h-8 w-8 rounded-lg bg-white object-contain ring-1 ring-line" />
            <span className="font-display text-xl font-bold brand-gradient-text">Action</span>
          </div>

          {sent ? (
            <div className="rounded-2xl border border-line bg-surface p-6 text-center">
              <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400">
                <Mail className="h-6 w-6" aria-hidden="true" />
              </span>
              <h1 className="text-lg font-semibold text-ink">Check your email</h1>
              <p className="mt-2 text-sm text-ink-muted">
                We sent a link to <span className="font-medium text-ink">{email}</span>. Open it on
                this device to finish signing in.
              </p>
              <Button variant="ghost" size="sm" className="mt-5" onClick={() => switchMode('signin')}>
                Back to sign in
              </Button>
            </div>
          ) : (
            <>
              <h1 className="font-display text-2xl font-bold text-ink">{config.title}</h1>
              <p className="mt-1 text-sm text-ink-muted">
                {mode === 'magic'
                  ? 'No password needed — we will email you a one-time link.'
                  : 'Pick up exactly where you left off.'}
              </p>

              {error && (
                <div role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <Input
                  type="email"
                  label="Email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                />

                {mode !== 'magic' && (
                  <Input
                    type="password"
                    label="Password"
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    required
                    minLength={8}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    hint={mode === 'signup' ? 'At least 8 characters' : undefined}
                  />
                )}

                <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
                  {config.cta}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>

              {mode !== 'magic' && (
                <button
                  type="button"
                  onClick={() => switchMode('magic')}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-line py-2.5 text-sm font-medium text-ink transition-colors hover:bg-surface-sunken"
                >
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  Email me a sign-in link
                </button>
              )}

              <p className="mt-6 text-center text-sm text-ink-muted">
                {config.altPrompt}{' '}
                <button
                  type="button"
                  onClick={() => switchMode(config.alt)}
                  className="font-medium text-brand-600 hover:underline dark:text-brand-400"
                >
                  {config.altLabel}
                </button>
              </p>
            </>
          )}
        </motion.div>
      </main>
    </div>
  );
}
