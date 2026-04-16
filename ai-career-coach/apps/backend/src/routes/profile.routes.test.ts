// apps/backend/src/routes/profile.routes.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

// vi.mock is hoisted - use vi.hoisted() to create mocks accessible inside the factory.
// IMPORTANT: Never replace these references (no Object.assign). vi.clearAllMocks()
// resets implementation/state in-place. Per-test behavior is set via .mockResolvedValue() etc.
const mockProfileServiceMethods = vi.hoisted(() => ({
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
  updateAvatar: vi.fn(),
  updateProfileWithUser: vi.fn(),
  getCareerPreferences: vi.fn(),
  updateCareerPreferences: vi.fn(),
}));

const mockAccountServiceMethods = vi.hoisted(() => ({
  exportUserData: vi.fn(),
  deleteUserAccount: vi.fn(),
}));

vi.mock('../utils/activity.util.js', () => ({
  logUserActivity: vi.fn(),
}));

// Mock the profile service before importing routes.
// Must use a class constructor (not arrow function) so `new ProfileService()` works.
vi.mock('../services/profile.service.js', () => {
  class ProfileServiceMock {
    getProfile = mockProfileServiceMethods.getProfile;
    updateProfile = mockProfileServiceMethods.updateProfile;
    updateAvatar = mockProfileServiceMethods.updateAvatar;
    updateProfileWithUser = mockProfileServiceMethods.updateProfileWithUser;
    getCareerPreferences = mockProfileServiceMethods.getCareerPreferences;
    updateCareerPreferences = mockProfileServiceMethods.updateCareerPreferences;
  }
  return { ProfileService: ProfileServiceMock };
});

vi.mock('../services/account.service.js', () => ({
  accountService: mockAccountServiceMethods,
}));

// Control whether the upload mock injects a file or throws a multer error - toggle per-test
const uploadControl = vi.hoisted(() => ({
  shouldInjectFile: true,
  multerError: null as { code?: string; message?: string } | null,
}));

vi.mock('../middlewares/upload.middleware.js', () => ({
  upload: {
    single: vi.fn().mockReturnValue((req: any, _res: any, next: any) => {
      if (uploadControl.multerError) {
        return next(uploadControl.multerError);
      }
      if (uploadControl.shouldInjectFile) {
        req.file = {
          fieldname: 'avatar',
          originalname: 'test-avatar.jpg',
          mimetype: 'image/jpeg',
          filename: 'test-user-uuid-1234567890.jpg',
          path: 'public/uploads/avatars/test-user-uuid-1234567890.jpg',
          size: 102400,
        };
      }
      next();
    }),
  },
}));

import profileRoutes from './profile.routes.js';

const mockPrismaInstance = new PrismaClient() as any;

function buildTestApp(): express.Application {
  const testApp = express();
  testApp.use(express.json());
  testApp.use('/api/profile', profileRoutes);
  return testApp;
}

function generateTestAccessToken(userId: string, email: string): string {
  return jwt.sign({ userId, email }, process.env.JWT_SECRET!, { expiresIn: '1h' });
}

const authenticatedUserId = 'authenticated-profile-user-uuid';
const authenticatedUserEmail = 'profile@example.com';

