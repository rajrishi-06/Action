import { describe, expect, it } from 'vitest';
import { levelFor, progressStats, xpAtLevel } from './progress';

const DAY = 86_400_000;
const now = new Date(2026, 5, 15, 12);
const daysAgo = (n) => new Date(now.getTime() - n * DAY);

const done = (priority, n = 0) => ({
  id: Math.random().toString(36).slice(2),
  title: 'Task', completed: true, priority,
  createdAt: daysAgo(n + 1), completedAt: daysAgo(n), tags: [],
});

describe('levels', () => {
  it('starts at level 1 and grows quadratically', () => {
    expect(levelFor(0)).toBe(1);
    expect(levelFor(99)).toBe(1);
    expect(levelFor(100)).toBe(2);
    expect(levelFor(400)).toBe(3);
    expect(levelFor(900)).toBe(4);
  });

  it('never returns a level below 1 for odd input', () => {
    expect(levelFor(-50)).toBe(1);
  });

  it('has a consistent inverse', () => {
    expect(xpAtLevel(1)).toBe(0);
    expect(xpAtLevel(2)).toBe(100);
    expect(xpAtLevel(levelFor(400))).toBe(400);
  });
});

describe('progressStats', () => {
  it('awards XP by priority', () => {
    const stats = progressStats([done('urgent'), done('low')], now);
    expect(stats.xp).toBe(60);
  });

  it('ignores open tasks', () => {
    const stats = progressStats([{ id: '1', completed: false, priority: 'urgent', tags: [] }], now);
    expect(stats.xp).toBe(0);
    expect(stats.completed).toBe(0);
  });

  it('unlocks achievements at or above the threshold, not on exact equality', () => {
    // The old implementation used `=== 10`, so overshooting never unlocked it.
    const tasks = Array.from({ length: 12 }, () => done('medium'));
    expect(progressStats(tasks, now).unlocked).toContain('tasks_10');
  });

  it('unlocks streak achievements from the best historical streak', () => {
    const tasks = [done('low', 0), done('low', 1), done('low', 2)];
    expect(progressStats(tasks, now).unlocked).toContain('streak_3');
  });

  it('reports progress within the current level', () => {
    // 5 urgent tasks = 250 XP -> level 2 (starts at 100, ends at 400).
    const stats = progressStats(Array.from({ length: 5 }, () => done('urgent')), now);
    expect(stats.level).toBe(2);
    expect(stats.intoLevel).toBe(150);
    expect(stats.levelSpan).toBe(300);
  });

  it('unlocks nothing for an empty list', () => {
    expect(progressStats([], now).unlocked).toEqual([]);
  });
});
