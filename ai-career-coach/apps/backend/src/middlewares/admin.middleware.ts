// apps/backend/src/middlewares/admin.middleware.ts

import type { Request, Response, NextFunction } from 'express';

/**
 * Admin authorization middleware
 * Must be used after `authenticate` middleware
 * Checks that the authenticated user has ADMIN role
 */
export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || req.user.role !== 'ADMIN') {
    res.status(403).json({
      success: false,
      message: 'Admin access required',
      code: 'ADMIN_REQUIRED',
    });
    return;
  }

  next();
};
