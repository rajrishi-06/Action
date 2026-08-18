import { describe, expect, it } from 'vitest';
import { parseTaskInput, nextOccurrence, rollForward } from './taskParser';

// A fixed clock: Wednesday 2026-03-11, 10:00 local time.
const now = new Date(2026, 2, 11, 10, 0, 0, 0);
const parse = (input) => parseTaskInput(input, { now });

describe('parseTaskInput — title cleaning', () => {
  it('strips every parsed token out of the title', () => {
    const result = parse('Submit the report tomorrow at 5pm #work !high ~45m');
    expect(result.title).toBe('Submit the report');
  });

  it('leaves an ordinary title untouched', () => {
    expect(parse('Call the dentist').title).toBe('Call the dentist');
  });

  it('never returns an empty title', () => {
    expect(parse('#work').title).toBe('#work');
  });

  it('does not treat substrings as tokens', () => {
    const result = parse('Chat with Sunil about the format');
    expect(result.title).toBe('Chat with Sunil about the format');
    expect(result.dueDate).toBeNull();
  });

  it('drops a dangling preposition left by a removed date', () => {
    expect(parse('Pay rent by tomorrow').title).toBe('Pay rent');
  });
});

describe('parseTaskInput — priority', () => {
  it('reads explicit !priority syntax', () => {
    expect(parse('Ship it !urgent').priority).toBe('urgent');
    expect(parse('Ship it !low').priority).toBe('low');
  });

  it('supports p1..p4 shorthand', () => {
    expect(parse('Ship it p1').priority).toBe('urgent');
    expect(parse('Ship it p4').priority).toBe('low');
  });

  it('maps bang runs to a priority', () => {
    expect(parse('Ship it !!!').priority).toBe('urgent');
    expect(parse('Ship it !!').priority).toBe('high');
  });

  it('infers from soft hints without removing the word', () => {
    const result = parse('Fix the urgent production bug');
    expect(result.priority).toBe('urgent');
    expect(result.title).toContain('urgent');
  });

  it('defaults to medium', () => {
    expect(parse('Water the plants').priority).toBe('medium');
  });
});

describe('parseTaskInput — tags and estimates', () => {
  it('collects unique lowercase tags', () => {
    expect(parse('Standup #Work #work #team').tags).toEqual(['work', 'team']);
  });

  it('parses minute and hour estimates', () => {
    expect(parse('Deep work ~90m').estimateMinutes).toBe(90);
    expect(parse('Deep work ~2h').estimateMinutes).toBe(120);
    expect(parse('Deep work ~1h30m').estimateMinutes).toBe(90);
  });
});

describe('parseTaskInput — dates', () => {
  it('resolves tomorrow at a default hour', () => {
    const { dueDate, hasTime } = parse('Ship the build tomorrow');
    expect(dueDate.getDate()).toBe(12);
    expect(dueDate.getHours()).toBe(9);
    expect(hasTime).toBe(false);
  });

  it('combines a day and a time', () => {
    const { dueDate, hasTime } = parse('Ship the build tomorrow at 5pm');
    expect(dueDate.getDate()).toBe(12);
    expect(dueDate.getHours()).toBe(17);
    expect(hasTime).toBe(true);
  });

  it('reads 24-hour times', () => {
    expect(parse('Standup at 17:30').dueDate.getHours()).toBe(17);
    expect(parse('Standup at 17:30').dueDate.getMinutes()).toBe(30);
  });

  it('rolls a bare past time forward to tomorrow', () => {
    // 8am is behind the 10am clock, so it belongs to the next day.
    expect(parse('Gym at 8am').dueDate.getDate()).toBe(12);
    // 8pm is still ahead, so it stays today.
    expect(parse('Gym at 8pm').dueDate.getDate()).toBe(11);
  });

  it('handles relative offsets', () => {
    expect(parse('Review in 3 days').dueDate.getDate()).toBe(14);
  });

  it('handles named weekdays', () => {
    // Wednesday the 11th -> the coming Friday is the 13th.
    expect(parse('Retro on friday').dueDate.getDate()).toBe(13);
    // "next friday" jumps a further week.
    expect(parse('Retro next friday').dueDate.getDate()).toBe(20);
  });

  it('handles calendar dates and rolls past ones into next year', () => {
    expect(parse('Buy gifts Dec 25').dueDate.getMonth()).toBe(11);
    expect(parse('Buy gifts Dec 25').dueDate.getFullYear()).toBe(2026);
    expect(parse('Taxes Jan 15').dueDate.getFullYear()).toBe(2027);
  });

  it('defaults tonight to the evening', () => {
    const { dueDate } = parse('Call mum tonight');
    expect(dueDate.getDate()).toBe(11);
    expect(dueDate.getHours()).toBe(20);
  });
});

