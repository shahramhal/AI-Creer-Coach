// apps/backend/src/controllers/admin.controller.test.ts
//
// Unit tests for admin controller request/response handling.
// AdminService is fully mocked — we only test the controller layer.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

// ─── Hoisted mock service instance ────────────────────────────────────────────
// vi.mock() factories are hoisted to the top of the file by Vitest, so any
// variables they reference must also be hoisted via vi.hoisted().

const sharedMockAdminServiceInstance = vi.hoisted(() => ({
  getDashboardStats: vi.fn(),
  getUserGrowthTrend: vi.fn(),
  listUsers: vi.fn(),
  getUserDetail: vi.fn(),
  toggleUserDisabled: vi.fn(),
  promoteUser: vi.fn(),
  demoteUser: vi.fn(),
  forcePasswordReset: vi.fn(),
  deleteUser: vi.fn(),
  listJobs: vi.fn(),
  getJobStats: vi.fn(),
  triggerJobFetch: vi.fn(),
  triggerJobCleanup: vi.fn(),
  deleteJob: vi.fn(),
  getServiceHealth: vi.fn(),
  getCacheStats: vi.fn(),
  getQueueStatus: vi.fn(),
  getDatabaseStats: vi.fn(),
  getAuditLogs: vi.fn(),
}));

// ─── Mock AdminService before importing the controller ───────────────────────
// Use a `function` keyword (not arrow) so `new AdminService()` works as a constructor.

vi.mock('../services/admin.service.js', () => {
  function MockAdminService(this: any) {
    return sharedMockAdminServiceInstance;
  }

  return { AdminService: MockAdminService };
});

// ─── Mock logAdminAction to prevent real Prisma calls ────────────────────────

vi.mock('../utils/audit.util.js', () => ({
  logAdminAction: vi.fn(),
}));

// Import controller AFTER mocks are registered
import * as adminController from './admin.controller.js';
import { logAdminAction } from '../utils/audit.util.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildMockResponse() {
  const mockResponse = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return mockResponse as unknown as Response;
}

