import api from '../library/api';
import type { DashboardActivity } from '../types/dashboard.types';

class DashboardService {
  async getRecentActivity(): Promise<DashboardActivity[]> {
    const response = await api.get('/api/dashboard/recent-activity');
    return response.data.data;
  }
}

export const dashboardService = new DashboardService();
