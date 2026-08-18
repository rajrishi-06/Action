import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { TodoProvider } from './context/TodoContext';
import { PomodoroProvider } from './context/PomodoroContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster } from './components/ui/Toaster';
import { AppLayout } from './routes/AppLayout';
import { TasksView } from './routes/TasksView';
import { AuthView } from './routes/AuthView';
import { SetupView } from './routes/SetupView';
import { NotFound } from './routes/NotFound';
import { Spinner } from './components/ui/primitives';
import { isSupabaseConfigured } from './lib/env';

/**
 * Heavier, less-visited views are split out of the initial bundle. The board
 * pulls in the whole drag-and-drop library and the insights page pulls in the
 * charts — neither should be paid for by someone who only opens Today.
 */
const BoardView = lazy(() => import('./routes/BoardView').then((m) => ({ default: m.BoardView })));
const CalendarView = lazy(() => import('./routes/CalendarView').then((m) => ({ default: m.CalendarView })));
const FocusView = lazy(() => import('./routes/FocusView').then((m) => ({ default: m.FocusView })));
const AnalyticsView = lazy(() => import('./routes/AnalyticsView').then((m) => ({ default: m.AnalyticsView })));
const SettingsView = lazy(() => import('./routes/SettingsView').then((m) => ({ default: m.SettingsView })));

function FullPageSpinner({ label = 'Loading' }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner className="h-6 w-6" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

/** Blocks the app routes until a session exists, preserving the target URL. */
function RequireAuth({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <FullPageSpinner label="Checking your session" />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function PublicOnly({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <FullPageSpinner label="Checking your session" />;
  if (isAuthenticated) return <Navigate to="/app/today" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnly><AuthView /></PublicOnly>} />

      <Route
        path="/app"
        element={
          <RequireAuth>
            <PomodoroProvider>
              <AppLayout />
            </PomodoroProvider>
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/app/today" replace />} />
        <Route path="today" element={<TasksView scope="today" />} />
        <Route path="upcoming" element={<TasksView scope="upcoming" />} />
        <Route path="all" element={<TasksView scope="all" />} />
        <Route path="completed" element={<TasksView scope="completed" />} />
        <Route path="board" element={<BoardView />} />
        <Route path="calendar" element={<CalendarView />} />
        <Route path="focus" element={<FocusView />} />
        <Route path="analytics" element={<AnalyticsView />} />
        <Route path="settings" element={<SettingsView />} />
      </Route>

      {/* Keep old bookmarks working. */}
      <Route path="/" element={<Navigate to="/app/today" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  // Without credentials there is nothing to authenticate against, so show the
  // setup guide rather than a broken login form.
  if (!isSupabaseConfigured) {
    return (
      <ThemeProvider>
        <SetupView />
      </ThemeProvider>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <TodoProvider>
              <BrowserRouter>
                <Suspense fallback={<FullPageSpinner />}>
                  <AppRoutes />
                </Suspense>
              </BrowserRouter>
              <Toaster />
            </TodoProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
