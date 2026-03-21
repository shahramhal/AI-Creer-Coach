import api from '../library/api';
import type { CareerPreferences } from '../types/settings.types';

class SettingsService {
  async getCareerPreferences(): Promise<CareerPreferences> {
    const response = await api.get('/api/profile/preferences');
    return response.data.data;
  }

  async updateCareerPreferences(data: Partial<CareerPreferences>): Promise<CareerPreferences> {
    const response = await api.put('/api/profile/preferences', data);
    return response.data.data;
  }

  async updateAccountInfo(data: { firstName?: string; lastName?: string }): Promise<void> {
    await api.put('/api/profile', data);
  }

  async exportData(): Promise<Blob> {
    const response = await api.get('/api/profile/export', {
      responseType: 'blob',
    });
    return response.data;
  }

  async deleteAccount(fullName: string): Promise<void> {
    await api.delete('/api/profile/account', {
      data: { fullName },
    });
  }
}

export const settingsService = new SettingsService();
