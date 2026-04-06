// apps/backend/src/routes/applications.routes.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

// Mock global fetch so ATS-related routes never hit real services
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock logUserActivity so fire-and-forget DB writes don't interfere
vi.mock('../utils/activity.util.js', () => ({
  logUserActivity: vi.fn(),
}));

import applicationRoutes from './applications.routes.js';

// Obtain the shared Prisma singleton created by the mock in test-setup.ts.
// application, userActivity, and $transaction are all registered there.
const mockPrismaInstance = new PrismaClient() as any;

function buildTestApp(): express.Application {
  const testApp = express();
  testApp.use(express.json());
  testApp.use('/api/applications', applicationRoutes);
  return testApp;
}

function generateTestAccessToken(userId: string, email: string): string {
  return jwt.sign({ userId, email }, process.env.JWT_SECRET!, { expiresIn: '1h' });
}

const authenticatedUserId = 'app-test-user-uuid-1234-567890abcdef';
const authenticatedUserEmail = 'apptracker@example.com';

function setupAuthenticatedUser() {
  mockPrismaInstance.user.findUnique.mockResolvedValue({
    id: authenticatedUserId,
    email: authenticatedUserEmail,
    isEmailVerified: true,
    firstName: 'App',
    lastName: 'Tracker',
    role: 'USER',
    isDisabled: false,
  });
}

