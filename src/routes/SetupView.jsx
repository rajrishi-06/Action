import { AlertTriangle, ExternalLink, Terminal } from 'lucide-react';
import { missingSupabaseVars } from '../lib/env';

/**
 * Shown when Supabase credentials are missing.
 *
 * Previously the client was constructed with `undefined` credentials, which
 * threw during module evaluation — the user got a blank white page and a stack
 * trace in the console. This explains what to do instead.
 */
export function SetupView() {
  const missing = missingSupabaseVars();

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-6">
      <div className="w-full max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-card">
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        </span>

        <h1 className="font-display text-xl font-bold text-ink">Action is not configured yet</h1>
        <p className="mt-2 text-sm text-ink-muted">
          The app needs a Supabase project to store your tasks. It takes about two minutes.
        </p>

        <ol className="mt-6 space-y-4 text-sm text-ink-muted">
          <li>
            <span className="font-medium text-ink">1. Create a project</span> at{' '}
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium text-brand-600 hover:underline dark:text-brand-400"
            >
              supabase.com
              <ExternalLink className="h-3 w-3" />
            </a>
          </li>
          <li>
            <span className="font-medium text-ink">2. Run the schema</span> in{' '}
            <code className="rounded bg-surface-sunken px-1.5 py-0.5 font-mono text-xs text-ink">supabase/tables.sql</code>{' '}
            from this repository in the SQL editor.
          </li>
          <li>
            <span className="font-medium text-ink">3. Add a .env file</span> in the project root:
            <pre className="mt-2 overflow-x-auto rounded-lg bg-surface-sunken p-3 font-mono text-xs text-ink">
{`VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...`}
            </pre>
          </li>
          <li className="flex items-start gap-2">
            <Terminal className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <span>
              <span className="font-medium text-ink">4. Restart the dev server.</span> Vite only
              reads environment variables at startup.
            </span>
          </li>
        </ol>

        {missing.length > 0 && (
          <p className="mt-6 rounded-lg border border-line bg-surface-sunken px-3 py-2 text-xs text-ink-muted">
            Currently missing: {missing.map((name) => (
              <code key={name} className="mx-0.5 font-mono text-ink">{name}</code>
            ))}
          </p>
        )}
      </div>
    </div>
  );
}
