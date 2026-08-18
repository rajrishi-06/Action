import { DEFAULT_PRIORITY, DEFAULT_STATUS, isValidPriority, isValidStatus } from './taskModel';
import { toDate } from './date';

/**
 * Translation between the database row shape (snake_case) and the shape the UI
 * works with (camelCase, real Date objects).
 *
 * Centralising this is what fixes the old "subtasks silently vanish" bug: the
 * previous `updateTask` hand-wrote a partial column map and simply omitted
 * `subtasks`, so every subtask lived in React state and never reached Postgres.
 */

/** Subtasks come back as jsonb; normalise defensively. */
function normaliseSubtasks(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === 'object' && typeof item.title === 'string')
    .map((item, index) => ({
      id: String(item.id ?? `sub-${index}`),
      title: item.title,
      completed: Boolean(item.completed),
    }));
}

/** Database row -> UI task. */
export function fromRow(row) {
  return {
    id: row.id,
    title: row.title ?? '',
    notes: row.notes ?? '',
    completed: Boolean(row.is_completed),
    status: isValidStatus(row.status) ? row.status : row.is_completed ? 'done' : DEFAULT_STATUS,
    priority: isValidPriority(row.priority) ? row.priority : DEFAULT_PRIORITY,
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
    completedAt: toDate(row.completed_at),
    dueDate: toDate(row.due_date),
    hasTime: Boolean(row.has_time),
    tags: Array.isArray(row.tags) ? row.tags : [],
    subtasks: normaliseSubtasks(row.subtasks),
    estimateMinutes: row.estimate_minutes ?? null,
    actualMinutes: row.actual_minutes ?? null,
    recurrence: row.recurrence ?? null,
    position: typeof row.position === 'number' ? row.position : 0,
  };
}

/** Map of UI field -> database column. The single source of truth for writes. */
const COLUMNS = {
  title: 'title',
  notes: 'notes',
  completed: 'is_completed',
  completedAt: 'completed_at',
  status: 'status',
  priority: 'priority',
  dueDate: 'due_date',
  hasTime: 'has_time',
  tags: 'tags',
  subtasks: 'subtasks',
  estimateMinutes: 'estimate_minutes',
  actualMinutes: 'actual_minutes',
  recurrence: 'recurrence',
  position: 'position',
};

const serialise = (key, value) => {
  if (value instanceof Date) return value.toISOString();
  if (key === 'subtasks') return Array.isArray(value) ? value : [];
  if (key === 'tags') return Array.isArray(value) ? value : [];
  return value;
};

/**
 * UI patch -> database patch. Unknown keys are dropped rather than sent, so a
 * client-only field can never break a write.
 */
export function toRow(patch) {
  const row = {};
  for (const [key, value] of Object.entries(patch)) {
    const column = COLUMNS[key];
    if (column) row[column] = serialise(key, value);
  }
  return row;
}

/** True when a patch contains nothing the database cares about. */
export function isEmptyRow(row) {
  return Object.keys(row).length === 0;
}

/** Build the insert payload for a brand-new task. */
export function toInsertRow(task, userId) {
  return {
    user_id: userId,
    title: task.title,
    notes: task.notes ?? '',
    is_completed: false,
    status: task.status ?? DEFAULT_STATUS,
    priority: task.priority ?? DEFAULT_PRIORITY,
    due_date: task.dueDate ? new Date(task.dueDate).toISOString() : null,
    has_time: Boolean(task.hasTime),
    tags: task.tags ?? [],
    subtasks: task.subtasks ?? [],
    estimate_minutes: task.estimateMinutes ?? null,
    recurrence: task.recurrence ?? null,
    position: task.position ?? Date.now(),
  };
}
