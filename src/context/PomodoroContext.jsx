import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useToast } from './ToastContext';

const PomodoroContext = createContext(null);

export const MODES = {
  focus: { label: 'Focus', minutes: 25, tone: 'brand' },
  short: { label: 'Short break', minutes: 5, tone: 'emerald' },
  long: { label: 'Long break', minutes: 15, tone: 'accent' },
};

const STORAGE_KEY = 'action.pomodoro';
const CYCLES_BEFORE_LONG_BREAK = 4;

/**
 * Focus timer.
 *
 * Deliberately timestamp-based rather than "decrement a counter every second".
 * Browsers throttle `setInterval` in background tabs to once per minute, so the
 * old counter approach silently lost minutes whenever the user switched away.
 * Here the remaining time is always derived from a wall-clock end time, which
 * stays correct across throttling, sleep and a full page reload.
 *
 * Lifting it into a provider also means the timer keeps running while you work
 * in other views instead of resetting every time the component unmounts.
 */
export function PomodoroProvider({ children }) {
  const toast = useToast();

  const [settings, setSettings] = useLocalStorage(`${STORAGE_KEY}.settings`, {
    focusMinutes: MODES.focus.minutes,
    shortMinutes: MODES.short.minutes,
    longMinutes: MODES.long.minutes,
    autoStartBreaks: true,
    soundEnabled: true,
  });

  const [session, setSession] = useLocalStorage(`${STORAGE_KEY}.session`, {
    mode: 'focus',
    endsAt: null,
    remainingMs: MODES.focus.minutes * 60_000,
    running: false,
    completedFocusSessions: 0,
    taskId: null,
  });

  const [now, setNow] = useState(() => Date.now());
  const audioContextRef = useRef(null);

  const durationFor = useCallback(
    (mode) =>
      ({
        focus: settings.focusMinutes,
        short: settings.shortMinutes,
        long: settings.longMinutes,
      })[mode] * 60_000,
    [settings],
  );

  // A single ticking clock; the remaining time is computed from it.
  useEffect(() => {
    if (!session.running) return undefined;
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, [session.running]);

  const remainingMs = session.running
    ? Math.max(0, (session.endsAt ?? 0) - now)
    : session.remainingMs;

  const totalMs = durationFor(session.mode);
  const progress = totalMs > 0 ? 1 - remainingMs / totalMs : 0;

  /** Short chime built with the Web Audio API — no asset to ship or fail to load. */
  const playChime = useCallback(() => {
    if (!settings.soundEnabled) return;
    try {
      audioContextRef.current ??= new (window.AudioContext ?? window.webkitAudioContext)();
      const context = audioContextRef.current;
      const start = context.currentTime;

      [880, 1174.7].forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, start + index * 0.18);
        gain.gain.exponentialRampToValueAtTime(0.25, start + index * 0.18 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + index * 0.18 + 0.35);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(start + index * 0.18);
        oscillator.stop(start + index * 0.18 + 0.4);
      });
    } catch {
      /* audio unavailable — the toast still fires */
    }
  }, [settings.soundEnabled]);

  const notify = useCallback((title, body) => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    try {
      new Notification(title, { body, icon: '/icon-192.png', tag: 'action-pomodoro' });
    } catch {
      /* notification failed — non-critical */
    }
  }, []);

  const start = useCallback(
    (mode = session.mode, taskId = session.taskId) => {
      const duration = mode === session.mode && session.remainingMs > 0 && !session.running
        ? session.remainingMs
        : durationFor(mode);
      setNow(Date.now());
      setSession((current) => ({
        ...current,
        mode,
        taskId,
        running: true,
        endsAt: Date.now() + duration,
        remainingMs: duration,
      }));
    },
    [session.mode, session.remainingMs, session.running, session.taskId, durationFor, setSession],
  );

  const pause = useCallback(() => {
    setSession((current) => ({
      ...current,
      running: false,
      remainingMs: Math.max(0, (current.endsAt ?? 0) - Date.now()),
      endsAt: null,
    }));
  }, [setSession]);

  const reset = useCallback(
    (mode = session.mode) => {
      setSession((current) => ({
        ...current,
        mode,
        running: false,
        endsAt: null,
        remainingMs: durationFor(mode),
      }));
    },
    [session.mode, durationFor, setSession],
  );

  const switchMode = useCallback((mode) => reset(mode), [reset]);

  const setTask = useCallback(
    (taskId) => setSession((current) => ({ ...current, taskId })),
    [setSession],
  );

  // Handle the moment a session reaches zero.
  const completingRef = useRef(false);
  useEffect(() => {
    if (!session.running || remainingMs > 0 || completingRef.current) return;
    completingRef.current = true;

    const wasFocus = session.mode === 'focus';
    const completed = wasFocus ? session.completedFocusSessions + 1 : session.completedFocusSessions;
    const nextMode = wasFocus
      ? completed % CYCLES_BEFORE_LONG_BREAK === 0
        ? 'long'
        : 'short'
      : 'focus';

    playChime();
    notify(
      wasFocus ? 'Focus session complete' : 'Break over',
      wasFocus ? 'Time for a break.' : 'Back to it.',
    );
    toast.success(wasFocus ? 'Focus session complete' : 'Break finished', {
      description: wasFocus ? `${completed} completed today.` : 'Starting the next focus block.',
    });

    const autoStart = settings.autoStartBreaks;
    setSession((current) => ({
      ...current,
      mode: nextMode,
      completedFocusSessions: completed,
      running: autoStart,
      endsAt: autoStart ? Date.now() + durationFor(nextMode) : null,
      remainingMs: durationFor(nextMode),
    }));

    // Guard against re-entering while state settles.
    setTimeout(() => {
      completingRef.current = false;
    }, 500);
  }, [
    remainingMs, session.running, session.mode, session.completedFocusSessions,
    settings.autoStartBreaks, durationFor, playChime, notify, toast, setSession,
  ]);

  const requestNotificationPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    return Notification.requestPermission();
  }, []);

  const value = useMemo(
    () => ({
      mode: session.mode,
      running: session.running,
      remainingMs,
      remainingSeconds: Math.ceil(remainingMs / 1000),
      progress,
      completedFocusSessions: session.completedFocusSessions,
      taskId: session.taskId,
      settings,
      setSettings,
      start,
      pause,
      reset,
      switchMode,
      setTask,
      requestNotificationPermission,
      cyclesBeforeLongBreak: CYCLES_BEFORE_LONG_BREAK,
    }),
    [
      session.mode, session.running, session.completedFocusSessions, session.taskId,
      remainingMs, progress, settings, setSettings, start, pause, reset, switchMode,
      setTask, requestNotificationPermission,
    ],
  );

  return <PomodoroContext.Provider value={value}>{children}</PomodoroContext.Provider>;
}

export function usePomodoro() {
  const context = useContext(PomodoroContext);
  if (!context) throw new Error('usePomodoro must be used inside a PomodoroProvider');
  return context;
}
