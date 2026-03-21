// apps/backend/src/routes/auth.routes.ts

import { Router } from 'express';
import {
  register,
  login,
  verifyEmail,
  forgotPassword,
  resetPassword,
  refreshToken,
  logout,
  getCurrentUser,
} from '../controllers/auth.controller.js';
import {
    registerValidation,
    loginValidation,
    forgotPasswordValidation,
    resetPasswordValidation,
} from '../middlewares/validation.middleware.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

/**
 * Public routes (no authentication required)
 */

// POST /api/auth/register - Register new user
router.post('/register', registerValidation, register);

// POST /api/auth/login - Login user
router.post('/login', loginValidation, login);

// GET /api/auth/verify-email?token=xxx - Verify email
router.get('/verify-email', verifyEmail);

// POST /api/auth/forgot-password - Request password reset
router.post('/forgot-password', forgotPasswordValidation, forgotPassword);

// POST /api/auth/reset-password - Reset password with token
router.post('/reset-password', resetPasswordValidation, resetPassword);

// POST /api/auth/refresh - Refresh access token
router.post('/refresh', refreshToken);

/**
 * Protected routes (authentication required)
 */

// POST /api/auth/logout - Logout user
router.post('/logout', authenticate, logout);

// GET /api/auth/me - Get current user info
router.get('/me', authenticate, getCurrentUser);

export default router;