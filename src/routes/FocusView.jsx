import { useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Bell, Pause, Play, RotateCcw, SkipForward, Timer } from 'lucide-react';
import { MODES, usePomodoro } from '../context/PomodoroContext';
import { useTodo } from '../context/TodoContext';
import { useToast } from '../context/ToastContext';
import { formatClock } from '../lib/date';
import { smartScore } from '../lib/analytics';
import { cn } from '../lib/cn';
import { Button, IconButton } from '../components/ui/Button';
import { Card, EmptyState, Switch } from '../components/ui/primitives';
import { TaskCheckbox } from '../components/tasks/TaskCheckbox';

const RING_RADIUS = 92;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/** Circular countdown. Progress is drawn with a stroke offset, not an image. */
function TimerRing({ progress, children }) {
  return (
    <div className="relative flex h-56 w-56 items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 200 200" aria-hidden="true">
        <circle
          cx="100" cy="100" r={RING_RADIUS}
          className="fill-none stroke-surface-sunken"
          strokeWidth="10"
        />
        <circle
          cx="100" cy="100" r={RING_RADIUS}
          className="fill-none stroke-brand-600 transition-[stroke-dashoffset] duration-300 ease-linear"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={RING_CIRCUMFERENCE * (1 - progress)}
        />
      </svg>
      <div className="relative text-center">{children}</div>
    </div>
  );
}

/**
 * Focus mode.
 *
 * Adds what the old Pomodoro was missing: a long-break mode that was defined
 * but unreachable (only two of the three buttons were rendered), a session
 * counter, sound and desktop notifications, configurable durations, and the
 * ability to attach the timer to a specific task.
 */
