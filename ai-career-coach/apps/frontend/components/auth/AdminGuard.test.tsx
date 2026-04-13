import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AdminGuard } from './AdminGuard';

const mockRouterReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: mockRouterReplace }),
  usePathname: () => '/admin',
}));

vi.mock('../../context/authContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../../context/authContext';

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;

describe('AdminGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show a loading spinner while the auth state is loading', () => {
    mockUseAuth.mockReturnValue({ isLoading: true, isAuthenticated: false, isAdmin: false });

    const { container } = render(
      <AdminGuard><div>Admin panel</div></AdminGuard>
    );

    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
    expect(screen.queryByText('Admin panel')).not.toBeInTheDocument();
  });

  it('should render children when the user is an authenticated admin', () => {
    mockUseAuth.mockReturnValue({ isLoading: false, isAuthenticated: true, isAdmin: true });

    render(<AdminGuard><div>Admin panel</div></AdminGuard>);

    expect(screen.getByText('Admin panel')).toBeInTheDocument();
  });

  it('should render nothing when the user is authenticated but not admin', () => {
    mockUseAuth.mockReturnValue({ isLoading: false, isAuthenticated: true, isAdmin: false });

    const { container } = render(
      <AdminGuard><div>Admin panel</div></AdminGuard>
    );

    expect(screen.queryByText('Admin panel')).not.toBeInTheDocument();
    expect(container.firstChild).toBeNull();
  });

  it('should render nothing when the user is not authenticated', () => {
    mockUseAuth.mockReturnValue({ isLoading: false, isAuthenticated: false, isAdmin: false });

    const { container } = render(
      <AdminGuard><div>Admin panel</div></AdminGuard>
    );

    expect(screen.queryByText('Admin panel')).not.toBeInTheDocument();
    expect(container.firstChild).toBeNull();
  });

  it('should redirect to /auth/login when the user is not authenticated', () => {
    mockUseAuth.mockReturnValue({ isLoading: false, isAuthenticated: false, isAdmin: false });

    render(<AdminGuard><div>Admin panel</div></AdminGuard>);

    expect(mockRouterReplace).toHaveBeenCalledWith('/auth/login');
  });

  it('should redirect to /dashboard when the user is authenticated but not admin', () => {
    mockUseAuth.mockReturnValue({ isLoading: false, isAuthenticated: true, isAdmin: false });

    render(<AdminGuard><div>Admin panel</div></AdminGuard>);

    expect(mockRouterReplace).toHaveBeenCalledWith('/dashboard');
  });

  it('should not redirect when the user is an admin', () => {
    mockUseAuth.mockReturnValue({ isLoading: false, isAuthenticated: true, isAdmin: true });

    render(<AdminGuard><div>Admin panel</div></AdminGuard>);

    expect(mockRouterReplace).not.toHaveBeenCalled();
  });
});
