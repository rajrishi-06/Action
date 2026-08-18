import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useTheme } from './ThemeContext';

/** Control the OS preference for each case. */
function mockPrefersDark(matches) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: query.includes('dark') ? matches : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

function Probe() {
  const { theme, resolvedTheme, setTheme, cycleTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <button type="button" onClick={() => setTheme('dark')}>dark</button>
      <button type="button" onClick={cycleTheme}>cycle</button>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.className = '';
  mockPrefersDark(false);
});

describe('ThemeProvider', () => {
  it('defaults to following the system', () => {
    render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(screen.getByTestId('theme')).toHaveTextContent('system');
  });

  it('adds the dark class Tailwind needs when dark is selected', async () => {
    const user = userEvent.setup();
    render(<ThemeProvider><Probe /></ThemeProvider>);

    expect(document.documentElement.classList.contains('dark')).toBe(false);
    await user.click(screen.getByRole('button', { name: 'dark' }));
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('resolves "system" against the OS preference', () => {
    mockPrefersDark(true);
    render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(screen.getByTestId('resolved')).toHaveTextContent('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('persists the choice under the key the pre-paint script reads', async () => {
    const user = userEvent.setup();
    render(<ThemeProvider><Probe /></ThemeProvider>);

    await user.click(screen.getByRole('button', { name: 'dark' }));
    expect(JSON.parse(localStorage.getItem('action.theme'))).toBe('dark');
  });

  it('cycles light -> dark -> system', async () => {
    const user = userEvent.setup();
    localStorage.setItem('action.theme', JSON.stringify('light'));
    render(<ThemeProvider><Probe /></ThemeProvider>);

    expect(screen.getByTestId('theme')).toHaveTextContent('light');
    await user.click(screen.getByRole('button', { name: 'cycle' }));
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    await user.click(screen.getByRole('button', { name: 'cycle' }));
    expect(screen.getByTestId('theme')).toHaveTextContent('system');
  });

  it('restores a stored preference on mount', () => {
    localStorage.setItem('action.theme', JSON.stringify('dark'));
    render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
