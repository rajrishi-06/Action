import { Component } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

/**
 * Top-level crash guard.
 *
 * Without this a render error anywhere unmounts the whole tree and leaves the
 * user on a blank white page with nothing to act on.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Where a real error reporter (Sentry, etc.) would be wired in.
    console.error('Unhandled UI error:', error, info?.componentStack);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas p-6">
        <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 text-center shadow-card">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h1 className="text-lg font-semibold text-ink">Something broke</h1>
          <p className="mt-2 text-sm text-ink-muted">
            The app hit an unexpected error. Your tasks are safe — they live on the server, not in
            this screen.
          </p>
          {import.meta.env.DEV && (
            <pre className="mt-4 max-h-40 overflow-auto rounded-lg bg-surface-sunken p-3 text-left text-xs text-ink-muted">
              {error.message}
            </pre>
          )}
          <div className="mt-6 flex justify-center gap-2">
            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-line px-4 text-sm font-medium text-ink hover:bg-surface-sunken"
            >
              <RotateCcw className="h-4 w-4" />
              Try again
            </button>
            <button
              type="button"
              onClick={() => window.location.assign('/')}
              className="h-10 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700"
            >
              Reload the app
            </button>
          </div>
        </div>
      </div>
    );
  }
}
