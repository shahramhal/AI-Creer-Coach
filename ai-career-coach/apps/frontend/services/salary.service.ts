// apps/frontend/services/salary.service.ts

import api from '../library/api';
import type { SalaryInsightsResponse } from '../types/salary.types';

class SalaryService {
  async getInsights(
    jobTitle: string,
    location: string,
    country: string = 'gb'
  ): Promise<SalaryInsightsResponse> {
    const params = new URLSearchParams({
      jobTitle,
      location,
      country,
    });
    const response = await api.get(`/api/v1/salary/insights?${params}`);
    return response.data;
  }

  async savePreferences(jobTitle: string, location?: string): Promise<void> {
    await api.patch('/api/v1/salary/preferences', {
      jobTitle,
      location,
    });
  }
}

export const salaryService = new SalaryService();