describe('parseTaskInput — recurrence', () => {
  it('detects a repeating rule and gives it a start date', () => {
    const result = parse('Journal every day');
    expect(result.recurrence).toBe('daily');
    expect(result.title).toBe('Journal');
    expect(result.dueDate).not.toBeNull();
  });

  it('treats "every monday" as weekly', () => {
    expect(parse('Team sync every monday').recurrence).toBe('weekly');
  });
});

describe('nextOccurrence', () => {
  it('advances daily and weekly rules', () => {
    expect(nextOccurrence(new Date(2026, 2, 11), 'daily').getDate()).toBe(12);
    expect(nextOccurrence(new Date(2026, 2, 11), 'weekly').getDate()).toBe(18);
  });

  it('skips the weekend for weekday rules', () => {
    // Friday the 13th -> Monday the 16th.
    expect(nextOccurrence(new Date(2026, 2, 13), 'weekdays').getDate()).toBe(16);
  });

  it('returns null for an unknown rule', () => {
    expect(nextOccurrence(new Date(), 'never')).toBeNull();
  });
});

describe('rollForward', () => {
  const monday = new Date(2026, 2, 9, 9, 0, 0, 0); // Monday 9 March 2026

  it('advances a skipped daily task past today', () => {
    const missed = new Date(2026, 2, 1, 9, 0, 0, 0);
    const next = rollForward(missed, 'daily', monday);
    expect(next.getTime()).toBeGreaterThan(monday.getTime());
    expect(next.getDate()).toBe(10);
  });

  it('preserves the time of day while rolling forward', () => {
    const missed = new Date(2026, 2, 1, 18, 30, 0, 0);
    const next = rollForward(missed, 'daily', monday);
    expect(next.getHours()).toBe(18);
    expect(next.getMinutes()).toBe(30);
  });

  it('keeps a weekly task on its original weekday', () => {
    // A Wednesday, three weeks stale.
    const missed = new Date(2026, 1, 18, 9, 0, 0, 0);
    const next = rollForward(missed, 'weekly', monday);
    expect(next.getDay()).toBe(3);
    expect(next.getTime()).toBeGreaterThan(monday.getTime());
  });

  it('never lands a weekday rule on a weekend', () => {
    const missed = new Date(2026, 1, 2, 9, 0, 0, 0);
    const next = rollForward(missed, 'weekdays', monday);
    expect([0, 6]).not.toContain(next.getDay());
  });

  it('leaves a future occurrence alone', () => {
    const future = new Date(2026, 2, 20, 9, 0, 0, 0);
    expect(rollForward(future, 'daily', monday)).toBeNull();
  });

  it('does nothing without a recurrence rule', () => {
    expect(rollForward(new Date(2026, 2, 1), null, monday)).toBeNull();
  });

  it('does nothing without a due date', () => {
    expect(rollForward(null, 'daily', monday)).toBeNull();
  });

  it('terminates on an unknown rule rather than looping', () => {
    expect(rollForward(new Date(2026, 2, 1), 'fortnightly', monday)).toBeNull();
  });

  it('handles a gap of years without hanging', () => {
    const ancient = new Date(2020, 0, 1, 9, 0, 0, 0);
    const next = rollForward(ancient, 'daily', monday);
    expect(next.getTime()).toBeGreaterThan(monday.getTime());
  });
});
