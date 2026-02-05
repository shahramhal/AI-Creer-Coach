import api from '../library/api'; // Assuming you have this axios instance setup
import type { JobMatchResponse, MatchFilters } from '../types/matching.types';

class MatchingService {
  /**
   * Get personalized job matches based on the user's primary CV
   */
  async findMatches(filters?: MatchFilters, topK: number = 20): Promise<JobMatchResponse> {
    try {
      const response = await api.post('/api/matching/find-jobs', {
        filters,
        top_k: topK,
        job_limit: 1000 // Analyze up to 1000 most recent jobs
      }, {
        timeout: 150000 // 2.5 minute timeout for ML processing
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

export const matchingService = new MatchingService();