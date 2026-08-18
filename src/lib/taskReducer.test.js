import { describe, expect, it } from 'vitest';
import { initialTaskState, taskReducer } from './taskReducer';

const task = (id, extra = {}) => ({ id, title: `Task ${id}`, completed: false, ...extra });
const stateWith = (...items) => ({ ...initialTaskState, status: 'ready', items });

describe('taskReducer', () => {
  it('loads tasks and clears the error', () => {
    const state = taskReducer({ ...initialTaskState, error: 'boom' }, {
      type: 'load:success', tasks: [task('1')],
    });
    expect(state.status).toBe('ready');
    expect(state.error).toBeNull();
    expect(state.items).toHaveLength(1);
  });

  it('adds to the front so a new task is visible immediately', () => {
    const state = taskReducer(stateWith(task('1')), { type: 'add', task: task('2') });
    expect(state.items[0].id).toBe('2');
  });

  it('swaps an optimistic placeholder for the saved row', () => {
    const state = taskReducer(stateWith(task('temp')), {
      type: 'replace', id: 'temp', task: task('real', { title: 'Saved' }),
    });
    expect(state.items[0].id).toBe('real');
    expect(state.items).toHaveLength(1);
  });

  it('patches only the given fields', () => {
    const state = taskReducer(stateWith(task('1', { priority: 'low', tags: ['a'] })), {
      type: 'update', id: '1', patch: { priority: 'high' },
    });
    expect(state.items[0].priority).toBe('high');
    expect(state.items[0].tags).toEqual(['a']);
  });

  it('restores a deleted task to its original position', () => {
    const state = stateWith(task('1'), task('2'), task('3'));
    const removed = taskReducer(state, { type: 'remove', id: '2' });
    expect(removed.items.map((t) => t.id)).toEqual(['1', '3']);

    const restored = taskReducer(removed, { type: 'restore', task: task('2'), index: 1 });
    expect(restored.items.map((t) => t.id)).toEqual(['1', '2', '3']);
  });

  it('restores several tasks to their original positions at once', () => {
    const state = stateWith(task('1'), task('2'), task('3'), task('4'));
    const removed = taskReducer(state, { type: 'remove:many', ids: ['2', '4'] });
    expect(removed.items.map((t) => t.id)).toEqual(['1', '3']);

    const restored = taskReducer(removed, {
      type: 'restore:many',
      entries: [
        { task: task('4'), index: 3 },
        { task: task('2'), index: 1 },
      ],
    });
    expect(restored.items.map((t) => t.id)).toEqual(['1', '2', '3', '4']);
  });

  it('clamps an out-of-range restore index instead of producing holes', () => {
    const state = taskReducer(stateWith(task('1')), {
      type: 'restore', task: task('2'), index: 99,
    });
    expect(state.items.map((t) => t.id)).toEqual(['1', '2']);
  });

  it('applies many patches in one pass', () => {
    const state = taskReducer(stateWith(task('1'), task('2'), task('3')), {
      type: 'update:many',
      updates: [
        { id: '1', patch: { completed: true } },
        { id: '3', patch: { completed: true } },
      ],
    });
    expect(state.items.map((t) => t.completed)).toEqual([true, false, true]);
  });

  it('upserts a realtime row, updating in place when it already exists', () => {
    const existing = taskReducer(stateWith(task('1', { title: 'Old' })), {
      type: 'upsert:remote', task: task('1', { title: 'New' }),
    });
    expect(existing.items).toHaveLength(1);
    expect(existing.items[0].title).toBe('New');

    const added = taskReducer(stateWith(task('1')), {
      type: 'upsert:remote', task: task('2'),
    });
    expect(added.items).toHaveLength(2);
  });

  it('resets to an empty ready state on sign-out', () => {
    const state = taskReducer(stateWith(task('1')), { type: 'reset' });
    expect(state.items).toEqual([]);
    expect(state.status).toBe('ready');
  });

  it('ignores unknown actions', () => {
    const state = stateWith(task('1'));
    expect(taskReducer(state, { type: 'nope' })).toBe(state);
  });
});
