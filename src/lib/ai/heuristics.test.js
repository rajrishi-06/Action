import { describe, expect, it } from 'vitest';
import { localCoaching, localEstimate, localInsights, localPriority, localSubtasks, localTags } from './heuristics';

const now = new Date(2026, 5, 15, 12);
const task = (overrides = {}) => ({
  id: Math.random().toString(36).slice(2),
  title: 'Task', completed: false, priority: 'medium', tags: [], subtasks: [],
  dueDate: null, ...overrides,
});

describe('localSubtasks', () => {
  it('matches a template by keyword', () => {
    expect(localSubtasks('Study for the physics exam')).toContain('Work through past papers');
  });

  it('falls back to a generic project template', () => {
    expect(localSubtasks('Plan the company offsite')).not.toBeNull();
  });

  it('returns null for a task that needs no breakdown', () => {
    expect(localSubtasks('Buy milk')).toBeNull();
  });

  it('returns null for input too short to classify', () => {
    expect(localSubtasks('a')).toBeNull();
  });
});

describe('localTags', () => {
  it('suggests at most three relevant tags', () => {
    const tags = localTags('Pay the gym invoice and book a doctor appointment');
    expect(tags.length).toBeLessThanOrEqual(3);
    expect(tags).toContain('health');
  });

  it('returns nothing for unclassifiable input', () => {
    expect(localTags('Zzzz')).toEqual([]);
  });
});

describe('localEstimate', () => {
  it('prefers the larger match when several rules apply', () => {
    // "project" (240) beats "write" (60).
    expect(localEstimate('Write the project plan')).toBe(240);
  });

  it('returns null when nothing matches', () => {
    expect(localEstimate('Zzzz')).toBeNull();
  });
});

describe('localPriority', () => {
  it('escalates as the deadline approaches', () => {
    expect(localPriority(task({ dueDate: new Date(now.getTime() - 1000) }))).toBe('urgent');
    expect(localPriority(task({ dueDate: new Date(Date.now() + 36 * 3600_000) }))).toBe('high');
    expect(localPriority(task({ dueDate: new Date(Date.now() + 30 * 86_400_000) }))).toBe('low');
  });

  it('defaults to medium without a date', () => {
    expect(localPriority(task())).toBe('medium');
  });
});

describe('localInsights', () => {
  it('flags overdue work with stable ids', () => {
    const tasks = [task({ dueDate: new Date(now.getTime() - 86_400_000) })];
    const insights = localInsights(tasks, now);
    expect(insights[0].id).toBe('overdue');
    expect(insights[0].severity).toBe('high');
  });

  it('gives every insight an id that does not change with the counts', () => {
    const one = localInsights([task({ dueDate: new Date(now.getTime() - 1000) })], now);
    const two = localInsights(
      [task({ dueDate: new Date(now.getTime() - 1000) }), task({ dueDate: new Date(now.getTime() - 2000) })],
      now,
    );
    // The message text differs (1 vs 2 overdue) but the id must not — that is
    // what makes a dismissal stick.
    expect(one[0].title).not.toBe(two[0].title);
    expect(one[0].id).toBe(two[0].id);
  });

  it('warns about an oversized backlog', () => {
    const tasks = Array.from({ length: 30 }, () => task());
    expect(localInsights(tasks, now).some((i) => i.id === 'backlog-large')).toBe(true);
  });

  it('says nothing when there is nothing to say', () => {
    expect(localInsights([task({ dueDate: new Date(now.getTime() + 86_400_000) })], now)).toEqual([]);
  });
});

describe('localCoaching', () => {
  it('leads with overdue work when there is a lot of it', () => {
    expect(localCoaching({ total: 10, overdue: 5, completedToday: 0, streak: 0, dueToday: 0 }))
      .toContain('slipped');
  });

  it('prompts capture when there is nothing at all', () => {
    expect(localCoaching({ total: 0, overdue: 0, completedToday: 0, streak: 0, dueToday: 0 }))
      .toContain('first task');
  });

  it('always returns a non-empty string', () => {
    expect(localCoaching({ total: 3, overdue: 0, completedToday: 0, streak: 0, dueToday: 0 }).length)
      .toBeGreaterThan(0);
  });
});
