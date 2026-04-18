import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { EventEmitter } from 'events';

const mockCreateReadStream = vi.hoisted(() => vi.fn());
const mockFspAccess = vi.hoisted(() => vi.fn());

vi.mock('fs', () => ({
  default: { createReadStream: mockCreateReadStream },
  promises: { access: mockFspAccess },
  createReadStream: mockCreateReadStream,
}));

const mockMlServiceInstance = vi.hoisted(() => ({
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
  function MockMlService(this: any) {
    return mockMlServiceInstance;
  }
  return { MlService: MockMlService };
});

vi.mock('../utils/logger.js', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

import * as mlController from './ml.controller.js';

function buildMockResponse() {
  const mockResponse = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    headersSent: false,
  };
  return mockResponse as unknown as Response;
}

function buildMockRequest(overrides: Partial<Request> = {}): Request {
  return {
    headers: { authorization: 'Bearer test-token' },
    query: {},
    params: {},
    body: {},
    user: { id: 'user-uuid-123', email: 'user@example.com', isEmailVerified: true, role: 'USER' },
    file: undefined,
    ...overrides,
  } as unknown as Request;
}

describe('ML Controller', () => {
  let mockResponse: Response;
  let mockNext: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockResponse = buildMockResponse();
    mockNext = vi.fn();
  });

  describe('parseCv', () => {
    it('should return 400 when no file is attached to the request', async () => {
      const mockRequest = buildMockRequest({ file: undefined });

      await mlController.parseCv(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(400);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'No file uploaded' })
      );
    });

    it('should return 200 with parsed CV data on success', async () => {
      const fakeParsedCv = { id: 'cv-uuid-1', filename: 'resume.pdf', skills: ['TypeScript'] };
      mockMlServiceInstance.parseCv.mockResolvedValue(fakeParsedCv);

      const mockRequest = buildMockRequest({
        file: { originalname: 'resume.pdf', mimetype: 'application/pdf' } as any,
      });

      await mlController.parseCv(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(200);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: fakeParsedCv })
      );
    });

    it('should call next with error when service throws', async () => {
      const serviceError = new Error('ML service unreachable');
      mockMlServiceInstance.parseCv.mockRejectedValue(serviceError);

      const mockRequest = buildMockRequest({
        file: { originalname: 'cv.pdf' } as any,
      });

      await mlController.parseCv(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect(mockNext).toHaveBeenCalledWith(serviceError);
    });
  });

  describe('getCVs', () => {
    it('should return CV list on success', async () => {
      const fakeCvList = { success: true, data: [{ id: 'cv-1' }, { id: 'cv-2' }] };
      mockMlServiceInstance.getUserCVs.mockResolvedValue(fakeCvList);

      const mockRequest = buildMockRequest();

      await mlController.getCVs(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect((mockResponse.json as any)).toHaveBeenCalledWith(fakeCvList);
    });

    it('should call next with error when service throws', async () => {
      const serviceError = new Error('DB read failed');
      mockMlServiceInstance.getUserCVs.mockRejectedValue(serviceError);

      const mockRequest = buildMockRequest();

      await mlController.getCVs(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect(mockNext).toHaveBeenCalledWith(serviceError);
    });
  });

  describe('getCVById', () => {
    it('should return CV data on success', async () => {
      const fakeCv = { id: 'cv-uuid-1', filename: 'resume.pdf', skills: ['Node.js'] };
      mockMlServiceInstance.getCVById.mockResolvedValue(fakeCv);

      const mockRequest = buildMockRequest({ params: { cvId: 'cv-uuid-1' } });

      await mlController.getCVById(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: fakeCv })
      );
    });

    it('should call next with error when service throws', async () => {
      const serviceError = new Error('CV not found');
      mockMlServiceInstance.getCVById.mockRejectedValue(serviceError);

      const mockRequest = buildMockRequest({ params: { cvId: 'nonexistent' } });

      await mlController.getCVById(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect(mockNext).toHaveBeenCalledWith(serviceError);
    });
  });

  describe('deleteCV', () => {
    it('should return 200 with success message when CV is deleted', async () => {
      mockMlServiceInstance.deleteCV.mockResolvedValue(undefined);

      const mockRequest = buildMockRequest({ params: { cvId: 'cv-to-delete' } });

      await mlController.deleteCV(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, message: 'CV deleted successfully' })
      );
    });

    it('should call next with error when service throws', async () => {
      const serviceError = new Error('Cannot delete CV');
      mockMlServiceInstance.deleteCV.mockRejectedValue(serviceError);

      const mockRequest = buildMockRequest({ params: { cvId: 'cv-uuid-1' } });

      await mlController.deleteCV(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect(mockNext).toHaveBeenCalledWith(serviceError);
    });
  });

  describe('setPrimaryCV', () => {
    it('should return 200 with updated CV data on success', async () => {
      const fakeUpdatedCv = { id: 'cv-primary', isPrimary: true };
      mockMlServiceInstance.setPrimaryCV.mockResolvedValue(fakeUpdatedCv);

      const mockRequest = buildMockRequest({ params: { cvId: 'cv-primary' } });

      await mlController.setPrimaryCV(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: fakeUpdatedCv })
      );
    });

    it('should call next with error when service throws', async () => {
      const serviceError = new Error('CV not found');
      mockMlServiceInstance.setPrimaryCV.mockRejectedValue(serviceError);

      const mockRequest = buildMockRequest({ params: { cvId: 'nonexistent-cv' } });

      await mlController.setPrimaryCV(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect(mockNext).toHaveBeenCalledWith(serviceError);
    });
  });

  describe('downloadCV', () => {
    it('should return 404 when fsp.access rejects (file not on disk)', async () => {
      mockMlServiceInstance.getCVFilePath.mockResolvedValue('/uploads/cvs/resume.pdf');
      mockFspAccess.mockRejectedValue(new Error('ENOENT: no such file'));

      const mockRequest = buildMockRequest({ params: { cvId: 'cv-uuid-1' } });

      await mlController.downloadCV(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(404);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'File not found on server' })
      );
    });

    it('should pipe the file stream to the response when file exists', async () => {
      mockMlServiceInstance.getCVFilePath.mockResolvedValue('/uploads/cvs/resume.pdf');
      mockFspAccess.mockResolvedValue(undefined);

      const mockStream = new EventEmitter() as any;
      mockStream.pipe = vi.fn();
      mockCreateReadStream.mockReturnValue(mockStream);

      const mockRequest = buildMockRequest({ params: { cvId: 'cv-uuid-1' } });

      await mlController.downloadCV(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect(mockCreateReadStream).toHaveBeenCalledWith('/uploads/cvs/resume.pdf');
      expect(mockStream.pipe).toHaveBeenCalledWith(mockResponse);
    });

    it('should call next with error when getCVFilePath throws', async () => {
      const serviceError = new Error('CV record not found');
      mockMlServiceInstance.getCVFilePath.mockRejectedValue(serviceError);

      const mockRequest = buildMockRequest({ params: { cvId: 'unknown-cv' } });

      await mlController.downloadCV(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect(mockNext).toHaveBeenCalledWith(serviceError);
    });
  });

  describe('analyzeCV', () => {
    it('should return 200 with analysis result on success', async () => {
      const fakeAnalysis = {
        message: 'Analysis complete',
        data: { overallScore: 85, strengths: ['TypeScript'], gaps: [] },
      };
      mockMlServiceInstance.analyzeCV.mockResolvedValue(fakeAnalysis);

      const mockRequest = buildMockRequest({
        params: { cvId: 'cv-uuid-1' },
        body: { forceReanalyze: false, targetRole: 'Backend Engineer' },
      });

      await mlController.analyzeCV(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: fakeAnalysis.message,
          data: fakeAnalysis.data,
        })
      );
    });

    it('should call next with error when service throws', async () => {
      const serviceError = new Error('Analysis failed');
      mockMlServiceInstance.analyzeCV.mockRejectedValue(serviceError);

      const mockRequest = buildMockRequest({
        params: { cvId: 'cv-uuid-1' },
        body: {},
      });

      await mlController.analyzeCV(mockRequest, mockResponse, mockNext as unknown as NextFunction);

      expect(mockNext).toHaveBeenCalledWith(serviceError);
    });
  });

  describe('healthCheck', () => {
    it('should return the ML service status and data on success', async () => {
      const fakeHealthResult = {
        status: 200,
        data: { status: 'healthy', model: 'all-MiniLM-L6-v2' },
      };
      mockMlServiceInstance.checkHealth.mockResolvedValue(fakeHealthResult);

      const mockRequest = buildMockRequest();

      await mlController.healthCheck(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(200);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(fakeHealthResult.data);
    });

    it('should return 503 when service throws', async () => {
      mockMlServiceInstance.checkHealth.mockRejectedValue(new Error('ML service is down'));

      const mockRequest = buildMockRequest();

      await mlController.healthCheck(mockRequest, mockResponse);

      expect((mockResponse.status as any)).toHaveBeenCalledWith(503);
      expect((mockResponse.json as any)).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'ML service unavailable' })
      );
    });
  });
});
