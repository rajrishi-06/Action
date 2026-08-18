import { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { usePrefersDark } from '../hooks/useMediaQuery';

const ThemeContext = createContext(null);

export const THEMES = ['light', 'dark', 'system'];
const STORAGE_KEY = 'action.theme';

/**
 * Theme provider.
 *
 * Tailwind is configured with `darkMode: 'class'`, so the dark palette only
 * applies when `.dark` is on <html>. The matching pre-paint script lives in
 * index.html and reads the same storage key, which is what prevents a flash of
 * the wrong theme on load.
 */
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useLocalStorage(STORAGE_KEY, 'system');
  const prefersDark = usePrefersDark();

  const apply = useCallback((value, systemPrefersDark) => {
    const dark = value === 'dark' || (value === 'system' && systemPrefersDark);
    document.documentElement.classList.toggle('dark', dark);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', dark ? '#0c0f16' : '#ffffff');
  }, []);

  // Re-runs when the preference changes *and* when the OS setting changes,
  // so "system" keeps following the OS without a second subscription.
  useEffect(() => {
    apply(theme, prefersDark);
  }, [theme, prefersDark, apply]);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      /** Cycle light -> dark -> system, for the toolbar button. */
      cycleTheme: () => setTheme((current) => THEMES[(THEMES.indexOf(current) + 1) % THEMES.length]),
      resolvedTheme: theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme,
    }),
    [theme, setTheme, prefersDark],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside a ThemeProvider');
  return context;
}
