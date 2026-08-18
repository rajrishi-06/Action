import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

const VARIANTS = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-sm',
  secondary:
    'bg-surface text-ink border border-line hover:bg-surface-sunken hover:border-line-strong',
  ghost: 'text-ink-muted hover:bg-surface-sunken hover:text-ink',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 shadow-sm',
  'danger-ghost': 'text-ink-muted hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40',
  accent: 'bg-accent-500 text-white hover:bg-accent-600 shadow-sm',
};

const SIZES = {
  xs: 'h-7 px-2 text-xs gap-1 rounded-md',
  sm: 'h-8 px-3 text-sm gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-11 px-5 text-base gap-2 rounded-xl',
};

/**
 * The one button in the app. Every clickable affordance routes through this so
 * focus rings, disabled states and loading behaviour stay identical everywhere.
 */
export const Button = forwardRef(function Button(
  { variant = 'secondary', size = 'md', loading = false, className, children, disabled, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-colors',
        'disabled:pointer-events-none disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
});

/**
 * Icon-only button. `label` is required and becomes the accessible name —
 * icon buttons without one are invisible to screen readers.
 */
export const IconButton = forwardRef(function IconButton(
  { label, size = 'md', variant = 'ghost', className, children, ...props },
  ref,
) {
  const dimensions = { xs: 'h-7 w-7', sm: 'h-8 w-8', md: 'h-9 w-9', lg: 'h-10 w-10' }[size];
  return (
    <Button
      ref={ref}
      variant={variant}
      size={size}
      aria-label={label}
      title={label}
      className={cn('px-0', dimensions, className)}
      {...props}
    >
      {children}
    </Button>
  );
});
