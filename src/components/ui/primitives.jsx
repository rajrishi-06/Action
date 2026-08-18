import { cn } from '../../lib/cn';

/** Small status/label pill. */
export function Badge({ children, className, tone = 'neutral', ...props }) {
  const tones = {
    neutral: 'bg-surface-sunken text-ink-muted border-line',
    brand: 'bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-950/50 dark:text-brand-300 dark:border-brand-900',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900',
    warning: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900',
    danger: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-900',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium',
        tones[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function Card({ className, children, ...props }) {
  return (
    <div className={cn('rounded-2xl border border-line bg-surface shadow-card', className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ title, description, icon, action, className }) {
  return (
    <div className={cn('flex items-start justify-between gap-4 px-5 pb-3 pt-5', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon && <div className="mt-0.5 text-brand-600 dark:text-brand-400">{icon}</div>}
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-ink-muted">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

/** Keyboard key indicator. */
export function Kbd({ children, className }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded border border-line',
        'bg-surface-sunken px-1.5 font-sans text-[11px] font-medium text-ink-muted',
        className,
      )}
    >
      {children}
    </kbd>
  );
}

export function Spinner({ className }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn('inline-block h-4 w-4 animate-spin rounded-full border-2 border-line border-t-brand-600', className)}
    />
  );
}

/** Shimmering placeholder used while data loads. */
export function Skeleton({ className }) {
  return (
    <div className={cn('relative overflow-hidden rounded-lg bg-surface-sunken', className)}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-black/[0.04] to-transparent dark:via-white/[0.06]" />
    </div>
  );
}

/** Consistent empty state: illustration slot, message, and a way forward. */
export function EmptyState({ icon, title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-16 text-center', className)}>
      {icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-sunken text-ink-subtle">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Accessible on/off switch. */
export function Switch({ checked, onChange, label, description, id }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start justify-between gap-4">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-ink-muted">{description}</span>}
      </span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 h-6 w-11 flex-shrink-0 rounded-full transition-colors',
          checked ? 'bg-brand-600' : 'bg-line-strong',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
            checked ? 'translate-x-[1.375rem]' : 'translate-x-0.5',
          )}
        />
      </button>
    </label>
  );
}

/** Horizontal progress meter with a proper ARIA role. */
export function Progress({ value, max = 100, className, barClassName, label }) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-surface-sunken', className)}
    >
      <div
        className={cn('h-full rounded-full bg-brand-600 transition-[width] duration-500', barClassName)}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
