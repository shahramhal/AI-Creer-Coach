import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { DashboardService } from './dashboard.service.js';

const mockPrismaInstance = new PrismaClient() as any;

describe('DashboardService', () => {
  let service: DashboardService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new DashboardService();
  });

  describe('getRecentActivity', () => {
    it('returns mapped activity objects for the user', async () => {
      const now = new Date('2025-01-15T10:00:00.000Z');
      mockPrismaInstance.userActivity.findMany.mockResolvedValue([
        { id: 'act-1', type: 'CV_UPLOAD', title: 'Uploaded CV', description: 'New CV added', createdAt: now },
        { id: 'act-2', type: 'APPLICATION', title: 'Applied', description: 'Applied to Acme', createdAt: now },
      ]);

      const result = await service.getRecentActivity('user-abc', 10);

      expect(mockPrismaInstance.userActivity.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-abc' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, type: true, title: true, description: true, createdAt: true },
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'act-1',
        type: 'CV_UPLOAD',
        title: 'Uploaded CV',
        description: 'New CV added',
        timestamp: now.toISOString(),
      });
    });

    it('uses default limit of 10 when not provided', async () => {
      mockPrismaInstance.userActivity.findMany.mockResolvedValue([]);
      await service.getRecentActivity('user-abc');
      expect(mockPrismaInstance.userActivity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 })
      );
    });

    it('returns empty array when user has no activity', async () => {
      mockPrismaInstance.userActivity.findMany.mockResolvedValue([]);
      const result = await service.getRecentActivity('user-empty');
      expect(result).toEqual([]);
    });
  });
});
