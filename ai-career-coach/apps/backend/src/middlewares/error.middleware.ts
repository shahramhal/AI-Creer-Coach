import type { Request, Response, NextFunction } from 'express';
import { AppError, ErrorCodes } from '../utils/app-error.util.js';
import { logger } from '../utils/logger.js';

export const globalErrorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
      ...(err.details ? { errors: err.details } : {}),
    });
    return;
  }

  logger.error(err, 'Unhandled error');
  res.status(500).json({
    success: false,
    message: 'Something went wrong. Please try again.',
    code: ErrorCodes.INTERNAL_ERROR,
  });
};
