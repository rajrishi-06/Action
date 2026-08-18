import {
  addDays,
  addMonths,
  addWeeks,
  endOfDay,
  isBefore,
  nextDay,
  setHours,
  setMinutes,
  setSeconds,
  setMilliseconds,
  startOfDay,
} from 'date-fns';
import { DEFAULT_PRIORITY, PRIORITIES } from './taskModel';

/**
 * Natural-language task parser.
 *
 * Given `"Submit the report tomorrow at 5pm #work !high ~45m"` it returns a
 * clean title (`"Submit the report"`) plus the structured fields, and reports
 * the character ranges it consumed so the composer can highlight them live.
 *
 * Design notes:
 *  - Every matcher returns the index range it consumed. Ranges are removed from
 *    the title at the end, so parsed metadata never leaks into the task name.
 *  - Matching is anchored to word boundaries; "chat" never reads as "at".
 *  - The parser is pure and takes an injectable `now`, which keeps it testable
 *    and makes "is this time already past?" logic deterministic in tests.
 */

const WEEKDAYS = {
  sunday: 0, sun: 0,
  monday: 1, mon: 1,
  tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3,
  thursday: 4, thu: 4, thurs: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6,
};

const MONTHS = {
  january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2, april: 3, apr: 3,
  may: 4, june: 5, jun: 5, july: 6, jul: 6, august: 7, aug: 7,
  september: 8, sep: 8, sept: 8, october: 9, oct: 9, november: 10, nov: 10,
  december: 11, dec: 11,
};

const PRIORITY_ALIASES = {
  urgent: 'urgent', critical: 'urgent', p1: 'urgent',
  high: 'high', hi: 'high', p2: 'high',
  medium: 'medium', med: 'medium', normal: 'medium', p3: 'medium',
  low: 'low', p4: 'low',
};

/** Soft signals that hint at a priority without being explicit syntax. */
const PRIORITY_HINTS = [
  { re: /\b(asap|urgent(?:ly)?|emergency|right away|critical)\b/i, priority: 'urgent' },
  { re: /\b(important|high priority|must do|deadline)\b/i, priority: 'high' },
  { re: /\b(low priority|whenever|someday|no rush|eventually)\b/i, priority: 'low' },
];

const RECURRENCE_PATTERNS = [
  { re: /\bevery\s+day\b|\bdaily\b/i, rule: 'daily' },
  { re: /\bevery\s+weekday\b|\bweekdays\b/i, rule: 'weekdays' },
  { re: /\bevery\s+week\b|\bweekly\b/i, rule: 'weekly' },
  { re: /\bevery\s+month\b|\bmonthly\b/i, rule: 'monthly' },
  { re: /\bevery\s+year\b|\byearly\b|\bannually\b/i, rule: 'yearly' },
];

const atTime = (date, hours, minutes = 0) =>
  setMilliseconds(setSeconds(setMinutes(setHours(date, hours), minutes), 0), 0);

/** Default clock time for a date the user gave without one. */
const DEFAULT_DUE_HOUR = 9;

function pushRange(ranges, match) {
  if (match && typeof match.index === 'number') {
    ranges.push([match.index, match.index + match[0].length]);
  }
}

/** Remove consumed ranges and tidy the leftover whitespace and stray words. */
function stripRanges(input, ranges) {
  if (ranges.length === 0) return input.trim();

  const merged = [...ranges].sort((a, b) => a[0] - b[0]).reduce((acc, range) => {
    const last = acc[acc.length - 1];
    if (last && range[0] <= last[1]) {
      last[1] = Math.max(last[1], range[1]);
      return acc;
    }
    acc.push([...range]);
    return acc;
  }, []);

  let out = '';
  let cursor = 0;
  for (const [start, end] of merged) {
    out += input.slice(cursor, start) + ' ';
    cursor = end;
  }
  out += input.slice(cursor);

  return out
    // Drop prepositions left dangling by a removed date ("due ", "by ", "on ").
    .replace(/\b(due|by|on|at|before|until)\s*$/i, '')
    .replace(/\s+(due|by|on|at|before|until)\s+(?=$)/i, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/^[\s,\-–—]+|[\s,\-–—]+$/g, '')
    .trim();
}

