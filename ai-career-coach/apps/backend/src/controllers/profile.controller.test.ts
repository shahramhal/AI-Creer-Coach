import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

const mockProfileServiceInstance = vi.hoisted(() => ({
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
  updateProfileWithUser: vi.fn(),
  getCareerPreferences: vi.fn(),
  updateCareerPreferences: vi.fn(),
  updateAvatar: vi.fn(),
}));

vi.mock('../services/profile.service.js', () => {
  function MockProfileService(this: any) {
    return mockProfileServiceInstance;
  }
  return { ProfileService: MockProfileService };
});

const mockAccountService = vi.hoisted(() => ({
  exportUserData: vi.fn(),
  deleteUserAccount: vi.fn(),
}));

vi.mock('../services/account.service.js', () => ({
  accountService: mockAccountService,
}));

vi.mock('../utils/activity.util.js', () => ({
  logUserActivity: vi.fn(),
}));

vi.mock('../utils/logger.js', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

import * as profileController from './profile.controller.js';

function buildMockResponse() {
  const mockResponse = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    clearCookie: vi.fn().mockReturnThis(),
  };
  return mockResponse as unknown as Response;
}

function buildMockRequest(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    query: {},
    params: {},
    body: {},
    file: undefined,
    user: {
      id: 'user-uuid-123',
      email: 'user@example.com',
      isEmailVerified: true,
      role: 'USER',
      firstName: 'Alice',
      lastName: 'Smith',
    },
    ...overrides,
  } as unknown as Request;
}

