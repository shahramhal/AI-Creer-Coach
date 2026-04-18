import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

const VALID_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const INVALID_UUID = 'not-a-uuid';

const mockApplicationsServiceInstance = vi.hoisted(() => ({
  createApplication: vi.fn(),
  listApplications: vi.fn(),
  getStats: vi.fn(),
  updateStatus: vi.fn(),
  deleteApplication: vi.fn(),
  atsCheck: vi.fn(),
  atsPreview: vi.fn(),
  atsScore: vi.fn(),
}));

vi.mock('../services/applications.service.js', () => {
  function MockApplicationsService(this: any) {
    return mockApplicationsServiceInstance;
  }
  return {
    ApplicationsService: MockApplicationsService,
    VALID_STATUSES: ['APPLIED', 'INTERVIEWING', 'OFFER', 'REJECTED'],
    UUID_RE: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  };
});

vi.mock('../utils/activity.util.js', () => ({
  logUserActivity: vi.fn(),
}));

vi.mock('../utils/logger.js', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

import * as applicationsController from './applications.controller.js';

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

describe('Applications Controller', () => {
  let mockResponse: Response;

  beforeEach(() => {
    vi.clearAllMocks();
    mockResponse = buildMockResponse();
  });

  describe('createApplication', () => {
    it('should return 201 with the new application on success', async () => {
      const fakeApplication = {
        id: VALID_UUID,
        company: 'Acme Corp',
        jobTitle: 'Software Engineer',
        status: 'APPLIED',
      };

      mockApplicationsServiceInstance.createApplication.mockResolvedValue(fakeApplication);

      const mockRequest = buildMockRequest({
        body: { company: 'Acme Corp', jobTitle: 'Software Engineer', sourceUrl: 'https://example.com' },
      });

      await applicationsController.createApplication(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(201);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: fakeApplication })
      );
    });

    it('should return 409 when service returns null (duplicate application)', async () => {
      mockApplicationsServiceInstance.createApplication.mockResolvedValue(null);

      const mockRequest = buildMockRequest({
        body: { company: 'Acme Corp', jobTitle: 'Software Engineer' },
      });

      await applicationsController.createApplication(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(409);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });

    it('should return 500 when service throws an unexpected error', async () => {
      mockApplicationsServiceInstance.createApplication.mockRejectedValue(new Error('DB down'));

      const mockRequest = buildMockRequest({
        body: { company: 'Acme Corp', jobTitle: 'Dev' },
      });

      await applicationsController.createApplication(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(500);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });
  });

  describe('listApplications', () => {
    it('should return 200 with applications and pagination meta on success', async () => {
      const fakeApplications = [{ id: VALID_UUID, company: 'Acme', status: 'APPLIED' }];
      mockApplicationsServiceInstance.listApplications.mockResolvedValue({
        applications: fakeApplications,
        total: 1,
      });

      const mockRequest = buildMockRequest({
        query: { page: '1', limit: '10', status: 'APPLIED' },
      });

      await applicationsController.listApplications(mockRequest, mockResponse);

      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: fakeApplications,
          meta: expect.objectContaining({ total: 1, page: 1, limit: 10 }),
        })
      );
    });

    it('should pass page, limit, and status to the service', async () => {
      mockApplicationsServiceInstance.listApplications.mockResolvedValue({
        applications: [],
        total: 0,
      });

      const mockRequest = buildMockRequest({
        query: { page: '2', limit: '25', status: 'INTERVIEWING' },
      });

      await applicationsController.listApplications(mockRequest, mockResponse);

      expect(mockApplicationsServiceInstance.listApplications).toHaveBeenCalledWith(
        'user-uuid-123',
        expect.objectContaining({ page: 2, limit: 25, status: 'INTERVIEWING' })
      );
    });

    it('should return 500 when service throws', async () => {
      mockApplicationsServiceInstance.listApplications.mockRejectedValue(new Error('DB error'));

      const mockRequest = buildMockRequest({ query: {} });

      await applicationsController.listApplications(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(500);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });
  });

  describe('getApplicationStats', () => {
    it('should return 200 with stats on success', async () => {
      const fakeStats = { total: 10, byStatus: { APPLIED: 5, REJECTED: 5 } };
      mockApplicationsServiceInstance.getStats.mockResolvedValue(fakeStats);

      const mockRequest = buildMockRequest();

      await applicationsController.getApplicationStats(mockRequest, mockResponse);

      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: fakeStats })
      );
    });

    it('should return 500 when service throws', async () => {
      mockApplicationsServiceInstance.getStats.mockRejectedValue(new Error('stats fail'));

      const mockRequest = buildMockRequest();

      await applicationsController.getApplicationStats(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(500);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });
  });

  describe('updateApplicationStatus', () => {
    it('should return 200 with updated application on success', async () => {
      const fakeUpdated = { id: VALID_UUID, status: 'INTERVIEWING' };
      mockApplicationsServiceInstance.updateStatus.mockResolvedValue(fakeUpdated);

      const mockRequest = buildMockRequest({
        params: { id: VALID_UUID },
        body: { status: 'INTERVIEWING' },
      });

      await applicationsController.updateApplicationStatus(mockRequest, mockResponse);

      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: fakeUpdated })
      );
    });

    it('should return 404 when the id fails UUID format check', async () => {
      const mockRequest = buildMockRequest({
        params: { id: INVALID_UUID },
        body: { status: 'APPLIED' },
      });

      await applicationsController.updateApplicationStatus(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(404);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'Application not found' })
      );
      expect(mockApplicationsServiceInstance.updateStatus).not.toHaveBeenCalled();
    });

    it('should return 404 when service returns null (not found)', async () => {
      mockApplicationsServiceInstance.updateStatus.mockResolvedValue(null);

      const mockRequest = buildMockRequest({
        params: { id: VALID_UUID },
        body: { status: 'REJECTED' },
      });

      await applicationsController.updateApplicationStatus(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(404);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'Application not found' })
      );
    });

    it('should return 500 when service throws', async () => {
      mockApplicationsServiceInstance.updateStatus.mockRejectedValue(new Error('update fail'));

      const mockRequest = buildMockRequest({
        params: { id: VALID_UUID },
        body: { status: 'OFFER' },
      });

      await applicationsController.updateApplicationStatus(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(500);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });
  });

  describe('deleteApplication', () => {
    it('should return 200 with success message when application is deleted', async () => {
      mockApplicationsServiceInstance.deleteApplication.mockResolvedValue(true);

      const mockRequest = buildMockRequest({ params: { id: VALID_UUID } });

      await applicationsController.deleteApplication(mockRequest, mockResponse);

      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('should return 404 when the id fails UUID format check', async () => {
      const mockRequest = buildMockRequest({ params: { id: INVALID_UUID } });

      await applicationsController.deleteApplication(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(404);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'Application not found' })
      );
      expect(mockApplicationsServiceInstance.deleteApplication).not.toHaveBeenCalled();
    });

    it('should return 404 when service returns null (not found)', async () => {
      mockApplicationsServiceInstance.deleteApplication.mockResolvedValue(null);

      const mockRequest = buildMockRequest({ params: { id: VALID_UUID } });

      await applicationsController.deleteApplication(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(404);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'Application not found' })
      );
    });

    it('should return 500 when service throws', async () => {
      mockApplicationsServiceInstance.deleteApplication.mockRejectedValue(new Error('delete fail'));

      const mockRequest = buildMockRequest({ params: { id: VALID_UUID } });

      await applicationsController.deleteApplication(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(500);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });
  });

  describe('atsCheck', () => {
    it('should return 200 with ATS score data on success', async () => {
      const fakeAtsResult = { data: { atsScore: 82, keywords: [] } };
      mockApplicationsServiceInstance.atsCheck.mockResolvedValue(fakeAtsResult);

      const mockRequest = buildMockRequest({
        body: { jobDescription: 'Looking for a TS dev', cvId: VALID_UUID },
      });

      await applicationsController.atsCheck(mockRequest, mockResponse);

      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: fakeAtsResult.data })
      );
    });

    it('should return the error status when service returns an object with error field', async () => {
      const serviceError = { error: 'CV not found', status: 404 };
      mockApplicationsServiceInstance.atsCheck.mockResolvedValue(serviceError);

      const mockRequest = buildMockRequest({
        body: { jobDescription: 'some description', cvId: 'unknown-cv' },
      });

      await applicationsController.atsCheck(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(404);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'CV not found' })
      );
    });

    it('should return 500 when service throws an unexpected error', async () => {
      mockApplicationsServiceInstance.atsCheck.mockRejectedValue(new Error('ML offline'));

      const mockRequest = buildMockRequest({
        body: { jobDescription: 'some jd', cvId: VALID_UUID },
      });

      await applicationsController.atsCheck(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(500);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });
  });

  describe('atsPreview', () => {
    it('should return 400 when jobId param is missing', async () => {
      const mockRequest = buildMockRequest({ params: {} });

      await applicationsController.atsPreview(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(400);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'Job ID is required' })
      );
    });

    it('should return 200 with preview data on success', async () => {
      const fakePreview = { data: { atsScore: 75, matchedKeywords: ['TypeScript'] } };
      mockApplicationsServiceInstance.atsPreview.mockResolvedValue(fakePreview);

      const mockRequest = buildMockRequest({
        params: { jobId: 'job-abc-123' },
        body: { cvId: VALID_UUID },
      });

      await applicationsController.atsPreview(mockRequest, mockResponse);

      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: fakePreview.data })
      );
    });

    it('should return the error status when service returns an error object', async () => {
      const serviceError = { error: 'Job not found', status: 404 };
      mockApplicationsServiceInstance.atsPreview.mockResolvedValue(serviceError);

      const mockRequest = buildMockRequest({
        params: { jobId: 'nonexistent-job' },
        body: {},
      });

      await applicationsController.atsPreview(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(404);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'Job not found' })
      );
    });

    it('should return 500 when service throws', async () => {
      mockApplicationsServiceInstance.atsPreview.mockRejectedValue(new Error('crash'));

      const mockRequest = buildMockRequest({
        params: { jobId: 'job-xyz' },
        body: {},
      });

      await applicationsController.atsPreview(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(500);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });
  });

  describe('atsScore', () => {
    it('should return 400 when applicationId param is missing', async () => {
      const mockRequest = buildMockRequest({ params: {} });

      await applicationsController.atsScore(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(400);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'Application ID is required' })
      );
    });

    it('should return 200 with score data on success', async () => {
      const fakeScore = { data: { atsScore: 90 } };
      mockApplicationsServiceInstance.atsScore.mockResolvedValue(fakeScore);

      const mockRequest = buildMockRequest({
        params: { applicationId: VALID_UUID },
        body: { cvId: VALID_UUID },
      });

      await applicationsController.atsScore(mockRequest, mockResponse);

      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: fakeScore.data })
      );
    });

    it('should return the error status when service returns an error object', async () => {
      const serviceError = { error: 'Application not found', status: 404 };
      mockApplicationsServiceInstance.atsScore.mockResolvedValue(serviceError);

      const mockRequest = buildMockRequest({
        params: { applicationId: VALID_UUID },
        body: {},
      });

      await applicationsController.atsScore(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(404);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'Application not found' })
      );
    });

    it('should return 500 when service throws', async () => {
      mockApplicationsServiceInstance.atsScore.mockRejectedValue(new Error('timeout'));

      const mockRequest = buildMockRequest({
        params: { applicationId: VALID_UUID },
        body: {},
      });

      await applicationsController.atsScore(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(500);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });
  });
});
