import api from '../library/api';
import type {
  Application,
  ApplicationStats,
  ApplicationStatus,
  CreateApplicationPayload,
} from '../types/application.types';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

class ApplicationService {
  async getApplications(status?: ApplicationStatus): Promise<ApiResponse<Application[]>> {
    const params = status ? { status } : undefined;
    const response = await api.get('/api/applications', { params });
    return response.data;
  }

  async getStats(): Promise<ApiResponse<ApplicationStats>> {
    const response = await api.get('/api/applications/stats');
    return response.data;
  }

  async createApplication(payload: CreateApplicationPayload): Promise<ApiResponse<Application>> {
    const response = await api.post('/api/applications', payload);
    return response.data;
  }

  async updateStatus(id: string, status: ApplicationStatus): Promise<ApiResponse<Application>> {
    const response = await api.patch(`/api/applications/${id}/status`, { status });
    return response.data;
  }

  async deleteApplication(id: string): Promise<ApiResponse<null>> {
    const response = await api.delete(`/api/applications/${id}`);
    return response.data;
  }
}

export const applicationService = new ApplicationService();