describe('Profile Controller', () => {
  let mockResponse: Response;

  beforeEach(() => {
    vi.clearAllMocks();
    mockResponse = buildMockResponse();
  });

  describe('getProfile', () => {
    it('should return 400 when userId param is missing', async () => {
      const mockRequest = buildMockRequest({ params: {} });

      await profileController.getProfile(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(400);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'User ID is required' })
      );
    });

    it('should return 403 when the requested userId does not match the authenticated user', async () => {
      const mockRequest = buildMockRequest({ params: { userId: 'different-user-uuid' } });

      await profileController.getProfile(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(403);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'Access denied' })
      );
    });

    it('should return 200 with profile data when the user requests their own profile', async () => {
      const fakeProfile = { id: 'user-uuid-123', bio: 'Engineer', location: 'London' };
      mockProfileServiceInstance.getProfile.mockResolvedValue(fakeProfile);

      const mockRequest = buildMockRequest({ params: { userId: 'user-uuid-123' } });

      await profileController.getProfile(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(200);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: fakeProfile })
      );
    });

    it('should return 500 when service throws', async () => {
      mockProfileServiceInstance.getProfile.mockRejectedValue(new Error('DB error'));

      const mockRequest = buildMockRequest({ params: { userId: 'user-uuid-123' } });

      await profileController.getProfile(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(500);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });
  });

  describe('updateProfile', () => {
    it('should call updateProfileWithUser when firstName or lastName is provided', async () => {
      const fakeResult = { profile: { bio: 'Dev', firstName: 'Bob' } };
      mockProfileServiceInstance.updateProfileWithUser.mockResolvedValue(fakeResult);

      const mockRequest = buildMockRequest({
        body: { firstName: 'Bob', lastName: 'Jones', bio: 'Dev' },
      });

      await profileController.updateProfile(mockRequest, mockResponse);

      expect(mockProfileServiceInstance.updateProfileWithUser).toHaveBeenCalled();
      expect(mockProfileServiceInstance.updateProfile).not.toHaveBeenCalled();
      expect((mockResponse.status as any)).toHaveBeenCalledWith(200);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: fakeResult.profile })
      );
    });

    it('should call updateProfile when no firstName or lastName is provided', async () => {
      const fakeProfile = { bio: 'Engineer', location: 'Berlin' };
      mockProfileServiceInstance.updateProfile.mockResolvedValue(fakeProfile);

      const mockRequest = buildMockRequest({
        body: { bio: 'Engineer', location: 'Berlin' },
      });

      await profileController.updateProfile(mockRequest, mockResponse);

      expect(mockProfileServiceInstance.updateProfile).toHaveBeenCalled();
      expect(mockProfileServiceInstance.updateProfileWithUser).not.toHaveBeenCalled();
      expect((mockResponse.status as any)).toHaveBeenCalledWith(200);
    });

    it('should return 500 when service throws', async () => {
      mockProfileServiceInstance.updateProfile.mockRejectedValue(new Error('Update failed'));

      const mockRequest = buildMockRequest({ body: { bio: 'Dev' } });

      await profileController.updateProfile(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(500);
    });
  });

  describe('getCareerPreferences', () => {
    it('should return 200 with preferences data on success', async () => {
      const fakePreferences = { jobType: 'full-time', remoteOnly: true, salaryMin: 60000 };
      mockProfileServiceInstance.getCareerPreferences.mockResolvedValue(fakePreferences);

      const mockRequest = buildMockRequest();

      await profileController.getCareerPreferences(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(200);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: fakePreferences })
      );
    });

    it('should return 500 when service throws', async () => {
      mockProfileServiceInstance.getCareerPreferences.mockRejectedValue(new Error('Read failed'));

      const mockRequest = buildMockRequest();

      await profileController.getCareerPreferences(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(500);
    });
  });

  describe('updateCareerPreferences', () => {
    it('should return 200 with updated preferences on success', async () => {
      const updatedPreferences = { jobType: 'contract', remoteOnly: false };
      mockProfileServiceInstance.updateCareerPreferences.mockResolvedValue(undefined);
      mockProfileServiceInstance.getCareerPreferences.mockResolvedValue(updatedPreferences);

      const mockRequest = buildMockRequest({ body: { jobType: 'contract', remoteOnly: false } });

      await profileController.updateCareerPreferences(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(200);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: updatedPreferences })
      );
    });

    it('should return 500 when service throws', async () => {
      mockProfileServiceInstance.updateCareerPreferences.mockRejectedValue(new Error('Write failed'));

      const mockRequest = buildMockRequest({ body: { jobType: 'part-time' } });

      await profileController.updateCareerPreferences(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(500);
    });
  });

  describe('exportData', () => {
    it('should set content-type and content-disposition headers and return 200 with data', async () => {
      const fakeExportData = { user: { email: 'user@example.com' }, cvs: [] };
      mockAccountService.exportUserData.mockResolvedValue(fakeExportData);

      const mockRequest = buildMockRequest();

      await profileController.exportData(mockRequest, mockResponse);

      expect((mockResponse.setHeader as any)).toHaveBeenCalledWith('Content-Type', 'application/json');
      expect((mockResponse.setHeader as any)).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('attachment')
      );
      expect((mockResponse.status as any)).toHaveBeenCalledWith(200);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: fakeExportData })
      );
    });

    it('should return 500 when service throws', async () => {
      mockAccountService.exportUserData.mockRejectedValue(new Error('Export failed'));

      const mockRequest = buildMockRequest();

      await profileController.exportData(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(500);
    });
  });

  describe('deleteAccount', () => {
    it('should return 400 when fullName is missing from request body', async () => {
      const mockRequest = buildMockRequest({ body: {} });

      await profileController.deleteAccount(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(400);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'Full name confirmation is required' })
      );
    });

    it('should return 400 when the provided name does not match the authenticated user name', async () => {
      const mockRequest = buildMockRequest({
        body: { fullName: 'Wrong Name' },
      });

      await profileController.deleteAccount(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(400);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: expect.stringContaining('Name does not match') })
      );
    });

    it('should delete the account and clear the cookie when name matches', async () => {
      mockAccountService.deleteUserAccount.mockResolvedValue(undefined);

      const mockRequest = buildMockRequest({
        body: { fullName: 'Alice Smith' },
      });

      await profileController.deleteAccount(mockRequest, mockResponse);

      expect(mockAccountService.deleteUserAccount).toHaveBeenCalledWith('user-uuid-123');
      expect((mockResponse.clearCookie as any)).toHaveBeenCalledWith(
        'refreshToken',
        expect.objectContaining({ httpOnly: true })
      );
      expect((mockResponse.status as any)).toHaveBeenCalledWith(200);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('should return 500 when service throws', async () => {
      mockAccountService.deleteUserAccount.mockRejectedValue(new Error('Delete failed'));

      const mockRequest = buildMockRequest({ body: { fullName: 'Alice Smith' } });

      await profileController.deleteAccount(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(500);
    });
  });

  describe('uploadAvatar', () => {
    it('should return 400 when no file is uploaded', async () => {
      const mockRequest = buildMockRequest({ file: undefined });

      await profileController.uploadAvatar(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(400);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'No file uploaded' })
      );
    });

    it('should return 200 with avatar URL on successful upload', async () => {
      const fakeProfile = { avatarUrl: '/uploads/avatars/photo.jpg' };
      mockProfileServiceInstance.updateAvatar.mockResolvedValue(fakeProfile);

      const mockRequest = buildMockRequest({
        file: { filename: 'photo.jpg', mimetype: 'image/jpeg' } as any,
      });

      await profileController.uploadAvatar(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(200);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ avatarUrl: fakeProfile.avatarUrl }),
        })
      );
    });

    it('should return 500 when service throws', async () => {
      mockProfileServiceInstance.updateAvatar.mockRejectedValue(new Error('DB write failed'));

      const mockRequest = buildMockRequest({
        file: { filename: 'photo.jpg' } as any,
      });

      await profileController.uploadAvatar(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(500);
    });
  });

  describe('deleteAvatar', () => {
    it('should return 200 and attempt file cleanup when profile has an avatarUrl', async () => {
      const fakeProfile = { avatarUrl: '/uploads/avatars/old-photo.jpg' };
      mockProfileServiceInstance.getProfile.mockResolvedValue(fakeProfile);
      mockProfileServiceInstance.updateAvatar.mockResolvedValue({ avatarUrl: null });

      const mockRequest = buildMockRequest();

      await profileController.deleteAvatar(mockRequest, mockResponse);

      expect(mockProfileServiceInstance.updateAvatar).toHaveBeenCalledWith('user-uuid-123', null);
      expect((mockResponse.status as any)).toHaveBeenCalledWith(200);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: { avatarUrl: null } })
      );
    });

    it('should return 200 without any file cleanup when profile has no avatarUrl', async () => {
      const fakeProfile = { avatarUrl: null };
      mockProfileServiceInstance.getProfile.mockResolvedValue(fakeProfile);
      mockProfileServiceInstance.updateAvatar.mockResolvedValue({ avatarUrl: null });

      const mockRequest = buildMockRequest();

      await profileController.deleteAvatar(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(200);
    });

    it('should return 500 when getProfile throws', async () => {
      mockProfileServiceInstance.getProfile.mockRejectedValue(new Error('DB error'));

      const mockRequest = buildMockRequest();

      await profileController.deleteAvatar(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(500);
    });
  });
});
