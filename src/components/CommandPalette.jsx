import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart3, CalendarDays, CheckCircle2, Columns3, CornerDownLeft, Download,
  Inbox, LogOut, Moon, Plus, Search, Settings, Sun, Timer,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { useTodo } from '../context/TodoContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { exportTasks } from '../lib/export';
import { formatDueShort, isOverdue } from '../lib/date';
import { PRIORITY_META } from '../lib/taskModel';
import { cn } from '../lib/cn';
import { Kbd } from './ui/primitives';
import { useFocusTrap } from '../hooks/useFocusTrap';

/** Subsequence match, so "anlt" finds "Analytics". */
function fuzzyScore(haystack, needle) {
  if (!needle) return 0;
  const text = haystack.toLowerCase();
  const query = needle.toLowerCase();

  const exact = text.indexOf(query);
  if (exact === 0) return 1000;
  if (exact > 0) return 800 - exact;

  let score = 0;
  let cursor = 0;
  for (const char of query) {
    const index = text.indexOf(char, cursor);
    if (index === -1) return -1;
    // Consecutive matches are worth more than scattered ones.
    score += index === cursor ? 10 : 3;
    cursor = index + 1;
  }
  return score;
}

/**
 * Command palette.
 *
 * Runs commands *and* searches the user's tasks — the previous version showed a
 * "Type a command or search tasks…" placeholder but only ever filtered nine
 * hard-coded commands.
 */
export function CommandPalette({ open, onClose }) {
  // The inner component only exists while the palette is open, so its state
  // starts fresh on every launch — no effect needed to reset the query.
  return createPortal(
    <AnimatePresence>{open && <PaletteDialog onClose={onClose} />}</AnimatePresence>,
    document.body,
  );
}

