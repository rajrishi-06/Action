import { useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu, Search } from 'lucide-react';
import { Sidebar } from '../components/layout/Sidebar';
import { ThemeToggle } from '../components/layout/ThemeToggle';
import { SyncStatus } from '../components/layout/SyncStatus';
import { CommandPalette } from '../components/CommandPalette';
import { ShortcutsDialog } from '../components/ShortcutsDialog';
import { TaskDetail } from '../components/tasks/TaskDetail';
import { useTodo } from '../context/TodoContext';
import { useHotkeys, modKeyLabel } from '../hooks/useHotkeys';
import { IconButton } from '../components/ui/Button';
import { Kbd } from '../components/ui/primitives';
import { cn } from '../lib/cn';

/**
 * Application shell.
 *
 * Owns the three things every view needs — the command palette, the task
 * detail dialog and the global shortcuts — so individual routes stay focused
 * on their own content.
 */
export function AppLayout() {
  const location = useLocation();
  const { tasks } = useTodo();

  // The board, calendar and charts need horizontal room; reading views are
  // easier to scan at a narrower measure.
  const isWideView = ['/app/board', '/app/calendar', '/app/analytics'].includes(location.pathname);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [openTaskId, setOpenTaskId] = useState(null);
  const searchRef = useRef(null);

  // The dialog reads the task from the live list, so edits made elsewhere
  // (or arriving over realtime) stay reflected while it is open.
  const openTask = openTaskId ? tasks.find((task) => task.id === openTaskId) : null;

  useHotkeys({
    'mod+k': (event) => {
      event.preventDefault();
      setPaletteOpen((current) => !current);
    },
    '/': (event) => {
      event.preventDefault();
      searchRef.current?.focus();
    },
    '?': (event) => {
      event.preventDefault();
      setShortcutsOpen(true);
    },
    escape: () => {
      setSidebarOpen(false);
    },
  });

  return (
    <div className="min-h-screen bg-canvas">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="md:pl-64">
        {/* Mobile header — the desktop layout puts navigation in the sidebar. */}
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-canvas/90 px-4 py-2.5 backdrop-blur md:hidden">
          <IconButton
            label="Open navigation"
            aria-controls="app-sidebar"
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </IconButton>
          <img src="/logo.png" alt="" width="24" height="24" className="h-6 w-6 rounded bg-white object-contain ring-1 ring-line" />
          <span className="font-display text-lg font-bold brand-gradient-text">Action</span>
          <div className="ml-auto flex items-center gap-1">
            <SyncStatus />
            <IconButton label="Open command palette" onClick={() => setPaletteOpen(true)}>
              <Search className="h-4 w-4" />
            </IconButton>
            <ThemeToggle />
          </div>
        </header>

        <main
          id="main-content"
          className={cn('mx-auto w-full px-4 py-6 sm:px-6 lg:px-8', isWideView ? 'max-w-7xl' : 'max-w-5xl')}
        >
          {/* Desktop utility row */}
          <div className="mb-4 hidden items-center justify-end gap-2 md:flex">
            <SyncStatus className="mr-auto" />
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink-subtle transition-colors hover:border-line-strong hover:text-ink"
            >
              <Search className="h-3.5 w-3.5" />
              Search or run a command
              <span className="flex gap-1">
                <Kbd>{modKeyLabel}</Kbd>
                <Kbd>K</Kbd>
              </span>
            </button>
            <ThemeToggle />
          </div>

          {/* `key` on the route content restarts enter animations per view. */}
          <Outlet key={location.pathname} context={{ searchRef, openTask: setOpenTaskId }} />
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <TaskDetail task={openTask} open={Boolean(openTask)} onClose={() => setOpenTaskId(null)} />
    </div>
  );
}