describe('Profile Routes - GET /api/profile/:userId', () => {
  let testApp: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    testApp = buildTestApp();
  });

  it('should return 401 when no authentication token is provided', async () => {
    const response = await request(testApp)
      .get(`/api/profile/${authenticatedUserId}`);

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('should return 403 when authenticated user tries to access another user\'s profile', async () => {
    const differentUserId = 'different-user-uuid-should-be-denied';
    const validAccessToken = generateTestAccessToken(authenticatedUserId, authenticatedUserEmail);

    mockPrismaInstance.user.findUnique.mockResolvedValue({
      id: authenticatedUserId,
      email: authenticatedUserEmail,
      isEmailVerified: true,
      firstName: 'Auth',
      lastName: 'User',
    });

    const response = await request(testApp)
      .get(`/api/profile/${differentUserId}`)
      .set('Authorization', `Bearer ${validAccessToken}`);

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Access denied');
  });

  it('should return 200 with profile data when authenticated user accesses their own profile', async () => {
    const validAccessToken = generateTestAccessToken(authenticatedUserId, authenticatedUserEmail);

    mockPrismaInstance.user.findUnique.mockResolvedValue({
      id: authenticatedUserId,
      email: authenticatedUserEmail,
      isEmailVerified: true,
      firstName: 'Auth',
      lastName: 'User',
    });

    mockProfileServiceMethods.getProfile.mockResolvedValue({
      id: 'profile-uuid',
      userId: authenticatedUserId,
      bio: 'Test bio',
      location: 'London, UK',
      jobTitle: 'Engineer',
      avatarUrl: null,
    });

    const response = await request(testApp)
      .get(`/api/profile/${authenticatedUserId}`)
      .set('Authorization', `Bearer ${validAccessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.userId).toBe(authenticatedUserId);
  });
});

describe('Profile Routes - PUT /api/profile', () => {
  let testApp: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    testApp = buildTestApp();
  });

  it('should return 401 when updating profile without authentication', async () => {
    const response = await request(testApp)
      .put('/api/profile')
      .send({ bio: 'New bio' });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('should return 200 with updated profile data when update is successful', async () => {
    const validAccessToken = generateTestAccessToken(authenticatedUserId, authenticatedUserEmail);
    const profileUpdatePayload = {
      bio: 'Updated professional bio',
      location: 'Manchester, UK',
      linkedinUrl: 'https://linkedin.com/in/updated',
    };

    mockPrismaInstance.user.findUnique.mockResolvedValue({
      id: authenticatedUserId,
      email: authenticatedUserEmail,
      isEmailVerified: true,
      firstName: 'Auth',
      lastName: 'User',
    });

    mockProfileServiceMethods.updateProfile.mockResolvedValue({
      id: 'profile-uuid',
      userId: authenticatedUserId,
      ...profileUpdatePayload,
      updatedAt: new Date(),
    });

    const response = await request(testApp)
      .put('/api/profile')
      .set('Authorization', `Bearer ${validAccessToken}`)
      .send(profileUpdatePayload);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Profile updated successfully');
  });
});

describe('Profile Routes - POST /api/profile/avatar', () => {
  let testApp: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    uploadControl.shouldInjectFile = true; // Explicit reset - never rely on test ordering
    testApp = buildTestApp();
  });

  it('should return 401 when uploading avatar without authentication', async () => {
    const response = await request(testApp)
      .post('/api/profile/avatar');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('should return 400 when no file is provided in the request', async () => {
    const validAccessToken = generateTestAccessToken(authenticatedUserId, authenticatedUserEmail);

    mockPrismaInstance.user.findUnique.mockResolvedValue({
      id: authenticatedUserId,
      email: authenticatedUserEmail,
      isEmailVerified: true,
      firstName: 'Auth',
      lastName: 'User',
    });

    // Disable file injection for this test
    uploadControl.shouldInjectFile = false;

    try {
      const response = await request(testApp)
        .post('/api/profile/avatar')
        .set('Authorization', `Bearer ${validAccessToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('No file uploaded');
    } finally {
      uploadControl.shouldInjectFile = true;
    }
  });

  it('should return 200 with avatar URL after successful upload', async () => {
    const validAccessToken = generateTestAccessToken(authenticatedUserId, authenticatedUserEmail);
    const expectedAvatarUrl = '/uploads/avatars/test-user-uuid-1234567890.jpg';

    mockPrismaInstance.user.findUnique.mockResolvedValue({
      id: authenticatedUserId,
      email: authenticatedUserEmail,
      isEmailVerified: true,
      firstName: 'Auth',
      lastName: 'User',
    });

    mockProfileServiceMethods.updateAvatar.mockResolvedValue({
      id: 'profile-uuid',
      userId: authenticatedUserId,
      avatarUrl: expectedAvatarUrl,
      updatedAt: new Date(),
    });

    const response = await request(testApp)
      .post('/api/profile/avatar')
      .set('Authorization', `Bearer ${validAccessToken}`)
      .attach('avatar', Buffer.from('fake-image-data'), 'test-avatar.jpg');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.avatarUrl).toBe(expectedAvatarUrl);
    expect(response.body.message).toBe('Avatar uploaded successfully');
  });
});

