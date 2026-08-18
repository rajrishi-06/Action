import { useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { CheckCircle2, Flame, ListTodo, Sun } from 'lucide-react';
import { useTodo } from '../context/TodoContext';
import { useAuth } from '../context/AuthContext';
import { TaskComposer } from '../components/tasks/TaskComposer';
import { TaskToolbar } from '../components/tasks/TaskToolbar';
import { TaskList } from '../components/tasks/TaskList';
import { CoachPanel } from '../components/CoachPanel';

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 5) return 'Still up';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const COPY = {
  today: {
    title: 'Today',
    icon: Sun,
    subtitle: 'What you have committed to right now.',
  },
  upcoming: {
    title: 'Upcoming',
    icon: ListTodo,
    subtitle: 'Everything scheduled beyond today.',
  },
  all: {
    title: 'All tasks',
    icon: ListTodo,
    subtitle: 'The complete picture, nothing hidden.',
  },
  completed: {
    title: 'Completed',
    icon: CheckCircle2,
    subtitle: 'Everything you have finished.',
  },
};

/**
 * The list-based task views. One component serves Today / Upcoming / All /
 * Completed — they differ only in scope, so a single route with a `scope` prop
 * keeps the behaviour identical everywhere.
 */
export function TasksView({ scope = 'all' }) {
  const { setFilter, counts } = useTodo();
  const { displayName } = useAuth();
  const { searchRef, openTask } = useOutletContext();

  // Point the shared filter at this route's scope.
  useEffect(() => {
    setFilter({ scope, showCompleted: scope === 'completed' });
  }, [scope, setFilter]);

  const copy = COPY[scope] ?? COPY.all;
  const Icon = copy.icon;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-ink-muted">
            {greeting()}, {displayName}
          </p>
          <h1 className="mt-0.5 flex items-center gap-2 font-display text-2xl font-bold text-ink">
            <Icon className="h-6 w-6 text-brand-600 dark:text-brand-400" aria-hidden="true" />
            {copy.title}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">{copy.subtitle}</p>
        </div>

        {counts.overdue > 0 && scope !== 'completed' && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-sm font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">
            <Flame className="h-3.5 w-3.5" aria-hidden="true" />
            {counts.overdue} overdue
          </span>
        )}
      </header>

      {scope !== 'completed' && (
        <>
          <TaskComposer defaultStatus={scope === 'today' ? 'today' : undefined} />
          <CoachPanel onOpenTask={openTask} />
        </>
      )}

      <TaskToolbar searchRef={searchRef} />
      <TaskList onOpenTask={(task) => openTask(task.id)} selectable />
    </div>
  );
}
