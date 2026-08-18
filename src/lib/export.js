import { format } from 'date-fns';
import { toDate } from './date';

/** Trigger a browser download for generated text content. */
function download(filename, mimeType, content) {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser a tick to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const stamp = () => format(new Date(), 'yyyy-MM-dd');

export function toJSON(tasks) {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      version: 1,
      count: tasks.length,
      tasks: tasks.map((task) => ({
        title: task.title,
        notes: task.notes ?? '',
        completed: task.completed,
        status: task.status,
        priority: task.priority,
        dueDate: toDate(task.dueDate)?.toISOString() ?? null,
        completedAt: toDate(task.completedAt)?.toISOString() ?? null,
        createdAt: toDate(task.createdAt)?.toISOString() ?? null,
        tags: task.tags ?? [],
        estimateMinutes: task.estimateMinutes ?? null,
        recurrence: task.recurrence ?? null,
        subtasks: (task.subtasks ?? []).map((s) => ({ title: s.title, completed: s.completed })),
      })),
    },
    null,
    2,
  );
}

/** RFC 4180 escaping: wrap in quotes, double any embedded quote. */
const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

export function toCSV(tasks) {
  const headers = [
    'Title', 'Notes', 'Status', 'Completed', 'Priority',
    'Due date', 'Completed at', 'Created at', 'Tags', 'Estimate (min)', 'Subtasks done',
  ];

  const rows = tasks.map((task) => [
    task.title,
    task.notes ?? '',
    task.status ?? '',
    task.completed ? 'Yes' : 'No',
    task.priority ?? '',
    toDate(task.dueDate)?.toISOString() ?? '',
    toDate(task.completedAt)?.toISOString() ?? '',
    toDate(task.createdAt)?.toISOString() ?? '',
    (task.tags ?? []).join('; '),
    task.estimateMinutes ?? '',
    `${(task.subtasks ?? []).filter((s) => s.completed).length}/${(task.subtasks ?? []).length}`,
  ]);

  return [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
}

export function toMarkdown(tasks) {
  const open = tasks.filter((task) => !task.completed);
  const done = tasks.filter((task) => task.completed);

  const renderTask = (task) => {
    const bits = [`- [${task.completed ? 'x' : ' '}] ${task.title}`];
    const meta = [];
    if (task.priority && task.priority !== 'medium') meta.push(`\`${task.priority}\``);
    if (task.dueDate) meta.push(`due ${format(toDate(task.dueDate), 'd MMM yyyy')}`);
    if (task.tags?.length) meta.push(task.tags.map((tag) => `#${tag}`).join(' '));
    if (meta.length) bits.push(`  <sub>${meta.join(' · ')}</sub>`);
    for (const subtask of task.subtasks ?? []) {
      bits.push(`  - [${subtask.completed ? 'x' : ' '}] ${subtask.title}`);
    }
    return bits.join('\n');
  };

  return [
    '# Action — task export',
    '',
    `_Exported ${format(new Date(), "d MMMM yyyy 'at' HH:mm")} · ${tasks.length} tasks_`,
    '',
    `## Open (${open.length})`,
    '',
    open.length ? open.map(renderTask).join('\n') : '_Nothing open. Enjoy the quiet._',
    '',
    `## Completed (${done.length})`,
    '',
    done.length ? done.map(renderTask).join('\n') : '_Nothing completed yet._',
    '',
  ].join('\n');
}

export const EXPORT_FORMATS = {
  json: { label: 'JSON', mime: 'application/json', ext: 'json', render: toJSON },
  csv: { label: 'CSV', mime: 'text/csv', ext: 'csv', render: toCSV },
  markdown: { label: 'Markdown', mime: 'text/markdown', ext: 'md', render: toMarkdown },
};

export function exportTasks(tasks, formatKey) {
  const config = EXPORT_FORMATS[formatKey];
  if (!config) throw new Error(`Unknown export format: ${formatKey}`);
  download(`action-tasks-${stamp()}.${config.ext}`, config.mime, config.render(tasks));
  return config.label;
}
