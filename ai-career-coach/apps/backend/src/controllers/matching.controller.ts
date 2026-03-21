// apps/backend/src/controllers/matching.controller.ts
/**
 * Job Matching Controller
 *
 * Handles business logic for job matching
 * Coordinates between database, ML service, and response formatting
 */

import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { cache } from '../config/database.js';
import { AppError, ErrorCodes } from '../utils/app-error.util.js';

// Configuration
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://ml-service:8000';

/** Escape special regex characters in user input to prevent ReDoS / injection. */
function escapeRegex(rawInput: string): string {
  return rawInput.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Type definitions
interface JobMatchRequest {
  cv_id?: string;
  filters?: {
    location?: string;
    country?: string;
    city?: string;
    job_type?: string;
    experience_level?: string;
    title_keywords?: string;
    min_salary?: number;
    remote_type?: string;
  };
  top_k?: number;
  job_limit?: number; // Maximum number of jobs to analyze
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

interface CVDocument {
  user_id: string;
  cv_id?: string;
  raw_text?: string;
  metadata?: {
    raw_text?: string;
  };
  personal_info?: {
    name?: string;
  };
  summary?: string;
  skills?: string[];
  experience?: Array<{
    title?: string;
    company?: string;
    description?: string;
  }>;
  education?: Array<{
    degree?: string;
    institution?: string;
    field?: string;
  }>;
  created_at?: Date;
}

// MatchingError is now replaced by AppError from the shared utility.

/**
 * Get personalized job matches for user
 *
 * @route POST /api/matching/find-jobs
 * @access Private (requires authentication)
 */
export const getJobMatches = async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();

  try {
    // Step 1: Validate authentication
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError(
        'User not authenticated. Please log in to access job matches.',
        401,
        ErrorCodes.INVALID_CREDENTIALS,
      );
    }

    // Step 2: Extract request parameters
    const { cv_id, filters, top_k = 20, job_limit = 1000 }: JobMatchRequest = req.body;

    // Clamp job_limit to reasonable bounds (100-2000)
    const effectiveJobLimit = Math.max(100, Math.min(job_limit, 2000));

    console.log(`🔍 [Matching] Starting job match for user: ${userId} (analyzing up to ${effectiveJobLimit} jobs)`);

    // Step 3: Validate database connection
    if (mongoose.connection.readyState !== 1) {
      console.error(`❌ [Matching] MongoDB not connected. State: ${mongoose.connection.readyState}`);
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

    // Step 4: Fetch user's CV
    console.log(`📄 [Matching] Fetching CV for user: ${userId}`);
    const userCV = await fetchUserCV(db, userId, cv_id);
    if (!userCV) {
      console.log(`⚠️ [Matching] No CV found for user: ${userId}`);
      throw new AppError(
        'No CV found for your account. Please upload your CV first to get personalized job matches.',
        404,
        ErrorCodes.NOT_FOUND,
      );
    }

    console.log(`✅ [Matching] Found CV for user: ${userId}`);

    // Step 5: Fetch available jobs (limited for performance, pre-filtered)
    const jobs = await fetchJobs(db, effectiveJobLimit, filters);
    const jobCount = jobs.length;

    if (jobCount === 0) {
      // Build a descriptive message based on active filters
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

    // Step 6: Get matches from ML service
    // Try to get raw text, or build it from available fields
    let cvRawText = userCV.raw_text || userCV.metadata?.raw_text || '';

    // If no raw_text, build from available CV fields
    if (!cvRawText) {
      console.log(`⚠️ [Matching] No raw_text, building from CV fields...`);
      const textParts: string[] = [];

      // Add summary
      if (userCV.summary) {
        textParts.push(userCV.summary);
      }

      // Add skills
      if (userCV.skills && Array.isArray(userCV.skills)) {
        textParts.push(`Skills: ${userCV.skills.join(', ')}`);
      }

      // Add experience
      if (userCV.experience && Array.isArray(userCV.experience)) {
        userCV.experience.forEach((exp: any) => {
          const expText = [exp.title, exp.company, exp.description].filter(Boolean).join(' - ');
          if (expText) textParts.push(expText);
        });
      }

      // Add education
      if (userCV.education && Array.isArray(userCV.education)) {
        userCV.education.forEach((edu: any) => {
          const eduText = [edu.degree, edu.institution, edu.field].filter(Boolean).join(' - ');
          if (eduText) textParts.push(eduText);
        });
      }

      cvRawText = textParts.join('\n');
      console.log(`✅ [Matching] Built CV text from fields (${cvRawText.length} chars)`);
    }

    // If still no text, we can't match
    if (!cvRawText || cvRawText.length < 10) {
      console.error(`❌ [Matching] CV found but no usable text content`);
      throw new AppError(
        'Your CV was found but has no usable content for matching. Please re-upload your CV.',
        404,
        ErrorCodes.NOT_FOUND,
      );
    }

    // Step 6b: Check match result cache before calling ML service
    const filterHash = filters ? Buffer.from(JSON.stringify(filters)).toString('base64url') : 'none';
    const cvTimestamp = userCV.created_at ? new Date(userCV.created_at).getTime() : 'unknown';
    const matchCacheKey = `match:user:${userId}:cv:${cvTimestamp}:topk:${top_k}:filters:${filterHash}`;

    const cachedMatchResult = await cache.get<any[]>(matchCacheKey);
    if (cachedMatchResult) {
      const duration = Date.now() - startTime;
      console.log(`📦 [Matching] Cache HIT! Returning ${cachedMatchResult.length} cached matches in ${duration}ms`);
      res.json({
        success: true,
        message: `Found ${cachedMatchResult.length} matching jobs (cached)`,
        data: {
          matched_jobs: cachedMatchResult,
          total_analyzed: jobCount,
          user_cv: {
            name: userCV.personal_info?.name,
            uploaded_at: userCV.created_at
          }
        },
        meta: {
          duration_ms: duration,
          cached: true
        }
      });
      return;
    }

    console.log(`🤖 [Matching] Calling ML service for matching...`);
    const matchedJobs = await getMLMatches(cvRawText, jobs, top_k, filters);

    // Cache match results for 1 hour
    await cache.set(matchCacheKey, matchedJobs, 3600);
    console.log(`📦 [Matching] Results cached (TTL: 1hr)`);

    const duration = Date.now() - startTime;
    console.log(`✅ [Matching] Complete! Matched ${matchedJobs.length} jobs in ${duration}ms`);

    // Step 7: Send response
    res.json({
      success: true,
      message: `Found ${matchedJobs.length} matching jobs`,
      data: {
        matched_jobs: matchedJobs,
        total_analyzed: jobCount,
        user_cv: {
          name: userCV.personal_info?.name,
          uploaded_at: userCV.created_at
        }
      },
      meta: {
        duration_ms: duration
      }
    });

  } catch (error) {
    const duration = Date.now() - startTime;

    // Handle known AppErrors
    if (error instanceof AppError) {
      console.error(`❌ [Matching] ${error.code}: ${error.message}`);
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
        code: error.code,
        meta: { duration_ms: duration }
      });
      return;
    }

    // Handle unknown errors
    console.error('❌ [Matching] Unexpected error:', error);

    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred while matching jobs. Please try again.',
      code: ErrorCodes.INTERNAL_ERROR,
      meta: { duration_ms: duration }
    });
  }
};

