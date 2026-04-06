import type { Request, Response } from 'express';
import { logger } from '../utils/logger.js';
import { AppError, ErrorCodes } from '../utils/app-error.util.js';
import { matchingService } from '../services/matching.service.js';

export const getJobMatches = async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();

  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError(
        'User not authenticated. Please log in to access job matches.',
        401,
        ErrorCodes.INVALID_CREDENTIALS,
      );
    }

    const { cv_id, filters, top_k = 20, job_limit = 1000 } = req.body;

    const result = await matchingService.findJobMatches(userId, { cv_id, filters, top_k, job_limit });
    const duration = Date.now() - startTime;

    logger.info(` [Matching] Complete! Matched ${result.matched_jobs.length} jobs in ${duration}ms`);

    res.json({
      success: true,
      message: `Found ${result.matched_jobs.length} matching jobs${result.cached ? ' (cached)' : ''}`,
      data: {
        matched_jobs: result.matched_jobs,
        total_analyzed: result.total_analyzed,
        user_cv: result.user_cv,
      },
      meta: {
        duration_ms: duration,
        ...(result.cached && { cached: true }),
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    if (error instanceof AppError) {
      logger.error(` [Matching] ${error.code}: ${error.message}`);
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
        code: error.code,
        meta: { duration_ms: duration },
      });
      return;
    }

    logger.error(error);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred while matching jobs. Please try again.',
      code: ErrorCodes.INTERNAL_ERROR,
      meta: { duration_ms: duration },
    });
  }
};

export const getMatchingDiagnostics = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const diagnostics = await matchingService.getDiagnostics(userId);
    res.json({ success: true, data: diagnostics });
  } catch (error) {
    logger.error(error);
    res.status(500).json({
      success: false,
      message: 'Failed to get diagnostics',
      error: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined,
    });
  }
};
