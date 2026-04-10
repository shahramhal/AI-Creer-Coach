import mongoose from 'mongoose';
import { cache } from '../config/database.js';
import { AppError, ErrorCodes } from '../utils/app-error.util.js';
import { type IParsedCV } from '../models/ParsedCV.js';
import { buildCVText } from '../utils/cv-text.util.js';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://ml-service:8000';

function escapeRegex(rawInput: string): string {
  return rawInput.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

interface JobMatchRequest {
  cv_id?: string;
  filters?: {
    location?: string;
    country?: string;
    city?: string;
    job_type?: string | string[];
    experience_level?: string;
    title_keywords?: string;
    min_salary?: number;
    remote_type?: string | string[];
  };
  top_k?: number;
  job_limit?: number;
}

interface JobDocument {
  job_id: string;
  source: string;
  title: string;
  company: string;
  location: string;
  description: string;
  requirements?: string[];
  salary_min?: number;
  salary_max?: number;
  source_url: string;
  posted_date?: string;
  job_type?: string;
  remote_type?: string;
  experience_level?: string;
  country?: string;
  expiration_date?: string;
}

type CVDocument = IParsedCV;

export interface FindJobMatchesResult {
  matched_jobs: any[];
  total_analyzed: number;
  user_cv: { name: string | undefined; uploaded_at: Date | undefined };
  cached: boolean;
}

class MatchingService {
  async findJobMatches(
    userId: string,
    opts: {
      cv_id?: string;
      filters?: JobMatchRequest['filters'];
      top_k?: number;
      job_limit?: number;
    },
  ): Promise<FindJobMatchesResult> {
    const { cv_id, filters, top_k = 20, job_limit = 1000 } = opts;

    const effectiveJobLimit = Math.max(100, Math.min(job_limit, 2000));

    console.log(` [Matching] Starting job match for user: ${userId} (analyzing up to ${effectiveJobLimit} jobs)`);

    if (mongoose.connection.readyState !== 1) {
      console.error(` [Matching] MongoDB not connected. State: ${mongoose.connection.readyState}`);
      throw new AppError(
        'Database is temporarily unavailable. Please try again in a moment.',
        503,
        ErrorCodes.INTERNAL_ERROR,
      );
    }

    const db = mongoose.connection.db;
    if (!db) {
      throw new AppError(
        'Database connection not established. Please try again.',
        503,
        ErrorCodes.INTERNAL_ERROR,
      );
    }

    console.log(`📄 [Matching] Fetching CV for user: ${userId}`);
    const userCV = await this.fetchUserCV(db, userId, cv_id);
    if (!userCV) {
      console.log(`⚠️ [Matching] No CV found for user: ${userId}`);
      throw new AppError(
        'No CV found for your account. Please upload your CV first to get personalized job matches.',
        404,
        ErrorCodes.NOT_FOUND,
      );
    }

    console.log(` [Matching] Found CV for user: ${userId}`);

    const jobs = await this.fetchJobs(db, effectiveJobLimit, filters);
    const jobCount = jobs.length;

    if (jobCount === 0) {
      const activeFilterParts: string[] = [];
      if (filters?.title_keywords) activeFilterParts.push(`title "${filters.title_keywords}"`);
      if (filters?.country) activeFilterParts.push(`country "${filters.country}"`);
      if (filters?.city) activeFilterParts.push(`location "${filters.city}"`);
      if (filters?.job_type) activeFilterParts.push(`type "${filters.job_type}"`);
      if (filters?.experience_level) activeFilterParts.push(`level "${filters.experience_level}"`);
      if (filters?.remote_type) activeFilterParts.push(`remote "${filters.remote_type}"`);
      if (filters?.min_salary) activeFilterParts.push(`min salary ${filters.min_salary}`);

      const filterDesc = activeFilterParts.length > 0
        ? `matching ${activeFilterParts.join(', ')}`
        : 'in our database';

      const message = `No jobs found ${filterDesc}. Try broadening your filters or check back later as new listings are added regularly.`;
      console.log(`⚠️ [Matching] ${message}`);
      throw new AppError(message, 404, ErrorCodes.NO_JOBS);
    }

    console.log(`📊 [Matching] Found ${jobCount} jobs in database`);

    const cvRawText = buildCVText(userCV);
    if (!userCV.raw_text && !userCV.metadata?.raw_text) {
      console.log(`⚠️ [Matching] No raw_text, built from CV fields (${cvRawText.length} chars)`);
    }

    if (!cvRawText || cvRawText.length < 10) {
      console.error(` [Matching] CV found but no usable text content`);
      throw new AppError(
        'Your CV was found but has no usable content for matching. Please re-upload your CV.',
        404,
        ErrorCodes.NOT_FOUND,
      );
    }

    const filterHash = filters ? Buffer.from(JSON.stringify(filters)).toString('base64url') : 'none';
    const cvTimestamp = userCV.created_at ? new Date(userCV.created_at).getTime() : 'unknown';
    const matchCacheKey = `match:user:${userId}:cv:${cvTimestamp}:topk:${top_k}:limit:${effectiveJobLimit}:filters:${filterHash}`;

    const cachedMatchResult = await cache.get<any[]>(matchCacheKey);
    if (cachedMatchResult) {
      console.log(`📦 [Matching] Cache HIT! Returning ${cachedMatchResult.length} cached matches`);
      return {
        matched_jobs: cachedMatchResult,
        total_analyzed: jobCount,
        user_cv: {
          name: userCV.contact_info?.name,
          uploaded_at: userCV.created_at,
        },
        cached: true,
      };
    }

    console.log(` [Matching] Calling ML service for matching...`);
    const matchedJobs = await this.getMLMatches(cvRawText, jobs, top_k, filters);

    await cache.set(matchCacheKey, matchedJobs, 3600);
    console.log(`📦 [Matching] Results cached (TTL: 1hr)`);

    return {
      matched_jobs: matchedJobs,
      total_analyzed: jobCount,
      user_cv: {
        name: userCV.contact_info?.name,
        uploaded_at: userCV.created_at,
      },
      cached: false,
    };
  }

  async getDiagnostics(userId: string): Promise<Record<string, any>> {
    const diagnostics: Record<string, any> = {
      timestamp: new Date().toISOString(),
      checks: {},
    };

    diagnostics.checks.mongodb = {
      connected: mongoose.connection.readyState === 1,
      state: mongoose.connection.readyState,
    };

    if (mongoose.connection.db) {
      const db = mongoose.connection.db;
      const cvCollection = db.collection<CVDocument>('parsed_cvs');
      const userCV = await cvCollection.findOne({ user_id: userId }, { sort: { created_at: -1 } });
      diagnostics.checks.user_cv = {
        exists: !!userCV,
        cv_id: userCV?.cv_id,
        has_raw_text: !!userCV?.raw_text,
        created_at: userCV?.created_at,
      };

      const jobsCollection = db.collection('jobs');
      const jobCount = await jobsCollection.countDocuments({});
      diagnostics.checks.jobs = {
        total_count: jobCount,
        has_jobs: jobCount > 0,
      };
    }

    try {
      const mlResponse = await fetch(`${ML_SERVICE_URL}/health`, { method: 'GET' });
      diagnostics.checks.ml_service = {
        reachable: mlResponse.ok,
        status: mlResponse.status,
      };
    } catch (mlError) {
      diagnostics.checks.ml_service = {
        reachable: false,
        error: mlError instanceof Error ? mlError.message : 'Unknown error',
      };
    }

    diagnostics.ready =
      diagnostics.checks.mongodb?.connected &&
      diagnostics.checks.user_cv?.exists &&
      diagnostics.checks.jobs?.has_jobs &&
      diagnostics.checks.ml_service?.reachable;

    diagnostics.issues = [];
    if (!diagnostics.checks.mongodb?.connected) {
      diagnostics.issues.push('MongoDB is not connected');
    }
    if (!diagnostics.checks.user_cv?.exists) {
      diagnostics.issues.push('No CV uploaded - please upload your CV at /cvs');
    }
    if (!diagnostics.checks.jobs?.has_jobs) {
      diagnostics.issues.push('No jobs in database - job fetching service may need to run');
    }
    if (!diagnostics.checks.ml_service?.reachable) {
      diagnostics.issues.push('ML service is not reachable');
    }

    return diagnostics;
  }

  private async fetchUserCV(
    db: mongoose.mongo.Db,
    userId: string,
    cvId?: string,
  ): Promise<CVDocument | null> {
    const cvCollection = db.collection<CVDocument>('parsed_cvs');

    const query: any = { user_id: userId };
    if (cvId) {
      query.cv_id = cvId;
    }

    return await cvCollection.findOne(query, { sort: { created_at: -1 } });
  }

  private async fetchJobs(
    db: mongoose.mongo.Db,
    limit: number = 1000,
    userFilters?: JobMatchRequest['filters'],
  ): Promise<JobDocument[]> {
    const filterHash = userFilters
      ? Buffer.from(JSON.stringify(userFilters)).toString('base64url')
      : 'none';
    const cacheKey = `jobs:list:${limit}:f:${filterHash}`;

    const cachedJobs = await cache.get<JobDocument[]>(cacheKey);
    if (cachedJobs && cachedJobs.length > 0) {
      console.log(`📦 [Matching] Jobs cache HIT (${cachedJobs.length} jobs)`);
      return cachedJobs;
    }

    const jobsCollection = db.collection<JobDocument>('jobs');

    const projection = {
      job_id: 1,
      source: 1,
      title: 1,
      company: 1,
      location: 1,
      description: 1,
      requirements: 1,
      salary_min: 1,
      salary_max: 1,
      source_url: 1,
      posted_date: 1,
      job_type: 1,
      remote_type: 1,
      experience_level: 1,
      country: 1,
    };

    const maxAgeDays = 14;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);
    const cutoffISO = cutoffDate.toISOString();

    const nowISO = new Date().toISOString();

    const andConditions: Record<string, any>[] = [
      {
        $or: [
          { $and: [{ posted_date: { $regex: /^\d{4}-/ } }, { posted_date: { $gte: cutoffISO } }] },
          { $and: [{ posted_date: { $exists: true, $nin: [null, ''] } }, { posted_date: { $not: { $regex: /^\d{4}-/ } } }, { scraped_at: { $gte: cutoffDate } }] },
          { posted_date: { $in: ['', null] }, scraped_at: { $gte: cutoffDate } },
          { posted_date: { $exists: false }, scraped_at: { $gte: cutoffDate } },
        ],
      },
      {
        $or: [
          { expiration_date: { $exists: false } },
          { expiration_date: { $in: ['', null] } },
          { expiration_date: { $gte: nowISO } },
        ],
      },
    ];

    if (userFilters) {
      if (userFilters.country) {
        andConditions.push({ country: { $regex: `^${escapeRegex(userFilters.country)}$`, $options: 'i' } });
      }
      if (userFilters.city) {
        andConditions.push({ location: { $regex: escapeRegex(userFilters.city), $options: 'i' } });
      }
      if (userFilters.job_type) {
        const jobTypeValues = Array.isArray(userFilters.job_type) ? userFilters.job_type : [userFilters.job_type];
        const jobTypeRegexPatterns = jobTypeValues.map((value) => new RegExp(escapeRegex(value), 'i'));
        andConditions.push({ job_type: { $in: jobTypeRegexPatterns } });
      }
      if (userFilters.experience_level) {
        const validLevels = ['Junior', 'Mid-level', 'Senior', 'Director+'];
        if (validLevels.includes(userFilters.experience_level)) {
          andConditions.push({ experience_level: userFilters.experience_level });
        }
      }
      if (userFilters.title_keywords) {
        andConditions.push({ title: { $regex: escapeRegex(userFilters.title_keywords), $options: 'i' } });
      }
      if (userFilters.min_salary !== undefined && userFilters.min_salary !== null) {
        andConditions.push({
          $or: [
            { salary_min: { $gte: userFilters.min_salary } },
            { salary_max: { $gte: userFilters.min_salary } },
          ],
        });
      }
      if (userFilters.remote_type) {
        const remoteTypeValues = Array.isArray(userFilters.remote_type) ? userFilters.remote_type : [userFilters.remote_type];
        andConditions.push({ remote_type: { $in: remoteTypeValues } });
      }
    }

    const freshJobsFilter = { $and: andConditions };

    if (process.env.NODE_ENV !== 'production') {
      const totalJobCount = await jobsCollection.countDocuments();
      const filteredCount = await jobsCollection.countDocuments(freshJobsFilter);
      console.log(`[Matching] Jobs in DB: ${totalJobCount} total, ${filteredCount} after filter`);
      if (userFilters) {
        console.log(`[Matching] Active user filters: ${JSON.stringify(userFilters)}`);
      }
    }

    const jobs = await jobsCollection
      .find(freshJobsFilter, { projection })
      .sort({ posted_date: -1 })
      .limit(limit)
      .toArray();

    if (jobs.length > 0) {
      await cache.set(cacheKey, jobs, 1800);
      console.log(`📦 [Matching] Jobs cached (${jobs.length} fresh jobs, TTL: 30min)`);
    } else {
      console.log(`⚠️ [Matching] 0 jobs found - skipping cache to allow retry`);
    }

    return jobs;
  }

  private async getMLMatches(
    cvText: string,
    jobs: JobDocument[],
    topK: number,
    filters?: JobMatchRequest['filters'],
  ): Promise<any[]> {
    const mlStartTime = Date.now();

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 120000);

    try {
      console.log(` [ML] Sending ${jobs.length} jobs to ML service for matching...`);

      const response = await fetch(`${ML_SERVICE_URL}/api/ml/match-jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cv_text: cvText,
          jobs: jobs.map((job) => ({
            job_id: job.job_id,
            source: job.source,
            title: job.title,
            company: job.company,
            location: job.location,
            description: job.description,
            requirements: job.requirements || [],
            salary_min: job.salary_min,
            salary_max: job.salary_max,
            source_url: job.source_url,
            posted_date: job.posted_date,
            job_type: job.job_type,
            remote_type: job.remote_type,
            experience_level: job.experience_level,
            country: job.country,
          })),
          top_k: topK,
          filters: filters ? (({ job_type, remote_type, ...mlFilters }) => mlFilters)(filters) : undefined,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(` [ML] Service returned error: ${response.status}`, errorData);
        throw new AppError(
          'The ML matching service encountered an error. Please try again.',
          502,
          ErrorCodes.ML_SERVICE_ERROR,
        );
      }

      const data = await response.json();
      const mlDuration = Date.now() - mlStartTime;
      console.log(` [ML] Matching complete in ${mlDuration}ms, returned ${data.matched_jobs?.length || 0} matches`);

      return data.matched_jobs || [];
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error(' [ML] Request timed out after 120 seconds');
        throw new AppError(
          'The ML service took too long to respond. Please try again later.',
          504,
          ErrorCodes.ML_SERVICE_ERROR,
        );
      }

      if (error instanceof AppError) {
        throw error;
      }

      console.error(' [ML] Connection error:', error);
      throw new AppError(
        'Unable to connect to the ML matching service. Please ensure the service is running.',
        503,
        ErrorCodes.ML_SERVICE_ERROR,
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export const matchingService = new MatchingService();
