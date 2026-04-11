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
  redis: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
  },
}));

const mockMlServiceMethods = vi.hoisted(() => ({
  parseCv: vi.fn(),
  getUserCVs: vi.fn(),
  getCVById: vi.fn(),
  deleteCV: vi.fn(),
  setPrimaryCV: vi.fn(),
  getCVFilePath: vi.fn(),
  analyzeCV: vi.fn(),
  checkHealth: vi.fn(),
}));

vi.mock('../services/ml.service.js', () => {
  class MlServiceMock {
    parseCv = mockMlServiceMethods.parseCv;
    getUserCVs = mockMlServiceMethods.getUserCVs;
    getCVById = mockMlServiceMethods.getCVById;
    deleteCV = mockMlServiceMethods.deleteCV;
    setPrimaryCV = mockMlServiceMethods.setPrimaryCV;
    getCVFilePath = mockMlServiceMethods.getCVFilePath;
    analyzeCV = mockMlServiceMethods.analyzeCV;
    checkHealth = mockMlServiceMethods.checkHealth;
  }
  return { MlService: MlServiceMock };
});

vi.mock('fs', async () => {
  const mockStream = {
    on: vi.fn().mockReturnThis(),
    pipe: vi.fn(),
  };
  return {
    default: {
      createReadStream: vi.fn().mockReturnValue(mockStream),
    },
    promises: {
      access: vi.fn().mockResolvedValue(undefined),
    },
    createReadStream: vi.fn().mockReturnValue(mockStream),
  };
});

import mlRoutes from './ml.routes.js';
import { prisma as mockDatabasePrisma } from '../config/database.js';
import { globalErrorHandler } from '../middlewares/error.middleware.js';

function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/ml', mlRoutes);
  app.use(globalErrorHandler);
  return app;
}

function generateToken(userId: string, email: string) {
  return jwt.sign({ userId, email }, process.env.JWT_SECRET!, { expiresIn: '1h' });
}

const testUserId = 'ml-test-user-uuid';
const testUserEmail = 'ml@example.com';

function setupAuthenticatedUser() {
  (mockDatabasePrisma as any).user.findUnique.mockResolvedValue({
    id: testUserId,
    email: testUserEmail,
    isEmailVerified: true,
    firstName: 'ML',
    lastName: 'User',
    role: 'USER',
    isDisabled: false,
  });
}

describe('ML Routes', () => {
  let testApp: ReturnType<typeof buildTestApp>;
  let token: string;

  beforeEach(() => {
    vi.clearAllMocks();
    testApp = buildTestApp();
    token = generateToken(testUserId, testUserEmail);
  });

  describe('POST /api/ml/parse-cv', () => {
    it('should return 401 when no token provided', async () => {
      const response = await request(testApp).post('/api/ml/parse-cv');
      expect(response.status).toBe(401);
    });

    it('should return 400 when no file is uploaded', async () => {
      setupAuthenticatedUser();
      const response = await request(testApp)
        .post('/api/ml/parse-cv')
        .set('Authorization', `Bearer ${token}`);
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('No file uploaded');
    });

    it('should return 200 when file is uploaded and service succeeds', async () => {
      setupAuthenticatedUser();
      mockMlServiceMethods.parseCv.mockResolvedValue({ cvId: 'cv-123', message: 'Parsed' });

      const response = await request(testApp)
        .post('/api/ml/parse-cv')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('%PDF-1.4 fake pdf'), { filename: 'cv.pdf', contentType: 'application/pdf' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('CV parsed and saved successfully');
    });

    it('should call next(error) when service throws', async () => {
      setupAuthenticatedUser();
      mockMlServiceMethods.parseCv.mockRejectedValue(new Error('Parse failed'));

      const response = await request(testApp)
        .post('/api/ml/parse-cv')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('fake content'), { filename: 'cv.pdf', contentType: 'application/pdf' });

      expect(response.status).toBe(500);
    });
  });

  describe('GET /api/ml/cvs', () => {
    it('should return 401 when not authenticated', async () => {
      const response = await request(testApp).get('/api/ml/cvs');
      expect(response.status).toBe(401);
    });

    it('should return CV list on success', async () => {
      setupAuthenticatedUser();
      mockMlServiceMethods.getUserCVs.mockResolvedValue({
        success: true,
        data: [{ id: 'cv-1', filename: 'resume.pdf' }],
      });

      const response = await request(testApp)
        .get('/api/ml/cvs')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
    });
  });

  describe('GET /api/ml/cvs/:cvId', () => {
    it('should return 401 when not authenticated', async () => {
      const response = await request(testApp).get('/api/ml/cvs/cv-abc');
      expect(response.status).toBe(401);
    });

    it('should return CV data on success', async () => {
      setupAuthenticatedUser();
      mockMlServiceMethods.getCVById.mockResolvedValue({ id: 'cv-abc', filename: 'resume.pdf' });

      const response = await request(testApp)
        .get('/api/ml/cvs/cv-abc')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('cv-abc');
    });
  });

  describe('DELETE /api/ml/cvs/:cvId', () => {
    it('should return 200 on successful delete', async () => {
      setupAuthenticatedUser();
      mockMlServiceMethods.deleteCV.mockResolvedValue(undefined);

      const response = await request(testApp)
        .delete('/api/ml/cvs/cv-abc')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('CV deleted successfully');
    });
  });

  describe('PATCH /api/ml/cvs/:cvId/primary', () => {
    it('should return 200 when primary CV is set', async () => {
      setupAuthenticatedUser();
      mockMlServiceMethods.setPrimaryCV.mockResolvedValue({ id: 'cv-abc', isPrimary: true });

      const response = await request(testApp)
        .patch('/api/ml/cvs/cv-abc/primary')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Primary CV updated');
    });
  });

  describe('POST /api/ml/cvs/:cvId/analyze', () => {
    it('should return 200 with analysis result', async () => {
      setupAuthenticatedUser();
      mockMlServiceMethods.analyzeCV.mockResolvedValue({
        message: 'Analysis complete',
        data: { score: 85 },
      });

      const response = await request(testApp)
        .post('/api/ml/cvs/cv-abc/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send({ forceReanalyze: false, targetRole: 'Software Engineer' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.score).toBe(85);
    });
  });

  describe('GET /api/ml/health', () => {
    it('should return health status from service', async () => {
      mockMlServiceMethods.checkHealth.mockResolvedValue({
        status: 200,
        data: { status: 'healthy', version: '1.0' },
      });

      const response = await request(testApp).get('/api/ml/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
    });

    it('should return 503 when health check throws', async () => {
      mockMlServiceMethods.checkHealth.mockRejectedValue(new Error('Unreachable'));

      const response = await request(testApp).get('/api/ml/health');

      expect(response.status).toBe(503);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/ml/cvs/:cvId/download', () => {
    it('should return 404 when file does not exist on disk', async () => {
      setupAuthenticatedUser();
      mockMlServiceMethods.getCVFilePath.mockResolvedValue('/uploads/cvs/cv-abc.pdf');

      const fsp = await import('fs');
      vi.mocked((fsp as any).promises.access).mockRejectedValue(new Error('ENOENT'));

      const response = await request(testApp)
        .get('/api/ml/cvs/cv-abc/download')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });
});
