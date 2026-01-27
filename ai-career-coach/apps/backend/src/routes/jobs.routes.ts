// apps/backend/src/routes/jobs.routes.ts
/**
 * Job Routes
 * 
 * Provides endpoints for job searching and management
 * Proxies requests to job-api-service
 */

import express from 'express';
import axios from 'axios';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = express.Router();

const JOB_API_URL = process.env.JOB_API_SERVICE_URL || 'http://job-api-service:8001';

/**
 * GET /api/jobs/search
 * Search for jobs (frontend calls this)
 */
router.get('/search', authenticate, async (req, res) => {
  try {
    const { keywords, location } = req.query;
    
    if (!keywords || !location) {
      return res.status(400).json({
        success: false,
        message: 'Keywords and location are required'
      });
    }
    
    // Trigger job fetching from APIs
    const fetchResponse = await axios.post(`${JOB_API_URL}/api/jobs/fetch`, {
      keywords,
      location
    });
    
    // Query MongoDB for jobs
    // (You can do this directly or through job-api-service)
    
    res.json({
      success: true,
      message: 'Jobs fetched successfully',
      data: fetchResponse.data
    });
    
  } catch (error) {
    console.error('Job search error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search jobs'
    });
  }
});

/**
 * GET /api/jobs/stats
 * Get job database statistics
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const response = await axios.get(`${JOB_API_URL}/api/jobs/stats`);
    
    res.json(response.data);
    
  } catch (error) {
    console.error('Job stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get job statistics'
    });
  }
});

export default router;