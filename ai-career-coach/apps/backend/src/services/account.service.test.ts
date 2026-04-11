import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient() as any;

const mockRedis = vi.hoisted(() => ({
  scan: vi.fn(),
  del: vi.fn(),
}));

vi.mock('../config/database.js', () => ({
  prisma: new (PrismaClient as any)(),
  redis: mockRedis,
  cache: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
  },
}));

import { AccountService } from './account.service.js';

describe('AccountService', () => {
  let service: AccountService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AccountService();
    // Default Redis scan: returns no keys (single iteration)
    mockRedis.scan.mockResolvedValue(['0', []]);
    mockRedis.del.mockResolvedValue(1);
  });

  describe('deleteUserAccount', () => {
    it('deletes MongoDB data, clears Redis keys, and deletes Prisma user', async () => {
      db.user.delete.mockResolvedValue({ id: 'u-1' });

      const result = await service.deleteUserAccount('u-1');

      expect(db.user.delete).toHaveBeenCalledWith({ where: { id: 'u-1' } });
      expect(result.message).toBe('User and all associated data deleted');
    });

    it('deletes Redis keys when scan returns matching keys', async () => {
      // First scan iteration returns keys, second returns cursor 0 (done)
      mockRedis.scan
        .mockResolvedValueOnce(['42', ['cache:u-1:cvs', 'cache:u-1:profile']])
        .mockResolvedValueOnce(['0', []]);
      db.user.delete.mockResolvedValue({ id: 'u-1' });

      await service.deleteUserAccount('u-1');

      expect(mockRedis.del).toHaveBeenCalledWith('cache:u-1:cvs', 'cache:u-1:profile');
    });

    it('continues when mongoose db is unavailable', async () => {
      const mongoose = await import('mongoose');
      const originalDb = (mongoose.default.connection as any).db;
      (mongoose.default.connection as any).db = null;

      db.user.delete.mockResolvedValue({ id: 'u-1' });
      const result = await service.deleteUserAccount('u-1');

      expect(result.message).toBe('User and all associated data deleted');
      (mongoose.default.connection as any).db = originalDb;
    });
  });

  describe('exportUserData', () => {
    it('throws when user is not found', async () => {
      db.user.findUnique.mockResolvedValue(null);

      await expect(service.exportUserData('u-missing')).rejects.toThrow('User not found');
    });

    it('returns cleaned user data without sensitive fields', async () => {
      db.user.findUnique.mockResolvedValue({
        id: 'u-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'USER',
        isEmailVerified: true,
        lastLoginAt: null,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
        passwordHash: 'secret-hash',
        emailVerifyToken: 'token-123',
        resetPasswordToken: null,
        resetPasswordExpires: null,
        profile: {
          id: 'prof-1',
          userId: 'u-1',
          bio: 'Developer',
          location: 'London',
        },
        cvs: [],
        savedJobs: [
          { id: 'sj-1', userId: 'u-1', jobId: 'job-1', job: { title: 'Engineer', company: 'Acme', location: 'London', jobType: 'full-time', sourceUrl: 'http://example.com' } },
        ],
        applications: [],
        interviewSessions: [
          { id: 'is-1', userId: 'u-1', topic: 'React', answers: [{ questionText: 'What is React?', questionCategory: 'technical', answerText: 'A library', answerDuration: 30, fillerWordCount: 2, contentScore: 8, structureScore: 7, confidenceScore: 9, overallScore: 8, feedback: 'Good', createdAt: new Date() }] },
        ],
        learningPaths: [
          { id: 'lp-1', userId: 'u-1', skillId: 'skill-1', priority: 1, status: 'not_started', progressPercentage: 0, estimatedHours: 20, startedAt: null, completedAt: null, skill: { name: 'TypeScript', category: 'Programming' } },
        ],
        userCourses: [
          { id: 'uc-1', userId: 'u-1', courseId: 'c-1', progress: 0, status: 'not_started', course: { title: 'TS Basics', platform: 'Udemy', url: 'http://example.com', difficulty: 'beginner' } },
        ],
      });

      const result = await service.exportUserData('u-1');

      expect(result.email).toBe('test@example.com');
      expect((result as any).passwordHash).toBeUndefined();
      expect((result as any).id).toBeUndefined();
      expect((result as any).emailVerifyToken).toBeUndefined();
      expect(result.profile).not.toHaveProperty('id');
      expect(result.profile).not.toHaveProperty('userId');
      expect(result.savedJobs).toHaveLength(1);
      expect((result.savedJobs[0] as any).id).toBeUndefined();
      expect(result.interviewSessions).toHaveLength(1);
      expect(result.learningPaths).toHaveLength(1);
      expect((result.learningPaths[0] as any).id).toBeUndefined();
      expect(result.userCourses).toHaveLength(1);
    });

    it('handles null profile in exported data', async () => {
      db.user.findUnique.mockResolvedValue({
        id: 'u-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'USER',
        isEmailVerified: false,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        passwordHash: 'hash',
        emailVerifyToken: null,
        resetPasswordToken: null,
        resetPasswordExpires: null,
        profile: null,
        cvs: [],
        savedJobs: [],
        applications: [],
        interviewSessions: [],
        learningPaths: [],
        userCourses: [],
      });

      const result = await service.exportUserData('u-1');

      expect(result.profile).toBeNull();
    });
  });
});
