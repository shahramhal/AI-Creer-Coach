import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

const mockValidationResult = vi.hoisted(() => vi.fn());

vi.mock('express-validator', () => ({
  validationResult: mockValidationResult,
}));

const mockAuthServiceInstance = vi.hoisted(() => ({
  register: vi.fn(),
  login: vi.fn(),
  verifyEmail: vi.fn(),
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
  refreshAccessToken: vi.fn(),
  revokeRefreshToken: vi.fn(),
}));

vi.mock('../services/auth.service.js', () => {
  function MockAuthService(this: any) {
    return mockAuthServiceInstance;
  }
  return { AuthService: MockAuthService };
});

vi.mock('../utils/app-error.util.js', () => ({
  ErrorCodes: {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    TOKEN_INVALID: 'TOKEN_INVALID',
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
  },
}));

import * as authController from './auth.controller.js';

function buildMockResponse() {
  const mockResponse = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    cookie: vi.fn().mockReturnThis(),
    clearCookie: vi.fn().mockReturnThis(),
  };
  return mockResponse as unknown as Response;
}

function buildMockRequest(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    query: {},
    params: {},
    body: {},
    cookies: {},
    user: { id: 'user-uuid-123', email: 'user@example.com', isEmailVerified: true, role: 'USER' },
    ...overrides,
  } as unknown as Request;
}

