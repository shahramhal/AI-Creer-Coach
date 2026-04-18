import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';

const mockRouterPush = vi.fn();
const mockRouterReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush, replace: mockRouterReplace }),
  usePathname: () => '/dashboard',
}));

vi.mock('../library/api', () => ({
  authAPI: {
    refreshToken: vi.fn(),
    getCurrentUser: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  },
}));

vi.mock('../library/auth', () => ({
  getAccessToken: vi.fn(),
  setAccessToken: vi.fn(),
  clearAccessToken: vi.fn(),
}));

import { authAPI } from '../library/api';
import { getAccessToken, setAccessToken, clearAccessToken } from '../library/auth';
import { AuthProvider, useAuth } from '../context/authContext';

const mockAuthAPI = authAPI as {
  refreshToken: ReturnType<typeof vi.fn>;
  getCurrentUser: ReturnType<typeof vi.fn>;
  login: ReturnType<typeof vi.fn>;
  register: ReturnType<typeof vi.fn>;
  logout: ReturnType<typeof vi.fn>;
};

const mockGetAccessToken = getAccessToken as ReturnType<typeof vi.fn>;
const mockSetAccessToken = setAccessToken as ReturnType<typeof vi.fn>;
const mockClearAccessToken = clearAccessToken as ReturnType<typeof vi.fn>;

function makeWrapper() {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(AuthProvider, null, children);
}

const sampleUser = {
  id: '1',
  email: 'user@example.com',
  firstName: 'Test',
  lastName: 'User',
  isEmailVerified: true,
  role: 'USER' as const,
};

const adminUser = {
  ...sampleUser,
  id: '2',
  email: 'admin@example.com',
  role: 'ADMIN' as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  // Default: silent refresh fails so no user is loaded on mount.
  mockAuthAPI.refreshToken.mockRejectedValue(new Error('No refresh token'));
  mockGetAccessToken.mockReturnValue(null);
});

describe('useAuth - throws outside AuthProvider', () => {
  it('should throw an error when used outside an AuthProvider', () => {
    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth must be used within AuthProvider'
    );
  });
});

describe('useAuth - initial loading state', () => {
  it('should start with isLoading true and no user', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper() });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.user).toBeNull();
  });

  it('should set isLoading to false after the initial auth check completes', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('should leave user as null when refresh token call fails on mount', async () => {
    mockAuthAPI.refreshToken.mockRejectedValue(new Error('Unauthorized'));

    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user).toBeNull();
  });

  it('should set user when refresh token and getCurrentUser succeed on mount', async () => {
    mockAuthAPI.refreshToken.mockResolvedValue({
      data: { data: { accessToken: 'access-token-123' } },
    });
    mockAuthAPI.getCurrentUser.mockResolvedValue({
      data: { data: { user: sampleUser } },
    });

    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user).toEqual(sampleUser);
    expect(result.current.isAuthenticated).toBe(true);
  });
});

describe('useAuth - isAuthenticated and isAdmin', () => {
  it('should report isAuthenticated as false when there is no user', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should report isAdmin as false for a regular user', async () => {
    mockAuthAPI.refreshToken.mockResolvedValue({
      data: { data: { accessToken: 'token' } },
    });
    mockAuthAPI.getCurrentUser.mockResolvedValue({
      data: { data: { user: sampleUser } },
    });

    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isAdmin).toBe(false);
  });

  it('should report isAdmin as true for an admin user', async () => {
    mockAuthAPI.refreshToken.mockResolvedValue({
      data: { data: { accessToken: 'token' } },
    });
    mockAuthAPI.getCurrentUser.mockResolvedValue({
      data: { data: { user: adminUser } },
    });

    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isAdmin).toBe(true);
  });
});

describe('useAuth - login', () => {
  it('should set the user after a successful login', async () => {
    mockAuthAPI.login.mockResolvedValue({
      data: { data: { accessToken: 'new-token', user: sampleUser } },
    });

    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login('user@example.com', 'password123');
    });

    expect(result.current.user).toEqual(sampleUser);
    expect(result.current.isAuthenticated).toBe(true);
    expect(mockSetAccessToken).toHaveBeenCalledWith('new-token');
  });

  it('should call authAPI.login with the correct credentials', async () => {
    mockAuthAPI.login.mockResolvedValue({
      data: { data: { accessToken: 'token', user: sampleUser } },
    });

    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login('hello@test.com', 'securepass');
    });

    expect(mockAuthAPI.login).toHaveBeenCalledWith('hello@test.com', 'securepass');
  });

  it('should propagate the error when login fails', async () => {
    mockAuthAPI.login.mockRejectedValue(new Error('Invalid credentials'));

    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(
      act(async () => {
        await result.current.login('bad@example.com', 'wrongpass');
      })
    ).rejects.toThrow('Invalid credentials');

    expect(result.current.user).toBeNull();
  });
});

