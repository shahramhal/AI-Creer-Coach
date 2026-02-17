// apps/backend/src/routes/salary.routes.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

// Mock the config/database module
vi.mock('../config/database.js', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    userProfile: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    $connect: vi.fn().mockResolvedValue(undefined),
    $disconnect: vi.fn().mockResolvedValue(undefined),
  },
  cache: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(true),
    del: vi.fn().mockResolvedValue(true),
    delByPattern: vi.fn().mockResolvedValue(0),
  },
}));

// Mock global fetch to prevent real Adzuna API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

import salaryRoutes from './salary.routes.js';
import { cache as mockCache, prisma as mockDatabasePrisma } from '../config/database.js';

const mockPrismaInstance = new PrismaClient() as any;

function buildTestApp(): express.Application {
  const testApp = express();
  testApp.use(express.json());
  testApp.use('/api/salary', salaryRoutes);
  return testApp;
}

function generateTestAccessToken(userId: string, email: string): string {
  return jwt.sign({ userId, email }, process.env.JWT_SECRET!, { expiresIn: '1h' });
}

const authenticatedUserId = 'salary-test-user-uuid';
const authenticatedUserEmail = 'salary@example.com';

function setupAuthenticatedUser() {
  mockPrismaInstance.user.findUnique.mockResolvedValue({
    id: authenticatedUserId,
    email: authenticatedUserEmail,
    isEmailVerified: true,
    firstName: 'Salary',
    lastName: 'User',
  });
}

describe('Salary Routes — GET /api/salary/insights', () => {
  let testApp: express.Application;
  let validAccessToken: string;

  beforeEach(() => {
    vi.clearAllMocks();
    testApp = buildTestApp();
    validAccessToken = generateTestAccessToken(authenticatedUserId, authenticatedUserEmail);
    // Re-apply cache mock implementations after clearAllMocks
    vi.mocked(mockCache.get).mockResolvedValue(null);
    vi.mocked(mockCache.set).mockResolvedValue(true as any);
    vi.mocked(mockCache.del).mockResolvedValue(true as any);
    vi.mocked(mockCache.delByPattern).mockResolvedValue(0 as any);
  });

  it('should return 401 when no authentication token is provided', async () => {
    const response = await request(testApp)
      .get('/api/salary/insights')
      .query({ jobTitle: 'Software Engineer' });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('should return 400 when jobTitle query parameter is missing', async () => {
    setupAuthenticatedUser();

    const response = await request(testApp)
      .get('/api/salary/insights')
      .set('Authorization', `Bearer ${validAccessToken}`)
      .query({ location: 'London', country: 'gb' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Job title is required');
  });

  it('should return 404 when Adzuna returns no salary data for the given job title', async () => {
    setupAuthenticatedUser();

    // Adzuna returns empty histogram — no salary data available
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ histogram: {}, month: {} }),
    });

    const mongoose = await import('mongoose');
    (mongoose.default.connection as any).readyState = 0; // MongoDB disconnected

    try {
      const response = await request(testApp)
        .get('/api/salary/insights')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .query({ jobTitle: 'Software Engineer', country: 'gb' });

      // 404 because baseSalary is 0 after fallback also fails
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    } finally {
      (mongoose.default.connection as any).readyState = 1;
    }
  });
});

describe('Salary Routes — PATCH /api/salary/preferences', () => {
  let testApp: express.Application;
  let validAccessToken: string;

  beforeEach(() => {
    vi.clearAllMocks();
    testApp = buildTestApp();
    validAccessToken = generateTestAccessToken(authenticatedUserId, authenticatedUserEmail);
    // Re-apply cache mock implementations after clearAllMocks
    vi.mocked(mockCache.get).mockResolvedValue(null);
    vi.mocked(mockCache.set).mockResolvedValue(true as any);
    vi.mocked(mockCache.del).mockResolvedValue(true as any);
    vi.mocked(mockCache.delByPattern).mockResolvedValue(0 as any);
  });

  it('should return 401 when no authentication token is provided', async () => {
    const response = await request(testApp)
      .patch('/api/salary/preferences')
      .send({ jobTitle: 'Engineer' });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('should return 400 when no preference fields are provided in request body', async () => {
    setupAuthenticatedUser();

    const response = await request(testApp)
      .patch('/api/salary/preferences')
      .set('Authorization', `Bearer ${validAccessToken}`)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('No preferences to update');
  });

  it('should return 200 when jobTitle preference is successfully updated', async () => {
    setupAuthenticatedUser();

    vi.mocked(mockDatabasePrisma.userProfile.upsert).mockResolvedValue({
      id: 'profile-uuid',
      userId: authenticatedUserId,
      jobTitle: 'Senior Software Engineer',
      location: 'London',
      updatedAt: new Date(),
    } as any);

    const response = await request(testApp)
      .patch('/api/salary/preferences')
      .set('Authorization', `Bearer ${validAccessToken}`)
      .send({ jobTitle: 'Senior Software Engineer' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Preferences updated');
  });

  it('should return 200 when location preference is updated independently', async () => {
    setupAuthenticatedUser();

    vi.mocked(mockDatabasePrisma.userProfile.upsert).mockResolvedValue({
      id: 'profile-uuid',
      userId: authenticatedUserId,
      jobTitle: null,
      location: 'Manchester',
      updatedAt: new Date(),
    } as any);

    const response = await request(testApp)
      .patch('/api/salary/preferences')
      .set('Authorization', `Bearer ${validAccessToken}`)
      .send({ location: 'Manchester' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
