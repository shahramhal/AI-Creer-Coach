import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppSidebar } from './AppSidebar';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/dashboard'),
}));

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

vi.mock('framer-motion', () => ({
  motion: {
    span: ({ children, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
      <span {...props}>{children}</span>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockUseAuth = vi.fn();

vi.mock('../../context/authContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('../../hooks/useIsMobile', () => ({
  useIsMobile: vi.fn(() => false),
}));

vi.mock('../ui/sheet', () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const regularUserAuth = {
  user: { id: '1', email: 'john@example.com', firstName: 'John', lastName: 'Doe', isEmailVerified: true, role: 'USER' as const, avatarUrl: null },
  isAdmin: false,
  isLoading: false,
  isAuthenticated: true,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn(),
  checkAuth: vi.fn(),
};

const adminUserAuth = {
  user: { id: '2', email: 'admin@example.com', firstName: 'Admin', lastName: 'User', isEmailVerified: true, role: 'ADMIN' as const, avatarUrl: null },
  isAdmin: true,
  isLoading: false,
  isAuthenticated: true,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn(),
  checkAuth: vi.fn(),
};

beforeEach(() => {
  mockUseAuth.mockReturnValue(regularUserAuth);
});

describe('AppSidebar - navigation links', () => {
  it('should render all main navigation items in expanded state', () => {
    render(<AppSidebar collapsed={false} />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('CV Analysis')).toBeInTheDocument();
    expect(screen.getByText('Job Matches')).toBeInTheDocument();
    expect(screen.getByText('Applications')).toBeInTheDocument();
    expect(screen.getByText('Salary Insights')).toBeInTheDocument();
    expect(screen.getByText('Learning Paths')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('should not show navigation text labels when collapsed', () => {
    render(<AppSidebar collapsed={true} />);
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    expect(screen.queryByText('CV Analysis')).not.toBeInTheDocument();
  });

  it('should render the dashboard link with correct href', () => {
    render(<AppSidebar collapsed={false} />);
    const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
    expect(dashboardLink).toHaveAttribute('href', '/dashboard');
  });

  it('should render the jobs link with correct href', () => {
    render(<AppSidebar collapsed={false} />);
    const jobsLink = screen.getByRole('link', { name: /job matches/i });
    expect(jobsLink).toHaveAttribute('href', '/jobs');
  });
});

describe('AppSidebar - admin link', () => {
  it('should not show the Admin Panel link for regular users', () => {
    mockUseAuth.mockReturnValue(regularUserAuth);
    render(<AppSidebar collapsed={false} />);
    expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument();
  });

  it('should show the Admin Panel link for admin users', () => {
    mockUseAuth.mockReturnValue(adminUserAuth);
    render(<AppSidebar collapsed={false} />);
    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
  });
});

describe('AppSidebar - user profile footer', () => {
  it('should display the user full name in expanded state', () => {
    mockUseAuth.mockReturnValue(regularUserAuth);
    const { container } = render(<AppSidebar collapsed={false} />);
    expect(container).toHaveTextContent('John Doe');
  });

  it('should display the user email in expanded state', () => {
    mockUseAuth.mockReturnValue(regularUserAuth);
    render(<AppSidebar collapsed={false} />);
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });
});

describe('AppSidebar - collapse toggle', () => {
  it('should call onCollapsedChange when the collapse toggle button is clicked', async () => {
    const onCollapsedChange = vi.fn();
    render(<AppSidebar collapsed={false} onCollapsedChange={onCollapsedChange} />);
    const toggleButton = screen.getByRole('button');
    await userEvent.click(toggleButton);
    expect(onCollapsedChange).toHaveBeenCalledWith(true);
  });

  it('should call onCollapsedChange with false when currently collapsed', async () => {
    const onCollapsedChange = vi.fn();
    render(<AppSidebar collapsed={true} onCollapsedChange={onCollapsedChange} />);
    const toggleButton = screen.getByRole('button');
    await userEvent.click(toggleButton);
    expect(onCollapsedChange).toHaveBeenCalledWith(false);
  });
});

describe('AppSidebar - logo', () => {
  it('should show the full logo when expanded', () => {
    render(<AppSidebar collapsed={false} />);
    expect(screen.getByAltText('Build Your Career')).toBeInTheDocument();
  });

  it('should show the compact logo when collapsed', () => {
    render(<AppSidebar collapsed={true} />);
    expect(screen.getByAltText('BYC')).toBeInTheDocument();
  });
});
