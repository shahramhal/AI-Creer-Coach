// apps/backend/src/routes/matching.routes.ts
/**
 * Job Matching Routes
 * 
 * Provides endpoints for personalized job matching
 * Connects frontend → backend → ML service → MongoDB
 */

import express from 'express';
import type { Request, Response } from 'express';
import axios from 'axios';
import mongoose from 'mongoose';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = express.Router();

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
 * POST /api/matching/find-jobs
 * Get personalized job recommendations for user
 */
router.post('/find-jobs', authenticate, async (req: Request, res: Response) => {
  try {
    // Check if user exists (authenticate middleware should set this)
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const userId = req.user.id;
    const { cv_id, filters, top_k = 20 }: JobMatchRequest = req.body;
    
    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({
        success: false,
        message: 'Database connection failed.'
      });
    }

    // Get MongoDB database instance
    const db = mongoose.connection.db;
    
    if (!db) {
      return res.status(500).json({
        success: false,
        message: 'Database not available.'
      });
    }
    
    // Step 1: Get user's parsed CV from MongoDB
    const cvCollection = db.collection<CVDocument>('parsed_cvs');
    
    const userCV = await cvCollection.findOne({ 
      user_id: userId,
      ...(cv_id && { cv_id })
    });
    
    if (!userCV) {
      return res.status(404).json({
        success: false,
        message: 'No CV found. Please upload your CV first.'
      });
    }
    
    // Step 2: Get all jobs from MongoDB
    const jobsCollection = db.collection<JobDocument>('jobs');
    const jobs = await jobsCollection.find({}).toArray();
    
    if (jobs.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No jobs available yet. Please check back later.'
      });
    }
    
    // Step 3: Call ML service for semantic matching
    const mlResponse = await axios.post(`${ML_SERVICE_URL}/api/ml/match-jobs`, {
      cv_text: userCV.raw_text,
      jobs: jobs.map((job: JobDocument) => ({
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
      top_k,
      filters
    });
    
    // Step 4: Return matched jobs
    res.json({
      success: true,
      message: `Found ${mlResponse.data.matched_jobs.length} matching jobs`,
      data: {
        matched_jobs: mlResponse.data.matched_jobs,
        total_analyzed: mlResponse.data.total_analyzed,
        user_cv: {
          name: userCV.personal_info?.name,
          uploaded_at: userCV.created_at
        }
      }
    });
    
  } catch (error) {
    console.error('Job matching error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    res.status(500).json({
      success: false,
      message: 'Failed to match jobs',
      error: errorMessage
    });
  }
});

export default router;