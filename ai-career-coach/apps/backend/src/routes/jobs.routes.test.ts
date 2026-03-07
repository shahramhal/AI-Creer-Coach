// apps/backend/src/routes/jobs.routes.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

// Mock global fetch to prevent real HTTP calls to job-api-service
const mockFetch = vi.fn();
global.fetch = mockFetch;

import jobRoutes from './jobs.routes.js';

const mockPrismaInstance = new PrismaClient() as any;

function buildTestApp(): express.Application {
  const testApp = express();
  testApp.use(express.json());
  testApp.use('/api/jobs', jobRoutes);
  return testApp;
}

function generateTestAccessToken(userId: string, email: string): string {
  return jwt.sign({ userId, email }, process.env.JWT_SECRET!, { expiresIn: '1h' });
}

const authenticatedUserId = 'jobs-test-user-uuid';
const authenticatedUserEmail = 'jobs@example.com';

function setupAuthenticatedUser() {
  mockPrismaInstance.user.findUnique.mockResolvedValue({
    id: authenticatedUserId,
    email: authenticatedUserEmail,
    isEmailVerified: true,
    firstName: 'Jobs',
    lastName: 'User',
  });
}

describe('Job Routes — GET /api/jobs/search', () => {
  let testApp: express.Application;
  let validAccessToken: string;

  beforeEach(() => {
    vi.clearAllMocks();
    testApp = buildTestApp();
    validAccessToken = generateTestAccessToken(authenticatedUserId, authenticatedUserEmail);
  });

  it('should return 401 when no authentication token is provided', async () => {
    const response = await request(testApp)
      .get('/api/jobs/search')
      .query({ keywords: 'Software Engineer', location: 'London' });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('should return 400 when keywords query parameter is missing', async () => {
    setupAuthenticatedUser();

    const response = await request(testApp)
      .get('/api/jobs/search')
      .set('Authorization', `Bearer ${validAccessToken}`)
      .query({ location: 'London' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Keywords and location are required');
  });

  it('should return 400 when location query parameter is missing', async () => {
    setupAuthenticatedUser();

    const response = await request(testApp)
      .get('/api/jobs/search')
      .set('Authorization', `Bearer ${validAccessToken}`)
      .query({ keywords: 'Software Engineer' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Keywords and location are required');
  });

  it('should return 200 with job results when job-api-service responds successfully', async () => {
    setupAuthenticatedUser();

    const mockJobApiResponse = {
      success: true,
      data: [
        { job_id: 'job-1', title: 'Software Engineer', company: 'Tech Corp', location: 'London' },
        { job_id: 'job-2', title: 'Backend Developer', company: 'StartupXYZ', location: 'Remote' },
      ],
    };

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(mockJobApiResponse),
    });

    const response = await request(testApp)
      .get('/api/jobs/search')
      .set('Authorization', `Bearer ${validAccessToken}`)
      .query({ keywords: 'Software Engineer', location: 'London' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
  });

  it('should return 500 when job-api-service is unreachable', async () => {
    setupAuthenticatedUser();

    mockFetch.mockRejectedValue(new Error('ECONNREFUSED - job api service not running'));

    const response = await request(testApp)
      .get('/api/jobs/search')
      .set('Authorization', `Bearer ${validAccessToken}`)
      .query({ keywords: 'Software Engineer', location: 'London' });

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
  });

  it('should propagate error status from job-api-service when it returns non-200', async () => {
    setupAuthenticatedUser();

    mockFetch.mockResolvedValue({
      ok: false,
      status: 503,
      json: vi.fn().mockResolvedValue({ message: 'Job API service is overloaded' }),
    });

    const response = await request(testApp)
      .get('/api/jobs/search')
      .set('Authorization', `Bearer ${validAccessToken}`)
      .query({ keywords: 'DevOps', location: 'Manchester' });

    expect(response.status).toBe(503);
    expect(response.body.success).toBe(false);
  });
});

describe('Job Routes — GET /api/jobs/stats', () => {
  let testApp: express.Application;
  let validAccessToken: string;

  beforeEach(() => {
    vi.clearAllMocks();
    testApp = buildTestApp();
    validAccessToken = generateTestAccessToken(authenticatedUserId, authenticatedUserEmail);
  });

  it('should return 401 when no authentication token is provided', async () => {
    const response = await request(testApp)
      .get('/api/jobs/stats');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('should return job statistics from job-api-service when authenticated', async () => {
    setupAuthenticatedUser();

    const mockStatsResponse = {
      success: true,
      data: {
        totalJobs: 1500,
        totalSources: 3,
        lastUpdated: '2026-02-17T00:00:00Z',
      },
    };

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(mockStatsResponse),
    });

    const response = await request(testApp)
      .get('/api/jobs/stats')
      .set('Authorization', `Bearer ${validAccessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toBeDefined();
  });

  it('should return 500 when job-api-service connection fails for stats endpoint', async () => {
    setupAuthenticatedUser();

    mockFetch.mockRejectedValue(new Error('Connection refused'));

    const response = await request(testApp)
      .get('/api/jobs/stats')
      .set('Authorization', `Bearer ${validAccessToken}`);

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
  });
});
