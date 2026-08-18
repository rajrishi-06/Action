import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { initialTaskState, taskReducer } from '../lib/taskReducer';
import { fromRow, isEmptyRow, toInsertRow, toRow } from '../lib/taskMapper';
import { parseTaskInput, nextOccurrence, rollForward } from '../lib/taskParser';
import { smartScore } from '../lib/analytics';
import { isOverdue, toDate } from '../lib/date';
import { DEFAULT_PRIORITY, DEFAULT_STATUS, priorityWeight } from '../lib/taskModel';
import { drain, enqueue, isOnline, count as outboxCount } from '../lib/outbox';

/**
 * A failure the connection caused, rather than one the server chose.
 *
 * Only the former is worth queueing: a rejected write will be rejected again,
 * and retrying it forever would block everything behind it.
 */
function isNetworkError(error) {
  if (!isOnline()) return true;
  if (!error) return false;
  // PostgREST errors carry a code; a fetch that never reached it does not.
  if (error.code && error.code !== '') return false;
  return /fetch|network|connection|timeout/i.test(error.message ?? '');
}

/** Stable id for a task created before the server has seen it. */
const newTaskId = () =>
  (globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);

const TodoContext = createContext(null);

export const SORT_OPTIONS = [
  { id: 'smart', label: 'Smart' },
  { id: 'due', label: 'Due date' },
  { id: 'priority', label: 'Priority' },
  { id: 'created', label: 'Recently added' },
  { id: 'alphabetical', label: 'A–Z' },
  { id: 'manual', label: 'Manual order' },
];

export const SCOPES = [
  { id: 'today', label: 'Today' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'all', label: 'All tasks' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'completed', label: 'Completed' },
];

/**
 * How much completed history to load. Must be >= the longest window charted in
 * src/lib/analytics.js (currently the 182-day heatmap), or Insights would show
 * a truncated picture without saying so.
 */
const HISTORY_DAYS = 182;

/** A hard ceiling so one pathological account cannot stall the app. */
const MAX_TASKS = 5000;

const DEFAULT_FILTERS = {
  scope: 'all',
  search: '',
  priorities: [],
  tags: [],
  sort: 'smart',
  showCompleted: false,
};

/** Comparators for each sort mode. */
const COMPARATORS = {
  smart: (a, b) => smartScore(b) - smartScore(a),
  due: (a, b) => {
    const aDate = toDate(a.dueDate);
    const bDate = toDate(b.dueDate);
    // Undated tasks sink to the bottom rather than sorting as epoch zero.
    if (!aDate && !bDate) return 0;
    if (!aDate) return 1;
    if (!bDate) return -1;
    return aDate - bDate;
  },
  priority: (a, b) => priorityWeight(b.priority) - priorityWeight(a.priority),
  created: (a, b) => (toDate(b.createdAt) ?? 0) - (toDate(a.createdAt) ?? 0),
  alphabetical: (a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }),
  manual: (a, b) => (a.position ?? 0) - (b.position ?? 0),
};

function matchesScope(task, scope, now) {
  switch (scope) {
    case 'today': {
      const due = toDate(task.dueDate);
      return (
        !task.completed &&
        ((due && due <= new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)) ||
          task.status === 'today' ||
          task.status === 'doing')
      );
    }
    case 'upcoming': {
      const due = toDate(task.dueDate);
      return Boolean(!task.completed && due && due > now);
    }
    case 'overdue':
      return isOverdue(task);
    case 'completed':
      return task.completed;
    case 'all':
    default:
      return true;
  }
}