function buildMockRequest(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    query: {},
    params: {},
    body: {},
    user: { id: 'requesting-admin-uuid', email: 'admin@company.com', isEmailVerified: true, role: 'ADMIN' },
    socket: { remoteAddress: '127.0.0.1' },
    ...overrides,
  } as unknown as Request;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Admin Controller', () => {
  let mockResponse: Response;

  beforeEach(() => {
    vi.clearAllMocks();
    mockResponse = buildMockResponse();
  });

  // ─── getDashboardStats ─────────────────────────────────────────────────────

  describe('getDashboardStats', () => {
    it('should return 200 with dashboard stats on success', async () => {
      const fakeStats = {
        totalUsers: 50,
        totalCVs: 30,
        totalApplications: 100,
        totalJobs: 200,
        disabledUsers: 2,
        adminCount: 3,
        serviceHealth: { postgres: true, mongodb: true, redis: true },
      };

      sharedMockAdminServiceInstance.getDashboardStats.mockResolvedValue(fakeStats);

      const mockRequest = buildMockRequest();

      await adminController.getDashboardStats(mockRequest, mockResponse);

      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: fakeStats })
      );
      expect((mockResponse.status as any)).not.toHaveBeenCalled();
    });

    it('should return 500 when AdminService.getDashboardStats throws an unexpected error', async () => {
      sharedMockAdminServiceInstance.getDashboardStats.mockRejectedValue(new Error('Database failure'));

      const mockRequest = buildMockRequest();

      await adminController.getDashboardStats(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(500);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });
  });

  // ─── listUsers ─────────────────────────────────────────────────────────────

  describe('listUsers', () => {
    it('should return 200 with paginated users list', async () => {
      const fakeUsersResult = {
        users: [{ id: 'u1', email: 'alice@example.com' }],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      };

      sharedMockAdminServiceInstance.listUsers.mockResolvedValue(fakeUsersResult);

      const mockRequest = buildMockRequest({ query: { page: '1', limit: '20' } });

      await adminController.listUsers(mockRequest, mockResponse);

      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: fakeUsersResult })
      );
    });

    it('should pass search, role, sortBy, and sortOrder query params to the service', async () => {
      sharedMockAdminServiceInstance.listUsers.mockResolvedValue({ users: [], pagination: {} });

      const mockRequest = buildMockRequest({
        query: {
          page: '2',
          limit: '10',
          search: 'bob',
          role: 'ADMIN',
          sortBy: 'email',
          sortOrder: 'asc',
        },
      });

      await adminController.listUsers(mockRequest, mockResponse);

      expect(sharedMockAdminServiceInstance.listUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
          limit: 10,
          search: 'bob',
          role: 'ADMIN',
          sortBy: 'email',
          sortOrder: 'asc',
        })
      );
    });

    it('should cap the limit at 100 even when a larger value is requested', async () => {
      sharedMockAdminServiceInstance.listUsers.mockResolvedValue({ users: [], pagination: {} });

      const mockRequest = buildMockRequest({ query: { limit: '999' } });

      await adminController.listUsers(mockRequest, mockResponse);

      const calledWithParams = sharedMockAdminServiceInstance.listUsers.mock.calls[0][0];
      expect(calledWithParams.limit).toBe(100);
    });
  });

  // ─── getUserDetail ─────────────────────────────────────────────────────────

  describe('getUserDetail', () => {
    it('should return 200 with user details when user is found', async () => {
      const fakeUserDetail = { id: 'user-detail-uuid', email: 'detail@example.com', role: 'USER' };

      sharedMockAdminServiceInstance.getUserDetail.mockResolvedValue(fakeUserDetail);

      const mockRequest = buildMockRequest({ params: { userId: 'user-detail-uuid' } });

      await adminController.getUserDetail(mockRequest, mockResponse);

      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: fakeUserDetail })
      );
    });

    it('should return 404 when service throws "User not found"', async () => {
      sharedMockAdminServiceInstance.getUserDetail.mockRejectedValue(new Error('User not found'));

      const mockRequest = buildMockRequest({ params: { userId: 'ghost-uuid' } });

      await adminController.getUserDetail(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(404);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'User not found' })
      );
    });
  });

  // ─── toggleUserStatus ──────────────────────────────────────────────────────

  describe('toggleUserStatus', () => {
    it('should return 400 when admin attempts to toggle their own account status', async () => {
      const selfAdminRequest = buildMockRequest({
        params: { userId: 'requesting-admin-uuid' }, // same as req.user.id in buildMockRequest
        body: { disabled: true },
      });

      await adminController.toggleUserStatus(selfAdminRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(400);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'Cannot disable yourself' })
      );
    });

    it('should return 400 when disabled field is not a boolean', async () => {
      const mockRequest = buildMockRequest({
        params: { userId: 'other-user-uuid' },
        body: { disabled: 'yes' }, // string instead of boolean
      });

      await adminController.toggleUserStatus(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(400);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'disabled must be a boolean' })
      );
    });

    it('should return 200 and call logAdminAction after successfully toggling user status', async () => {
      sharedMockAdminServiceInstance.toggleUserDisabled.mockResolvedValue({
        message: 'User disabled successfully',
      });

      const mockRequest = buildMockRequest({
        params: { userId: 'target-toggle-uuid' },
        body: { disabled: true },
      });

      await adminController.toggleUserStatus(mockRequest, mockResponse);

      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
      expect(logAdminAction).toHaveBeenCalledWith(
        mockRequest,
        expect.objectContaining({
          action: 'USER_DISABLED',
          targetType: 'user',
          targetId: 'target-toggle-uuid',
        })
      );
    });

    it('should use USER_ENABLED action in audit log when disabled is false', async () => {
      sharedMockAdminServiceInstance.toggleUserDisabled.mockResolvedValue({
        message: 'User enabled successfully',
      });

      const mockRequest = buildMockRequest({
        params: { userId: 'enable-target-uuid' },
        body: { disabled: false },
      });

      await adminController.toggleUserStatus(mockRequest, mockResponse);

      expect(logAdminAction).toHaveBeenCalledWith(
        mockRequest,
        expect.objectContaining({ action: 'USER_ENABLED' })
      );
    });
  });

  // ─── promoteUser ───────────────────────────────────────────────────────────

  describe('promoteUser', () => {
    it('should return 200 and call logAdminAction with USER_PROMOTED on success', async () => {
      sharedMockAdminServiceInstance.promoteUser.mockResolvedValue({ message: 'User promoted to admin' });

      const mockRequest = buildMockRequest({ params: { userId: 'promote-target-uuid' } });

      await adminController.promoteUser(mockRequest, mockResponse);

      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
      expect(logAdminAction).toHaveBeenCalledWith(
        mockRequest,
        expect.objectContaining({ action: 'USER_PROMOTED', targetId: 'promote-target-uuid' })
      );
    });

    it('should return 404 when service throws "User not found"', async () => {
      sharedMockAdminServiceInstance.promoteUser.mockRejectedValue(new Error('User not found'));

      const mockRequest = buildMockRequest({ params: { userId: 'no-user-uuid' } });

      await adminController.promoteUser(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(404);
    });

    it('should return 400 when service throws "User is already an admin"', async () => {
      sharedMockAdminServiceInstance.promoteUser.mockRejectedValue(
        new Error('User is already an admin')
      );

      const mockRequest = buildMockRequest({ params: { userId: 'already-admin-uuid' } });

      await adminController.promoteUser(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(400);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'User is already an admin' })
      );
    });
  });

  // ─── demoteUser ────────────────────────────────────────────────────────────

  describe('demoteUser', () => {
    it('should return 200 and call logAdminAction with USER_DEMOTED on success', async () => {
      sharedMockAdminServiceInstance.demoteUser.mockResolvedValue({
        message: 'User demoted to regular user',
      });

      const mockRequest = buildMockRequest({ params: { userId: 'demote-target-uuid' } });

      await adminController.demoteUser(mockRequest, mockResponse);

      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
      expect(logAdminAction).toHaveBeenCalledWith(
        mockRequest,
        expect.objectContaining({ action: 'USER_DEMOTED', targetId: 'demote-target-uuid' })
      );
    });

    it('should return 400 when service throws "Cannot demote yourself"', async () => {
      sharedMockAdminServiceInstance.demoteUser.mockRejectedValue(new Error('Cannot demote yourself'));

      const mockRequest = buildMockRequest({ params: { userId: 'self-demote-uuid' } });

      await adminController.demoteUser(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(400);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Cannot demote yourself' })
      );
    });

    it('should return 400 when service throws "Cannot demote the last admin"', async () => {
      sharedMockAdminServiceInstance.demoteUser.mockRejectedValue(
        new Error('Cannot demote the last admin')
      );

      const mockRequest = buildMockRequest({ params: { userId: 'last-admin-uuid' } });

      await adminController.demoteUser(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(400);
    });

    it('should pass req.user.id as the requestingAdminId to the service', async () => {
      sharedMockAdminServiceInstance.demoteUser.mockResolvedValue({
        message: 'User demoted to regular user',
      });

      const mockRequest = buildMockRequest({
        params: { userId: 'target-admin-uuid' },
        user: {
          id: 'acting-admin-uuid',
          email: 'acting@admin.com',
          isEmailVerified: true,
          role: 'ADMIN',
        },
      } as any);

      await adminController.demoteUser(mockRequest, mockResponse);

      expect(sharedMockAdminServiceInstance.demoteUser).toHaveBeenCalledWith(
        'target-admin-uuid',
        'acting-admin-uuid'
      );
    });
  });

  // ─── deleteUser ────────────────────────────────────────────────────────────

  describe('deleteUser', () => {
    it('should return 200 and call logAdminAction with USER_DELETED on success', async () => {
      sharedMockAdminServiceInstance.deleteUser.mockResolvedValue({
        message: 'User and all associated data deleted',
      });

      const mockRequest = buildMockRequest({ params: { userId: 'delete-target-uuid' } });

      await adminController.deleteUser(mockRequest, mockResponse);

      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
      expect(logAdminAction).toHaveBeenCalledWith(
        mockRequest,
        expect.objectContaining({ action: 'USER_DELETED', targetId: 'delete-target-uuid' })
      );
    });

    it('should return 400 when service throws "Cannot delete yourself"', async () => {
      sharedMockAdminServiceInstance.deleteUser.mockRejectedValue(new Error('Cannot delete yourself'));

      const mockRequest = buildMockRequest({ params: { userId: 'self-delete-uuid' } });

      await adminController.deleteUser(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(400);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Cannot delete yourself' })
      );
    });

    it('should return 404 when service throws "User not found"', async () => {
      sharedMockAdminServiceInstance.deleteUser.mockRejectedValue(new Error('User not found'));

      const mockRequest = buildMockRequest({ params: { userId: 'ghost-delete-uuid' } });

      await adminController.deleteUser(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(404);
    });
  });

  // ─── triggerJobFetch ───────────────────────────────────────────────────────

  describe('triggerJobFetch', () => {
    it('should return 400 when keywords or country are missing from the request body', async () => {
      const missingCountryRequest = buildMockRequest({
        body: { keywords: 'software engineer' }, // country is missing
      });

      await adminController.triggerJobFetch(missingCountryRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(400);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'keywords and country are required' })
      );
    });

    it('should return 400 when both keywords and country are absent', async () => {
      const emptyBodyRequest = buildMockRequest({ body: {} });

      await adminController.triggerJobFetch(emptyBodyRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(400);
    });

    it('should return 200 and call logAdminAction with JOB_FETCH_TRIGGERED on success', async () => {
      sharedMockAdminServiceInstance.triggerJobFetch.mockResolvedValue({
        status: 'ok',
        jobsFetched: 50,
      });

      const mockRequest = buildMockRequest({
        body: { keywords: 'data engineer', country: 'gb', location: 'Manchester' },
      });

      await adminController.triggerJobFetch(mockRequest, mockResponse);

      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
      expect(logAdminAction).toHaveBeenCalledWith(
        mockRequest,
        expect.objectContaining({
          action: 'JOB_FETCH_TRIGGERED',
          targetType: 'job',
          details: expect.objectContaining({ keywords: 'data engineer', country: 'gb' }),
        })
      );
    });
  });

  // ─── getAuditLogs ──────────────────────────────────────────────────────────

  describe('getAuditLogs', () => {
    it('should return 200 with audit log data on success', async () => {
      const fakeAuditResult = {
        logs: [{ id: 'log-uuid-1', action: 'USER_DISABLED' }],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      };

      sharedMockAdminServiceInstance.getAuditLogs.mockResolvedValue(fakeAuditResult);

      const mockRequest = buildMockRequest({ query: { page: '1', limit: '20' } });

      await adminController.getAuditLogs(mockRequest, mockResponse);

      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: fakeAuditResult })
      );
    });

    it('should pass the action query param to the service', async () => {
      sharedMockAdminServiceInstance.getAuditLogs.mockResolvedValue({ logs: [], pagination: {} });

      const mockRequest = buildMockRequest({ query: { action: 'USER_PROMOTED' } });

      await adminController.getAuditLogs(mockRequest, mockResponse);

      expect(sharedMockAdminServiceInstance.getAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'USER_PROMOTED' })
      );
    });

    it('should return 500 when AdminService.getAuditLogs throws', async () => {
      sharedMockAdminServiceInstance.getAuditLogs.mockRejectedValue(new Error('DB error'));

      const mockRequest = buildMockRequest();

      await adminController.getAuditLogs(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(500);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });
  });
});
