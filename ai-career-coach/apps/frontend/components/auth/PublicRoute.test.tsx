import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import PublicRoute from './PublicRoute';

const mockRouterReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: mockRouterReplace }),
  usePathname: () => '/login',
}));

vi.mock('../../context/authContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../../context/authContext';

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;

describe('PublicRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show a loading spinner while the auth check is in progress', () => {
    mockUseAuth.mockReturnValue({ isLoading: true, isAuthenticated: false });

    render(<PublicRoute><div>Login form</div></PublicRoute>);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Login form')).not.toBeInTheDocument();
  });

  it('should render children when the user is not authenticated', () => {
    mockUseAuth.mockReturnValue({ isLoading: false, isAuthenticated: false });

    render(<PublicRoute><div>Login form</div></PublicRoute>);

    expect(screen.getByText('Login form')).toBeInTheDocument();
  });

  it('should render nothing when the user is already authenticated', () => {
    mockUseAuth.mockReturnValue({ isLoading: false, isAuthenticated: true });

    const { container } = render(<PublicRoute><div>Login form</div></PublicRoute>);

    expect(screen.queryByText('Login form')).not.toBeInTheDocument();
    expect(container.firstChild).toBeNull();
  });

  it('should redirect to /dashboard when an authenticated user visits a public route', () => {
    mockUseAuth.mockReturnValue({ isLoading: false, isAuthenticated: true });

    render(<PublicRoute><div>Login form</div></PublicRoute>);

    expect(mockRouterReplace).toHaveBeenCalledWith('/dashboard');
  });

  it('should not redirect when the user is unauthenticated', () => {
    mockUseAuth.mockReturnValue({ isLoading: false, isAuthenticated: false });

    render(<PublicRoute><div>Login form</div></PublicRoute>);

    expect(mockRouterReplace).not.toHaveBeenCalled();
  });
});
