import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockRouterPush = vi.fn();
const mockRouterReplace = vi.fn();
const mockLogout = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush, replace: mockRouterReplace }),
  usePathname: vi.fn(() => '/admin'),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, className, onClick, 'aria-label': ariaLabel }: any) => (
    <a href={href} className={className} onClick={onClick} aria-label={ariaLabel}>{children}</a>
  ),
}));

vi.mock('../../context/authContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../hooks/useIsMobile', () => ({
  useIsMobile: vi.fn(),
}));

import { useAuth } from '../../context/authContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import { usePathname } from 'next/navigation';

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;
const mockUseIsMobile = useIsMobile as ReturnType<typeof vi.fn>;
const mockUsePathname = usePathname as ReturnType<typeof vi.fn>;

import { AdminSidebar } from './AdminSidebar';

const adminUser = {
  id: '1',
  email: 'admin@example.com',
  firstName: 'Jane',
  lastName: 'Doe',
  isEmailVerified: true,
  role: 'ADMIN' as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUseIsMobile.mockReturnValue(false);
  mockUsePathname.mockReturnValue('/admin');
  mockUseAuth.mockReturnValue({
    user: adminUser,
    logout: mockLogout,
  });
});

describe('AdminSidebar - desktop view', () => {
  it('should render the "Admin Panel" heading in the sidebar', () => {
    render(<AdminSidebar />);
    expect(screen.getAllByText('Admin Panel').length).toBeGreaterThan(0);
  });

  it('should render all navigation item labels when not collapsed', () => {
    render(<AdminSidebar collapsed={false} />);
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('Jobs')).toBeInTheDocument();
    expect(screen.getByText('System')).toBeInTheDocument();
    expect(screen.getByText('Audit Log')).toBeInTheDocument();
  });

  it('should render nav links with correct hrefs', () => {
    render(<AdminSidebar collapsed={false} />);
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('href', '/admin');
    expect(screen.getByRole('link', { name: 'Users' })).toHaveAttribute('href', '/admin/users');
    expect(screen.getByRole('link', { name: 'Jobs' })).toHaveAttribute('href', '/admin/jobs');
    expect(screen.getByRole('link', { name: 'System' })).toHaveAttribute('href', '/admin/system');
    expect(screen.getByRole('link', { name: 'Audit Log' })).toHaveAttribute('href', '/admin/audit');
  });

  it('should render a "Back to App" link pointing to /dashboard', () => {
    render(<AdminSidebar collapsed={false} />);
    expect(screen.getByRole('link', { name: 'Back to App' })).toHaveAttribute('href', '/dashboard');
  });

  it('should render the user name when not collapsed', () => {
    render(<AdminSidebar collapsed={false} />);
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });

  it('should render the user email when not collapsed', () => {
    render(<AdminSidebar collapsed={false} />);
    expect(screen.getByText('admin@example.com')).toBeInTheDocument();
  });

  it('should render a Logout button when not collapsed', () => {
    render(<AdminSidebar collapsed={false} />);
    expect(screen.getByRole('button', { name: /Logout/i })).toBeInTheDocument();
  });

  it('should call logout and redirect to /auth/login when Logout is clicked', async () => {
    mockLogout.mockResolvedValue(undefined);
    render(<AdminSidebar collapsed={false} />);

    await userEvent.click(screen.getByRole('button', { name: /Logout/i }));

    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(mockRouterPush).toHaveBeenCalledWith('/auth/login');
  });

  it('should hide nav item labels when collapsed is true', () => {
    render(<AdminSidebar collapsed={true} />);
    expect(screen.queryByText('Overview')).not.toBeInTheDocument();
    expect(screen.queryByText('Users')).not.toBeInTheDocument();
  });

  it('should not render user info card when collapsed', () => {
    render(<AdminSidebar collapsed={true} />);
    expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument();
    expect(screen.queryByText('admin@example.com')).not.toBeInTheDocument();
  });

  it('should call onCollapsedChange when the collapse toggle button is clicked', async () => {
    const onCollapsedChange = vi.fn();
    render(<AdminSidebar collapsed={false} onCollapsedChange={onCollapsedChange} />);

    const collapseButton = screen.getByRole('button', { name: '' });
    await userEvent.click(collapseButton);

    expect(onCollapsedChange).toHaveBeenCalledWith(true);
  });

  it('should not render user info when there is no logged-in user', () => {
    mockUseAuth.mockReturnValue({ user: null, logout: mockLogout });
    render(<AdminSidebar collapsed={false} />);

    expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument();
  });
});

describe('AdminSidebar - active nav item highlighting', () => {
  it('should mark the Overview link as active when pathname is /admin', () => {
    mockUsePathname.mockReturnValue('/admin');
    render(<AdminSidebar collapsed={false} />);
    const overviewLink = screen.getByRole('link', { name: 'Overview' });
    expect(overviewLink).toHaveClass('text-primary');
  });

  it('should mark the Users link as active when pathname starts with /admin/users', () => {
    mockUsePathname.mockReturnValue('/admin/users/123');
    render(<AdminSidebar collapsed={false} />);
    const usersLink = screen.getByRole('link', { name: 'Users' });
    expect(usersLink).toHaveClass('text-primary');
  });

  it('should not mark a link as active when the pathname does not match', () => {
    mockUsePathname.mockReturnValue('/admin');
    render(<AdminSidebar collapsed={false} />);
    const usersLink = screen.getByRole('link', { name: 'Users' });
    expect(usersLink).not.toHaveClass('text-primary');
  });
});
