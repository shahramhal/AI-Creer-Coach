// apps/backend/src/middlewares/auth.middleware.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// We import the middleware after mocks are set up (mocks are in test-setup.ts)
import { authenticate, requireEmailVerification, optionalAuthenticate } from './auth.middleware.js';
import { PrismaClient } from '@prisma/client';

// Get the mocked Prisma instance
const mockPrismaInstance = new PrismaClient() as any;

// Helper to generate a valid test access token
function createValidAccessToken(userId: string, email: string): string {
  return jwt.sign({ userId, email }, process.env.JWT_SECRET!, { expiresIn: '1h' });
}

// Helper to generate an expired access token
function createExpiredAccessToken(userId: string, email: string): string {
  return jwt.sign({ userId, email }, process.env.JWT_SECRET!, { expiresIn: -1 });
}

// Helper to build a minimal mock Express request
function buildMockRequest(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    user: undefined,
    ...overrides,
  } as unknown as Request;
}

// Helper to build a mock Express response with chainable methods
function buildMockResponse() {
  const mockResponse = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    cookie: vi.fn().mockReturnThis(),
    clearCookie: vi.fn().mockReturnThis(),
  };
  return mockResponse as unknown as Response;
}

describe('authenticate middleware', () => {
  let nextFunction: NextFunction;
  let mockResponse: Response;

  beforeEach(() => {
    vi.clearAllMocks();
    nextFunction = vi.fn();
    mockResponse = buildMockResponse();
  });

  it('should return 401 when no Authorization header is present', async () => {
    const mockRequest = buildMockRequest({ headers: {} });

    await authenticate(mockRequest, mockResponse, nextFunction);

    expect((mockResponse.status as any).mock.calls[0][0]).toBe(401);
    expect((mockResponse.json as any)).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Access token required' })
    );
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 401 when Authorization header is not in "Bearer <token>" format', async () => {
    const mockRequest = buildMockRequest({
      headers: { authorization: 'Basic dXNlcjpwYXNz' },
    });

    await authenticate(mockRequest, mockResponse, nextFunction);

    expect((mockResponse.status as any).mock.calls[0][0]).toBe(401);
    expect((mockResponse.json as any)).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Access token required' })
    );
  });

  it('should return 401 and TOKEN_EXPIRED code when token is expired', async () => {
    const expiredToken = createExpiredAccessToken('user-uuid-1', 'user@test.com');
    const mockRequest = buildMockRequest({
      headers: { authorization: `Bearer ${expiredToken}` },
    });

    await authenticate(mockRequest, mockResponse, nextFunction);

    expect((mockResponse.status as any).mock.calls[0][0]).toBe(401);
    expect((mockResponse.json as any)).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Token expired',
        code: 'TOKEN_EXPIRED',
      })
    );
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 401 when token signature is invalid', async () => {
    const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0IiwiZW1haWwiOiJ0ZXN0QHRlc3QuY29tIn0.INVALIDSIGNATURE';
    const mockRequest = buildMockRequest({
      headers: { authorization: `Bearer ${invalidToken}` },
    });

    await authenticate(mockRequest, mockResponse, nextFunction);

    expect((mockResponse.status as any).mock.calls[0][0]).toBe(401);
    expect((mockResponse.json as any)).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
  });

  it('should return 401 when user does not exist in database', async () => {
    const validToken = createValidAccessToken('nonexistent-user-id', 'ghost@test.com');
    const mockRequest = buildMockRequest({
      headers: { authorization: `Bearer ${validToken}` },
    });

    // Prisma returns null - user not found
    mockPrismaInstance.user.findUnique.mockResolvedValue(null);

    await authenticate(mockRequest, mockResponse, nextFunction);

    expect((mockResponse.status as any).mock.calls[0][0]).toBe(401);
    expect((mockResponse.json as any)).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'User not found' })
    );
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should call next() and attach user to request when token is valid and user exists', async () => {
    const existingUserId = 'existing-user-uuid';
    const existingUserEmail = 'real@test.com';
    const validToken = createValidAccessToken(existingUserId, existingUserEmail);
    const mockRequest = buildMockRequest({
      headers: { authorization: `Bearer ${validToken}` },
    });

    const foundUser = {
      id: existingUserId,
      email: existingUserEmail,
      isEmailVerified: true,
      firstName: 'John',
      lastName: 'Doe',
    };

    mockPrismaInstance.user.findUnique.mockResolvedValue(foundUser);

    await authenticate(mockRequest, mockResponse, nextFunction);

    expect(nextFunction).toHaveBeenCalledOnce();

    const attachedUser = (mockRequest as any).user;
    expect(attachedUser).toEqual({
      id: existingUserId,
      email: existingUserEmail,
      isEmailVerified: true,
    });

    // Verify no sensitive credentials or tokens leak into req.user
    expect(attachedUser).not.toHaveProperty('passwordHash');
    expect(attachedUser).not.toHaveProperty('resetPasswordToken');
    expect(attachedUser).not.toHaveProperty('emailVerifyToken');
  });
});

