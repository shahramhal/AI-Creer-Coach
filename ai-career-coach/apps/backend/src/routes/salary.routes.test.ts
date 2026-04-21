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
import { globalErrorHandler } from '../middlewares/error.middleware.js';

const mockPrismaInstance = new PrismaClient() as any;

function buildTestApp(): express.Application {
  const testApp = express();
  testApp.use(express.json());
  testApp.use('/api/salary', salaryRoutes);
  testApp.use(globalErrorHandler);
  return testApp;
}

function generateTestAccessToken(userId: string, email: string): string {
  return jwt.sign({ userId, email }, process.env.JWT_SECRET!, { expiresIn: '1h' });
}

const authenticatedUserId = 'salary-test-user-uuid';
const authenticatedUserEmail = 'salary@example.com';

function setupAuthenticatedUser() {
  (mockDatabasePrisma as any).user.findUnique.mockResolvedValue({
    id: authenticatedUserId,
    email: authenticatedUserEmail,
    isEmailVerified: true,
    firstName: 'Salary',
    lastName: 'User',
    role: 'USER',
    isDisabled: false,
  });
}

// Helper: create a mock histogram with realistic salary distribution
function createMockHistogram(medianSalary: number): Record<string, number> {
  const spread = medianSalary * 0.3;
  return {
    [String(Math.round(medianSalary - spread))]: 20,
    [String(Math.round(medianSalary - spread / 2))]: 40,
    [String(Math.round(medianSalary))]: 60,
    [String(Math.round(medianSalary + spread / 2))]: 35,
    [String(Math.round(medianSalary + spread))]: 15,
  };
}

// Helper: set up fetch to return specific histograms for national/location calls
function setupAdzunaMock(
  nationalHistogram: Record<string, number>,
  locationHistogram?: Record<string, number>,
  historyData?: Record<string, number>
) {
  mockFetch.mockImplementation((url: string) => {
    const urlStr = String(url);
    // Return failure for ML service calls so they are treated as unavailable
    if (urlStr.includes('localhost:8000')) {
      return Promise.resolve({ ok: false, status: 503 });
    }
    if (urlStr.includes('/history')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ month: historyData || { '2025-01': 40000 } }),
      });
    }
    // If the URL has a location1 parameter, return location histogram
    if (urlStr.includes('location1') && locationHistogram) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ histogram: locationHistogram }),
      });
    }
    // National histogram (no location1 or location1 is a regional comparison)
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ histogram: nationalHistogram }),
    });
  });
}

// Helper: mock CV with ~5 years experience (neutral baseline)
function createMockMongoDb(overrides?: {
  skills?: string[];
  experience?: any[];
  education?: any[];
}) {
  return {
    collection: () => ({
      findOne: () => Promise.resolve({
        skills: overrides?.skills ?? [],
        experience: overrides?.experience ?? [
          { startDate: '2021-01-01', endDate: 'Present' }, // ~5 years
        ],
        education: overrides?.education ?? [],
      }),
    }),
  };
}

describe('Salary Routes - GET /api/salary/insights', () => {
  let testApp: express.Application;
  let validAccessToken: string;

  beforeEach(() => {
    vi.clearAllMocks();
    testApp = buildTestApp();
    validAccessToken = generateTestAccessToken(authenticatedUserId, authenticatedUserEmail);
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

    mockFetch.mockImplementation((url: string) => {
      if (String(url).includes('localhost:8000')) {
        return Promise.resolve({ ok: false, status: 503 });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ histogram: {}, month: {} }),
      });
    });

    const mongoose = await import('mongoose');
    (mongoose.default.connection as any).readyState = 0;

    try {
      const response = await request(testApp)
        .get('/api/salary/insights')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .query({ jobTitle: 'Software Engineer', country: 'gb' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    } finally {
      (mongoose.default.connection as any).readyState = 1;
    }
  });
});

