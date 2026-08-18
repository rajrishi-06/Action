/**
 * Pure reducer for the task collection.
 *
 * Keeping the transitions here (rather than inline in the provider) means the
 * optimistic-update and rollback logic can be unit tested without React,
 * Supabase or a network.
 */

export const initialTaskState = {
  items: [],
  status: 'idle', // idle | loading | ready | error
  error: null,
};

const replace = (items, id, patch) =>
  items.map((task) => (task.id === id ? { ...task, ...patch } : task));

export function taskReducer(state, action) {
  switch (action.type) {
    case 'load:start':
      return { ...state, status: 'loading', error: null };

    case 'load:success':
      return { items: action.tasks, status: 'ready', error: null };

    case 'load:error':
      return { ...state, status: 'error', error: action.error };

    case 'reset':
      return { ...initialTaskState, status: 'ready' };

    case 'add':
      return { ...state, items: [action.task, ...state.items] };

    case 'add:many':
      return { ...state, items: [...action.tasks, ...state.items] };

    case 'update':
      return { ...state, items: replace(state.items, action.id, action.patch) };

    case 'update:many': {
      const patches = new Map(action.updates.map((update) => [update.id, update.patch]));
      return {
        ...state,
        items: state.items.map((task) =>
          patches.has(task.id) ? { ...task, ...patches.get(task.id) } : task,
        ),
      };
    }

    case 'replace':
      // Swap an optimistic placeholder for the row the server actually stored.
      return { ...state, items: replace(state.items, action.id, action.task) };

    case 'remove':
      return { ...state, items: state.items.filter((task) => task.id !== action.id) };

    case 'remove:many': {
      const ids = new Set(action.ids);
      return { ...state, items: state.items.filter((task) => !ids.has(task.id)) };
    }

    case 'restore': {
      // Put a deleted task back where it was, so undo does not reshuffle the list.
      const items = [...state.items];
      const index = Math.min(Math.max(action.index ?? items.length, 0), items.length);
      items.splice(index, 0, action.task);
      return { ...state, items };
    }

    case 'restore:many': {
      const items = [...state.items];
      // Ascending index order keeps each subsequent splice position valid.
      for (const entry of [...action.entries].sort((a, b) => a.index - b.index)) {
        const index = Math.min(Math.max(entry.index ?? items.length, 0), items.length);
        items.splice(index, 0, entry.task);
      }
      return { ...state, items };
    }

    case 'upsert:remote': {
      // A change that arrived over the realtime channel from another device.
      const exists = state.items.some((task) => task.id === action.task.id);
      return exists
        ? { ...state, items: replace(state.items, action.task.id, action.task) }
        : { ...state, items: [action.task, ...state.items] };
    }

    default:
      return state;
  }
}
