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

// Type definitions
interface JobMatchRequest {
  cv_id?: string;
  filters?: {
    location?: string;
    min_salary?: number;
    remote_type?: string;
  };
  top_k?: number;
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
  raw_text: string;
  personal_info?: {
    name?: string;
  };
  created_at?: Date;
}

/**
 * Get personalized job matches for user
 * 
 * @route POST /api/matching/find-jobs
 * @access Private (requires authentication)
 */
export const getJobMatches = async (req: Request, res: Response): Promise<void> => {
  try {
    // Step 1: Validate authentication
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    // Step 2: Extract request parameters
    const { cv_id, filters, top_k = 20 }: JobMatchRequest = req.body;
    
    console.log(`🔍 Finding job matches for user: ${userId}`);
    
    // Step 3: Validate database connection
    if (mongoose.connection.readyState !== 1) {
      res.status(500).json({
        success: false,
        message: 'Database connection failed'
      });
      return;
    }

    const db = mongoose.connection.db;
    if (!db) {
      res.status(500).json({
        success: false,
        message: 'Database not available'
      });
      return;
    }
    
    // Step 4: Fetch user's CV
    const userCV = await fetchUserCV(db, userId, cv_id);
    if (!userCV) {
      res.status(404).json({
        success: false,
        message: 'No CV found. Please upload your CV first.'
      });
      return;
    }
    
    console.log(`✅ Found CV for user: ${userId}`);
    
    // Step 5: Fetch available jobs
    const jobs = await fetchJobs(db);
    if (jobs.length === 0) {
      res.status(404).json({
        success: false,
        message: 'No jobs available yet. Please check back later.'
      });
      return;
    }
    
    console.log(`📊 Found ${jobs.length} jobs in database`);
    
    // Step 6: Get matches from ML service
    const matchedJobs = await getMLMatches(userCV.raw_text, jobs, top_k, filters);
    
    console.log(`✅ Successfully matched ${matchedJobs.length} jobs`);
    
    // Step 7: Send response
    res.json({
      success: true,
      message: `Found ${matchedJobs.length} matching jobs`,
      data: {
        matched_jobs: matchedJobs,
        total_analyzed: jobs.length,
        user_cv: {
          name: userCV.personal_info?.name,
          uploaded_at: userCV.created_at
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Job matching error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    res.status(500).json({
      success: false,
      message: 'Failed to match jobs',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
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
 * Fetch all available jobs from MongoDB
 * 
 * @param db - MongoDB database instance
 * @returns Array of job documents
 */
async function fetchJobs(db: mongoose.mongo.Db): Promise<JobDocument[]> {
  const jobsCollection = db.collection<JobDocument>('jobs');
  return await jobsCollection.find({}).toArray();
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
  try {
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
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `ML service returned status ${response.status}`
      );
    }
    
    const data = await response.json();
    return data.matched_jobs || [];
    
  } catch (error) {
    console.error('❌ ML service error:', error);
    throw new Error(
      `Failed to connect to ML service: ${error instanceof Error ? error.message : 'Unknown error'}`
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
