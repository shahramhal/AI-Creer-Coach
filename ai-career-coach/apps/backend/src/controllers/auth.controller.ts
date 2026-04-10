// apps/backend/src/controllers/auth.controller.ts

// apps/backend/src/controllers/auth.controller.ts
import type { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { AuthService } from '../services/auth.service.js';
import { ErrorCodes } from '../utils/app-error.util.js';

const authService = new AuthService();

/**
 * Handle user registration
 * POST /api/auth/register
 */
export const register = async (req: Request, res: Response, next: NextFunction) => {
  // Validate request
  const validationErrors = validationResult(req);
  if (!validationErrors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      code: ErrorCodes.VALIDATION_ERROR,
      errors: validationErrors.array(),
    });
  }

  try {
    const { email, password, firstName, lastName } = req.body;

    // Call service
    const result = await authService.register({
      email,
      password,
      firstName,
      lastName,
    });

    return res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle user login
 * POST /api/auth/login
 */
export const login = async (req: Request, res: Response, next: NextFunction) => {
  // Validate request
  const validationErrors = validationResult(req);
  if (!validationErrors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      code: ErrorCodes.VALIDATION_ERROR,
      errors: validationErrors.array(),
    });
  }

  try {
    const { email, password } = req.body;

    // Call service
    const result = await authService.login(email, password);

    const isProduction = process.env.NODE_ENV === 'production';

    // Set refresh token as httpOnly cookie (more secure than localStorage).
    // sameSite: 'none' is required in production because the frontend and backend
    // are on different Railway domains (cross-origin). 'lax' is used locally
    // since both run on localhost (same-site) and 'none' requires HTTPS.
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    return res.status(200).json({
      success: true,
      data: {
        accessToken: result.accessToken,
        user: result.user,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify email with token
 * GET /api/auth/verify-email?token=xxx
 */
export const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required',
        code: ErrorCodes.VALIDATION_ERROR,
      });
    }

    const result = await authService.verifyEmail(token);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Request password reset
 * POST /api/auth/forgot-password
 */
export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  const validationErrors = validationResult(req);
  if (!validationErrors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      code: ErrorCodes.VALIDATION_ERROR,
      errors: validationErrors.array(),
    });
  }

  try {
    const { email } = req.body;

    const result = await authService.requestPasswordReset(email);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset password with token
 * POST /api/auth/reset-password
 */
export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  const validationErrors = validationResult(req);
  if (!validationErrors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      code: ErrorCodes.VALIDATION_ERROR,
      errors: validationErrors.array(),
    });
  }

  try {
    const { token, password } = req.body;

    const result = await authService.resetPassword(token, password);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get refresh token from cookie
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token not found',
        code: ErrorCodes.TOKEN_INVALID,
      });
    }

    const result = await authService.refreshAccessToken(refreshToken);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout user
 * POST /api/auth/logout
 */
export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isProduction = process.env.NODE_ENV === 'production';
    const token = req.cookies.refreshToken;

    // Revoke token in Redis so it can't be used even if the cookie lingers
    if (token) {
      await authService.revokeRefreshToken(token);
    }

    // Clear refresh token cookie - options must match what was set on login
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
    });

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user info
 * GET /api/auth/me
 * (Requires authentication middleware)
 */
export const getCurrentUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // User info is attached by auth middleware
    const user = (req as any).user;

    return res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};
