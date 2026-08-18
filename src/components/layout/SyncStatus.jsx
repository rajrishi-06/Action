import { CloudOff, RefreshCw } from 'lucide-react';
import { useTodo } from '../../context/TodoContext';
import { useOnline } from '../../hooks/useMediaQuery';
import { cn } from '../../lib/cn';

/**
 * Pending-sync indicator.
 *
 * Writes made offline are held in a durable queue and replayed on reconnect. A
 * queue the user cannot see is worse than no queue at all — they would have no
 * way to know whether their work is safe — so this is always visible while
 * anything is waiting.
 */
export function SyncStatus({ className }) {
  const { queuedWrites, flushOutbox } = useTodo();
  const online = useOnline();

  if (queuedWrites === 0) return null;

  return (
    <button
      type="button"
      onClick={flushOutbox}
      title={online ? 'Retry now' : 'Waiting for a connection'}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1',
        'text-xs font-medium text-amber-800 transition-colors hover:bg-amber-100',
        'dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300 dark:hover:bg-amber-950',
        className,
      )}
    >
      {online ? (
        <RefreshCw className="h-3 w-3" aria-hidden="true" />
      ) : (
        <CloudOff className="h-3 w-3" aria-hidden="true" />
      )}
      {queuedWrites} waiting to sync
    </button>
  );
}
