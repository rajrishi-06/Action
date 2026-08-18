import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Flame, Trophy, Zap } from 'lucide-react';
import { useTodo } from '../context/TodoContext';
import { ACHIEVEMENTS, progressStats } from '../lib/progress';
import { cn } from '../lib/cn';
import { Card, Progress } from './ui/primitives';

/**
 * Progress and achievements.
 *
 * Derived entirely from the task list rather than a separate `user_stats` table.
 * That removes a whole class of drift — the old version wrote XP through a
 * best-effort RPC with a manual fallback, and unlocked achievements on exact
 * equality (`completed === 10`), so any skipped count never unlocked at all.
 */
export function Gamification({ compact = false }) {
  const { tasks } = useTodo();

  const stats = useMemo(() => progressStats(tasks), [tasks]);
  const { level, intoLevel, levelSpan } = stats;
  const unlockedIds = new Set(stats.unlocked);

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-brand-600 to-accent-500 p-4 text-white shadow-card">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
              <Zap className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="font-display text-lg font-bold leading-tight">Level {level}</p>
              <p className="text-xs text-white/80">{stats.xp.toLocaleString()} XP earned</p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-xs text-white/80">Streak</p>
            <p className="flex items-center justify-end gap-1 text-base font-bold">
              <Flame className="h-4 w-4" aria-hidden="true" />
              {stats.streak}
            </p>
          </div>
        </div>

        <div className="mt-3 space-y-1">
          <div className="flex justify-between text-xs text-white/90">
            <span>{intoLevel} / {levelSpan} XP</span>
            <span>Level {level + 1}</span>
          </div>
          <Progress
            value={intoLevel}
            max={levelSpan}
            label={`${intoLevel} of ${levelSpan} XP toward level ${level + 1}`}
            className="bg-white/25"
            barClassName="bg-white"
          />
        </div>
      </Card>

      <div>
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
          <Trophy className="h-3 w-3" aria-hidden="true" />
          Achievements {stats.unlocked.length}/{ACHIEVEMENTS.length}
        </h3>

        <ul className={cn('grid gap-2', compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4')}>
          {(compact ? ACHIEVEMENTS.slice(0, 4) : ACHIEVEMENTS).map((achievement) => {
            const isUnlocked = unlockedIds.has(achievement.id);
            const Icon = achievement.icon;

            return (
              <motion.li
                key={achievement.id}
                initial={false}
                animate={{ scale: 1 }}
                title={achievement.description}
                className={cn(
                  'rounded-xl border p-2.5',
                  isUnlocked
                    ? 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40'
                    : 'border-line bg-surface-sunken opacity-60',
                )}
              >
                <span
                  className={cn(
                    'mb-1.5 flex h-6 w-6 items-center justify-center rounded-lg',
                    isUnlocked ? 'bg-gradient-to-br from-amber-400 to-accent-500 text-white' : 'bg-line-strong text-ink-subtle',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <p className={cn('truncate text-xs font-semibold', isUnlocked ? 'text-ink' : 'text-ink-muted')}>
                  {achievement.name}
                </p>
                <p className="sr-only">
                  {achievement.description}. {isUnlocked ? 'Unlocked' : 'Locked'}.
                </p>
              </motion.li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
