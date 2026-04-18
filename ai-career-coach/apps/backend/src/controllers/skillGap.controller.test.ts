import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

const VALID_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const INVALID_UUID = 'not-a-valid-uuid';

const mockFindOne = vi.hoisted(() => vi.fn());

vi.mock('mongoose', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    default: {
      ...actual.default,
      connection: {
        readyState: 1,
        db: {
          collection: vi.fn(() => ({ findOne: mockFindOne })),
        },
      },
    },
  };
});

const mockSkillGapServiceInstance = vi.hoisted(() => ({
  analyzeSkillGap: vi.fn(),
  getLearningPaths: vi.fn(),
  getLearningPathWithCourses: vi.fn(),
  updateLearningPathProgress: vi.fn(),
  updateCourseProgress: vi.fn(),
  getProgressSummary: vi.fn(),
}));

vi.mock('../services/skillGap.service.js', () => {
  function MockSkillGapService(this: any) {
    return mockSkillGapServiceInstance;
  }
  return { SkillGapService: MockSkillGapService };
});

const mockBuildCVText = vi.hoisted(() => vi.fn());

vi.mock('../utils/cv-text.util.js', () => ({
  buildCVText: mockBuildCVText,
}));

vi.mock('../utils/logger.js', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('../utils/app-error.util.js', async (importOriginal) => {
  return await importOriginal();
});

import * as skillGapController from './skillGap.controller.js';

function buildMockResponse() {
  const mockResponse = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return mockResponse as unknown as Response;
}

function buildMockRequest(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    query: {},
    params: {},
    body: {},
    user: { id: 'user-uuid-123', email: 'user@example.com', isEmailVerified: true, role: 'USER' },
    ...overrides,
  } as unknown as Request;
}

function buildUnauthenticatedRequest(): Request {
  return {
    headers: {},
    query: {},
    params: {},
    body: {},
    user: undefined,
  } as unknown as Request;
}

