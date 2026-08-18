import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider, useToast } from './ToastContext';
import { Toaster } from '../components/ui/Toaster';

function Probe() {
  const { success, error, toast } = useToast();
  return (
    <div>
      <button type="button" onClick={() => success('Saved')}>ok</button>
      <button type="button" onClick={() => error('Failed', { description: 'network' })}>fail</button>
      <button
        type="button"
        onClick={() => toast({ title: 'Deleted', action: { label: 'Undo', onClick: () => success('Restored') } })}
      >
        del
      </button>
    </div>
  );
}

const setup = () =>
  render(<ToastProvider><Probe /><Toaster /></ToastProvider>);

describe('ToastProvider', () => {
  it('shows a success message', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: 'ok' }));
    expect(await screen.findByText('Saved')).toBeInTheDocument();
  });

  it('shows an error with its detail, replacing the old alert() calls', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: 'fail' }));
    expect(await screen.findByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('network')).toBeInTheDocument();
  });

  it('runs an undo action and dismisses the toast', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('button', { name: 'del' }));
    await user.click(await screen.findByRole('button', { name: 'Undo' }));

    expect(await screen.findByText('Restored')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Deleted')).not.toBeInTheDocument());
  });

  it('can be dismissed manually', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('button', { name: 'ok' }));
    await user.click(await screen.findByRole('button', { name: 'Dismiss notification' }));

    await waitFor(() => expect(screen.queryByText('Saved')).not.toBeInTheDocument());
  });

  it('announces politely rather than interrupting', async () => {
    const user = userEvent.setup();
    const { container } = setup();
    await user.click(screen.getByRole('button', { name: 'ok' }));
    expect(container.querySelector('[aria-live="polite"]')).toBeTruthy();
  });
});
