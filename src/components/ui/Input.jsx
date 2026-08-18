import { forwardRef, useId } from 'react';
import { cn } from '../../lib/cn';

const baseField =
  'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-subtle ' +
  'transition-colors focus:border-brand-500 disabled:cursor-not-allowed disabled:opacity-60';

/** Text input with an always-associated label and optional error message. */
export const Input = forwardRef(function Input(
  { label, hint, error, className, id, leadingIcon, trailingSlot, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const describedBy = [hint && `${inputId}-hint`, error && `${inputId}-error`]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <div className="relative">
        {leadingIcon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle">
            {leadingIcon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={cn(
            baseField,
            leadingIcon && 'pl-9',
            trailingSlot && 'pr-10',
            error && 'border-rose-500 focus:border-rose-500',
            className,
          )}
          {...props}
        />
        {trailingSlot && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2">{trailingSlot}</span>
        )}
      </div>
      {hint && !error && (
        <p id={`${inputId}-hint`} className="text-xs text-ink-subtle">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${inputId}-error`} role="alert" className="text-xs font-medium text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}
    </div>
  );
});

export const Textarea = forwardRef(function Textarea({ label, className, id, rows = 3, ...props }, ref) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={textareaId} className="block text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        className={cn(baseField, 'resize-y leading-relaxed', className)}
        {...props}
      />
    </div>
  );
});

export const Select = forwardRef(function Select({ label, className, id, children, ...props }, ref) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <select ref={ref} id={selectId} className={cn(baseField, 'cursor-pointer pr-8', className)} {...props}>
        {children}
      </select>
    </div>
  );
});
