import {
  differenceInCalendarDays,
  format,
  isSameDay,
  isThisYear,
  isToday,
  isTomorrow,
  isYesterday,
  startOfDay,
} from 'date-fns';

export const toDate = (value) => (value instanceof Date ? value : value ? new Date(value) : null);

/** "Today · 5:00 PM", "Tomorrow", "Fri 13 Mar", "12 Mar 2027". */
export function formatDueDate(value, withTime = true) {
  const date = toDate(value);
  if (!date || Number.isNaN(date.getTime())) return '';

  const time = withTime ? ` · ${format(date, 'h:mm a')}` : '';

  if (isToday(date)) return `Today${time}`;
  if (isTomorrow(date)) return `Tomorrow${time}`;
  if (isYesterday(date)) return `Yesterday${time}`;

  const days = differenceInCalendarDays(date, new Date());
  if (days > 0 && days < 7) return `${format(date, 'EEEE')}${time}`;
  if (isThisYear(date)) return `${format(date, 'EEE d MMM')}${time}`;
  return `${format(date, 'd MMM yyyy')}${time}`;
}

/** Short form used in dense lists and board cards. */
export function formatDueShort(value) {
  const date = toDate(value);
  if (!date) return '';
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  if (isYesterday(date)) return 'Yesterday';
  if (isThisYear(date)) return format(date, 'd MMM');
  return format(date, 'd MMM yy');
}

export function isOverdue(task) {
  const date = toDate(task?.dueDate);
  return Boolean(date && !task.completed && date.getTime() < Date.now());
}

export function isDueToday(task) {
  const date = toDate(task?.dueDate);
  return Boolean(date && isToday(date));
}

/** Days between two dates, ignoring the time of day. */
export function calendarDaysBetween(a, b) {
  return differenceInCalendarDays(startOfDay(toDate(a)), startOfDay(toDate(b)));
}

export { isSameDay, startOfDay, format };

/** "1h 30m" / "45m" — used for estimates and focus totals. */
export function formatDuration(minutes) {
  if (!minutes || minutes <= 0) return '';
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (!hours) return `${mins}m`;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
}

/** "MM:SS" or "H:MM:SS" for the focus timer. */
export function formatClock(totalSeconds) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return hours ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}
