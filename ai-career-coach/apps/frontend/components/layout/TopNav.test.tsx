import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TopNav } from './TopNav';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

vi.mock('next-themes', () => ({
  useTheme: vi.fn(() => ({ theme: 'light', setTheme: vi.fn() })),
}));

vi.mock('../../context/authContext', () => ({
  useAuth: vi.fn(() => ({
    user: {
      id: '1',
      email: 'jane@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      isEmailVerified: true,
      role: 'USER',
      avatarUrl: null,
    },
    logout: vi.fn(),
  })),
}));

vi.mock('../command-palette/CommandPalette', () => ({
  CommandPalette: ({ open }: { open: boolean; onOpenChange: (v: boolean) => void }) =>
    open ? <div role="dialog" aria-label="command palette" /> : null,
}));

vi.mock('../../library/config', () => ({
  API_BASE_URL: 'http://localhost:4000/api',
}));

describe('TopNav - search button', () => {
  it('should render the search button with label', () => {
    render(<TopNav />);
    expect(screen.getByRole('button', { name: /open command palette/i })).toBeInTheDocument();
  });

  it('should display the search prompt text', () => {
    render(<TopNav />);
    expect(screen.getByText(/search jobs, skills, analysis/i)).toBeInTheDocument();
  });

  it('should open the CommandPalette when the search button is clicked', async () => {
    render(<TopNav />);
    const searchButton = screen.getByRole('button', { name: /open command palette/i });
    await userEvent.click(searchButton);
    expect(screen.getByRole('dialog', { name: /command palette/i })).toBeInTheDocument();
  });
});

describe('TopNav - notifications', () => {
  it('should render the notifications button', () => {
    render(<TopNav />);
    expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
  });

  it('should display a notification count badge', () => {
    render(<TopNav />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});

describe('TopNav - user display', () => {
  it('should display the user initials when no avatar URL is provided', () => {
    render(<TopNav />);
    expect(screen.getByText('JS')).toBeInTheDocument();
  });

  it('should display the user full name', () => {
    render(<TopNav />);
    expect(screen.getAllByText('Jane Smith').length).toBeGreaterThan(0);
  });

  it('should display the user email', () => {
    render(<TopNav />);
    expect(screen.getAllByText('jane@example.com').length).toBeGreaterThan(0);
  });
});

describe('TopNav - mobile menu button', () => {
  it('should call onMenuClick when the mobile menu button is clicked', async () => {
    const onMenuClick = vi.fn();
    render(<TopNav onMenuClick={onMenuClick} />);
    const menuButton = screen.getByRole('button', { name: /open menu/i });
    await userEvent.click(menuButton);
    expect(onMenuClick).toHaveBeenCalledOnce();
  });
});

describe('TopNav - dropdown menu', () => {
  it('should render the user menu trigger button', () => {
    render(<TopNav />);
    const allButtons = screen.getAllByRole('button');
    // The user dropdown trigger is the last button in the header (after menu + search + notifications)
    expect(allButtons.length).toBeGreaterThanOrEqual(3);
  });

  it('should open the user dropdown and show navigation items when trigger is clicked', async () => {
    render(<TopNav />);
    // Find the user avatar trigger button - it contains a rounded-full div
    const allButtons = screen.getAllByRole('button');
    const userMenuTrigger = allButtons[allButtons.length - 1];
    await userEvent.click(userMenuTrigger);
    expect(await screen.findByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });

  it('should call logout and redirect when Logout item is clicked', async () => {
    const mockLogout = vi.fn().mockResolvedValue(undefined);
    const mockPush = vi.fn();

    const { useAuth } = await import('../../context/authContext');
    vi.mocked(useAuth).mockReturnValue({
      user: { id: '1', email: 'jane@example.com', firstName: 'Jane', lastName: 'Smith', isEmailVerified: true, role: 'USER', avatarUrl: null },
      logout: mockLogout,
      isLoading: false,
      isAuthenticated: true,
      isAdmin: false,
      login: vi.fn(),
      register: vi.fn(),
      refreshUser: vi.fn(),
      checkAuth: vi.fn(),
    });

    const { useRouter } = await import('next/navigation');
    vi.mocked(useRouter).mockReturnValue({ push: mockPush } as unknown as ReturnType<typeof useRouter>);

    render(<TopNav />);
    const allButtons = screen.getAllByRole('button');
    const userMenuTrigger = allButtons[allButtons.length - 1];
    await userEvent.click(userMenuTrigger);
    const logoutItem = await screen.findByText('Logout');
    await userEvent.click(logoutItem);
    expect(mockLogout).toHaveBeenCalledOnce();
    expect(mockPush).toHaveBeenCalledWith('/auth/login');
  });
});

describe('TopNav - keyboard shortcut', () => {
  it('should open the command palette when Ctrl+K is pressed', async () => {
    render(<TopNav />);
    await userEvent.keyboard('{Control>}k{/Control}');
    expect(screen.getByRole('dialog', { name: /command palette/i })).toBeInTheDocument();
  });
});
