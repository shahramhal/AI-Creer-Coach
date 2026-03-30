// apps/backend/src/middlewares/admin.middleware.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { requireAdmin } from './admin.middleware.js';

//  Helpers 

function buildMockResponse() {
  const mockResponse = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return mockResponse as unknown as Response;
}

function buildMockRequest(userOverride?: Partial<Request['user']> | null): Request {
  const requestBase: any = {
    headers: {},
  };

  if (userOverride === null) {
    // Explicitly no user
    requestBase.user = undefined;
  } else if (userOverride !== undefined) {
    requestBase.user = userOverride;
  }

  return requestBase as unknown as Request;
}

//  Tests 

describe('requireAdmin middleware', () => {
  let mockNextFunction: NextFunction;
  let mockResponse: Response;

  beforeEach(() => {
    vi.clearAllMocks();
    mockNextFunction = vi.fn();
    mockResponse = buildMockResponse();
  });

  it('should call next() when req.user has ADMIN role', () => {
    const adminUserRequest = buildMockRequest({
      id: 'admin-user-uuid',
      email: 'admin@company.com',
      isEmailVerified: true,
      role: 'ADMIN',
    });

    requireAdmin(adminUserRequest, mockResponse, mockNextFunction);

    expect(mockNextFunction).toHaveBeenCalledOnce();
    expect((mockResponse.status as any)).not.toHaveBeenCalled();
    expect((mockResponse.json as any)).not.toHaveBeenCalled();
  });

  it('should return 403 with ADMIN_REQUIRED code when req.user has USER role', () => {
    const regularUserRequest = buildMockRequest({
      id: 'regular-user-uuid',
      email: 'user@example.com',
      isEmailVerified: true,
      role: 'USER',
    });

    requireAdmin(regularUserRequest, mockResponse, mockNextFunction);

    expect((mockResponse.status as any)).toHaveBeenCalledWith(403);
    expect((mockResponse.json as any)).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Admin access required',
        code: 'ADMIN_REQUIRED',
      })
    );
    expect(mockNextFunction).not.toHaveBeenCalled();
  });

  it('should return 403 with ADMIN_REQUIRED code when req.user has an unrecognised role', () => {
    const unknownRoleRequest = buildMockRequest({
      id: 'user-with-unknown-role-uuid',
      email: 'moderator@example.com',
      isEmailVerified: true,
      role: 'MODERATOR',
    });

    requireAdmin(unknownRoleRequest, mockResponse, mockNextFunction);

    expect((mockResponse.status as any)).toHaveBeenCalledWith(403);
    expect((mockResponse.json as any)).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: 'ADMIN_REQUIRED',
      })
    );
    expect(mockNextFunction).not.toHaveBeenCalled();
  });

  it('should return 403 when req.user is undefined (unauthenticated request)', () => {
    const unauthenticatedRequest = buildMockRequest(null);

    requireAdmin(unauthenticatedRequest, mockResponse, mockNextFunction);

    expect((mockResponse.status as any)).toHaveBeenCalledWith(403);
    expect((mockResponse.json as any)).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Admin access required',
        code: 'ADMIN_REQUIRED',
      })
    );
    expect(mockNextFunction).not.toHaveBeenCalled();
  });

  it('should not call next() for any non-ADMIN role value', () => {
    const nonAdminRoles = ['USER', 'GUEST', 'EDITOR', '', 'admin']; // lowercase 'admin' is not 'ADMIN'

    for (const nonAdminRole of nonAdminRoles) {
      vi.clearAllMocks();
      mockNextFunction = vi.fn();
      mockResponse = buildMockResponse();

      const mockRequest = buildMockRequest({
        id: 'some-user-uuid',
        email: 'user@example.com',
        isEmailVerified: true,
        role: nonAdminRole,
      });

      requireAdmin(mockRequest, mockResponse, mockNextFunction);

      expect(mockNextFunction).not.toHaveBeenCalled();
      expect((mockResponse.status as any)).toHaveBeenCalledWith(403);
    }
  });
});
