import { memo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlarmClock,
  CalendarDays,
  ChevronRight,
  Hash,
  ListChecks,
  Pencil,
  Repeat,
  Timer,
  Trash2,
} from 'lucide-react';
import { useTodo } from '../../context/TodoContext';
import { PRIORITY_META } from '../../lib/taskModel';
import { formatDueShort, formatDuration, isOverdue } from '../../lib/date';
import { cn } from '../../lib/cn';
import { TaskCheckbox } from './TaskCheckbox';
import { IconButton } from '../ui/Button';

/**
 * A single row in the task list.
 *
 * Memoised because the list re-renders on every keystroke in the search box,
 * and an un-memoised row means re-rendering every task in the list each time.
 */
export const TaskItem = memo(function TaskItem({
  task,
  onOpen,
  selectable = false,
  selected = false,
  onToggleSelected,
  dense = false,
  animate = true,
}) {
  const { toggleTask, deleteTask, updateTask } = useTodo();
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(task.title);
  const inputRef = useRef(null);

  const priority = PRIORITY_META[task.priority] ?? PRIORITY_META.medium;
  const overdue = isOverdue(task);
  const subtasks = task.subtasks ?? [];
  const doneSubtasks = subtasks.filter((subtask) => subtask.completed).length;

  const startEditing = () => {
    setDraftTitle(task.title);
    setEditing(true);
    // Focus after the input mounts.
    requestAnimationFrame(() => inputRef.current?.select());
  };

  const commitEdit = () => {
    const next = draftTitle.trim();
    setEditing(false);
    if (next && next !== task.title) updateTask(task.id, { title: next });
  };

  const handleRowKeyDown = (event) => {
    if (editing) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      onOpen?.(task);
    } else if (event.key === ' ') {
      event.preventDefault();
      toggleTask(task.id);
    } else if (event.key === 'e') {
      event.preventDefault();
      startEditing();
    }
  };

  // A long list drops the animation entirely: `content-visibility` then lets the
  // browser skip layout and paint for offscreen rows, which a motion component
  // with a layout animation cannot do.
  const Row = animate ? motion.div : 'div';
  const motionProps = animate
    ? {
        layout: 'position',
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, height: 0, marginBottom: 0, transition: { duration: 0.15 } },
        transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
      }
    : { style: { contentVisibility: 'auto', containIntrinsicSize: 'auto 76px' } };

  return (
    <Row
      {...motionProps}
      className={cn(
        'group relative flex items-start gap-3 rounded-xl border border-l-[3px] border-line bg-surface',
        'shadow-card transition-shadow hover:shadow-card-hover',
        dense ? 'px-3 py-2.5' : 'px-4 py-3.5',
        priority.accent,
        task.completed && 'opacity-60',
        selected && 'ring-2 ring-brand-500',
        task.pending && 'animate-pulse',
      )}
    >
      {selectable && (
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelected?.(task.id)}
          aria-label={`Select "${task.title}"`}
          className="mt-1 h-4 w-4 flex-shrink-0 cursor-pointer rounded border-line-strong accent-brand-600"
        />
      )}

      <TaskCheckbox
        checked={task.completed}
        onChange={() => toggleTask(task.id)}
        title={task.title}
        className="mt-0.5"
      />

      {/* The row body is a button so the whole card opens the task with either
          a click or the keyboard, without nesting interactive elements. */}
      <div
        role="button"
        tabIndex={0}
        // An explicit name keeps this row distinguishable from the action
        // buttons beside it, which also mention the task title.
        aria-label={task.title}
        onClick={() => !editing && onOpen?.(task)}
        onKeyDown={handleRowKeyDown}
        className="min-w-0 flex-1 cursor-pointer rounded-md text-left"
      >
        {editing ? (
          <input
            ref={inputRef}
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            onBlur={commitEdit}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                commitEdit();
              } else if (event.key === 'Escape') {
                event.preventDefault();
                setEditing(false);
              }
              event.stopPropagation();
            }}
            onClick={(event) => event.stopPropagation()}
            aria-label="Task title"
            className="w-full rounded-md border border-brand-500 bg-surface px-2 py-1 text-[15px] font-medium text-ink outline-none"
          />
        ) : (
          <p
            className={cn(
              'break-words text-[15px] font-medium leading-snug text-ink',
              task.completed && 'text-ink-muted line-through',
            )}
          >
            {task.title}
          </p>
        )}

        {task.notes && !dense && (
          <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{task.notes}</p>
        )}

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {task.dueDate && (
            <span
              className={cn(
                'inline-flex items-center gap-1',
                overdue ? 'font-medium text-rose-600 dark:text-rose-400' : 'text-ink-muted',
              )}
            >
              {overdue ? <AlarmClock className="h-3 w-3" /> : <CalendarDays className="h-3 w-3" />}
              {overdue ? `Overdue · ${formatDueShort(task.dueDate)}` : formatDueShort(task.dueDate)}
            </span>
          )}

          {task.priority !== 'medium' && (
            <span className="inline-flex items-center gap-1 text-ink-muted">
              <span className={cn('h-1.5 w-1.5 rounded-full', priority.dot)} aria-hidden="true" />
              {priority.label}
            </span>
          )}

          {subtasks.length > 0 && (
            <span
              className="inline-flex items-center gap-1 text-ink-muted"
              title={`${doneSubtasks} of ${subtasks.length} subtasks done`}
            >
              <ListChecks className="h-3 w-3" />
              {doneSubtasks}/{subtasks.length}
            </span>
          )}

          {task.estimateMinutes && (
            <span className="inline-flex items-center gap-1 text-ink-muted">
              <Timer className="h-3 w-3" />
              {formatDuration(task.estimateMinutes)}
            </span>
          )}

          {task.recurrence && (
            <span className="inline-flex items-center gap-1 text-ink-muted" title={`Repeats ${task.recurrence}`}>
              <Repeat className="h-3 w-3" />
              {task.recurrence}
            </span>
          )}

          {task.tags?.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-0.5 text-brand-600 dark:text-brand-400">
              <Hash className="h-3 w-3" />
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Actions stay in the DOM (rather than conditionally rendered) so they
          remain reachable by keyboard; only their opacity is animated. */}
      <div className="flex flex-shrink-0 items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <IconButton label={`Rename "${task.title}"`} size="sm" onClick={startEditing}>
          <Pencil className="h-4 w-4" />
        </IconButton>
        <IconButton
          label={`Delete "${task.title}"`}
          size="sm"
          variant="danger-ghost"
          onClick={() => deleteTask(task.id)}
        >
          <Trash2 className="h-4 w-4" />
        </IconButton>
        <IconButton label={`Open "${task.title}"`} size="sm" onClick={() => onOpen?.(task)}>
          <ChevronRight className="h-4 w-4" />
        </IconButton>
      </div>
    </Row>
  );
});
