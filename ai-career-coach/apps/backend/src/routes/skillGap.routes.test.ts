import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

vi.mock('../config/database.js', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    $connect: vi.fn().mockResolvedValue(undefined),
    $disconnect: vi.fn().mockResolvedValue(undefined),
  },
  cache: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(true),
    del: vi.fn().mockResolvedValue(true),
  },
}));

const mockSkillGapServiceMethods = vi.hoisted(() => ({
  analyzeSkillGap: vi.fn(),
  getLearningPaths: vi.fn(),
  getLearningPathWithCourses: vi.fn(),
  updateLearningPathProgress: vi.fn(),
  updateCourseProgress: vi.fn(),
  getProgressSummary: vi.fn(),
}));

vi.mock('../services/skillGap.service.js', () => {
  class SkillGapServiceMock {
    analyzeSkillGap = mockSkillGapServiceMethods.analyzeSkillGap;
    getLearningPaths = mockSkillGapServiceMethods.getLearningPaths;
    getLearningPathWithCourses = mockSkillGapServiceMethods.getLearningPathWithCourses;
    updateLearningPathProgress = mockSkillGapServiceMethods.updateLearningPathProgress;
    updateCourseProgress = mockSkillGapServiceMethods.updateCourseProgress;
    getProgressSummary = mockSkillGapServiceMethods.getProgressSummary;
  }
  return { SkillGapService: SkillGapServiceMock };
});

import skillGapRoutes from './skillGap.routes.js';
import { prisma as mockDatabasePrisma } from '../config/database.js';
import { globalErrorHandler } from '../middlewares/error.middleware.js';

function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/skill-gap', skillGapRoutes);
  app.use(globalErrorHandler);
  return app;
}

function generateToken(userId: string, email: string) {
  return jwt.sign({ userId, email }, process.env.JWT_SECRET!, { expiresIn: '1h' });
}

const testUserId = 'skillgap-test-user-uuid';
const testUserEmail = 'skillgap@example.com';

function setupAuthenticatedUser() {
  (mockDatabasePrisma as any).user.findUnique.mockResolvedValue({
    id: testUserId,
    email: testUserEmail,
    isEmailVerified: true,
    firstName: 'Skill',
    lastName: 'User',
    role: 'USER',
    isDisabled: false,
  });
}

const validLearningPathId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const validCourseId = 'f9e8d7c6-b5a4-3210-fedc-ba9876543210';

