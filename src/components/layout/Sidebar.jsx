import { NavLink } from 'react-router-dom';
import {
  BarChart3, CalendarDays, CheckCircle2, Columns3, Inbox, ListTodo,
  LogOut, Settings, Sun, Timer, X,
} from 'lucide-react';
import { useTodo } from '../../context/TodoContext';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/cn';
import { IconButton } from '../ui/Button';
import { Kbd } from '../ui/primitives';
import { modKeyLabel } from '../../hooks/useHotkeys';

const VIEWS = [
  { to: '/app/today', label: 'Today', icon: Sun, countKey: 'today' },
  { to: '/app/upcoming', label: 'Upcoming', icon: CalendarDays, countKey: 'upcoming' },
  { to: '/app/all', label: 'All tasks', icon: Inbox, countKey: 'all' },
  { to: '/app/completed', label: 'Completed', icon: CheckCircle2, countKey: 'completed' },
];

const WORKSPACES = [
  { to: '/app/board', label: 'Board', icon: Columns3 },
  { to: '/app/calendar', label: 'Calendar', icon: ListTodo },
  { to: '/app/focus', label: 'Focus', icon: Timer },
  { to: '/app/analytics', label: 'Insights', icon: BarChart3 },
];

function NavItem({ to, label, icon: Icon, count, onNavigate }) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300'
            : 'text-ink-muted hover:bg-surface-sunken hover:text-ink',
        )
      }
    >
      <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count > 0 && (
        <span className="rounded-full bg-surface-sunken px-1.5 py-0.5 text-xs font-normal text-ink-muted">
          {count}
        </span>
      )}
    </NavLink>
  );
}

/**
 * Primary navigation.
 *
 * Every destination is a real route, so views are linkable, bookmarkable and
 * work with the browser back button — previously the whole app was a single
 * URL with the view held in component state.
 */
export function Sidebar({ open, onClose }) {
  const { counts } = useTodo();
  const { displayName, email, avatarUrl, signOut } = useAuth();

  return (
    <>
      {/* Mobile scrim */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[2px] transition-opacity md:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        id="app-sidebar"
        aria-label="Main navigation"
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-line bg-surface',
          'transition-transform duration-200 md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center gap-2.5 px-4 py-4">
          <img src="/logo.png" alt="" width="32" height="32" className="h-8 w-8 rounded-lg bg-white object-contain ring-1 ring-line" />
          <span className="font-display text-xl font-bold brand-gradient-text">Action</span>
          <IconButton label="Close navigation" size="sm" className="ml-auto md:hidden" onClick={onClose}>
            <X className="h-4 w-4" />
          </IconButton>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4 scrollbar-thin">
          <div className="space-y-0.5">
            <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-ink-subtle">Tasks</p>
            {VIEWS.map((view) => (
              <NavItem key={view.to} {...view} count={counts[view.countKey]} onNavigate={onClose} />
            ))}
          </div>

          <div className="space-y-0.5">
            <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-ink-subtle">Workspace</p>
            {WORKSPACES.map((view) => (
              <NavItem key={view.to} {...view} onNavigate={onClose} />
            ))}
          </div>
        </nav>

        <div className="border-t border-line p-3">
          <div className="mb-2 hidden items-center justify-between rounded-lg bg-surface-sunken px-3 py-2 md:flex">
            <span className="text-xs text-ink-muted">Command palette</span>
            <span className="flex gap-1">
              <Kbd>{modKeyLabel}</Kbd>
              <Kbd>K</Kbd>
            </span>
          </div>

          <NavItem to="/app/settings" label="Settings" icon={Settings} onNavigate={onClose} />

          <div className="mt-2 flex items-center gap-2.5 rounded-lg px-3 py-2">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
            ) : (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold uppercase text-white">
                {displayName.charAt(0)}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{displayName}</p>
              <p className="truncate text-xs text-ink-subtle">{email}</p>
            </div>
            <IconButton label="Sign out" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </IconButton>
          </div>
        </div>
      </aside>
    </>
  );
}
