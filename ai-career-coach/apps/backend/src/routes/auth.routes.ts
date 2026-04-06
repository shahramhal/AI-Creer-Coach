// apps/backend/src/routes/auth.routes.ts

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
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
    validate,
    registerValidation,
    loginValidation,
    forgotPasswordValidation,
    resetPasswordValidation,
} from '../middlewares/validation.middleware.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many login attempts, please try again in a minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { success: false, message: 'Too many accounts created from this IP, please try again after an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1,
  message: { success: false, message: 'Too many password reset requests, please try again in a minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, message: 'Too many token refresh requests.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/auth/register - Register new user
router.post('/register', registerLimiter, registerValidation, validate, register);

// POST /api/auth/login - Login user
router.post('/login', loginLimiter, loginValidation, validate, login);

// GET /api/auth/verify-email?token=xxx - Verify email
router.get('/verify-email', verifyEmail);

// POST /api/auth/forgot-password - Request password reset
router.post('/forgot-password', forgotPasswordLimiter, forgotPasswordValidation, validate, forgotPassword);

// POST /api/auth/reset-password - Reset password with token
router.post('/reset-password', resetPasswordValidation, validate, resetPassword);

// POST /api/auth/refresh - Refresh access token
router.post('/refresh', refreshLimiter, refreshToken);

/**
 * Protected routes (authentication required)
 */

// POST /api/auth/logout - Logout user
router.post('/logout', authenticate, logout);

// GET /api/auth/me - Get current user info
router.get('/me', authenticate, getCurrentUser);

export default router;