/** Shared vocabulary for tasks. Imported by the parser, UI and analytics. */

export const PRIORITIES = ['urgent', 'high', 'medium', 'low'];

export const PRIORITY_META = {
  urgent: {
    label: 'Urgent',
    short: 'P1',
    weight: 4,
    xp: 50,
    dot: 'bg-rose-500',
    chip: 'text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-300 dark:bg-rose-950/50 dark:border-rose-900',
    accent: 'border-l-rose-500',
  },
  high: {
    label: 'High',
    short: 'P2',
    weight: 3,
    xp: 30,
    dot: 'bg-amber-500',
    chip: 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/50 dark:border-amber-900',
    accent: 'border-l-amber-500',
  },
  medium: {
    label: 'Medium',
    short: 'P3',
    weight: 2,
    xp: 20,
    dot: 'bg-brand-500',
    chip: 'text-brand-700 bg-brand-50 border-brand-200 dark:text-brand-300 dark:bg-brand-950/50 dark:border-brand-900',
    accent: 'border-l-brand-500',
  },
  low: {
    label: 'Low',
    short: 'P4',
    weight: 1,
    xp: 10,
    dot: 'bg-slate-400',
    chip: 'text-slate-600 bg-slate-50 border-slate-200 dark:text-slate-300 dark:bg-slate-800/60 dark:border-slate-700',
    accent: 'border-l-slate-400',
  },
};

export const DEFAULT_PRIORITY = 'medium';

/** Board columns. Persisted on the task so drag-and-drop actually survives a reload. */
export const STATUSES = ['backlog', 'today', 'doing', 'done'];

export const STATUS_META = {
  backlog: { label: 'Backlog', hint: 'Someday / not scheduled', accent: 'bg-slate-400' },
  today: { label: 'Planned', hint: 'Committed to doing', accent: 'bg-brand-500' },
  doing: { label: 'In progress', hint: 'Actively being worked on', accent: 'bg-accent-500' },
  done: { label: 'Done', hint: 'Completed', accent: 'bg-emerald-500' },
};

export const DEFAULT_STATUS = 'backlog';

export const RECURRENCE_LABELS = {
  daily: 'Every day',
  weekdays: 'Every weekday',
  weekly: 'Every week',
  monthly: 'Every month',
  yearly: 'Every year',
};

export function priorityWeight(priority) {
  return PRIORITY_META[priority]?.weight ?? PRIORITY_META[DEFAULT_PRIORITY].weight;
}

export function xpForPriority(priority) {
  return PRIORITY_META[priority]?.xp ?? PRIORITY_META[DEFAULT_PRIORITY].xp;
}

export function isValidPriority(value) {
  return PRIORITIES.includes(value);
}

export function isValidStatus(value) {
  return STATUSES.includes(value);
}
