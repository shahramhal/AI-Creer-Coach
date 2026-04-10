// apps/backend/src/routes/auth.routes.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';

// Bypass rate limiters so tests never hit 429
vi.mock('express-rate-limit', () => ({
  default: vi.fn().mockReturnValue((_req: any, _res: any, next: any) => next()),
  rateLimit: vi.fn().mockReturnValue((_req: any, _res: any, next: any) => next()),
}));

// vi.mock is hoisted - the factory runs before any variable declarations.
// We use vi.hoisted() to create mocks that are available inside the factory.
// IMPORTANT: Never replace these references (no Object.assign). vi.clearAllMocks()
// resets implementation/state in-place, so the class instances still point to the
// same vi.fn() objects. Per-test behavior is set via .mockResolvedValue() etc.
const mockAuthServiceMethods = vi.hoisted(() => ({
  register: vi.fn(),
  login: vi.fn(),
  verifyEmail: vi.fn(),
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
  refreshAccessToken: vi.fn(),
}));

// Mock the auth service before importing routes.
// Must use a class constructor (not arrow function) so `new AuthService()` works.
// The instance properties capture the hoisted vi.fn() references at construction time.
vi.mock('../services/auth.service.js', () => {
  class AuthServiceMock {
    register = mockAuthServiceMethods.register;
    login = mockAuthServiceMethods.login;
    verifyEmail = mockAuthServiceMethods.verifyEmail;
    requestPasswordReset = mockAuthServiceMethods.requestPasswordReset;
    resetPassword = mockAuthServiceMethods.resetPassword;
    refreshAccessToken = mockAuthServiceMethods.refreshAccessToken;
  }
  return { AuthService: AuthServiceMock };
});

import authRoutes from './auth.routes.js';
import { PrismaClient } from '@prisma/client';
import { AppError, ErrorCodes } from '../utils/app-error.util.js';
import { globalErrorHandler } from '../middlewares/error.middleware.js';

// Get the mocked Prisma instance (used by authenticate middleware)
const mockPrismaInstance = new PrismaClient() as any;

// Build the test Express app
function buildTestApp(): express.Application {
  const testApp = express();
  testApp.use(express.json());
  testApp.use(cookieParser());
  testApp.use('/api/auth', authRoutes);
  testApp.use(globalErrorHandler);
  return testApp;
}

// Helper to generate a valid access token for protected routes
function generateTestAccessToken(userId: string, email: string): string {
  return jwt.sign({ userId, email }, process.env.JWT_SECRET!, { expiresIn: '1h' });
}