describe('Salary Routes - Skills premium scales with base salary', () => {
  let testApp: express.Application;
  let validAccessToken: string;

  beforeEach(() => {
    vi.clearAllMocks();
    testApp = buildTestApp();
    validAccessToken = generateTestAccessToken(authenticatedUserId, authenticatedUserEmail);
    vi.mocked(mockCache.get).mockResolvedValue(null);
    vi.mocked(mockCache.set).mockResolvedValue(true as any);
    vi.mocked(mockCache.del).mockResolvedValue(true as any);
    vi.mocked(mockCache.delByPattern).mockResolvedValue(0 as any);
  });

  it('should produce higher skill premiums for higher base salaries (US vs UK)', async () => {
    setupAuthenticatedUser();

    const mongoose = await import('mongoose');
    const originalReadyState = (mongoose.default.connection as any).readyState;

    const mockDb = createMockMongoDb({ skills: ['machine learning'] });
    (mongoose.default.connection as any).readyState = 1;
    (mongoose.default.connection as any).db = mockDb;

    try {
      // UK market: £40k median
      const ukHistogram = createMockHistogram(40000);
      setupAdzunaMock(ukHistogram);

      const ukResponse = await request(testApp)
        .get('/api/salary/insights')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .query({ jobTitle: 'Data Scientist', country: 'gb' });

      expect(ukResponse.status).toBe(200);
      const ukSkillFactor = ukResponse.body.data.factorBreakdown.find(
        (f: any) => f.factor === 'Skills Premium'
      );

      // Reset cache for second request
      vi.mocked(mockCache.get).mockResolvedValue(null);

      // US market: $120k median
      const usHistogram = createMockHistogram(120000);
      setupAdzunaMock(usHistogram);

      const usResponse = await request(testApp)
        .get('/api/salary/insights')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .query({ jobTitle: 'Data Scientist', country: 'us' });

      expect(usResponse.status).toBe(200);
      const usSkillFactor = usResponse.body.data.factorBreakdown.find(
        (f: any) => f.factor === 'Skills Premium'
      );

      // US premium should be proportionally higher than UK
      // Both capped at 20% of base: UK = 8000, US = 24000, ratio ≈ 3x
      expect(usSkillFactor.amount).toBeGreaterThan(ukSkillFactor.amount);
      expect(usSkillFactor.amount / ukSkillFactor.amount).toBeCloseTo(3, 0);
    } finally {
      (mongoose.default.connection as any).readyState = originalReadyState;
      (mongoose.default.connection as any).db = undefined;
    }
  });
});

describe('Salary Routes - Location factor included in prediction', () => {
  let testApp: express.Application;
  let validAccessToken: string;

  beforeEach(() => {
    vi.clearAllMocks();
    testApp = buildTestApp();
    validAccessToken = generateTestAccessToken(authenticatedUserId, authenticatedUserEmail);
    vi.mocked(mockCache.get).mockResolvedValue(null);
    vi.mocked(mockCache.set).mockResolvedValue(true as any);
    vi.mocked(mockCache.del).mockResolvedValue(true as any);
    vi.mocked(mockCache.delByPattern).mockResolvedValue(0 as any);
  });

  it('should include location premium in predicted salary without double-counting', async () => {
    setupAuthenticatedUser();

    const mongoose = await import('mongoose');
    const originalReadyState = (mongoose.default.connection as any).readyState;

    // Provide ~5yr experience so experience adjustment ≈ 0 (baseline)
    const mockDb = createMockMongoDb();
    (mongoose.default.connection as any).readyState = 1;
    (mongoose.default.connection as any).db = mockDb;

    try {
      // National: £40k, London: £50k → location delta = +£10k
      const nationalHistogram = createMockHistogram(40000);
      const londonHistogram = createMockHistogram(50000);
      setupAdzunaMock(nationalHistogram, londonHistogram);

      const response = await request(testApp)
        .get('/api/salary/insights')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .query({ jobTitle: 'Software Engineer', location: 'London', country: 'gb' });

      expect(response.status).toBe(200);

      // Base should be the NATIONAL median, not London median
      const baseFactor = response.body.data.factorBreakdown.find(
        (f: any) => f.factor.includes('Base')
      );
      expect(baseFactor.amount).toBe(40000);

      // Location delta should be +10000 (London - National)
      const locationFactor = response.body.data.factorBreakdown.find(
        (f: any) => f.factor.includes('Location')
      );
      expect(locationFactor.amount).toBe(10000);

      // Predicted should be close to 50000 (base 40k + location 10k + near-zero experience)
      // NOT 60000 (which would be double-counted: 50k base + 10k location)
      const predictedSalary = response.body.data.prediction.predictedSalary;
      expect(predictedSalary).toBeGreaterThan(45000);
      expect(predictedSalary).toBeLessThan(55000);
    } finally {
      (mongoose.default.connection as any).readyState = originalReadyState;
      (mongoose.default.connection as any).db = undefined;
    }
  });
});

