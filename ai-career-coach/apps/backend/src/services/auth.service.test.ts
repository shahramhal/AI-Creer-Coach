// apps/backend/src/services/auth.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { AuthService } from './auth.service.js';

// Get the mocked Prisma singleton used inside the service
const mockPrismaInstance = new PrismaClient() as any;

// Mock bcrypt to avoid slow hashing in tests
vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed-password-result'),
    compare: vi.fn().mockResolvedValue(true),
  },
}));

// Mock email utility to prevent actual email sending
vi.mock('../utils/email.util.js', () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
}));

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(async () => {
    vi.clearAllMocks();
    authService = new AuthService();
    // Re-apply default bcrypt mock implementations after clearAllMocks
    const bcryptModule = await import('bcrypt');
    vi.mocked((bcryptModule as any).default.hash).mockResolvedValue('hashed-password-result');
    vi.mocked((bcryptModule as any).default.compare).mockResolvedValue(true);
  });

  //  register 
  describe('register', () => {
    it('should throw an error when a user with the same email already exists', async () => {
      const existingUserRecord = {
        id: 'existing-uuid',
        email: 'duplicate@test.com',
        passwordHash: 'some-hash',
        firstName: 'Jane',
        lastName: 'Doe',
        isEmailVerified: true,
        emailVerifyToken: null,
        resetPasswordToken: null,
        resetPasswordExpires: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaInstance.user.findUnique.mockResolvedValue(existingUserRecord);

      await expect(
        authService.register({ email: 'duplicate@test.com', password: 'Password123' })
      ).rejects.toThrow('User already exists with this email');
    });

    it('should successfully create a new user and return id, email, and message', async () => {
      const newUserEmail = 'newuser@test.com';
      const newUserId = 'new-user-uuid-5678';

      // First call: no existing user
      mockPrismaInstance.user.findUnique.mockResolvedValueOnce(null);

      // create call returns newly created user
      mockPrismaInstance.user.create.mockResolvedValue({
        id: newUserId,
        email: newUserEmail,
        passwordHash: 'hashed-password-result',
        firstName: 'Alice',
        lastName: 'Smith',
        isEmailVerified: false,
        emailVerifyToken: null,
        resetPasswordToken: null,
        resetPasswordExpires: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // update call to set emailVerifyToken
      mockPrismaInstance.user.update.mockResolvedValue({
        id: newUserId,
        email: newUserEmail,
        emailVerifyToken: 'generated-verify-token',
      });

      const registrationResult = await authService.register({
        email: newUserEmail,
        password: 'Password123',
        firstName: 'Alice',
        lastName: 'Smith',
      });

      expect(registrationResult.id).toBe(newUserId);
      expect(registrationResult.email).toBe(newUserEmail);
      expect(registrationResult.message).toContain('Registration successful');
    });

    it('should create user with null firstName and lastName when they are not provided', async () => {
      mockPrismaInstance.user.findUnique.mockResolvedValueOnce(null);
      mockPrismaInstance.user.create.mockResolvedValue({
        id: 'minimal-user-uuid',
        email: 'minimal@test.com',
        passwordHash: 'hashed-password-result',
        firstName: null,
        lastName: null,
        isEmailVerified: false,
        emailVerifyToken: null,
        resetPasswordToken: null,
        resetPasswordExpires: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrismaInstance.user.update.mockResolvedValue({ id: 'minimal-user-uuid' });

      const registrationResult = await authService.register({
        email: 'minimal@test.com',
        password: 'Password123',
      });

      expect(registrationResult.email).toBe('minimal@test.com');

      // Verify user.create was called with null first/last name
      const createCallArgs = mockPrismaInstance.user.create.mock.calls[0][0];
      expect(createCallArgs.data.firstName).toBeNull();
      expect(createCallArgs.data.lastName).toBeNull();
    });
  });

  //  login 
  describe('login', () => {
    it('should throw "Invalid credentials" when user email is not found', async () => {
      mockPrismaInstance.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.login('nonexistent@test.com', 'anyPassword123')
      ).rejects.toThrow('No account found with that email address.');
    });

    it('should throw "Invalid credentials" when password does not match stored hash', async () => {
      const storedUserRecord = {
        id: 'user-uuid-login',
        email: 'user@test.com',
        passwordHash: 'stored-bcrypt-hash',
        firstName: 'Bob',
        lastName: 'Builder',
        isEmailVerified: true,
        emailVerifyToken: null,
        resetPasswordToken: null,
        resetPasswordExpires: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaInstance.user.findUnique.mockResolvedValue(storedUserRecord);

      // bcrypt.compare returns false - wrong password
      const bcrypt = await import('bcrypt');
      vi.mocked((bcrypt as any).default.compare).mockResolvedValueOnce(false);

      await expect(
        authService.login('user@test.com', 'WrongPassword999')
      ).rejects.toThrow('Incorrect password. Please try again.');
    });

    it('should return accessToken, refreshToken, and user data on successful login', async () => {
      const authenticatedUserRecord = {
        id: 'authenticated-user-uuid',
        email: 'valid@test.com',
        passwordHash: 'stored-bcrypt-hash',
        firstName: 'Valid',
        lastName: 'User',
        isEmailVerified: true,
        emailVerifyToken: null,
        resetPasswordToken: null,
        resetPasswordExpires: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaInstance.user.findUnique.mockResolvedValue(authenticatedUserRecord);
      // bcrypt.compare returns true - correct password
      const bcrypt = await import('bcrypt');
      vi.mocked((bcrypt as any).default.compare).mockResolvedValueOnce(true);

      const loginResponse = await authService.login('valid@test.com', 'CorrectPassword123');

      expect(loginResponse.accessToken).toBeDefined();
      expect(typeof loginResponse.accessToken).toBe('string');
      expect(loginResponse.refreshToken).toBeDefined();
      expect(typeof loginResponse.refreshToken).toBe('string');
      expect(loginResponse.user.id).toBe(authenticatedUserRecord.id);
      expect(loginResponse.user.email).toBe(authenticatedUserRecord.email);
      expect(loginResponse.user.firstName).toBe(authenticatedUserRecord.firstName);
      expect(loginResponse.user.isEmailVerified).toBe(true);
    });
  });

  //  verifyEmail 
  describe('verifyEmail', () => {
    it('should throw an error when the verification token does not match any user', async () => {
      mockPrismaInstance.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.verifyEmail('invalid-or-expired-token')
      ).rejects.toThrow('Invalid or expired verification token');
    });

    it('should mark email as verified and clear the token on success', async () => {
      const validEmailToken = jwt.sign(
        { userId: 'user-uuid-verify', email: 'verify@test.com' },
        process.env.JWT_SECRET!,
        { expiresIn: '24h' }
      );
      const userWithVerifyToken = {
        id: 'user-uuid-verify',
        email: 'verify@test.com',
        emailVerifyToken: validEmailToken,
        isEmailVerified: false,
      };

      mockPrismaInstance.user.findUnique.mockResolvedValue(userWithVerifyToken);
      mockPrismaInstance.user.update.mockResolvedValue({
        ...userWithVerifyToken,
        isEmailVerified: true,
        emailVerifyToken: null,
      });

      const verifyEmailResult = await authService.verifyEmail(validEmailToken);

      expect(verifyEmailResult.message).toContain('Email verified successfully');
      expect(mockPrismaInstance.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: userWithVerifyToken.id },
          data: expect.objectContaining({
            isEmailVerified: true,
            emailVerifyToken: null,
          }),
        })
      );
    });
  });

  //  requestPasswordReset 
  describe('requestPasswordReset', () => {
    it('should return a safe message even when email does not exist (prevents user enumeration)', async () => {
      mockPrismaInstance.user.findUnique.mockResolvedValue(null);

      const resetRequestResult = await authService.requestPasswordReset('ghost@test.com');

      expect(resetRequestResult.message).toContain('If that email exists');
    });

    it('should generate a reset token and update user record when email exists', async () => {
      const existingUserRecord = {
        id: 'user-uuid-reset',
        email: 'existing@test.com',
        passwordHash: 'some-hash',
        isEmailVerified: true,
        emailVerifyToken: null,
        resetPasswordToken: null,
        resetPasswordExpires: null,
        firstName: 'Reset',
        lastName: 'User',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaInstance.user.findUnique.mockResolvedValue(existingUserRecord);
      mockPrismaInstance.user.update.mockResolvedValue({ ...existingUserRecord, resetPasswordToken: 'some-token' });

      const resetRequestResult = await authService.requestPasswordReset('existing@test.com');

      expect(resetRequestResult.message).toContain('If that email exists');
      expect(mockPrismaInstance.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: existingUserRecord.id },
          data: expect.objectContaining({
            resetPasswordToken: expect.any(String),
            resetPasswordExpires: expect.any(Date),
          }),
        })
      );
    });
  });

  //  resetPassword 
  describe('resetPassword', () => {
    it('should throw an error when reset token is invalid or expired', async () => {
      mockPrismaInstance.user.findFirst.mockResolvedValue(null);

      await expect(
        authService.resetPassword('invalid-reset-token', 'NewPassword123')
      ).rejects.toThrow('Invalid or expired reset token');
    });

    it('should update password hash and clear reset token fields on successful reset', async () => {
      const validResetToken = jwt.sign(
        { userId: 'user-uuid-pw-reset', email: 'pwreset@test.com' },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' }
      );
      const userWithValidResetToken = {
        id: 'user-uuid-pw-reset',
        email: 'pwreset@test.com',
        passwordHash: 'old-password-hash',
        resetPasswordToken: validResetToken,
        resetPasswordExpires: new Date(Date.now() + 3600000),
      };

      mockPrismaInstance.user.findFirst.mockResolvedValue(userWithValidResetToken);
      mockPrismaInstance.user.update.mockResolvedValue({
        ...userWithValidResetToken,
        passwordHash: 'hashed-password-result',
        resetPasswordToken: null,
        resetPasswordExpires: null,
      });

      const resetResult = await authService.resetPassword(validResetToken, 'NewPassword123');

      expect(resetResult.message).toContain('Password reset successfully');
      expect(mockPrismaInstance.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: userWithValidResetToken.id },
          data: expect.objectContaining({
            passwordHash: 'hashed-password-result',
            resetPasswordToken: null,
            resetPasswordExpires: null,
          }),
        })
      );
    });
  });

  //  refreshAccessToken 
  describe('refreshAccessToken', () => {
    it('should throw "Invalid refresh token" when given an invalid refresh token string', async () => {
      await expect(
        authService.refreshAccessToken('not-a-valid-refresh-token')
      ).rejects.toThrow('Invalid refresh token');
    });

    it('should throw "User not found" when the user in the refresh token no longer exists in the database', async () => {
      const refreshTokenForDeletedUser = jwt.sign(
        { userId: 'deleted-user-uuid', email: 'deleted@test.com' },
        process.env.JWT_REFRESH_SECRET!,
        { expiresIn: '7d' }
      );

      mockPrismaInstance.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.refreshAccessToken(refreshTokenForDeletedUser)
      ).rejects.toThrow('User not found');
    });

    it('should return a new accessToken when refresh token is valid and user still exists', async () => {
      const validRefreshTokenPayload = { userId: 'active-user-uuid', email: 'active@test.com' };
      const validRefreshToken = jwt.sign(
        validRefreshTokenPayload,
        process.env.JWT_REFRESH_SECRET!,
        { expiresIn: '7d' }
      );

      const activeUserRecord = {
        id: 'active-user-uuid',
        email: 'active@test.com',
        passwordHash: 'hash',
        isEmailVerified: true,
        firstName: 'Active',
        lastName: 'User',
        emailVerifyToken: null,
        resetPasswordToken: null,
        resetPasswordExpires: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaInstance.user.findUnique.mockResolvedValue(activeUserRecord);

      const refreshResult = await authService.refreshAccessToken(validRefreshToken);

      expect(refreshResult.accessToken).toBeDefined();
      expect(typeof refreshResult.accessToken).toBe('string');
      expect(refreshResult.accessToken.split('.').length).toBe(3); // Valid JWT format
    });
  });
});
