import { ChartFrame, DataTable } from './ChartParts';
import { cn } from '../../lib/cn';

/**
 * Horizontal bar list for a single series — the right form when the categories
 * have long labels and the question is "which are biggest".
 *
 * One series means no legend: the title already says what is plotted.
 */
export function BarList({ title, description, items, emptyMessage, valueLabel = 'Count', barClassName = 'bg-chart-1' }) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <ChartFrame
      title={title}
      description={description}
      tableView={
        items.length > 0 ? (
          <DataTable columns={[title, valueLabel]} rows={items.map((item) => [item.label, item.value])} />
        ) : null
      }
    >
      {items.length === 0 ? (
        <p className="py-10 text-center text-sm text-ink-muted">{emptyMessage}</p>
      ) : (
        <ul className="space-y-2.5">
          {items.map((item) => (
            <li key={item.label} className="flex items-center gap-3">
              <span className="w-24 flex-shrink-0 truncate text-xs text-ink-muted" title={item.label}>
                {item.label}
              </span>
              <span className="h-5 min-w-0 flex-1 overflow-hidden rounded-sm bg-surface-sunken">
                <span
                  className={cn('block h-full rounded-r transition-[width] duration-500', item.className ?? barClassName)}
                  style={{ width: `${Math.max((item.value / max) * 100, item.value > 0 ? 3 : 0)}%` }}
                />
              </span>
              <span className="w-10 flex-shrink-0 text-right text-xs font-medium tabular-nums text-ink">
                {item.display ?? item.value}
              </span>
            </li>
          ))}
        </ul>
      )}
    </ChartFrame>
  );
}
