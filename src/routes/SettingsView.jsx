import { useState } from 'react';
import { AlertTriangle, Check, Download, LogOut, Palette, Settings, Shield, Sparkles, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme, THEMES } from '../context/ThemeContext';
import { useTodo } from '../context/TodoContext';
import { useToast } from '../context/ToastContext';
import { EXPORT_FORMATS, exportTasks } from '../lib/export';
import { AI_MODE, hasUnsafeKeyInProduction, isRemoteAIEnabled } from '../lib/ai';
import { Gamification } from '../components/Gamification';
import { Card, CardHeader } from '../components/ui/primitives';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/Modal';
import { cn } from '../lib/cn';

const THEME_LABELS = { light: 'Light', dark: 'Dark', system: 'Match system' };

const AI_COPY = {
  proxy: {
    tone: 'success',
    title: 'AI via your own proxy',
    body: 'Requests go through the endpoint in VITE_AI_PROXY_URL, so your API key stays on the server. This is the recommended setup.',
  },
  direct: {
    tone: 'warning',
    title: 'AI in development mode',
    body: 'Calls go straight from the browser using VITE_GEMINI_API_KEY. Fine locally, but the key would be readable by anyone in a production build — set VITE_AI_PROXY_URL before deploying.',
  },
  off: {
    tone: 'neutral',
    title: 'AI suggestions off',
    body: 'Suggestions come from the built-in rules instead. Everything works; the wording is just less tailored. Set VITE_AI_PROXY_URL to enable model-backed suggestions.',
  },
};

export function SettingsView() {
  const { email, displayName, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { tasks, deleteMany } = useTodo();
  const toast = useToast();

  const [confirmClear, setConfirmClear] = useState(false);

  const completed = tasks.filter((task) => task.completed);
  const aiCopy = AI_COPY[AI_MODE];

  const handleExport = (format) => {
    const label = exportTasks(tasks, format);
    toast.success(`Exported ${tasks.length} tasks as ${label}`);
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-ink">
          <Settings className="h-6 w-6 text-brand-600 dark:text-brand-400" aria-hidden="true" />
          Settings
        </h1>
        <p className="mt-1 text-sm text-ink-muted">Signed in as {email}</p>
      </header>

      <Card>
        <CardHeader title="Your progress" description="Earned from completed tasks." icon={<Sparkles className="h-4 w-4" />} />
        <div className="px-5 pb-5">
          <Gamification />
        </div>
      </Card>

      <Card>
        <CardHeader title="Appearance" description="Applies immediately and is remembered." icon={<Palette className="h-4 w-4" />} />
        <div className="px-5 pb-5">
          <div role="radiogroup" aria-label="Theme" className="flex gap-2">
            {THEMES.map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={theme === option}
                onClick={() => setTheme(option)}
                className={cn(
                  'flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors',
                  theme === option
                    ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300'
                    : 'border-line text-ink-muted hover:border-line-strong hover:text-ink',
                )}
              >
                <span className="flex items-center justify-center gap-1.5">
                  {theme === option && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                  {THEME_LABELS[option]}
                </span>
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="AI suggestions"
          description="How task breakdowns, tags and estimates are generated."
          icon={<Sparkles className="h-4 w-4" />}
        />
        <div className="px-5 pb-5">
          <div
            className={cn(
              'rounded-xl border p-4',
              aiCopy.tone === 'success' && 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40',
              aiCopy.tone === 'warning' && 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40',
              aiCopy.tone === 'neutral' && 'border-line bg-surface-sunken',
            )}
          >
            <p className="flex items-center gap-2 text-sm font-medium text-ink">
              {aiCopy.tone === 'warning' && <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />}
              {aiCopy.title}
            </p>
            <p className="mt-1 text-sm text-ink-muted">{aiCopy.body}</p>
          </div>

          {hasUnsafeKeyInProduction && (
            <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900 dark:bg-rose-950/40">
              <Shield className="mt-0.5 h-4 w-4 flex-shrink-0 text-rose-600 dark:text-rose-400" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-ink">A browser API key was ignored</p>
                <p className="mt-1 text-sm text-ink-muted">
                  VITE_GEMINI_API_KEY is set in a production build. Any value bundled into the
                  client is public, so it is deliberately not used. Move the key behind a proxy
                  and set VITE_AI_PROXY_URL instead.
                </p>
              </div>
            </div>
          )}

          {!isRemoteAIEnabled && (
            <p className="mt-3 text-xs text-ink-subtle">
              The built-in rules cover task breakdown, tagging and time estimates offline, with no
              account and no per-request cost.
            </p>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Export your data"
          description={`${tasks.length} tasks, including notes, steps and timestamps.`}
          icon={<Download className="h-4 w-4" />}
        />
        <div className="flex flex-wrap gap-2 px-5 pb-5">
          {Object.entries(EXPORT_FORMATS).map(([key, config]) => (
            <Button key={key} size="sm" variant="secondary" onClick={() => handleExport(key)} disabled={tasks.length === 0}>
              <Download className="h-3.5 w-3.5" />
              {config.label}
            </Button>
          ))}
        </div>
      </Card>

      <Card className="border-rose-200 dark:border-rose-900">
        <CardHeader
          title="Danger zone"
          description="These actions cannot be undone from here."
          icon={<AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />}
        />
        <div className="flex flex-wrap gap-2 px-5 pb-5">
          <Button
            size="sm"
            variant="danger"
            disabled={completed.length === 0}
            onClick={() => setConfirmClear(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete {completed.length} completed tasks
          </Button>
          <Button size="sm" variant="secondary" onClick={signOut}>
            <LogOut className="h-3.5 w-3.5" />
            Sign out {displayName}
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={() => deleteMany(completed.map((task) => task.id))}
        title="Delete completed tasks?"
        message={`This removes ${completed.length} completed tasks. You can undo it from the notification that appears, but only for a few seconds — export first if you want a copy.`}
        confirmLabel="Delete them"
      />
    </div>
  );
}