describe('useAuth - logout', () => {
  it('should clear the user and access token on logout', async () => {
    mockAuthAPI.refreshToken.mockResolvedValue({
      data: { data: { accessToken: 'token' } },
    });
    mockAuthAPI.getCurrentUser.mockResolvedValue({
      data: { data: { user: sampleUser } },
    });
    mockAuthAPI.logout.mockResolvedValue({});

    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(mockClearAccessToken).toHaveBeenCalled();
  });

  it('should redirect to /login after logout', async () => {
    mockAuthAPI.logout.mockResolvedValue({});

    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.logout();
    });

    expect(mockRouterReplace).toHaveBeenCalledWith('/login');
  });

  it('should still clear the user even when the logout API call fails', async () => {
    mockAuthAPI.logout.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(mockClearAccessToken).toHaveBeenCalled();
  });
});

describe('useAuth - register', () => {
  it('should call authAPI.register with the provided registration data', async () => {
    mockAuthAPI.register.mockResolvedValue({ data: {} });

    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const registrationData = {
      email: 'new@example.com',
      password: 'pass1234',
      firstName: 'New',
      lastName: 'User',
    };

    await act(async () => {
      await result.current.register(registrationData);
    });

    expect(mockAuthAPI.register).toHaveBeenCalledWith(registrationData);
  });

  it('should propagate the error when register fails', async () => {
    mockAuthAPI.register.mockRejectedValue(new Error('Email already exists'));

    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(
      act(async () => {
        await result.current.register({ email: 'dupe@example.com', password: 'pass' });
      })
    ).rejects.toThrow('Email already exists');
  });
});

describe('useAuth - checkAuth', () => {
  it('should return false when there is no access token', async () => {
    mockGetAccessToken.mockReturnValue(null);

    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let authResult: boolean;
    await act(async () => {
      authResult = await result.current.checkAuth();
    });

    expect(authResult!).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('should return true and set the user when a valid token exists', async () => {
    mockGetAccessToken.mockReturnValue('valid-token');
    mockAuthAPI.getCurrentUser.mockResolvedValue({
      data: { data: { user: sampleUser } },
    });

    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let authResult: boolean;
    await act(async () => {
      authResult = await result.current.checkAuth();
    });

    expect(authResult!).toBe(true);
    expect(result.current.user).toEqual(sampleUser);
  });

  it('should return false and clear the token when getCurrentUser fails', async () => {
    mockGetAccessToken.mockReturnValue('expired-token');
    mockAuthAPI.getCurrentUser.mockRejectedValue(new Error('Unauthorized'));

    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let authResult: boolean;
    await act(async () => {
      authResult = await result.current.checkAuth();
    });

    expect(authResult!).toBe(false);
    expect(mockClearAccessToken).toHaveBeenCalled();
  });
});

describe('useAuth - refreshUser', () => {
  it('should update the user when getCurrentUser succeeds', async () => {
    mockAuthAPI.getCurrentUser.mockResolvedValue({
      data: { data: { user: sampleUser } },
    });

    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.refreshUser();
    });

    expect(result.current.user).toEqual(sampleUser);
  });

  it('should fall back to refresh token when getCurrentUser fails initially', async () => {
    mockAuthAPI.getCurrentUser
      .mockRejectedValueOnce(new Error('Unauthorized'))
      .mockResolvedValueOnce({ data: { data: { user: sampleUser } } });
    mockAuthAPI.refreshToken.mockResolvedValue({
      data: { data: { accessToken: 'fresh-token' } },
    });

    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.refreshUser();
    });

    expect(result.current.user).toEqual(sampleUser);
    expect(mockSetAccessToken).toHaveBeenCalledWith('fresh-token');
  });

  it('should clear the user when both getCurrentUser and refreshToken fail', async () => {
    mockAuthAPI.getCurrentUser.mockRejectedValue(new Error('Unauthorized'));
    mockAuthAPI.refreshToken.mockRejectedValue(new Error('No refresh token'));

    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.refreshUser();
    });

    expect(result.current.user).toBeNull();
    expect(mockClearAccessToken).toHaveBeenCalled();
  });
});
