import {
  eachDayOfInterval,
  endOfDay,
  isSameDay,
  isWithinInterval,
  startOfDay,
  subDays,
} from 'date-fns';
import { toDate } from './date';
import { priorityWeight } from './taskModel';

/**
 * Productivity metrics.
 *
 * Every "when did this happen" question is answered with `completedAt`, not
 * `createdAt`. The previous implementation used creation time as a stand-in,
 * which meant the "most productive hours" chart actually reported when the user
 * *added* tasks, and the streak counted consecutive tasks rather than days.
 */

const completionDate = (task) => toDate(task.completedAt) ?? null;

/** Tasks completed on a given calendar day. */
export function completedOn(tasks, day) {
  return tasks.filter((task) => {
    const date = completionDate(task);
    return Boolean(task.completed && date && isSameDay(date, day));
  });
}

/**
 * Consecutive days ending today (or yesterday) on which at least one task was
 * completed. Finishing nothing today does not break a streak until midnight.
 */
export function currentStreak(tasks, now = new Date()) {
  const days = new Set(
    tasks
      .filter((task) => task.completed)
      .map(completionDate)
      .filter(Boolean)
      .map((date) => startOfDay(date).getTime()),
  );

  if (days.size === 0) return 0;

  let streak = 0;
  let cursor = startOfDay(now);

  // Today not being done yet should not zero out a live streak.
  if (!days.has(cursor.getTime())) {
    cursor = subDays(cursor, 1);
    if (!days.has(cursor.getTime())) return 0;
  }

  while (days.has(cursor.getTime())) {
    streak += 1;
    cursor = subDays(cursor, 1);
  }

  return streak;
}

/** The longest run of consecutive completion days ever recorded. */
export function longestStreak(tasks) {
  const days = [
    ...new Set(
      tasks
        .filter((task) => task.completed)
        .map(completionDate)
        .filter(Boolean)
        .map((date) => startOfDay(date).getTime()),
    ),
  ].sort((a, b) => a - b);

  if (days.length === 0) return 0;

  const DAY = 86_400_000;
  let best = 1;
  let run = 1;
  for (let i = 1; i < days.length; i += 1) {
    run = days[i] - days[i - 1] === DAY ? run + 1 : 1;
    if (run > best) best = run;
  }
  return best;
}

/** Daily completion counts for the last `days` days, oldest first. */
export function completionHeatmap(tasks, days = 84, now = new Date()) {
  const end = endOfDay(now);
  const start = startOfDay(subDays(end, days - 1));
  const buckets = new Map(
    eachDayOfInterval({ start, end }).map((day) => [startOfDay(day).getTime(), 0]),
  );

  for (const task of tasks) {
    if (!task.completed) continue;
    const date = completionDate(task);
    if (!date || !isWithinInterval(date, { start, end })) continue;
    const key = startOfDay(date).getTime();
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  return [...buckets.entries()].map(([time, count]) => ({ date: new Date(time), count }));
}

/** Completion counts by hour of day, 0–23. */
export function hourlyDistribution(tasks) {
  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));
  for (const task of tasks) {
    if (!task.completed) continue;
    const date = completionDate(task);
    if (date) hours[date.getHours()].count += 1;
  }
  const max = Math.max(...hours.map((h) => h.count), 0);
  return hours.map((entry) => ({
    ...entry,
    percentage: max ? Math.round((entry.count / max) * 100) : 0,
  }));
}

/** Created-vs-completed per day, for the throughput chart. */
export function throughput(tasks, days = 14, now = new Date()) {
  const end = endOfDay(now);
  const start = startOfDay(subDays(end, days - 1));

  return eachDayOfInterval({ start, end }).map((day) => ({
    date: day,
    created: tasks.filter((task) => {
      const date = toDate(task.createdAt);
      return date && isSameDay(date, day);
    }).length,
    completed: completedOn(tasks, day).length,
  }));
}

/** Open task counts grouped by tag, biggest first. */
export function tagBreakdown(tasks, limit = 8) {
  const counts = new Map();
  for (const task of tasks) {
    for (const tag of task.tags ?? []) {
      const entry = counts.get(tag) ?? { tag, total: 0, completed: 0 };
      entry.total += 1;
      if (task.completed) entry.completed += 1;
      counts.set(tag, entry);
    }
  }
  return [...counts.values()].sort((a, b) => b.total - a.total).slice(0, limit);
}

/** Open task counts grouped by priority. */
export function priorityBreakdown(tasks) {
  const open = tasks.filter((task) => !task.completed);
  const counts = { urgent: 0, high: 0, medium: 0, low: 0 };
  for (const task of open) {
    if (counts[task.priority] !== undefined) counts[task.priority] += 1;
  }
  return counts;
}

/** Median hours from creation to completion. Median resists outliers. */
export function medianCompletionHours(tasks) {
  const durations = tasks
    .filter((task) => task.completed)
    .map((task) => {
      const created = toDate(task.createdAt);
      const done = completionDate(task);
      if (!created || !done) return null;
      const hours = (done.getTime() - created.getTime()) / 3_600_000;
      return hours >= 0 ? hours : null;
    })
    .filter((value) => value !== null)
    .sort((a, b) => a - b);

  if (durations.length === 0) return null;
  const mid = Math.floor(durations.length / 2);
  return durations.length % 2 ? durations[mid] : (durations[mid - 1] + durations[mid]) / 2;
}

/** Headline numbers for the dashboard cards. */
export function summarise(tasks, now = new Date()) {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.completed).length;
  const open = total - completed;
  const overdue = tasks.filter((task) => {
    const date = toDate(task.dueDate);
    return Boolean(!task.completed && date && date.getTime() < now.getTime());
  }).length;
  const dueToday = tasks.filter((task) => {
    const date = toDate(task.dueDate);
    return Boolean(!task.completed && date && isSameDay(date, now));
  }).length;
  const completedToday = completedOn(tasks, now).length;

  return {
    total,
    completed,
    open,
    overdue,
    dueToday,
    completedToday,
    completionRate: total === 0 ? 0 : Math.round((completed / total) * 100),
    streak: currentStreak(tasks, now),
    bestStreak: longestStreak(tasks),
    medianHours: medianCompletionHours(tasks),
  };
}

/**
 * Ranking used by the "Smart" sort: overdue first, then priority, then how soon
 * something is due. Returns a comparator so callers can sort a copy.
 */
export function smartScore(task, now = Date.now()) {
  if (task.completed) return -1_000_000;

  let score = priorityWeight(task.priority) * 100;
  const due = toDate(task.dueDate);

  if (due) {
    const hoursUntilDue = (due.getTime() - now) / 3_600_000;
    if (hoursUntilDue < 0) {
      // Overdue: the longer it has slipped, the louder it gets (capped).
      score += 1000 + Math.min(-hoursUntilDue, 720);
    } else {
      score += Math.max(0, 500 - hoursUntilDue * 3);
    }
  }

  return score;
}
