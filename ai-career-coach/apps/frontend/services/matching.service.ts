import api from '../lib/api'; // Assuming you have this axios instance setup
import type { JobMatchResponse, MatchFilters } from '../types/matching.types';

class MatchingService {
  /**
   * Get personalized job matches based on the user's primary CV
   */
  async findMatches(filters?: MatchFilters): Promise<JobMatchResponse> {
    try {
      const response = await api.post('/api/matching/find-jobs', {
        filters,
        top_k: 20 // Fetch top 20 matches by default
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

export const matchingService = new MatchingService();