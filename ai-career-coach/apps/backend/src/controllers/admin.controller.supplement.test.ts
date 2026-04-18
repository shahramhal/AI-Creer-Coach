import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

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
  getApiMetrics: vi.fn(),
  recordWebVitals: vi.fn(),
  getWebVitals: vi.fn(),
}));

vi.mock('../services/admin.service.js', () => {
  function MockAdminService(this: any) {
    return sharedMockAdminServiceInstance;
  }
  return { AdminService: MockAdminService };
});

vi.mock('../utils/audit.util.js', () => ({
  logAdminAction: vi.fn(),
}));

import * as adminController from './admin.controller.js';
import { logAdminAction } from '../utils/audit.util.js';

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
    user: { id: 'admin-uuid-001', email: 'admin@company.com', isEmailVerified: true, role: 'ADMIN' },
    socket: { remoteAddress: '127.0.0.1' },
    ...overrides,
  } as unknown as Request;
}

describe('Admin Controller - Supplement', () => {
  let mockResponse: Response;
  let mockNext: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockResponse = buildMockResponse();
    mockNext = vi.fn();
  });

  describe('getUserGrowthTrend', () => {
    it('should return 200 with trend data using default 30 days when no query param provided', async () => {
      const fakeTrend = [{ date: '2024-01-01', count: 5 }, { date: '2024-01-02', count: 8 }];
      sharedMockAdminServiceInstance.getUserGrowthTrend.mockResolvedValue(fakeTrend);

      const mockRequest = buildMockRequest({ query: {} });

      await adminController.getUserGrowthTrend(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect(sharedMockAdminServiceInstance.getUserGrowthTrend).toHaveBeenCalledWith(30);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: fakeTrend })
      );
    });

    it('should pass the days query param to the service', async () => {
      sharedMockAdminServiceInstance.getUserGrowthTrend.mockResolvedValue([]);

      const mockRequest = buildMockRequest({ query: { days: '7' } });

      await adminController.getUserGrowthTrend(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect(sharedMockAdminServiceInstance.getUserGrowthTrend).toHaveBeenCalledWith(7);
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('DB unavailable');
      sharedMockAdminServiceInstance.getUserGrowthTrend.mockRejectedValue(error);

      const mockRequest = buildMockRequest({ query: {} });

      await adminController.getUserGrowthTrend(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('listJobs', () => {
    it('should return 200 with paginated jobs on success', async () => {
      const fakeJobResult = {
        jobs: [{ id: 'job-1', title: 'Backend Engineer', source: 'adzuna' }],
        pagination: { page: 1, limit: 20, total: 1 },
      };
      sharedMockAdminServiceInstance.listJobs.mockResolvedValue(fakeJobResult);

      const mockRequest = buildMockRequest({ query: { page: '1', limit: '20' } });

      await adminController.listJobs(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: fakeJobResult })
      );
    });

    it('should pass source, country, and sort params to service', async () => {
      sharedMockAdminServiceInstance.listJobs.mockResolvedValue({ jobs: [], pagination: {} });

      const mockRequest = buildMockRequest({
        query: { source: 'reed', country: 'gb', sortBy: 'created_at', sortOrder: 'asc' },
      });

      await adminController.listJobs(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect(sharedMockAdminServiceInstance.listJobs).toHaveBeenCalledWith(
        expect.objectContaining({ source: 'reed', country: 'gb', sortBy: 'created_at', sortOrder: 'asc' })
      );
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('MongoDB error');
      sharedMockAdminServiceInstance.listJobs.mockRejectedValue(error);

      const mockRequest = buildMockRequest({ query: {} });

      await adminController.listJobs(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getJobStats', () => {
    it('should return 200 with job stats on success', async () => {
      const fakeJobStats = { total: 1200, bySource: { adzuna: 800, reed: 400 }, byCountry: { gb: 1000 } };
      sharedMockAdminServiceInstance.getJobStats.mockResolvedValue(fakeJobStats);

      const mockRequest = buildMockRequest();

      await adminController.getJobStats(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: fakeJobStats })
      );
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Stats query failed');
      sharedMockAdminServiceInstance.getJobStats.mockRejectedValue(error);

      const mockRequest = buildMockRequest();

      await adminController.getJobStats(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('triggerJobCleanup', () => {
    it('should return 200 and call logAdminAction with JOB_CLEANUP_TRIGGERED on success', async () => {
      const fakeCleanupResult = { deletedCount: 42 };
      sharedMockAdminServiceInstance.triggerJobCleanup.mockResolvedValue(fakeCleanupResult);

      const mockRequest = buildMockRequest();

      await adminController.triggerJobCleanup(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: fakeCleanupResult })
      );
      expect(logAdminAction).toHaveBeenCalledWith(
        mockRequest,
        expect.objectContaining({ action: 'JOB_CLEANUP_TRIGGERED', targetType: 'job' })
      );
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Cleanup failed');
      sharedMockAdminServiceInstance.triggerJobCleanup.mockRejectedValue(error);

      const mockRequest = buildMockRequest();

      await adminController.triggerJobCleanup(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('deleteJob', () => {
    it('should return 200 and call logAdminAction with JOB_DELETED on success', async () => {
      const fakeDeleteResult = { message: 'Job removed' };
      sharedMockAdminServiceInstance.deleteJob.mockResolvedValue(fakeDeleteResult);

      const mockRequest = buildMockRequest({ params: { jobId: 'job-to-delete-uuid' } });

      await adminController.deleteJob(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: fakeDeleteResult })
      );
      expect(logAdminAction).toHaveBeenCalledWith(
        mockRequest,
        expect.objectContaining({ action: 'JOB_DELETED', targetType: 'job', targetId: 'job-to-delete-uuid' })
      );
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Job not found');
      sharedMockAdminServiceInstance.deleteJob.mockRejectedValue(error);

      const mockRequest = buildMockRequest({ params: { jobId: 'ghost-job-uuid' } });

      await adminController.deleteJob(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getServiceHealth', () => {
    it('should return 200 with service health status on success', async () => {
      const fakeHealth = { postgres: true, mongodb: true, redis: true, mlService: true };
      sharedMockAdminServiceInstance.getServiceHealth.mockResolvedValue(fakeHealth);

      const mockRequest = buildMockRequest();

      await adminController.getServiceHealth(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: fakeHealth })
      );
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Health check failed');
      sharedMockAdminServiceInstance.getServiceHealth.mockRejectedValue(error);

      const mockRequest = buildMockRequest();

      await adminController.getServiceHealth(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getCacheStats', () => {
    it('should return 200 with cache statistics on success', async () => {
      const fakeCacheStats = { hits: 1500, misses: 200, keyCount: 450 };
      sharedMockAdminServiceInstance.getCacheStats.mockResolvedValue(fakeCacheStats);

      const mockRequest = buildMockRequest();

      await adminController.getCacheStats(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: fakeCacheStats })
      );
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Redis connection lost');
      sharedMockAdminServiceInstance.getCacheStats.mockRejectedValue(error);

      const mockRequest = buildMockRequest();

      await adminController.getCacheStats(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getQueueStatus', () => {
    it('should return 200 with queue status on success', async () => {
      const fakeQueueStatus = { emailQueue: { waiting: 5, active: 1, completed: 200 } };
      sharedMockAdminServiceInstance.getQueueStatus.mockResolvedValue(fakeQueueStatus);

      const mockRequest = buildMockRequest();

      await adminController.getQueueStatus(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: fakeQueueStatus })
      );
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Queue connection failed');
      sharedMockAdminServiceInstance.getQueueStatus.mockRejectedValue(error);

      const mockRequest = buildMockRequest();

      await adminController.getQueueStatus(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getDatabaseStats', () => {
    it('should return 200 with database statistics on success', async () => {
      const fakeDbStats = {
        postgres: { userCount: 500, cvCount: 300 },
        mongodb: { parsedCVCount: 280, jobCount: 1500 },
      };
      sharedMockAdminServiceInstance.getDatabaseStats.mockResolvedValue(fakeDbStats);

      const mockRequest = buildMockRequest();

      await adminController.getDatabaseStats(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: fakeDbStats })
      );
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('DB stats query failed');
      sharedMockAdminServiceInstance.getDatabaseStats.mockRejectedValue(error);

      const mockRequest = buildMockRequest();

      await adminController.getDatabaseStats(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getApiMetrics', () => {
    it('should return 200 with API metrics on success', async () => {
      const fakeMetrics = { requestsPerMinute: 120, avgLatencyMs: 45, errorRate: 0.02 };
      sharedMockAdminServiceInstance.getApiMetrics.mockResolvedValue(fakeMetrics);

      const mockRequest = buildMockRequest();

      await adminController.getApiMetrics(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: fakeMetrics })
      );
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Metrics collection failed');
      sharedMockAdminServiceInstance.getApiMetrics.mockRejectedValue(error);

      const mockRequest = buildMockRequest();

      await adminController.getApiMetrics(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('reportWebVitals', () => {
    it('should return 400 when vitals is missing from request body', async () => {
      const mockRequest = buildMockRequest({ body: {} });

      await adminController.reportWebVitals(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(400);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'vitals array is required' })
      );
    });

    it('should return 400 when vitals is an empty array', async () => {
      const mockRequest = buildMockRequest({ body: { vitals: [] } });

      await adminController.reportWebVitals(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(400);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'vitals array is required' })
      );
    });

    it('should return 200 when a valid vitals array is provided', async () => {
      sharedMockAdminServiceInstance.recordWebVitals.mockResolvedValue(undefined);

      const validVitals = [
        { name: 'LCP', value: 2500, page: '/dashboard' },
        { name: 'FID', value: 100, page: '/dashboard' },
      ];

      const mockRequest = buildMockRequest({ body: { vitals: validVitals } });

      await adminController.reportWebVitals(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect(sharedMockAdminServiceInstance.recordWebVitals).toHaveBeenCalledWith(validVitals);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Recording failed');
      sharedMockAdminServiceInstance.recordWebVitals.mockRejectedValue(error);

      const mockRequest = buildMockRequest({
        body: { vitals: [{ name: 'CLS', value: 0.1, page: '/home' }] },
      });

      await adminController.reportWebVitals(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getWebVitals', () => {
    it('should return 200 with web vitals data on success', async () => {
      const fakeWebVitals = [
        { name: 'LCP', avg: 2300, p75: 2800, page: '/dashboard' },
      ];
      sharedMockAdminServiceInstance.getWebVitals.mockResolvedValue(fakeWebVitals);

      const mockRequest = buildMockRequest();

      await adminController.getWebVitals(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: fakeWebVitals })
      );
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Read failed');
      sharedMockAdminServiceInstance.getWebVitals.mockRejectedValue(error);

      const mockRequest = buildMockRequest();

      await adminController.getWebVitals(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('forceResetPassword', () => {
    it('should return 200 and call logAdminAction with FORCE_PASSWORD_RESET on success', async () => {
      const fakeResetResult = { message: 'Password reset email sent to user' };
      sharedMockAdminServiceInstance.forcePasswordReset.mockResolvedValue(fakeResetResult);

      const mockRequest = buildMockRequest({ params: { userId: 'target-user-uuid' } });

      await adminController.forceResetPassword(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: fakeResetResult })
      );
      expect(logAdminAction).toHaveBeenCalledWith(
        mockRequest,
        expect.objectContaining({
          action: 'FORCE_PASSWORD_RESET',
          targetType: 'user',
          targetId: 'target-user-uuid',
        })
      );
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('User not found');
      sharedMockAdminServiceInstance.forcePasswordReset.mockRejectedValue(error);

      const mockRequest = buildMockRequest({ params: { userId: 'ghost-user-uuid' } });

      await adminController.forceResetPassword(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
