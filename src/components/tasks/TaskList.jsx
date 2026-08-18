import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Inbox, SearchX, Trash2, X } from 'lucide-react';
import { useTodo } from '../../context/TodoContext';
import { PRIORITIES, PRIORITY_META } from '../../lib/taskModel';
import { TaskItem } from './TaskItem';
import { Button } from '../ui/Button';
import { EmptyState, Skeleton } from '../ui/primitives';

/**
 * Beyond this many visible rows, drop the layout animation. Measured concern
 * rather than a guess at the exact cliff — see issue #9.
 */
const ANIMATION_LIMIT = 150;

function TaskListSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      {[0, 1, 2, 3].map((index) => (
        <div key={index} className="flex items-start gap-3 rounded-xl border border-line bg-surface px-4 py-3.5">
          <Skeleton className="h-5 w-5 flex-shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4" style={{ width: `${70 - index * 8}%` }} />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Sticky bar shown while tasks are selected. */
function BulkActionBar({ count, onClear, onDelete, onComplete, onPrioritise }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      className="sticky bottom-4 z-20 mx-auto flex w-fit max-w-full flex-wrap items-center gap-2 rounded-xl border border-line bg-surface-raised px-3 py-2 shadow-pop"
    >
      <span className="px-1 text-sm font-medium text-ink">{count} selected</span>
      <div className="h-4 w-px bg-line" aria-hidden="true" />
      <Button size="xs" variant="ghost" onClick={onComplete}>
        <CheckCircle2 className="h-3.5 w-3.5" />
        Complete
      </Button>
      <select
        onChange={(event) => {
          if (event.target.value) onPrioritise(event.target.value);
          event.target.value = '';
        }}
        aria-label="Set priority for selected tasks"
        defaultValue=""
        className="h-7 rounded-md border border-line bg-surface px-2 text-xs text-ink"
      >
        <option value="">Set priority…</option>
        {PRIORITIES.map((priority) => (
          <option key={priority} value={priority}>
            {PRIORITY_META[priority].label}
          </option>
        ))}
      </select>
      <Button size="xs" variant="danger-ghost" onClick={onDelete}>
        <Trash2 className="h-3.5 w-3.5" />
        Delete
      </Button>
      <Button size="xs" variant="ghost" onClick={onClear}>
        <X className="h-3.5 w-3.5" />
      </Button>
    </motion.div>
  );
}

/**
 * The list view. Handles loading, empty and error states explicitly rather
 * than rendering an ambiguous blank area.
 */
export function TaskList({ onOpenTask, selectable = false }) {
  const {
    visibleTasks, isLoading, error, hasActiveFilters, resetFilters, filters,
    selectedIds, toggleSelected, clearSelection, deleteMany, updateMany, refresh,
  } = useTodo();

  if (isLoading) return <TaskListSkeleton />;

  if (error) {
    return (
      <EmptyState
        icon={<SearchX className="h-6 w-6" />}
        title="Could not load your tasks"
        description={error}
        action={<Button variant="primary" onClick={refresh}>Try again</Button>}
      />
    );
  }

  if (visibleTasks.length === 0) {
    return hasActiveFilters ? (
      <EmptyState
        icon={<SearchX className="h-6 w-6" />}
        title="No tasks match those filters"
        description={
          filters.search
            ? `Nothing found for “${filters.search}”.`
            : 'Try widening the filters to see more.'
        }
        action={<Button variant="secondary" onClick={resetFilters}>Clear filters</Button>}
      />
    ) : (
      <EmptyState
        icon={<Inbox className="h-6 w-6" />}
        title={filters.scope === 'completed' ? 'Nothing completed yet' : 'Nothing here'}
        description={
          filters.scope === 'today'
            ? 'Nothing is due today. A good moment to pull something forward.'
            : 'Capture the next thing on your mind using the box above.'
        }
      />
    );
  }

  const selectedList = [...selectedIds];

  // Layout animation is the expensive part of a long list, and its value is
  // lowest exactly when the list is long enough that you are scrolling rather
  // than watching rows settle. Above this many rows, render them plainly and
  // let the browser skip offscreen work.
  const animate = visibleTasks.length <= ANIMATION_LIMIT;

  const rows = visibleTasks.map((task) => (
    <TaskItem
      key={task.id}
      task={task}
      onOpen={onOpenTask}
      selectable={selectable}
      selected={selectedIds.has(task.id)}
      onToggleSelected={toggleSelected}
      animate={animate}
    />
  ));

  return (
    <section aria-label="Task list" className="space-y-3">
      {animate ? (
        <AnimatePresence initial={false} mode="popLayout">
          {rows}
        </AnimatePresence>
      ) : (
        rows
      )}

      <AnimatePresence>
        {selectedList.length > 0 && (
          <BulkActionBar
            count={selectedList.length}
            onClear={clearSelection}
            onDelete={() => deleteMany(selectedList)}
            onComplete={() => {
              updateMany(selectedList, { completed: true, completedAt: new Date(), status: 'done' });
              clearSelection();
            }}
            onPrioritise={(priority) => {
              updateMany(selectedList, { priority });
              clearSelection();
            }}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