describe('Salary Routes - Education missing = neutral', () => {
  let testApp: express.Application;
  let validAccessToken: string;

  beforeEach(() => {
    vi.clearAllMocks();
    testApp = buildTestApp();
    validAccessToken = generateTestAccessToken(authenticatedUserId, authenticatedUserEmail);
    vi.mocked(mockCache.get).mockResolvedValue(null);
    vi.mocked(mockCache.set).mockResolvedValue(true as any);
    vi.mocked(mockCache.del).mockResolvedValue(true as any);
    vi.mocked(mockCache.delByPattern).mockResolvedValue(0 as any);
  });

  it('should not penalise users with no education data', async () => {
    setupAuthenticatedUser();

    const mongoose = await import('mongoose');
    const originalReadyState = (mongoose.default.connection as any).readyState;

    // User with ~5yr experience (baseline), no education, no skills
    const mockDb = createMockMongoDb({ education: [] });
    (mongoose.default.connection as any).readyState = 1;
    (mongoose.default.connection as any).db = mockDb;

    try {
      const histogram = createMockHistogram(50000);
      setupAdzunaMock(histogram);

      const response = await request(testApp)
        .get('/api/salary/insights')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .query({ jobTitle: 'Software Engineer', country: 'gb' });

      expect(response.status).toBe(200);

      const educationFactor = response.body.data.factorBreakdown.find(
        (f: any) => f.factor === 'Education'
      );
      // Education should be 0 (neutral), not negative
      expect(educationFactor.amount).toBe(0);
    } finally {
      (mongoose.default.connection as any).readyState = originalReadyState;
      (mongoose.default.connection as any).db = undefined;
    }
  });

  it('should not penalise users with unrecognised education', async () => {
    setupAuthenticatedUser();

    const mongoose = await import('mongoose');
    const originalReadyState = (mongoose.default.connection as any).readyState;

    const mockDb = createMockMongoDb({
      education: [{ degree: 'Some Certificate', field: 'IT' }],
    });
    (mongoose.default.connection as any).readyState = 1;
    (mongoose.default.connection as any).db = mockDb;

    try {
      const histogram = createMockHistogram(50000);
      setupAdzunaMock(histogram);

      const response = await request(testApp)
        .get('/api/salary/insights')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .query({ jobTitle: 'Software Engineer', country: 'gb' });

      expect(response.status).toBe(200);

      const educationFactor = response.body.data.factorBreakdown.find(
        (f: any) => f.factor === 'Education'
      );
      expect(educationFactor.amount).toBe(0);
    } finally {
      (mongoose.default.connection as any).readyState = originalReadyState;
      (mongoose.default.connection as any).db = undefined;
    }
  });
});

describe('Salary Routes - Salary range centered on prediction', () => {
  let testApp: express.Application;
  let validAccessToken: string;

  beforeEach(() => {
    vi.clearAllMocks();
    testApp = buildTestApp();
    validAccessToken = generateTestAccessToken(authenticatedUserId, authenticatedUserEmail);
    vi.mocked(mockCache.get).mockResolvedValue(null);
    vi.mocked(mockCache.set).mockResolvedValue(true as any);
    vi.mocked(mockCache.del).mockResolvedValue(true as any);
    vi.mocked(mockCache.delByPattern).mockResolvedValue(0 as any);
  });

  it('should produce a salary range that contains the predicted salary', async () => {
    setupAuthenticatedUser();

    const mongoose = await import('mongoose');
    (mongoose.default.connection as any).readyState = 0;

    const histogram = {
      '25000': 25,
      '35000': 50,
      '45000': 50,
      '55000': 30,
      '65000': 15,
    };

    mockFetch.mockImplementation((url: string) => {
      if (String(url).includes('localhost:8000')) {
        return Promise.resolve({ ok: false, status: 503 });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ histogram, month: {} }),
      });
    });

    const response = await request(testApp)
      .get('/api/salary/insights')
      .set('Authorization', `Bearer ${validAccessToken}`)
      .query({ jobTitle: 'Software Engineer', country: 'gb' });

    expect(response.status).toBe(200);

    const { salaryMin, salaryMax, predictedSalary } = response.body.data.prediction;
    // The range must always contain the predicted salary
    expect(salaryMin).toBeLessThanOrEqual(predictedSalary);
    expect(salaryMax).toBeGreaterThanOrEqual(predictedSalary);
    // Range should not be exactly ±15% (old fallback formula)
    expect(salaryMin).not.toBe(Math.round(predictedSalary * 0.85));
    expect(salaryMax).not.toBe(Math.round(predictedSalary * 1.15));
  });
});

