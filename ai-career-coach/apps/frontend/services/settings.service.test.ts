import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../library/api', () => {
  const mockApi = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  };
  return { default: mockApi, authAPI: {} };
});

import { settingsService } from './settings.service';
import api from '../library/api';

const mockApi = api as any;

const samplePreferences = {
  jobTitle: 'Software Engineer',
  location: 'London',
  country: 'gb',
  salaryMin: 50000,
  remotePreference: 'Hybrid',
};

describe('SettingsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCareerPreferences', () => {
    it('should call GET /api/v1/profile/preferences', async () => {
      mockApi.get.mockResolvedValue({ data: { data: samplePreferences } });

      await settingsService.getCareerPreferences();

      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/profile/preferences');
    });

    it('should return the preferences from response.data.data', async () => {
      mockApi.get.mockResolvedValue({ data: { data: samplePreferences } });

      const result = await settingsService.getCareerPreferences();

      expect(result.jobTitle).toBe('Software Engineer');
      expect(result.location).toBe('London');
    });

    it('should propagate errors', async () => {
      mockApi.get.mockRejectedValue(new Error('Unauthorized'));

      await expect(settingsService.getCareerPreferences()).rejects.toThrow('Unauthorized');
    });
  });

  describe('updateCareerPreferences', () => {
    it('should call PUT /api/v1/profile/preferences with the given data', async () => {
      const updateData = { jobTitle: 'Senior Engineer', location: 'Manchester' };
      mockApi.put.mockResolvedValue({ data: { data: { ...samplePreferences, ...updateData } } });

      await settingsService.updateCareerPreferences(updateData);

      expect(mockApi.put).toHaveBeenCalledWith('/api/v1/profile/preferences', updateData);
    });

    it('should return the updated preferences', async () => {
      const updateData = { jobTitle: 'Lead Engineer' };
      const updatedPrefs = { ...samplePreferences, ...updateData };
      mockApi.put.mockResolvedValue({ data: { data: updatedPrefs } });

      const result = await settingsService.updateCareerPreferences(updateData);

      expect(result.jobTitle).toBe('Lead Engineer');
    });
  });

  describe('updateAccountInfo', () => {
    it('should call PUT /api/v1/profile with first and last name', async () => {
      mockApi.put.mockResolvedValue({ data: null });

      await settingsService.updateAccountInfo({ firstName: 'Jane', lastName: 'Smith' });

      expect(mockApi.put).toHaveBeenCalledWith('/api/v1/profile', {
        firstName: 'Jane',
        lastName: 'Smith',
      });
    });

    it('should call PUT with only firstName when lastName is not supplied', async () => {
      mockApi.put.mockResolvedValue({ data: null });

      await settingsService.updateAccountInfo({ firstName: 'Jane' });

      expect(mockApi.put).toHaveBeenCalledWith('/api/v1/profile', { firstName: 'Jane' });
    });
  });

  describe('exportData', () => {
    it('should call GET /api/v1/profile/export with responseType blob', async () => {
      const fakeBlob = new Blob(['{}'], { type: 'application/json' });
      mockApi.get.mockResolvedValue({ data: fakeBlob });

      const result = await settingsService.exportData();

      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/profile/export', {
        responseType: 'blob',
      });
      expect(result).toBe(fakeBlob);
    });
  });

  describe('deleteAccount', () => {
    it('should call DELETE /api/v1/profile/account with the full name in the request body', async () => {
      mockApi.delete.mockResolvedValue({ data: null });

      await settingsService.deleteAccount('Jane Smith');

      expect(mockApi.delete).toHaveBeenCalledWith('/api/v1/profile/account', {
        data: { fullName: 'Jane Smith' },
      });
    });

    it('should propagate errors from the API', async () => {
      mockApi.delete.mockRejectedValue(new Error('Name mismatch'));

      await expect(settingsService.deleteAccount('Wrong Name')).rejects.toThrow('Name mismatch');
    });
  });
});
