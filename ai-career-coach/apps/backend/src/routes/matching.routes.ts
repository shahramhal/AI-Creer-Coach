// apps/backend/src/routes/matching.routes.ts
/**
 * Job Matching Routes
 *
 * Defines endpoints and applies middleware
 * Delegates business logic to controller
 */

import express from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { getJobMatches, getMatchingDiagnostics } from '../controllers/matching.controller.js';
import { validate, findJobsValidation } from '../middlewares/validation.middleware.js';

const router = express.Router();

/**
 * POST /api/matching/find-jobs
 * Get personalized job recommendations for authenticated user
 *
 * Request body:
 * - cv_id?: string - Optional specific CV ID
 * - filters?: object - Optional filters (location, salary, remote)
 * - top_k?: number - Number of matches to return (default: 20)
 *
 * Error codes returned:
 * - NO_CV: User hasn't uploaded a CV
 * - NO_JOBS: No jobs in database
 * - DB_CONNECTION_ERROR: Database connection issue
 * - ML_SERVICE_ERROR: ML service unavailable or error
 * - AUTH_ERROR: Authentication required
 */
router.post('/find-jobs', authenticate, findJobsValidation, validate, getJobMatches);

/**
 * GET /api/matching/diagnostics
 * Get diagnostic information for troubleshooting matching issues
 *
 * Returns checks for:
 * - MongoDB connection status
 * - User CV existence
 * - Jobs count in database
 * - ML service availability
 */
router.get('/diagnostics', authenticate, getMatchingDiagnostics);

export default router;