describe('Auth Routes - POST /api/auth/register', () => {
  let testApp: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    testApp = buildTestApp();
  });

  it('should return 400 when request body is missing required email field', async () => {
    const response = await request(testApp)
      .post('/api/auth/register')
      .send({ password: 'ValidPass123' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should return 400 when password does not meet complexity requirements', async () => {
    const response = await request(testApp)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'weak',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should return 409 when email is already registered', async () => {
    mockAuthServiceMethods.register.mockRejectedValue(
      new AppError('User already exists with this email', 409, ErrorCodes.EMAIL_ALREADY_EXISTS)
    );

    const response = await request(testApp)
      .post('/api/auth/register')
      .send({
        email: 'taken@example.com',
        password: 'ValidPass123',
      });

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
  });

  it('should return 201 with user data on successful registration', async () => {
    mockAuthServiceMethods.register.mockResolvedValue({
      id: 'new-user-uuid',
      email: 'newuser@example.com',
      message: 'Registration successful. Please check your email to verify your account.',
    });

    const response = await request(testApp)
      .post('/api/auth/register')
      .send({
        email: 'newuser@example.com',
        password: 'ValidPass123',
        firstName: 'New',
        lastName: 'User',
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.email).toBe('newuser@example.com');
  });
});

describe('Auth Routes - POST /api/auth/login', () => {
  let testApp: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    testApp = buildTestApp();
  });

  it('should return 400 when email field is missing from login request', async () => {
    const response = await request(testApp)
      .post('/api/auth/login')
      .send({ password: 'anyPassword' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should return 401 when credentials are invalid', async () => {
    mockAuthServiceMethods.login.mockRejectedValue(
      new AppError('Invalid credentials', 401, ErrorCodes.INVALID_CREDENTIALS)
    );

    const response = await request(testApp)
      .post('/api/auth/login')
      .send({
        email: 'wrong@example.com',
        password: 'WrongPassword1',
      });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('should return 200 with access token and set refreshToken cookie on successful login', async () => {
    mockAuthServiceMethods.login.mockResolvedValue({
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      user: {
        id: 'user-uuid',
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        isEmailVerified: true,
      },
    });

    const response = await request(testApp)
      .post('/api/auth/login')
      .send({
        email: 'user@example.com',
        password: 'ValidPass123',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.accessToken).toBe('mock-access-token');
    expect(response.body.data.user.email).toBe('user@example.com');
    // Refresh token should be set as a cookie
    expect(response.headers['set-cookie']).toBeDefined();
  });
});

describe('Auth Routes - GET /api/auth/verify-email', () => {
  let testApp: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    testApp = buildTestApp();
  });

  it('should return 400 when verification token query parameter is missing', async () => {
    const response = await request(testApp).get('/api/auth/verify-email');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Verification token is required');
  });

  it('should return 200 with success message when email verification token is valid', async () => {
    mockAuthServiceMethods.verifyEmail.mockResolvedValue({
      message: 'Email verified successfully',
    });

    const response = await request(testApp)
      .get('/api/auth/verify-email')
      .query({ token: 'valid-verify-token' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('should return 400 when the verification token is invalid or expired', async () => {
    mockAuthServiceMethods.verifyEmail.mockRejectedValue(
      new AppError('Invalid or expired verification token', 400, ErrorCodes.TOKEN_INVALID)
    );

    const response = await request(testApp)
      .get('/api/auth/verify-email')
      .query({ token: 'expired-bad-token' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});

describe('Auth Routes - POST /api/auth/forgot-password', () => {
  let testApp: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    testApp = buildTestApp();
  });

  it('should return 400 when email field is missing from the request body', async () => {
    const response = await request(testApp)
      .post('/api/auth/forgot-password')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should return 200 with a safe message regardless of whether email exists', async () => {
    mockAuthServiceMethods.requestPasswordReset.mockResolvedValue({
      message: 'If that email exists, a reset link has been sent',
    });

    const response = await request(testApp)
      .post('/api/auth/forgot-password')
      .send({ email: 'anyemail@example.com' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});

describe('Auth Routes - POST /api/auth/refresh', () => {
  let testApp: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    testApp = buildTestApp();
  });

  it('should return 401 when no refreshToken cookie is present', async () => {
    const response = await request(testApp).post('/api/auth/refresh');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Refresh token not found');
  });

  it('should return 401 when the refresh token is invalid', async () => {
    mockAuthServiceMethods.refreshAccessToken.mockRejectedValue(
      new AppError('Invalid refresh token', 401, ErrorCodes.TOKEN_INVALID)
    );

    const response = await request(testApp)
      .post('/api/auth/refresh')
      .set('Cookie', 'refreshToken=invalid-token-value');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('should return 200 with a new access token when refresh token is valid', async () => {
    mockAuthServiceMethods.refreshAccessToken.mockResolvedValue({
      accessToken: 'brand-new-access-token',
    });

    const response = await request(testApp)
      .post('/api/auth/refresh')
      .set('Cookie', 'refreshToken=valid-refresh-token-value');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.accessToken).toBe('brand-new-access-token');
  });
});

describe('Auth Routes - POST /api/auth/logout', () => {
  let testApp: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    testApp = buildTestApp();
  });

  it('should return 401 when no authentication token is provided', async () => {
    const response = await request(testApp).post('/api/auth/logout');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('should return 200 and clear the refreshToken cookie when authenticated user logs out', async () => {
    const validAccessToken = generateTestAccessToken('user-uuid-logout', 'user@example.com');

    // Mock user found by authenticate middleware
    mockPrismaInstance.user.findUnique.mockResolvedValue({
      id: 'user-uuid-logout',
      email: 'user@example.com',
      isEmailVerified: true,
      firstName: 'John',
      lastName: 'Doe',
    });

    const response = await request(testApp)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${validAccessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Logged out successfully');
  });
});

describe('Auth Routes - GET /api/auth/me', () => {
  let testApp: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    testApp = buildTestApp();
  });

  it('should return 401 when no authorization token is provided', async () => {
    const response = await request(testApp).get('/api/auth/me');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('should return 200 with current user data when authentication token is valid', async () => {
    const currentUserId = 'me-endpoint-user-uuid';
    const currentUserEmail = 'me@example.com';
    const validAccessToken = generateTestAccessToken(currentUserId, currentUserEmail);

    const currentUserRecord = {
      id: currentUserId,
      email: currentUserEmail,
      isEmailVerified: true,
      firstName: 'Current',
      lastName: 'User',
    };

    mockPrismaInstance.user.findUnique.mockResolvedValue(currentUserRecord);

    const response = await request(testApp)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${validAccessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.id).toBe(currentUserId);
    expect(response.body.data.user.email).toBe(currentUserEmail);
  });
});