describe('Profile Routes - DELETE /api/profile/avatar', () => {
  let testApp: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    testApp = buildTestApp();
  });

  it('should return 401 when deleting avatar without authentication', async () => {
    const response = await request(testApp)
      .delete('/api/profile/avatar');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('should return 200 with null avatarUrl after successful avatar deletion', async () => {
    const validAccessToken = generateTestAccessToken(authenticatedUserId, authenticatedUserEmail);

    mockPrismaInstance.user.findUnique.mockResolvedValue({
      id: authenticatedUserId,
      email: authenticatedUserEmail,
      isEmailVerified: true,
      firstName: 'Auth',
      lastName: 'User',
    });

    // getProfile is called to find the current avatar
    mockProfileServiceMethods.getProfile.mockResolvedValue({
      id: 'profile-uuid',
      userId: authenticatedUserId,
      avatarUrl: null, // No avatar to delete
      updatedAt: new Date(),
    });

    mockProfileServiceMethods.updateAvatar.mockResolvedValue({
      id: 'profile-uuid',
      userId: authenticatedUserId,
      avatarUrl: null,
      updatedAt: new Date(),
    });

    const response = await request(testApp)
      .delete('/api/profile/avatar')
      .set('Authorization', `Bearer ${validAccessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.avatarUrl).toBeNull();
    expect(response.body.message).toBe('Avatar deleted successfully');
  });
});

describe('Profile Routes - GET /api/profile/preferences', () => {
  let testApp: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    testApp = buildTestApp();
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(testApp).get('/api/profile/preferences');
    expect(response.status).toBe(401);
  });

  it('should return 200 with career preferences', async () => {
    const validAccessToken = generateTestAccessToken(authenticatedUserId, authenticatedUserEmail);
    mockPrismaInstance.user.findUnique.mockResolvedValue({
      id: authenticatedUserId,
      email: authenticatedUserEmail,
      isEmailVerified: true,
      firstName: 'Auth',
      lastName: 'User',
    });
    mockProfileServiceMethods.getCareerPreferences.mockResolvedValue({
      jobTitle: 'Software Engineer',
      location: 'London',
    });

    const response = await request(testApp)
      .get('/api/profile/preferences')
      .set('Authorization', `Bearer ${validAccessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.jobTitle).toBe('Software Engineer');
  });

  it('should return 500 when getCareerPreferences throws', async () => {
    const validAccessToken = generateTestAccessToken(authenticatedUserId, authenticatedUserEmail);
    mockPrismaInstance.user.findUnique.mockResolvedValue({
      id: authenticatedUserId,
      email: authenticatedUserEmail,
      isEmailVerified: true,
      firstName: 'Auth',
      lastName: 'User',
    });
    mockProfileServiceMethods.getCareerPreferences.mockRejectedValue(new Error('DB error'));

    const response = await request(testApp)
      .get('/api/profile/preferences')
      .set('Authorization', `Bearer ${validAccessToken}`);

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
  });
});

describe('Profile Routes - PUT /api/profile/preferences', () => {
  let testApp: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    testApp = buildTestApp();
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(testApp).put('/api/profile/preferences').send({ jobTitle: 'Dev' });
    expect(response.status).toBe(401);
  });

  it('should return 200 with updated preferences', async () => {
    const validAccessToken = generateTestAccessToken(authenticatedUserId, authenticatedUserEmail);
    mockPrismaInstance.user.findUnique.mockResolvedValue({
      id: authenticatedUserId,
      email: authenticatedUserEmail,
      isEmailVerified: true,
      firstName: 'Auth',
      lastName: 'User',
    });
    mockProfileServiceMethods.updateCareerPreferences.mockResolvedValue(undefined);
    mockProfileServiceMethods.getCareerPreferences.mockResolvedValue({ jobTitle: 'DevOps Engineer' });

    const response = await request(testApp)
      .put('/api/profile/preferences')
      .set('Authorization', `Bearer ${validAccessToken}`)
      .send({ jobTitle: 'DevOps Engineer' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Career preferences updated successfully');
  });
});

describe('Profile Routes - GET /api/profile/export', () => {
  let testApp: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    testApp = buildTestApp();
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(testApp).get('/api/profile/export');
    expect(response.status).toBe(401);
  });

  it('should return 200 with exported user data', async () => {
    const validAccessToken = generateTestAccessToken(authenticatedUserId, authenticatedUserEmail);
    mockPrismaInstance.user.findUnique.mockResolvedValue({
      id: authenticatedUserId,
      email: authenticatedUserEmail,
      isEmailVerified: true,
      firstName: 'Auth',
      lastName: 'User',
    });
    mockAccountServiceMethods.exportUserData.mockResolvedValue({ user: { id: authenticatedUserId }, cvs: [] });

    const response = await request(testApp)
      .get('/api/profile/export')
      .set('Authorization', `Bearer ${validAccessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.headers['content-disposition']).toContain('my-data-export.json');
  });

  it('should return 500 when exportUserData throws', async () => {
    const validAccessToken = generateTestAccessToken(authenticatedUserId, authenticatedUserEmail);
    mockPrismaInstance.user.findUnique.mockResolvedValue({
      id: authenticatedUserId,
      email: authenticatedUserEmail,
      isEmailVerified: true,
      firstName: 'Auth',
      lastName: 'User',
    });
    mockAccountServiceMethods.exportUserData.mockRejectedValue(new Error('Export failed'));

    const response = await request(testApp)
      .get('/api/profile/export')
      .set('Authorization', `Bearer ${validAccessToken}`);

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
  });
});

describe('Profile Routes - DELETE /api/profile/account', () => {
  let testApp: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    testApp = buildTestApp();
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(testApp).delete('/api/profile/account').send({ fullName: 'Auth User' });
    expect(response.status).toBe(401);
  });

  it('should return 400 when fullName is missing', async () => {
    const validAccessToken = generateTestAccessToken(authenticatedUserId, authenticatedUserEmail);
    mockPrismaInstance.user.findUnique.mockResolvedValue({
      id: authenticatedUserId,
      email: authenticatedUserEmail,
      isEmailVerified: true,
      firstName: 'Auth',
      lastName: 'User',
    });

    const response = await request(testApp)
      .delete('/api/profile/account')
      .set('Authorization', `Bearer ${validAccessToken}`)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Full name confirmation is required');
  });

  it('should return 400 when fullName does not match', async () => {
    const validAccessToken = generateTestAccessToken(authenticatedUserId, authenticatedUserEmail);
    mockPrismaInstance.user.findUnique.mockResolvedValue({
      id: authenticatedUserId,
      email: authenticatedUserEmail,
      isEmailVerified: true,
      firstName: 'Auth',
      lastName: 'User',
    });

    const response = await request(testApp)
      .delete('/api/profile/account')
      .set('Authorization', `Bearer ${validAccessToken}`)
      .send({ fullName: 'Wrong Name' });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('Name does not match');
  });

  it('should return 200 and clear cookie when deletion succeeds', async () => {
    const validAccessToken = generateTestAccessToken(authenticatedUserId, authenticatedUserEmail);
    mockPrismaInstance.user.findUnique.mockResolvedValue({
      id: authenticatedUserId,
      email: authenticatedUserEmail,
      isEmailVerified: true,
      firstName: 'Auth',
      lastName: 'User',
    });
    mockAccountServiceMethods.deleteUserAccount.mockResolvedValue(undefined);

    const response = await request(testApp)
      .delete('/api/profile/account')
      .set('Authorization', `Bearer ${validAccessToken}`)
      .send({ fullName: 'Auth User' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Account deleted successfully');
  });
});

describe('Profile Routes - PUT /api/profile (with firstName/lastName)', () => {
  let testApp: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    testApp = buildTestApp();
  });

  it('should call updateProfileWithUser when firstName or lastName is included', async () => {
    const validAccessToken = generateTestAccessToken(authenticatedUserId, authenticatedUserEmail);
    mockPrismaInstance.user.findUnique.mockResolvedValue({
      id: authenticatedUserId,
      email: authenticatedUserEmail,
      isEmailVerified: true,
      firstName: 'Old',
      lastName: 'Name',
    });
    mockProfileServiceMethods.updateProfileWithUser.mockResolvedValue({
      profile: { id: 'profile-uuid', bio: 'bio', userId: authenticatedUserId },
    });

    const response = await request(testApp)
      .put('/api/profile')
      .set('Authorization', `Bearer ${validAccessToken}`)
      .send({ firstName: 'New', lastName: 'Name', bio: 'updated bio' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(mockProfileServiceMethods.updateProfileWithUser).toHaveBeenCalled();
  });
});

describe('Profile Routes - Multer error handler', () => {
  let testApp: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    uploadControl.shouldInjectFile = true;
    uploadControl.multerError = null;
    testApp = buildTestApp();
  });

  afterEach(() => {
    uploadControl.multerError = null;
  });

  it('should return 400 for LIMIT_FILE_SIZE multer error', async () => {
    const validAccessToken = generateTestAccessToken(authenticatedUserId, authenticatedUserEmail);
    mockPrismaInstance.user.findUnique.mockResolvedValue({
      id: authenticatedUserId,
      email: authenticatedUserEmail,
      isEmailVerified: true,
      firstName: 'Auth',
      lastName: 'User',
    });

    uploadControl.multerError = { code: 'LIMIT_FILE_SIZE' };

    const response = await request(testApp)
      .post('/api/profile/avatar')
      .set('Authorization', `Bearer ${validAccessToken}`);

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('5MB');
  });

  it('should return 400 for invalid file type multer error', async () => {
    const validAccessToken = generateTestAccessToken(authenticatedUserId, authenticatedUserEmail);
    mockPrismaInstance.user.findUnique.mockResolvedValue({
      id: authenticatedUserId,
      email: authenticatedUserEmail,
      isEmailVerified: true,
      firstName: 'Auth',
      lastName: 'User',
    });

    uploadControl.multerError = { message: 'Invalid file type. Only JPEG, PNG allowed' };

    const response = await request(testApp)
      .post('/api/profile/avatar')
      .set('Authorization', `Bearer ${validAccessToken}`);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Invalid file type. Only JPEG, PNG allowed');
  });
});
