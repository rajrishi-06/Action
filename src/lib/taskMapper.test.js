import { describe, expect, it } from 'vitest';
import { fromRow, isEmptyRow, toInsertRow, toRow } from './taskMapper';

describe('fromRow', () => {
  const row = {
    id: 'abc', title: 'Ship it', notes: 'context', is_completed: false,
    status: 'today', priority: 'high', created_at: '2026-03-01T09:00:00.000Z',
    updated_at: '2026-03-02T09:00:00.000Z', completed_at: null,
    due_date: '2026-03-05T17:00:00.000Z', has_time: true,
    tags: ['work'], subtasks: [{ id: 's1', title: 'Step', completed: true }],
    estimate_minutes: 45, actual_minutes: null, recurrence: 'weekly', position: 2000,
  };

  it('maps every column to its UI field', () => {
    const task = fromRow(row);
    expect(task.title).toBe('Ship it');
    expect(task.notes).toBe('context');
    expect(task.completed).toBe(false);
    expect(task.estimateMinutes).toBe(45);
    expect(task.dueDate).toBeInstanceOf(Date);
    expect(task.createdAt).toBeInstanceOf(Date);
  });

  it('falls back to safe defaults for invalid enums', () => {
    const task = fromRow({ ...row, priority: 'nonsense', status: 'nonsense' });
    expect(task.priority).toBe('medium');
    expect(task.status).toBe('backlog');
  });

  it('derives done status from is_completed when status is invalid', () => {
    expect(fromRow({ ...row, is_completed: true, status: null }).status).toBe('done');
  });

  it('tolerates malformed subtask json', () => {
    expect(fromRow({ ...row, subtasks: 'not an array' }).subtasks).toEqual([]);
    expect(fromRow({ ...row, subtasks: [null, { nope: 1 }] }).subtasks).toEqual([]);
  });

  it('defaults missing arrays rather than yielding undefined', () => {
    const task = fromRow({ ...row, tags: null, subtasks: null });
    expect(task.tags).toEqual([]);
    expect(task.subtasks).toEqual([]);
  });
});

describe('toRow', () => {
  it('persists subtasks — the field the old updateTask silently dropped', () => {
    const subtasks = [{ id: 's1', title: 'Step', completed: false }];
    expect(toRow({ subtasks })).toEqual({ subtasks });
  });

  it('maps camelCase fields to their columns', () => {
    expect(toRow({ completed: true, estimateMinutes: 30, hasTime: true })).toEqual({
      is_completed: true,
      estimate_minutes: 30,
      has_time: true,
    });
  });

  it('serialises dates to ISO strings', () => {
    const date = new Date('2026-03-05T17:00:00.000Z');
    expect(toRow({ dueDate: date }).due_date).toBe('2026-03-05T17:00:00.000Z');
  });

  it('drops unknown keys instead of sending them', () => {
    expect(toRow({ pending: true, somethingClientOnly: 1 })).toEqual({});
  });

  it('keeps explicit nulls, which is how a due date is cleared', () => {
    expect(toRow({ dueDate: null })).toEqual({ due_date: null });
  });
});

describe('isEmptyRow', () => {
  it('detects a patch with nothing the database cares about', () => {
    expect(isEmptyRow(toRow({ clientOnly: true }))).toBe(true);
    expect(isEmptyRow(toRow({ title: 'x' }))).toBe(false);
  });
});

describe('toInsertRow', () => {
  it('builds a complete insert payload with the owner attached', () => {
    const row = toInsertRow({ title: 'New', priority: 'high', tags: ['a'] }, 'user-1');
    expect(row.user_id).toBe('user-1');
    expect(row.title).toBe('New');
    expect(row.is_completed).toBe(false);
    expect(row.subtasks).toEqual([]);
    expect(row.status).toBe('backlog');
  });
});

describe('toInsertRow — client-generated ids', () => {
  it('includes an id when the client supplies one', () => {
    const row = toInsertRow({ id: 'client-uuid', title: 'New' }, 'user-1');
    expect(row.id).toBe('client-uuid');
  });

  it('omits the id entirely when there is none, letting Postgres generate it', () => {
    expect(toInsertRow({ title: 'New' }, 'user-1')).not.toHaveProperty('id');
  });
});
