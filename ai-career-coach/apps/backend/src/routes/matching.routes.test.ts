// apps/backend/src/routes/matching.routes.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// Mock the config/database module to avoid real DB connections
vi.mock('../config/database.js', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    cV: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), delete: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    userProfile: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), upsert: vi.fn() },
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

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

import { prisma } from '../config/database.js';
import matchingRoutes from './matching.routes.js';

function buildTestApp(): express.Application {
  const testApp = express();
  testApp.use(express.json());
  testApp.use('/api/matching', matchingRoutes);
  return testApp;
}

function generateTestAccessToken(userId: string, email: string): string {
  return jwt.sign({ userId, email }, process.env.JWT_SECRET!, { expiresIn: '1h' });
}

const authenticatedUserId = 'matching-test-user-uuid';
const authenticatedUserEmail = 'matching@example.com';

const mockUser = {
  id: authenticatedUserId,
  email: authenticatedUserEmail,
  isEmailVerified: true,
  firstName: 'Match',
  lastName: 'User',
  role: 'USER',
  isDisabled: false,
};

describe('Matching Routes - POST /api/matching/find-jobs', () => {
  let testApp: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    testApp = buildTestApp();
  });

  it('should return 401 when no authentication token is provided', async () => {
    const response = await request(testApp)
      .post('/api/matching/find-jobs')
      .send({});

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('should return 503 when MongoDB connection is not ready', async () => {
    const validAccessToken = generateTestAccessToken(authenticatedUserId, authenticatedUserEmail);

    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

    const mongoose = await import('mongoose');
    (mongoose.default.connection as any).readyState = 0;

    try {
      const response = await request(testApp)
        .post('/api/matching/find-jobs')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .send({ top_k: 10 });

      expect(response.status).toBe(503);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INTERNAL_ERROR');
    } finally {
      (mongoose.default.connection as any).readyState = 1;
    }
  });

  it('should return 404 when authenticated user has no uploaded CV', async () => {
    const validAccessToken = generateTestAccessToken(authenticatedUserId, authenticatedUserEmail);

    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

    const mongoose = await import('mongoose');
    const originalDb = (mongoose.default.connection as any).db;
    (mongoose.default.connection as any).readyState = 1;
    const mockCollection = {
      findOne: vi.fn().mockResolvedValue(null),
      find: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([]),
      }),
      countDocuments: vi.fn().mockResolvedValue(0),
    };
    (mongoose.default.connection as any).db = {
      collection: vi.fn().mockReturnValue(mockCollection),
    };

    try {
      const response = await request(testApp)
        .post('/api/matching/find-jobs')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .send({ top_k: 10 });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('NOT_FOUND');
    } finally {
      (mongoose.default.connection as any).db = originalDb;
    }
  });
});

describe('Matching Routes - GET /api/matching/diagnostics', () => {
  let testApp: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    testApp = buildTestApp();
  });

  it('should return 401 when no authentication token is provided', async () => {
    const response = await request(testApp)
      .get('/api/matching/diagnostics');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('should return 200 with diagnostics data for authenticated users', async () => {
    const validAccessToken = generateTestAccessToken(authenticatedUserId, authenticatedUserEmail);

    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

    const mongoose = await import('mongoose');
    (mongoose.default.connection as any).readyState = 1;
    (mongoose.default.connection as any).db = {
      collection: vi.fn().mockReturnValue({
        findOne: vi.fn().mockResolvedValue(null),
        countDocuments: vi.fn().mockResolvedValue(0),
      }),
    };

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ status: 'healthy' }),
    });

    const response = await request(testApp)
      .get('/api/matching/diagnostics')
      .set('Authorization', `Bearer ${validAccessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.checks).toBeDefined();
    expect(response.body.data.checks.mongodb).toBeDefined();
  });
});
