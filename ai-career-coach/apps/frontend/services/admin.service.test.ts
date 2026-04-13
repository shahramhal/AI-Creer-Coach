import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../library/api', () => {
  const mockApi = {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  };
  return { default: mockApi, authAPI: {} };
});

import { adminService } from './admin.service';
import api from '../library/api';

const mockApi = api as any;

describe('AdminService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.get.mockResolvedValue({ data: {} });
    mockApi.post.mockResolvedValue({ data: {} });
    mockApi.patch.mockResolvedValue({ data: {} });
    mockApi.delete.mockResolvedValue({ data: {} });
  });

  describe('getDashboardStats', () => {
    it('should call GET /api/v1/admin/dashboard/stats', async () => {
      await adminService.getDashboardStats();
      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/admin/dashboard/stats');
    });
  });

  describe('getUserGrowthTrend', () => {
    it('should default to 30 days when no argument is provided', async () => {
      await adminService.getUserGrowthTrend();
      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/admin/dashboard/user-growth?days=30');
    });

    it('should use the provided days parameter', async () => {
      await adminService.getUserGrowthTrend(7);
      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/admin/dashboard/user-growth?days=7');
    });
  });

  describe('listUsers', () => {
    it('should call GET /api/v1/admin/users with no params when empty object is passed', async () => {
      await adminService.listUsers({});
      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/admin/users?');
    });

    it('should include page and limit in the query string when provided', async () => {
      await adminService.listUsers({ page: 2, limit: 25 });
      const calledUrl = mockApi.get.mock.calls[0][0] as string;
      expect(calledUrl).toContain('page=2');
      expect(calledUrl).toContain('limit=25');
    });

    it('should include search term when provided', async () => {
      await adminService.listUsers({ search: 'alice' });
      const calledUrl = mockApi.get.mock.calls[0][0] as string;
      expect(calledUrl).toContain('search=alice');
    });

    it('should include role filter when provided', async () => {
      await adminService.listUsers({ role: 'ADMIN' });
      const calledUrl = mockApi.get.mock.calls[0][0] as string;
      expect(calledUrl).toContain('role=ADMIN');
    });
  });

  describe('getUserDetail', () => {
    it('should call GET /api/v1/admin/users/:id', async () => {
      const userId = 'user-uuid-123';
      await adminService.getUserDetail(userId);
      expect(mockApi.get).toHaveBeenCalledWith(`/api/v1/admin/users/${userId}`);
    });
  });

  describe('toggleUserStatus', () => {
    it('should call PATCH /api/v1/admin/users/:id/status with disabled flag', async () => {
      const userId = 'user-uuid-123';
      await adminService.toggleUserStatus(userId, true);
      expect(mockApi.patch).toHaveBeenCalledWith(`/api/v1/admin/users/${userId}/status`, { disabled: true });
    });

    it('should pass disabled=false to re-enable a user', async () => {
      const userId = 'user-uuid-456';
      await adminService.toggleUserStatus(userId, false);
      expect(mockApi.patch).toHaveBeenCalledWith(`/api/v1/admin/users/${userId}/status`, { disabled: false });
    });
  });

  describe('promoteUser', () => {
    it('should call POST /api/v1/admin/users/:id/promote', async () => {
      const userId = 'user-uuid-789';
      await adminService.promoteUser(userId);
      expect(mockApi.post).toHaveBeenCalledWith(`/api/v1/admin/users/${userId}/promote`);
    });
  });

  describe('demoteUser', () => {
    it('should call POST /api/v1/admin/users/:id/demote', async () => {
      const userId = 'user-uuid-789';
      await adminService.demoteUser(userId);
      expect(mockApi.post).toHaveBeenCalledWith(`/api/v1/admin/users/${userId}/demote`);
    });
  });

  describe('deleteUser', () => {
    it('should call DELETE /api/v1/admin/users/:id', async () => {
      const userId = 'user-uuid-999';
      await adminService.deleteUser(userId);
      expect(mockApi.delete).toHaveBeenCalledWith(`/api/v1/admin/users/${userId}`);
    });
  });

  describe('listJobs', () => {
    it('should call GET /api/v1/admin/jobs with no params when empty object is passed', async () => {
      await adminService.listJobs({});
      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/admin/jobs?');
    });

    it('should include source and country when provided', async () => {
      await adminService.listJobs({ source: 'adzuna', country: 'gb' });
      const calledUrl = mockApi.get.mock.calls[0][0] as string;
      expect(calledUrl).toContain('source=adzuna');
      expect(calledUrl).toContain('country=gb');
    });
  });

  describe('getJobStats', () => {
    it('should call GET /api/v1/admin/jobs/stats', async () => {
      await adminService.getJobStats();
      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/admin/jobs/stats');
    });
  });

  describe('triggerJobFetch', () => {
    it('should call POST /api/v1/admin/jobs/fetch with the provided data', async () => {
      const fetchData = { keywords: 'react developer', country: 'gb', location: 'London' };
      await adminService.triggerJobFetch(fetchData);
      expect(mockApi.post).toHaveBeenCalledWith('/api/v1/admin/jobs/fetch', fetchData);
    });
  });

  describe('triggerJobCleanup', () => {
    it('should call POST /api/v1/admin/jobs/cleanup', async () => {
      await adminService.triggerJobCleanup();
      expect(mockApi.post).toHaveBeenCalledWith('/api/v1/admin/jobs/cleanup');
    });
  });

  describe('deleteJob', () => {
    it('should call DELETE /api/v1/admin/jobs/:id', async () => {
      const jobId = 'job-uuid-abc';
      await adminService.deleteJob(jobId);
      expect(mockApi.delete).toHaveBeenCalledWith(`/api/v1/admin/jobs/${jobId}`);
    });
  });

  describe('getServiceHealth', () => {
    it('should call GET /api/v1/admin/system/health', async () => {
      await adminService.getServiceHealth();
      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/admin/system/health');
    });
  });

  describe('getCacheStats', () => {
    it('should call GET /api/v1/admin/system/cache', async () => {
      await adminService.getCacheStats();
      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/admin/system/cache');
    });
  });

  describe('getQueueStatus', () => {
    it('should call GET /api/v1/admin/system/queues', async () => {
      await adminService.getQueueStatus();
      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/admin/system/queues');
    });
  });

  describe('getDatabaseStats', () => {
    it('should call GET /api/v1/admin/system/database', async () => {
      await adminService.getDatabaseStats();
      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/admin/system/database');
    });
  });

  describe('getAuditLogs', () => {
    it('should call GET /api/v1/admin/audit-logs with no params when empty', async () => {
      await adminService.getAuditLogs({});
      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/admin/audit-logs?');
    });

    it('should include action filter when provided', async () => {
      await adminService.getAuditLogs({ action: 'USER_BANNED', page: 1, limit: 20 });
      const calledUrl = mockApi.get.mock.calls[0][0] as string;
      expect(calledUrl).toContain('action=USER_BANNED');
      expect(calledUrl).toContain('page=1');
      expect(calledUrl).toContain('limit=20');
    });
  });
});
