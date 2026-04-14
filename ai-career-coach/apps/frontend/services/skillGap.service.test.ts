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

import { skillGapService } from './skillGap.service';
import api from '../library/api';

const mockApi = api as any;

const sampleLearningPath = {
  id: 'lp-uuid-001',
  userId: 'user-uuid-abc',
  skillId: 'skill-uuid-xyz',
  priority: 1,
  estimatedHours: 40,
  status: 'in_progress',
  progressPercentage: 25,
  startedAt: '2026-01-01T00:00:00.000Z',
  completedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  skill: { id: 'skill-uuid-xyz', name: 'React', category: 'Frontend', description: null },
};

describe('SkillGapService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('analyze', () => {
    it('should call POST /api/v1/skill-gap/analyze with no arguments when none are provided', async () => {
      mockApi.post.mockResolvedValue({ data: { success: true, data: {} } });

      await skillGapService.analyze();

      expect(mockApi.post).toHaveBeenCalledWith('/api/v1/skill-gap/analyze', {
        targetRole: undefined,
        targetJobDescription: undefined,
      });
    });

    it('should include targetRole when provided', async () => {
      mockApi.post.mockResolvedValue({ data: { success: true, data: {} } });

      await skillGapService.analyze('Senior Software Engineer');

      expect(mockApi.post).toHaveBeenCalledWith('/api/v1/skill-gap/analyze', {
        targetRole: 'Senior Software Engineer',
        targetJobDescription: undefined,
      });
    });

    it('should include both targetRole and targetJobDescription when both are provided', async () => {
      const jobDescription = 'Looking for someone with React and Node.js experience.';
      mockApi.post.mockResolvedValue({ data: { success: true, data: {} } });

      await skillGapService.analyze('Full Stack Developer', jobDescription);

      expect(mockApi.post).toHaveBeenCalledWith('/api/v1/skill-gap/analyze', {
        targetRole: 'Full Stack Developer',
        targetJobDescription: jobDescription,
      });
    });

    it('should propagate API errors', async () => {
      mockApi.post.mockRejectedValue(new Error('No CV found'));

      await expect(skillGapService.analyze('Engineer')).rejects.toThrow('No CV found');
    });
  });

  describe('getLearningPaths', () => {
    it('should call GET /api/v1/skill-gap/learning-paths', async () => {
      mockApi.get.mockResolvedValue({ data: { success: true, data: [sampleLearningPath] } });

      await skillGapService.getLearningPaths();

      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/skill-gap/learning-paths');
    });

    it('should return the full response object', async () => {
      const expectedResponse = { success: true, data: [sampleLearningPath] };
      mockApi.get.mockResolvedValue({ data: expectedResponse });

      const result = await skillGapService.getLearningPaths();

      expect(result).toEqual(expectedResponse);
    });
  });

  describe('getLearningPathDetails', () => {
    it('should call GET /api/v1/skill-gap/learning-paths/:id', async () => {
      const learningPathId = 'lp-uuid-001';
      mockApi.get.mockResolvedValue({ data: { success: true, data: sampleLearningPath } });

      await skillGapService.getLearningPathDetails(learningPathId);

      expect(mockApi.get).toHaveBeenCalledWith(`/api/v1/skill-gap/learning-paths/${learningPathId}`);
    });
  });

  describe('updatePathProgress', () => {
    it('should call PATCH /api/v1/skill-gap/learning-paths/:id/progress with the percentage', async () => {
      const learningPathId = 'lp-uuid-001';
      const progressPercentage = 50;
      mockApi.patch.mockResolvedValue({ data: { success: true, data: sampleLearningPath } });

      await skillGapService.updatePathProgress(learningPathId, progressPercentage);

      expect(mockApi.patch).toHaveBeenCalledWith(
        `/api/v1/skill-gap/learning-paths/${learningPathId}/progress`,
        { progressPercentage }
      );
    });
  });

  describe('updateCourseProgress', () => {
    it('should call PATCH /api/v1/skill-gap/courses/:id/progress with progress and status', async () => {
      const courseId = 'course-uuid-999';
      mockApi.patch.mockResolvedValue({ data: { success: true, data: {} } });

      await skillGapService.updateCourseProgress(courseId, 75, 'in_progress');

      expect(mockApi.patch).toHaveBeenCalledWith(
        `/api/v1/skill-gap/courses/${courseId}/progress`,
        { progress: 75, status: 'in_progress' }
      );
    });
  });

  describe('getProgressSummary', () => {
    it('should call GET /api/v1/skill-gap/summary', async () => {
      mockApi.get.mockResolvedValue({ data: { success: true, data: { totalPaths: 3, overallProgress: 40 } } });

      await skillGapService.getProgressSummary();

      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/skill-gap/summary');
    });

    it('should return the full summary response', async () => {
      const expectedResponse = { success: true, data: { totalPaths: 5, overallProgress: 60 } };
      mockApi.get.mockResolvedValue({ data: expectedResponse });

      const result = await skillGapService.getProgressSummary();

      expect(result).toEqual(expectedResponse);
    });
  });
});
