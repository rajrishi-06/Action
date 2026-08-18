import { useId, useState } from 'react';
import { cn } from '../../lib/cn';

/**
 * Shared chart furniture.
 *
 * Rules enforced here rather than re-decided per chart: a legend whenever there
 * are two or more series, text always in ink tokens (never the series colour),
 * recessive hairline gridlines, and a table view so nothing is gated behind
 * colour perception.
 */

export function ChartFrame({ title, description, legend, children, tableView }) {
  const [showTable, setShowTable] = useState(false);
  const tableId = useId();

  return (
    <figure className="rounded-2xl border border-line bg-surface p-5">
      <figcaption className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-ink-muted">{description}</p>}
        </div>
        <div className="flex items-center gap-3">
          {legend}
          {tableView && (
            <button
              type="button"
              onClick={() => setShowTable((current) => !current)}
              aria-expanded={showTable}
              aria-controls={tableId}
              className="rounded-md px-2 py-1 text-xs font-medium text-ink-muted hover:bg-surface-sunken hover:text-ink"
            >
              {showTable ? 'Chart' : 'Table'}
            </button>
          )}
        </div>
      </figcaption>

      {showTable && tableView ? (
        <div id={tableId} className="max-h-64 overflow-auto scrollbar-thin">
          {tableView}
        </div>
      ) : (
        children
      )}
    </figure>
  );
}

/** Identity key. A swatch beside ink-coloured text, never coloured text. */
export function Legend({ items }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5 text-xs text-ink-muted">
          <span className={cn('h-2.5 w-2.5 rounded-sm', item.className)} aria-hidden="true" />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

/** Simple data table rendered from rows, used for every chart's table view. */
export function DataTable({ columns, rows }) {
  return (
    <table className="w-full text-left text-xs">
      <thead className="sticky top-0 bg-surface">
        <tr className="border-b border-line">
          {columns.map((column) => (
            <th key={column} scope="col" className="px-2 py-1.5 font-medium text-ink-muted">
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={index} className="border-b border-line last:border-b-0">
            {row.map((cell, cellIndex) => (
              <td key={cellIndex} className="px-2 py-1.5 text-ink tabular-nums">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Headline number. Not a chart — the right form for a single value. */
export function StatTile({ label, value, hint, icon, tone = 'default' }) {
  const tones = {
    default: 'text-ink',
    danger: 'text-rose-600 dark:text-rose-400',
    success: 'text-emerald-600 dark:text-emerald-400',
  };

  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center gap-2 text-ink-muted">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className={cn('mt-2 font-display text-3xl font-bold tabular-nums', tones[tone])}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-subtle">{hint}</p>}
    </div>
  );
}
