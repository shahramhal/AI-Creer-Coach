import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockSetTheme = vi.fn();

vi.mock('next-themes', () => ({
  useTheme: vi.fn(),
}));

import { useTheme } from 'next-themes';

const mockUseTheme = useTheme as ReturnType<typeof vi.fn>;

import { ThemeToggle } from './theme-toggle';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ThemeToggle - initial render', () => {
  it('should render a button on initial render', () => {
    mockUseTheme.mockReturnValue({ theme: 'dark', setTheme: mockSetTheme });

    render(<ThemeToggle />);

    // In happy-dom useEffect is synchronous, so the mounted state transitions
    // immediately. We assert the button is present in either state.
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});

describe('ThemeToggle - after mount', () => {
  async function renderMounted(theme: string) {
    mockUseTheme.mockReturnValue({ theme, setTheme: mockSetTheme });

    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<ThemeToggle />);
    });

    return result!;
  }

  it('should render an enabled button after mounting', async () => {
    await renderMounted('dark');
    const button = screen.getByRole('button');
    expect(button).not.toBeDisabled();
  });

  it('should render a "Toggle theme" accessible label', async () => {
    await renderMounted('dark');
    expect(screen.getByText('Toggle theme')).toBeInTheDocument();
  });

  it('should switch from dark to light when the button is clicked', async () => {
    await renderMounted('dark');
    await userEvent.click(screen.getByRole('button'));
    expect(mockSetTheme).toHaveBeenCalledWith('light');
  });

  it('should switch from light to dark when the button is clicked', async () => {
    await renderMounted('light');
    await userEvent.click(screen.getByRole('button'));
    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });

  it('should call setTheme exactly once per click', async () => {
    await renderMounted('dark');
    await userEvent.click(screen.getByRole('button'));
    expect(mockSetTheme).toHaveBeenCalledTimes(1);
  });
});
