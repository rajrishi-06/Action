import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay,
  isSameMonth, isToday, startOfMonth, startOfWeek, subMonths,
} from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useTodo } from '../context/TodoContext';
import { PRIORITY_META } from '../lib/taskModel';
import { formatDueDate, isOverdue, toDate } from '../lib/date';
import { cn } from '../lib/cn';
import { Button, IconButton } from '../components/ui/Button';
import { TaskCheckbox } from '../components/tasks/TaskCheckbox';
import { EmptyState } from '../components/ui/primitives';

/**
 * Month calendar.
 *
 * Improvements over the previous version: the grid is padded on both ends so
 * every week is complete (it previously padded only the start, leaving a ragged
 * final row), days are selectable with a detail list beside them, and tasks can
 * be rescheduled by dropping them on a day.
 */
export function CalendarView() {
  const { tasks, updateTask } = useTodo();
  const { openTask } = useOutletContext();

  const [month, setMonth] = useState(() => new Date());
  const [selected, setSelected] = useState(() => new Date());
  const [dragOverDay, setDragOverDay] = useState(null);

  const weeks = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });

    return Array.from({ length: days.length / 7 }, (_, index) => days.slice(index * 7, index * 7 + 7));
  }, [month]);

  const tasksByDay = useMemo(() => {
    const map = new Map();
    for (const task of tasks) {
      const due = toDate(task.dueDate);
      if (!due) continue;
      const key = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(task);
    }
    // Show the most urgent first inside each day.
    for (const list of map.values()) {
      list.sort((a, b) => (PRIORITY_META[b.priority]?.weight ?? 2) - (PRIORITY_META[a.priority]?.weight ?? 2));
    }
    return map;
  }, [tasks]);

  const dayKey = (day) => new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
  const tasksFor = (day) => tasksByDay.get(dayKey(day)) ?? [];
  const selectedTasks = tasksFor(selected);

  const reschedule = (taskId, day) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;
    const existing = toDate(task.dueDate);
    const due = new Date(day);
    // Keep the original time of day when moving a dated task.
    due.setHours(existing?.getHours() ?? 9, existing?.getMinutes() ?? 0, 0, 0);
    updateTask(taskId, { dueDate: due });
  };

  const undated = tasks.filter((task) => !task.completed && !task.dueDate).length;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-ink">
            <CalendarDays className="h-6 w-6 text-brand-600 dark:text-brand-400" aria-hidden="true" />
            Calendar
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Drag a task onto a day to reschedule it.
            {undated > 0 && ` ${undated} tasks have no date yet.`}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="secondary" onClick={() => { setMonth(new Date()); setSelected(new Date()); }}>
            Today
          </Button>
          <IconButton label="Previous month" size="sm" onClick={() => setMonth((m) => subMonths(m, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </IconButton>
          <span className="min-w-[9rem] text-center text-sm font-semibold text-ink" aria-live="polite">
            {format(month, 'MMMM yyyy')}
          </span>
          <IconButton label="Next month" size="sm" onClick={() => setMonth((m) => addMonths(m, 1))}>
            <ChevronRight className="h-4 w-4" />
          </IconButton>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="grid grid-cols-7 border-b border-line">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <div key={day} className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-ink-subtle">
                <span aria-hidden="true">{day.slice(0, 1)}</span>
                <span className="sr-only">{day}</span>
                <span className="hidden sm:inline" aria-hidden="true">{day.slice(1)}</span>
              </div>
            ))}
          </div>

          <div>
            {weeks.map((week) => (
              <div key={week[0].toISOString()} className="grid grid-cols-7 border-b border-line last:border-b-0">
                {week.map((day) => {
                  const dayTasks = tasksFor(day);
                  const openCount = dayTasks.filter((task) => !task.completed).length;
                  const inMonth = isSameMonth(day, month);
                  const isSelected = isSameDay(day, selected);

                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      onClick={() => setSelected(day)}
                      onDragOver={(event) => {
                        event.preventDefault();
                        setDragOverDay(dayKey(day));
                      }}
                      onDragLeave={() => setDragOverDay(null)}
                      onDrop={(event) => {
                        event.preventDefault();
                        setDragOverDay(null);
                        const taskId = event.dataTransfer.getData('text/task-id');
                        if (taskId) reschedule(taskId, day);
                      }}
                      aria-label={`${format(day, 'd MMMM yyyy')}, ${openCount} open tasks`}
                      aria-pressed={isSelected}
                      className={cn(
                        'flex min-h-[4.5rem] flex-col items-start gap-1 border-r border-line p-1.5 text-left transition-colors last:border-r-0',
                        'hover:bg-surface-sunken',
                        !inMonth && 'bg-surface-sunken/40 text-ink-subtle',
                        isSelected && 'bg-brand-50 dark:bg-brand-950/40',
                        dragOverDay === dayKey(day) && 'ring-2 ring-inset ring-brand-500',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                          isToday(day) ? 'bg-brand-600 text-white' : inMonth ? 'text-ink' : 'text-ink-subtle',
                        )}
                      >
                        {format(day, 'd')}
                      </span>

                      <span className="flex w-full flex-col gap-0.5">
                        {dayTasks.slice(0, 2).map((task) => (
                          <span
                            key={task.id}
                            className={cn(
                              'truncate rounded px-1 py-0.5 text-[10px] leading-tight',
                              task.completed
                                ? 'text-ink-subtle line-through'
                                : isOverdue(task)
                                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                  : 'bg-surface-sunken text-ink-muted',
                            )}
                          >
                            {task.title}
                          </span>
                        ))}
                        {dayTasks.length > 2 && (
                          <span className="px-1 text-[10px] text-ink-subtle">+{dayTasks.length - 2} more</span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Selected-day detail */}
        <aside className="rounded-2xl border border-line bg-surface" aria-label={`Tasks for ${format(selected, 'd MMMM')}`}>
          <header className="border-b border-line px-4 py-3">
            <h2 className="text-sm font-semibold text-ink">{format(selected, 'EEEE d MMMM')}</h2>
            <p className="text-xs text-ink-muted">
              {selectedTasks.length === 0
                ? 'Nothing scheduled'
                : `${selectedTasks.filter((t) => !t.completed).length} open · ${selectedTasks.length} total`}
            </p>
          </header>

          <div className="max-h-[26rem] space-y-1 overflow-y-auto p-2 scrollbar-thin">
            {selectedTasks.length === 0 ? (
              <EmptyState
                className="py-10"
                icon={<Plus className="h-5 w-5" />}
                title="Free day"
                description="Drag a task here or set a due date to fill it."
              />
            ) : (
              selectedTasks.map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(event) => event.dataTransfer.setData('text/task-id', task.id)}
                  className="flex cursor-grab items-start gap-2.5 rounded-lg px-2 py-2 hover:bg-surface-sunken active:cursor-grabbing"
                >
                  <TaskCheckbox
                    size="sm"
                    checked={task.completed}
                    onChange={() => updateTask(task.id, {
                      completed: !task.completed,
                      completedAt: task.completed ? null : new Date(),
                      status: task.completed ? 'today' : 'done',
                    })}
                    title={task.title}
                    className="mt-0.5"
                  />
                  <button type="button" onClick={() => openTask(task.id)} className="min-w-0 flex-1 text-left">
                    <p className={cn('truncate text-sm text-ink', task.completed && 'text-ink-muted line-through')}>
                      {task.title}
                    </p>
                    <p className="text-xs text-ink-subtle">{formatDueDate(task.dueDate, task.hasTime)}</p>
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