const sampleApplication = {
  id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  userId: authenticatedUserId,
  company: 'Acme Corp',
  jobTitle: 'Software Engineer',
  status: 'applied',
  appliedDate: new Date().toISOString(),
  sourceUrl: null,
  location: null,
  notes: null,
  atsScore: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('POST /api/applications - Create Application', () => {
  let testApp: express.Application;
  let validAccessToken: string;

  beforeEach(() => {
    vi.clearAllMocks();
    // Restore application and transaction mocks after clearAllMocks wipes them
    mockPrismaInstance.application.findFirst.mockResolvedValue(null);
    mockPrismaInstance.application.create.mockResolvedValue(sampleApplication);
    mockPrismaInstance.application.findUnique.mockResolvedValue(null);
    mockPrismaInstance.application.findMany.mockResolvedValue([]);
    mockPrismaInstance.application.count.mockResolvedValue(0);
    mockPrismaInstance.application.groupBy.mockResolvedValue([]);
    mockPrismaInstance.application.update.mockResolvedValue(sampleApplication);
    mockPrismaInstance.application.delete.mockResolvedValue(sampleApplication);
    mockPrismaInstance.userActivity.create.mockResolvedValue({});

    // Default $transaction: when passed a callback, execute it with a tx proxy
    mockPrismaInstance.$transaction.mockImplementation(async (arg: any) => {
      if (typeof arg === 'function') {
        // Provide a minimal transaction proxy that mirrors the mocked models
        const txProxy = {
          application: mockPrismaInstance.application,
        };
        return arg(txProxy);
      }
      // Array form: resolve each promise
      return Promise.all(arg);
    });

    testApp = buildTestApp();
    validAccessToken = generateTestAccessToken(authenticatedUserId, authenticatedUserEmail);
  });

  it('should return 401 when no authorization header is provided', async () => {
    const response = await request(testApp)
      .post('/api/applications')
      .send({ company: 'Acme Corp', jobTitle: 'Developer' });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('should return 400 when company field is missing from the request body', async () => {
    setupAuthenticatedUser();

    const response = await request(testApp)
      .post('/api/applications')
      .set('Authorization', `Bearer ${validAccessToken}`)
      .send({ jobTitle: 'Software Engineer' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Company is required');
  });

  it('should return 400 when jobTitle field is missing from the request body', async () => {
    setupAuthenticatedUser();

    const response = await request(testApp)
      .post('/api/applications')
      .set('Authorization', `Bearer ${validAccessToken}`)
      .send({ company: 'Acme Corp' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Job title is required');
  });

  it('should return 400 when company is only whitespace', async () => {
    setupAuthenticatedUser();

    const response = await request(testApp)
      .post('/api/applications')
      .set('Authorization', `Bearer ${validAccessToken}`)
      .send({ company: '   ', jobTitle: 'Developer' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Company is required');
  });

  it('should return 400 when company exceeds 255 character limit', async () => {
    setupAuthenticatedUser();
    const oversizedCompanyName = 'A'.repeat(256);

    const response = await request(testApp)
      .post('/api/applications')
      .set('Authorization', `Bearer ${validAccessToken}`)
      .send({ company: oversizedCompanyName, jobTitle: 'Developer' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Company name must be under 255 characters');
  });

  it('should return 400 when jobTitle exceeds 255 character limit', async () => {
    setupAuthenticatedUser();
    const oversizedJobTitle = 'B'.repeat(256);

    const response = await request(testApp)
      .post('/api/applications')
      .set('Authorization', `Bearer ${validAccessToken}`)
      .send({ company: 'Acme Corp', jobTitle: oversizedJobTitle });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Job title must be under 255 characters');
  });

  it('should return 400 when notes exceed 5000 character limit', async () => {
    setupAuthenticatedUser();
    const oversizedNotes = 'X'.repeat(5001);

    const response = await request(testApp)
      .post('/api/applications')
      .set('Authorization', `Bearer ${validAccessToken}`)
      .send({ company: 'Acme Corp', jobTitle: 'Developer', notes: oversizedNotes });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Notes must be under 5000 characters');
  });

  it('should return 409 when user already has an application for the same company and title', async () => {
    setupAuthenticatedUser();
    // Transaction callback returns null to indicate duplicate found
    mockPrismaInstance.$transaction.mockImplementation(async (arg: any) => {
      if (typeof arg === 'function') {
        const txProxy = { application: { ...mockPrismaInstance.application, findFirst: vi.fn().mockResolvedValue(sampleApplication) } };
        return arg(txProxy);
      }
      return Promise.all(arg);
    });

    const response = await request(testApp)
      .post('/api/applications')
      .set('Authorization', `Bearer ${validAccessToken}`)
      .send({ company: 'Acme Corp', jobTitle: 'Software Engineer' });

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('You have already tracked an application for this position');
  });

  it('should return 201 with created application data on successful creation', async () => {
    setupAuthenticatedUser();

    const response = await request(testApp)
      .post('/api/applications')
      .set('Authorization', `Bearer ${validAccessToken}`)
      .send({
        company: 'Acme Corp',
        jobTitle: 'Software Engineer',
        location: 'London',
        sourceUrl: 'https://example.com/job/123',
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Application tracked successfully');
    expect(response.body.data).toBeDefined();
    expect(response.body.data.company).toBe('Acme Corp');
  });

  it('should accept notes at exactly the 5000 character boundary', async () => {
    setupAuthenticatedUser();
    const maxNotes = 'N'.repeat(5000);

    const response = await request(testApp)
      .post('/api/applications')
      .set('Authorization', `Bearer ${validAccessToken}`)
      .send({ company: 'Acme Corp', jobTitle: 'Developer', notes: maxNotes });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });
});

describe('GET /api/applications - List Applications', () => {
  let testApp: express.Application;
  let validAccessToken: string;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrismaInstance.application.findFirst.mockResolvedValue(null);
    mockPrismaInstance.application.create.mockResolvedValue(sampleApplication);
    mockPrismaInstance.application.findUnique.mockResolvedValue(null);
    mockPrismaInstance.application.findMany.mockResolvedValue([sampleApplication]);
    mockPrismaInstance.application.count.mockResolvedValue(1);
    mockPrismaInstance.application.groupBy.mockResolvedValue([]);
    mockPrismaInstance.application.update.mockResolvedValue(sampleApplication);
    mockPrismaInstance.application.delete.mockResolvedValue(sampleApplication);
    mockPrismaInstance.userActivity.create.mockResolvedValue({});
    mockPrismaInstance.$transaction.mockImplementation(async (arg: any) => {
      if (typeof arg === 'function') {
        return arg({ application: mockPrismaInstance.application });
      }
      return Promise.all(arg);
    });

    testApp = buildTestApp();
    validAccessToken = generateTestAccessToken(authenticatedUserId, authenticatedUserEmail);
  });

  it('should return 401 when no authorization header is provided', async () => {
    const response = await request(testApp).get('/api/applications');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('should return 200 with paginated applications list when authenticated', async () => {
    setupAuthenticatedUser();

    const response = await request(testApp)
      .get('/api/applications')
      .set('Authorization', `Bearer ${validAccessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.meta).toBeDefined();
    expect(response.body.meta.page).toBe(1);
    expect(response.body.meta.limit).toBe(50);
  });

  it('should return only applications with specified status when status filter is provided', async () => {
    setupAuthenticatedUser();
    const interviewApplication = { ...sampleApplication, status: 'interview' };
    mockPrismaInstance.$transaction.mockResolvedValue([[interviewApplication], 1]);

    const response = await request(testApp)
      .get('/api/applications')
      .set('Authorization', `Bearer ${validAccessToken}`)
      .query({ status: 'interview' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('should ignore invalid status filter values and return all applications', async () => {
    setupAuthenticatedUser();
    mockPrismaInstance.$transaction.mockResolvedValue([[sampleApplication], 1]);

    const response = await request(testApp)
      .get('/api/applications')
      .set('Authorization', `Bearer ${validAccessToken}`)
      .query({ status: 'invalid-status-value' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('should return correct pagination meta when page and limit query params are provided', async () => {
    setupAuthenticatedUser();
    mockPrismaInstance.$transaction.mockResolvedValue([[sampleApplication], 10]);

    const response = await request(testApp)
      .get('/api/applications')
      .set('Authorization', `Bearer ${validAccessToken}`)
      .query({ page: '2', limit: '5' });

    expect(response.status).toBe(200);
    expect(response.body.meta.page).toBe(2);
    expect(response.body.meta.limit).toBe(5);
  });
});

describe('GET /api/applications/stats - Application Statistics', () => {
  let testApp: express.Application;
  let validAccessToken: string;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrismaInstance.application.findFirst.mockResolvedValue(null);
    mockPrismaInstance.application.create.mockResolvedValue(sampleApplication);
    mockPrismaInstance.application.findUnique.mockResolvedValue(null);
    mockPrismaInstance.application.findMany.mockResolvedValue([]);
    mockPrismaInstance.application.count.mockResolvedValue(0);
    mockPrismaInstance.application.groupBy.mockResolvedValue([]);
    mockPrismaInstance.application.update.mockResolvedValue(sampleApplication);
    mockPrismaInstance.application.delete.mockResolvedValue(sampleApplication);
    mockPrismaInstance.userActivity.create.mockResolvedValue({});
    mockPrismaInstance.$transaction.mockImplementation(async (arg: any) => {
      if (typeof arg === 'function') {
        return arg({ application: mockPrismaInstance.application });
      }
      return Promise.all(arg);
    });

    testApp = buildTestApp();
    validAccessToken = generateTestAccessToken(authenticatedUserId, authenticatedUserEmail);
  });

  it('should return 401 when no authorization header is provided', async () => {
    const response = await request(testApp).get('/api/applications/stats');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('should return zero stats with 0% response rate when user has no applications', async () => {
    setupAuthenticatedUser();
    mockPrismaInstance.application.groupBy.mockResolvedValue([]);

    const response = await request(testApp)
      .get('/api/applications/stats')
      .set('Authorization', `Bearer ${validAccessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.total).toBe(0);
    expect(response.body.data.responseRate).toBe(0);
    expect(response.body.data.byStatus.applied).toBe(0);
    expect(response.body.data.byStatus.interview).toBe(0);
    expect(response.body.data.byStatus.offer).toBe(0);
    expect(response.body.data.byStatus.rejected).toBe(0);
  });

  it('should correctly calculate response rate from interview and offer counts', async () => {
    setupAuthenticatedUser();
    mockPrismaInstance.application.groupBy.mockResolvedValue([
      { status: 'applied', _count: { status: 8 } },
      { status: 'interview', _count: { status: 1 } },
      { status: 'offer', _count: { status: 1 } },
    ]);

    const response = await request(testApp)
      .get('/api/applications/stats')
      .set('Authorization', `Bearer ${validAccessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.total).toBe(10);
    expect(response.body.data.byStatus.applied).toBe(8);
    expect(response.body.data.byStatus.interview).toBe(1);
    expect(response.body.data.byStatus.offer).toBe(1);
    // (1 interview + 1 offer) / 10 total = 20%
    expect(response.body.data.responseRate).toBe(20);
  });

  it('should return 100% response rate when every application reached interview or offer', async () => {
    setupAuthenticatedUser();
    mockPrismaInstance.application.groupBy.mockResolvedValue([
      { status: 'interview', _count: { status: 3 } },
      { status: 'offer', _count: { status: 2 } },
    ]);

    const response = await request(testApp)
      .get('/api/applications/stats')
      .set('Authorization', `Bearer ${validAccessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.total).toBe(5);
    expect(response.body.data.responseRate).toBe(100);
  });
});

describe('PATCH /api/applications/:id/status - Update Application Status', () => {
  let testApp: express.Application;
  let validAccessToken: string;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrismaInstance.application.findFirst.mockResolvedValue(null);
    mockPrismaInstance.application.create.mockResolvedValue(sampleApplication);
    mockPrismaInstance.application.findUnique.mockResolvedValue(sampleApplication);
    mockPrismaInstance.application.findMany.mockResolvedValue([]);
    mockPrismaInstance.application.count.mockResolvedValue(0);
    mockPrismaInstance.application.groupBy.mockResolvedValue([]);
    mockPrismaInstance.application.update.mockResolvedValue({ ...sampleApplication, status: 'interview' });
    mockPrismaInstance.application.delete.mockResolvedValue(sampleApplication);
    mockPrismaInstance.userActivity.create.mockResolvedValue({});
    mockPrismaInstance.$transaction.mockImplementation(async (arg: any) => {
      if (typeof arg === 'function') {
        return arg({ application: mockPrismaInstance.application });
      }
      return Promise.all(arg);
    });

    testApp = buildTestApp();
    validAccessToken = generateTestAccessToken(authenticatedUserId, authenticatedUserEmail);
  });

  it('should return 401 when no authorization header is provided', async () => {
    const response = await request(testApp)
      .patch(`/api/applications/${sampleApplication.id}/status`)
      .send({ status: 'interview' });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('should return 404 when the application ID is not a valid UUID format', async () => {
    setupAuthenticatedUser();

    const response = await request(testApp)
      .patch('/api/applications/not-a-valid-uuid/status')
      .set('Authorization', `Bearer ${validAccessToken}`)
      .send({ status: 'interview' });

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Application not found');
  });

  it('should return 400 when status value is not one of the allowed statuses', async () => {
    setupAuthenticatedUser();

    const response = await request(testApp)
      .patch(`/api/applications/${sampleApplication.id}/status`)
      .set('Authorization', `Bearer ${validAccessToken}`)
      .send({ status: 'pending' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('applied');
    expect(response.body.message).toContain('interview');
  });

  it('should return 400 when status field is missing from the request body', async () => {
    setupAuthenticatedUser();

    const response = await request(testApp)
      .patch(`/api/applications/${sampleApplication.id}/status`)
      .set('Authorization', `Bearer ${validAccessToken}`)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should return 404 when the application belongs to a different user', async () => {
    setupAuthenticatedUser();
    const differentUserApplication = { ...sampleApplication, userId: 'eeeeeeee-eeee-eeee-eeee-000000000001' };
    mockPrismaInstance.application.findUnique.mockResolvedValue(differentUserApplication);

    const response = await request(testApp)
      .patch(`/api/applications/${sampleApplication.id}/status`)
      .set('Authorization', `Bearer ${validAccessToken}`)
      .send({ status: 'interview' });

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Application not found');
  });

  it('should return 404 when the application does not exist in the database', async () => {
    setupAuthenticatedUser();
    mockPrismaInstance.application.findUnique.mockResolvedValue(null);

    const response = await request(testApp)
      .patch(`/api/applications/${sampleApplication.id}/status`)
      .set('Authorization', `Bearer ${validAccessToken}`)
      .send({ status: 'interview' });

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });

  it('should return 200 with updated application when status change is valid', async () => {
    setupAuthenticatedUser();

    const response = await request(testApp)
      .patch(`/api/applications/${sampleApplication.id}/status`)
      .set('Authorization', `Bearer ${validAccessToken}`)
      .send({ status: 'interview' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Application status updated');
    expect(response.body.data).toBeDefined();
  });

  it('should accept all four valid status values without error', async () => {
    setupAuthenticatedUser();

    const validStatuses = ['applied', 'interview', 'offer', 'rejected'];
    for (const status of validStatuses) {
      mockPrismaInstance.application.update.mockResolvedValue({ ...sampleApplication, status });
      const response = await request(testApp)
        .patch(`/api/applications/${sampleApplication.id}/status`)
        .set('Authorization', `Bearer ${validAccessToken}`)
        .send({ status });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    }
  });
});

describe('DELETE /api/applications/:id - Delete Application', () => {
  let testApp: express.Application;
  let validAccessToken: string;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrismaInstance.application.findFirst.mockResolvedValue(null);
    mockPrismaInstance.application.create.mockResolvedValue(sampleApplication);
    mockPrismaInstance.application.findUnique.mockResolvedValue(sampleApplication);
    mockPrismaInstance.application.findMany.mockResolvedValue([]);
    mockPrismaInstance.application.count.mockResolvedValue(0);
    mockPrismaInstance.application.groupBy.mockResolvedValue([]);
    mockPrismaInstance.application.update.mockResolvedValue(sampleApplication);
    mockPrismaInstance.application.delete.mockResolvedValue(sampleApplication);
    mockPrismaInstance.userActivity.create.mockResolvedValue({});
    mockPrismaInstance.$transaction.mockImplementation(async (arg: any) => {
      if (typeof arg === 'function') {
        return arg({ application: mockPrismaInstance.application });
      }
      return Promise.all(arg);
    });

    testApp = buildTestApp();
    validAccessToken = generateTestAccessToken(authenticatedUserId, authenticatedUserEmail);
  });

  it('should return 401 when no authorization header is provided', async () => {
    const response = await request(testApp).delete(`/api/applications/${sampleApplication.id}`);

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('should return 404 when the application ID is not a valid UUID format', async () => {
    setupAuthenticatedUser();

    const response = await request(testApp)
      .delete('/api/applications/not-a-uuid-at-all')
      .set('Authorization', `Bearer ${validAccessToken}`);

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Application not found');
  });

  it('should return 404 when the application belongs to a different user', async () => {
    setupAuthenticatedUser();
    mockPrismaInstance.application.findUnique.mockResolvedValue({
      ...sampleApplication,
      userId: 'ffffffff-ffff-ffff-ffff-000000000000',
    });

    const response = await request(testApp)
      .delete(`/api/applications/${sampleApplication.id}`)
      .set('Authorization', `Bearer ${validAccessToken}`);

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Application not found');
  });

  it('should return 404 when the application does not exist in the database', async () => {
    setupAuthenticatedUser();
    mockPrismaInstance.application.findUnique.mockResolvedValue(null);

    const response = await request(testApp)
      .delete(`/api/applications/${sampleApplication.id}`)
      .set('Authorization', `Bearer ${validAccessToken}`);

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });

  it('should return 200 with success message when deletion succeeds', async () => {
    setupAuthenticatedUser();

    const response = await request(testApp)
      .delete(`/api/applications/${sampleApplication.id}`)
      .set('Authorization', `Bearer ${validAccessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Application deleted');
  });
});
