import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../library/api', () => {
  const mockApi = {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  };
  return { default: mockApi, authAPI: {} };
});

import { cvService } from './cv.service';
import api from '../library/api';

const mockApi = api as any;

const sampleCV = {
  id: 'cv-uuid-1234',
  userId: 'user-uuid-5678',
  filename: 'my-resume.pdf',
  fileUrl: '/uploads/my-resume.pdf',
  parsedData: null,
  analysisData: null,
  overviewData: null,
  isPrimary: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('CVService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserCVs', () => {
    it('should call GET /api/v1/ml/cvs', async () => {
      const expectedResponse = { success: true, data: [sampleCV] };
      mockApi.get.mockResolvedValue({ data: expectedResponse });

      const result = await cvService.getUserCVs();

      expect(mockApi.get).toHaveBeenCalledWith('/api/v1/ml/cvs');
      expect(result).toEqual(expectedResponse);
    });

    it('should return the list of CVs from the response', async () => {
      const cvList = [sampleCV, { ...sampleCV, id: 'cv-uuid-9999', filename: 'second.pdf' }];
      mockApi.get.mockResolvedValue({ data: { success: true, data: cvList } });

      const result = await cvService.getUserCVs();

      expect(result.data).toHaveLength(2);
    });
  });

  describe('getCVById', () => {
    it('should call GET /api/v1/ml/cvs/:id with the correct id', async () => {
      const cvId = 'cv-uuid-1234';
      mockApi.get.mockResolvedValue({ data: { success: true, data: sampleCV } });

      const result = await cvService.getCVById(cvId);

      expect(mockApi.get).toHaveBeenCalledWith(`/api/v1/ml/cvs/${cvId}`);
      expect(result.data.id).toBe(cvId);
    });
  });

  describe('updateCV', () => {
    it('should call PATCH /api/v1/ml/cvs/:id with the payload', async () => {
      const cvId = 'cv-uuid-1234';
      const updatePayload = { isPrimary: true };
      mockApi.patch.mockResolvedValue({ data: { success: true, message: 'Updated', data: sampleCV } });

      const result = await cvService.updateCV(cvId, updatePayload);

      expect(mockApi.patch).toHaveBeenCalledWith(`/api/v1/ml/cvs/${cvId}`, updatePayload);
      expect(result.success).toBe(true);
    });
  });

  describe('setPrimaryCV', () => {
    it('should call PATCH /api/v1/ml/cvs/:id/primary', async () => {
      const cvId = 'cv-uuid-1234';
      mockApi.patch.mockResolvedValue({ data: { success: true, message: 'Set as primary', data: { ...sampleCV, isPrimary: true } } });

      const result = await cvService.setPrimaryCV(cvId);

      expect(mockApi.patch).toHaveBeenCalledWith(`/api/v1/ml/cvs/${cvId}/primary`);
      expect(result.success).toBe(true);
    });
  });

  describe('deleteCV', () => {
    it('should call DELETE /api/v1/ml/cvs/:id', async () => {
      const cvId = 'cv-uuid-1234';
      mockApi.delete.mockResolvedValue({ data: null });

      await cvService.deleteCV(cvId);

      expect(mockApi.delete).toHaveBeenCalledWith(`/api/v1/ml/cvs/${cvId}`);
    });
  });

  describe('analyzeCV', () => {
    it('should call POST /api/v1/ml/cvs/:id/analyze without targetRole when not provided', async () => {
      const cvId = 'cv-uuid-1234';
      mockApi.post.mockResolvedValue({ data: { success: true, data: {} } });

      await cvService.analyzeCV(cvId);

      expect(mockApi.post).toHaveBeenCalledWith(
        `/api/v1/ml/cvs/${cvId}/analyze`,
        { targetRole: undefined }
      );
    });

    it('should include targetRole in the request when provided', async () => {
      const cvId = 'cv-uuid-1234';
      mockApi.post.mockResolvedValue({ data: { success: true, data: {} } });

      await cvService.analyzeCV(cvId, 'Software Engineer');

      expect(mockApi.post).toHaveBeenCalledWith(
        `/api/v1/ml/cvs/${cvId}/analyze`,
        { targetRole: 'Software Engineer' }
      );
    });
  });

  describe('uploadCV', () => {
    it('should call POST /api/v1/ml/parse-cv with FormData and multipart header', async () => {
      const mockFile = new File(['pdf content'], 'resume.pdf', { type: 'application/pdf' });
      const uploadResponse = { success: true, message: 'Parsed', data: { cvId: 'new-cv', filename: 'resume.pdf', parsedData: {}, createdAt: '' } };
      mockApi.post.mockResolvedValue({ data: uploadResponse });

      const result = await cvService.uploadCV(mockFile);

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/v1/ml/parse-cv',
        expect.any(FormData),
        expect.objectContaining({
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      );
      expect(result.success).toBe(true);
    });
  });

  describe('checkATSScore', () => {
    it('should call POST /api/v1/applications/ats-check with job description', async () => {
      const jobDescription = 'Looking for a React developer with 3 years of experience.';
      mockApi.post.mockResolvedValue({ data: { success: true, data: { atsScore: 75 } } });

      await cvService.checkATSScore(jobDescription);

      expect(mockApi.post).toHaveBeenCalledWith('/api/v1/applications/ats-check', {
        jobDescription,
        cvId: undefined,
      });
    });
  });

  describe('validateFile', () => {
    it('should return valid for a PDF file under 10MB', () => {
      const validPdfFile = new File(['content'], 'resume.pdf', { type: 'application/pdf' });
      Object.defineProperty(validPdfFile, 'size', { value: 1024 * 1024 });

      const result = cvService.validateFile(validPdfFile);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return valid for a DOCX file', () => {
      const validDocxFile = new File(['content'], 'resume.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      const result = cvService.validateFile(validDocxFile);

      expect(result.valid).toBe(true);
    });

    it('should reject a file with an unsupported type', () => {
      const invalidFile = new File(['content'], 'resume.txt', { type: 'text/plain' });

      const result = cvService.validateFile(invalidFile);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Only PDF and DOCX files are allowed');
    });

    it('should reject a PDF file that exceeds 10MB', () => {
      const oversizedFile = new File(['content'], 'big.pdf', { type: 'application/pdf' });
      Object.defineProperty(oversizedFile, 'size', { value: 11 * 1024 * 1024 });

      const result = cvService.validateFile(oversizedFile);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('File size must be less than 10MB');
    });
  });

  describe('error propagation', () => {
    it('should propagate network errors from getUserCVs', async () => {
      mockApi.get.mockRejectedValue(new Error('Network Error'));

      await expect(cvService.getUserCVs()).rejects.toThrow('Network Error');
    });
  });
});