function parsePriority(input, ranges) {
  // Explicit syntax wins: !high, !p1, !!!
  const explicit = input.match(/(?:^|\s)!(urgent|critical|high|hi|medium|med|normal|low|p[1-4])\b/i);
  if (explicit) {
    pushRange(ranges, explicit);
    return PRIORITY_ALIASES[explicit[1].toLowerCase()] ?? DEFAULT_PRIORITY;
  }

  const bangs = input.match(/(?:^|\s)(!{2,3})(?=\s|$)/);
  if (bangs) {
    pushRange(ranges, bangs);
    return bangs[1].length === 3 ? 'urgent' : 'high';
  }

  const shorthand = input.match(/(?:^|\s)(p[1-4])\b/i);
  if (shorthand) {
    pushRange(ranges, shorthand);
    return PRIORITY_ALIASES[shorthand[1].toLowerCase()];
  }

  // Soft hints infer a priority but stay in the title — the words carry meaning.
  for (const hint of PRIORITY_HINTS) {
    if (hint.re.test(input)) return hint.priority;
  }

  return DEFAULT_PRIORITY;
}

function parseTags(input, ranges) {
  const tags = [];
  const re = /(?:^|\s)#([\p{L}\p{N}_-]+)/gu;
  let match;
  while ((match = re.exec(input)) !== null) {
    pushRange(ranges, match);
    const tag = match[1].toLowerCase();
    if (!tags.includes(tag)) tags.push(tag);
  }
  return tags;
}

function parseEstimate(input, ranges) {
  // ~90m, ~2h, ~1.5h, ~1h30m
  const combined = input.match(/(?:^|\s)~\s*(\d+)\s*h(?:ours?|rs?)?\s*(\d+)\s*m(?:ins?|inutes?)?\b/i);
  if (combined) {
    pushRange(ranges, combined);
    return Number(combined[1]) * 60 + Number(combined[2]);
  }

  const single = input.match(/(?:^|\s)~\s*(\d+(?:\.\d+)?)\s*(m|mins?|minutes?|h|hrs?|hours?)\b/i);
  if (single) {
    pushRange(ranges, single);
    const value = Number(single[1]);
    const isHours = /^h/i.test(single[2]);
    return Math.round(isHours ? value * 60 : value);
  }

  return null;
}

function parseRecurrence(input, ranges) {
  for (const { re, rule } of RECURRENCE_PATTERNS) {
    const match = input.match(re);
    if (match) {
      pushRange(ranges, match);
      return rule;
    }
  }

  // "every monday" -> weekly, anchored to that weekday.
  const weekday = input.match(
    /\bevery\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|tues|wed|thu|thurs|fri|sat)\b/i,
  );
  if (weekday) {
    pushRange(ranges, weekday);
    return 'weekly';
  }

  return null;
}