describe('SkillGap Routes - POST /api/skill-gap/analyze', () => {
  let testApp: ReturnType<typeof buildTestApp>;
  let token: string;

  beforeEach(() => {
    vi.clearAllMocks();
    testApp = buildTestApp();
    token = generateToken(testUserId, testUserEmail);
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(testApp).post('/api/skill-gap/analyze').send({});
    expect(response.status).toBe(401);
  });

  it('should return 404 when user has no CV in MongoDB', async () => {
    setupAuthenticatedUser();
    const mongoose = await import('mongoose');
    (mongoose.default.connection as any).readyState = 1;
    (mongoose.default.connection as any).db = {
      collection: () => ({ findOne: vi.fn().mockResolvedValue(null) }),
    };

    const response = await request(testApp)
      .post('/api/skill-gap/analyze')
      .set('Authorization', `Bearer ${token}`)
      .send({ targetRole: 'Software Engineer' });

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('No CV found');

    (mongoose.default.connection as any).readyState = 0;
  });

  it('should return 200 with skill gap analysis when CV exists', async () => {
    setupAuthenticatedUser();
    const mongoose = await import('mongoose');
    (mongoose.default.connection as any).readyState = 1;
    (mongoose.default.connection as any).db = {
      collection: () => ({
        findOne: vi.fn().mockResolvedValue({
          skills: ['python', 'javascript'],
          experience: [],
          education: [],
          summary: 'Developer with 3 years of experience in various technologies',
          raw_text: 'Developer with 3 years of experience in various technologies and projects',
        }),
      }),
    };

    mockSkillGapServiceMethods.analyzeSkillGap.mockResolvedValue({
      missingSkills: ['typescript', 'react'],
      learningPath: { id: validLearningPathId, title: 'Frontend Path' },
    });

    const response = await request(testApp)
      .post('/api/skill-gap/analyze')
      .set('Authorization', `Bearer ${token}`)
      .send({ targetRole: 'Frontend Developer' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.missingSkills).toContain('typescript');

    (mongoose.default.connection as any).readyState = 0;
  });
});

describe('SkillGap Routes - GET /api/skill-gap/learning-paths', () => {
  let testApp: ReturnType<typeof buildTestApp>;
  let token: string;

  beforeEach(() => {
    vi.clearAllMocks();
    testApp = buildTestApp();
    token = generateToken(testUserId, testUserEmail);
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(testApp).get('/api/skill-gap/learning-paths');
    expect(response.status).toBe(401);
  });

  it('should return list of learning paths', async () => {
    setupAuthenticatedUser();
    mockSkillGapServiceMethods.getLearningPaths.mockResolvedValue([
      { id: validLearningPathId, title: 'Backend Path', progressPercentage: 25 },
    ]);

    const response = await request(testApp)
      .get('/api/skill-gap/learning-paths')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
  });
});

describe('SkillGap Routes - GET /api/skill-gap/learning-paths/:learningPathId', () => {
  let testApp: ReturnType<typeof buildTestApp>;
  let token: string;

  beforeEach(() => {
    vi.clearAllMocks();
    testApp = buildTestApp();
    token = generateToken(testUserId, testUserEmail);
  });

  it('should return 400 for invalid UUID format', async () => {
    setupAuthenticatedUser();
    const response = await request(testApp)
      .get('/api/skill-gap/learning-paths/not-a-uuid')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should return 404 when learning path is not found', async () => {
    setupAuthenticatedUser();
    mockSkillGapServiceMethods.getLearningPathWithCourses.mockResolvedValue(null);

    const response = await request(testApp)
      .get(`/api/skill-gap/learning-paths/${validLearningPathId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(404);
  });

  it('should return learning path details on success', async () => {
    setupAuthenticatedUser();
    mockSkillGapServiceMethods.getLearningPathWithCourses.mockResolvedValue({
      id: validLearningPathId,
      title: 'Backend Path',
      courses: [],
    });

    const response = await request(testApp)
      .get(`/api/skill-gap/learning-paths/${validLearningPathId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(validLearningPathId);
  });
});

describe('SkillGap Routes - PATCH /api/skill-gap/learning-paths/:learningPathId/progress', () => {
  let testApp: ReturnType<typeof buildTestApp>;
  let token: string;

  beforeEach(() => {
    vi.clearAllMocks();
    testApp = buildTestApp();
    token = generateToken(testUserId, testUserEmail);
  });

  it('should return 400 for missing progressPercentage', async () => {
    setupAuthenticatedUser();
    const response = await request(testApp)
      .patch(`/api/skill-gap/learning-paths/${validLearningPathId}/progress`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(response.status).toBe(400);
  });

  it('should return 200 on successful progress update', async () => {
    setupAuthenticatedUser();
    mockSkillGapServiceMethods.updateLearningPathProgress.mockResolvedValue({
      id: validLearningPathId,
      progressPercentage: 50,
    });

    const response = await request(testApp)
      .patch(`/api/skill-gap/learning-paths/${validLearningPathId}/progress`)
      .set('Authorization', `Bearer ${token}`)
      .send({ progressPercentage: 50 });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});

describe('SkillGap Routes - PATCH /api/skill-gap/courses/:courseId/progress', () => {
  let testApp: ReturnType<typeof buildTestApp>;
  let token: string;

  beforeEach(() => {
    vi.clearAllMocks();
    testApp = buildTestApp();
    token = generateToken(testUserId, testUserEmail);
  });

  it('should return 400 when progress or status is missing', async () => {
    setupAuthenticatedUser();
    const response = await request(testApp)
      .patch(`/api/skill-gap/courses/${validCourseId}/progress`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(response.status).toBe(400);
  });

  it('should return 200 on successful course progress update', async () => {
    setupAuthenticatedUser();
    mockSkillGapServiceMethods.updateCourseProgress.mockResolvedValue({
      id: validCourseId,
      progress: 75,
      status: 'in_progress',
    });

    const response = await request(testApp)
      .patch(`/api/skill-gap/courses/${validCourseId}/progress`)
      .set('Authorization', `Bearer ${token}`)
      .send({ progress: 75, status: 'in_progress' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});

describe('SkillGap Routes - GET /api/skill-gap/summary', () => {
  let testApp: ReturnType<typeof buildTestApp>;
  let token: string;

  beforeEach(() => {
    vi.clearAllMocks();
    testApp = buildTestApp();
    token = generateToken(testUserId, testUserEmail);
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(testApp).get('/api/skill-gap/summary');
    expect(response.status).toBe(401);
  });

  it('should return progress summary on success', async () => {
    setupAuthenticatedUser();
    mockSkillGapServiceMethods.getProgressSummary.mockResolvedValue({
      totalPaths: 2,
      completedPaths: 1,
      overallProgress: 50,
    });

    const response = await request(testApp)
      .get('/api/skill-gap/summary')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.totalPaths).toBe(2);
  });
});
