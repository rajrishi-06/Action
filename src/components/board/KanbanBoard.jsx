import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AlarmClock, CalendarDays, GripVertical, ListChecks, Plus } from 'lucide-react';
import { useTodo } from '../../context/TodoContext';
import { STATUSES, STATUS_META, PRIORITY_META } from '../../lib/taskModel';
import { formatDueShort, isOverdue } from '../../lib/date';
import { cn } from '../../lib/cn';
import { positionBetween, renormalise } from '../../lib/ordering';
import { TaskCheckbox } from '../tasks/TaskCheckbox';
import { Button } from '../ui/Button';

/**
 * Kanban board.
 *
 * The previous implementation rendered columns but its `handleDragEnd` was an
 * empty function with a comment admitting nothing was persisted — dragging a
 * card did literally nothing. Columns are now real droppables backed by a
 * `status` column in the database, so a move survives a reload, and the drag
 * handle is separated from the card body so clicking a checkbox no longer
 * starts a drag.
 */

function BoardCard({ task, onOpen, dragging = false, overlay = false }) {
  const { toggleTask } = useTodo();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: overlay,
  });

  const priority = PRIORITY_META[task.priority] ?? PRIORITY_META.medium;
  const overdue = isOverdue(task);
  const subtasks = task.subtasks ?? [];
  const doneSubtasks = subtasks.filter((subtask) => subtask.completed).length;

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      style={overlay ? undefined : { transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        'group flex items-start gap-2 rounded-xl border border-l-[3px] border-line bg-surface p-3 shadow-card',
        priority.accent,
        (isDragging || dragging) && 'opacity-40',
        overlay && 'rotate-2 opacity-100 shadow-pop',
      )}
    >
      {/* Only this handle initiates a drag, so the checkbox and title stay clickable. */}
      <button
        type="button"
        {...(overlay ? {} : { ...attributes, ...listeners })}
        aria-label={`Reorder "${task.title}"`}
        className="mt-0.5 cursor-grab touch-none rounded p-0.5 text-ink-subtle opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <TaskCheckbox
        size="sm"
        checked={task.completed}
        onChange={() => toggleTask(task.id)}
        title={task.title}
        className="mt-1"
      />

      <button
        type="button"
        onClick={() => onOpen?.(task)}
        className="min-w-0 flex-1 text-left"
      >
        <p className={cn('break-words text-sm font-medium leading-snug text-ink', task.completed && 'text-ink-muted line-through')}>
          {task.title}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-ink-muted">
          {task.dueDate && (
            <span className={cn('inline-flex items-center gap-1', overdue && 'font-medium text-rose-600 dark:text-rose-400')}>
              {overdue ? <AlarmClock className="h-3 w-3" /> : <CalendarDays className="h-3 w-3" />}
              {formatDueShort(task.dueDate)}
            </span>
          )}
          {subtasks.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <ListChecks className="h-3 w-3" />
              {doneSubtasks}/{subtasks.length}
            </span>
          )}
          {task.tags?.slice(0, 2).map((tag) => (
            <span key={tag} className="text-brand-600 dark:text-brand-400">#{tag}</span>
          ))}
        </div>
      </button>
    </div>
  );
}