/** Returns `{ date, hasTime }` or null. Only handles the calendar day. */
function parseDay(input, ranges, now) {
  const today = startOfDay(now);

  const simple = [
    { re: /\btoday\b/i, get: () => today },
    { re: /\btonight\b/i, get: () => today, hour: 20 },
    { re: /\btomorrow\b|\btmr\b|\btmrw\b/i, get: () => addDays(today, 1) },
    { re: /\bday after tomorrow\b/i, get: () => addDays(today, 2) },
    { re: /\bnext week\b/i, get: () => nextDay(today, 1) },
    { re: /\bnext month\b/i, get: () => addMonths(today, 1) },
    { re: /\bthis weekend\b/i, get: () => nextDay(today, 6) },
    { re: /\bend of (?:the )?week\b/i, get: () => nextDay(today, 5) },
  ];

  for (const entry of simple) {
    const match = input.match(entry.re);
    if (match) {
      pushRange(ranges, match);
      return { date: entry.get(), defaultHour: entry.hour };
    }
  }

  // "in 3 days" / "in 2 weeks" / "in 1 month"
  const relative = input.match(/\bin\s+(\d+)\s+(day|days|week|weeks|month|months)\b/i);
  if (relative) {
    pushRange(ranges, relative);
    const amount = Number(relative[1]);
    const unit = relative[2].toLowerCase();
    if (unit.startsWith('day')) return { date: addDays(today, amount) };
    if (unit.startsWith('week')) return { date: addWeeks(today, amount) };
    return { date: addMonths(today, amount) };
  }

  // "next monday" / "this friday" / "on tuesday" / bare "friday"
  const named = input.match(
    /\b(?:(next|this|on|coming)\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i,
  );
  if (named) {
    pushRange(ranges, named);
    const target = WEEKDAYS[named[2].toLowerCase()];
    const qualifier = named[1]?.toLowerCase();
    let date = nextDay(today, target);
    // "next friday" means the week after the coming one when today is earlier
    // in the same week; treat it as +7 from the upcoming occurrence.
    if (qualifier === 'next') date = addDays(date, 7);
    return { date };
  }

  // "Dec 25" / "25 Dec" / "December 25th"
  const monthFirst = input.match(
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b/i,
  );
  const dayFirst = input.match(
    /\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b/i,
  );
  const explicitMonth = monthFirst
    ? { match: monthFirst, month: monthFirst[1], day: monthFirst[2] }
    : dayFirst
      ? { match: dayFirst, month: dayFirst[2], day: dayFirst[1] }
      : null;

  if (explicitMonth) {
    const monthIndex = MONTHS[explicitMonth.month.toLowerCase()];
    const dayOfMonth = Number(explicitMonth.day);
    if (monthIndex !== undefined && dayOfMonth >= 1 && dayOfMonth <= 31) {
      pushRange(ranges, explicitMonth.match);
      let date = new Date(now.getFullYear(), monthIndex, dayOfMonth);
      if (isBefore(endOfDay(date), now)) date = new Date(now.getFullYear() + 1, monthIndex, dayOfMonth);
      return { date: startOfDay(date) };
    }
  }

  return null;
}

/** Returns `{ hours, minutes }` or null. */
function parseTime(input, ranges) {
  const noon = input.match(/\b(?:at\s+)?noon\b/i);
  if (noon) {
    pushRange(ranges, noon);
    return { hours: 12, minutes: 0 };
  }

  const midnight = input.match(/\b(?:at\s+)?midnight\b/i);
  if (midnight) {
    pushRange(ranges, midnight);
    return { hours: 0, minutes: 0 };
  }

  // "at 5pm", "at 5:30 pm", "at 17:00", "5pm", "17:30"
  const match = input.match(/\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i)
    ?? input.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\b/i)
    ?? input.match(/\b(\d{1,2}):(\d{2})\b/);

  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = match[2] ? Number(match[2]) : 0;
  const meridiem = match[3]?.toLowerCase();

  if (minutes > 59) return null;
  if (meridiem) {
    if (hours > 12) return null;
    if (meridiem === 'pm' && hours < 12) hours += 12;
    if (meridiem === 'am' && hours === 12) hours = 0;
  } else if (hours > 23) {
    return null;
  }

  pushRange(ranges, match);
  return { hours, minutes };
}

/**
 * Parse a natural-language task string.
 *
 * @param {string} input Raw text typed by the user.
 * @param {{ now?: Date }} [options] Injectable clock, for deterministic tests.
 * @returns {{
 *   title: string, dueDate: Date|null, priority: string, tags: string[],
 *   estimateMinutes: number|null, recurrence: string|null, hasTime: boolean
 * }}
 */
