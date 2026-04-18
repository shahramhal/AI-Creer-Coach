import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

  describe('updateLearningPathProgress - additional branches', () => {
    it('preserves existing startedAt when already set and progress reaches 100', async () => {
      const existingStartedAt = new Date('2026-01-01');
      db.learningPath.findFirst.mockResolvedValue({
        id: 'lp-1',
        startedAt: existingStartedAt,
        completedAt: null,
      });
      db.learningPath.update.mockResolvedValue({ id: 'lp-1' });

      await service.updateLearningPathProgress('u-1', 'lp-1', 100);

      const callArg = db.learningPath.update.mock.calls[0][0];
      expect(callArg.data.startedAt).toBe(existingStartedAt);
      expect(callArg.data.status).toBe('completed');
    });

    it('preserves existing startedAt when progress is in_progress and already started', async () => {
      const existingStartedAt = new Date('2026-01-01');
      db.learningPath.findFirst.mockResolvedValue({
        id: 'lp-1',
        startedAt: existingStartedAt,
        completedAt: null,
      });
      db.learningPath.update.mockResolvedValue({ id: 'lp-1' });

      await service.updateLearningPathProgress('u-1', 'lp-1', 50);

      const callArg = db.learningPath.update.mock.calls[0][0];
      expect(callArg.data.startedAt).toBe(existingStartedAt);
      expect(callArg.data.status).toBe('in_progress');
    });

    it('clamps progress below 0 to 0', async () => {
      db.learningPath.findFirst.mockResolvedValue({ id: 'lp-1', startedAt: null, completedAt: null });
      db.learningPath.update.mockResolvedValue({ id: 'lp-1', progressPercentage: 0 });

      await service.updateLearningPathProgress('u-1', 'lp-1', -10);

      expect(db.learningPath.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ progressPercentage: 0 }),
        })
      );
    });
  });

  describe('updateCourseProgress - additional branches', () => {
    it('sets completedAt when progress >= 100 even if status is not "completed"', async () => {
      db.course.findFirst.mockResolvedValue({ id: 'c-1', skillId: 'skill-1' });
      db.userCourse.upsert.mockResolvedValue({ id: 'uc-1', course: null });

      await service.updateCourseProgress('u-1', 'c-1', 100, 'in_progress');

      const upsertArg = db.userCourse.upsert.mock.calls[0][0];
      expect(upsertArg.update.completedAt).not.toBeNull();
    });

    it('skips learning path recalculation when no learning path found for the skill', async () => {
      db.course.findFirst.mockResolvedValue({ id: 'c-1', skillId: 'skill-1' });
      db.userCourse.upsert.mockResolvedValue({
        id: 'uc-1',
        course: { id: 'c-1', skillId: 'skill-1' },
      });
      db.learningPath.findFirst.mockResolvedValue(null);

      await service.updateCourseProgress('u-1', 'c-1', 50, 'in_progress');

      expect(db.course.findMany).not.toHaveBeenCalled();
      expect(db.learningPath.update).not.toHaveBeenCalled();
    });

    it('skips recalculation when the skill has no courses', async () => {
      db.course.findFirst.mockResolvedValue({ id: 'c-1', skillId: 'skill-1' });
      db.userCourse.upsert.mockResolvedValue({
        id: 'uc-1',
        course: { id: 'c-1', skillId: 'skill-1' },
      });
      db.learningPath.findFirst.mockResolvedValue({ id: 'lp-1', userId: 'u-1' });
      db.course.findMany.mockResolvedValue([]);

      await service.updateCourseProgress('u-1', 'c-1', 50, 'in_progress');

      expect(db.learningPath.update).not.toHaveBeenCalled();
    });
  });

  describe('analyzeSkillGap', () => {
    function buildMlResponse(overrides: Record<string, any> = {}) {
      return {
        current_skills: ['JavaScript'],
        target_role: 'software_engineer',
        skill_coverage: 0.5,
        matched_count: 1,
        total_target_skills: 2,
        missing_skills: [
          {
            name: 'python',
            category: 'Programming',
            priority: 'high',
            frequency: 'common',
            estimated_hours: 40,
            salary_impact: '+10%',
            roi_score: 0.9,
          },
        ],
        recommended_learning_path: [],
        category_breakdown: [],
        total_estimated_hours: 40,
        summary: 'You need python.',
        ...overrides,
      };
    }

    function setupFetch(mlData: object, ok = true, status = 200) {
      const mockFetch = vi.fn().mockResolvedValue({
        ok,
        status,
        json: vi.fn().mockResolvedValue({ data: mlData }),
      });
      vi.stubGlobal('fetch', mockFetch);
      return mockFetch;
    }

    beforeEach(() => {
      db.skill.upsert.mockResolvedValue({ id: 'skill-python', name: 'python', category: 'Programming' });
      db.learningPath.deleteMany.mockResolvedValue({ count: 0 });
      db.learningPath.findMany.mockResolvedValue([]);
      db.learningPath.create.mockResolvedValue({ id: 'lp-new' });
      db.course.findMany.mockResolvedValue([]);
      db.course.createMany.mockResolvedValue({ count: 0 });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('returns ml result merged with learning_path_ids on success', async () => {
      setupFetch(buildMlResponse());

      const result = await service.analyzeSkillGap('u-1', 'cv text', {}, 'software engineer');

      expect(result.target_role).toBe('software_engineer');
      expect(result.learning_path_ids).toContain('lp-new');
      expect(mockCache.set).toHaveBeenCalledWith('skill-gap:u-1', expect.any(Object), 3600);
    });

    it('throws when the ML service responds with a non-ok status', async () => {
      setupFetch({}, false, 503);

      await expect(
        service.analyzeSkillGap('u-1', 'cv text', {})
      ).rejects.toThrow('ML service returned 503');
    });

    it('propagates network errors from fetch', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')));

      await expect(
        service.analyzeSkillGap('u-1', 'cv text', {})
      ).rejects.toThrow('Network failure');
    });

    it('maps priority "high" to numeric value 1', async () => {
      setupFetch(buildMlResponse({ missing_skills: [
        { name: 'python', category: 'Programming', priority: 'high', frequency: 'common', estimated_hours: 30, salary_impact: '+5%', roi_score: 0.8 },
      ]}));

      await service.analyzeSkillGap('u-1', 'cv text', {});

      const createArg = db.learningPath.create.mock.calls[0][0];
      expect(createArg.data.priority).toBe(1);
    });

    it('maps priority "medium" to numeric value 2', async () => {
      setupFetch(buildMlResponse({ missing_skills: [
        { name: 'python', category: 'Programming', priority: 'medium', frequency: 'common', estimated_hours: 30, salary_impact: '+5%', roi_score: 0.5 },
      ]}));

      await service.analyzeSkillGap('u-1', 'cv text', {});

      const createArg = db.learningPath.create.mock.calls[0][0];
      expect(createArg.data.priority).toBe(2);
    });

    it('maps priority "low" (and unknown) to numeric value 3', async () => {
      setupFetch(buildMlResponse({ missing_skills: [
        { name: 'python', category: 'Programming', priority: 'low', frequency: 'rare', estimated_hours: 10, salary_impact: '+1%', roi_score: 0.2 },
      ]}));

      await service.analyzeSkillGap('u-1', 'cv text', {});

      const createArg = db.learningPath.create.mock.calls[0][0];
      expect(createArg.data.priority).toBe(3);
    });

    it('falls back to 40 estimated hours when missing_skill has no estimated_hours', async () => {
      setupFetch(buildMlResponse({ missing_skills: [
        { name: 'python', category: 'Programming', priority: 'high', frequency: 'common', salary_impact: '+5%', roi_score: 0.8 },
      ]}));

      await service.analyzeSkillGap('u-1', 'cv text', {});

      const createArg = db.learningPath.create.mock.calls[0][0];
      expect(createArg.data.estimatedHours).toBe(40);
    });

    it('does not create a new learning path when one already exists for the skill', async () => {
      db.skill.upsert.mockResolvedValue({ id: 'skill-python', name: 'python', category: 'Programming' });
      db.learningPath.findMany.mockResolvedValue([{ id: 'lp-existing', skillId: 'skill-python' }]);
      setupFetch(buildMlResponse());

      const result = await service.analyzeSkillGap('u-1', 'cv text', {});

      expect(db.learningPath.create).not.toHaveBeenCalled();
      expect(result.learning_path_ids).toContain('lp-existing');
    });

    it('deletes stale not-started paths that are no longer in the analysis', async () => {
      setupFetch(buildMlResponse());
      db.skill.upsert.mockResolvedValue({ id: 'skill-python', name: 'python' });

      await service.analyzeSkillGap('u-1', 'cv text', {});

      expect(db.learningPath.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: 'u-1',
          skillId: { notIn: ['skill-python'] },
          status: 'not_started',
        },
      });
    });

    it('handles zero missing skills without creating any paths', async () => {
      setupFetch(buildMlResponse({ missing_skills: [] }));

      const result = await service.analyzeSkillGap('u-1', 'cv text', {});

      expect(db.skill.upsert).not.toHaveBeenCalled();
      expect(db.learningPath.create).not.toHaveBeenCalled();
      expect(result.learning_path_ids).toEqual([]);
    });

    it('seeds courses from the catalog when the skill name matches', async () => {
      setupFetch(buildMlResponse());

      await service.analyzeSkillGap('u-1', 'cv text', {});

      expect(db.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ skillId: 'skill-python' }) })
      );
      expect(db.course.createMany).toHaveBeenCalled();
    });

    it('skips course creation when all catalog courses already exist', async () => {
      db.course.findMany.mockResolvedValue([
        { title: 'Python for Everybody' },
        { title: 'Complete Python Bootcamp' },
        { title: 'Introduction to Computer Science and Programming Using Python' },
      ]);
      setupFetch(buildMlResponse());

      await service.analyzeSkillGap('u-1', 'cv text', {});

      expect(db.course.createMany).not.toHaveBeenCalled();
    });

    it('skips seedCoursesForSkill entirely when the skill is not in the catalog', async () => {
      db.skill.upsert.mockResolvedValue({ id: 'skill-x', name: 'cobol', category: 'Legacy' });
      setupFetch(buildMlResponse({ missing_skills: [
        { name: 'cobol', category: 'Legacy', priority: 'low', frequency: 'rare', estimated_hours: 100, salary_impact: '0%', roi_score: 0.1 },
      ]}));

      await service.analyzeSkillGap('u-1', 'cv text', {});

      expect(db.course.findMany).not.toHaveBeenCalled();
      expect(db.course.createMany).not.toHaveBeenCalled();
    });

    it('forwards targetJobDescription to the ML service body', async () => {
      const mockFetch = setupFetch(buildMlResponse());

      await service.analyzeSkillGap('u-1', 'cv text', {}, 'engineer', 'We use Python and Docker');

      const body = JSON.parse(mockFetch.mock.calls[0]![1].body);
      expect(body.target_job_description).toBe('We use Python and Docker');
    });
  });
});
