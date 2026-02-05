// apps/backend/src/controllers/matching.controller.ts
/**
 * Job Matching Controller
 *
 * Handles business logic for job matching
 * Coordinates between database, ML service, and response formatting
 */

import type { Request, Response } from 'express';
import mongoose from 'mongoose';

// Configuration
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://ml-service:8000';

// Error codes for frontend handling
export enum MatchingErrorCode {
  NO_CV = 'NO_CV',
  NO_JOBS = 'NO_JOBS',
  DB_CONNECTION_ERROR = 'DB_CONNECTION_ERROR',
  ML_SERVICE_ERROR = 'ML_SERVICE_ERROR',
  AUTH_ERROR = 'AUTH_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

// Type definitions
interface JobMatchRequest {
  cv_id?: string;
  filters?: {
    location?: string;
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

/**
 * Custom error class for matching operations
 */
class MatchingError extends Error {
  constructor(
    public code: MatchingErrorCode,
    public statusCode: number,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'MatchingError';
  }
}

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
      throw new MatchingError(
        MatchingErrorCode.AUTH_ERROR,
        401,
        'User not authenticated. Please log in to access job matches.',
        { action: 'redirect_to_login' }
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
      throw new MatchingError(
        MatchingErrorCode.DB_CONNECTION_ERROR,
        503,
        'Database is temporarily unavailable. Please try again in a moment.',
        { mongoState: mongoose.connection.readyState }
      );
    }

    const db = mongoose.connection.db;
    if (!db) {
      throw new MatchingError(
        MatchingErrorCode.DB_CONNECTION_ERROR,
        503,
        'Database connection not established. Please try again.',
        { dbAvailable: false }
      );
    }

    // Step 4: Fetch user's CV
    console.log(`📄 [Matching] Fetching CV for user: ${userId}`);
    const userCV = await fetchUserCV(db, userId, cv_id);
    if (!userCV) {
      console.log(`⚠️ [Matching] No CV found for user: ${userId}`);
      throw new MatchingError(
        MatchingErrorCode.NO_CV,
        404,
        'No CV found for your account. Please upload your CV first to get personalized job matches.',
        {
          action: 'upload_cv',
          redirect: '/cvs',
          userId
        }
      );
    }

    console.log(`✅ [Matching] Found CV for user: ${userId}`);

    // Step 5: Fetch available jobs (limited for performance)
    const jobs = await fetchJobs(db, effectiveJobLimit);
    const jobCount = jobs.length;

    if (jobCount === 0) {
      console.log(`⚠️ [Matching] No jobs in database`);
      throw new MatchingError(
        MatchingErrorCode.NO_JOBS,
        404,
        'No jobs are currently available in our database. Our job fetching service updates regularly - please check back soon.',
        {
          action: 'retry_later',
          jobCount: 0
        }
      );
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
      throw new MatchingError(
        MatchingErrorCode.NO_CV,
        404,
        'Your CV was found but has no usable content for matching. Please re-upload your CV.',
        { action: 'upload_cv', redirect: '/cvs' }
      );
    }

    console.log(`🤖 [Matching] Calling ML service for matching...`);
    const matchedJobs = await getMLMatches(cvRawText, jobs, top_k, filters);

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

    // Handle known matching errors
    if (error instanceof MatchingError) {
      console.error(`❌ [Matching] ${error.code}: ${error.message}`);
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: process.env.NODE_ENV === 'development' ? error.details : undefined
        },
        meta: { duration_ms: duration }
      });
      return;
    }

    // Handle unknown errors
    console.error('❌ [Matching] Unexpected error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    res.status(500).json({
      success: false,
      error: {
        code: MatchingErrorCode.UNKNOWN_ERROR,
        message: 'An unexpected error occurred while matching jobs. Please try again.',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
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
      const userCV = await cvCollection.findOne({ user_id: userId });
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
  
  return await cvCollection.findOne(query);
}

/**
 * Fetch jobs from MongoDB with optimization
 *
 * @param db - MongoDB database instance
 * @param limit - Maximum number of jobs to fetch (default: 1000)
 * @returns Array of job documents
 */
async function fetchJobs(db: mongoose.mongo.Db, limit: number = 1000): Promise<JobDocument[]> {
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
    posted_date: 1
  };

  // Sort by posted_date descending to get most recent jobs first
  return await jobsCollection
    .find({}, { projection })
    .sort({ posted_date: -1 })
    .limit(limit)
    .toArray();
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
          posted_date: job.posted_date
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
      throw new MatchingError(
        MatchingErrorCode.ML_SERVICE_ERROR,
        502,
        'The ML matching service encountered an error. Please try again.',
        {
          mlStatus: response.status,
          mlError: errorData.message || errorData.detail
        }
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
      throw new MatchingError(
        MatchingErrorCode.ML_SERVICE_ERROR,
        504,
        'The ML service took too long to respond. Please try again later.',
        { timeout: true }
      );
    }

    // Re-throw MatchingError as-is
    if (error instanceof MatchingError) {
      throw error;
    }

    // Handle connection errors
    console.error('❌ [ML] Connection error:', error);
    throw new MatchingError(
      MatchingErrorCode.ML_SERVICE_ERROR,
      503,
      'Unable to connect to the ML matching service. Please ensure the service is running.',
      {
        mlServiceUrl: ML_SERVICE_URL,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
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