describe('requireEmailVerification middleware', () => {
  let nextFunction: NextFunction;
  let mockResponse: Response;

  beforeEach(() => {
    vi.clearAllMocks();
    nextFunction = vi.fn();
    mockResponse = buildMockResponse();
  });

  it('should return 403 with EMAIL_NOT_VERIFIED code when user email is not verified', () => {
    const mockRequest = buildMockRequest({
      user: { id: 'user-id', email: 'user@test.com', isEmailVerified: false },
    } as any);

    requireEmailVerification(mockRequest, mockResponse, nextFunction);

    expect((mockResponse.status as any).mock.calls[0][0]).toBe(403);
    expect((mockResponse.json as any)).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Email verification required',
        code: 'EMAIL_NOT_VERIFIED',
      })
    );
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 403 when req.user is undefined', () => {
    const mockRequest = buildMockRequest({ user: undefined } as any);

    requireEmailVerification(mockRequest, mockResponse, nextFunction);

    expect((mockResponse.status as any).mock.calls[0][0]).toBe(403);
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should call next() when user email is verified', () => {
    const mockRequest = buildMockRequest({
      user: { id: 'user-id', email: 'user@test.com', isEmailVerified: true },
    } as any);

    requireEmailVerification(mockRequest, mockResponse, nextFunction);

    expect(nextFunction).toHaveBeenCalledOnce();
    expect((mockResponse.status as any)).not.toHaveBeenCalled();
  });
});

describe('optionalAuthenticate middleware', () => {
  let nextFunction: NextFunction;
  let mockResponse: Response;

  beforeEach(() => {
    vi.clearAllMocks();
    nextFunction = vi.fn();
    mockResponse = buildMockResponse();
  });

  it('should call next() without attaching user when no Authorization header is present', async () => {
    const mockRequest = buildMockRequest({ headers: {} });

    await optionalAuthenticate(mockRequest, mockResponse, nextFunction);

    expect(nextFunction).toHaveBeenCalledOnce();
    expect((mockRequest as any).user).toBeUndefined();
  });

  it('should call next() without attaching user when token is invalid', async () => {
    const mockRequest = buildMockRequest({
      headers: { authorization: 'Bearer definitely-not-a-real-token' },
    });

    await optionalAuthenticate(mockRequest, mockResponse, nextFunction);

    // Should still call next without throwing
    expect(nextFunction).toHaveBeenCalledOnce();
    expect((mockRequest as any).user).toBeUndefined();
  });

  it('should attach user to request and call next() when token is valid', async () => {
    const existingUserId = 'optional-user-uuid';
    const existingUserEmail = 'optional@test.com';
    const validToken = createValidAccessToken(existingUserId, existingUserEmail);
    const mockRequest = buildMockRequest({
      headers: { authorization: `Bearer ${validToken}` },
    });

    const foundUser = {
      id: existingUserId,
      email: existingUserEmail,
      isEmailVerified: false,
    };
    mockPrismaInstance.user.findUnique.mockResolvedValue(foundUser);

    await optionalAuthenticate(mockRequest, mockResponse, nextFunction);

    expect(nextFunction).toHaveBeenCalledOnce();
    expect((mockRequest as any).user).toEqual({
      id: existingUserId,
      email: existingUserEmail,
      isEmailVerified: false,
    });
  });
});
