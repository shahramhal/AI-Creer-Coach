// apps/backend/src/services/admin.service.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import mongoose from 'mongoose';

// Get the mocked Prisma singleton shared with the source module
const mockPrismaInstance = new PrismaClient() as any;

//  Mock ../config/database before importing admin.service 
// admin.service imports redis and checkDatabaseHealth from config/database.
// The real database.ts creates Redis and Bull instances at module-load time.
// We provide lightweight stubs to prevent that from happening in tests.
//
// IMPORTANT: All values referenced inside vi.mock() factories must be created
// with vi.hoisted() - the factory is hoisted before any top-level const/let.

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
    scan: vi.fn().mockResolvedValue(['0', []]),
    lrange: vi.fn().mockResolvedValue([]),
    lpush: vi.fn().mockResolvedValue(1),
    ltrim: vi.fn().mockResolvedValue('OK'),
    expire: vi.fn().mockResolvedValue(1),
    disconnect: vi.fn(),
    on: vi.fn().mockReturnThis(),
    status: 'ready',
  };

  return {
    redis: redisStub,
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

vi.mock('../config/database.js', async () => {
  const { PrismaClient: PC } = await import('@prisma/client');
  return {
    ...mockDatabaseModule,
    prisma: new PC(),
  };
});

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

    // The test-setup.ts Prisma mock doesn't include cV.count - add it here
    // so getDashboardStats tests can mock it without hitting undefined.
    if (!mockPrismaInstance.cV.count) {
      mockPrismaInstance.cV.count = vi.fn();
    } else {
      // clearAllMocks wipes the implementation - re-assign the function
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
      mockPrismaInstance.user.count = vi.fn().mockResolvedValue(2); // Two admins - safe to demote
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

  describe('forcePasswordReset', () => {
    it('should throw NOT_FOUND when user does not exist', async () => {
      mockPrismaInstance.user.findUnique.mockResolvedValue(null);
      await expect(adminService.forcePasswordReset('nonexistent-id')).rejects.toThrow('User not found');
    });

    it('should generate a reset token and update the user record', async () => {
      mockPrismaInstance.user.findUnique.mockResolvedValue(buildUserRecord());
      mockPrismaInstance.user.update.mockResolvedValue({});

      const result = await adminService.forcePasswordReset('user-uuid-default');

      expect(mockPrismaInstance.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-uuid-default' },
          data: expect.objectContaining({
            resetPasswordToken: expect.any(String),
            resetPasswordExpires: expect.any(Date),
          }),
        })
      );
      expect(result).toHaveProperty('resetToken');
      expect(result.resetToken).toHaveLength(64);
      expect(result.message).toBe('Password reset token generated');
    });
  });

  describe('deleteUser', () => {
    it('should throw when admin tries to delete themselves', async () => {
      await expect(adminService.deleteUser('admin-id', 'admin-id')).rejects.toThrow(
        'Cannot delete yourself'
      );
    });

    it('should throw NOT_FOUND when target user does not exist', async () => {
      mockPrismaInstance.user.findUnique.mockResolvedValue(null);
      await expect(adminService.deleteUser('nonexistent-id', 'admin-id')).rejects.toThrow(
        'User not found'
      );
    });
  });

  describe('demoteUser', () => {
    it('should throw NOT_FOUND when user does not exist', async () => {
      mockPrismaInstance.user.findUnique.mockResolvedValue(null);
      await expect(adminService.demoteUser('nonexistent-id', 'admin-id')).rejects.toThrow(
        'User not found'
      );
    });

    it('should throw when target user is not an admin', async () => {
      mockPrismaInstance.user.findUnique.mockResolvedValue(buildUserRecord({ role: 'USER' }));
      await expect(adminService.demoteUser('user-uuid-default', 'admin-id')).rejects.toThrow(
        'User is not an admin'
      );
    });

    it('should throw when admin tries to demote themselves', async () => {
      mockPrismaInstance.user.findUnique.mockResolvedValue(
        buildUserRecord({ id: 'admin-id', role: 'ADMIN' })
      );
      await expect(adminService.demoteUser('admin-id', 'admin-id')).rejects.toThrow(
        'Cannot demote yourself'
      );
    });

    it('should throw when demoting the last remaining admin', async () => {
      mockPrismaInstance.user.findUnique.mockResolvedValue(
        buildUserRecord({ id: 'user-uuid-default', role: 'ADMIN' })
      );
      mockPrismaInstance.user.count.mockResolvedValue(1);
      await expect(adminService.demoteUser('user-uuid-default', 'admin-id')).rejects.toThrow(
        'Cannot demote the last admin'
      );
    });

    it('should demote a valid admin and return success message', async () => {
      mockPrismaInstance.user.findUnique.mockResolvedValue(
        buildUserRecord({ id: 'user-uuid-default', role: 'ADMIN' })
      );
      mockPrismaInstance.user.count.mockResolvedValue(3);
      mockPrismaInstance.user.update.mockResolvedValue({});

      const result = await adminService.demoteUser('user-uuid-default', 'admin-id');

      expect(mockPrismaInstance.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { role: 'USER' } })
      );
      expect(result.message).toBe('User demoted to regular user');
    });
  });

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

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-11T12:00:00Z'));

    mockPrismaInstance.user.findMany.mockResolvedValue([]);

    const thirtyDayTrend = await adminService.getUserGrowthTrend();

    expect(thirtyDayTrend).toHaveLength(30);


    vi.useRealTimers();
    });

  it('should count user registrations correctly when users exist within the range', async () => {

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-11T12:00:00Z'));

    const todayStr = '2026-04-11'; // Now hardcoded and predictable


    mockPrismaInstance.$queryRaw.mockResolvedValue([
      { date: todayStr, count: BigInt(2) },
    ]);

    const growthTrend = await adminService.getUserGrowthTrend(1);

    expect(growthTrend).toHaveLength(1);
    expect(growthTrend[0]!.count).toBe(2);


    vi.useRealTimers();
  });
  });

  describe('getDashboardStats - error branches', () => {
    it('should fall back to all-false service health when checkDatabaseHealth throws', async () => {
      mockPrismaInstance.user.count = vi.fn().mockResolvedValue(0);
      mockPrismaInstance.cV.count = vi.fn().mockResolvedValue(0);
      mockPrismaInstance.application.count = vi.fn().mockResolvedValue(0);
      mockDatabaseModule.checkDatabaseHealth.mockRejectedValueOnce(new Error('DB unreachable'));

      const result = await adminService.getDashboardStats();

      expect(result.serviceHealth).toEqual({ postgres: false, mongodb: false, redis: false });
    });

    it('should return 0 for totalJobs when MongoDB countDocuments throws', async () => {
      mockPrismaInstance.user.count = vi.fn().mockResolvedValue(0);
      mockPrismaInstance.cV.count = vi.fn().mockResolvedValue(0);
      mockPrismaInstance.application.count = vi.fn().mockResolvedValue(0);
      (mongoose.connection.db as any).collection.mockReturnValue({
        countDocuments: vi.fn().mockRejectedValue(new Error('Mongo error')),
      });

      const result = await adminService.getDashboardStats();

      expect(result.totalJobs).toBe(0);
    });
  });

  describe('listJobs', () => {
    function buildJobsCollection(jobs: any[] = [], total = 0) {
      return {
        find: vi.fn().mockReturnValue({
          sort: vi.fn().mockReturnThis(),
          skip: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          toArray: vi.fn().mockResolvedValue(jobs),
        }),
        countDocuments: vi.fn().mockResolvedValue(total),
      };
    }

    it('should return jobs and pagination metadata', async () => {
      const fakeJobs = [{ title: 'Engineer' }, { title: 'Designer' }];
      (mongoose.connection.db as any).collection.mockReturnValue(buildJobsCollection(fakeJobs, 2));

      const result = await adminService.listJobs({ page: 1, limit: 10 });

      expect(result.jobs).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.totalPages).toBe(1);
    });

    it('should apply source filter when provided', async () => {
      const col = buildJobsCollection();
      (mongoose.connection.db as any).collection.mockReturnValue(col);

      await adminService.listJobs({ page: 1, limit: 10, source: 'adzuna' });

      const findArg = (col.find as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(findArg.source).toBe('adzuna');
    });

    it('should apply country filter with case-insensitive regex when provided', async () => {
      const col = buildJobsCollection();
      (mongoose.connection.db as any).collection.mockReturnValue(col);

      await adminService.listJobs({ page: 1, limit: 10, country: 'gb' });

      const findArg = (col.find as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(findArg.country).toEqual({ $regex: 'gb', $options: 'i' });
    });

    it('should default to sorting by scraped_at descending', async () => {
      const col = buildJobsCollection();
      (mongoose.connection.db as any).collection.mockReturnValue(col);

      await adminService.listJobs({ page: 1, limit: 10 });

      const chain = (col.find as ReturnType<typeof vi.fn>).mock.results[0].value;
      expect(chain.sort).toHaveBeenCalledWith({ scraped_at: -1 });
    });

    it('should use an allowed sortBy field when provided', async () => {
      const col = buildJobsCollection();
      (mongoose.connection.db as any).collection.mockReturnValue(col);

      await adminService.listJobs({ page: 1, limit: 10, sortBy: 'title', sortOrder: 'asc' });

      const chain = (col.find as ReturnType<typeof vi.fn>).mock.results[0].value;
      expect(chain.sort).toHaveBeenCalledWith({ title: 1 });
    });

    it('should throw 503 when MongoDB connection is unavailable', async () => {
      const originalDb = mongoose.connection.db;
      (mongoose.connection as any).db = null;

      await expect(adminService.listJobs({ page: 1, limit: 10 })).rejects.toThrow(
        'MongoDB not connected'
      );

      (mongoose.connection as any).db = originalDb;
    });
  });

  describe('getJobStats', () => {
    function buildStatsCollection(total = 0, bySource: any[] = [], byCountry: any[] = []) {
      return {
        countDocuments: vi.fn().mockResolvedValue(total),
        aggregate: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      };
    }

    it('should return totalJobs, bySource, and byCountry', async () => {
      const col = {
        countDocuments: vi.fn().mockResolvedValue(42),
        aggregate: vi.fn()
          .mockReturnValueOnce({ toArray: vi.fn().mockResolvedValue([{ _id: 'adzuna', count: 30 }]) })
          .mockReturnValueOnce({ toArray: vi.fn().mockResolvedValue([{ _id: 'gb', count: 20 }]) }),
      };
      (mongoose.connection.db as any).collection.mockReturnValue(col);

      const result = await adminService.getJobStats();

      expect(result.totalJobs).toBe(42);
      expect(result.bySource).toEqual([{ source: 'adzuna', count: 30 }]);
      expect(result.byCountry).toEqual([{ country: 'gb', count: 20 }]);
    });

    it('should replace null _id with "unknown" in bySource and byCountry', async () => {
      const col = {
        countDocuments: vi.fn().mockResolvedValue(5),
        aggregate: vi.fn()
          .mockReturnValueOnce({ toArray: vi.fn().mockResolvedValue([{ _id: null, count: 5 }]) })
          .mockReturnValueOnce({ toArray: vi.fn().mockResolvedValue([{ _id: null, count: 5 }]) }),
      };
      (mongoose.connection.db as any).collection.mockReturnValue(col);

      const result = await adminService.getJobStats();

      expect(result.bySource[0]!.source).toBe('unknown');
      expect(result.byCountry[0]!.country).toBe('unknown');
    });

    it('should throw 503 when MongoDB is not connected', async () => {
      const originalDb = mongoose.connection.db;
      (mongoose.connection as any).db = null;

      await expect(adminService.getJobStats()).rejects.toThrow('MongoDB not connected');

      (mongoose.connection as any).db = originalDb;
    });
  });

  describe('triggerJobFetch', () => {
    it('should POST to job-api-service and return the response JSON', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        statusText: 'OK',
        json: vi.fn().mockResolvedValue({ success: true, count: 10 }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await adminService.triggerJobFetch('gb', 'software engineer');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/jobs/fetch'),
        expect.objectContaining({ method: 'POST' })
      );
      expect(result).toEqual({ success: true, count: 10 });

      vi.unstubAllGlobals();
    });

    it('should throw AppError when the job API responds with a non-OK status', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: 'Service Unavailable',
        json: vi.fn(),
      });
      vi.stubGlobal('fetch', mockFetch);

      await expect(adminService.triggerJobFetch('gb', 'engineer')).rejects.toThrow(
        'Job fetch failed'
      );

      vi.unstubAllGlobals();
    });

    it('should include location in the request body when provided', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        statusText: 'OK',
        json: vi.fn().mockResolvedValue({}),
      });
      vi.stubGlobal('fetch', mockFetch);

      await adminService.triggerJobFetch('us', 'developer', 'New York');

      const body = JSON.parse((mockFetch.mock.calls[0][1] as any).body);
      expect(body.location).toBe('New York');

      vi.unstubAllGlobals();
    });
  });

  describe('triggerJobCleanup', () => {
    it('should POST to the cleanup endpoint and return the response JSON', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        statusText: 'OK',
        json: vi.fn().mockResolvedValue({ deleted: 5 }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await adminService.triggerJobCleanup();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/jobs/cleanup'),
        expect.objectContaining({ method: 'POST' })
      );
      expect(result).toEqual({ deleted: 5 });

      vi.unstubAllGlobals();
    });

    it('should throw AppError when the cleanup endpoint responds with a non-OK status', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error',
        json: vi.fn(),
      });
      vi.stubGlobal('fetch', mockFetch);

      await expect(adminService.triggerJobCleanup()).rejects.toThrow('Job cleanup failed');

      vi.unstubAllGlobals();
    });
  });

  describe('deleteJob', () => {
    it('should delete a job by ID and return a success message', async () => {
      (mongoose.connection.db as any).collection.mockReturnValue({
        deleteOne: vi.fn().mockResolvedValue({ deletedCount: 1 }),
      });

      const result = await adminService.deleteJob('507f1f77bcf86cd799439011');

      expect(result.message).toBe('Job deleted');
    });

    it('should throw NOT_FOUND when no document matches the given ID', async () => {
      (mongoose.connection.db as any).collection.mockReturnValue({
        deleteOne: vi.fn().mockResolvedValue({ deletedCount: 0 }),
      });

      await expect(adminService.deleteJob('507f1f77bcf86cd799439011')).rejects.toThrow(
        'Job not found'
      );
    });

    it('should fall back to a raw string filter when the ObjectId constructor throws', async () => {
      const col = {
        deleteOne: vi.fn().mockResolvedValue({ deletedCount: 1 }),
      };
      (mongoose.connection.db as any).collection.mockReturnValue(col);

      // Temporarily make ObjectId throw so the catch branch in deleteJob is exercised
      const OriginalObjectId = mongoose.Types.ObjectId;
      (mongoose.Types as any).ObjectId = function () {
        throw new Error('Invalid ObjectId');
      };

      await adminService.deleteJob('not-an-object-id');

      const filterArg = (col.deleteOne as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(filterArg._id).toBe('not-an-object-id');

      (mongoose.Types as any).ObjectId = OriginalObjectId;
    });

    it('should throw 503 when MongoDB is not connected', async () => {
      const originalDb = mongoose.connection.db;
      (mongoose.connection as any).db = null;

      await expect(adminService.deleteJob('some-id')).rejects.toThrow('MongoDB not connected');

      (mongoose.connection as any).db = originalDb;
    });
  });

  describe('getServiceHealth', () => {
    it('should return database health combined with ML and job API health', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal('fetch', mockFetch);

      const result = await adminService.getServiceHealth();

      expect(result).toHaveProperty('mlService');
      expect(result).toHaveProperty('jobApiService');
      expect(result).toHaveProperty('mlServiceResponseMs');
      expect(result).toHaveProperty('jobApiResponseMs');
      expect(result.mlService).toBe(true);
      expect(result.jobApiService).toBe(true);

      vi.unstubAllGlobals();
    });

    it('should report mlService as false when the ML health check throws', async () => {
      const mockFetch = vi.fn()
        .mockRejectedValueOnce(new Error('ML service down'))
        .mockResolvedValueOnce({ ok: true });
      vi.stubGlobal('fetch', mockFetch);

      const result = await adminService.getServiceHealth();

      expect(result.mlService).toBe(false);
      expect(result.mlServiceResponseMs).toBeNull();
      expect(result.jobApiService).toBe(true);

      vi.unstubAllGlobals();
    });

    it('should report jobApiService as false when the job API health check throws', async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({ ok: true })
        .mockRejectedValueOnce(new Error('Job API down'));
      vi.stubGlobal('fetch', mockFetch);

      const result = await adminService.getServiceHealth();

      expect(result.mlService).toBe(true);
      expect(result.jobApiService).toBe(false);
      expect(result.jobApiResponseMs).toBeNull();

      vi.unstubAllGlobals();
    });
  });

  describe('getCacheStats', () => {
    it('should return keyCount, hitRate, and memory from Redis info', async () => {
      mockDatabaseModule.redis.info
        .mockResolvedValueOnce('keyspace_hits:100\r\nkeyspace_misses:20\r\n')
        .mockResolvedValueOnce('used_memory_human:1.5M\r\nused_memory_peak_human:2M\r\n');
      mockDatabaseModule.redis.dbsize.mockResolvedValue(50);

      const result = await adminService.getCacheStats();

      expect(result.keyCount).toBe(50);
      expect(result.hitRate.hits).toBe(100);
      expect(result.hitRate.misses).toBe(20);
      expect(result.memory.used).toBe('1.5M');
      expect(result.memory.peak).toBe('2M');
    });

    it('should return zeroed stats when Redis info throws', async () => {
      mockDatabaseModule.redis.info.mockRejectedValue(new Error('Redis error'));

      const result = await adminService.getCacheStats();

      expect(result.keyCount).toBe(0);
      expect(result.hitRate).toEqual({ hits: 0, misses: 0 });
      expect(result.memory).toEqual({ used: '0B', peak: '0B' });
    });
  });

  describe('getQueueStatus', () => {
    it('should return an empty array', async () => {
      const result = await adminService.getQueueStatus();
      expect(result).toEqual([]);
    });
  });

  describe('getDatabaseStats', () => {
    beforeEach(() => {
      mockPrismaInstance.user.count = vi.fn().mockResolvedValue(10);
      mockPrismaInstance.userProfile = {
        ...mockPrismaInstance.userProfile,
        count: vi.fn().mockResolvedValue(8),
      };
      mockPrismaInstance.cV.count = vi.fn().mockResolvedValue(5);
      mockPrismaInstance.application.count = vi.fn().mockResolvedValue(3);
      mockPrismaInstance.job.count = vi.fn().mockResolvedValue(100);
      mockPrismaInstance.savedJob = {
        ...mockPrismaInstance.savedJob,
        count: vi.fn().mockResolvedValue(12),
      };
      mockPrismaInstance.interviewSession = {
        ...mockPrismaInstance.interviewSession,
        count: vi.fn().mockResolvedValue(4),
      };
      mockPrismaInstance.course = {
        ...mockPrismaInstance.course,
        count: vi.fn().mockResolvedValue(7),
      };
    });

    it('should return postgres counts for all tracked models', async () => {
      (mongoose.connection.db as any).listCollections = vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
      });

      const result = await adminService.getDatabaseStats();

      expect(result.postgres.users).toBe(10);
      expect(result.postgres.profiles).toBe(8);
      expect(result.postgres.cvs).toBe(5);
      expect(result.postgres.applications).toBe(3);
      expect(result.postgres.jobs).toBe(100);
      expect(result.postgres.savedJobs).toBe(12);
      expect(result.postgres.interviewSessions).toBe(4);
      expect(result.postgres.courses).toBe(7);
    });

    it('should enumerate MongoDB collection names and document counts', async () => {
      const col = {
        countDocuments: vi.fn().mockResolvedValue(25),
        find: vi.fn().mockReturnValue({
          sort: vi.fn().mockReturnThis(),
          skip: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          toArray: vi.fn().mockResolvedValue([]),
        }),
      };
      (mongoose.connection.db as any).listCollections = vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([{ name: 'jobs' }, { name: 'cvs' }]),
      });
      (mongoose.connection.db as any).collection.mockReturnValue(col);

      const result = await adminService.getDatabaseStats();

      expect(result.mongodb).toHaveLength(2);
      expect(result.mongodb[0]!.name).toBe('jobs');
      expect(result.mongodb[0]!.count).toBe(25);
    });

    it('should return empty mongodb array when listCollections throws', async () => {
      (mongoose.connection.db as any).listCollections = vi.fn().mockReturnValue({
        toArray: vi.fn().mockRejectedValue(new Error('Mongo error')),
      });

      const result = await adminService.getDatabaseStats();

      expect(result.mongodb).toEqual([]);
    });
  });

  describe('getApiMetrics', () => {
    it('should return an empty array when no metric keys exist in Redis', async () => {
      mockDatabaseModule.redis.scan.mockResolvedValue(['0', []]);

      const result = await adminService.getApiMetrics();

      expect(result).toEqual([]);
    });

    it('should compute avg, p50, p95, p99, min, max, and errorRate from samples', async () => {
      const samples = [
        { ms: 100, status: 200, ts: Date.now() },
        { ms: 200, status: 200, ts: Date.now() },
        { ms: 500, status: 500, ts: Date.now() },
      ];
      mockDatabaseModule.redis.scan
        .mockResolvedValueOnce(['0', ['metrics:api:GET|/api/v1/test']]);
      mockDatabaseModule.redis.lrange.mockResolvedValue(samples.map((s) => JSON.stringify(s)));

      const result = await adminService.getApiMetrics();

      expect(result).toHaveLength(1);
      const metric = result[0]!;
      expect(metric.route).toBe('/api/v1/test');
      expect(metric.method).toBe('GET');
      expect(metric.count).toBe(3);
      expect(metric.avg).toBe(267);
      expect(metric.min).toBe(100);
      expect(metric.max).toBe(500);
      expect(metric.errorRate).toBe(33);
    });

    it('should exclude OPTIONS keys from the results', async () => {
      mockDatabaseModule.redis.scan.mockResolvedValue([
        '0',
        ['metrics:api:GET|/api/v1/test', 'metrics:api:|OPTIONS|/api/v1/test'],
      ]);
      mockDatabaseModule.redis.lrange.mockResolvedValue([
        JSON.stringify({ ms: 50, status: 200, ts: Date.now() }),
      ]);

      const result = await adminService.getApiMetrics();

      expect(result.every((r) => !r.method.includes('OPTIONS'))).toBe(true);
    });

    it('should return an empty array when Redis scan throws', async () => {
      mockDatabaseModule.redis.scan.mockRejectedValue(new Error('Redis error'));

      const result = await adminService.getApiMetrics();

      expect(result).toEqual([]);
    });

    it('should paginate through Redis scan until cursor returns to "0"', async () => {
      mockDatabaseModule.redis.scan
        .mockResolvedValueOnce(['42', ['metrics:api:GET|/api/v1/first']])
        .mockResolvedValueOnce(['0', ['metrics:api:GET|/api/v1/second']]);
      mockDatabaseModule.redis.lrange.mockResolvedValue([
        JSON.stringify({ ms: 10, status: 200, ts: Date.now() }),
      ]);

      const result = await adminService.getApiMetrics();

      expect(result).toHaveLength(2);
    });
  });

  describe('recordWebVitals', () => {
    it('should lpush each vital, then ltrim and expire the key', async () => {
      const vitals = [
        { name: 'LCP', value: 1200, page: '/home' },
        { name: 'CLS', value: 0.05, page: '/home' },
      ];

      await adminService.recordWebVitals(vitals);

      expect(mockDatabaseModule.redis.lpush).toHaveBeenCalledTimes(2);
      expect(mockDatabaseModule.redis.ltrim).toHaveBeenCalledWith('metrics:vitals', 0, 499);
      expect(mockDatabaseModule.redis.expire).toHaveBeenCalledWith('metrics:vitals', 86400 * 7);
    });

    it('should serialize each vital with name, value, page, and ts fields', async () => {
      const vitals = [{ name: 'FID', value: 50, page: '/about' }];

      await adminService.recordWebVitals(vitals);

      const raw = (mockDatabaseModule.redis.lpush as ReturnType<typeof vi.fn>).mock.calls[0][1];
      const parsed = JSON.parse(raw);
      expect(parsed.name).toBe('FID');
      expect(parsed.value).toBe(50);
      expect(parsed.page).toBe('/about');
      expect(typeof parsed.ts).toBe('number');
    });
  });

  describe('getWebVitals', () => {
    it('should return grouped metric stats and total sample count', async () => {
      const samples = [
        { name: 'LCP', value: 1000, page: '/home', ts: Date.now() },
        { name: 'LCP', value: 2000, page: '/about', ts: Date.now() },
        { name: 'CLS', value: 0.1, page: '/home', ts: Date.now() },
      ];
      mockDatabaseModule.redis.lrange.mockResolvedValue(samples.map((s) => JSON.stringify(s)));

      const result = await adminService.getWebVitals();

      expect(result.sampleCount).toBe(3);
      const lcp = result.metrics.find((m) => m.name === 'LCP');
      expect(lcp).toBeDefined();
      expect(lcp!.count).toBe(2);
      expect(lcp!.avg).toBe(1500);
    });

    it('should return empty metrics and zero sample count when lrange throws', async () => {
      mockDatabaseModule.redis.lrange.mockRejectedValue(new Error('Redis error'));

      const result = await adminService.getWebVitals();

      expect(result.metrics).toEqual([]);
      expect(result.sampleCount).toBe(0);
    });

    it('should return empty metrics when no vitals have been recorded', async () => {
      mockDatabaseModule.redis.lrange.mockResolvedValue([]);

      const result = await adminService.getWebVitals();

      expect(result.metrics).toEqual([]);
      expect(result.sampleCount).toBe(0);
    });
  });
});
