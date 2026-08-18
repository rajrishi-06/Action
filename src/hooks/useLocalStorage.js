import { useCallback, useEffect, useState } from 'react';

/**
 * State backed by localStorage, safe in private mode and across tabs.
 * Writes are wrapped because Safari throws on setItem when storage is full or
 * disabled, and a crashing preference toggle is worse than one that forgets.
 */
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const set = useCallback(
    (next) => {
      setValue((current) => {
        const resolved = typeof next === 'function' ? next(current) : next;
        try {
          window.localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          /* storage unavailable — keep the in-memory value */
        }
        return resolved;
      });
    },
    [key],
  );

  // Keep multiple tabs of the app in sync.
  useEffect(() => {
    const onStorage = (event) => {
      if (event.key !== key || event.newValue === null) return;
      try {
        setValue(JSON.parse(event.newValue));
      } catch {
        /* ignore malformed values written by another version */
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key]);

  return [value, set];
}
