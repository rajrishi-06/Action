import { Check } from 'lucide-react';
import { cn } from '../../lib/cn';

/**
 * Completion toggle.
 *
 * A real checkbox input under the hood: it is reachable by keyboard, announces
 * its state, and carries the task title as its accessible name so a screen
 * reader says "Buy milk, checkbox, not checked" rather than just "checkbox".
 */
export function TaskCheckbox({ checked, onChange, title, size = 'md', className }) {
  const dimensions = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  const iconSize = size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3';

  return (
    <label className={cn('relative inline-flex flex-shrink-0 cursor-pointer items-center', className)}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="peer sr-only"
        aria-label={checked ? `Mark "${title}" as not done` : `Mark "${title}" as done`}
      />
      <span
        aria-hidden="true"
        className={cn(
          'flex items-center justify-center rounded-full border-2 transition-all',
          'peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-canvas',
          dimensions,
          checked
            ? 'border-brand-600 bg-brand-600 text-white'
            : 'border-line-strong text-transparent hover:border-brand-500',
        )}
      >
        <Check className={cn(iconSize, 'stroke-[3]')} />
      </span>
    </label>
  );
}
