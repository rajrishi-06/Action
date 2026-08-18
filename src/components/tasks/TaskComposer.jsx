import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Calendar, CornerDownLeft, Flag, Hash, Loader2, Plus, Sparkles, Timer } from 'lucide-react';
import { useTodo } from '../../context/TodoContext';
import { useToast } from '../../context/ToastContext';
import { parseTaskInput } from '../../lib/taskParser';
import { formatDueDate, formatDuration } from '../../lib/date';
import { PRIORITY_META } from '../../lib/taskModel';
import { suggestEstimate, suggestTags, isRemoteAIEnabled } from '../../lib/ai';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { cn } from '../../lib/cn';
import { Button } from '../ui/Button';
import { Kbd } from '../ui/primitives';

const SYNTAX_HELP = [
  { icon: Calendar, syntax: 'tomorrow 5pm', label: 'Dates and times' },
  { icon: Flag, syntax: '!high', label: 'Priority' },
  { icon: Hash, syntax: '#work', label: 'Tags' },
  { icon: Timer, syntax: '~45m', label: 'Estimate' },
];

/**
 * Task capture field.
 *
 * The parse result is shown live as chips underneath, so the user can see
 * exactly what the app understood before committing — the old version parsed
 * silently and left the raw text in the title.
 */
export function TaskComposer({ focusOnMount = false, defaultStatus, onCreated }) {
  const { addTask } = useTodo();
  const toast = useToast();
  const inputRef = useRef(null);

  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [dismissedFor, setDismissedFor] = useState(null);

  const debounced = useDebouncedValue(value, 700);
  const parsed = useMemo(() => (value.trim() ? parseTaskInput(value) : null), [value]);

  // Not the DOM `autoFocus` attribute: this is an explicit opt-in used when
  // the composer opens inside a dialog, where moving focus in is correct.
  useEffect(() => {
    if (focusOnMount) inputRef.current?.focus();
  }, [focusOnMount]);

  // Ask for tag/estimate suggestions only for input long enough to be a real
  // task, and only for what the parser did not already find.
  const suggestionText = debounced.trim();
  const { data: suggestion, loading: enriching } = useAsyncResource(
    async ({ signal }) => {
      const draft = parseTaskInput(suggestionText);
      const [tags, estimate] = await Promise.all([
        draft.tags.length ? { items: [], source: 'local' } : suggestTags(draft.title, { signal }),
        draft.estimateMinutes ? { value: null, source: 'local' } : suggestEstimate(draft.title, { signal }),
      ]);

      const items = tags.items ?? [];
      const minutes = estimate.value ?? null;
      if (!items.length && !minutes) return null;

      return {
        tags: items,
        estimate: minutes,
        source: tags.source === 'ai' || estimate.source === 'ai' ? 'ai' : 'local',
      };
    },
    [suggestionText],
    { enabled: suggestionText.length >= 12 },
  );

  // Hide the row once dismissed, until the text changes again.
  const enrichment = suggestion && dismissedFor !== suggestionText ? suggestion : null;

  const reset = () => {
    setValue('');
    setDismissedFor(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const text = value.trim();
    if (!text || submitting) return;

    setSubmitting(true);
    const created = await addTask({
      ...parseTaskInput(text),
      status: defaultStatus ?? undefined,
    });
    setSubmitting(false);

    if (created) {
      reset();
      onCreated?.(created);
      inputRef.current?.focus();
    }
  };

  const applySuggestion = () => {
    if (!enrichment) return;
    const additions = [
      ...enrichment.tags.map((tag) => `#${tag}`),
      enrichment.estimate ? `~${enrichment.estimate}m` : '',
    ]
      .filter(Boolean)
      .join(' ');
    setValue((current) => `${current.trim()} ${additions}`.trim());
    setDismissedFor(suggestionText);
    inputRef.current?.focus();
    toast.info('Suggestion applied');
  };

  const chips = [];
  if (parsed?.dueDate) {
    chips.push({
      key: 'due',
      icon: Calendar,
      label: formatDueDate(parsed.dueDate, parsed.hasTime),
      className: 'text-brand-700 bg-brand-50 dark:text-brand-300 dark:bg-brand-950/60',
    });
  }
  if (parsed && parsed.priority !== 'medium') {
    chips.push({
      key: 'priority',
      icon: Flag,
      label: PRIORITY_META[parsed.priority].label,
      className: PRIORITY_META[parsed.priority].chip,
    });
  }
  parsed?.tags.forEach((tag) =>
    chips.push({
      key: `tag-${tag}`,
      icon: Hash,
      label: tag,
      className: 'text-ink-muted bg-surface-sunken',
    }),
  );
  if (parsed?.estimateMinutes) {
    chips.push({
      key: 'estimate',
      icon: Timer,
      label: formatDuration(parsed.estimateMinutes),
      className: 'text-ink-muted bg-surface-sunken',
    });
  }
  if (parsed?.recurrence) {
    chips.push({
      key: 'recurrence',
      icon: Sparkles,
      label: `Repeats ${parsed.recurrence}`,
      className: 'text-accent-700 bg-accent-50 dark:text-accent-300 dark:bg-accent-900/40',
    });
  }

  return (
    <div className="group space-y-2">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-center rounded-xl border border-line bg-surface shadow-card transition-shadow focus-within:border-brand-500 focus-within:shadow-card-hover">
          <Plus className="pointer-events-none absolute left-3.5 h-5 w-5 text-ink-subtle" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Add a task — try “Draft the release notes tomorrow 4pm #work !high”"
            aria-label="New task"
            autoComplete="off"
            className="h-14 w-full rounded-xl bg-transparent pl-11 pr-28 text-[15px] text-ink outline-none placeholder:text-ink-subtle"
          />
          <div className="absolute right-2.5 flex items-center gap-2">
            {enriching && <Loader2 className="h-4 w-4 animate-spin text-ink-subtle" aria-hidden="true" />}
            <Button type="submit" size="sm" variant="primary" disabled={!value.trim()} loading={submitting}>
              Add
              <Kbd className="ml-0.5 hidden border-white/25 bg-white/15 text-white sm:inline-flex">
                <CornerDownLeft className="h-3 w-3" />
              </Kbd>
            </Button>
          </div>
        </div>
      </form>

      {/* What the parser understood, live. */}
      <AnimatePresence mode="wait">
        {chips.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="flex flex-wrap items-center gap-1.5 px-1"
          >
            <span className="text-xs text-ink-subtle">Will be saved as</span>
            <span className="rounded-md bg-surface-sunken px-2 py-0.5 text-xs font-medium text-ink">
              {parsed.title}
            </span>
            {chips.map((chip) => (
              <span
                key={chip.key}
                className={cn(
                  'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium',
                  chip.className,
                )}
              >
                <chip.icon className="h-3 w-3" aria-hidden="true" />
                {chip.label}
              </span>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Suggested tags/estimate, offered but never applied automatically. */}
      <AnimatePresence>
        {enrichment && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface-sunken px-3 py-2"
          >
            <Sparkles className="h-3.5 w-3.5 text-accent-500" aria-hidden="true" />
            <span className="text-xs text-ink-muted">
              {isRemoteAIEnabled && enrichment.source === 'ai' ? 'AI suggests' : 'Suggested'}
            </span>
            {enrichment.tags.map((tag) => (
              <span key={tag} className="rounded-md bg-surface px-1.5 py-0.5 text-xs font-medium text-ink">
                #{tag}
              </span>
            ))}
            {enrichment.estimate && (
              <span className="rounded-md bg-surface px-1.5 py-0.5 text-xs font-medium text-ink">
                ~{formatDuration(enrichment.estimate)}
              </span>
            )}
            <button
              type="button"
              onClick={applySuggestion}
              className="ml-auto rounded-md px-2 py-1 text-xs font-semibold text-brand-600 hover:bg-surface dark:text-brand-400"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={() => setDismissedFor(suggestionText)}
              className="rounded-md px-2 py-1 text-xs font-medium text-ink-subtle hover:bg-surface"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Syntax hints, revealed on focus so they never become permanent noise. */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 px-1 opacity-0 transition-opacity group-focus-within:opacity-100">
        {SYNTAX_HELP.map(({ icon: Icon, syntax, label }) => (
          <span key={syntax} className="inline-flex items-center gap-1.5 text-xs text-ink-subtle">
            <Icon className="h-3 w-3" aria-hidden="true" />
            <code className="font-mono text-ink-muted">{syntax}</code>
            <span className="hidden sm:inline">{label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
