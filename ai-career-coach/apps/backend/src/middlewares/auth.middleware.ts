// apps/backend/src/middlewares/auth.middleware.ts

import type{ Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { verifyAccessToken } from '../utils/jwt.util.js';
import { logger } from '../utils/logger.js';

/**
 * Extends Express Request to include user data
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        firstName: string | null;
        lastName: string | null;
        isEmailVerified: boolean;
        role: string;
        avatarUrl?: string | null;
      };
    }
  }
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 * 
 * Usage: Add to routes that require authentication
 * router.get('/protected', authenticate, controller)
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Access token required',
      });
      return;
    }

    const token = authHeader.substring(7);
    const decoded = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        isEmailVerified: true,
        firstName: true,
        lastName: true,
        role: true,
        isDisabled: true,
        profile: {
          select: { avatarUrl: true },
        },
      },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    if (user.isDisabled) {
      res.status(403).json({
        success: false,
        message: 'Account is disabled',
        code: 'ACCOUNT_DISABLED',
      });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isEmailVerified: user.isEmailVerified,
      role: user.role,
      avatarUrl: user.profile?.avatarUrl ?? null,
    };

    next();
  } catch (error) {
    logger.error(error, 'Authentication error');

    if (error instanceof Error) {
      if (error.message === 'Token expired') {
        res.status(401).json({
          success: false,
          message: 'Token expired',
          code: 'TOKEN_EXPIRED',
        });
        return;
      }

      if (error.message === 'Invalid token') {
        res.status(401).json({
          success: false,
          message: 'Invalid token',
        });
        return;
      }
    }

    res.status(401).json({
      success: false,
      message: 'Authentication failed',
    });
  }
};

/**
 * Email verification middleware
 * Ensures user has verified their email
 * 
 * Usage: Add after authenticate middleware
 * router.get('/verified-only', authenticate, requireEmailVerification, controller)
 */
export const requireEmailVerification = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user?.isEmailVerified) {
    return res.status(403).json({
      success: false,
      message: 'Email verification required',
      code: 'EMAIL_NOT_VERIFIED',
    });
  }

  next();
};

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't require it
 * 
 * Usage: For routes that work with or without authentication
 * router.get('/public', optionalAuthenticate, controller)
 */
export const optionalAuthenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isEmailVerified: true,
        role: true,
        isDisabled: true,
        profile: {
          select: { avatarUrl: true },
        },
      },
    });

    if (user && !user.isDisabled) {
      req.user = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isEmailVerified: user.isEmailVerified,
        role: user.role,
        avatarUrl: user.profile?.avatarUrl ?? null,
      };
    }

    next();
  } catch (error) {
    // If token is invalid, continue without user
    next();
  }
};