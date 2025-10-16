// apps/backend/src/middlewares/auth.middleware.ts

import type{ Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { verifyAccessToken } from '../utils/jwt.util.js';

const prisma = new PrismaClient();

/**
 * Extends Express Request to include user data
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        isEmailVerified: boolean;
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
) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
      });
    }

    // Extract token (format: "Bearer <token>")
    const token = authHeader.substring(7);

    // Verify token
    const decoded = verifyAccessToken(token);

    // Fetch user from database (ensures user still exists)
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        isEmailVerified: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    // Attach user to request object
    req.user = {
      id: user.id,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);

    if (error instanceof Error) {
      if (error.message === 'Token expired') {
        return res.status(401).json({
          success: false,
          message: 'Token expired',
          code: 'TOKEN_EXPIRED',
        });
      }

      if (error.message === 'Invalid token') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token',
        });
      }
    }

    return res.status(401).json({
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
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continue without user
    }

    const token = authHeader.substring(7);
    const decoded = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        isEmailVerified: true,
      },
    });

    if (user) {
      req.user = {
        id: user.id,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
      };
    }

    next();
  } catch (error) {
    // If token is invalid, continue without user
    next();
  }
};