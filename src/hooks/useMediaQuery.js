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
