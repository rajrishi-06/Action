import { describe, expect, it } from 'vitest';
import {
  completionHeatmap, currentStreak, hourlyDistribution, longestStreak,
  medianCompletionHours, priorityBreakdown, smartScore, summarise, tagBreakdown, throughput,
} from './analytics';

const DAY = 86_400_000;
const now = new Date(2026, 5, 15, 12, 0, 0, 0);
const daysAgo = (n, hour = 10) => {
  const date = new Date(now.getTime() - n * DAY);
  date.setHours(hour, 0, 0, 0);
  return date;
};

const task = (overrides = {}) => ({
  id: Math.random().toString(36).slice(2),
  title: 'Task',
  completed: false,
  priority: 'medium',
  tags: [],
  createdAt: daysAgo(10),
  completedAt: null,
  dueDate: null,
  ...overrides,
});

const done = (n, hour = 10, extra = {}) =>
  task({ completed: true, completedAt: daysAgo(n, hour), ...extra });

describe('currentStreak', () => {
  it('counts consecutive days, not consecutive tasks', () => {
    // Three tasks on one day is a one-day streak, not three.
    const tasks = [done(0), done(0), done(0)];
    expect(currentStreak(tasks, now)).toBe(1);
  });

  it('counts a genuine multi-day run', () => {
    expect(currentStreak([done(0), done(1), done(2)], now)).toBe(3);
  });

  it('survives today being empty so far', () => {
    // Nothing done today yet, but yesterday and the day before were.
    expect(currentStreak([done(1), done(2)], now)).toBe(2);
  });

  it('breaks on a missed day', () => {
    expect(currentStreak([done(0), done(1), done(3)], now)).toBe(2);
  });

  it('is zero when the last completion is old', () => {
    expect(currentStreak([done(5)], now)).toBe(0);
  });

  it('is zero with no completions', () => {
    expect(currentStreak([task()], now)).toBe(0);
  });

  it('ignores completed tasks with no timestamp', () => {
    expect(currentStreak([{ ...task(), completed: true, completedAt: null }], now)).toBe(0);
  });
});

describe('longestStreak', () => {
  it('finds the best historical run', () => {
    const tasks = [done(0), done(2), done(3), done(4), done(5), done(9)];
    expect(longestStreak(tasks)).toBe(4);
  });

  it('is zero with no completions', () => {
    expect(longestStreak([task()])).toBe(0);
  });
});

describe('hourlyDistribution', () => {
  it('buckets by completion hour, not creation hour', () => {
    const tasks = [
      { ...done(1, 15), createdAt: daysAgo(9, 3) },
      { ...done(2, 15), createdAt: daysAgo(8, 4) },
      { ...done(3, 9), createdAt: daysAgo(7, 5) },
    ];
    const hours = hourlyDistribution(tasks);
    expect(hours[15].count).toBe(2);
    expect(hours[9].count).toBe(1);
    // Creation hours must not appear.
    expect(hours[3].count).toBe(0);
    expect(hours[4].count).toBe(0);
  });

  it('always returns all 24 hours', () => {
    expect(hourlyDistribution([])).toHaveLength(24);
  });
});

describe('completionHeatmap', () => {
  it('returns one bucket per day, oldest first', () => {
    const result = completionHeatmap([done(0), done(0), done(3)], 7, now);
    expect(result).toHaveLength(7);
    expect(result.at(-1).count).toBe(2);
    expect(result.at(-4).count).toBe(1);
  });

  it('ignores completions outside the window', () => {
    const result = completionHeatmap([done(30)], 7, now);
    expect(result.reduce((sum, day) => sum + day.count, 0)).toBe(0);
  });
});

describe('throughput', () => {
  it('reports created and completed separately per day', () => {
    const tasks = [
      task({ createdAt: daysAgo(1) }),
      { ...done(0), createdAt: daysAgo(1) },
    ];
    const result = throughput(tasks, 3, now);
    expect(result.at(-2).created).toBe(2);
    expect(result.at(-1).completed).toBe(1);
  });
});

describe('summarise', () => {
  it('separates open, overdue and due-today counts', () => {
    const tasks = [
      task({ dueDate: daysAgo(2) }),
      task({ dueDate: new Date(2026, 5, 15, 18) }),
      task({ dueDate: new Date(2026, 5, 20) }),
      done(0),
    ];
    const stats = summarise(tasks, now);
    expect(stats.total).toBe(4);
    expect(stats.open).toBe(3);
    expect(stats.overdue).toBe(1);
    expect(stats.dueToday).toBe(1);
    expect(stats.completedToday).toBe(1);
    expect(stats.completionRate).toBe(25);
  });

  it('does not divide by zero on an empty list', () => {
    expect(summarise([], now).completionRate).toBe(0);
  });
});

describe('medianCompletionHours', () => {
  it('returns the median rather than the mean, so outliers do not skew it', () => {
    const tasks = [
      { ...task({ createdAt: daysAgo(1, 10) }), completed: true, completedAt: daysAgo(1, 12) },
      { ...task({ createdAt: daysAgo(2, 10) }), completed: true, completedAt: daysAgo(2, 14) },
      { ...task({ createdAt: daysAgo(3, 10) }), completed: true, completedAt: daysAgo(0, 10) },
    ];
    expect(medianCompletionHours(tasks)).toBe(4);
  });

  it('is null with nothing completed', () => {
    expect(medianCompletionHours([task()])).toBeNull();
  });
});

describe('breakdowns', () => {
  it('counts tags across tasks', () => {
    const tasks = [task({ tags: ['work'] }), done(0, 10, { tags: ['work', 'admin'] })];
    const result = tagBreakdown(tasks);
    expect(result[0]).toEqual({ tag: 'work', total: 2, completed: 1 });
  });

  it('counts only open tasks by priority', () => {
    const tasks = [task({ priority: 'urgent' }), done(0, 10, { priority: 'urgent' })];
    expect(priorityBreakdown(tasks).urgent).toBe(1);
  });
});

describe('smartScore', () => {
  it('ranks overdue above everything else', () => {
    const overdue = task({ priority: 'low', dueDate: daysAgo(1) });
    const urgentLater = task({ priority: 'urgent', dueDate: new Date(2026, 6, 1) });
    expect(smartScore(overdue, now.getTime())).toBeGreaterThan(smartScore(urgentLater, now.getTime()));
  });

  it('ranks higher priority above lower when neither has a date', () => {
    expect(smartScore(task({ priority: 'urgent' }))).toBeGreaterThan(smartScore(task({ priority: 'low' })));
  });

  it('sinks completed tasks', () => {
    expect(smartScore(done(0))).toBeLessThan(smartScore(task({ priority: 'low' })));
  });
});
