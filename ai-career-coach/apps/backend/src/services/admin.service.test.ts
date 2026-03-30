// apps/backend/src/services/admin.service.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';

// Get the mocked Prisma singleton shared with the source module
const mockPrismaInstance = new PrismaClient() as any;

//  Mock ../config/database before importing admin.service 
// admin.service imports redis, queues, and checkDatabaseHealth from config/database.
// The real database.ts creates Redis and Bull instances at module-load time.
// We provide lightweight stubs to prevent that from happening in tests.
//
// IMPORTANT: All values referenced inside vi.mock() factories must be created
// with vi.hoisted() — the factory is hoisted before any top-level const/let.

const mockDatabaseModule = vi.hoisted(() => {
  const redisStub = {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    setex: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    keys: vi.fn().mockResolvedValue([]),
    ping: vi.fn().mockResolvedValue('PONG'),
    info: vi.fn().mockResolvedValue(''),
    dbsize: vi.fn().mockResolvedValue(0),
    disconnect: vi.fn(),
    on: vi.fn().mockReturnThis(),
    status: 'ready',
  };

  const queueStub = {
    getWaitingCount: vi.fn().mockResolvedValue(0),
    getActiveCount: vi.fn().mockResolvedValue(0),
    getCompletedCount: vi.fn().mockResolvedValue(0),
    getFailedCount: vi.fn().mockResolvedValue(0),
  };

  return {
    redis: redisStub,
    queues: {
      cvParsing: queueStub,
      jobScraping: queueStub,
      jobMatching: queueStub,
      emailNotification: queueStub,
      salaryPrediction: queueStub,
    },
    checkDatabaseHealth: vi.fn().mockResolvedValue({
      postgres: true,
      mongodb: true,
      redis: true,
      timestamp: new Date().toISOString(),
    }),
    cache: {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(true),
      del: vi.fn().mockResolvedValue(true),
    },
  };
});

vi.mock('../config/database.js', () => mockDatabaseModule);

// Import AdminService AFTER database mock is registered
import { AdminService } from './admin.service.js';

//  Helpers 

function buildUserRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-uuid-default',
    email: 'user@example.com',
    firstName: 'Default',
    lastName: 'User',
    role: 'USER',
    isDisabled: false,
    isEmailVerified: true,
    lastLoginAt: new Date('2026-01-01T10:00:00Z'),
    createdAt: new Date('2025-06-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T10:00:00Z'),
    passwordHash: 'hashed-password',
    emailVerifyToken: null,
    resetPasswordToken: null,
    resetPasswordExpires: null,
    ...overrides,
  };
}

//  Tests 