export function TodoProvider({ children }) {
  const { userId, isAuthenticated, isLoading: authLoading } = useAuth();
  const toast = useToast();

  const [state, dispatch] = useReducer(taskReducer, initialTaskState);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [queuedWrites, setQueuedWrites] = useState(0);

  // Guards against a slow response from a previous user overwriting the
  // current user's data after a fast account switch.
  const requestId = useRef(0);

  const fetchTasks = useCallback(async () => {
    if (!supabase || !userId) {
      dispatch({ type: 'reset' });
      return;
    }

    const currentRequest = ++requestId.current;
    dispatch({ type: 'load:start' });

    // Open tasks are always loaded in full. Completed ones are bounded to the
    // window Insights actually charts, because the archive only ever grows and
    // nothing reads the older rows. `HISTORY_DAYS` must stay >= the longest
    // range used in src/lib/analytics.js or the charts would quietly truncate.
    const historyCutoff = new Date();
    historyCutoff.setDate(historyCutoff.getDate() - HISTORY_DAYS);

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .or(`is_completed.eq.false,completed_at.gte.${historyCutoff.toISOString()}`)
      .order('created_at', { ascending: false })
      .limit(MAX_TASKS);

    if (currentRequest !== requestId.current) return;

    if (error) {
      dispatch({ type: 'load:error', error: error.message });
      toast.error('Could not load your tasks', { description: error.message });
      return;
    }

    const tasks = data.map(fromRow);
    dispatch({ type: 'load:success', tasks });

    // A repeating task that was never completed used to sit overdue forever,
    // because recurrence was only generated on completion. Catch those up now.
    const stale = tasks
      .filter((task) => !task.completed && task.recurrence && task.dueDate)
      .map((task) => ({ task, next: rollForward(task.dueDate, task.recurrence) }))
      .filter((entry) => entry.next);

    if (stale.length > 0) {
      dispatch({
        type: 'update:many',
        updates: stale.map(({ task, next }) => ({ id: task.id, patch: { dueDate: next } })),
      });

      // Fire and forget: the list already reads correctly, and a failure here
      // just means the catch-up runs again on the next load.
      await Promise.all(
        stale.map(({ task, next }) =>
          supabase.from('tasks').update({ due_date: next.toISOString() }).eq('id', task.id),
        ),
      );
    }
  }, [userId, toast]);

  // Refetch whenever the signed-in user changes — including the sign-in itself.
  useEffect(() => {
    if (authLoading) return;
    fetchTasks();
  }, [authLoading, fetchTasks]);

  // Keep other tabs and devices in sync.
  useEffect(() => {
    if (!supabase || !userId) return undefined;

    const channel = supabase
      .channel(`tasks:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            dispatch({ type: 'remove', id: payload.old.id });
          } else {
            dispatch({ type: 'upsert:remote', task: fromRow(payload.new) });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  /**
   * Replay queued writes, oldest first.
   *
   * Ordering matters: creating a task and then completing it must not replay
   * the other way round, so `drain` stops at the first entry that still cannot
   * be sent rather than skipping past it.
   */
  const flushOutbox = useCallback(async () => {
    if (!supabase || !userId || !isOnline()) return;

    const { sent, dropped, remaining } = await drain(userId, async (entry) => {
      let error;

      if (entry.kind === 'insert') {
        ({ error } = await supabase.from('tasks').upsert(entry.payload, { onConflict: 'id' }));
      } else if (entry.kind === 'update') {
        ({ error } = await supabase.from('tasks').update(entry.payload).eq('id', entry.id));
      } else if (entry.kind === 'delete') {
        ({ error } = await supabase.from('tasks').delete().eq('id', entry.id));
      } else {
        // Unknown kind from an older version: drop rather than block the queue.
        return { ok: false, retriable: false };
      }

      if (!error) return { ok: true };
      return { ok: false, retriable: isNetworkError(error) };
    });

    setQueuedWrites(remaining);

    if (sent > 0) {
      toast.success(`Synced ${sent} change${sent === 1 ? '' : 's'}`);
      // Re-read so the local copy matches what the server actually stored.
      fetchTasks();
    }
    if (dropped > 0) {
      toast.error(`${dropped} change${dropped === 1 ? '' : 's'} could not be saved`, {
        description: 'They were rejected by the server and have been discarded.',
      });
    }
  }, [userId, toast, fetchTasks]);

  // Flush on reconnect, and once on load in case the last session ended offline.
  useEffect(() => {
    if (!userId) return undefined;

    const sync = async () => {
      if (isOnline()) {
        await flushOutbox();
      } else {
        // Still offline: at least show how much is waiting.
        setQueuedWrites(await outboxCount(userId).catch(() => 0));
      }
    };

    sync();
    window.addEventListener('online', sync);
    return () => window.removeEventListener('online', sync);
  }, [userId, flushOutbox]);

  /* ----------------------------- mutations ----------------------------- */

  const addTask = useCallback(
    async (input, overrides = {}) => {
      if (!userId) return null;

      const parsed = typeof input === 'string' ? parseTaskInput(input) : input;
      const draft = {
        title: parsed.title?.trim(),
        notes: parsed.notes ?? '',
        priority: parsed.priority ?? DEFAULT_PRIORITY,
        status: parsed.status ?? DEFAULT_STATUS,
        dueDate: parsed.dueDate ?? null,
        hasTime: parsed.hasTime ?? false,
        tags: parsed.tags ?? [],
        subtasks: parsed.subtasks ?? [],
        estimateMinutes: parsed.estimateMinutes ?? null,
        recurrence: parsed.recurrence ?? null,
        ...overrides,
      };

      if (!draft.title) return null;

      // The id is generated here rather than by Postgres so the task has a
      // stable identity even if it is created offline and only reaches the
      // server later.
      const id = newTaskId();
      const row = toInsertRow({ ...draft, id }, userId);
      const optimistic = {
        ...draft,
        id,
        completed: false,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        actualMinutes: null,
        position: row.position,
        pending: true,
      };

      dispatch({ type: 'add', task: optimistic });

      const { data, error } = await supabase.from('tasks').insert(row).select().single();

      if (error) {
        if (isNetworkError(error)) {
          // Keep it on screen and send it when the connection returns.
          await enqueue({ kind: 'insert', payload: row, id, userId });
          setQueuedWrites((current) => current + 1);
          return optimistic;
        }
        dispatch({ type: 'remove', id });
        toast.error('Could not save that task', { description: error.message });
        return null;
      }

      const saved = fromRow(data);
      dispatch({ type: 'replace', id, task: saved });
      return saved;
    },
    [userId, toast],
  );

  const updateTask = useCallback(
    async (id, patch, { silent = false } = {}) => {
      const previous = state.items.find((task) => task.id === id);
      if (!previous) return;

      const row = toRow(patch);
      if (isEmptyRow(row)) return;

      dispatch({ type: 'update', id, patch });

      // Optimistic concurrency: only write if the row still carries the
      // `updated_at` we last saw. Without this the last writer silently wins and
      // a change made on another device disappears with no signal.
      let query = supabase.from('tasks').update(row).eq('id', id);
      if (previous.updatedAt) {
        query = query.eq('updated_at', previous.updatedAt.toISOString());
      }

      const { data, error } = await query.select().maybeSingle();

      const rollback = () => {
        const fields = Object.fromEntries(Object.keys(patch).map((key) => [key, previous[key]]));
        dispatch({ type: 'update', id, patch: fields });
      };

      if (error) {
        if (isNetworkError(error)) {
          // Hold the optimistic state and replay the write when reconnected.
          await enqueue({ kind: 'update', id, payload: row, userId });
          setQueuedWrites((current) => current + 1);
          return;
        }
        rollback();
        if (!silent) toast.error('Could not save that change', { description: error.message });
        return;
      }

      if (!data) {
        // The precondition matched nothing: either the row is gone, or someone
        // else changed it first. Re-read it and let the user decide.
        const { data: current } = await supabase.from('tasks').select('*').eq('id', id).maybeSingle();

        if (!current) {
          dispatch({ type: 'remove', id });
          if (!silent) toast.error('That task no longer exists', { description: 'It was deleted somewhere else.' });
          return;
        }

        rollback();
        dispatch({ type: 'replace', id, task: fromRow(current) });

        if (!silent) {
          toast.toast({
            title: 'That task changed somewhere else',
            description: 'Your edit was not applied, so the newer version is not lost.',
            variant: 'error',
            duration: 12_000,
            action: {
              label: 'Apply mine',
              // A deliberate, explicit overwrite — the user has now been shown
              // that someone else got there first. Written without the
              // precondition, so it is unconditional by design.
              onClick: async () => {
                dispatch({ type: 'update', id, patch });
                const { data: forced, error: forceError } = await supabase
                  .from('tasks')
                  .update(row)
                  .eq('id', id)
                  .select()
                  .maybeSingle();

                if (forceError || !forced) {
                  rollback();
                  toast.error('Could not apply your version');
                  return;
                }
                dispatch({ type: 'replace', id, task: fromRow(forced) });
              },
            },
          });
        }
        return;
      }

      // Keep the local `updated_at` in step, or the next write would fail its
      // own precondition.
      dispatch({ type: 'replace', id, task: fromRow(data) });
    },
    [state.items, toast, userId],
  );

  /** Completing a recurring task schedules the next occurrence. */
  const rollRecurrence = useCallback(
    async (task) => {
      const next = nextOccurrence(task.dueDate ?? new Date(), task.recurrence);
      if (!next) return;

      await addTask({
        title: task.title,
        notes: task.notes,
        priority: task.priority,
        status: DEFAULT_STATUS,
        dueDate: next,
        hasTime: task.hasTime,
        tags: task.tags,
        estimateMinutes: task.estimateMinutes,
        recurrence: task.recurrence,
        // Reset the checklist so the repeat starts fresh.
        subtasks: (task.subtasks ?? []).map((subtask) => ({ ...subtask, completed: false })),
      });
    },
    [addTask],
  );

  const toggleTask = useCallback(
    async (id) => {
      const task = state.items.find((item) => item.id === id);
      if (!task) return;

      const completed = !task.completed;
      const patch = {
        completed,
        completedAt: completed ? new Date() : null,
        status: completed ? 'done' : task.status === 'done' ? DEFAULT_STATUS : task.status,
      };

      await updateTask(id, patch);

      if (completed && task.recurrence) await rollRecurrence(task);
    },
    [state.items, updateTask, rollRecurrence],
  );

  const deleteTask = useCallback(
    async (id) => {
      const index = state.items.findIndex((task) => task.id === id);
      if (index === -1) return;
      const task = state.items[index];

      dispatch({ type: 'remove', id });

      const { error } = await supabase.from('tasks').delete().eq('id', id);

      if (error) {
        if (isNetworkError(error)) {
          await enqueue({ kind: 'delete', id, userId });
          setQueuedWrites((current) => current + 1);
          return;
        }
        dispatch({ type: 'restore', task, index });
        toast.error('Could not delete that task', { description: error.message });
        return;
      }

      toast.toast({
        title: 'Task deleted',
        description: task.title,
        action: {
          label: 'Undo',
          // Re-insert rather than resurrect: the row is genuinely gone, so a
          // new one is created carrying the same content.
          onClick: async () => {
            dispatch({ type: 'restore', task: { ...task, pending: true }, index });
            const { data, error: restoreError } = await supabase
              .from('tasks')
              .insert(toInsertRow(task, userId))
              .select()
              .single();

            if (restoreError) {
              dispatch({ type: 'remove', id: task.id });
              toast.error('Could not restore that task');
              return;
            }
            dispatch({ type: 'replace', id: task.id, task: fromRow(data) });
          },
        },
      });
    },
    [state.items, userId, toast],
  );

  const deleteMany = useCallback(
    async (ids) => {
      const entries = ids
        .map((id) => ({ id, index: state.items.findIndex((task) => task.id === id) }))
        .filter((entry) => entry.index !== -1)
        .map((entry) => ({ ...entry, task: state.items[entry.index] }));

      if (entries.length === 0) return;

      dispatch({ type: 'remove:many', ids });
      setSelectedIds(new Set());

      const { error } = await supabase.from('tasks').delete().in('id', ids);

      if (error) {
        dispatch({ type: 'restore:many', entries });
        toast.error('Could not delete those tasks', { description: error.message });
        return;
      }

      toast.toast({
        title: `${entries.length} tasks deleted`,
        action: {
          label: 'Undo',
          onClick: async () => {
            dispatch({ type: 'restore:many', entries });
            const { data, error: restoreError } = await supabase
              .from('tasks')
              .insert(entries.map((entry) => toInsertRow(entry.task, userId)))
              .select();

            if (restoreError) {
              dispatch({ type: 'remove:many', ids });
              toast.error('Could not restore those tasks');
              return;
            }
            data.forEach((row, index) =>
              dispatch({ type: 'replace', id: entries[index].task.id, task: fromRow(row) }),
            );
          },
        },
      });
    },
    [state.items, userId, toast],
  );

  const updateMany = useCallback(
    async (ids, patch) => {
      const row = toRow(patch);
      if (isEmptyRow(row) || ids.length === 0) return;

      const previous = state.items.filter((task) => ids.includes(task.id));
      dispatch({ type: 'update:many', updates: ids.map((id) => ({ id, patch })) });

      const { error } = await supabase.from('tasks').update(row).in('id', ids);

      if (error) {
        dispatch({
          type: 'update:many',
          updates: previous.map((task) => ({
            id: task.id,
            patch: Object.fromEntries(Object.keys(patch).map((key) => [key, task[key]])),
          })),
        });
        toast.error('Could not update those tasks', { description: error.message });
      }
    },
    [state.items, toast],
  );

  /**
   * Write a different position to each of several tasks in one round trip.
   *
   * `updateMany` applies a single shared patch, which cannot express "each row
   * gets its own value", so board renormalisation needs its own path.
   */
  const reorderTasks = useCallback(
    async (entries) => {
      if (!userId || entries.length === 0) return;

      const previous = state.items.filter((task) => entries.some((entry) => entry.id === task.id));
      dispatch({
        type: 'update:many',
        updates: entries.map(({ id, position }) => ({ id, patch: { position } })),
      });

      // Upsert rather than N updates: one request, and the rows already exist so
      // nothing is created. user_id is included because RLS checks it on insert.
      const { error } = await supabase.from('tasks').upsert(
        entries.map(({ id, position }) => {
          const task = state.items.find((item) => item.id === id);
          return { ...toInsertRow(task, userId), id, position };
        }),
        { onConflict: 'id' },
      );

      if (error) {
        dispatch({
          type: 'update:many',
          updates: previous.map((task) => ({ id: task.id, patch: { position: task.position } })),
        });
        toast.error('Could not save the new order', { description: error.message });
      }
    },
    [state.items, userId, toast],
  );

  /* --------------------------- subtask helpers -------------------------- */

  const addSubtask = useCallback(
    (taskId, title) => {
      const task = state.items.find((item) => item.id === taskId);
      if (!task || !title.trim()) return;
      const subtasks = [
        ...(task.subtasks ?? []),
        { id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, title: title.trim(), completed: false },
      ];
      updateTask(taskId, { subtasks });
    },
    [state.items, updateTask],
  );

  const toggleSubtask = useCallback(
    (taskId, subtaskId) => {
      const task = state.items.find((item) => item.id === taskId);
      if (!task) return;
      const subtasks = (task.subtasks ?? []).map((subtask) =>
        subtask.id === subtaskId ? { ...subtask, completed: !subtask.completed } : subtask,
      );
      updateTask(taskId, { subtasks });
    },
    [state.items, updateTask],
  );

  const removeSubtask = useCallback(
    (taskId, subtaskId) => {
      const task = state.items.find((item) => item.id === taskId);
      if (!task) return;
      updateTask(taskId, { subtasks: (task.subtasks ?? []).filter((s) => s.id !== subtaskId) });
    },
    [state.items, updateTask],
  );

  /* ----------------------------- selection ------------------------------ */

  const toggleSelected = useCallback((id) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  /* ------------------------------ derived ------------------------------- */

  const allTags = useMemo(() => {
    const counts = new Map();
    for (const task of state.items) {
      for (const tag of task.tags ?? []) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  }, [state.items]);

  const visibleTasks = useMemo(() => {
    const now = new Date();
    const query = filters.search.trim().toLowerCase();

    const filtered = state.items.filter((task) => {
      if (!matchesScope(task, filters.scope, now)) return false;
      if (filters.scope !== 'completed' && task.completed && !filters.showCompleted) return false;
      if (filters.priorities.length && !filters.priorities.includes(task.priority)) return false;
      if (filters.tags.length && !filters.tags.every((tag) => task.tags?.includes(tag))) return false;

      if (query) {
        const haystack = [task.title, task.notes, ...(task.tags ?? [])].join(' ').toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      return true;
    });

    const comparator = COMPARATORS[filters.sort] ?? COMPARATORS.smart;
    // Completed tasks always sink, whatever the sort mode.
    return filtered.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return comparator(a, b);
    });
  }, [state.items, filters]);

  const counts = useMemo(() => {
    const now = new Date();
    return {
      all: state.items.filter((task) => !task.completed).length,
      today: state.items.filter((task) => !task.completed && matchesScope(task, 'today', now)).length,
      upcoming: state.items.filter((task) => matchesScope(task, 'upcoming', now)).length,
      overdue: state.items.filter((task) => isOverdue(task)).length,
      completed: state.items.filter((task) => task.completed).length,
    };
  }, [state.items]);

  const setFilter = useCallback((patch) => {
    setFilters((current) => ({ ...current, ...patch }));
  }, []);

  const resetFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  const hasActiveFilters =
    filters.search.trim() !== '' ||
    filters.priorities.length > 0 ||
    filters.tags.length > 0 ||
    filters.showCompleted;

  const value = useMemo(
    () => ({
      tasks: state.items,
      visibleTasks,
      counts,
      allTags,
      isLoading: state.status === 'loading' || authLoading,
      isReady: state.status === 'ready',
      error: state.error,
      isAuthenticated,
      filters,
      setFilter,
      resetFilters,
      hasActiveFilters,
      selectedIds,
      toggleSelected,
      clearSelection,
      addTask,
      updateTask,
      updateMany,
      reorderTasks,
      toggleTask,
      deleteTask,
      deleteMany,
      addSubtask,
      toggleSubtask,
      removeSubtask,
      refresh: fetchTasks,
      queuedWrites,
      flushOutbox,
    }),
    [
      state.items, state.status, state.error, visibleTasks, counts, allTags, authLoading,
      isAuthenticated, filters, setFilter, resetFilters, hasActiveFilters, selectedIds,
      toggleSelected, clearSelection, addTask, updateTask, updateMany, reorderTasks,
      toggleTask, deleteTask, deleteMany, addSubtask, toggleSubtask, removeSubtask, fetchTasks,
      queuedWrites, flushOutbox,
    ],
  );

  return <TodoContext.Provider value={value}>{children}</TodoContext.Provider>;
}

export function useTodo() {
  const context = useContext(TodoContext);
  if (!context) throw new Error('useTodo must be used inside a TodoProvider');
  return context;
}
