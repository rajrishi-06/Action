import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-6">
      <div className="text-center">
        <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-sunken text-ink-subtle">
          <Compass className="h-7 w-7" aria-hidden="true" />
        </span>
        <p className="font-mono text-sm text-ink-subtle">404</p>
        <h1 className="mt-1 font-display text-2xl font-bold text-ink">This page does not exist</h1>
        <p className="mt-2 text-sm text-ink-muted">The link may be old, or the address mistyped.</p>
        <Link
          to="/app/today"
          className="mt-6 inline-flex h-10 items-center rounded-lg bg-brand-600 px-5 text-sm font-medium text-white hover:bg-brand-700"
        >
          Back to Today
        </Link>
      </div>
    </div>
  );
}