function PaletteDialog({ onClose }) {
  const navigate = useNavigate();
  const { tasks, addTask, toggleTask, setFilter } = useTodo();
  const { signOut } = useAuth();
  const { setTheme } = useTheme();
  const toast = useToast();

  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const panelRef = useRef(null);

  useFocusTrap(panelRef, true);

  // Focus the field once the panel has mounted and begun animating in.
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 20);
    return () => clearTimeout(timer);
  }, []);

  const commands = useMemo(
    () => [
      { id: 'go-today', group: 'Navigate', label: 'Go to Today', icon: Sun, keywords: 'today home', run: () => navigate('/app/today') },
      { id: 'go-upcoming', group: 'Navigate', label: 'Go to Upcoming', icon: CalendarDays, keywords: 'upcoming later', run: () => navigate('/app/upcoming') },
      { id: 'go-all', group: 'Navigate', label: 'Go to All tasks', icon: Inbox, keywords: 'all inbox everything', run: () => navigate('/app/all') },
      { id: 'go-board', group: 'Navigate', label: 'Go to Board', icon: Columns3, keywords: 'kanban board columns', run: () => navigate('/app/board') },
      { id: 'go-calendar', group: 'Navigate', label: 'Go to Calendar', icon: CalendarDays, keywords: 'calendar month schedule', run: () => navigate('/app/calendar') },
      { id: 'go-focus', group: 'Navigate', label: 'Go to Focus timer', icon: Timer, keywords: 'focus pomodoro timer', run: () => navigate('/app/focus') },
      { id: 'go-analytics', group: 'Navigate', label: 'Go to Insights', icon: BarChart3, keywords: 'analytics stats insights charts', run: () => navigate('/app/analytics') },
      { id: 'go-settings', group: 'Navigate', label: 'Go to Settings', icon: Settings, keywords: 'settings preferences account', run: () => navigate('/app/settings') },

      { id: 'filter-overdue', group: 'Filter', label: 'Show overdue tasks', icon: CheckCircle2, keywords: 'overdue late slipped', run: () => { setFilter({ scope: 'all' }); navigate('/app/all'); } },

      { id: 'theme-light', group: 'Theme', label: 'Switch to light theme', icon: Sun, keywords: 'light theme bright', run: () => setTheme('light') },
      { id: 'theme-dark', group: 'Theme', label: 'Switch to dark theme', icon: Moon, keywords: 'dark theme night', run: () => setTheme('dark') },

      { id: 'export-json', group: 'Export', label: 'Export tasks as JSON', icon: Download, keywords: 'export download json backup', run: () => toast.success(`Exported as ${exportTasks(tasks, 'json')}`) },
      { id: 'export-csv', group: 'Export', label: 'Export tasks as CSV', icon: Download, keywords: 'export download csv spreadsheet', run: () => toast.success(`Exported as ${exportTasks(tasks, 'csv')}`) },
      { id: 'export-md', group: 'Export', label: 'Export tasks as Markdown', icon: Download, keywords: 'export download markdown md', run: () => toast.success(`Exported as ${exportTasks(tasks, 'markdown')}`) },

      { id: 'sign-out', group: 'Account', label: 'Sign out', icon: LogOut, keywords: 'sign out logout leave', run: signOut },
    ],
    [navigate, setFilter, setTheme, tasks, toast, signOut],
  );

  const results = useMemo(() => {
    const trimmed = query.trim();

    const matchedCommands = (
      trimmed
        ? commands
            .map((command) => ({
              ...command,
              score: Math.max(fuzzyScore(command.label, trimmed), fuzzyScore(command.keywords, trimmed) - 50),
            }))
            .filter((command) => command.score > 0)
            .sort((a, b) => b.score - a.score)
        : commands
    ).slice(0, trimmed ? 6 : commands.length);

    const matchedTasks = trimmed
      ? tasks
          .map((task) => ({ task, score: fuzzyScore(task.title, trimmed) }))
          .filter((entry) => entry.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 6)
          .map(({ task }) => ({
            id: `task:${task.id}`,
            group: 'Tasks',
            label: task.title,
            task,
            run: () => toggleTask(task.id),
          }))
      : [];

    const createOption =
      trimmed.length >= 2
        ? [{
            id: 'create',
            group: 'Create',
            label: `Add task “${trimmed}”`,
            icon: Plus,
            run: async () => {
              await addTask(trimmed);
              toast.success('Task added');
            },
          }]
        : [];

    // "Create" ranks last, not first. Typing a command name and pressing Enter
    // should run that command — creating a task called "insights" because the
    // create option happened to sit at the top is a surprising way to lose a
    // keystroke. It stays one arrow-key away.
    return [...matchedTasks, ...matchedCommands, ...createOption];
  }, [query, commands, tasks, addTask, toggleTask, toast]);

  // Keep the selection inside the result list as it shrinks.
  const safeIndex = Math.min(activeIndex, Math.max(results.length - 1, 0));

  const runActive = () => {
    const item = results[safeIndex];
    if (!item) return;
    item.run();
    onClose();
  };

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % Math.max(results.length, 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => (current - 1 + results.length) % Math.max(results.length, 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      runActive();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  // Keep the highlighted row scrolled into view when navigating by keyboard.
  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${safeIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [safeIndex]);

  let lastGroup = null;

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 pt-[12vh]">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.12 }}
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        initial={{ opacity: 0, scale: 0.98, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: -8 }}
        transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-surface-raised shadow-pop"
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="h-4 w-4 flex-shrink-0 text-ink-subtle" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search tasks or run a command…"
            aria-label="Search tasks or run a command"
            aria-controls="command-results"
            aria-activedescendant={results[safeIndex] ? `command-${safeIndex}` : undefined}
            className="h-14 min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-subtle"
          />
          <Kbd>Esc</Kbd>
        </div>

        <div
          id="command-results"
          ref={listRef}
          role="listbox"
          aria-label="Results"
          className="max-h-[22rem] overflow-y-auto p-2 scrollbar-thin"
        >
          {results.length === 0 ? (
            <p className="px-3 py-10 text-center text-sm text-ink-muted">
              Nothing matches “{query}”.
            </p>
          ) : (
            results.map((item, index) => {
              const showGroup = item.group !== lastGroup;
              lastGroup = item.group;
              const Icon = item.icon;
              const priority = item.task ? PRIORITY_META[item.task.priority] : null;

              return (
                <div key={item.id}>
                  {showGroup && (
                    <p className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">
                      {item.group}
                    </p>
                  )}
                  <button
                    type="button"
                    id={`command-${index}`}
                    data-index={index}
                    role="option"
                    aria-selected={index === safeIndex}
                    onClick={() => {
                      item.run();
                      onClose();
                    }}
                    onMouseMove={() => setActiveIndex(index)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                      index === safeIndex ? 'bg-brand-50 text-brand-800 dark:bg-brand-950/60 dark:text-brand-200' : 'text-ink',
                    )}
                  >
                    {item.task ? (
                      <span className={cn('h-2 w-2 flex-shrink-0 rounded-full', priority.dot)} aria-hidden="true" />
                    ) : (
                      Icon && <Icon className="h-4 w-4 flex-shrink-0 text-ink-subtle" aria-hidden="true" />
                    )}
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {item.task?.dueDate && (
                      <span className={cn('flex-shrink-0 text-xs', isOverdue(item.task) ? 'text-rose-500' : 'text-ink-subtle')}>
                        {formatDueShort(item.task.dueDate)}
                      </span>
                    )}
                    {index === safeIndex && <CornerDownLeft className="h-3.5 w-3.5 flex-shrink-0 text-ink-subtle" />}
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t border-line px-4 py-2.5 text-xs text-ink-subtle">
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> navigate</span>
            <span className="flex items-center gap-1"><Kbd>↵</Kbd> select</span>
          </span>
          <span>Tasks toggle complete when selected</span>
        </div>
      </motion.div>
    </div>
  );
}