function BoardColumn({ status, tasks, onOpen, onQuickAdd }) {
  const meta = STATUS_META[status];
  const { setNodeRef, isOver } = useDroppable({ id: `column:${status}` });

  return (
    <section
      className="flex w-[min(85vw,20rem)] flex-shrink-0 flex-col rounded-2xl bg-surface-sunken/70 sm:w-80"
      aria-label={`${meta.label} column, ${tasks.length} tasks`}
    >
      <header className="flex items-center justify-between gap-2 px-3 pb-2 pt-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <span className={cn('h-2 w-2 rounded-full', meta.accent)} aria-hidden="true" />
          {meta.label}
          <span className="rounded-full bg-surface px-1.5 py-0.5 text-xs font-normal text-ink-muted">
            {tasks.length}
          </span>
        </h3>
        <Button size="xs" variant="ghost" onClick={() => onQuickAdd(status)} aria-label={`Add a task to ${meta.label}`}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </header>

      <div
        ref={setNodeRef}
        className={cn(
          'min-h-[8rem] flex-1 space-y-2 overflow-y-auto rounded-xl p-2 transition-colors scrollbar-thin',
          isOver && 'bg-brand-50/70 ring-2 ring-inset ring-brand-300 dark:bg-brand-950/30 dark:ring-brand-800',
        )}
      >
        <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <BoardCard key={task.id} task={task} onOpen={onOpen} />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-ink-subtle">{meta.hint}</p>
        )}
      </div>
    </section>
  );
}

export function KanbanBoard({ onOpenTask, onQuickAdd }) {
  const { visibleTasks, updateTask, reorderTasks } = useTodo();
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    // A small distance threshold means a click on a card is never mistaken
    // for a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const columns = useMemo(() => {
    const grouped = Object.fromEntries(STATUSES.map((status) => [status, []]));
    for (const task of visibleTasks) {
      const status = task.completed ? 'done' : (grouped[task.status] ? task.status : 'backlog');
      grouped[status].push(task);
    }
    for (const status of STATUSES) {
      grouped[status].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    }
    return grouped;
  }, [visibleTasks]);

  const findColumn = (id) => {
    if (typeof id === 'string' && id.startsWith('column:')) return id.slice('column:'.length);
    return STATUSES.find((status) => columns[status].some((task) => task.id === id)) ?? null;
  };

  const activeTask = activeId ? visibleTasks.find((task) => task.id === activeId) : null;

  const handleDragEnd = ({ active, over }) => {
    setActiveId(null);
    if (!over) return;

    const from = findColumn(active.id);
    const to = findColumn(over.id);
    if (!from || !to) return;

    if (from === to) {
      const items = columns[from];
      const oldIndex = items.findIndex((task) => task.id === active.id);
      const newIndex = items.findIndex((task) => task.id === over.id);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

      const reordered = arrayMove(items, oldIndex, newIndex);
      const { position, needsRenormalise } = positionBetween(reordered, newIndex);

      // Repeated drops into the same gap eventually exhaust float precision.
      // When that point is reached, rewrite the column onto clean spacing
      // instead of persisting a position that cannot be told apart from its
      // neighbour's.
      if (needsRenormalise) {
        reorderTasks(renormalise(reordered));
        return;
      }

      updateTask(active.id, { position }, { silent: true });
      return;
    }

    // Moving between columns changes the task's status, and the Done column
    // is the same thing as being completed.
    const completed = to === 'done';
    const target = columns[to];
    const overIndex = target.findIndex((task) => task.id === over.id);
    const insertAt = overIndex === -1 ? target.length : overIndex;
    const moved = visibleTasks.find((task) => task.id === active.id);
    const withTask = [...target.slice(0, insertAt), moved, ...target.slice(insertAt)];
    const { position, needsRenormalise } = positionBetween(withTask, insertAt);

    updateTask(active.id, {
      status: to,
      position,
      completed,
      completedAt: completed ? new Date() : null,
    });

    if (needsRenormalise) {
      reorderTasks(renormalise(withTask.map((task) => (task.id === active.id ? { ...task, position } : task))));
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={({ active }) => setActiveId(active.id)}
      onDragCancel={() => setActiveId(null)}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
        {STATUSES.map((status) => (
          <BoardColumn
            key={status}
            status={status}
            tasks={columns[status]}
            onOpen={onOpenTask}
            onQuickAdd={onQuickAdd}
          />
        ))}
      </div>

      {/* Follows the cursor while dragging so the card never disappears. */}
      <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }}>
        {activeTask ? <BoardCard task={activeTask} overlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}
