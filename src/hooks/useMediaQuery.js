import { useCallback, useSyncExternalStore } from 'react';

/**
 * Subscribe to a CSS media query.
 *
 * Uses `useSyncExternalStore`, which is the correct primitive for reading from
 * a browser API that changes outside React: it avoids the cascading render an
 * effect-plus-setState pair causes, and it stays consistent during concurrent
 * rendering.
 */
export function useMediaQuery(query) {
  const subscribe = useCallback(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);

  // Server/pre-render snapshot: assume the query does not match.
  const getServerSnapshot = useCallback(() => false, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export const usePrefersReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)');
export const usePrefersDark = () => useMediaQuery('(prefers-color-scheme: dark)');

/**
 * Whether the browser believes it has a connection.
 *
 * `navigator.onLine` only reports whether a network interface is up — it says
 * nothing about whether requests actually succeed — so treat it as a hint for
 * wording, never as proof. The queue length is the fact.
 */
export function useOnline() {
  const subscribe = useCallback((onChange) => {
    window.addEventListener('online', onChange);
    window.addEventListener('offline', onChange);
    return () => {
      window.removeEventListener('online', onChange);
      window.removeEventListener('offline', onChange);
    };
  }, []);

  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine !== false,
    () => true,
  );
}