describe('SkillGap Controller', () => {
  let mockResponse: Response;

  beforeEach(() => {
    vi.clearAllMocks();
    mockResponse = buildMockResponse();
  });

  describe('analyzeSkillGap', () => {
    it('should return 401 when user is not authenticated', async () => {
      await skillGapController.analyzeSkillGap(buildUnauthenticatedRequest(), mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(401);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'Not authenticated' })
      );
    });

    it('should return 400 when targetJobDescription exceeds 10000 characters', async () => {
      const longDescription = 'x'.repeat(10001);

      const mockRequest = buildMockRequest({ body: { targetJobDescription: longDescription } });

      await skillGapController.analyzeSkillGap(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(400);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });

    it('should return 404 when no CV is found for the user', async () => {
      mockFindOne.mockResolvedValue(null);

      const mockRequest = buildMockRequest({ body: { targetRole: 'Backend Engineer' } });

      await skillGapController.analyzeSkillGap(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(404);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: expect.stringContaining('No CV found') })
      );
    });

    it('should return 404 when CV text is empty or too short', async () => {
      const sparseCV = { user_id: 'user-uuid-123', skills: [], experience: [], education: [] };
      mockFindOne.mockResolvedValue(sparseCV);
      mockBuildCVText.mockReturnValue('');

      const mockRequest = buildMockRequest({ body: { targetRole: 'Backend Engineer' } });

      await skillGapController.analyzeSkillGap(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(404);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: expect.stringContaining('no usable content') })
      );
    });

    it('should return 200 with analysis result on success', async () => {
      const fakeCV = {
        user_id: 'user-uuid-123',
        skills: ['TypeScript', 'Node.js'],
        experience: [{ role: 'Dev' }],
        education: [],
        summary: 'Software engineer',
      };
      mockFindOne.mockResolvedValue(fakeCV);
      mockBuildCVText.mockReturnValue('TypeScript Node.js Software engineer');

      const fakeAnalysisResult = {
        missingSkills: ['Docker', 'Kubernetes'],
        matchScore: 72,
      };
      mockSkillGapServiceInstance.analyzeSkillGap.mockResolvedValue(fakeAnalysisResult);

      const mockRequest = buildMockRequest({
        body: { targetRole: 'DevOps Engineer', targetJobDescription: 'CI/CD pipeline management' },
      });

      await skillGapController.analyzeSkillGap(mockRequest, mockResponse);

      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: fakeAnalysisResult })
      );
    });

    it('should return 500 when service throws a non-AppError', async () => {
      const fakeCV = {
        user_id: 'user-uuid-123',
        skills: ['Python'],
        experience: [],
        education: [],
        summary: 'Data scientist',
      };
      mockFindOne.mockResolvedValue(fakeCV);
      mockBuildCVText.mockReturnValue('Python Data scientist profile summary here');
      mockSkillGapServiceInstance.analyzeSkillGap.mockRejectedValue(new Error('Internal error'));

      const mockRequest = buildMockRequest({ body: { targetRole: 'Data Engineer' } });

      await skillGapController.analyzeSkillGap(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(500);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'Skill gap analysis failed' })
      );
    });
  });

  describe('getLearningPaths', () => {
    it('should return 401 when user is not authenticated', async () => {
      await skillGapController.getLearningPaths(buildUnauthenticatedRequest(), mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(401);
    });

    it('should return 200 with learning paths on success', async () => {
      const fakePaths = [
        { id: VALID_UUID, title: 'DevOps Path', progressPercentage: 20 },
      ];
      mockSkillGapServiceInstance.getLearningPaths.mockResolvedValue(fakePaths);

      const mockRequest = buildMockRequest();

      await skillGapController.getLearningPaths(mockRequest, mockResponse);

      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: fakePaths })
      );
    });

    it('should return 500 when service throws a non-AppError', async () => {
      mockSkillGapServiceInstance.getLearningPaths.mockRejectedValue(new Error('DB failure'));

      const mockRequest = buildMockRequest();

      await skillGapController.getLearningPaths(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(500);
    });
  });

  describe('getLearningPathDetails', () => {
    it('should return 401 when user is not authenticated', async () => {
      await skillGapController.getLearningPathDetails(buildUnauthenticatedRequest(), mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(401);
    });

    it('should return 400 when the learningPathId is not a valid UUID', async () => {
      const mockRequest = buildMockRequest({ params: { learningPathId: INVALID_UUID } });

      await skillGapController.getLearningPathDetails(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(400);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });

    it('should return 404 when the learning path does not exist', async () => {
      mockSkillGapServiceInstance.getLearningPathWithCourses.mockResolvedValue(null);

      const mockRequest = buildMockRequest({ params: { learningPathId: VALID_UUID } });

      await skillGapController.getLearningPathDetails(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(404);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'Learning path not found' })
      );
    });

    it('should return 200 with path and courses on success', async () => {
      const fakePath = {
        id: VALID_UUID,
        title: 'Cloud Engineering',
        courses: [{ id: 'course-1', title: 'AWS Basics' }],
      };
      mockSkillGapServiceInstance.getLearningPathWithCourses.mockResolvedValue(fakePath);

      const mockRequest = buildMockRequest({ params: { learningPathId: VALID_UUID } });

      await skillGapController.getLearningPathDetails(mockRequest, mockResponse);

      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: fakePath })
      );
    });

    it('should return 500 when service throws a non-AppError', async () => {
      mockSkillGapServiceInstance.getLearningPathWithCourses.mockRejectedValue(new Error('Crash'));

      const mockRequest = buildMockRequest({ params: { learningPathId: VALID_UUID } });

      await skillGapController.getLearningPathDetails(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(500);
    });
  });

  describe('updateProgress', () => {
    it('should return 401 when user is not authenticated', async () => {
      await skillGapController.updateProgress(buildUnauthenticatedRequest(), mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(401);
    });

    it('should return 400 when the learningPathId is not a valid UUID', async () => {
      const mockRequest = buildMockRequest({
        params: { learningPathId: INVALID_UUID },
        body: { progressPercentage: 50 },
      });

      await skillGapController.updateProgress(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(400);
    });

    it('should return 400 when progressPercentage is not a number', async () => {
      const mockRequest = buildMockRequest({
        params: { learningPathId: VALID_UUID },
        body: { progressPercentage: 'fifty' },
      });

      await skillGapController.updateProgress(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(400);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });

    it('should return 400 when progressPercentage is out of 0-100 range', async () => {
      const mockRequest = buildMockRequest({
        params: { learningPathId: VALID_UUID },
        body: { progressPercentage: 150 },
      });

      await skillGapController.updateProgress(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(400);
    });

    it('should return 404 when learning path is not found', async () => {
      mockSkillGapServiceInstance.updateLearningPathProgress.mockResolvedValue(null);

      const mockRequest = buildMockRequest({
        params: { learningPathId: VALID_UUID },
        body: { progressPercentage: 75 },
      });

      await skillGapController.updateProgress(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(404);
    });

    it('should return 200 with updated progress on success', async () => {
      const fakeUpdated = { id: VALID_UUID, progressPercentage: 75 };
      mockSkillGapServiceInstance.updateLearningPathProgress.mockResolvedValue(fakeUpdated);

      const mockRequest = buildMockRequest({
        params: { learningPathId: VALID_UUID },
        body: { progressPercentage: 75 },
      });

      await skillGapController.updateProgress(mockRequest, mockResponse);

      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: fakeUpdated })
      );
    });

    it('should return 500 when service throws a non-AppError', async () => {
      mockSkillGapServiceInstance.updateLearningPathProgress.mockRejectedValue(new Error('DB error'));

      const mockRequest = buildMockRequest({
        params: { learningPathId: VALID_UUID },
        body: { progressPercentage: 50 },
      });

      await skillGapController.updateProgress(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(500);
    });
  });

  describe('updateCourseProgress', () => {
    it('should return 401 when user is not authenticated', async () => {
      await skillGapController.updateCourseProgress(buildUnauthenticatedRequest(), mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(401);
    });

    it('should return 400 when courseId is not a valid UUID', async () => {
      const mockRequest = buildMockRequest({
        params: { courseId: INVALID_UUID },
        body: { progress: 50, status: 'in_progress' },
      });

      await skillGapController.updateCourseProgress(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(400);
    });

    it('should return 400 when progress value is invalid', async () => {
      const mockRequest = buildMockRequest({
        params: { courseId: VALID_UUID },
        body: { progress: -5, status: 'in_progress' },
      });

      await skillGapController.updateCourseProgress(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(400);
    });

    it('should return 400 when status is not one of the valid values', async () => {
      const mockRequest = buildMockRequest({
        params: { courseId: VALID_UUID },
        body: { progress: 50, status: 'unknown_status' },
      });

      await skillGapController.updateCourseProgress(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(400);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });

    it('should return 404 when course is not found in any of user learning paths', async () => {
      mockSkillGapServiceInstance.updateCourseProgress.mockResolvedValue(null);

      const mockRequest = buildMockRequest({
        params: { courseId: VALID_UUID },
        body: { progress: 60, status: 'in_progress' },
      });

      await skillGapController.updateCourseProgress(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(404);
    });

    it('should return 200 with updated course on success', async () => {
      const fakeUpdatedCourse = { id: VALID_UUID, progress: 100, status: 'completed' };
      mockSkillGapServiceInstance.updateCourseProgress.mockResolvedValue(fakeUpdatedCourse);

      const mockRequest = buildMockRequest({
        params: { courseId: VALID_UUID },
        body: { progress: 100, status: 'completed' },
      });

      await skillGapController.updateCourseProgress(mockRequest, mockResponse);

      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: fakeUpdatedCourse })
      );
    });

    it('should return 500 when service throws a non-AppError', async () => {
      mockSkillGapServiceInstance.updateCourseProgress.mockRejectedValue(new Error('Failure'));

      const mockRequest = buildMockRequest({
        params: { courseId: VALID_UUID },
        body: { progress: 50, status: 'in_progress' },
      });

      await skillGapController.updateCourseProgress(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(500);
    });
  });

  describe('getProgressSummary', () => {
    it('should return 401 when user is not authenticated', async () => {
      await skillGapController.getProgressSummary(buildUnauthenticatedRequest(), mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(401);
    });

    it('should return 200 with summary data on success', async () => {
      const fakeSummary = {
        totalPaths: 3,
        completedPaths: 1,
        overallProgress: 45,
      };
      mockSkillGapServiceInstance.getProgressSummary.mockResolvedValue(fakeSummary);

      const mockRequest = buildMockRequest();

      await skillGapController.getProgressSummary(mockRequest, mockResponse);

      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: fakeSummary })
      );
    });

    it('should return 500 when service throws a non-AppError', async () => {
      mockSkillGapServiceInstance.getProgressSummary.mockRejectedValue(new Error('DB read failed'));

      const mockRequest = buildMockRequest();

      await skillGapController.getProgressSummary(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(500);
    });
  });
});
