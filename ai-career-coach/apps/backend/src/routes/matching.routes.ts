// apps/backend/src/routes/matching.routes.ts
/**
 * Job Matching Routes
 * 
 * Defines endpoints and applies middleware
 * Delegates business logic to controller
 */

import express from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { getJobMatches } from '../controllers/matching.controller.js';

const router = express.Router();

/**
 * POST /api/matching/find-jobs
 * Get personalized job recommendations for authenticated user
 * 
 * Request body:
 * - cv_id?: string - Optional specific CV ID
 * - filters?: object - Optional filters (location, salary, remote)
 * - top_k?: number - Number of matches to return (default: 20)
 */
router.post('/find-jobs', authenticate, getJobMatches);

/**
 * GET /api/matching/stats
 * Get matching statistics for the user
 */
// router.get('/stats', authenticate, getMatchingStats);

export default router;