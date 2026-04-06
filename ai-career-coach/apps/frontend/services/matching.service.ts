import api from '../library/api';
import type { JobMatchResponse, MatchFilters } from '../types/matching.types';

const ML_TOP_K_RESULTS = 100;
const ML_JOB_ANALYSIS_LIMIT = 1000;

class MatchingService {
  async findMatches(filters?: MatchFilters, topK: number = ML_TOP_K_RESULTS, signal?: AbortSignal, jobLimit: number = ML_JOB_ANALYSIS_LIMIT): Promise<JobMatchResponse> {
    const response = await api.post('/api/v1/matching/find-jobs', {
      filters,
      top_k: topK,
      job_limit: jobLimit,
    }, {
      timeout: 150000,
      signal,
    });
    return response.data;
  }
}

export const matchingService = new MatchingService();