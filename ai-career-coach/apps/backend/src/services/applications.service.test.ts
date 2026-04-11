import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient() as any;

vi.mock('../config/database.js', () => ({
  prisma: new (PrismaClient as any)(),
  cache: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
  },
}));

import { ApplicationsService } from './applications.service.js';

describe('ApplicationsService', () => {
  let service: ApplicationsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ApplicationsService();
  });

  describe('resolveCV', () => {
    it('returns cv by cvId when found and belongs to user', async () => {
      const cv = { id: 'cv-1', userId: 'u-1', mongoDocId: 'mongo-1' };
      db.cV.findUnique.mockResolvedValue(cv);

      const result = await service.resolveCV('u-1', 'cv-1');

      expect(result).toBe(cv);
      expect(db.cV.findUnique).toHaveBeenCalledWith({ where: { id: 'cv-1' } });
    });

    it('returns null when cv does not belong to user', async () => {
      db.cV.findUnique.mockResolvedValue({ id: 'cv-1', userId: 'other-user', mongoDocId: 'mongo-1' });

      const result = await service.resolveCV('u-1', 'cv-1');

      expect(result).toBeNull();
    });

    it('returns null when cvId cv is not found', async () => {
      db.cV.findUnique.mockResolvedValue(null);

      const result = await service.resolveCV('u-1', 'cv-unknown');

      expect(result).toBeNull();
    });

    it('returns primary CV when no cvId provided', async () => {
      const primaryCv = { id: 'cv-primary', userId: 'u-1', isPrimary: true };
      db.cV.findFirst.mockResolvedValue(primaryCv);

      const result = await service.resolveCV('u-1');

      expect(result).toBe(primaryCv);
      expect(db.cV.findFirst).toHaveBeenCalledWith({ where: { userId: 'u-1', isPrimary: true } });
    });
  });

  describe('atsCheck', () => {
    it('returns 404 error when cv is not found (cvId provided)', async () => {
      db.cV.findUnique.mockResolvedValue(null);

      const result = await service.atsCheck('u-1', 'React developer role', 'cv-missing');

      expect(result).toEqual({ error: 'CV not found', status: 404 });
    });

    it('returns 400 error when no primary cv is set', async () => {
      db.cV.findFirst.mockResolvedValue(null);

      const result = await service.atsCheck('u-1', 'React developer role');

      expect(result).toEqual({ error: 'No primary CV set. Upload a CV first.', status: 400 });
    });

    it('returns 400 error when cv has no mongoDocId', async () => {
      db.cV.findUnique.mockResolvedValue({ id: 'cv-1', userId: 'u-1', mongoDocId: null });

      const result = await service.atsCheck('u-1', 'React developer role', 'cv-1');

      expect(result).toEqual({ error: 'Parsed CV data not available for analysis', status: 400 });
    });

    it('returns 404 error when mongoose is disconnected and CV data cannot be fetched', async () => {
      db.cV.findUnique.mockResolvedValue({ id: 'cv-1', userId: 'u-1', mongoDocId: 'mongo-doc-1' });

      const mongoose = await import('mongoose');
      const originalReadyState = (mongoose.default.connection as any).readyState;
      (mongoose.default.connection as any).readyState = 0;

      const result = await service.atsCheck('u-1', 'React developer role', 'cv-1');

      expect(result).toEqual({ error: 'Parsed CV data not found in database', status: 404 });
      (mongoose.default.connection as any).readyState = originalReadyState;
    });

    it('returns success data when ML service call succeeds', async () => {
      db.cV.findUnique.mockResolvedValue({ id: 'cv-1', userId: 'u-1', mongoDocId: 'mongo-doc-1' });

      const mongoose = await import('mongoose');
      (mongoose.default.connection as any).readyState = 1;
      (mongoose.default.connection as any).db = {
        collection: () => ({
          findOne: vi.fn().mockResolvedValue({
            skills: ['python'],
            experience: [],
            education: [],
            summary: 'Developer',
            raw_text: 'Developer with experience',
          }),
        }),
      };

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { atsScore: 82, breakdown: {}, keywordsMatched: ['python'], keywordsMissing: [] } }),
      }));

      const result = await service.atsCheck('u-1', 'Looking for a Python developer', 'cv-1');

      expect((result as any).atsScore).toBe(82);
      vi.unstubAllGlobals();
    });

    it('returns 500 error when ML service returns failure', async () => {
      db.cV.findUnique.mockResolvedValue({ id: 'cv-1', userId: 'u-1', mongoDocId: 'mongo-doc-1' });

      const mongoose = await import('mongoose');
      (mongoose.default.connection as any).readyState = 1;
      (mongoose.default.connection as any).db = {
        collection: () => ({
          findOne: vi.fn().mockResolvedValue({ skills: [], experience: [], education: [], summary: '', raw_text: 'test' }),
        }),
      };

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ success: false, error: 'ML error' }),
      }));

      const result = await service.atsCheck('u-1', 'Some job description', 'cv-1');

      expect((result as any).status).toBe(500);
      expect((result as any).error).toBe('ML error');
      vi.unstubAllGlobals();
    });
  });

  describe('atsPreview', () => {
    it('returns 404 when job is not found', async () => {
      db.job.findUnique.mockResolvedValue(null);

      const result = await service.atsPreview('u-1', 'job-missing');

      expect(result).toEqual({ error: 'Job not found', status: 404 });
    });

    it('returns 404 when cv is not found for the user', async () => {
      db.job.findUnique.mockResolvedValue({ id: 'job-1', description: 'React dev', requirements: null, skills: [] });
      db.cV.findUnique.mockResolvedValue(null);

      const result = await service.atsPreview('u-1', 'job-1', 'cv-missing');

      expect(result).toEqual({ error: 'CV not found', status: 404 });
    });

    it('returns 400 when cv has no parsed mongoDocId', async () => {
      db.job.findUnique.mockResolvedValue({ id: 'job-1', description: 'React dev', requirements: null, skills: [] });
      db.cV.findUnique.mockResolvedValue({ id: 'cv-1', userId: 'u-1', mongoDocId: null });

      const result = await service.atsPreview('u-1', 'job-1', 'cv-1');

      expect(result).toEqual({ error: 'Parsed CV data not available', status: 400 });
    });

    it('returns 404 when CV data not in mongodb', async () => {
      db.job.findUnique.mockResolvedValue({ id: 'job-1', description: 'React dev', requirements: null, skills: [] });
      db.cV.findUnique.mockResolvedValue({ id: 'cv-1', userId: 'u-1', mongoDocId: 'mongo-1' });

      const mongoose = await import('mongoose');
      (mongoose.default.connection as any).readyState = 0;

      const result = await service.atsPreview('u-1', 'job-1', 'cv-1');

      expect(result).toEqual({ error: 'Parsed CV data not found', status: 404 });
      (mongoose.default.connection as any).readyState = 1;
    });
  });

  describe('atsScore', () => {
    it('returns 404 when application is not found', async () => {
      db.application.findUnique.mockResolvedValue(null);

      const result = await service.atsScore('u-1', 'app-missing');

      expect(result).toEqual({ error: 'Application not found', status: 404 });
    });

    it('returns 404 when application belongs to another user', async () => {
      db.application.findUnique.mockResolvedValue({ id: 'app-1', userId: 'other-user', job: null });

      const result = await service.atsScore('u-1', 'app-1');

      expect(result).toEqual({ error: 'Application not found', status: 404 });
    });

    it('returns 400 when application has no linked job', async () => {
      db.application.findUnique.mockResolvedValue({ id: 'app-1', userId: 'u-1', job: null });

      const result = await service.atsScore('u-1', 'app-1');

      expect((result as any).status).toBe(400);
    });

    it('returns 400 when no CV is linked to the application', async () => {
      db.application.findUnique.mockResolvedValue({
        id: 'app-1', userId: 'u-1', cvId: null,
        job: { id: 'job-1', description: 'Test', requirements: null, skills: [] },
      });
      db.cV.findFirst.mockResolvedValue(null);

      const result = await service.atsScore('u-1', 'app-1');

      expect((result as any).status).toBe(400);
    });

    it('returns 400 when cv has no parsed mongoDocId', async () => {
      db.application.findUnique.mockResolvedValue({
        id: 'app-1', userId: 'u-1', cvId: 'cv-1',
        job: { id: 'job-1', description: 'Test', requirements: null, skills: [] },
      });
      db.cV.findUnique.mockResolvedValue({ id: 'cv-1', userId: 'u-1', mongoDocId: null });

      const result = await service.atsScore('u-1', 'app-1');

      expect(result).toEqual({ error: 'Parsed CV data not available for analysis', status: 400 });
    });

    it('returns 404 when MongoDB is unavailable when fetching cv data', async () => {
      db.application.findUnique.mockResolvedValue({
        id: 'app-1', userId: 'u-1', cvId: 'cv-1',
        job: { id: 'job-1', description: 'Test', requirements: null, skills: [] },
      });
      db.cV.findUnique.mockResolvedValue({ id: 'cv-1', userId: 'u-1', mongoDocId: 'mongo-1' });

      const mongoose = await import('mongoose');
      (mongoose.default.connection as any).readyState = 0;

      const result = await service.atsScore('u-1', 'app-1');

      expect(result).toEqual({ error: 'Parsed CV data not found in database', status: 404 });
      (mongoose.default.connection as any).readyState = 1;
    });

    it('returns success data and updates application when ML service succeeds', async () => {
      db.application.findUnique.mockResolvedValue({
        id: 'app-1', userId: 'u-1', cvId: 'cv-1',
        job: { id: 'job-1', description: 'React dev role', requirements: 'TypeScript', skills: ['react', 'typescript'] },
      });
      db.cV.findUnique.mockResolvedValue({ id: 'cv-1', userId: 'u-1', mongoDocId: 'mongo-1' });
      db.application.update.mockResolvedValue({});

      const mongoose = await import('mongoose');
      (mongoose.default.connection as any).readyState = 1;
      (mongoose.default.connection as any).db = {
        collection: () => ({
          findOne: vi.fn().mockResolvedValue({ skills: ['react'], experience: [], education: [], summary: '', raw_text: 'React developer' }),
        }),
      };

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { atsScore: 88, breakdown: {}, keywordsMatched: ['react'], keywordsMissing: [] },
        }),
      }));

      const result = await service.atsScore('u-1', 'app-1');

      expect((result as any).data.atsScore).toBe(88);
      expect(db.application.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'app-1' } })
      );
      vi.unstubAllGlobals();
    });

    it('returns 500 error when ML service fails in atsScore', async () => {
      db.application.findUnique.mockResolvedValue({
        id: 'app-1', userId: 'u-1', cvId: 'cv-1',
        job: { id: 'job-1', description: 'Test role', requirements: null, skills: [] },
      });
      db.cV.findUnique.mockResolvedValue({ id: 'cv-1', userId: 'u-1', mongoDocId: 'mongo-1' });

      const mongoose = await import('mongoose');
      (mongoose.default.connection as any).readyState = 1;
      (mongoose.default.connection as any).db = {
        collection: () => ({
          findOne: vi.fn().mockResolvedValue({ skills: [], experience: [], education: [], summary: '', raw_text: 'test' }),
        }),
      };

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ success: false, error: 'ML scoring failed' }),
      }));

      const result = await service.atsScore('u-1', 'app-1');

      expect((result as any).status).toBe(500);
      vi.unstubAllGlobals();
    });
  });
});
