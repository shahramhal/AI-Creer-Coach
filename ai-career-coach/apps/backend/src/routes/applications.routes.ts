// apps/backend/src/routes/applications.routes.ts
import { Router } from 'express';
import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { authenticate } from '../middlewares/auth.middleware.js';
import { prisma } from '../config/database.js';
import { logUserActivity } from '../utils/activity.util.js';

const router = Router();

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://ml-service:8000';
const ML_REQUEST_TIMEOUT_MS = 30_000;

/** Fetch raw CV text and parsed data from MongoDB */
async function fetchCVDataFromMongo(mongoDocId: string): Promise<{
  rawText: string;
  parsedData: Record<string, any>;
} | null> {
  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
    return null;
  }
  if (!mongoose.Types.ObjectId.isValid(mongoDocId)) {
    return null;
  }
  const mongoCollection = mongoose.connection.db.collection('parsed_cvs');
  const doc = await mongoCollection.findOne({
    _id: new mongoose.Types.ObjectId(mongoDocId),
  });
  if (!doc) return null;

  let rawText = doc.raw_text || doc.metadata?.raw_text || '';
  const parsedData = {
    contact_info: doc.contact_info || {},
    summary: doc.summary || '',
    experience: doc.experience || [],
    education: doc.education || [],
    skills: doc.skills || [],
    certifications: doc.certifications || [],
    projects: doc.projects || [],
  };

  // If no raw_text stored, build from parsed fields
  if (!rawText) {
    const textParts: string[] = [];
    if (parsedData.summary) textParts.push(parsedData.summary);
    if (parsedData.skills?.length) textParts.push(`Skills: ${parsedData.skills.join(', ')}`);
    for (const exp of parsedData.experience as any[]) {
      const parts = [exp.title, exp.company, ...(exp.responsibilities || [])].filter(Boolean);
      if (parts.length) textParts.push(parts.join(' - '));
    }
    for (const edu of parsedData.education as any[]) {
      const parts = [edu.degree, edu.institution, edu.field].filter(Boolean);
      if (parts.length) textParts.push(parts.join(' - '));
    }
    rawText = textParts.join('\n');
  }

  return { rawText, parsedData };
}

