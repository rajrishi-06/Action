import { useMemo } from 'react';
import { BarChart3, CheckCircle2, Clock, Flame, Inbox, Target } from 'lucide-react';
import { useTodo } from '../context/TodoContext';
import {
  completionHeatmap, hourlyDistribution, priorityBreakdown, summarise, tagBreakdown, throughput,
} from '../lib/analytics';
import { PRIORITY_META } from '../lib/taskModel';
import { formatDuration } from '../lib/date';
import { StatTile } from '../components/charts/ChartParts';
import { ThroughputChart } from '../components/charts/ThroughputChart';
import { ContributionHeatmap } from '../components/charts/ContributionHeatmap';
import { BarList } from '../components/charts/BarList';
import { EmptyState } from '../components/ui/primitives';

const hourLabel = (hour) => {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
};

/**
 * Insights.
 *
 * Every metric here is derived from `completedAt`. The previous dashboard used
 * `createdAt` as a stand-in, which meant "most productive hours" actually
 * charted when tasks were *added*, and the streak counted consecutive tasks
 * rather than consecutive days.
 */
export function AnalyticsView() {
  const { tasks, isLoading } = useTodo();

  const stats = useMemo(() => summarise(tasks), [tasks]);
  const heatmap = useMemo(() => completionHeatmap(tasks, 182), [tasks]);
  const flow = useMemo(() => throughput(tasks, 14), [tasks]);
  const hours = useMemo(() => hourlyDistribution(tasks), [tasks]);
  const tags = useMemo(() => tagBreakdown(tasks), [tasks]);
  const priorities = useMemo(() => priorityBreakdown(tasks), [tasks]);

  const topHours = useMemo(
    () =>
      hours
        .filter((entry) => entry.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 6)
        .map((entry) => ({ label: hourLabel(entry.hour), value: entry.count })),
    [hours],
  );

  if (!isLoading && tasks.length === 0) {
    return (
      <div className="space-y-5">
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-ink">
          <BarChart3 className="h-6 w-6 text-brand-600 dark:text-brand-400" aria-hidden="true" />
          Insights
        </h1>
        <EmptyState
          icon={<BarChart3 className="h-6 w-6" />}
          title="Nothing to measure yet"
          description="Add and complete a few tasks and this page will fill with your actual patterns — when you finish work, what you finish, and how consistent you are."
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-ink">
          <BarChart3 className="h-6 w-6 text-brand-600 dark:text-brand-400" aria-hidden="true" />
          Insights
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Based on when tasks were actually completed, not when they were added.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Open"
          value={stats.open}
          hint={stats.dueToday > 0 ? `${stats.dueToday} due today` : 'Nothing due today'}
          icon={<Inbox className="h-4 w-4" />}
        />
        <StatTile
          label="Completed today"
          value={stats.completedToday}
          hint={`${stats.completed} all time`}
          icon={<CheckCircle2 className="h-4 w-4" />}
          tone={stats.completedToday > 0 ? 'success' : 'default'}
        />
        <StatTile
          label="Current streak"
          value={stats.streak === 0 ? '—' : `${stats.streak}d`}
          hint={stats.bestStreak > 0 ? `Best: ${stats.bestStreak} days` : 'Complete a task to start one'}
          icon={<Flame className="h-4 w-4" />}
        />
        <StatTile
          label={stats.overdue > 0 ? 'Overdue' : 'Completion rate'}
          value={stats.overdue > 0 ? stats.overdue : `${stats.completionRate}%`}
          hint={
            stats.overdue > 0
              ? 'Reschedule or drop these'
              : stats.medianHours != null
                ? `Median ${formatDuration(Math.round(stats.medianHours * 60))} to finish`
                : 'Of everything captured'
          }
          icon={<Target className="h-4 w-4" />}
          tone={stats.overdue > 0 ? 'danger' : 'default'}
        />
      </div>

      <ContributionHeatmap data={heatmap} />

      <ThroughputChart data={flow} />

      <div className="grid gap-4 lg:grid-cols-2">
        <BarList
          title="Most productive hours"
          description="When you actually tick things off."
          valueLabel="Tasks completed"
          items={topHours}
          emptyMessage="Complete a few tasks to see your pattern."
        />

        <BarList
          title="Open work by priority"
          description="What is still on your plate."
          valueLabel="Open tasks"
          items={Object.entries(priorities)
            .filter(([, count]) => count > 0)
            .map(([priority, count]) => ({
              label: PRIORITY_META[priority].label,
              value: count,
              // Priority is a status scale, so it keeps its reserved colours —
              // and each bar carries its label, never colour alone.
              className: {
                urgent: 'bg-rose-500',
                high: 'bg-amber-500',
                medium: 'bg-chart-1',
                low: 'bg-slate-400',
              }[priority],
            }))}
          emptyMessage="Nothing open. Enjoy it."
        />
      </div>

      {tags.length > 0 && (
        <BarList
          title="Tags"
          description="Where your tasks cluster."
          valueLabel="Tasks"
          items={tags.map((entry) => ({
            label: `#${entry.tag}`,
            value: entry.total,
            display: `${entry.completed}/${entry.total}`,
          }))}
          emptyMessage="No tags yet."
        />
      )}

      <p className="flex items-center gap-1.5 px-1 text-xs text-ink-subtle">
        <Clock className="h-3 w-3" aria-hidden="true" />
        Tasks completed before this version was installed have no completion timestamp and will
        not appear in the time-based charts.
      </p>
    </div>
  );
}