describe('Salary Routes - Confidence reflects data quality', () => {
  let testApp: express.Application;
  let validAccessToken: string;

  beforeEach(() => {
    vi.clearAllMocks();
    testApp = buildTestApp();
    validAccessToken = generateTestAccessToken(authenticatedUserId, authenticatedUserEmail);
    vi.mocked(mockCache.get).mockResolvedValue(null);
    vi.mocked(mockCache.set).mockResolvedValue(true as any);
    vi.mocked(mockCache.del).mockResolvedValue(true as any);
    vi.mocked(mockCache.delByPattern).mockResolvedValue(0 as any);
  });

  it('should give higher confidence for tight distributions with many listings', async () => {
    setupAuthenticatedUser();

    const mongoose = await import('mongoose');
    (mongoose.default.connection as any).readyState = 0;

    // Tight distribution with lots of data
    const tightHistogram = {
      '48000': 80,
      '50000': 120,
      '52000': 70,
    };

    mockFetch.mockImplementation((url: string) => {
      if (String(url).includes('localhost:8000')) {
        return Promise.resolve({ ok: false, status: 503 });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ histogram: tightHistogram, month: {} }),
      });
    });

    const tightResponse = await request(testApp)
      .get('/api/salary/insights')
      .set('Authorization', `Bearer ${validAccessToken}`)
      .query({ jobTitle: 'Software Engineer', country: 'gb' });

    expect(tightResponse.status).toBe(200);
    const highConfidence = tightResponse.body.data.prediction.confidence;

    vi.mocked(mockCache.get).mockResolvedValue(null);

    // Wide distribution with few listings
    const wideHistogram = {
      '20000': 3,
      '50000': 5,
      '80000': 2,
    };

    mockFetch.mockImplementation((url: string) => {
      if (String(url).includes('localhost:8000')) {
        return Promise.resolve({ ok: false, status: 503 });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ histogram: wideHistogram, month: {} }),
      });
    });

    const wideResponse = await request(testApp)
      .get('/api/salary/insights')
      .set('Authorization', `Bearer ${validAccessToken}`)
      .query({ jobTitle: 'Rare Specialist', country: 'gb' });

    expect(wideResponse.status).toBe(200);
    const lowConfidence = wideResponse.body.data.prediction.confidence;

    expect(highConfidence).toBeGreaterThan(lowConfidence);
  });
});

describe('Salary Routes - No redundant API calls', () => {
  let testApp: express.Application;
  let validAccessToken: string;

  beforeEach(() => {
    vi.clearAllMocks();
    testApp = buildTestApp();
    validAccessToken = generateTestAccessToken(authenticatedUserId, authenticatedUserEmail);
    vi.mocked(mockCache.get).mockResolvedValue(null);
    vi.mocked(mockCache.set).mockResolvedValue(true as any);
    vi.mocked(mockCache.del).mockResolvedValue(true as any);
    vi.mocked(mockCache.delByPattern).mockResolvedValue(0 as any);
  });

  it('should not duplicate histogram calls for user location that matches a region', async () => {
    setupAuthenticatedUser();

    const mongoose = await import('mongoose');
    (mongoose.default.connection as any).readyState = 0;

    const histogram = createMockHistogram(40000);
    const londonHistogram = createMockHistogram(50000);
    setupAdzunaMock(histogram, londonHistogram);

    await request(testApp)
      .get('/api/salary/insights')
      .set('Authorization', `Bearer ${validAccessToken}`)
      .query({ jobTitle: 'Software Engineer', location: 'London', country: 'gb' });

    // Count histogram calls:
    // Phase 1: 1 national + 1 London (user location) = 2 histogram + 1 history
    // Phase 2 regional: 12 UK regions, but London is reused from phase 1 = 11 new histogram calls
    // Phase 2 top-paying roles: up to 6 role-variant histogram calls
    // Total histogram: 2 + 11 + 6 = 19 (London NOT fetched twice - deduplication works)
    const histogramCalls = mockFetch.mock.calls.filter(
      (call: any[]) => String(call[0]).includes('/histogram')
    );
    const historyCalls = mockFetch.mock.calls.filter(
      (call: any[]) => String(call[0]).includes('/history')
    );

    expect(histogramCalls.length).toBe(19);
    expect(historyCalls.length).toBe(1);
  });
});