export function parseTaskInput(input, { now = new Date() } = {}) {
  const raw = typeof input === 'string' ? input : '';
  const ranges = [];

  const priority = parsePriority(raw, ranges);
  const tags = parseTags(raw, ranges);
  const estimateMinutes = parseEstimate(raw, ranges);
  const recurrence = parseRecurrence(raw, ranges);
  const day = parseDay(raw, ranges, now);
  const time = parseTime(raw, ranges);

  let dueDate = null;
  let hasTime = false;

  if (day && time) {
    dueDate = atTime(day.date, time.hours, time.minutes);
    hasTime = true;
  } else if (day) {
    dueDate = atTime(day.date, day.defaultHour ?? DEFAULT_DUE_HOUR);
    hasTime = day.defaultHour !== undefined;
  } else if (time) {
    // A bare time means today if it is still ahead of us, otherwise tomorrow.
    let candidate = atTime(startOfDay(now), time.hours, time.minutes);
    if (isBefore(candidate, now)) candidate = addDays(candidate, 1);
    dueDate = candidate;
    hasTime = true;
  } else if (recurrence) {
    // A repeating task with no explicit date starts today.
    dueDate = atTime(startOfDay(now), DEFAULT_DUE_HOUR);
  }

  const title = stripRanges(raw, ranges);

  return {
    // Never return an empty title — fall back to the raw input so a task typed
    // as just "#work" still has something readable on it.
    title: title || raw.trim(),
    dueDate,
    hasTime,
    priority: PRIORITIES.includes(priority) ? priority : DEFAULT_PRIORITY,
    tags,
    estimateMinutes,
    recurrence,
  };
}

/**
 * Describe what the parser found, for the live hint under the composer.
 * @returns {{ label: string, kind: string }[]}
 */
export function describeParse(parsed, formatDate) {
  const chips = [];
  if (parsed.dueDate) chips.push({ kind: 'date', label: formatDate(parsed.dueDate, parsed.hasTime) });
  if (parsed.priority !== DEFAULT_PRIORITY) chips.push({ kind: 'priority', label: parsed.priority });
  parsed.tags.forEach((tag) => chips.push({ kind: 'tag', label: `#${tag}` }));
  if (parsed.estimateMinutes) {
    const hours = Math.floor(parsed.estimateMinutes / 60);
    const minutes = parsed.estimateMinutes % 60;
    chips.push({
      kind: 'estimate',
      label: hours ? `${hours}h${minutes ? ` ${minutes}m` : ''}` : `${minutes}m`,
    });
  }
  if (parsed.recurrence) chips.push({ kind: 'recurrence', label: parsed.recurrence });
  return chips;
}

/** Next occurrence for a recurring task, used when one is completed. */
export function nextOccurrence(date, recurrence) {
  const base = date ? new Date(date) : new Date();
  switch (recurrence) {
    case 'daily':
      return addDays(base, 1);
    case 'weekdays': {
      let next = addDays(base, 1);
      while (next.getDay() === 0 || next.getDay() === 6) next = addDays(next, 1);
      return next;
    }
    case 'weekly':
      return addWeeks(base, 1);
    case 'monthly':
      return addMonths(base, 1);
    case 'yearly':
      return addMonths(base, 12);
    default:
      return null;
  }
}

/**
 * Advance a repeating task's due date past `now`.
 *
 * Recurrence used to be generated only on completion, so a repeating task you
 * skipped simply sat there overdue — the wrong failure mode for a feature whose
 * whole point is habits you keep imperfectly.
 *
 * This rolls forward rather than materialising every missed occurrence: for
 * personal habits, ten overdue copies of "Journal" is noise, and the streak data
 * in Insights already carries the "did you actually do it" story.
 *
 * @returns {Date|null} The next due date, or null when nothing needs to change.
 */
export function rollForward(dueDate, recurrence, now = new Date()) {
  if (!recurrence) return null;

  const start = dueDate ? new Date(dueDate) : null;
  if (!start || Number.isNaN(start.getTime())) return null;
  if (start.getTime() > now.getTime()) return null;

  let next = start;
  // Bounded so a corrupt rule can never spin forever. 4000 daily steps is over
  // a decade, far past any real gap.
  for (let step = 0; step < 4000; step += 1) {
    const candidate = nextOccurrence(next, recurrence);
    if (!candidate) return null;
    next = candidate;
    if (next.getTime() > now.getTime()) return next;
  }

  return null;
}
