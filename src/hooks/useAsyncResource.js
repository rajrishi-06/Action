import { useEffect, useState } from 'react';

/**
 * Run an async loader when its dependencies change, with cancellation.
 *
 * This exists so the "kick off a request, show a spinner, ignore the result if
 * the inputs changed" pattern lives in exactly one place instead of being
 * re-implemented (and subtly mis-implemented) in every component that needs it.
 *
 * @param {(options: { signal: AbortSignal }) => Promise<unknown>} loader
 * @param {unknown[]} deps Re-run whenever these change.
 * @param {{ enabled?: boolean, initialData?: unknown }} [options]
 * @returns {{ data: unknown, loading: boolean, error: Error|null, reload: () => void }}
 */
export function useAsyncResource(loader, deps, { enabled = true, initialData = null } = {}) {
  const [state, setState] = useState({ data: initialData, loading: false, error: null });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setState({ data: initialData, loading: false, error: null });
      return undefined;
    }

    const controller = new AbortController();
    let cancelled = false;

    // The loading flag is set inside the async continuation rather than in the
    // effect body: setting state synchronously during an effect triggers a
    // second render pass before the browser paints, which `react-hooks` warns
    // about. Yielding once costs nothing perceptible and keeps the effect clean.
    const run = async () => {
      await Promise.resolve();
      if (cancelled) return;
      setState((current) => ({ ...current, loading: true, error: null }));

      try {
        const data = await loader({ signal: controller.signal });
        if (!cancelled) setState({ data, loading: false, error: null });
      } catch (error) {
        if (!cancelled && error?.name !== 'AbortError') {
          setState({ data: initialData, loading: false, error });
        }
      }
    };

    run();

    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled, nonce]);

  return { ...state, reload: () => setNonce((n) => n + 1) };
}
