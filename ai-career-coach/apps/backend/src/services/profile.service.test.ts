// apps/backend/src/services/profile.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { ProfileService } from './profile.service.js';

// Get the mocked Prisma singleton
const mockPrismaInstance = new PrismaClient() as any;

const sampleUserId = 'profile-test-user-uuid';

const sampleProfileRecord = {
  id: 'profile-uuid-111',
  userId: sampleUserId,
  phoneNumber: '+44 7700 900000',
  location: 'London, UK',
  linkedinUrl: 'https://linkedin.com/in/testuser',
  githubUrl: 'https://github.com/testuser',
  portfolioUrl: 'https://testuser.dev',
  bio: 'Software engineer with 5 years of experience',
  avatarUrl: '/uploads/avatars/profile-uuid-111.jpg',
  jobTitle: 'Senior Software Engineer',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-06-01'),
};

describe('ProfileService', () => {
  let profileService: ProfileService;

  beforeEach(() => {
    vi.clearAllMocks();
    profileService = new ProfileService();
  });

  describe('getProfile', () => {
    it('should return an existing profile when one is found for the user', async () => {
      mockPrismaInstance.userProfile.findUnique.mockResolvedValue(sampleProfileRecord);

      const retrievedProfile = await profileService.getProfile(sampleUserId);

      expect(retrievedProfile).toEqual(sampleProfileRecord);
      expect(mockPrismaInstance.userProfile.findUnique).toHaveBeenCalledWith({
        where: { userId: sampleUserId },
      });
    });

    it('should create and return a new blank profile when no profile exists for the user', async () => {
      const newlyCreatedProfile = {
        id: 'new-profile-uuid',
        userId: sampleUserId,
        phoneNumber: null,
        location: null,
        linkedinUrl: null,
        githubUrl: null,
        portfolioUrl: null,
        bio: null,
        avatarUrl: null,
        jobTitle: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // findUnique returns null — profile does not exist
      mockPrismaInstance.userProfile.findUnique.mockResolvedValue(null);
      // create returns the new profile
      mockPrismaInstance.userProfile.create.mockResolvedValue(newlyCreatedProfile);

      const retrievedProfile = await profileService.getProfile(sampleUserId);

      expect(retrievedProfile).toEqual(newlyCreatedProfile);
      expect(mockPrismaInstance.userProfile.create).toHaveBeenCalledWith({
        data: { userId: sampleUserId },
      });
    });
  });

  describe('updateProfile', () => {
    it('should update and return the profile with provided field values', async () => {
      const profileUpdatePayload = {
        phoneNumber: '+44 7700 999999',
        location: 'Manchester, UK',
        bio: 'Updated bio with more experience',
      };

      const updatedProfileRecord = {
        ...sampleProfileRecord,
        ...profileUpdatePayload,
        updatedAt: new Date(),
      };

      // getProfile internally calls findUnique — return existing profile
      mockPrismaInstance.userProfile.findUnique.mockResolvedValue(sampleProfileRecord);
      mockPrismaInstance.userProfile.update.mockResolvedValue(updatedProfileRecord);

      const updateResult = await profileService.updateProfile(sampleUserId, profileUpdatePayload);

      expect(updateResult.phoneNumber).toBe(profileUpdatePayload.phoneNumber);
      expect(updateResult.location).toBe(profileUpdatePayload.location);
      expect(updateResult.bio).toBe(profileUpdatePayload.bio);
      expect(mockPrismaInstance.userProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: sampleUserId },
          data: expect.objectContaining(profileUpdatePayload),
        })
      );
    });

    it('should create a profile first if it does not exist before performing the update', async () => {
      const newProfile = {
        id: 'auto-created-profile-uuid',
        userId: sampleUserId,
        phoneNumber: null,
        location: null,
        bio: null,
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const profileUpdatePayload = { location: 'Birmingham, UK' };
      const updatedProfileRecord = { ...newProfile, ...profileUpdatePayload };

      // Profile does not exist yet
      mockPrismaInstance.userProfile.findUnique.mockResolvedValue(null);
      mockPrismaInstance.userProfile.create.mockResolvedValue(newProfile);
      mockPrismaInstance.userProfile.update.mockResolvedValue(updatedProfileRecord);

      const updateResult = await profileService.updateProfile(sampleUserId, profileUpdatePayload);

      // Should have created the profile first
      expect(mockPrismaInstance.userProfile.create).toHaveBeenCalled();
      expect(updateResult.location).toBe('Birmingham, UK');
    });

    it('should include the updatedAt timestamp in the update data', async () => {
      const profileUpdatePayload = { linkedinUrl: 'https://linkedin.com/in/updated' };

      mockPrismaInstance.userProfile.findUnique.mockResolvedValue(sampleProfileRecord);
      mockPrismaInstance.userProfile.update.mockResolvedValue({ ...sampleProfileRecord, ...profileUpdatePayload });

      await profileService.updateProfile(sampleUserId, profileUpdatePayload);

      const updateCallArgs = mockPrismaInstance.userProfile.update.mock.calls[0][0];
      expect(updateCallArgs.data.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('updateAvatar', () => {
    it('should update the avatar URL and return the updated profile', async () => {
      const newAvatarUrl = '/uploads/avatars/new-avatar-123.png';
      const profileWithNewAvatar = { ...sampleProfileRecord, avatarUrl: newAvatarUrl, updatedAt: new Date() };

      mockPrismaInstance.userProfile.update.mockResolvedValue(profileWithNewAvatar);

      const updateAvatarResult = await profileService.updateAvatar(sampleUserId, newAvatarUrl);

      expect(updateAvatarResult.avatarUrl).toBe(newAvatarUrl);
      expect(mockPrismaInstance.userProfile.update).toHaveBeenCalledWith({
        where: { userId: sampleUserId },
        data: { avatarUrl: newAvatarUrl, updatedAt: expect.any(Date) },
      });
    });

    it('should set avatarUrl to null when called with null to remove the avatar', async () => {
      const profileWithNoAvatar = { ...sampleProfileRecord, avatarUrl: null, updatedAt: new Date() };

      mockPrismaInstance.userProfile.update.mockResolvedValue(profileWithNoAvatar);

      const updateAvatarResult = await profileService.updateAvatar(sampleUserId, null);

      expect(updateAvatarResult.avatarUrl).toBeNull();
      expect(mockPrismaInstance.userProfile.update).toHaveBeenCalledWith({
        where: { userId: sampleUserId },
        data: { avatarUrl: null, updatedAt: expect.any(Date) },
      });
    });
  });
});