/** Helper: fetch from ML service with timeout */
async function fetchMLService(path: string, body: Record<string, any>): Promise<globalThis.Response> {
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), ML_REQUEST_TIMEOUT_MS);

  try {
    return await fetch(`${ML_SERVICE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: abortController.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

const VALID_STATUSES = ['applied', 'interview', 'offer', 'rejected'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Create a new application (track that the user applied for a job)
 */
router.post(
  '/',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { company, jobTitle, sourceUrl, location, notes } = req.body;

      if (!company || typeof company !== 'string' || !company.trim()) {
        res.status(400).json({ success: false, message: 'Company is required' });
        return;
      }
      if (!jobTitle || typeof jobTitle !== 'string' || !jobTitle.trim()) {
        res.status(400).json({ success: false, message: 'Job title is required' });
        return;
      }
      if (company.trim().length > 255) {
        res.status(400).json({ success: false, message: 'Company name must be under 255 characters' });
        return;
      }
      if (jobTitle.trim().length > 255) {
        res.status(400).json({ success: false, message: 'Job title must be under 255 characters' });
        return;
      }
      if (notes && typeof notes === 'string' && notes.length > 5000) {
        res.status(400).json({ success: false, message: 'Notes must be under 5000 characters' });
        return;
      }

      const trimmedCompany = company.trim();
      const trimmedTitle = jobTitle.trim();

      const application = await prisma.$transaction(async (tx) => {
        const existing = await tx.application.findFirst({
          where: {
            userId,
            company: { equals: trimmedCompany, mode: 'insensitive' },
            jobTitle: { equals: trimmedTitle, mode: 'insensitive' },
          },
        });

        if (existing) return null;

        return tx.application.create({
          data: {
            userId,
            company: trimmedCompany,
            jobTitle: trimmedTitle,
            sourceUrl: sourceUrl?.trim() || null,
            location: location?.trim() || null,
            notes: notes?.trim() || null,
            status: 'applied',
          },
        });
      });

      if (!application) {
        res.status(409).json({
          success: false,
          message: 'You have already tracked an application for this position',
        });
        return;
      }

      logUserActivity(userId, 'application', 'Application Tracked', `${jobTitle} at ${company}`);

      res.status(201).json({
        success: true,
        message: 'Application tracked successfully',
        data: application,
      });
    } catch (error) {
      console.error('Error creating application:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create application',
      });
    }
  }
);

/**
 * List all applications for the authenticated user
 */
router.get(
  '/',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { status } = req.query;

      const where: any = { userId };
      if (status && typeof status === 'string' && VALID_STATUSES.includes(status)) {
        where.status = status;
      }

      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
      const skip = (page - 1) * limit;

      const [applications, total] = await prisma.$transaction([
        prisma.application.findMany({
          where,
          orderBy: { appliedDate: 'desc' },
          skip,
          take: limit,
        }),
        prisma.application.count({ where }),
      ]);

      res.json({
        success: true,
        message: 'Applications retrieved',
        data: applications,
        meta: { total, page, limit, pages: Math.ceil(total / limit) },
      });
    } catch (error) {
      console.error('Error fetching applications:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch applications',
      });
    }
  }
);

/**
 * Get application stats for the dashboard
 */
router.get(
  '/stats',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;

      const applications = await prisma.application.groupBy({
        by: ['status'],
        where: { userId },
        _count: { status: true },
      });

      const byStatus = { applied: 0, interview: 0, offer: 0, rejected: 0 };
      let total = 0;
      for (const group of applications) {
        const key = group.status as keyof typeof byStatus;
        if (key in byStatus) {
          byStatus[key] = group._count.status;
        }
        total += group._count.status;
      }

      const responseRate = total > 0
        ? Math.round(((byStatus.interview + byStatus.offer) / total) * 100)
        : 0;

      res.json({
        success: true,
        message: 'Application stats retrieved',
        data: { total, byStatus, responseRate },
      });
    } catch (error) {
      console.error('Error fetching application stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch application stats',
      });
    }
  }
);

/**
 * Update application status
 */
router.patch(
  '/:id/status',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const { status } = req.body;

      if (!UUID_RE.test(id)) {
        res.status(404).json({ success: false, message: 'Application not found' });
        return;
      }

      if (!status || !VALID_STATUSES.includes(status)) {
        res.status(400).json({
          success: false,
          message: `Status must be one of: ${VALID_STATUSES.join(', ')}`,
        });
        return;
      }

      const application = await prisma.application.findUnique({ where: { id } });
      if (!application || application.userId !== userId) {
        res.status(404).json({ success: false, message: 'Application not found' });
        return;
      }

      const updated = await prisma.application.update({
        where: { id },
        data: { status },
      });

      res.json({
        success: true,
        message: 'Application status updated',
        data: updated,
      });
    } catch (error) {
      console.error('Error updating application status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update application status',
      });
    }
  }
);

/**
 * Delete an application
 */
router.delete(
  '/:id',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      if (!UUID_RE.test(id)) {
        res.status(404).json({ success: false, message: 'Application not found' });
        return;
      }

      const application = await prisma.application.findUnique({ where: { id } });
      if (!application || application.userId !== userId) {
        res.status(404).json({ success: false, message: 'Application not found' });
        return;
      }

      await prisma.application.delete({ where: { id } });

      res.json({
        success: true,
        message: 'Application deleted',
      });
    } catch (error) {
      console.error('Error deleting application:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete application',
      });
    }
  }
);

// Static ATS routes MUST come before parameterised routes
// Otherwise Express matches "/ats-check" as ":applicationId"

/**
 * ATS check with raw job description text
 * No Job or Application record needed - user pastes job description directly
 */
router.post(
  '/ats-check',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { jobDescription, cvId } = req.body;

      if (
        !jobDescription ||
        typeof jobDescription !== 'string' ||
        jobDescription.trim().length < 20 ||
        jobDescription.length > 10_000
      ) {
        res.status(400).json({
          success: false,
          message: 'Job description must be between 20 and 10,000 characters',
        });
        return;
      }

      // Use specified CV or primary CV
      let cvRecord;
      if (cvId) {
        cvRecord = await prisma.cV.findUnique({ where: { id: cvId } });
        if (!cvRecord || cvRecord.userId !== userId) {
          res.status(404).json({ success: false, message: 'CV not found' });
          return;
        }
      } else {
        cvRecord = await prisma.cV.findFirst({
          where: { userId, isPrimary: true },
        });
        if (!cvRecord) {
          res.status(400).json({
            success: false,
            message: 'No primary CV set. Upload a CV first.',
          });
          return;
        }
      }

      if (!cvRecord.mongoDocId) {
        res.status(400).json({
          success: false,
          message: 'Parsed CV data not available for analysis',
        });
        return;
      }

      const cvData = await fetchCVDataFromMongo(cvRecord.mongoDocId);
      if (!cvData) {
        res.status(404).json({
          success: false,
          message: 'Parsed CV data not found in database',
        });
        return;
      }

      console.log(`ATS check: CV ${cvRecord.id}, raw job description (${jobDescription.length} chars)`);

      const mlResponse = await fetchMLService('/api/ml/ats-score', {
        cv_text: cvData.rawText,
        parsed_data: cvData.parsedData,
        job_description: jobDescription.trim(),
        job_requirements: '',
        job_skills: [],
      });

      const mlData = await mlResponse.json();

      if (!mlResponse.ok || !mlData.success) {
        console.error('ATS check error:', mlData);
        res.status(500).json({
          success: false,
          message: mlData.error || 'ATS check failed',
        });
        return;
      }

      logUserActivity(userId, 'ats_check', 'ATS Score Checked', `Score: ${mlData.data?.atsScore ?? 'N/A'}/100`);

      res.json({
        success: true,
        message: 'ATS score calculated',
        data: mlData.data,
      });
    } catch (error) {
      console.error('Error in ATS check:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check ATS score',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * Preview ATS score for a job (without persisting)
 * Uses the user's primary CV
 */
router.post(
  '/jobs/:jobId/ats-preview',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { jobId } = req.params;

      if (!jobId) {
        res.status(400).json({ success: false, message: 'Job ID is required' });
        return;
      }

      // Fetch job
      const job = await prisma.job.findUnique({ where: { id: jobId } });
      if (!job) {
        res.status(404).json({ success: false, message: 'Job not found' });
        return;
      }

      // Use specified CV or primary CV
      const cvId = req.body?.cvId;
      let cvRecord;

      if (cvId) {
        cvRecord = await prisma.cV.findUnique({ where: { id: cvId } });
        if (!cvRecord || cvRecord.userId !== userId) {
          res.status(404).json({ success: false, message: 'CV not found' });
          return;
        }
      } else {
        cvRecord = await prisma.cV.findFirst({
          where: { userId, isPrimary: true },
        });
        if (!cvRecord) {
          res.status(400).json({
            success: false,
            message: 'No primary CV set. Upload a CV first.',
          });
          return;
        }
      }

      if (!cvRecord.mongoDocId) {
        res.status(400).json({
          success: false,
          message: 'Parsed CV data not available',
        });
        return;
      }

      const cvData = await fetchCVDataFromMongo(cvRecord.mongoDocId);
      if (!cvData) {
        res.status(404).json({
          success: false,
          message: 'Parsed CV data not found',
        });
        return;
      }

      const rawJobSkills = Array.isArray(job.skills) ? job.skills : [];
      const jobSkills = rawJobSkills.filter((s): s is string => typeof s === 'string');

      // Call ML service (don't persist result)
      const mlResponse = await fetchMLService('/api/ml/ats-score', {
        cv_text: cvData.rawText,
        parsed_data: cvData.parsedData,
        job_description: job.description,
        job_requirements: job.requirements || '',
        job_skills: jobSkills,
      });

      const mlData = await mlResponse.json();

      if (!mlResponse.ok || !mlData.success) {
        console.error('ATS preview error:', mlData);
        res.status(500).json({
          success: false,
          message: mlData.error || 'ATS preview failed',
        });
        return;
      }

      res.json({
        success: true,
        message: 'ATS preview calculated',
        data: mlData.data,
      });
    } catch (error) {
      console.error('Error previewing ATS score:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to preview ATS score',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * Calculate ATS score for an application
 * Compares the CV against the job description
 */
router.post(
  '/:applicationId/ats-score',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { applicationId } = req.params;

      if (!applicationId) {
        res.status(400).json({ success: false, message: 'Application ID is required' });
        return;
      }

      // Fetch application and verify ownership
      const application = await prisma.application.findUnique({
        where: { id: applicationId },
        include: { job: true },
      });

      if (!application || application.userId !== userId) {
        res.status(404).json({ success: false, message: 'Application not found' });
        return;
      }

      if (!application.job) {
        res.status(400).json({
          success: false,
          message: 'Application must be linked to a job for ATS scoring',
        });
        return;
      }

      // Determine which CV to use: explicit cvId from body/application, or user's primary CV
      const cvId = req.body?.cvId || application.cvId;
      let cvRecord;

      if (cvId) {
        cvRecord = await prisma.cV.findUnique({ where: { id: cvId } });
        if (!cvRecord || cvRecord.userId !== userId) {
          res.status(404).json({ success: false, message: 'CV not found' });
          return;
        }
      } else {
        // Fall back to user's primary CV
        cvRecord = await prisma.cV.findFirst({
          where: { userId, isPrimary: true },
        });
        if (!cvRecord) {
          res.status(400).json({
            success: false,
            message: 'No CV linked to this application. Upload a CV or set a primary CV.',
          });
          return;
        }
      }

      // Fetch parsed CV data from MongoDB
      if (!cvRecord.mongoDocId) {
        res.status(400).json({
          success: false,
          message: 'Parsed CV data not available for analysis',
        });
        return;
      }

      const cvData = await fetchCVDataFromMongo(cvRecord.mongoDocId);
      if (!cvData) {
        res.status(404).json({
          success: false,
          message: 'Parsed CV data not found in database',
        });
        return;
      }

      // Extract job skills from the Job record
      const rawSkills = Array.isArray(application.job.skills) ? application.job.skills : [];
      const jobSkills = rawSkills.filter((s): s is string => typeof s === 'string');

      console.log(
        `ATS scoring: Application ${applicationId}, CV ${cvRecord.id}, Job ${application.job.id}`
      );

      // Call ML service for ATS scoring
      const mlResponse = await fetchMLService('/api/ml/ats-score', {
        cv_text: cvData.rawText,
        parsed_data: cvData.parsedData,
        job_description: application.job.description,
        job_requirements: application.job.requirements || '',
        job_skills: jobSkills,
      });

      const mlData = await mlResponse.json();

      if (!mlResponse.ok || !mlData.success) {
        console.error('ATS scoring error:', mlData);
        res.status(500).json({
          success: false,
          message: mlData.error || 'ATS scoring failed',
        });
        return;
      }

      const atsResult = mlData.data;

      // Store results in the Application record
      await prisma.application.update({
        where: { id: applicationId },
        data: {
          cvId: cvRecord.id,
          atsScore: atsResult.atsScore,
          atsBreakdown: atsResult.breakdown,
          keywordsMatched: atsResult.keywordsMatched,
          keywordsMissing: atsResult.keywordsMissing,
          atsAnalyzedAt: new Date(),
        },
      });

      console.log(
        `ATS score stored: Application ${applicationId}, score=${atsResult.atsScore}/100`
      );

      res.json({
        success: true,
        message: 'ATS score calculated successfully',
        data: atsResult,
      });
    } catch (error) {
      console.error('Error calculating ATS score:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to calculate ATS score',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router;
