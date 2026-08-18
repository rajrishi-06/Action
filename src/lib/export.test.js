import { describe, expect, it } from 'vitest';
import { toCSV, toJSON, toMarkdown } from './export';

const tasks = [
  {
    title: 'Say "hello", politely',
    notes: 'Line one',
    completed: false,
    status: 'today',
    priority: 'high',
    dueDate: new Date('2026-03-05T17:00:00.000Z'),
    completedAt: null,
    createdAt: new Date('2026-03-01T09:00:00.000Z'),
    tags: ['work', 'comms'],
    estimateMinutes: 15,
    subtasks: [{ title: 'Draft it', completed: true }],
  },
  {
    title: 'Ship, then rest',
    completed: true,
    status: 'done',
    priority: 'medium',
    dueDate: null,
    completedAt: new Date('2026-03-04T12:00:00.000Z'),
    createdAt: new Date('2026-03-02T09:00:00.000Z'),
    tags: [],
    subtasks: [],
  },
];

describe('toCSV', () => {
  it('escapes embedded quotes per RFC 4180', () => {
    expect(toCSV(tasks)).toContain('"Say ""hello"", politely"');
  });

  it('keeps commas inside a single quoted cell', () => {
    const line = toCSV(tasks).split('\r\n')[2];
    expect(line.startsWith('"Ship, then rest"')).toBe(true);
  });

  it('writes a header row and one row per task', () => {
    expect(toCSV(tasks).split('\r\n')).toHaveLength(3);
  });

  it('summarises subtask progress', () => {
    expect(toCSV(tasks)).toContain('"1/1"');
  });
});

describe('toJSON', () => {
  it('round-trips to valid JSON with ISO timestamps', () => {
    const parsed = JSON.parse(toJSON(tasks));
    expect(parsed.count).toBe(2);
    expect(parsed.tasks[0].dueDate).toBe('2026-03-05T17:00:00.000Z');
    expect(parsed.tasks[1].completedAt).toBe('2026-03-04T12:00:00.000Z');
  });

  it('includes the completion timestamp the old export omitted', () => {
    expect(JSON.parse(toJSON(tasks)).tasks[0]).toHaveProperty('completedAt');
  });
});

describe('toMarkdown', () => {
  it('splits open and completed tasks', () => {
    const md = toMarkdown(tasks);
    expect(md).toContain('## Open (1)');
    expect(md).toContain('## Completed (1)');
  });

  it('uses task-list checkbox syntax', () => {
    const md = toMarkdown(tasks);
    expect(md).toContain('- [ ] Say "hello", politely');
    expect(md).toContain('- [x] Ship, then rest');
  });

  it('nests subtasks under their parent', () => {
    expect(toMarkdown(tasks)).toContain('  - [x] Draft it');
  });

  it('renders an honest empty state', () => {
    expect(toMarkdown([])).toContain('_Nothing open. Enjoy the quiet._');
  });
});