/**
 * Get matching service diagnostics
 *
 * @route GET /api/matching/diagnostics
 * @access Private (requires authentication)
 */
export const getMatchingDiagnostics = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const diagnostics: Record<string, any> = {
      timestamp: new Date().toISOString(),
      checks: {}
    };

    // Check MongoDB connection
    diagnostics.checks.mongodb = {
      connected: mongoose.connection.readyState === 1,
      state: mongoose.connection.readyState
    };

    // Check if user has CV
    if (mongoose.connection.db) {
      const db = mongoose.connection.db;
      const cvCollection = db.collection<CVDocument>('parsed_cvs');
      const userCV = await cvCollection.findOne({ user_id: userId }, { sort: { created_at: -1 } });
      diagnostics.checks.user_cv = {
        exists: !!userCV,
        cv_id: userCV?.cv_id,
        has_raw_text: !!userCV?.raw_text,
        created_at: userCV?.created_at
      };

      // Check jobs count
      const jobsCollection = db.collection('jobs');
      const jobCount = await jobsCollection.countDocuments({});
      diagnostics.checks.jobs = {
        total_count: jobCount,
        has_jobs: jobCount > 0
      };
    }

    // Check ML service
    try {
      const mlResponse = await fetch(`${ML_SERVICE_URL}/health`, { method: 'GET' });
      diagnostics.checks.ml_service = {
        reachable: mlResponse.ok,
        status: mlResponse.status
      };
    } catch (mlError) {
      diagnostics.checks.ml_service = {
        reachable: false,
        error: mlError instanceof Error ? mlError.message : 'Unknown error'
      };
    }

    // Overall status
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

    res.json({
      success: true,
      data: diagnostics
    });

  } catch (error) {
    console.error('❌ [Diagnostics] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get diagnostics',
      error: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined
    });
  }
};