describe('Auth Controller', () => {
  let mockResponse: Response;
  let mockNext: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockResponse = buildMockResponse();
    mockNext = vi.fn();
    mockValidationResult.mockReturnValue({ isEmpty: () => true, array: () => [] });
  });

  describe('register', () => {
    it('should return 400 with validation errors when validation fails', async () => {
      mockValidationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{ msg: 'Email is required' }, { msg: 'Password too short' }],
      });

      const mockRequest = buildMockRequest({ body: {} });

      await authController.register(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(400);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Validation failed',
          errors: expect.arrayContaining([expect.objectContaining({ msg: 'Email is required' })]),
        })
      );
    });

    it('should return 201 with user data on successful registration', async () => {
      const fakeRegistrationResult = {
        user: { id: 'new-user-uuid', email: 'alice@example.com' },
        message: 'Registration successful',
      };
      mockAuthServiceInstance.register.mockResolvedValue(fakeRegistrationResult);

      const mockRequest = buildMockRequest({
        body: { email: 'alice@example.com', password: 'SecurePass1!', firstName: 'Alice', lastName: 'Smith' },
      });

      await authController.register(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(201);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: fakeRegistrationResult })
      );
    });

    it('should call next with error when auth service throws', async () => {
      const serviceError = new Error('Email already exists');
      mockAuthServiceInstance.register.mockRejectedValue(serviceError);

      const mockRequest = buildMockRequest({
        body: { email: 'existing@example.com', password: 'pass123' },
      });

      await authController.register(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect(mockNext).toHaveBeenCalledWith(serviceError);
    });
  });

  describe('login', () => {
    it('should return 400 with validation errors when validation fails', async () => {
      mockValidationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{ msg: 'Password is required' }],
      });

      const mockRequest = buildMockRequest({ body: { email: 'bob@example.com' } });

      await authController.login(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(400);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'Validation failed' })
      );
    });

    it('should return 200, set refresh token cookie, and return access token on success', async () => {
      const fakeLoginResult = {
        accessToken: 'jwt-access-token',
        refreshToken: 'jwt-refresh-token',
        user: { id: 'bob-uuid', email: 'bob@example.com' },
      };
      mockAuthServiceInstance.login.mockResolvedValue(fakeLoginResult);

      const mockRequest = buildMockRequest({
        body: { email: 'bob@example.com', password: 'correctPass1!' },
      });

      await authController.login(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect((mockResponse.cookie as any)).toHaveBeenCalledWith(
        'refreshToken',
        'jwt-refresh-token',
        expect.objectContaining({ httpOnly: true })
      );
      expect((mockResponse.status as any)).toHaveBeenCalledWith(200);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ accessToken: 'jwt-access-token' }),
        })
      );
    });

    it('should call next with error when auth service throws', async () => {
      const serviceError = new Error('Invalid credentials');
      mockAuthServiceInstance.login.mockRejectedValue(serviceError);

      const mockRequest = buildMockRequest({
        body: { email: 'bob@example.com', password: 'wrongPass' },
      });

      await authController.login(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect(mockNext).toHaveBeenCalledWith(serviceError);
    });
  });

  describe('verifyEmail', () => {
    it('should return 400 when token query param is missing', async () => {
      const mockRequest = buildMockRequest({ query: {} });

      await authController.verifyEmail(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(400);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'Verification token is required' })
      );
    });

    it('should return 200 with result data when email is verified successfully', async () => {
      const fakeVerifyResult = { message: 'Email verified successfully' };
      mockAuthServiceInstance.verifyEmail.mockResolvedValue(fakeVerifyResult);

      const mockRequest = buildMockRequest({ query: { token: 'valid-verification-token' } });

      await authController.verifyEmail(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(200);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: fakeVerifyResult })
      );
    });

    it('should call next with error when auth service throws', async () => {
      const serviceError = new Error('Token expired');
      mockAuthServiceInstance.verifyEmail.mockRejectedValue(serviceError);

      const mockRequest = buildMockRequest({ query: { token: 'expired-token' } });

      await authController.verifyEmail(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect(mockNext).toHaveBeenCalledWith(serviceError);
    });
  });

  describe('forgotPassword', () => {
    it('should return 400 with errors when validation fails', async () => {
      mockValidationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{ msg: 'Email is invalid' }],
      });

      const mockRequest = buildMockRequest({ body: { email: 'not-an-email' } });

      await authController.forgotPassword(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(400);
    });

    it('should return 200 on success', async () => {
      const fakeResult = { message: 'Reset email sent' };
      mockAuthServiceInstance.requestPasswordReset.mockResolvedValue(fakeResult);

      const mockRequest = buildMockRequest({ body: { email: 'user@example.com' } });

      await authController.forgotPassword(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(200);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: fakeResult })
      );
    });

    it('should call next with error when service throws', async () => {
      const serviceError = new Error('Email not found');
      mockAuthServiceInstance.requestPasswordReset.mockRejectedValue(serviceError);

      const mockRequest = buildMockRequest({ body: { email: 'ghost@example.com' } });

      await authController.forgotPassword(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect(mockNext).toHaveBeenCalledWith(serviceError);
    });
  });

  describe('resetPassword', () => {
    it('should return 400 with errors when validation fails', async () => {
      mockValidationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{ msg: 'Password must be at least 8 characters' }],
      });

      const mockRequest = buildMockRequest({ body: { token: 'reset-token', password: 'short' } });

      await authController.resetPassword(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(400);
    });

    it('should return 200 with result data on success', async () => {
      const fakeResult = { message: 'Password reset successful' };
      mockAuthServiceInstance.resetPassword.mockResolvedValue(fakeResult);

      const mockRequest = buildMockRequest({
        body: { token: 'valid-reset-token', password: 'NewSecurePass1!' },
      });

      await authController.resetPassword(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(200);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: fakeResult })
      );
    });

    it('should call next with error when service throws', async () => {
      const serviceError = new Error('Reset token invalid or expired');
      mockAuthServiceInstance.resetPassword.mockRejectedValue(serviceError);

      const mockRequest = buildMockRequest({
        body: { token: 'bad-token', password: 'SomePass1!' },
      });

      await authController.resetPassword(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect(mockNext).toHaveBeenCalledWith(serviceError);
    });
  });

  describe('refreshToken', () => {
    it('should return 401 when no refresh token cookie is present', async () => {
      const mockRequest = buildMockRequest({ cookies: {} });

      await authController.refreshToken(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(401);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'Refresh token not found' })
      );
    });

    it('should return 200 with new access token when refresh token is valid', async () => {
      const fakeRefreshResult = { accessToken: 'new-access-token' };
      mockAuthServiceInstance.refreshAccessToken.mockResolvedValue(fakeRefreshResult);

      const mockRequest = buildMockRequest({ cookies: { refreshToken: 'valid-refresh-token' } });

      await authController.refreshToken(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(200);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: fakeRefreshResult })
      );
    });

    it('should call next with error when service throws', async () => {
      const serviceError = new Error('Refresh token expired');
      mockAuthServiceInstance.refreshAccessToken.mockRejectedValue(serviceError);

      const mockRequest = buildMockRequest({ cookies: { refreshToken: 'expired-refresh-token' } });

      await authController.refreshToken(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect(mockNext).toHaveBeenCalledWith(serviceError);
    });
  });

  describe('logout', () => {
    it('should revoke the refresh token and clear the cookie when cookie is present', async () => {
      mockAuthServiceInstance.revokeRefreshToken.mockResolvedValue(undefined);

      const mockRequest = buildMockRequest({ cookies: { refreshToken: 'active-refresh-token' } });

      await authController.logout(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect(mockAuthServiceInstance.revokeRefreshToken).toHaveBeenCalledWith('active-refresh-token');
      expect((mockResponse.clearCookie as any)).toHaveBeenCalledWith(
        'refreshToken',
        expect.objectContaining({ httpOnly: true })
      );
      expect((mockResponse.status as any)).toHaveBeenCalledWith(200);
    });

    it('should not call revokeRefreshToken when cookie is absent', async () => {
      const mockRequest = buildMockRequest({ cookies: {} });

      await authController.logout(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect(mockAuthServiceInstance.revokeRefreshToken).not.toHaveBeenCalled();
      expect((mockResponse.clearCookie as any)).toHaveBeenCalled();
      expect((mockResponse.status as any)).toHaveBeenCalledWith(200);
    });

    it('should call next with error when revokeRefreshToken throws', async () => {
      const serviceError = new Error('Redis unavailable');
      mockAuthServiceInstance.revokeRefreshToken.mockRejectedValue(serviceError);

      const mockRequest = buildMockRequest({ cookies: { refreshToken: 'some-token' } });

      await authController.logout(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect(mockNext).toHaveBeenCalledWith(serviceError);
    });
  });

  describe('getCurrentUser', () => {
    it('should return 200 with the user object from req.user', async () => {
      const currentUser = { id: 'user-abc', email: 'me@example.com', role: 'USER', isEmailVerified: true };

      const mockRequest = buildMockRequest({ user: currentUser } as any);

      await authController.getCurrentUser(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(200);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ user: currentUser }),
        })
      );
    });
  });
});
