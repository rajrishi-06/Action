import { Award, Flame, Star, Target, Trophy } from 'lucide-react';
import { currentStreak, longestStreak } from './analytics';
import { xpForPriority } from './taskModel';

/**
 * Progression rules.
 *
 * Derived from the task list rather than stored in a separate table, so there
 * is nothing to drift out of sync. The old implementation wrote XP through a
 * best-effort RPC with a hand-rolled fallback, and unlocked achievements on
 * exact equality (`tasksCompleted === 10`), meaning a skipped count — two tasks
 * finished in quick succession, say — could never unlock it at all.
 */

export const ACHIEVEMENTS = [
  { id: 'first_task', name: 'First step', description: 'Complete your first task', icon: Star, test: (s) => s.completed >= 1 },
  { id: 'tasks_10', name: 'Getting going', description: 'Complete 10 tasks', icon: Target, test: (s) => s.completed >= 10 },
  { id: 'streak_3', name: 'Three in a row', description: 'Complete tasks three days running', icon: Flame, test: (s) => s.bestStreak >= 3 },
  { id: 'tasks_50', name: 'Task crusher', description: 'Complete 50 tasks', icon: Target, test: (s) => s.completed >= 50 },
  { id: 'streak_7', name: 'Week warrior', description: 'Complete tasks seven days running', icon: Flame, test: (s) => s.bestStreak >= 7 },
  { id: 'tasks_100', name: 'Century club', description: 'Complete 100 tasks', icon: Trophy, test: (s) => s.completed >= 100 },
  { id: 'streak_30', name: 'Monthly master', description: 'Complete tasks thirty days running', icon: Flame, test: (s) => s.bestStreak >= 30 },
  { id: 'tasks_500', name: 'Legendary', description: 'Complete 500 tasks', icon: Award, test: (s) => s.completed >= 500 },
];

/**
 * Levels grow quadratically, so each takes a little longer than the last:
 * level 1 at 0 XP, level 2 at 100, level 3 at 400, level 4 at 900.
 */
export const levelFor = (xp) => Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1;
export const xpAtLevel = (level) => (level - 1) ** 2 * 100;

/** Everything the progress UI needs, computed from the task list. */
export function progressStats(tasks, now = new Date()) {
  const completedTasks = tasks.filter((task) => task.completed);
  const xp = completedTasks.reduce((total, task) => total + xpForPriority(task.priority), 0);
  const level = levelFor(xp);

  const stats = {
    xp,
    level,
    completed: completedTasks.length,
    streak: currentStreak(tasks, now),
    bestStreak: longestStreak(tasks),
    levelStart: xpAtLevel(level),
    levelEnd: xpAtLevel(level + 1),
  };

  return {
    ...stats,
    intoLevel: xp - stats.levelStart,
    levelSpan: stats.levelEnd - stats.levelStart,
    unlocked: ACHIEVEMENTS.filter((achievement) => achievement.test(stats)).map((a) => a.id),
  };
}
