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

import { dashboardService } from './dashboard.service';
import api from '../library/api';

const mockApi = api as any;

const sampleActivityItems = [
  {
    id: 'activity-001',
    type: 'application_created',
    title: 'Applied to Software Engineer at Acme',
    createdAt: '2026-01-10T09:00:00.000Z',
  },
  {
    id: 'activity-002',
    type: 'cv_uploaded',
    title: 'CV uploaded: resume.pdf',
    createdAt: '2026-01-09T14:00:00.000Z',
  },
];

describe('DashboardService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getRecentActivity', () => {
    it('should call GET /api/v1/dashboard/recent-activity', async () => {
      mockApi.get.mockResolvedValue({ data: { data: sampleActivityItems } });

      await dashboardService.getRecentActivity();

      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/dashboard/recent-activity');
    });

    it('should return the activity array from response.data.data', async () => {
      mockApi.get.mockResolvedValue({ data: { data: sampleActivityItems } });

      const result = await dashboardService.getRecentActivity();

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('application_created');
    });

    it('should return an empty array when the server returns no activity', async () => {
      mockApi.get.mockResolvedValue({ data: { data: [] } });

      const result = await dashboardService.getRecentActivity();

      expect(result).toEqual([]);
    });

    it('should propagate errors from the API', async () => {
      mockApi.get.mockRejectedValue(new Error('Unauthorized'));

      await expect(dashboardService.getRecentActivity()).rejects.toThrow('Unauthorized');
    });
  });
});
