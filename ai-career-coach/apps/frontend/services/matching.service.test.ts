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

import { matchingService } from './matching.service';
import api from '../library/api';

const mockApi = api as any;

const sampleMatchResponse = {
  success: true,
  data: {
    matches: [
      {
        job_id: 'job-001',
        title: 'Senior React Developer',
        company: 'Tech Corp',
        match_score: 85,
      },
    ],
    total: 1,
  },
};

describe('MatchingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findMatches', () => {
    it('should call POST /api/v1/matching/find-jobs', async () => {
      mockApi.post.mockResolvedValue({ data: sampleMatchResponse });

      await matchingService.findMatches();

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/v1/matching/find-jobs',
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should use default top_k of 100 and job_limit of 1000 when no arguments are provided', async () => {
      mockApi.post.mockResolvedValue({ data: sampleMatchResponse });

      await matchingService.findMatches();

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/v1/matching/find-jobs',
        { filters: undefined, top_k: 100, job_limit: 1000 },
        expect.objectContaining({ timeout: 150000 })
      );
    });

    it('should include supplied filters in the request body', async () => {
      const filters = { country: 'gb', city: 'London' };
      mockApi.post.mockResolvedValue({ data: sampleMatchResponse });

      await matchingService.findMatches(filters);

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/v1/matching/find-jobs',
        { filters, top_k: 100, job_limit: 1000 },
        expect.any(Object)
      );
    });

    it('should override top_k when a custom value is provided', async () => {
      mockApi.post.mockResolvedValue({ data: sampleMatchResponse });

      await matchingService.findMatches(undefined, 10);

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/v1/matching/find-jobs',
        { filters: undefined, top_k: 10, job_limit: 1000 },
        expect.any(Object)
      );
    });

    it('should pass AbortSignal to the axios config when provided', async () => {
      const abortController = new AbortController();
      mockApi.post.mockResolvedValue({ data: sampleMatchResponse });

      await matchingService.findMatches(undefined, 100, abortController.signal);

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/v1/matching/find-jobs',
        expect.any(Object),
        expect.objectContaining({ signal: abortController.signal })
      );
    });

    it('should return the server response data', async () => {
      mockApi.post.mockResolvedValue({ data: sampleMatchResponse });

      const result = await matchingService.findMatches();

      expect(result).toEqual(sampleMatchResponse);
    });

    it('should propagate errors from the API', async () => {
      mockApi.post.mockRejectedValue(new Error('Service unavailable'));

      await expect(matchingService.findMatches()).rejects.toThrow('Service unavailable');
    });
  });
});
