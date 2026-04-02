// apps/backend/src/services/auth.service.disabled.test.ts
//
// Tests for the isDisabled account check and role inclusion features
// added to AuthService.login(). Kept separate from the existing auth.service.test.ts.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { AuthService } from './auth.service.js';

const mockPrismaInstance = new PrismaClient() as any;

// Mock bcrypt to avoid slow hashing in tests
vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed-password-value'),
    compare: vi.fn().mockResolvedValue(true),
  },
}));

// Mock email utility to prevent actual email sending
vi.mock('../utils/email.util.js', () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
}));

//  Helpers 

function buildUserRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-uuid-auth-test',
    email: 'user@test.com',
    passwordHash: 'stored-bcrypt-hash',
    firstName: 'Test',
    lastName: 'User',
    isEmailVerified: true,
    role: 'USER',
    isDisabled: false,
    emailVerifyToken: null,
    resetPasswordToken: null,
    resetPasswordExpires: null,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

//  Tests 

describe('AuthService.login - disabled account and role features', () => {
  let authService: AuthService;

  beforeEach(async () => {
    vi.clearAllMocks();
    authService = new AuthService();

    // Re-apply default bcrypt mock implementations after clearAllMocks resets them
    const bcryptModule = await import('bcrypt');
    vi.mocked((bcryptModule as any).default.hash).mockResolvedValue('hashed-password-value');
    vi.mocked((bcryptModule as any).default.compare).mockResolvedValue(true);
  });

  it('should throw "Account is disabled" when the user account has isDisabled set to true', async () => {
    const disabledUserRecord = buildUserRecord({
      id: 'disabled-user-uuid',
      email: 'disabled@test.com',
      isDisabled: true,
    });

    // Password check passes - the disabled check fires after bcrypt
    mockPrismaInstance.user.findUnique.mockResolvedValue(disabledUserRecord);

    await expect(
      authService.login('disabled@test.com', 'CorrectPassword123')
    ).rejects.toThrow('Account is disabled');
  });

  it('should not update lastLoginAt when the account is disabled', async () => {
    const disabledUserRecord = buildUserRecord({
      id: 'disabled-no-login-update-uuid',
      email: 'banned@test.com',
      isDisabled: true,
    });

    mockPrismaInstance.user.findUnique.mockResolvedValue(disabledUserRecord);

    await expect(
      authService.login('banned@test.com', 'AnyPassword123')
    ).rejects.toThrow('Account is disabled');

    // user.update should NOT have been called since login is rejected
    expect(mockPrismaInstance.user.update).not.toHaveBeenCalled();
  });

  it('should include role in the login response when credentials are valid and account is active', async () => {
    const adminUserRecord = buildUserRecord({
      id: 'admin-login-uuid',
      email: 'admin@company.com',
      role: 'ADMIN',
      isDisabled: false,
    });

    mockPrismaInstance.user.findUnique.mockResolvedValue(adminUserRecord);
    mockPrismaInstance.user.update.mockResolvedValue(adminUserRecord);

    const loginResponse = await authService.login('admin@company.com', 'AdminPassword123');

    expect(loginResponse.user.role).toBe('ADMIN');
  });

  it('should include USER role in login response for a regular active user', async () => {
    const regularUserRecord = buildUserRecord({
      id: 'regular-login-uuid',
      email: 'regular@test.com',
      role: 'USER',
      isDisabled: false,
    });

    mockPrismaInstance.user.findUnique.mockResolvedValue(regularUserRecord);
    mockPrismaInstance.user.update.mockResolvedValue(regularUserRecord);

    const loginResponse = await authService.login('regular@test.com', 'RegularPassword123');

    expect(loginResponse.user.role).toBe('USER');
  });

  it('should update lastLoginAt for an active user on successful login', async () => {
    const activeUserRecord = buildUserRecord({
      id: 'active-last-login-uuid',
      email: 'active@test.com',
      isDisabled: false,
    });

    mockPrismaInstance.user.findUnique.mockResolvedValue(activeUserRecord);
    mockPrismaInstance.user.update.mockResolvedValue(activeUserRecord);

    await authService.login('active@test.com', 'CorrectPassword123');

    expect(mockPrismaInstance.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'active-last-login-uuid' },
        data: expect.objectContaining({
          lastLoginAt: expect.any(Date),
        }),
      })
    );
  });

  it('should return both accessToken and refreshToken on successful login for an active user', async () => {
    const activeUserRecord = buildUserRecord({
      id: 'token-return-uuid',
      email: 'tokens@test.com',
      isDisabled: false,
    });

    mockPrismaInstance.user.findUnique.mockResolvedValue(activeUserRecord);
    mockPrismaInstance.user.update.mockResolvedValue(activeUserRecord);

    const loginResponse = await authService.login('tokens@test.com', 'Password123');

    expect(loginResponse).toHaveProperty('accessToken');
    expect(loginResponse).toHaveProperty('refreshToken');
    expect(typeof loginResponse.accessToken).toBe('string');
    expect(loginResponse.accessToken.split('.').length).toBe(3); // Valid JWT structure
  });
});
