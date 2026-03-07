// apps/backend/src/utils/audit.util.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request } from 'express';
import { PrismaClient } from '@prisma/client';
import { logAdminAction } from './audit.util.js';

// Get the mocked Prisma singleton shared with the source module
const mockPrismaInstance = new PrismaClient() as any;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildMockRequest(overrides: {
  userId?: string;
  xForwardedFor?: string;
  remoteAddress?: string;
} = {}): Request {
  const { userId = 'admin-uuid-abc', xForwardedFor, remoteAddress = '10.0.0.1' } = overrides;

  return {
    user: userId ? { id: userId, email: 'admin@test.com', isEmailVerified: true, role: 'ADMIN' } : undefined,
    headers: {
      ...(xForwardedFor ? { 'x-forwarded-for': xForwardedFor } : {}),
    },
    socket: {
      remoteAddress,
    },
  } as unknown as Request;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('logAdminAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: audit log create succeeds
    mockPrismaInstance.adminAuditLog = {
      create: vi.fn().mockResolvedValue({ id: 'audit-log-uuid-1' }),
    };
  });

  it('should call prisma.adminAuditLog.create with the correct action, targetType, and adminId', async () => {
    const mockRequest = buildMockRequest({ userId: 'admin-user-uuid-1' });
    const auditActionPayload = {
      action: 'USER_DISABLED',
      targetType: 'user',
      targetId: 'target-user-uuid-1',
    };

    logAdminAction(mockRequest, auditActionPayload);

    // Fire-and-forget: wait a tick for the promise to resolve
    await new Promise((resolve) => setImmediate(resolve));

    expect(mockPrismaInstance.adminAuditLog.create).toHaveBeenCalledOnce();
    expect(mockPrismaInstance.adminAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          adminId: 'admin-user-uuid-1',
          action: 'USER_DISABLED',
          targetType: 'user',
          targetId: 'target-user-uuid-1',
        }),
      })
    );
  });

  it('should include optional details when provided in the audit action payload', async () => {
    const mockRequest = buildMockRequest({ userId: 'admin-with-details-uuid' });
    const auditActionWithDetails = {
      action: 'JOB_FETCH_TRIGGERED',
      targetType: 'job',
      details: { keywords: 'software engineer', country: 'gb', location: 'London' },
    };

    logAdminAction(mockRequest, auditActionWithDetails);
    await new Promise((resolve) => setImmediate(resolve));

    const createCallArgs = mockPrismaInstance.adminAuditLog.create.mock.calls[0][0];
    expect(createCallArgs.data.details).toEqual({
      keywords: 'software engineer',
      country: 'gb',
      location: 'London',
    });
  });

  it('should set targetId to null when targetId is not provided', async () => {
    const mockRequest = buildMockRequest({ userId: 'admin-no-target-uuid' });
    const auditActionWithoutTargetId = {
      action: 'JOB_CLEANUP_TRIGGERED',
      targetType: 'job',
    };

    logAdminAction(mockRequest, auditActionWithoutTargetId);
    await new Promise((resolve) => setImmediate(resolve));

    const createCallArgs = mockPrismaInstance.adminAuditLog.create.mock.calls[0][0];
    expect(createCallArgs.data.targetId).toBeNull();
  });

  it('should extract the IP address from the x-forwarded-for header when present', async () => {
    const proxiedRequest = buildMockRequest({
      userId: 'admin-proxied-uuid',
      xForwardedFor: '203.0.113.45, 10.0.0.1',
      remoteAddress: '10.0.0.1',
    });

    logAdminAction(proxiedRequest, { action: 'USER_PROMOTED', targetType: 'user' });
    await new Promise((resolve) => setImmediate(resolve));

    const createCallArgs = mockPrismaInstance.adminAuditLog.create.mock.calls[0][0];
    // Should use the first IP in the x-forwarded-for header (the real client IP)
    expect(createCallArgs.data.ipAddress).toBe('203.0.113.45');
  });

  it('should fall back to socket.remoteAddress when x-forwarded-for header is absent', async () => {
    const directConnectionRequest = buildMockRequest({
      userId: 'admin-direct-uuid',
      remoteAddress: '192.168.1.50',
    });

    logAdminAction(directConnectionRequest, { action: 'USER_DEMOTED', targetType: 'user' });
    await new Promise((resolve) => setImmediate(resolve));

    const createCallArgs = mockPrismaInstance.adminAuditLog.create.mock.calls[0][0];
    expect(createCallArgs.data.ipAddress).toBe('192.168.1.50');
  });

  it('should not throw and should not call prisma.create when req.user is undefined', async () => {
    const unauthenticatedRequest = {
      user: undefined,
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    } as unknown as Request;

    // Should return early without throwing
    expect(() =>
      logAdminAction(unauthenticatedRequest, { action: 'USER_DISABLED', targetType: 'user' })
    ).not.toThrow();

    await new Promise((resolve) => setImmediate(resolve));

    expect(mockPrismaInstance.adminAuditLog.create).not.toHaveBeenCalled();
  });

  it('should not throw when prisma.create rejects (fire-and-forget error swallowing)', async () => {
    mockPrismaInstance.adminAuditLog.create = vi
      .fn()
      .mockRejectedValue(new Error('Database write failed'));

    const mockRequest = buildMockRequest({ userId: 'admin-db-fail-uuid' });

    // logAdminAction must not throw even when prisma rejects
    expect(() =>
      logAdminAction(mockRequest, { action: 'USER_DELETED', targetType: 'user', targetId: 'victim-uuid' })
    ).not.toThrow();

    // Also verify the rejection is silently swallowed
    await new Promise((resolve) => setImmediate(resolve));

    expect(mockPrismaInstance.adminAuditLog.create).toHaveBeenCalledOnce();
  });

  it('should handle a single-IP x-forwarded-for header without trailing commas', async () => {
    const singleIpProxiedRequest = buildMockRequest({
      userId: 'admin-single-proxy-uuid',
      xForwardedFor: '198.51.100.22',
    });

    logAdminAction(singleIpProxiedRequest, { action: 'USER_ENABLED', targetType: 'user' });
    await new Promise((resolve) => setImmediate(resolve));

    const createCallArgs = mockPrismaInstance.adminAuditLog.create.mock.calls[0][0];
    expect(createCallArgs.data.ipAddress).toBe('198.51.100.22');
  });
});
