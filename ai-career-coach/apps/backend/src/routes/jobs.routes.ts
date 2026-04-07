// apps/backend/src/routes/jobs.routes.ts
/**
 * Job Routes
 * 
 * Provides endpoints for job searching and management
 * Proxies requests to job-api-service
 */

import express from 'express';
import { logger } from '../utils/logger.js';
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
    
    // Forward request to job-api-service using fetch
    const fetchResponse = await fetch(`${JOB_API_URL}/api/jobs/fetch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        keywords,
        location
      })
    });
    // Parse JSON response
    const data = await fetchResponse.json();
    
    // Handle non-OK responses
    if (!fetchResponse.ok) {
      return res.status(fetchResponse.status).json({
        success: false,
        message: data.message || 'Job search failed',
      });
    }
    // Query MongoDB for jobs
    // (You can do this directly or through job-api-service)
    
    res.json({
      success: true,
      message: 'Jobs fetched successfully',
      data: data
    });
    
  } catch (error) {
    logger.error(error);
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
    const response = await fetch(`${JOB_API_URL}/api/jobs/stats`);
    const data = await response.json();

    // Handle errors
    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        message: data.message || 'Failed to get statistics',
      });
    }
    
    res.json(data)
    
  } catch (error) {
    logger.error(error);
    res.status(500).json({
      success: false,
      message: 'Failed to get job statistics'
    });
  }
});

const COUNTRY_DISPLAY_NAMES: Record<string, string> = {
  gb: 'United Kingdom',
  us: 'United States',
  ca: 'Canada',
  de: 'Germany',
  fr: 'France',
  au: 'Australia',
  nl: 'Netherlands',
  in: 'India',
  sg: 'Singapore',
  at: 'Austria',
  be: 'Belgium',
  br: 'Brazil',
  it: 'Italy',
  pl: 'Poland',
  za: 'South Africa',
};

/**
 * GET /api/v1/jobs/countries
 * Returns the list of countries that the job API is configured to fetch.
 * Driven by ADZUNA_COUNTRIES env var - only these have actual job data.
 * No auth required (public config).
 */
router.get('/countries', (_req, res) => {
  const configured = (process.env.ADZUNA_COUNTRIES || 'gb,us,de,fr,ca')
    .split(',')
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean);

  const countries = configured.map((code) => ({
    value: code,
    label: COUNTRY_DISPLAY_NAMES[code] ?? code.toUpperCase(),
  }));

  res.json({ success: true, data: { countries } });
});

export default router;