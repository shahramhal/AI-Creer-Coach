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

      // findUnique returns null - profile does not exist
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

      // getProfile internally calls findUnique - return existing profile
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

  describe('updateProfileWithUser', () => {
    it('updates both user and profile in a transaction', async () => {
      const profileData = { bio: 'Updated bio' };
      const userData = { firstName: 'NewFirst' };
      const updatedUser = { id: sampleUserId, firstName: 'NewFirst', lastName: 'User' };
      const updatedProfile = { ...sampleProfileRecord, bio: 'Updated bio' };

      mockPrismaInstance.userProfile.findUnique.mockResolvedValue(sampleProfileRecord);
      mockPrismaInstance.user.update.mockResolvedValue(updatedUser);
      mockPrismaInstance.userProfile.update.mockResolvedValue(updatedProfile);

      const result = await profileService.updateProfileWithUser(sampleUserId, profileData, userData);

      expect(mockPrismaInstance.$transaction).toHaveBeenCalled();
      expect(result.user).toEqual(updatedUser);
      expect(result.profile.bio).toBe('Updated bio');
    });
  });

  describe('getCareerPreferences', () => {
    it('returns career preference fields from the profile', async () => {
      const profileWithPrefs = {
        ...sampleProfileRecord,
        targetRole: 'Software Engineer',
        experienceLevel: 'senior',
        targetCompanies: ['Google', 'Amazon'],
        country: 'UK',
        region: 'London',
        salaryMin: 80000,
        salaryMax: 120000,
        workArrangements: ['remote'],
        preferredJobTypes: ['full-time'],
        jobTitle: 'Senior Engineer',
      };
      mockPrismaInstance.userProfile.findUnique.mockResolvedValue(profileWithPrefs);

      const result = await profileService.getCareerPreferences(sampleUserId);

      expect(result.targetRole).toBe('Software Engineer');
      expect(result.experienceLevel).toBe('senior');
      expect(result.salaryMin).toBe(80000);
      expect(result.workArrangements).toEqual(['remote']);
    });
  });

  describe('updateCareerPreferences', () => {
    it('updates career preferences and returns the updated profile', async () => {
      const prefsData = {
        targetRole: 'Backend Engineer',
        salaryMin: 90000,
        salaryMax: 130000,
      };
      const updatedProfile = { ...sampleProfileRecord, ...prefsData };

      mockPrismaInstance.userProfile.findUnique.mockResolvedValue(sampleProfileRecord);
      mockPrismaInstance.userProfile.update.mockResolvedValue(updatedProfile);

      const result = await profileService.updateCareerPreferences(sampleUserId, prefsData);

      expect(mockPrismaInstance.userProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: sampleUserId },
          data: expect.objectContaining({ targetRole: 'Backend Engineer', salaryMin: 90000 }),
        })
      );
      expect(result.targetRole).toBe('Backend Engineer');
    });

    it('uses null for missing optional preference fields', async () => {
      mockPrismaInstance.userProfile.findUnique.mockResolvedValue(sampleProfileRecord);
      mockPrismaInstance.userProfile.update.mockResolvedValue(sampleProfileRecord);

      await profileService.updateCareerPreferences(sampleUserId, {});

      const updateArgs = mockPrismaInstance.userProfile.update.mock.calls[0][0];
      expect(updateArgs.data.targetRole).toBeNull();
      expect(updateArgs.data.targetCompanies).toEqual([]);
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
