import { Modal } from './ui/Modal';
import { Kbd } from './ui/primitives';
import { modKeyLabel } from '../hooks/useHotkeys';

const GROUPS = [
  {
    title: 'Global',
    items: [
      { keys: [modKeyLabel, 'K'], label: 'Open the command palette' },
      { keys: ['/'], label: 'Focus the search field' },
      { keys: ['?'], label: 'Show this help' },
      { keys: ['Esc'], label: 'Close whatever is open' },
    ],
  },
  {
    title: 'In the task list',
    items: [
      { keys: ['Enter'], label: 'Open the highlighted task' },
      { keys: ['Space'], label: 'Complete or reopen it' },
      { keys: ['E'], label: 'Rename it inline' },
      { keys: ['Tab'], label: 'Move between tasks and actions' },
    ],
  },
  {
    title: 'Capture syntax',
    items: [
      { keys: ['tomorrow 5pm'], label: 'Sets a due date and time' },
      { keys: ['!high'], label: 'Sets priority (also !urgent, !low, p1–p4)' },
      { keys: ['#work'], label: 'Adds a tag' },
      { keys: ['~45m'], label: 'Adds a time estimate' },
      { keys: ['every monday'], label: 'Makes the task repeat' },
    ],
  },
];

export function ShortcutsDialog({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Keyboard shortcuts" size="md">
      <div className="max-h-[60vh] space-y-6 overflow-y-auto px-5 py-5 scrollbar-thin">
        {GROUPS.map((group) => (
          <section key={group.title}>
            <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
              {group.title}
            </h3>
            <dl className="space-y-2">
              {group.items.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-4">
                  <dt className="text-sm text-ink-muted">{item.label}</dt>
                  <dd className="flex flex-shrink-0 gap-1">
                    {item.keys.map((key) => (
                      <Kbd key={key} className="px-2">
                        {key}
                      </Kbd>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </Modal>
  );
}