/**
 * Fetch user's CV from MongoDB
 * 
 * @param db - MongoDB database instance
 * @param userId - User ID
 * @param cvId - Optional specific CV ID
 * @returns User's CV document or null
 */
async function fetchUserCV(
  db: mongoose.mongo.Db,
  userId: string,
  cvId?: string
): Promise<CVDocument | null> {
  const cvCollection = db.collection<CVDocument>('parsed_cvs');

  const query: any = { user_id: userId };
  if (cvId) {
    query.cv_id = cvId;
  }

  // Sort by created_at descending to always return the latest CV
  return await cvCollection.findOne(query, { sort: { created_at: -1 } });
}

/**
 * Fetch jobs from MongoDB with optimization and user-supplied pre-filters.
 *
 * Filters are applied at the DB query level so only relevant jobs are sent to
 * the ML service, reducing both transfer size and matching latency.
 *
 * @param db - MongoDB database instance
 * @param limit - Maximum number of jobs to fetch (default: 1000)
 * @param userFilters - Optional user-supplied filter criteria
 * @returns Array of job documents
 */
async function fetchJobs(
  db: mongoose.mongo.Db,
  limit: number = 1000,
  userFilters?: JobMatchRequest['filters'],
): Promise<JobDocument[]> {
  // Include user filters in cache key so different filter combos are cached separately
  const filterHash = userFilters
    ? Buffer.from(JSON.stringify(userFilters)).toString('base64url')
    : 'none';
  const cacheKey = `jobs:list:${limit}:f:${filterHash}`;

  // Try cache first (jobs change infrequently) — skip empty cached results
  const cachedJobs = await cache.get<JobDocument[]>(cacheKey);
  if (cachedJobs && cachedJobs.length > 0) {
    console.log(`📦 [Matching] Jobs cache HIT (${cachedJobs.length} jobs)`);
    return cachedJobs;
  }

  const jobsCollection = db.collection<JobDocument>('jobs');

  // Only fetch fields needed for matching (reduces memory and transfer)
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

  // Filter out stale jobs: only fetch jobs posted within the last 14 days
  // posted_date is stored as ISO string — string comparison works for ISO dates
  const maxAgeDays = 14;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);
  const cutoffISO = cutoffDate.toISOString();

  // Also exclude jobs with an expiration_date in the past (Reed provides this)
  const nowISO = new Date().toISOString();

  const andConditions: Record<string, any>[] = [
    // Must be recent: ISO posted_date within 14 days, OR scraped recently.
    // Reed uses DD/MM/YYYY dates which fail ISO string comparison, so for
    // non-ISO dates we fall back to scraped_at as the freshness indicator.
    // NOTE: $regex and $gte cannot be combined on the same field in MongoDB,
    // so we use $and to separate the checks.
    {
      $or: [
        // ISO dates (Adzuna: "2026-02-18T09:18:22Z") — both conditions must match
        { $and: [{ posted_date: { $regex: /^\d{4}-/ } }, { posted_date: { $gte: cutoffISO } }] },
        // Non-ISO dates (Reed: "23/12/2025") — fall back to scraped_at
        { $and: [{ posted_date: { $exists: true, $nin: [null, ''] } }, { posted_date: { $not: { $regex: /^\d{4}-/ } } }, { scraped_at: { $gte: cutoffDate } }] },
        // Missing posted_date — use scraped_at
        { posted_date: { $in: ['', null] }, scraped_at: { $gte: cutoffDate } },
        // No posted_date field at all — use scraped_at
        { posted_date: { $exists: false }, scraped_at: { $gte: cutoffDate } },
      ],
    },
    // Exclude expired Reed jobs
    {
      $or: [
        { expiration_date: { $exists: false } },
        { expiration_date: { $in: ['', null] } },
        { expiration_date: { $gte: nowISO } },
      ],
    },
  ];

  // Apply user-supplied pre-filters
  if (userFilters) {
    if (userFilters.country) {
      andConditions.push({ country: { $regex: `^${escapeRegex(userFilters.country)}$`, $options: 'i' } });
    }
    if (userFilters.city) {
      andConditions.push({ location: { $regex: escapeRegex(userFilters.city), $options: 'i' } });
    }
    if (userFilters.job_type) {
      andConditions.push({ job_type: { $regex: escapeRegex(userFilters.job_type), $options: 'i' } });
    }
    if (userFilters.experience_level) {
      andConditions.push({ experience_level: userFilters.experience_level });
    }
    if (userFilters.title_keywords) {
      andConditions.push({ title: { $regex: escapeRegex(userFilters.title_keywords), $options: 'i' } });
    }
    if (userFilters.min_salary !== undefined && userFilters.min_salary !== null) {
      andConditions.push({ salary_min: { $gte: userFilters.min_salary } });
    }
    if (userFilters.remote_type) {
      andConditions.push({ remote_type: userFilters.remote_type });
    }
  }

  const freshJobsFilter = { $and: andConditions };

  // Diagnostic: log total vs filtered count to identify filter issues
  const totalJobCount = await jobsCollection.countDocuments();
  const filteredCount = await jobsCollection.countDocuments(freshJobsFilter);
  console.log(`🔎 [Matching] Jobs in DB: ${totalJobCount} total, ${filteredCount} after freshness/expiry filter`);
  if (userFilters) {
    console.log(`🔎 [Matching] Active user filters: ${JSON.stringify(userFilters)}`);
  }

  // Sort by posted_date descending to get most recent jobs first
  const jobs = await jobsCollection
    .find(freshJobsFilter, { projection })
    .sort({ posted_date: -1 })
    .limit(limit)
    .toArray();

  // Only cache non-empty results — never poison the cache with 0 jobs
  if (jobs.length > 0) {
    await cache.set(cacheKey, jobs, 1800);
    console.log(`📦 [Matching] Jobs cached (${jobs.length} fresh jobs, TTL: 30min)`);
  } else {
    console.log(`⚠️ [Matching] 0 jobs found — skipping cache to allow retry`);
  }

  return jobs;
}