describe('Salary Routes - Experience adjustment is centered on market average', () => {
  let testApp: express.Application;
  let validAccessToken: string;

  beforeEach(() => {
    vi.clearAllMocks();
    testApp = buildTestApp();
    validAccessToken = generateTestAccessToken(authenticatedUserId, authenticatedUserEmail);
    vi.mocked(mockCache.get).mockResolvedValue(null);
    vi.mocked(mockCache.set).mockResolvedValue(true as any);
    vi.mocked(mockCache.del).mockResolvedValue(true as any);
    vi.mocked(mockCache.delByPattern).mockResolvedValue(0 as any);
  });

  it('should predict below median for a junior and above median for a senior', async () => {
    setupAuthenticatedUser();

    const mongoose = await import('mongoose');
    const originalReadyState = (mongoose.default.connection as any).readyState;

    const histogram = createMockHistogram(50000);

    // Junior: 1 year experience
    const juniorDb = createMockMongoDb({
      experience: [{ startDate: '2025-01-01', endDate: 'Present' }],
    });
    (mongoose.default.connection as any).readyState = 1;
    (mongoose.default.connection as any).db = juniorDb;

    setupAdzunaMock(histogram);

    const juniorResponse = await request(testApp)
      .get('/api/salary/insights')
      .set('Authorization', `Bearer ${validAccessToken}`)
      .query({ jobTitle: 'Software Engineer', country: 'gb' });

    expect(juniorResponse.status).toBe(200);
    const juniorSalary = juniorResponse.body.data.prediction.predictedSalary;

    // Reset for senior
    vi.mocked(mockCache.get).mockResolvedValue(null);

    // Senior: 15 years experience
    const seniorDb = createMockMongoDb({
      experience: [{ startDate: '2011-01-01', endDate: 'Present' }],
    });
    (mongoose.default.connection as any).db = seniorDb;

    setupAdzunaMock(histogram);

    const seniorResponse = await request(testApp)
      .get('/api/salary/insights')
      .set('Authorization', `Bearer ${validAccessToken}`)
      .query({ jobTitle: 'Software Engineer', country: 'gb' });

    expect(seniorResponse.status).toBe(200);
    const seniorSalary = seniorResponse.body.data.prediction.predictedSalary;

    try {
      // Junior should be below median, senior above
      expect(juniorSalary).toBeLessThan(50000);
      expect(seniorSalary).toBeGreaterThan(50000);
      expect(seniorSalary).toBeGreaterThan(juniorSalary);
    } finally {
      (mongoose.default.connection as any).readyState = originalReadyState;
      (mongoose.default.connection as any).db = undefined;
    }
  });
});

describe('Salary Routes - History fallback for Frontend Developer', () => {
  let testApp: express.Application;
  let validAccessToken: string;

  beforeEach(() => {
    vi.clearAllMocks();
    testApp = buildTestApp();
    validAccessToken = generateTestAccessToken(authenticatedUserId, authenticatedUserEmail);
    vi.mocked(mockCache.get).mockResolvedValue(null);
    vi.mocked(mockCache.set).mockResolvedValue(true as any);
    vi.mocked(mockCache.del).mockResolvedValue(true as any);
    vi.mocked(mockCache.delByPattern).mockResolvedValue(0 as any);
  });

  it('should populate marketTrend via fallback when primary history is empty for Frontend Developer', async () => {
    setupAuthenticatedUser();

    const mongoose = await import('mongoose');
    (mongoose.default.connection as any).readyState = 0;

    const histogram = createMockHistogram(55000);

    mockFetch.mockImplementation((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes('localhost:8000')) {
        return Promise.resolve({ ok: false, status: 503 });
      }
      if (urlStr.includes('/history')) {
        const isDirectFrontend =
          urlStr.includes('what=Frontend') || urlStr.includes('what=frontend');
        if (isDirectFrontend) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ month: {} }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ month: { '2025-01': 55000, '2025-06': 57000 } }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ histogram }),
      });
    });

    const response = await request(testApp)
      .get('/api/salary/insights')
      .set('Authorization', `Bearer ${validAccessToken}`)
      .query({ jobTitle: 'Frontend Developer', country: 'gb' });

    expect(response.status).toBe(200);
    expect(response.body.data.marketTrend.length).toBeGreaterThan(0);
  });

  it('should still return 200 with empty marketTrend when no fallback term exists for unknown title', async () => {
    setupAuthenticatedUser();

    const mongoose = await import('mongoose');
    (mongoose.default.connection as any).readyState = 0;

    const histogram = createMockHistogram(50000);

    mockFetch.mockImplementation((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes('localhost:8000')) {
        return Promise.resolve({ ok: false, status: 503 });
      }
      if (urlStr.includes('/history')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ month: {} }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ histogram }),
      });
    });

    const response = await request(testApp)
      .get('/api/salary/insights')
      .set('Authorization', `Bearer ${validAccessToken}`)
      .query({ jobTitle: 'Rare Specialist Title', country: 'gb' });

    expect(response.status).toBe(200);
    expect(response.body.data.marketTrend).toHaveLength(0);
  });
});

describe('Salary Routes - PATCH /api/salary/preferences', () => {
  let testApp: express.Application;
  let validAccessToken: string;

  beforeEach(() => {
    vi.clearAllMocks();
    testApp = buildTestApp();
    validAccessToken = generateTestAccessToken(authenticatedUserId, authenticatedUserEmail);
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
