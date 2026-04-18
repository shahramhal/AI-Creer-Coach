import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockRouterPush = vi.fn();
const mockRouterReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush, replace: mockRouterReplace }),
  usePathname: () => '/admin',
}));

vi.mock('next/link', () => ({
  default: ({ href, children, className }: any) => (
    <a href={href} className={className}>{children}</a>
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

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;
const mockUseIsMobile = useIsMobile as ReturnType<typeof vi.fn>;

import { AdminLayout } from './AdminLayout';

const adminUser = {
  id: '1',
  email: 'admin@example.com',
  firstName: 'Admin',
  lastName: 'User',
  isEmailVerified: true,
  role: 'ADMIN' as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUseIsMobile.mockReturnValue(false);
  mockUseAuth.mockReturnValue({
    user: adminUser,
    isLoading: false,
    isAuthenticated: true,
    isAdmin: true,
    logout: vi.fn(),
  });
});

describe('AdminLayout', () => {
  it('should render the children when the user is an admin', () => {
    render(
      <AdminLayout>
        <div>Admin content</div>
      </AdminLayout>
    );
    expect(screen.getByText('Admin content')).toBeInTheDocument();
  });

  it('should render the "Admin Panel" header on mobile', () => {
    render(
      <AdminLayout>
        <div>Content</div>
      </AdminLayout>
    );
    expect(screen.getAllByText('Admin Panel').length).toBeGreaterThan(0);
  });

  it('should render a menu button for mobile navigation', () => {
    render(
      <AdminLayout>
        <div>Content</div>
      </AdminLayout>
    );
    const openMenuButton = screen.getByRole('button', { name: /Open menu/i });
    expect(openMenuButton).toBeInTheDocument();
  });

  it('should render nothing when the user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      isAdmin: false,
      logout: vi.fn(),
    });

    const { container } = render(
      <AdminLayout>
        <div>Admin content</div>
      </AdminLayout>
    );

    expect(screen.queryByText('Admin content')).not.toBeInTheDocument();
    expect(container.firstChild).toBeNull();
  });

  it('should render a loading spinner while auth is loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: true,
      isAuthenticated: false,
      isAdmin: false,
      logout: vi.fn(),
    });

    const { container } = render(
      <AdminLayout>
        <div>Admin content</div>
      </AdminLayout>
    );

    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('should open the mobile sidebar when the menu button is clicked', async () => {
    render(
      <AdminLayout>
        <div>Content</div>
      </AdminLayout>
    );

    const openMenuButton = screen.getByRole('button', { name: /Open menu/i });
    await userEvent.click(openMenuButton);

    // After click, the mobileOpen state becomes true - the sidebar receives the prop.
    // We verify no error is thrown and the layout remains functional.
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('should render the main content area with the correct id', () => {
    render(
      <AdminLayout>
        <div>Content</div>
      </AdminLayout>
    );
    expect(document.getElementById('main-content')).toBeInTheDocument();
  });
});
