// apps/backend/src/middlewares/auth.middleware.disabled.test.ts
//
// Tests specifically for the isDisabled + role features added to the auth middleware.
// These are kept in a separate file to avoid modifying the already-passing
// auth.middleware.test.ts file.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate } from './auth.middleware.js';
import { PrismaClient } from '@prisma/client';

const mockPrismaInstance = new PrismaClient() as any;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createValidAccessToken(userId: string, userEmail: string): string {
  return jwt.sign({ userId, email: userEmail }, process.env.JWT_SECRET!, { expiresIn: '1h' });
}

function buildMockRequest(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    user: undefined,
    ...overrides,
  } as unknown as Request;
}

function buildMockResponse() {
  const mockResponse = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return mockResponse as unknown as Response;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('authenticate middleware — disabled account and role features', () => {
  let mockNextFunction: NextFunction;
  let mockResponse: Response;

  beforeEach(() => {
    vi.clearAllMocks();
    mockNextFunction = vi.fn();
    mockResponse = buildMockResponse();
  });

  it('should return 403 with ACCOUNT_DISABLED code when user.isDisabled is true', async () => {
    const disabledUserId = 'disabled-user-uuid';
    const disabledUserEmail = 'disabled@test.com';
    const validToken = createValidAccessToken(disabledUserId, disabledUserEmail);

    const mockRequest = buildMockRequest({
      headers: { authorization: `Bearer ${validToken}` },
    });

    const disabledUserRecord = {
      id: disabledUserId,
      email: disabledUserEmail,
      isEmailVerified: true,
      firstName: 'Banned',
      lastName: 'User',
      role: 'USER',
      isDisabled: true, // account is disabled
    };

    mockPrismaInstance.user.findUnique.mockResolvedValue(disabledUserRecord);

    await authenticate(mockRequest, mockResponse, mockNextFunction);

    expect((mockResponse.status as any)).toHaveBeenCalledWith(403);
    expect((mockResponse.json as any)).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Account is disabled',
        code: 'ACCOUNT_DISABLED',
      })
    );
    expect(mockNextFunction).not.toHaveBeenCalled();
  });

  it('should NOT attach a disabled user to req.user', async () => {
    const disabledUserId = 'disabled-user-no-attach-uuid';
    const validToken = createValidAccessToken(disabledUserId, 'nope@test.com');

    const mockRequest = buildMockRequest({
      headers: { authorization: `Bearer ${validToken}` },
    });

    mockPrismaInstance.user.findUnique.mockResolvedValue({
      id: disabledUserId,
      email: 'nope@test.com',
      isEmailVerified: false,
      firstName: null,
      lastName: null,
      role: 'USER',
      isDisabled: true,
    });

    await authenticate(mockRequest, mockResponse, mockNextFunction);

    // req.user should remain unset
    expect((mockRequest as any).user).toBeUndefined();
  });

  it('should attach role to req.user when authentication succeeds for an active account', async () => {
    const activeUserId = 'active-user-with-role-uuid';
    const activeUserEmail = 'active@test.com';
    const validToken = createValidAccessToken(activeUserId, activeUserEmail);

    const mockRequest = buildMockRequest({
      headers: { authorization: `Bearer ${validToken}` },
    });

    const activeUserRecord = {
      id: activeUserId,
      email: activeUserEmail,
      isEmailVerified: true,
      firstName: 'Active',
      lastName: 'Person',
      role: 'ADMIN',
      isDisabled: false,
    };

    mockPrismaInstance.user.findUnique.mockResolvedValue(activeUserRecord);

    await authenticate(mockRequest, mockResponse, mockNextFunction);

    expect(mockNextFunction).toHaveBeenCalledOnce();

    const attachedUser = (mockRequest as any).user;
    expect(attachedUser).toBeDefined();
    expect(attachedUser.role).toBe('ADMIN');
    expect(attachedUser.id).toBe(activeUserId);
    expect(attachedUser.email).toBe(activeUserEmail);
  });

  it('should attach USER role to req.user for a regular active user', async () => {
    const regularUserId = 'regular-active-uuid';
    const validToken = createValidAccessToken(regularUserId, 'regular@test.com');

    const mockRequest = buildMockRequest({
      headers: { authorization: `Bearer ${validToken}` },
    });

    mockPrismaInstance.user.findUnique.mockResolvedValue({
      id: regularUserId,
      email: 'regular@test.com',
      isEmailVerified: true,
      firstName: 'Regular',
      lastName: 'Joe',
      role: 'USER',
      isDisabled: false,
    });

    await authenticate(mockRequest, mockResponse, mockNextFunction);

    expect(mockNextFunction).toHaveBeenCalledOnce();
    expect((mockRequest as any).user.role).toBe('USER');
  });

  it('should proceed normally when isDisabled is false (active account)', async () => {
    const enabledUserId = 'enabled-user-uuid';
    const validToken = createValidAccessToken(enabledUserId, 'enabled@test.com');

    const mockRequest = buildMockRequest({
      headers: { authorization: `Bearer ${validToken}` },
    });

    mockPrismaInstance.user.findUnique.mockResolvedValue({
      id: enabledUserId,
      email: 'enabled@test.com',
      isEmailVerified: true,
      firstName: 'Enabled',
      lastName: 'User',
      role: 'USER',
      isDisabled: false,
    });

    await authenticate(mockRequest, mockResponse, mockNextFunction);

    expect(mockNextFunction).toHaveBeenCalledOnce();
    expect((mockResponse.status as any)).not.toHaveBeenCalled();
  });
});
