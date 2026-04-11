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

const mockDashboardMethods = vi.hoisted(() => ({
  getRecentActivity: vi.fn(),
}));

vi.mock('../services/dashboard.service.js', () => {
  class DashboardServiceMock {
    getRecentActivity = mockDashboardMethods.getRecentActivity;
  }
  return { DashboardService: DashboardServiceMock };
});

import dashboardRoutes from './dashboard.routes.js';
import { prisma as mockDatabasePrisma } from '../config/database.js';
import { globalErrorHandler } from '../middlewares/error.middleware.js';

function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/dashboard', dashboardRoutes);
  app.use(globalErrorHandler);
  return app;
}

function generateToken(userId: string, email: string) {
  return jwt.sign({ userId, email }, process.env.JWT_SECRET!, { expiresIn: '1h' });
}

const testUserId = 'dash-test-user-uuid';
const testUserEmail = 'dash@example.com';

function setupAuthenticatedUser() {
  (mockDatabasePrisma as any).user.findUnique.mockResolvedValue({
    id: testUserId,
    email: testUserEmail,
    isEmailVerified: true,
    firstName: 'Dash',
    lastName: 'User',
    role: 'USER',
    isDisabled: false,
  });
}

describe('Dashboard Routes - GET /api/dashboard/recent-activity', () => {
  let testApp: ReturnType<typeof buildTestApp>;
  let token: string;

  beforeEach(() => {
    vi.clearAllMocks();
    testApp = buildTestApp();
    token = generateToken(testUserId, testUserEmail);
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(testApp).get('/api/dashboard/recent-activity');
    expect(response.status).toBe(401);
  });

  it('should return recent activity list on success', async () => {
    setupAuthenticatedUser();
    mockDashboardMethods.getRecentActivity.mockResolvedValue([
      { id: 'act-1', type: 'CV_UPLOAD', title: 'Uploaded CV', description: 'CV added', timestamp: new Date().toISOString() },
    ]);

    const response = await request(testApp)
      .get('/api/dashboard/recent-activity')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
  });

  it('should pass limit query param to service', async () => {
    setupAuthenticatedUser();
    mockDashboardMethods.getRecentActivity.mockResolvedValue([]);

    await request(testApp)
      .get('/api/dashboard/recent-activity?limit=5')
      .set('Authorization', `Bearer ${token}`);

    expect(mockDashboardMethods.getRecentActivity).toHaveBeenCalledWith(testUserId, 5);
  });

  it('should cap limit at 50', async () => {
    setupAuthenticatedUser();
    mockDashboardMethods.getRecentActivity.mockResolvedValue([]);

    await request(testApp)
      .get('/api/dashboard/recent-activity?limit=100')
      .set('Authorization', `Bearer ${token}`);

    expect(mockDashboardMethods.getRecentActivity).toHaveBeenCalledWith(testUserId, 50);
  });

  it('should return 500 when service throws', async () => {
    setupAuthenticatedUser();
    mockDashboardMethods.getRecentActivity.mockRejectedValue(new Error('DB error'));

    const response = await request(testApp)
      .get('/api/dashboard/recent-activity')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
  });
});
