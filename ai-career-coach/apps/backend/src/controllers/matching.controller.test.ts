import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

const mockMatchingService = vi.hoisted(() => ({
  findJobMatches: vi.fn(),
  getDiagnostics: vi.fn(),
}));

vi.mock('../services/matching.service.js', () => ({
  matchingService: mockMatchingService,
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

import * as matchingController from './matching.controller.js';

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

describe('Matching Controller', () => {
  let mockResponse: Response;

  beforeEach(() => {
    vi.clearAllMocks();
    mockResponse = buildMockResponse();
  });

  describe('getJobMatches', () => {
    it('should return 401 when req.user is not set', async () => {
      const unauthenticatedRequest = {
        headers: {},
        query: {},
        params: {},
        body: {},
        user: undefined,
      } as unknown as Request;

      await matchingController.getJobMatches(unauthenticatedRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(401);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });

    it('should return 200 with matched jobs on success', async () => {
      const fakeMatchResult = {
        matched_jobs: [{ id: 'job-1', title: 'Backend Dev', score: 0.92 }],
        total_analyzed: 500,
        user_cv: { id: 'cv-1' },
        cached: false,
      };
      mockMatchingService.findJobMatches.mockResolvedValue(fakeMatchResult);

      const mockRequest = buildMockRequest({
        body: { cv_id: 'cv-uuid-1', top_k: 10, job_limit: 200 },
      });

      await matchingController.getJobMatches(mockRequest, mockResponse);

      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            matched_jobs: fakeMatchResult.matched_jobs,
            total_analyzed: 500,
          }),
        })
      );
    });

    it('should return the AppError status when service throws an AppError', async () => {
      const { AppError, ErrorCodes } = await import('../utils/app-error.util.js');
      const appError = new AppError('No CV uploaded', 404, ErrorCodes.NOT_FOUND);

      mockMatchingService.findJobMatches.mockRejectedValue(appError);

      const mockRequest = buildMockRequest({ body: {} });

      await matchingController.getJobMatches(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(404);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'No CV uploaded' })
      );
    });

    it('should return 500 when service throws a generic error', async () => {
      mockMatchingService.findJobMatches.mockRejectedValue(new Error('Unexpected failure'));

      const mockRequest = buildMockRequest({ body: {} });

      await matchingController.getJobMatches(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(500);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });
  });

  describe('getMatchingDiagnostics', () => {
    it('should return 401 when req.user is not set', async () => {
      const unauthenticatedRequest = {
        headers: {},
        query: {},
        params: {},
        body: {},
        user: undefined,
      } as unknown as Request;

      await matchingController.getMatchingDiagnostics(unauthenticatedRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(401);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'Not authenticated' })
      );
    });

    it('should return 200 with diagnostics data on success', async () => {
      const fakeDiagnostics = {
        cvCount: 2,
        jobCount: 1500,
        lastMatchRun: '2024-01-01T00:00:00Z',
      };
      mockMatchingService.getDiagnostics.mockResolvedValue(fakeDiagnostics);

      const mockRequest = buildMockRequest();

      await matchingController.getMatchingDiagnostics(mockRequest, mockResponse);

      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: fakeDiagnostics })
      );
    });

    it('should return 500 when service throws', async () => {
      mockMatchingService.getDiagnostics.mockRejectedValue(new Error('Connection failed'));

      const mockRequest = buildMockRequest();

      await matchingController.getMatchingDiagnostics(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(500);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'Failed to get diagnostics' })
      );
    });
  });
});
