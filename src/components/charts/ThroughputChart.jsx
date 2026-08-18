import { useState } from 'react';
import { format } from 'date-fns';
import { ChartFrame, DataTable, Legend } from './ChartParts';
import { cn } from '../../lib/cn';

/**
 * Created vs completed per day.
 *
 * Grouped columns on a single shared y-axis — never a second axis, since both
 * series are counts of the same thing and must stay directly comparable.
 */
export function ThroughputChart({ data }) {
  const [hovered, setHovered] = useState(null);

  const max = Math.max(...data.map((day) => Math.max(day.created, day.completed)), 1);
  // Round the axis top to something readable rather than the raw maximum.
  const axisTop = max <= 4 ? 4 : Math.ceil(max / 5) * 5;

  const hasData = data.some((day) => day.created > 0 || day.completed > 0);

  return (
    <ChartFrame
      title="Throughput"
      description="Tasks added and finished each day for the last two weeks."
      legend={
        <Legend
          items={[
            { label: 'Added', className: 'bg-chart-1' },
            { label: 'Completed', className: 'bg-chart-2' },
          ]}
        />
      }
      tableView={
        <DataTable
          columns={['Day', 'Added', 'Completed']}
          rows={data.map((day) => [format(day.date, 'EEE d MMM'), day.created, day.completed])}
        />
      }
    >
      {!hasData ? (
        <p className="py-12 text-center text-sm text-ink-muted">
          No activity in this period yet.
        </p>
      ) : (
        <div className="relative">
          {/* Recessive hairline gridlines with clean tick values. */}
          <div className="absolute inset-0 bottom-6 flex flex-col justify-between" aria-hidden="true">
            {[axisTop, Math.round(axisTop / 2), 0].map((tick) => (
              <div key={tick} className="flex items-center gap-2">
                <span className="w-5 shrink-0 text-right text-[10px] tabular-nums text-ink-subtle">{tick}</span>
                <span className="h-px flex-1 bg-chart-grid" />
              </div>
            ))}
          </div>

          <div className="relative flex h-44 items-end gap-1 pl-7">
            {data.map((day) => {
              const isHovered = hovered === day.date.getTime();
              return (
                <div
                  key={day.date.toISOString()}
                  className="group relative flex h-full flex-1 items-end justify-center gap-[2px]"
                  onMouseEnter={() => setHovered(day.date.getTime())}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(day.date.getTime())}
                  onBlur={() => setHovered(null)}
                >
                  {/* Enlarged, invisible hit target so hover is forgiving. */}
                  <button
                    type="button"
                    tabIndex={0}
                    className="absolute inset-0 z-10 cursor-default"
                    aria-label={`${format(day.date, 'EEEE d MMMM')}: ${day.created} added, ${day.completed} completed`}
                  />

                  <span
                    className="w-full max-w-[10px] rounded-t bg-chart-1 transition-[height] duration-300"
                    style={{ height: `${(day.created / axisTop) * 100}%` }}
                    aria-hidden="true"
                  />
                  <span
                    className="w-full max-w-[10px] rounded-t bg-chart-2 transition-[height] duration-300"
                    style={{ height: `${(day.completed / axisTop) * 100}%` }}
                    aria-hidden="true"
                  />

                  {isHovered && (
                    <div className="pointer-events-none absolute bottom-full z-20 mb-2 w-max -translate-x-0 rounded-lg border border-line bg-surface-raised px-2.5 py-1.5 text-xs shadow-pop">
                      <p className="font-medium text-ink">{format(day.date, 'EEE d MMM')}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-ink-muted">
                        <span className="h-2 w-2 rounded-sm bg-chart-1" aria-hidden="true" />
                        {day.created} added
                      </p>
                      <p className="flex items-center gap-1.5 text-ink-muted">
                        <span className="h-2 w-2 rounded-sm bg-chart-2" aria-hidden="true" />
                        {day.completed} completed
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Label only the ends and today, never every column. */}
          <div className="mt-1.5 flex gap-1 pl-7">
            {data.map((day, index) => (
              <span
                key={day.date.toISOString()}
                className={cn(
                  'flex-1 text-center text-[10px] text-ink-subtle',
                  index !== 0 && index !== data.length - 1 && 'invisible sm:visible sm:opacity-0',
                  index === data.length - 1 && 'font-medium text-ink-muted',
                )}
              >
                {index === data.length - 1 ? 'Today' : format(day.date, 'd MMM')}
              </span>
            ))}
          </div>
        </div>
      )}
    </ChartFrame>
  );
}
