// apps/backend/src/routes/admin.routes.test.ts
//
// Integration-style tests verifying that admin routes enforce
// authenticate + requireAdmin middleware and delegate to the correct handlers.
// All service dependencies are mocked — no real DB or Redis calls.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const mockPrismaInstance = new PrismaClient() as any;

// ─── Hoisted mock service instance ────────────────────────────────────────────
// vi.mock() factories are hoisted to the top of the file by Vitest, so any
// variables they reference must also be hoisted via vi.hoisted().

const sharedMockAdminServiceInstance = vi.hoisted(() => ({
  getDashboardStats: vi.fn().mockResolvedValue({
    totalUsers: 10,
    totalCVs: 5,
    totalApplications: 20,
    totalJobs: 100,
    disabledUsers: 1,
    adminCount: 2,
    serviceHealth: { postgres: true, mongodb: true, redis: true },
  }),
  getUserGrowthTrend: vi.fn().mockResolvedValue([]),
  listUsers: vi.fn().mockResolvedValue({
    users: [],
    pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
  }),
  getUserDetail: vi.fn().mockResolvedValue({ id: 'user-uuid', email: 'user@test.com' }),
  toggleUserDisabled: vi.fn().mockResolvedValue({ message: 'User disabled successfully' }),
  promoteUser: vi.fn().mockResolvedValue({ message: 'User promoted to admin' }),
  demoteUser: vi.fn().mockResolvedValue({ message: 'User demoted to regular user' }),
  forcePasswordReset: vi.fn().mockResolvedValue({
    resetToken: 'tok',
    message: 'Password reset token generated',
  }),
  deleteUser: vi.fn().mockResolvedValue({ message: 'User and all associated data deleted' }),
  listJobs: vi.fn().mockResolvedValue({ jobs: [], pagination: {} }),
  getJobStats: vi.fn().mockResolvedValue({ totalJobs: 0, bySource: [], byCountry: [] }),
  triggerJobFetch: vi.fn().mockResolvedValue({ status: 'ok' }),
  triggerJobCleanup: vi.fn().mockResolvedValue({ status: 'ok' }),
  deleteJob: vi.fn().mockResolvedValue({ message: 'Job deleted' }),
  getServiceHealth: vi.fn().mockResolvedValue({ postgres: true, mongodb: true, redis: true }),
  getCacheStats: vi.fn().mockResolvedValue({
    keyCount: 0,
    hitRate: { hits: 0, misses: 0 },
    memory: {},
  }),
  getQueueStatus: vi.fn().mockResolvedValue([]),
  getDatabaseStats: vi.fn().mockResolvedValue({ postgres: {}, mongodb: [] }),
  getAuditLogs: vi.fn().mockResolvedValue({ logs: [], pagination: {} }),
}));

// ─── Mock AdminService before importing routes ────────────────────────────────
// Must use `function` (not arrow) so `new AdminService()` works as a constructor.

vi.mock('../services/admin.service.js', () => {
  function MockAdminService(this: any) {
    return sharedMockAdminServiceInstance;
  }

  return { AdminService: MockAdminService };
});

vi.mock('../utils/audit.util.js', () => ({
  logAdminAction: vi.fn(),
}));

// Import router AFTER mocks are set up
import adminRouter from './admin.routes.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createTestApp() {
  const testApp = express();
  testApp.use(express.json());
  testApp.use('/admin', adminRouter as any);
  return testApp;
}

function createValidAdminToken(userId: string, userEmail: string): string {
  return jwt.sign({ userId, email: userEmail }, process.env.JWT_SECRET!, { expiresIn: '1h' });
}

function buildAdminUserRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'admin-user-uuid',
    email: 'admin@company.com',
    isEmailVerified: true,
    firstName: 'Admin',
    lastName: 'User',
    role: 'ADMIN',
    isDisabled: false,
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Admin Routes — middleware enforcement', () => {
  let testApp: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();

    // Re-apply default resolved values after clearAllMocks resets the mock implementations
    sharedMockAdminServiceInstance.getDashboardStats.mockResolvedValue({
      totalUsers: 10,
      totalCVs: 5,
      totalApplications: 20,
      totalJobs: 100,
      disabledUsers: 1,
      adminCount: 2,
      serviceHealth: { postgres: true, mongodb: true, redis: true },
    });
    sharedMockAdminServiceInstance.listUsers.mockResolvedValue({
      users: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });
    sharedMockAdminServiceInstance.getAuditLogs.mockResolvedValue({ logs: [], pagination: {} });
    sharedMockAdminServiceInstance.getServiceHealth.mockResolvedValue({
      postgres: true,
      mongodb: true,
      redis: true,
    });
    sharedMockAdminServiceInstance.toggleUserDisabled.mockResolvedValue({
      message: 'User disabled successfully',
    });

    testApp = createTestApp();
  });

  // ─── Authentication guard ──────────────────────────────────────────────────

  describe('authentication enforcement', () => {
    it('should return 401 when no Authorization header is provided on GET /admin/dashboard/stats', async () => {
      const httpResponse = await request(testApp).get('/admin/dashboard/stats');

      expect(httpResponse.status).toBe(401);
      expect(httpResponse.body.success).toBe(false);
    });

    it('should return 401 when an expired token is used on GET /admin/users', async () => {
      const expiredToken = jwt.sign(
        { userId: 'expired-uuid', email: 'expired@test.com' },
        process.env.JWT_SECRET!,
        { expiresIn: -1 }
      );

      const httpResponse = await request(testApp)
        .get('/admin/users')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(httpResponse.status).toBe(401);
    });

    it('should return 401 when a malformed token is provided', async () => {
      const httpResponse = await request(testApp)
        .get('/admin/audit-logs')
        .set('Authorization', 'Bearer not.a.real.token');

      expect(httpResponse.status).toBe(401);
    });
  });

  // ─── Admin role guard ──────────────────────────────────────────────────────

  describe('admin role enforcement', () => {
    it('should return 403 with ADMIN_REQUIRED when an authenticated USER role accesses GET /admin/dashboard/stats', async () => {
      const regularUserId = 'regular-user-uuid';
      const regularUserToken = createValidAdminToken(regularUserId, 'user@test.com');

      // Prisma returns a USER-role record for the authenticate middleware lookup
      mockPrismaInstance.user.findUnique.mockResolvedValue(
        buildAdminUserRecord({ id: regularUserId, email: 'user@test.com', role: 'USER' })
      );

      const httpResponse = await request(testApp)
        .get('/admin/dashboard/stats')
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect(httpResponse.status).toBe(403);
      expect(httpResponse.body.code).toBe('ADMIN_REQUIRED');
    });

    it('should return 403 with ADMIN_REQUIRED when a USER accesses GET /admin/users', async () => {
      const regularUserId = 'user-uuid-no-admin';
      const regularUserToken = createValidAdminToken(regularUserId, 'nonadmin@test.com');

      mockPrismaInstance.user.findUnique.mockResolvedValue(
        buildAdminUserRecord({ id: regularUserId, email: 'nonadmin@test.com', role: 'USER' })
      );

      const httpResponse = await request(testApp)
        .get('/admin/users')
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect(httpResponse.status).toBe(403);
      expect(httpResponse.body.code).toBe('ADMIN_REQUIRED');
    });

    it('should return 403 with ACCOUNT_DISABLED when a disabled admin accesses GET /admin/dashboard/stats', async () => {
      const disabledAdminId = 'disabled-admin-uuid';
      const disabledAdminToken = createValidAdminToken(disabledAdminId, 'disabled-admin@test.com');

      mockPrismaInstance.user.findUnique.mockResolvedValue(
        buildAdminUserRecord({
          id: disabledAdminId,
          email: 'disabled-admin@test.com',
          isDisabled: true,
        })
      );

      const httpResponse = await request(testApp)
        .get('/admin/dashboard/stats')
        .set('Authorization', `Bearer ${disabledAdminToken}`);

      expect(httpResponse.status).toBe(403);
      expect(httpResponse.body.code).toBe('ACCOUNT_DISABLED');
    });
  });

  // ─── Successful admin access ───────────────────────────────────────────────

  describe('successful admin access', () => {
    it('should return 200 from GET /admin/dashboard/stats for a valid admin user', async () => {
      const adminId = 'admin-success-uuid';
      const adminToken = createValidAdminToken(adminId, 'admin@company.com');

      mockPrismaInstance.user.findUnique.mockResolvedValue(
        buildAdminUserRecord({ id: adminId })
      );

      const httpResponse = await request(testApp)
        .get('/admin/dashboard/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(httpResponse.status).toBe(200);
      expect(httpResponse.body.success).toBe(true);
    });

    it('should return 200 from GET /admin/users for a valid admin user', async () => {
      const adminId = 'admin-users-list-uuid';
      const adminToken = createValidAdminToken(adminId, 'admin@company.com');

      mockPrismaInstance.user.findUnique.mockResolvedValue(
        buildAdminUserRecord({ id: adminId })
      );

      const httpResponse = await request(testApp)
        .get('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(httpResponse.status).toBe(200);
      expect(httpResponse.body.success).toBe(true);
    });

    it('should return 200 from GET /admin/audit-logs for a valid admin user', async () => {
      const adminId = 'admin-audit-log-uuid';
      const adminToken = createValidAdminToken(adminId, 'admin@company.com');

      mockPrismaInstance.user.findUnique.mockResolvedValue(
        buildAdminUserRecord({ id: adminId })
      );

      const httpResponse = await request(testApp)
        .get('/admin/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(httpResponse.status).toBe(200);
      expect(httpResponse.body.success).toBe(true);
    });

    it('should return 200 from GET /admin/system/health for a valid admin user', async () => {
      const adminId = 'admin-health-uuid';
      const adminToken = createValidAdminToken(adminId, 'admin@company.com');

      mockPrismaInstance.user.findUnique.mockResolvedValue(
        buildAdminUserRecord({ id: adminId })
      );

      const httpResponse = await request(testApp)
        .get('/admin/system/health')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(httpResponse.status).toBe(200);
    });

    it('should return 200 from PATCH /admin/users/:userId/status when toggling a different user', async () => {
      const adminId = 'admin-toggle-uuid';
      const adminToken = createValidAdminToken(adminId, 'admin@company.com');

      mockPrismaInstance.user.findUnique.mockResolvedValue(
        buildAdminUserRecord({ id: adminId })
      );

      const httpResponse = await request(testApp)
        .patch('/admin/users/some-other-target-uuid/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ disabled: true });

      // userId ('some-other-target-uuid') differs from req.user.id ('admin-toggle-uuid')
      // so the self-disable guard passes and the service is called
      expect(httpResponse.status).toBe(200);
    });
  });
});
