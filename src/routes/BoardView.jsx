import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Columns3 } from 'lucide-react';
import { KanbanBoard } from '../components/board/KanbanBoard';
import { TaskComposer } from '../components/tasks/TaskComposer';
import { TaskToolbar } from '../components/tasks/TaskToolbar';
import { Modal } from '../components/ui/Modal';
import { STATUS_META } from '../lib/taskModel';

export function BoardView() {
  const { searchRef, openTask } = useOutletContext();
  const [quickAddStatus, setQuickAddStatus] = useState(null);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-ink">
          <Columns3 className="h-6 w-6 text-brand-600 dark:text-brand-400" aria-hidden="true" />
          Board
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Drag a card between columns to change its state. Moves are saved as you make them.
        </p>
      </header>

      <TaskComposer />
      <TaskToolbar searchRef={searchRef} />

      <KanbanBoard onOpenTask={(task) => openTask(task.id)} onQuickAdd={setQuickAddStatus} />

      <Modal
        open={Boolean(quickAddStatus)}
        onClose={() => setQuickAddStatus(null)}
        title={quickAddStatus ? `Add to ${STATUS_META[quickAddStatus].label}` : ''}
        size="md"
      >
        <div className="px-5 py-5">
          <TaskComposer
            focusOnMount
            defaultStatus={quickAddStatus}
            onCreated={() => setQuickAddStatus(null)}
          />
        </div>
      </Modal>
    </div>
  );
}
