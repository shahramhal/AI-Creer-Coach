// apps/frontend/services/application.service.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';

// Mock the entire axios instance used by the service before importing it
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
    create: vi.fn(),
  };
  return { default: mockApi, authAPI: {} };
});

import { applicationService } from './application.service';
import api from '../library/api';

const mockApi = api as any;

const sampleApplication = {
  id: 'app-uuid-aaaa-bbbb-cccc-ddddeeeeeeee',
  company: 'Acme Corp',
  jobTitle: 'Software Engineer',
  status: 'applied' as const,
  appliedDate: '2026-01-10T00:00:00.000Z',
  sourceUrl: null,
  location: 'London',
  notes: null,
  atsScore: null,
  createdAt: '2026-01-10T00:00:00.000Z',
  updatedAt: '2026-01-10T00:00:00.000Z',
};

describe('ApplicationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getApplications', () => {
    it('should call GET /api/applications without params when no status filter is given', async () => {
      const expectedResponse = { success: true, message: 'ok', data: [sampleApplication] };
      mockApi.get.mockResolvedValue({ data: expectedResponse });

      const result = await applicationService.getApplications();

      expect(mockApi.get).toHaveBeenCalledWith('/api/applications', { params: undefined });
      expect(result).toEqual(expectedResponse);
    });

    it('should call GET /api/applications with status param when status filter is provided', async () => {
      const expectedResponse = { success: true, message: 'ok', data: [] };
      mockApi.get.mockResolvedValue({ data: expectedResponse });

      await applicationService.getApplications('interview');

      expect(mockApi.get).toHaveBeenCalledWith('/api/applications', {
        params: { status: 'interview' },
      });
    });

    it('should return the server response data', async () => {
      const expectedPayload = { success: true, message: 'Applications retrieved', data: [sampleApplication] };
      mockApi.get.mockResolvedValue({ data: expectedPayload });

      const result = await applicationService.getApplications();

      expect(result.data).toHaveLength(1);
      expect(result.data[0].company).toBe('Acme Corp');
    });
  });

  describe('getStats', () => {
    it('should call GET /api/applications/stats', async () => {
      const statsPayload = {
        success: true,
        message: 'Stats retrieved',
        data: { total: 5, byStatus: { applied: 3, interview: 1, offer: 1, rejected: 0 }, responseRate: 40 },
      };
      mockApi.get.mockResolvedValue({ data: statsPayload });

      const result = await applicationService.getStats();

      expect(mockApi.get).toHaveBeenCalledWith('/api/applications/stats');
      expect(result.data.total).toBe(5);
      expect(result.data.responseRate).toBe(40);
    });
  });

  describe('createApplication', () => {
    it('should call POST /api/applications with the given payload', async () => {
      const createPayload = { company: 'New Corp', jobTitle: 'Frontend Developer' };
      const createResponse = { success: true, message: 'Created', data: { ...sampleApplication, ...createPayload } };
      mockApi.post.mockResolvedValue({ data: createResponse });

      const result = await applicationService.createApplication(createPayload);

      expect(mockApi.post).toHaveBeenCalledWith('/api/applications', createPayload);
      expect(result.success).toBe(true);
    });

    it('should include optional fields when provided in the payload', async () => {
      const createPayloadWithExtras = {
        company: 'Startup Ltd',
        jobTitle: 'DevOps Engineer',
        sourceUrl: 'https://example.com/job/456',
        location: 'Remote',
        notes: 'Referred by a friend',
      };
      mockApi.post.mockResolvedValue({ data: { success: true, message: 'Created', data: sampleApplication } });

      await applicationService.createApplication(createPayloadWithExtras);

      expect(mockApi.post).toHaveBeenCalledWith('/api/applications', createPayloadWithExtras);
    });
  });

  describe('updateStatus', () => {
    it('should call PATCH /api/applications/:id/status with the correct status', async () => {
      const applicationId = 'app-uuid-aaaa-bbbb-cccc-ddddeeeeeeee';
      const newStatus = 'interview' as const;
      mockApi.patch.mockResolvedValue({
        data: { success: true, message: 'Updated', data: { ...sampleApplication, status: newStatus } },
      });

      const result = await applicationService.updateStatus(applicationId, newStatus);

      expect(mockApi.patch).toHaveBeenCalledWith(
        `/api/applications/${applicationId}/status`,
        { status: newStatus }
      );
      expect(result.success).toBe(true);
    });
  });

  describe('deleteApplication', () => {
    it('should call DELETE /api/applications/:id with the correct application ID', async () => {
      const applicationId = 'app-uuid-aaaa-bbbb-cccc-ddddeeeeeeee';
      mockApi.delete.mockResolvedValue({ data: { success: true, message: 'Deleted', data: null } });

      const result = await applicationService.deleteApplication(applicationId);

      expect(mockApi.delete).toHaveBeenCalledWith(`/api/applications/${applicationId}`);
      expect(result.success).toBe(true);
    });
  });

  describe('error propagation', () => {
    it('should propagate axios errors thrown by getApplications', async () => {
      const networkError = new Error('Network Error');
      mockApi.get.mockRejectedValue(networkError);

      await expect(applicationService.getApplications()).rejects.toThrow('Network Error');
    });

    it('should propagate axios errors thrown by createApplication', async () => {
      const serverError = new Error('Request failed with status code 409');
      mockApi.post.mockRejectedValue(serverError);

      await expect(
        applicationService.createApplication({ company: 'Corp', jobTitle: 'Dev' })
      ).rejects.toThrow('Request failed with status code 409');
    });
  });
});
