import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { SkillGapService } from './skillGap.service.js';

const db = new PrismaClient() as any;

const mockCache = vi.hoisted(() => ({
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../config/database.js', () => ({
  prisma: new (PrismaClient as any)(),
  cache: mockCache,
}));

describe('SkillGapService', () => {
  let service: SkillGapService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SkillGapService();
  });

  describe('getLearningPaths', () => {
    it('returns learning paths ordered by priority', async () => {
      const paths = [
        { id: 'lp-1', userId: 'u-1', priority: 1, skill: { name: 'TypeScript' } },
        { id: 'lp-2', userId: 'u-1', priority: 2, skill: { name: 'React' } },
      ];
      db.learningPath.findMany.mockResolvedValue(paths);

      const result = await service.getLearningPaths('u-1');

      expect(db.learningPath.findMany).toHaveBeenCalledWith({
        where: { userId: 'u-1' },
        include: { skill: true },
        orderBy: { priority: 'asc' },
      });
      expect(result).toHaveLength(2);
      expect(result[0]!.skill.name).toBe('TypeScript');
    });

    it('returns empty array when user has no paths', async () => {
      db.learningPath.findMany.mockResolvedValue([]);
      const result = await service.getLearningPaths('u-no-paths');
      expect(result).toEqual([]);
    });
  });

  describe('getLearningPathWithCourses', () => {
    it('returns null when learning path does not belong to user', async () => {
      db.learningPath.findFirst.mockResolvedValue(null);

      const result = await service.getLearningPathWithCourses('u-1', 'lp-unknown');

      expect(result).toBeNull();
    });

    it('returns learning path with nested courses on success', async () => {
      const path = {
        id: 'lp-1',
        userId: 'u-1',
        skill: {
          name: 'TypeScript',
          courses: [
            { id: 'c-1', title: 'TS Basics', userCourses: [{ userId: 'u-1', progress: 50 }] },
          ],
        },
      };
      db.learningPath.findFirst.mockResolvedValue(path);

      const result = await service.getLearningPathWithCourses('u-1', 'lp-1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('lp-1');
      expect(result!.skill.courses).toHaveLength(1);
    });
  });

  describe('updateLearningPathProgress', () => {
    it('returns null when learning path is not found', async () => {
      db.learningPath.findFirst.mockResolvedValue(null);

      const result = await service.updateLearningPathProgress('u-1', 'lp-x', 50);

      expect(result).toBeNull();
      expect(db.learningPath.update).not.toHaveBeenCalled();
    });

    it('sets status to in_progress when progress is between 1 and 99', async () => {
      db.learningPath.findFirst.mockResolvedValue({ id: 'lp-1', startedAt: null, completedAt: null });
      db.learningPath.update.mockResolvedValue({ id: 'lp-1', status: 'in_progress', progressPercentage: 50 });

      await service.updateLearningPathProgress('u-1', 'lp-1', 50);

      expect(db.learningPath.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'in_progress', progressPercentage: 50 }),
        })
      );
    });

    it('sets status to completed and records completedAt when progress is 100', async () => {
      db.learningPath.findFirst.mockResolvedValue({ id: 'lp-1', startedAt: null, completedAt: null });
      db.learningPath.update.mockResolvedValue({ id: 'lp-1', status: 'completed', progressPercentage: 100 });

      await service.updateLearningPathProgress('u-1', 'lp-1', 100);

      expect(db.learningPath.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'completed', progressPercentage: 100 }),
        })
      );
    });

    it('sets status to not_started when progress is 0', async () => {
      db.learningPath.findFirst.mockResolvedValue({ id: 'lp-1', startedAt: null, completedAt: null });
      db.learningPath.update.mockResolvedValue({ id: 'lp-1', status: 'not_started', progressPercentage: 0 });

      await service.updateLearningPathProgress('u-1', 'lp-1', 0);

      expect(db.learningPath.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'not_started', progressPercentage: 0 }),
        })
      );
    });

    it('clamps progress above 100 to 100', async () => {
      db.learningPath.findFirst.mockResolvedValue({ id: 'lp-1', startedAt: null, completedAt: null });
      db.learningPath.update.mockResolvedValue({ id: 'lp-1', progressPercentage: 100 });

      await service.updateLearningPathProgress('u-1', 'lp-1', 150);

      expect(db.learningPath.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ progressPercentage: 100 }),
        })
      );
    });
  });

  describe('updateCourseProgress', () => {
    it('returns null when course is not in user learning paths', async () => {
      db.course.findFirst.mockResolvedValue(null);

      const result = await service.updateCourseProgress('u-1', 'c-x', 50, 'in_progress');

      expect(result).toBeNull();
      expect(db.userCourse.upsert).not.toHaveBeenCalled();
    });

    it('upserts userCourse when course belongs to user paths', async () => {
      db.course.findFirst.mockResolvedValue({ id: 'c-1', skillId: 'skill-1' });
      const upsertResult = { id: 'uc-1', progress: 75, status: 'in_progress', course: null };
      db.userCourse.upsert.mockResolvedValue(upsertResult);
      // No learningPath recalculation because course.skillId is null in userCourse result
      // (course is null, so the `if (userCourse.course?.skillId)` branch is skipped)

      const result = await service.updateCourseProgress('u-1', 'c-1', 75, 'in_progress');

      expect(db.userCourse.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_courseId: { userId: 'u-1', courseId: 'c-1' } },
          update: expect.objectContaining({ progress: 75, status: 'in_progress' }),
        })
      );
      expect(result).toBe(upsertResult);
    });

    it('recalculates parent learning path progress when course.skillId is set', async () => {
      db.course.findFirst.mockResolvedValue({ id: 'c-1', skillId: 'skill-1' });
      db.userCourse.upsert.mockResolvedValue({
        id: 'uc-1',
        progress: 100,
        status: 'completed',
        course: { id: 'c-1', skillId: 'skill-1' },
      });
      // learningPath found for recalculation
      db.learningPath.findFirst
        .mockResolvedValueOnce({ id: 'lp-1', userId: 'u-1' }) // first call in updateCourseProgress
        .mockResolvedValueOnce({ id: 'lp-1', startedAt: null, completedAt: null }); // second call inside updateLearningPathProgress
      // all courses for the skill
      db.course.findMany.mockResolvedValue([
        { id: 'c-1', userCourses: [{ progress: 100 }] },
        { id: 'c-2', userCourses: [] },
      ]);
      db.learningPath.update.mockResolvedValue({ id: 'lp-1', progressPercentage: 50 });

      await service.updateCourseProgress('u-1', 'c-1', 100, 'completed');

      expect(db.learningPath.findFirst).toHaveBeenCalledTimes(2);
      expect(db.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { skillId: 'skill-1' } })
      );
      expect(db.learningPath.update).toHaveBeenCalled();
    });
  });

  describe('getProgressSummary', () => {
    it('returns correct aggregate stats for mixed-status paths', async () => {
      db.learningPath.findMany.mockResolvedValue([
        { id: 'lp-1', status: 'completed', progressPercentage: 100, estimatedHours: 20, startedAt: new Date(), completedAt: new Date(), priority: 1, skill: { name: 'TypeScript', category: 'Programming' } },
        { id: 'lp-2', status: 'in_progress', progressPercentage: 50, estimatedHours: 40, startedAt: new Date(), completedAt: null, priority: 2, skill: { name: 'React', category: 'Frontend' } },
        { id: 'lp-3', status: 'not_started', progressPercentage: 0, estimatedHours: 10, startedAt: null, completedAt: null, priority: 3, skill: { name: 'Docker', category: 'DevOps' } },
      ]);

      const result = await service.getProgressSummary('u-1');

      expect(result.totalPaths).toBe(3);
      expect(result.completedPaths).toBe(1);
      expect(result.inProgressPaths).toBe(1);
      expect(result.notStartedPaths).toBe(1);
      expect(result.totalEstimatedHours).toBe(70);
      expect(result.completedHours).toBe(20 + 20 + 0);
      expect(result.overallProgress).toBe(Math.round((100 + 50 + 0) / 3));
      expect(result.paths).toHaveLength(3);
    });

    it('returns zero overallProgress when user has no paths', async () => {
      db.learningPath.findMany.mockResolvedValue([]);
      const result = await service.getProgressSummary('u-empty');
      expect(result.totalPaths).toBe(0);
      expect(result.overallProgress).toBe(0);
      expect(result.paths).toEqual([]);
    });
  });
});
