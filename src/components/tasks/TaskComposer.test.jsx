import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskComposer } from './TaskComposer';

const addTask = vi.fn().mockResolvedValue({ id: 'new' });

vi.mock('../../context/TodoContext', () => ({ useTodo: () => ({ addTask }) }));
vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({ info: vi.fn(), success: vi.fn(), error: vi.fn(), toast: vi.fn() }),
}));
// Keep the suggestion layer quiet; it is covered by the heuristics tests.
vi.mock('../../lib/ai', () => ({
  suggestTags: vi.fn().mockResolvedValue({ items: [], source: 'local' }),
  suggestEstimate: vi.fn().mockResolvedValue({ value: null, source: 'local' }),
  isRemoteAIEnabled: false,
}));

beforeEach(() => vi.clearAllMocks());

describe('TaskComposer', () => {
  it('previews what the parser understood before the task is saved', async () => {
    const user = userEvent.setup();
    render(<TaskComposer />);

    await user.type(screen.getByRole('textbox', { name: 'New task' }), 'Submit the report tomorrow #work !high');

    // The cleaned title is shown, not the raw input.
    expect(await screen.findByText('Submit the report')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('work')).toBeInTheDocument();
  });

  it('saves the parsed fields rather than the raw text', async () => {
    const user = userEvent.setup();
    render(<TaskComposer />);

    await user.type(screen.getByRole('textbox', { name: 'New task' }), 'Call the bank tomorrow !urgent{Enter}');

    await waitFor(() => expect(addTask).toHaveBeenCalled());
    const payload = addTask.mock.calls[0][0];
    expect(payload.title).toBe('Call the bank');
    expect(payload.priority).toBe('urgent');
    expect(payload.dueDate).toBeInstanceOf(Date);
  });

  it('clears the field after a successful save', async () => {
    const user = userEvent.setup();
    render(<TaskComposer />);

    const input = screen.getByRole('textbox', { name: 'New task' });
    await user.type(input, 'Water the plants{Enter}');

    await waitFor(() => expect(input).toHaveValue(''));
  });

  it('ignores an empty submission', async () => {
    const user = userEvent.setup();
    render(<TaskComposer />);

    await user.type(screen.getByRole('textbox', { name: 'New task' }), '   {Enter}');
    expect(addTask).not.toHaveBeenCalled();
  });

  it('disables the add button until there is something to add', async () => {
    const user = userEvent.setup();
    render(<TaskComposer />);

    const button = screen.getByRole('button', { name: /Add/ });
    expect(button).toBeDisabled();

    await user.type(screen.getByRole('textbox', { name: 'New task' }), 'Something');
    expect(button).toBeEnabled();
  });

  it('applies the requested board column to new tasks', async () => {
    const user = userEvent.setup();
    render(<TaskComposer defaultStatus="doing" />);

    await user.type(screen.getByRole('textbox', { name: 'New task' }), 'Start this{Enter}');

    await waitFor(() => expect(addTask).toHaveBeenCalled());
    expect(addTask.mock.calls[0][0].status).toBe('doing');
  });
});
