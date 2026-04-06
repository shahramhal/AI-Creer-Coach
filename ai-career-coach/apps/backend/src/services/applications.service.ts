import mongoose from 'mongoose';
import { prisma } from '../config/database.js';
import { buildCVText } from '../utils/cv-text.util.js';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://ml-service:8000';
const ML_REQUEST_TIMEOUT_MS = 30_000;

export const VALID_STATUSES = ['applied', 'interview', 'offer', 'rejected'];
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface CVData {
  rawText: string;
  parsedData: Record<string, any>;
}

export interface ApplicationStats {
  total: number;
  byStatus: { applied: number; interview: number; offer: number; rejected: number };
  responseRate: number;
}

async function fetchCVDataFromMongo(mongoDocId: string): Promise<CVData | null> {
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

  const parsedData = {
    contact_info: doc.contact_info || {},
    summary: doc.summary || '',
    experience: doc.experience || [],
    education: doc.education || [],
    skills: doc.skills || [],
    certifications: doc.certifications || [],
    projects: doc.projects || [],
  };

  return { rawText: buildCVText(doc), parsedData };
}

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

export class ApplicationsService {
  async createApplication(
    userId: string,
    data: { company: string; jobTitle: string; sourceUrl?: string; location?: string; notes?: string }
  ) {
    const trimmedCompany = data.company.trim();
    const trimmedTitle = data.jobTitle.trim();

    return prisma.$transaction(async (tx) => {
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
          sourceUrl: data.sourceUrl?.trim() || null,
          location: data.location?.trim() || null,
          notes: data.notes?.trim() || null,
          status: 'applied',
        },
      });
    });
  }

  async listApplications(
    userId: string,
    filters: { status?: string; page: number; limit: number }
  ) {
    const where: any = { userId };
    if (filters.status && VALID_STATUSES.includes(filters.status)) {
      where.status = filters.status;
    }

    const skip = (filters.page - 1) * filters.limit;

    const [applications, total] = await prisma.$transaction([
      prisma.application.findMany({
        where,
        orderBy: { appliedDate: 'desc' },
        skip,
        take: filters.limit,
      }),
      prisma.application.count({ where }),
    ]);

    return { applications, total };
  }

  async getStats(userId: string): Promise<ApplicationStats> {
    const groups = await prisma.application.groupBy({
      by: ['status'],
      where: { userId },
      _count: { status: true },
    });

    const byStatus = { applied: 0, interview: 0, offer: 0, rejected: 0 };
    let total = 0;
    for (const group of groups) {
      const key = group.status as keyof typeof byStatus;
      if (key in byStatus) {
        byStatus[key] = group._count.status;
      }
      total += group._count.status;
    }

    const responseRate =
      total > 0 ? Math.round(((byStatus.interview + byStatus.offer) / total) * 100) : 0;

    return { total, byStatus, responseRate };
  }

  async updateStatus(userId: string, id: string, status: string) {
    const application = await prisma.application.findUnique({ where: { id } });
    if (!application || application.userId !== userId) return null;

    return prisma.application.update({ where: { id }, data: { status } });
  }

  async deleteApplication(userId: string, id: string): Promise<boolean> {
    const application = await prisma.application.findUnique({ where: { id } });
    if (!application || application.userId !== userId) return false;

    await prisma.application.delete({ where: { id } });
    return true;
  }

  async resolveCV(userId: string, cvId?: string) {
    if (cvId) {
      const cv = await prisma.cV.findUnique({ where: { id: cvId } });
      if (!cv || cv.userId !== userId) return null;
      return cv;
    }
    return prisma.cV.findFirst({ where: { userId, isPrimary: true } });
  }

  async atsCheck(
    userId: string,
    jobDescription: string,
    cvId?: string
  ): Promise<{ atsScore?: number; data: any } | { error: string; status: number }> {
    const cvRecord = await this.resolveCV(userId, cvId);
    if (!cvRecord) {
      return cvId
        ? { error: 'CV not found', status: 404 }
        : { error: 'No primary CV set. Upload a CV first.', status: 400 };
    }

    if (!cvRecord.mongoDocId) {
      return { error: 'Parsed CV data not available for analysis', status: 400 };
    }

    const cvData = await fetchCVDataFromMongo(cvRecord.mongoDocId);
    if (!cvData) {
      return { error: 'Parsed CV data not found in database', status: 404 };
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
      return { error: mlData.error || 'ATS check failed', status: 500 };
    }

    return { data: mlData.data, atsScore: mlData.data?.atsScore };
  }

  async atsPreview(
    userId: string,
    jobId: string,
    cvId?: string
  ): Promise<{ data: any } | { error: string; status: number }> {
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) return { error: 'Job not found', status: 404 };

    const cvRecord = await this.resolveCV(userId, cvId);
    if (!cvRecord) {
      return cvId
        ? { error: 'CV not found', status: 404 }
        : { error: 'No primary CV set. Upload a CV first.', status: 400 };
    }

    if (!cvRecord.mongoDocId) {
      return { error: 'Parsed CV data not available', status: 400 };
    }

    const cvData = await fetchCVDataFromMongo(cvRecord.mongoDocId);
    if (!cvData) return { error: 'Parsed CV data not found', status: 404 };

    const rawJobSkills = Array.isArray(job.skills) ? job.skills : [];
    const jobSkills = rawJobSkills.filter((s): s is string => typeof s === 'string');

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
      return { error: mlData.error || 'ATS preview failed', status: 500 };
    }

    return { data: mlData.data };
  }

  async atsScore(
    userId: string,
    applicationId: string,
    cvId?: string
  ): Promise<{ data: any } | { error: string; status: number }> {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { job: true },
    });

    if (!application || application.userId !== userId) {
      return { error: 'Application not found', status: 404 };
    }

    if (!application.job) {
      return {
        error: 'Application must be linked to a job for ATS scoring',
        status: 400,
      };
    }

    const resolvedCvId = cvId || application.cvId || undefined;
    const cvRecord = await this.resolveCV(userId, resolvedCvId);
    if (!cvRecord) {
      return {
        error: 'No CV linked to this application. Upload a CV or set a primary CV.',
        status: 400,
      };
    }

    if (!cvRecord.mongoDocId) {
      return { error: 'Parsed CV data not available for analysis', status: 400 };
    }

    const cvData = await fetchCVDataFromMongo(cvRecord.mongoDocId);
    if (!cvData) {
      return { error: 'Parsed CV data not found in database', status: 404 };
    }

    const rawSkills = Array.isArray(application.job.skills) ? application.job.skills : [];
    const jobSkills = rawSkills.filter((s): s is string => typeof s === 'string');

    console.log(
      `ATS scoring: Application ${applicationId}, CV ${cvRecord.id}, Job ${application.job.id}`
    );

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
      return { error: mlData.error || 'ATS scoring failed', status: 500 };
    }

    const atsResult = mlData.data;

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

    console.log(`ATS score stored: Application ${applicationId}, score=${atsResult.atsScore}/100`);

    return { data: atsResult };
  }
}
