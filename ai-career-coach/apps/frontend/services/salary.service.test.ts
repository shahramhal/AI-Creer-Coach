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

import { salaryService } from './salary.service';
import api from '../library/api';

const mockApi = api as any;

const sampleSalaryResponse = {
  success: true,
  data: {
    prediction: {
      jobTitle: 'Software Engineer',
      predictedSalary: 75000,
      salaryMin: 60000,
      salaryMax: 90000,
      currency: '£',
      confidence: 82,
      vsMarketAvg: 5,
    },
  },
};

describe('SalaryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getInsights', () => {
    it('should call GET /api/v1/salary/insights with query parameters', async () => {
      mockApi.get.mockResolvedValue({ data: sampleSalaryResponse });

      await salaryService.getInsights('Software Engineer', 'London', 'gb');

      expect(mockApi.get).toHaveBeenCalledWith(
        '/api/v1/salary/insights?jobTitle=Software+Engineer&location=London&country=gb'
      );
    });

    it('should include all three query params in the URL', async () => {
      mockApi.get.mockResolvedValue({ data: sampleSalaryResponse });

      await salaryService.getInsights('Data Scientist', 'Manchester', 'gb');

      const calledUrl = mockApi.get.mock.calls[0][0] as string;
      expect(calledUrl).toContain('jobTitle=Data+Scientist');
      expect(calledUrl).toContain('location=Manchester');
      expect(calledUrl).toContain('country=gb');
    });

    it('should default the country to "gb" when the parameter is omitted', async () => {
      mockApi.get.mockResolvedValue({ data: sampleSalaryResponse });

      await salaryService.getInsights('Engineer', 'London');

      const calledUrl = mockApi.get.mock.calls[0][0] as string;
      expect(calledUrl).toContain('country=gb');
    });

    it('should return the server response', async () => {
      mockApi.get.mockResolvedValue({ data: sampleSalaryResponse });

      const result = await salaryService.getInsights('Software Engineer', 'London', 'gb');

      expect(result).toEqual(sampleSalaryResponse);
    });

    it('should propagate API errors', async () => {
      mockApi.get.mockRejectedValue(new Error('Not found'));

      await expect(salaryService.getInsights('Engineer', 'London', 'gb')).rejects.toThrow('Not found');
    });
  });

  describe('savePreferences', () => {
    it('should call PATCH /api/v1/salary/preferences with the job title', async () => {
      mockApi.patch.mockResolvedValue({ data: null });

      await salaryService.savePreferences('Frontend Developer');

      expect(mockApi.patch).toHaveBeenCalledWith('/api/v1/salary/preferences', {
        jobTitle: 'Frontend Developer',
        location: undefined,
      });
    });

    it('should include location when provided', async () => {
      mockApi.patch.mockResolvedValue({ data: null });

      await salaryService.savePreferences('Backend Developer', 'Edinburgh');

      expect(mockApi.patch).toHaveBeenCalledWith('/api/v1/salary/preferences', {
        jobTitle: 'Backend Developer',
        location: 'Edinburgh',
      });
    });

    it('should propagate errors from the API', async () => {
      mockApi.patch.mockRejectedValue(new Error('Forbidden'));

      await expect(salaryService.savePreferences('Engineer')).rejects.toThrow('Forbidden');
    });
  });
});