/**
 * Get job matches from ML service
 *
 * @param cvText - User's CV text
 * @param jobs - Available jobs
 * @param topK - Number of matches to return
 * @param filters - Optional filters
 * @returns Array of matched jobs with scores
 */
async function getMLMatches(
  cvText: string,
  jobs: JobDocument[],
  topK: number,
  filters?: JobMatchRequest['filters']
): Promise<any[]> {
  const mlStartTime = Date.now();

  try {
    console.log(`🤖 [ML] Sending ${jobs.length} jobs to ML service for matching...`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 second timeout (2 minutes)

    const response = await fetch(`${ML_SERVICE_URL}/api/ml/match-jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cv_text: cvText,
        jobs: jobs.map(job => ({
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
        filters
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`❌ [ML] Service returned error: ${response.status}`, errorData);
      throw new AppError(
        'The ML matching service encountered an error. Please try again.',
        502,
        ErrorCodes.ML_SERVICE_ERROR,
      );
    }

    const data = await response.json();
    const mlDuration = Date.now() - mlStartTime;
    console.log(`✅ [ML] Matching complete in ${mlDuration}ms, returned ${data.matched_jobs?.length || 0} matches`);

    return data.matched_jobs || [];

  } catch (error) {
    // Handle abort/timeout
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('❌ [ML] Request timed out after 120 seconds');
      throw new AppError(
        'The ML service took too long to respond. Please try again later.',
        504,
        ErrorCodes.ML_SERVICE_ERROR,
      );
    }

    // Re-throw AppError as-is
    if (error instanceof AppError) {
      throw error;
    }

    // Handle connection errors
    console.error('❌ [ML] Connection error:', error);
    throw new AppError(
      'Unable to connect to the ML matching service. Please ensure the service is running.',
      503,
      ErrorCodes.ML_SERVICE_ERROR,
    );
  }
}

/**
 * Get matching statistics for user (future implementation)
 */
// export const getMatchingStats = async (req: Request, res: Response): Promise<void> => {
//   // TODO: Implement statistics endpoint
//   res.json({ message: 'Stats endpoint - coming soon' });
// };
