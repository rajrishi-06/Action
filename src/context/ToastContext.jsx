import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const ToastContext = createContext(null);

const DEFAULT_DURATION = 5000;

/**
 * Toast notifications.
 *
 * Replaces the previous mix of `alert()` and silent `console.error` calls, and
 * carries the undo affordance for destructive actions.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    ({ title, description, variant = 'default', duration = DEFAULT_DURATION, action }) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((current) => [...current.slice(-3), { id, title, description, variant, action }]);

      if (duration !== Infinity) {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), duration),
        );
      }
      return id;
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({
      toasts,
      dismiss,
      toast: push,
      success: (title, options = {}) => push({ ...options, title, variant: 'success' }),
      error: (title, options = {}) =>
        push({ ...options, title, variant: 'error', duration: options.duration ?? 8000 }),
      info: (title, options = {}) => push({ ...options, title, variant: 'default' }),
    }),
    [toasts, push, dismiss],
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside a ToastProvider');
  return context;
}
