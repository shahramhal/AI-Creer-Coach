// apps/backend/src/controllers/auth.controller.ts

// apps/backend/src/controllers/auth.controller.ts
import type { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthService } from '../services/auth.service.js';

const authService = new AuthService();

/**
 * Handle user registration
 * POST /api/auth/register
 */
export const register = async (req: Request, res: Response) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

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
    console.error('Registration error:', error);

    // Handle known errors
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          message: error.message,
        });
      }
    }

    // Generic error
    return res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.',
    });
  }
};

/**
 * Handle user login
 * POST /api/auth/login
 */
export const login = async (req: Request, res: Response) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { email, password } = req.body;

    // Call service
    const result = await authService.login(email, password);

    // Set refresh token as httpOnly cookie (more secure than localStorage)
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true, // Cannot be accessed by JavaScript
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'strict', // CSRF protection
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.status(200).json({
      success: true,
      data: {
        accessToken: result.accessToken,
        user: result.user,
      },
    });
  } catch (error) {
    console.error('Login error:', error);

    // Handle known errors
    if (error instanceof Error) {
      if (error.message.includes('Invalid credentials')) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
      }
    }

    // Generic error
    return res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.',
    });
  }
};

/**
 * Verify email with token
 * GET /api/auth/verify-email?token=xxx
 */
export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required',
      });
    }

    const result = await authService.verifyEmail(token);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Email verification error:', error);

    return res.status(400).json({
      success: false,
      message: 'Invalid or expired verification token',
    });
  }
};

/**
 * Request password reset
 * POST /api/auth/forgot-password
 */
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { email } = req.body;

    const result = await authService.requestPasswordReset(email);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Forgot password error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to process request. Please try again.',
    });
  }
};

/**
 * Reset password with token
 * POST /api/auth/reset-password
 */
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { token, password } = req.body;

    const result = await authService.resetPassword(token, password);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Reset password error:', error);

    return res.status(400).json({
      success: false,
      message: 'Invalid or expired reset token',
    });
  }
};

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
export const refreshToken = async (req: Request, res: Response) => {
  try {
    // Get refresh token from cookie
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token not found',
      });
    }

    const result = await authService.refreshAccessToken(refreshToken);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Refresh token error:', error);

    return res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token',
    });
  }
};

/**
 * Logout user
 * POST /api/auth/logout
 */
export const logout = async (req: Request, res: Response) => {
  try {
    // Clear refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);

    return res.status(500).json({
      success: false,
      message: 'Logout failed',
    });
  }
};

/**
 * Get current user info
 * GET /api/auth/me
 * (Requires authentication middleware)
 */
export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    // User info is attached by auth middleware
    const user = (req as any).user;

    return res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    console.error('Get current user error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to get user info',
    });
  }
};