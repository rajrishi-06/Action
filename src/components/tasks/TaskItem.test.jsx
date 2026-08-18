import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskItem } from './TaskItem';

const toggleTask = vi.fn();
const deleteTask = vi.fn();
const updateTask = vi.fn();

vi.mock('../../context/TodoContext', () => ({
  useTodo: () => ({ toggleTask, deleteTask, updateTask }),
}));

const task = (overrides = {}) => ({
  id: 't1', title: 'Write the report', notes: '', completed: false,
  priority: 'high', status: 'today', tags: ['work'], subtasks: [],
  dueDate: null, estimateMinutes: null, recurrence: null,
  createdAt: new Date(), completedAt: null, ...overrides,
});

beforeEach(() => vi.clearAllMocks());

describe('TaskItem', () => {
  it('names the checkbox after the task, so screen readers announce which one', () => {
    render(<TaskItem task={task()} />);
    expect(screen.getByRole('checkbox', { name: 'Mark "Write the report" as done' })).toBeInTheDocument();
  });

  it('describes the checkbox as reopening once the task is done', () => {
    render(<TaskItem task={task({ completed: true })} />);
    expect(screen.getByRole('checkbox', { name: /as not done/ })).toBeInTheDocument();
  });

  it('toggles completion when the checkbox is clicked', async () => {
    const user = userEvent.setup();
    render(<TaskItem task={task()} />);
    await user.click(screen.getByRole('checkbox'));
    expect(toggleTask).toHaveBeenCalledWith('t1');
  });

  it('opens the task when the row is activated', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(<TaskItem task={task()} onOpen={onOpen} />);
    await user.click(screen.getByText('Write the report'));
    expect(onOpen).toHaveBeenCalled();
  });

  it('renames inline and saves on Enter', async () => {
    const user = userEvent.setup();
    render(<TaskItem task={task()} />);

    await user.click(screen.getByRole('button', { name: /^Rename/ }));
    const input = screen.getByRole('textbox', { name: 'Task title' });
    await user.clear(input);
    await user.type(input, 'Renamed{Enter}');

    expect(updateTask).toHaveBeenCalledWith('t1', { title: 'Renamed' });
  });

  it('discards an inline rename on Escape', async () => {
    const user = userEvent.setup();
    render(<TaskItem task={task()} />);

    await user.click(screen.getByRole('button', { name: /^Rename/ }));
    const input = screen.getByRole('textbox', { name: 'Task title' });
    await user.clear(input);
    await user.type(input, 'Discarded{Escape}');

    expect(updateTask).not.toHaveBeenCalled();
  });

  it('does not save an empty title', async () => {
    const user = userEvent.setup();
    render(<TaskItem task={task()} />);

    await user.click(screen.getByRole('button', { name: /^Rename/ }));
    const input = screen.getByRole('textbox', { name: 'Task title' });
    await user.clear(input);
    await user.type(input, '{Enter}');

    expect(updateTask).not.toHaveBeenCalled();
  });

  it('marks an overdue task clearly rather than showing a bare date', () => {
    render(<TaskItem task={task({ dueDate: new Date(Date.now() - 86_400_000) })} />);
    expect(screen.getByText(/Overdue/)).toBeInTheDocument();
  });

  it('does not call it overdue once completed', () => {
    render(<TaskItem task={task({ completed: true, dueDate: new Date(Date.now() - 86_400_000) })} />);
    expect(screen.queryByText(/Overdue/)).not.toBeInTheDocument();
  });

  it('shows subtask progress', () => {
    render(<TaskItem task={task({ subtasks: [
      { id: 's1', title: 'a', completed: true },
      { id: 's2', title: 'b', completed: false },
    ] })} />);
    expect(screen.getByText('1/2')).toBeInTheDocument();
  });

  it('deletes via a labelled button', async () => {
    const user = userEvent.setup();
    render(<TaskItem task={task()} />);
    await user.click(screen.getByRole('button', { name: 'Delete "Write the report"' }));
    expect(deleteTask).toHaveBeenCalledWith('t1');
  });

  it('supports keyboard operation on the row', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(<TaskItem task={task()} onOpen={onOpen} />);

    const row = screen.getByRole('button', { name: 'Write the report' });
    row.focus();
    await user.keyboard(' ');
    expect(toggleTask).toHaveBeenCalledWith('t1');

    await user.keyboard('{Enter}');
    expect(onOpen).toHaveBeenCalled();
  });
});
