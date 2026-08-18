import { useState } from 'react';
import { format, getDay, isSameMonth } from 'date-fns';
import { ChartFrame, DataTable } from './ChartParts';

const LEVELS = [
  'bg-[rgb(var(--heat-0))]',
  'bg-[rgb(var(--heat-1))]',
  'bg-[rgb(var(--heat-2))]',
  'bg-[rgb(var(--heat-3))]',
  'bg-[rgb(var(--heat-4))]',
];

/** Bucket a count into one of five sequential steps. */
function levelFor(count, max) {
  if (count === 0) return 0;
  if (max <= 1) return 4;
  const ratio = count / max;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

/**
 * Completion heatmap.
 *
 * Sequential magnitude, so a single hue running light to dark — never a rainbow.
 * Counts come from `completedAt`, so this shows when work was actually finished
 * rather than when it was captured.
 *
 * Cells are a fixed small size and the grid scrolls horizontally on narrow
 * screens: stretching them to fill the container turns a dense overview into a
 * wall of large squares that is harder, not easier, to read.
 */
export function ContributionHeatmap({ data }) {
  const [hovered, setHovered] = useState(null);

  const max = Math.max(...data.map((day) => day.count), 0);
  const total = data.reduce((sum, day) => sum + day.count, 0);

  // Pad the first column so every row is a fixed weekday (Monday at the top).
  const leadingBlanks = (getDay(data[0]?.date ?? new Date()) + 6) % 7;
  const cells = [...Array.from({ length: leadingBlanks }, () => null), ...data];
  const weeks = Array.from({ length: Math.ceil(cells.length / 7) }, (_, index) =>
    cells.slice(index * 7, index * 7 + 7),
  );

  // A month label sits above the first week that starts a new month.
  const monthLabels = weeks.map((week, index) => {
    const first = week.find(Boolean);
    if (!first) return null;
    const previous = weeks[index - 1]?.find(Boolean);
    if (previous && isSameMonth(previous.date, first.date)) return null;
    return format(first.date, 'MMM');
  });

  return (
    <ChartFrame
      title="Completion history"
      description={`${total} tasks completed in the last ${data.length} days.`}
      legend={
        <div className="flex items-center gap-1.5 text-xs text-ink-muted">
          <span>Less</span>
          {LEVELS.map((level) => (
            <span key={level} className={`h-2.5 w-2.5 rounded-[2px] ${level}`} aria-hidden="true" />
          ))}
          <span>More</span>
        </div>
      }
      tableView={
        <DataTable
          columns={['Day', 'Completed']}
          rows={data
            .filter((day) => day.count > 0)
            .map((day) => [format(day.date, 'EEE d MMM yyyy'), day.count])}
        />
      }
    >
      <div className="overflow-x-auto pb-1 scrollbar-thin">
        <div className="flex w-max gap-[3px] pl-8">
          {monthLabels.map((label, index) => (
            <span
              key={index}
              className="w-[13px] text-[10px] leading-none text-ink-subtle"
              aria-hidden="true"
            >
              {label}
            </span>
          ))}
        </div>

        <div className="mt-1 flex w-max gap-[3px]">
          {/* Weekday gutter — only alternate rows are labelled, as is conventional. */}
          <div className="flex flex-col gap-[3px] pr-1">
            {['Mon', '', 'Wed', '', 'Fri', '', ''].map((label, index) => (
              <span
                key={index}
                className="flex h-[13px] w-7 items-center text-[10px] leading-none text-ink-subtle"
                aria-hidden="true"
              >
                {label}
              </span>
            ))}
          </div>

          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-[3px]">
              {week.map((day, dayIndex) =>
                day ? (
                  <button
                    key={day.date.toISOString()}
                    type="button"
                    onMouseEnter={() => setHovered(day)}
                    onMouseLeave={() => setHovered(null)}
                    onFocus={() => setHovered(day)}
                    onBlur={() => setHovered(null)}
                    aria-label={`${format(day.date, 'EEEE d MMMM')}: ${day.count} completed`}
                    className={`h-[13px] w-[13px] rounded-[2px] transition-transform hover:scale-125 ${LEVELS[levelFor(day.count, max)]}`}
                  />
                ) : (
                  <span
                    key={`blank-${weekIndex}-${dayIndex}`}
                    className="h-[13px] w-[13px]"
                    aria-hidden="true"
                  />
                ),
              )}
            </div>
          ))}
        </div>

        <p className="mt-2.5 h-4 text-xs text-ink-muted" aria-live="polite">
          {hovered
            ? `${hovered.count} completed on ${format(hovered.date, 'EEE d MMM')}`
            : max === 0
              ? 'Nothing completed yet — the grid fills in as you finish tasks.'
              : `Best day: ${max} tasks.`}
        </p>
      </div>
    </ChartFrame>
  );
}