export function FocusView() {
  const {
    mode, running, remainingSeconds, progress, completedFocusSessions, taskId,
    settings, setSettings, start, pause, reset, switchMode, setTask,
    requestNotificationPermission, cyclesBeforeLongBreak,
  } = usePomodoro();
  const { tasks, toggleTask } = useTodo();
  const { openTask } = useOutletContext();
  const toast = useToast();

  const focusCandidates = useMemo(
    () =>
      tasks
        .filter((task) => !task.completed)
        .sort((a, b) => smartScore(b) - smartScore(a))
        .slice(0, 6),
    [tasks],
  );

  const activeTask = taskId ? tasks.find((task) => task.id === taskId) : null;

  const enableNotifications = async () => {
    const result = await requestNotificationPermission();
    if (result === 'granted') toast.success('Desktop notifications on');
    else if (result === 'denied') toast.error('Notifications blocked', { description: 'Enable them in your browser settings.' });
    else if (result === 'unsupported') toast.info('This browser does not support notifications');
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-ink">
          <Timer className="h-6 w-6 text-brand-600 dark:text-brand-400" aria-hidden="true" />
          Focus
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          The timer keeps running while you work in other views, and stays accurate in a
          background tab.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <Card className="flex flex-col items-center gap-6 p-6">
          <div role="tablist" aria-label="Timer mode" className="flex rounded-lg bg-surface-sunken p-1">
            {Object.entries(MODES).map(([key, config]) => (
              <button
                key={key}
                role="tab"
                type="button"
                aria-selected={mode === key}
                onClick={() => switchMode(key)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  mode === key ? 'bg-surface text-brand-700 shadow-sm dark:text-brand-300' : 'text-ink-muted hover:text-ink',
                )}
              >
                {config.label}
              </button>
            ))}
          </div>

          <TimerRing progress={progress}>
            <p
              className="font-mono text-5xl font-bold tabular-nums text-ink"
              aria-live="off"
              role="timer"
            >
              {formatClock(remainingSeconds)}
            </p>
            <p className="mt-1 text-sm text-ink-muted">
              {running ? MODES[mode].label : 'Paused'}
            </p>
          </TimerRing>

          {/* Announce only at a coarse grain, so screen readers are not flooded. */}
          <p className="sr-only" aria-live="polite">
            {running ? `${MODES[mode].label} running` : `${MODES[mode].label} paused`}
          </p>

          <div className="flex items-center gap-3">
            <IconButton label="Reset timer" onClick={() => reset()}>
              <RotateCcw className="h-4 w-4" />
            </IconButton>

            <Button
              size="lg"
              variant="primary"
              className="min-w-[8.5rem]"
              onClick={() => (running ? pause() : start())}
            >
              {running ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              {running ? 'Pause' : 'Start'}
            </Button>

            <IconButton
              label="Skip to next interval"
              onClick={() => switchMode(mode === 'focus' ? 'short' : 'focus')}
            >
              <SkipForward className="h-4 w-4" />
            </IconButton>
          </div>

          <div className="flex items-center gap-1.5" aria-label={`${completedFocusSessions} focus sessions completed`}>
            {Array.from({ length: cyclesBeforeLongBreak }, (_, index) => (
              <span
                key={index}
                aria-hidden="true"
                className={cn(
                  'h-2 w-2 rounded-full',
                  index < completedFocusSessions % cyclesBeforeLongBreak || (completedFocusSessions > 0 && completedFocusSessions % cyclesBeforeLongBreak === 0)
                    ? 'bg-brand-600'
                    : 'bg-line-strong',
                )}
              />
            ))}
            <span className="ml-2 text-xs text-ink-muted">
              {completedFocusSessions} session{completedFocusSessions === 1 ? '' : 's'} today
            </span>
          </div>

          {activeTask && (
            <div className="flex w-full items-center gap-2.5 rounded-xl border border-line bg-surface-sunken px-3 py-2.5">
              <TaskCheckbox
                size="sm"
                checked={activeTask.completed}
                onChange={() => toggleTask(activeTask.id)}
                title={activeTask.title}
              />
              <button type="button" onClick={() => openTask(activeTask.id)} className="min-w-0 flex-1 truncate text-left text-sm font-medium text-ink">
                {activeTask.title}
              </button>
              <button type="button" onClick={() => setTask(null)} className="text-xs text-ink-subtle hover:text-ink">
                Clear
              </button>
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold text-ink">Work on</h2>
            {focusCandidates.length === 0 ? (
              <EmptyState className="py-8" title="Nothing to focus on" description="Add a task and it will show up here." />
            ) : (
              <ul className="space-y-1">
                {focusCandidates.map((task) => (
                  <li key={task.id}>
                    <button
                      type="button"
                      onClick={() => setTask(task.id)}
                      aria-pressed={taskId === task.id}
                      className={cn(
                        'w-full truncate rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                        taskId === task.id
                          ? 'bg-brand-50 font-medium text-brand-700 dark:bg-brand-950/50 dark:text-brand-300'
                          : 'text-ink-muted hover:bg-surface-sunken hover:text-ink',
                      )}
                    >
                      {task.title}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="space-y-4 p-4">
            <h2 className="text-sm font-semibold text-ink">Timer settings</h2>

            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'focusMinutes', label: 'Focus' },
                { key: 'shortMinutes', label: 'Short' },
                { key: 'longMinutes', label: 'Long' },
              ].map(({ key, label }) => (
                <label key={key} className="block">
                  <span className="mb-1 block text-xs text-ink-muted">{label}</span>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={settings[key]}
                    onChange={(event) =>
                      setSettings({ ...settings, [key]: Math.min(120, Math.max(1, Number(event.target.value) || 1)) })
                    }
                    className="w-full rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-ink outline-none focus:border-brand-500"
                  />
                </label>
              ))}
            </div>

            <Switch
              id="auto-start"
              checked={settings.autoStartBreaks}
              onChange={(value) => setSettings({ ...settings, autoStartBreaks: value })}
              label="Auto-start next interval"
              description="Roll straight into breaks and focus blocks."
            />

            <Switch
              id="sound"
              checked={settings.soundEnabled}
              onChange={(value) => setSettings({ ...settings, soundEnabled: value })}
              label="Chime when an interval ends"
            />

            <Button size="sm" variant="secondary" className="w-full" onClick={enableNotifications}>
              <Bell className="h-3.5 w-3.5" />
              Enable desktop notifications
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