describe('AdminService', () => {
  let adminService: AdminService;

  beforeEach(() => {
    vi.clearAllMocks();
    adminService = new AdminService();

    // Ensure adminAuditLog mock is always available on the shared Prisma instance
    mockPrismaInstance.adminAuditLog = {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    };

    // The test-setup.ts Prisma mock doesn't include cV.count — add it here
    // so getDashboardStats tests can mock it without hitting undefined.
    if (!mockPrismaInstance.cV.count) {
      mockPrismaInstance.cV.count = vi.fn();
    } else {
      // clearAllMocks wipes the implementation — re-assign the function
      mockPrismaInstance.cV.count = vi.fn();
    }

    // Same for application.count which may not exist in the base mock
    if (!mockPrismaInstance.application) {
      mockPrismaInstance.application = { count: vi.fn() };
    } else if (!mockPrismaInstance.application.count) {
      mockPrismaInstance.application = { ...mockPrismaInstance.application, count: vi.fn() };
    } else {
      mockPrismaInstance.application.count = vi.fn();
    }

    // Re-apply checkDatabaseHealth default after clearAllMocks resets it
    mockDatabaseModule.checkDatabaseHealth.mockResolvedValue({
      postgres: true,
      mongodb: true,
      redis: true,
      timestamp: new Date().toISOString(),
    });
  });

  //  getDashboardStats 

  describe('getDashboardStats', () => {
    it('should return aggregated counts for users, CVs, applications, and jobs', async () => {
      // getDashboardStats calls Promise.all with 6 prisma queries. user.count is
      // called three times (total, disabled, adminCount) using separate where filters.
      // We use mockResolvedValueOnce to control each call in order.
      mockPrismaInstance.user.count
        .mockResolvedValueOnce(120) // call 1: totalUsers (no where)
        .mockResolvedValueOnce(3)   // call 2: disabledUsers (where: isDisabled=true)
        .mockResolvedValueOnce(5);  // call 3: adminCount (where: role='ADMIN')
      mockPrismaInstance.cV.count.mockResolvedValue(85);
      mockPrismaInstance.application.count.mockResolvedValue(320);

      const dashboardStats = await adminService.getDashboardStats();

      expect(dashboardStats.totalUsers).toBe(120);
      expect(dashboardStats.totalCVs).toBe(85);
      expect(dashboardStats.totalApplications).toBe(320);
      expect(typeof dashboardStats.totalJobs).toBe('number');
      expect(dashboardStats.disabledUsers).toBe(3);
      expect(dashboardStats.adminCount).toBe(5);
    });

    it('should include serviceHealth in the returned stats object', async () => {
      // Reset all three count mocks to 0 for this test
      mockPrismaInstance.user.count = vi.fn().mockResolvedValue(0);
      mockPrismaInstance.cV.count = vi.fn().mockResolvedValue(0);
      mockPrismaInstance.application.count = vi.fn().mockResolvedValue(0);

      const dashboardStats = await adminService.getDashboardStats();

      expect(dashboardStats).toHaveProperty('serviceHealth');
      expect(typeof dashboardStats.serviceHealth).toBe('object');
    });
  });

  //  listUsers 

  describe('listUsers', () => {
    it('should return a paginated list of users with total and page metadata', async () => {
      const fakeUsers = [
        buildUserRecord({ id: 'user-uuid-1', email: 'alice@example.com', firstName: 'Alice' }),
        buildUserRecord({ id: 'user-uuid-2', email: 'bob@example.com', firstName: 'Bob' }),
      ];

      mockPrismaInstance.user.findMany.mockResolvedValue(fakeUsers);
      // Reassign to avoid any queued Once values from a previous test
      mockPrismaInstance.user.count = vi.fn().mockResolvedValue(2);

      const listResult = await adminService.listUsers({ page: 1, limit: 20 });

      expect(listResult.users).toHaveLength(2);
      expect(listResult.pagination.total).toBe(2);
      expect(listResult.pagination.page).toBe(1);
      expect(listResult.pagination.limit).toBe(20);
      expect(listResult.pagination.totalPages).toBe(1);
    });

    it('should compute totalPages correctly when total exceeds limit', async () => {
      mockPrismaInstance.user.findMany.mockResolvedValue([]);
      mockPrismaInstance.user.count = vi.fn().mockResolvedValue(55);

      const listResult = await adminService.listUsers({ page: 1, limit: 20 });

      expect(listResult.pagination.totalPages).toBe(3); // ceil(55/20) = 3
    });

    it('should pass the search term into a Prisma OR query on email, firstName, and lastName', async () => {
      mockPrismaInstance.user.findMany.mockResolvedValue([]);
      mockPrismaInstance.user.count.mockResolvedValue(0);

      await adminService.listUsers({ page: 1, limit: 20, search: 'alice' });

      const findManyCallArgs = mockPrismaInstance.user.findMany.mock.calls[0][0];
      expect(findManyCallArgs.where.OR).toBeDefined();
      expect(findManyCallArgs.where.OR).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ email: expect.objectContaining({ contains: 'alice' }) }),
          expect.objectContaining({ firstName: expect.objectContaining({ contains: 'alice' }) }),
          expect.objectContaining({ lastName: expect.objectContaining({ contains: 'alice' }) }),
        ])
      );
    });

    it('should filter by role when a role filter other than "disabled" is supplied', async () => {
      mockPrismaInstance.user.findMany.mockResolvedValue([]);
      mockPrismaInstance.user.count.mockResolvedValue(0);

      await adminService.listUsers({ page: 1, limit: 20, role: 'ADMIN' });

      const findManyCallArgs = mockPrismaInstance.user.findMany.mock.calls[0][0];
      expect(findManyCallArgs.where.role).toBe('ADMIN');
    });

    it('should filter by isDisabled when role filter is "disabled"', async () => {
      mockPrismaInstance.user.findMany.mockResolvedValue([]);
      mockPrismaInstance.user.count.mockResolvedValue(0);

      await adminService.listUsers({ page: 1, limit: 20, role: 'disabled' });

      const findManyCallArgs = mockPrismaInstance.user.findMany.mock.calls[0][0];
      expect(findManyCallArgs.where.isDisabled).toBe(true);
    });

    it('should default to sorting by createdAt descending when no sortBy is given', async () => {
      mockPrismaInstance.user.findMany.mockResolvedValue([]);
      mockPrismaInstance.user.count.mockResolvedValue(0);

      await adminService.listUsers({ page: 1, limit: 10 });

      const findManyCallArgs = mockPrismaInstance.user.findMany.mock.calls[0][0];
      expect(findManyCallArgs.orderBy).toEqual({ createdAt: 'desc' });
    });

    it('should ignore unknown sortBy fields and fall back to createdAt', async () => {
      mockPrismaInstance.user.findMany.mockResolvedValue([]);
      mockPrismaInstance.user.count.mockResolvedValue(0);

      await adminService.listUsers({ page: 1, limit: 10, sortBy: 'passwordHash' });

      const findManyCallArgs = mockPrismaInstance.user.findMany.mock.calls[0][0];
      expect(findManyCallArgs.orderBy).toEqual({ createdAt: 'desc' });
    });

    it('should skip (page - 1) * limit rows to implement correct offset pagination', async () => {
      mockPrismaInstance.user.findMany.mockResolvedValue([]);
      mockPrismaInstance.user.count = vi.fn().mockResolvedValue(100);

      await adminService.listUsers({ page: 3, limit: 10 });

      const findManyCallArgs = mockPrismaInstance.user.findMany.mock.calls[0][0];
      expect(findManyCallArgs.skip).toBe(20); // (3 - 1) * 10
      expect(findManyCallArgs.take).toBe(10);
    });
  });

  //  getUserDetail 

  describe('getUserDetail', () => {
    it('should return the full user record when the userId exists', async () => {
      const detailedUserRecord = buildUserRecord({
        id: 'detail-user-uuid',
        email: 'detail@example.com',
        profile: null,
        cvs: [],
        applications: [],
        _count: { cvs: 0, applications: 0, savedJobs: 0, interviewSessions: 0 },
      });

      mockPrismaInstance.user.findUnique.mockResolvedValue(detailedUserRecord);

      const userDetail = await adminService.getUserDetail('detail-user-uuid');

      expect(userDetail.id).toBe('detail-user-uuid');
      expect(userDetail.email).toBe('detail@example.com');
    });

    it('should throw "User not found" when the userId does not exist', async () => {
      mockPrismaInstance.user.findUnique.mockResolvedValue(null);

      await expect(adminService.getUserDetail('nonexistent-uuid')).rejects.toThrow('User not found');
    });
  });

  //  toggleUserDisabled 

  describe('toggleUserDisabled', () => {
    it('should update isDisabled to true and return a success message when disabling a user', async () => {
      const activeUserRecord = buildUserRecord({ id: 'active-user-uuid', isDisabled: false });

      mockPrismaInstance.user.findUnique.mockResolvedValue(activeUserRecord);
      mockPrismaInstance.user.update.mockResolvedValue({ ...activeUserRecord, isDisabled: true });

      const toggleResult = await adminService.toggleUserDisabled('active-user-uuid', true);

      expect(toggleResult.message).toContain('disabled');
      expect(mockPrismaInstance.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'active-user-uuid' },
          data: { isDisabled: true },
        })
      );
    });

    it('should update isDisabled to false and return a success message when enabling a user', async () => {
      const disabledUserRecord = buildUserRecord({ id: 'disabled-user-uuid', isDisabled: true });

      mockPrismaInstance.user.findUnique.mockResolvedValue(disabledUserRecord);
      mockPrismaInstance.user.update.mockResolvedValue({ ...disabledUserRecord, isDisabled: false });

      const toggleResult = await adminService.toggleUserDisabled('disabled-user-uuid', false);

      expect(toggleResult.message).toContain('enabled');
      expect(mockPrismaInstance.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { isDisabled: false },
        })
      );
    });

    it('should throw "User not found" when trying to toggle a non-existent user', async () => {
      mockPrismaInstance.user.findUnique.mockResolvedValue(null);

      await expect(
        adminService.toggleUserDisabled('ghost-user-uuid', true)
      ).rejects.toThrow('User not found');
    });
  });

  //  promoteUser 

  describe('promoteUser', () => {
    it('should update role to ADMIN and return a success message when promoting a USER', async () => {
      const regularUserRecord = buildUserRecord({ id: 'promote-me-uuid', role: 'USER' });

      mockPrismaInstance.user.findUnique.mockResolvedValue(regularUserRecord);
      mockPrismaInstance.user.update.mockResolvedValue({ ...regularUserRecord, role: 'ADMIN' });

      const promoteResult = await adminService.promoteUser('promote-me-uuid');

      expect(promoteResult.message).toContain('promoted');
      expect(mockPrismaInstance.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'promote-me-uuid' },
          data: { role: 'ADMIN' },
        })
      );
    });

    it('should throw "User not found" when promoting a non-existent user', async () => {
      mockPrismaInstance.user.findUnique.mockResolvedValue(null);

      await expect(adminService.promoteUser('no-one-uuid')).rejects.toThrow('User not found');
    });

    it('should throw "User is already an admin" when the target user already has ADMIN role', async () => {
      const existingAdminRecord = buildUserRecord({ id: 'already-admin-uuid', role: 'ADMIN' });

      mockPrismaInstance.user.findUnique.mockResolvedValue(existingAdminRecord);

      await expect(adminService.promoteUser('already-admin-uuid')).rejects.toThrow(
        'User is already an admin'
      );
    });
  });

  //  demoteUser 

  describe('demoteUser', () => {
    it('should update role to USER and return a success message when demoting another admin', async () => {
      const targetAdminRecord = buildUserRecord({ id: 'target-admin-uuid', role: 'ADMIN' });
      const requestingAdminId = 'requesting-admin-uuid';

      mockPrismaInstance.user.findUnique.mockResolvedValue(targetAdminRecord);
      mockPrismaInstance.user.count = vi.fn().mockResolvedValue(2); // Two admins — safe to demote
      mockPrismaInstance.user.update.mockResolvedValue({ ...targetAdminRecord, role: 'USER' });

      const demoteResult = await adminService.demoteUser('target-admin-uuid', requestingAdminId);

      expect(demoteResult.message).toContain('demoted');
      expect(mockPrismaInstance.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'target-admin-uuid' },
          data: { role: 'USER' },
        })
      );
    });

    it('should throw "Cannot demote yourself" when the requesting admin tries to demote themselves', async () => {
      const selfDemoteAdminId = 'self-demote-uuid';
      const selfRecord = buildUserRecord({ id: selfDemoteAdminId, role: 'ADMIN' });

      mockPrismaInstance.user.findUnique.mockResolvedValue(selfRecord);

      await expect(
        adminService.demoteUser(selfDemoteAdminId, selfDemoteAdminId)
      ).rejects.toThrow('Cannot demote yourself');
    });

    it('should throw "Cannot demote the last admin" when only one admin remains', async () => {
      const lastAdminRecord = buildUserRecord({ id: 'last-admin-uuid', role: 'ADMIN' });
      const differentAdminId = 'requesting-admin-uuid';

      mockPrismaInstance.user.findUnique.mockResolvedValue(lastAdminRecord);
      mockPrismaInstance.user.count = vi.fn().mockResolvedValue(1); // Only one admin

      await expect(
        adminService.demoteUser('last-admin-uuid', differentAdminId)
      ).rejects.toThrow('Cannot demote the last admin');
    });

    it('should throw "User not found" when trying to demote a non-existent user', async () => {
      mockPrismaInstance.user.findUnique.mockResolvedValue(null);

      await expect(
        adminService.demoteUser('ghost-admin-uuid', 'requesting-admin-uuid')
      ).rejects.toThrow('User not found');
    });

    it('should throw "User is not an admin" when trying to demote a regular user', async () => {
      const regularUserRecord = buildUserRecord({ id: 'regular-user-demote-uuid', role: 'USER' });

      mockPrismaInstance.user.findUnique.mockResolvedValue(regularUserRecord);

      await expect(
        adminService.demoteUser('regular-user-demote-uuid', 'other-admin-uuid')
      ).rejects.toThrow('User is not an admin');
    });
  });

  //  deleteUser 

  describe('deleteUser', () => {
    it('should delete the Prisma user record and return a success message', async () => {
      const targetUserRecord = buildUserRecord({ id: 'delete-target-uuid' });
      const requestingAdminId = 'requesting-admin-who-deletes-uuid';

      mockPrismaInstance.user.findUnique.mockResolvedValue(targetUserRecord);
      mockPrismaInstance.user.delete.mockResolvedValue(targetUserRecord);

      const deleteResult = await adminService.deleteUser('delete-target-uuid', requestingAdminId);

      expect(deleteResult.message).toContain('deleted');
      expect(mockPrismaInstance.user.delete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'delete-target-uuid' } })
      );
    });

    it('should throw "Cannot delete yourself" when admin attempts to delete their own account', async () => {
      const selfDeleteAdminId = 'self-delete-admin-uuid';

      await expect(
        adminService.deleteUser(selfDeleteAdminId, selfDeleteAdminId)
      ).rejects.toThrow('Cannot delete yourself');

      expect(mockPrismaInstance.user.findUnique).not.toHaveBeenCalled();
      expect(mockPrismaInstance.user.delete).not.toHaveBeenCalled();
    });

    it('should throw "User not found" when attempting to delete a non-existent user', async () => {
      mockPrismaInstance.user.findUnique.mockResolvedValue(null);

      await expect(
        adminService.deleteUser('no-user-uuid', 'admin-uuid')
      ).rejects.toThrow('User not found');

      expect(mockPrismaInstance.user.delete).not.toHaveBeenCalled();
    });
  });

  //  getAuditLogs 

  describe('getAuditLogs', () => {
    it('should return paginated audit logs with admin info included', async () => {
      const fakeAuditLogEntries = [
        {
          id: 'log-uuid-1',
          adminId: 'admin-uuid-1',
          action: 'USER_DISABLED',
          targetType: 'user',
          targetId: 'target-uuid-1',
          details: null,
          ipAddress: '127.0.0.1',
          createdAt: new Date(),
          admin: {
            id: 'admin-uuid-1',
            email: 'admin@company.com',
            firstName: 'Admin',
            lastName: 'User',
          },
        },
      ];

      mockPrismaInstance.adminAuditLog.findMany.mockResolvedValue(fakeAuditLogEntries);
      mockPrismaInstance.adminAuditLog.count.mockResolvedValue(1);

      const auditLogsResult = await adminService.getAuditLogs({ page: 1, limit: 20 });

      expect(auditLogsResult.logs).toHaveLength(1);
      expect(auditLogsResult.logs[0]!.action).toBe('USER_DISABLED');
      expect(auditLogsResult.pagination.total).toBe(1);
      expect(auditLogsResult.pagination.totalPages).toBe(1);
    });

    it('should filter audit logs by action when an action filter is specified', async () => {
      mockPrismaInstance.adminAuditLog.findMany.mockResolvedValue([]);
      mockPrismaInstance.adminAuditLog.count.mockResolvedValue(0);

      await adminService.getAuditLogs({ page: 1, limit: 20, action: 'USER_PROMOTED' });

      const findManyCallArgs = mockPrismaInstance.adminAuditLog.findMany.mock.calls[0][0];
      expect(findManyCallArgs.where.action).toBe('USER_PROMOTED');
    });

    it('should apply no action filter when action is not specified', async () => {
      mockPrismaInstance.adminAuditLog.findMany.mockResolvedValue([]);
      mockPrismaInstance.adminAuditLog.count.mockResolvedValue(0);

      await adminService.getAuditLogs({ page: 1, limit: 20 });

      const findManyCallArgs = mockPrismaInstance.adminAuditLog.findMany.mock.calls[0][0];
      expect(findManyCallArgs.where.action).toBeUndefined();
    });

    it('should order audit logs by createdAt descending (most recent first)', async () => {
      mockPrismaInstance.adminAuditLog.findMany.mockResolvedValue([]);
      mockPrismaInstance.adminAuditLog.count.mockResolvedValue(0);

      await adminService.getAuditLogs({ page: 1, limit: 20 });

      const findManyCallArgs = mockPrismaInstance.adminAuditLog.findMany.mock.calls[0][0];
      expect(findManyCallArgs.orderBy).toEqual({ createdAt: 'desc' });
    });
  });

  //  getUserGrowthTrend 

  describe('getUserGrowthTrend', () => {
    it('should return one entry per day for the requested number of days', async () => {
      mockPrismaInstance.user.findMany.mockResolvedValue([]);

      const growthTrendEntries = await adminService.getUserGrowthTrend(7);

      expect(growthTrendEntries).toHaveLength(7);
      for (const entry of growthTrendEntries) {
        expect(entry).toHaveProperty('date');
        expect(entry).toHaveProperty('count');
        expect(typeof entry.count).toBe('number');
      }
    });

    it('should use a default of 30 days when no argument is provided', async () => {
      mockPrismaInstance.user.findMany.mockResolvedValue([]);

      const thirtyDayTrend = await adminService.getUserGrowthTrend();

      expect(thirtyDayTrend).toHaveLength(30);
    });

    it('should count user registrations correctly when users exist within the range', async () => {
      const today = new Date();
      today.setHours(12, 0, 0, 0);

      const todayUsersCreatedAt = [{ createdAt: today }, { createdAt: today }];

      mockPrismaInstance.user.findMany.mockResolvedValue(todayUsersCreatedAt);

      const growthTrend = await adminService.getUserGrowthTrend(1);

      expect(growthTrend).toHaveLength(1);
      expect(growthTrend[0]!.count).toBe(2);
    });
  });
});
