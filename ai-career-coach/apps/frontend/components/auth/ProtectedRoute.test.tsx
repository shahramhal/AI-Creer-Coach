import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProtectedRoute from './ProtectedRoute';

const mockRouterReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: mockRouterReplace }),
  usePathname: () => '/dashboard',
}));

vi.mock('../../context/authContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../../context/authContext';

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show a loading spinner when isLoading is true', () => {
    mockUseAuth.mockReturnValue({ isLoading: true, isAuthenticated: false });

    render(<ProtectedRoute><div>Protected content</div></ProtectedRoute>);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('should render children when the user is authenticated', () => {
    mockUseAuth.mockReturnValue({ isLoading: false, isAuthenticated: true });

    render(<ProtectedRoute><div>Protected content</div></ProtectedRoute>);

    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });

  it('should render nothing (not the children) when not authenticated and not loading', () => {
    mockUseAuth.mockReturnValue({ isLoading: false, isAuthenticated: false });

    const { container } = render(<ProtectedRoute><div>Protected content</div></ProtectedRoute>);

    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    expect(container.firstChild).toBeNull();
  });

  it('should redirect to /login when authentication check completes and user is unauthenticated', () => {
    mockUseAuth.mockReturnValue({ isLoading: false, isAuthenticated: false });

    render(<ProtectedRoute><div>Secret</div></ProtectedRoute>);

    expect(mockRouterReplace).toHaveBeenCalledWith('/login');
  });

  it('should not redirect when the user is authenticated', () => {
    mockUseAuth.mockReturnValue({ isLoading: false, isAuthenticated: true });

    render(<ProtectedRoute><div>Safe content</div></ProtectedRoute>);

    expect(mockRouterReplace).not.toHaveBeenCalled();
  });
});
