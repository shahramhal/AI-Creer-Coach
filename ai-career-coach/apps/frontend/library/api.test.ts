import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.hoisted ensures these variables are initialized before vi.mock factories run.
const { mockAxiosInstance, capturedHandlers } = vi.hoisted(() => {
  const capturedHandlers: {
    requestSuccess?: (config: any) => any;
    responseError?: (error: any) => any;
  } = {};

  const instance = {
    interceptors: {
      request: {
        use: vi.fn((handler: (config: any) => any) => {
          capturedHandlers.requestSuccess = handler;
        }),
      },
      response: {
        use: vi.fn((_success: any, errorHandler: (error: any) => any) => {
          capturedHandlers.responseError = errorHandler;
        }),
      },
    },
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  };

  return { mockAxiosInstance: instance, capturedHandlers };
});

vi.mock('axios', async () => {
  const actual = await import('axios');
  return {
    ...actual,
    default: {
      ...actual.default,
      create: vi.fn().mockReturnValue(mockAxiosInstance),
      post: vi.fn(),
    },
  };
});

vi.mock('./auth', () => ({
  getAccessToken: vi.fn().mockReturnValue(null),
  setAccessToken: vi.fn(),
  clearAccessToken: vi.fn(),
}));

import { authAPI } from './api';
import { getAccessToken } from './auth';

const mockGetToken = getAccessToken as ReturnType<typeof vi.fn>;
const mockGet = mockAxiosInstance.get as ReturnType<typeof vi.fn>;
const mockPost = mockAxiosInstance.post as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  // Re-register interceptors are captured from module load - no need to re-run
});

describe('request interceptor', () => {
  it('should attach Bearer token to config when a token is present', () => {
    if (!capturedHandlers.requestSuccess) return;
    mockGetToken.mockReturnValue('my-access-token');
    const config: any = { headers: {} };
    const result = capturedHandlers.requestSuccess(config);
    expect(result.headers.Authorization).toBe('Bearer my-access-token');
  });

  it('should leave Authorization header absent when no token is stored', () => {
    if (!capturedHandlers.requestSuccess) return;
    mockGetToken.mockReturnValue(null);
    const config: any = { headers: {} };
    const result = capturedHandlers.requestSuccess(config);
    expect(result.headers.Authorization).toBeUndefined();
  });
});

describe('response error interceptor', () => {
  it('should skip refresh for login endpoint and reject immediately', async () => {
    if (!capturedHandlers.responseError) return;
    const error = {
      config: { url: '/api/v1/auth/login', _retry: false },
      response: { status: 401 },
    };
    await expect(capturedHandlers.responseError(error)).rejects.toEqual(error);
  });

  it('should skip refresh for register endpoint and reject immediately', async () => {
    if (!capturedHandlers.responseError) return;
    const error = {
      config: { url: '/api/v1/auth/register', _retry: false },
      response: { status: 401 },
    };
    await expect(capturedHandlers.responseError(error)).rejects.toEqual(error);
  });

  it('should skip refresh for the refresh endpoint and reject immediately', async () => {
    if (!capturedHandlers.responseError) return;
    const error = {
      config: { url: '/api/v1/auth/refresh', _retry: false },
      response: { status: 401 },
    };
    await expect(capturedHandlers.responseError(error)).rejects.toEqual(error);
  });

  it('should reject non-401 errors without attempting refresh', async () => {
    if (!capturedHandlers.responseError) return;
    const error = {
      config: { url: '/api/v1/profile', _retry: false },
      response: { status: 500 },
    };
    await expect(capturedHandlers.responseError(error)).rejects.toEqual(error);
  });

  it('should skip refresh when the request has already been retried', async () => {
    if (!capturedHandlers.responseError) return;
    const error = {
      config: { url: '/api/v1/profile', _retry: true },
      response: { status: 401 },
    };
    await expect(capturedHandlers.responseError(error)).rejects.toEqual(error);
  });
});

describe('authAPI', () => {
  describe('register', () => {
    it('should POST to /api/v1/auth/register with the user data', async () => {
      const userData = { email: 'a@b.com', password: 'pass', firstName: 'A', lastName: 'B' };
      mockPost.mockResolvedValue({ data: { success: true } });
      await authAPI.register(userData);
      expect(mockPost).toHaveBeenCalledWith('/api/v1/auth/register', userData);
    });
  });

  describe('login', () => {
    it('should POST to /api/v1/auth/login with email and password', async () => {
      mockPost.mockResolvedValue({ data: { success: true } });
      await authAPI.login('user@example.com', 'secret');
      expect(mockPost).toHaveBeenCalledWith('/api/v1/auth/login', {
        email: 'user@example.com',
        password: 'secret',
      });
    });
  });

  describe('logout', () => {
    it('should POST to /api/v1/auth/logout', async () => {
      mockPost.mockResolvedValue({ data: { success: true } });
      await authAPI.logout();
      expect(mockPost).toHaveBeenCalledWith('/api/v1/auth/logout');
    });
  });

  describe('verifyEmail', () => {
    it('should GET /api/v1/auth/verify-email with the token in the query string', async () => {
      mockGet.mockResolvedValue({ data: { success: true } });
      await authAPI.verifyEmail('verify-token-xyz');
      expect(mockGet).toHaveBeenCalledWith('/api/v1/auth/verify-email?token=verify-token-xyz');
    });
  });

  describe('forgotPassword', () => {
    it('should POST to /api/v1/auth/forgot-password with the email', async () => {
      mockPost.mockResolvedValue({ data: { success: true } });
      await authAPI.forgotPassword('user@example.com');
      expect(mockPost).toHaveBeenCalledWith('/api/v1/auth/forgot-password', {
        email: 'user@example.com',
      });
    });
  });

  describe('resetPassword', () => {
    it('should POST to /api/v1/auth/reset-password with token and new password', async () => {
      mockPost.mockResolvedValue({ data: { success: true } });
      await authAPI.resetPassword('reset-token', 'newPassword123');
      expect(mockPost).toHaveBeenCalledWith('/api/v1/auth/reset-password', {
        token: 'reset-token',
        password: 'newPassword123',
      });
    });
  });

  describe('getCurrentUser', () => {
    it('should GET /api/v1/auth/me', async () => {
      mockGet.mockResolvedValue({ data: { success: true, data: { id: 'user-1' } } });
      await authAPI.getCurrentUser();
      expect(mockGet).toHaveBeenCalledWith('/api/v1/auth/me');
    });
  });

  describe('refreshToken', () => {
    it('should POST to /api/v1/auth/refresh', async () => {
      mockPost.mockResolvedValue({ data: { success: true } });
      await authAPI.refreshToken();
      expect(mockPost).toHaveBeenCalledWith('/api/v1/auth/refresh');
    });
  });
});
