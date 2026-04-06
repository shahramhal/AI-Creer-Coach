// apps/backend/src/middlewares/validation.middleware.ts

import { body, query, validationResult } from 'express-validator';
import type { Request, Response, NextFunction } from 'express';

/**
 * Runs express-validator's validationResult and short-circuits with 400
 * if any rule failed. Wire after the rule arrays in route definitions.
 */
export const validate = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return;
  }
  next();
};

export const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),

  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),

  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),

  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters'),
];

export const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

export const forgotPasswordValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
];

export const resetPasswordValidation = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),

  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),
];

export const createApplicationValidation = [
  body('company')
    .trim()
    .notEmpty()
    .withMessage('Company is required')
    .isLength({ max: 255 })
    .withMessage('Company name must be under 255 characters'),

  body('jobTitle')
    .trim()
    .notEmpty()
    .withMessage('Job title is required')
    .isLength({ max: 255 })
    .withMessage('Job title must be under 255 characters'),

  body('notes')
    .optional()
    .isString()
    .isLength({ max: 5000 })
    .withMessage('Notes must be under 5000 characters'),

  body('sourceUrl')
    .optional()
    .isURL()
    .withMessage('Source URL must be a valid URL'),

  body('location')
    .optional()
    .isString()
    .trim(),
];

export const updateApplicationStatusValidation = [
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['applied', 'interview', 'offer', 'rejected'])
    .withMessage('Status must be one of: applied, interview, offer, rejected'),
];

export const atsCheckValidation = [
  body('jobDescription')
    .trim()
    .notEmpty()
    .withMessage('Job description is required')
    .isLength({ min: 20 })
    .withMessage('Job description must be at least 20 characters')
    .isLength({ max: 10000 })
    .withMessage('Job description must be under 10,000 characters'),
];

export const findJobsValidation = [
  body('cv_id')
    .optional()
    .isString()
    .trim(),

  body('top_k')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('top_k must be an integer between 1 and 100'),

  body('job_limit')
    .optional()
    .isInt({ min: 1, max: 5000 })
    .withMessage('job_limit must be an integer between 1 and 5000'),
];

export const analyzeSkillGapValidation = [
  body('targetRole')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 200 })
    .withMessage('targetRole must be under 200 characters'),

  body('targetJobDescription')
    .optional()
    .isString()
    .isLength({ max: 10000 })
    .withMessage('targetJobDescription must be under 10,000 characters'),
];

export const updateLearningPathProgressValidation = [
  body('progressPercentage')
    .notEmpty()
    .withMessage('progressPercentage is required')
    .isFloat({ min: 0, max: 100 })
    .withMessage('progressPercentage must be a number between 0 and 100'),
];

export const updateCourseProgressValidation = [
  body('progress')
    .notEmpty()
    .withMessage('progress is required')
    .isFloat({ min: 0, max: 100 })
    .withMessage('progress must be a number between 0 and 100'),

  body('status')
    .optional()
    .isIn(['not_started', 'in_progress', 'completed'])
    .withMessage('status must be one of: not_started, in_progress, completed'),
];

export const updateProfileValidation = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('First name must be under 50 characters'),

  body('lastName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Last name must be under 50 characters'),

  body('bio')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Bio must be under 500 characters'),

  body('phoneNumber')
    .optional()
    .isString()
    .trim(),

  body('location')
    .optional()
    .isString()
    .trim(),

  body('linkedinUrl')
    .optional()
    .isURL()
    .withMessage('LinkedIn URL must be a valid URL'),

  body('githubUrl')
    .optional()
    .isURL()
    .withMessage('GitHub URL must be a valid URL'),

  body('portfolioUrl')
    .optional()
    .isURL()
    .withMessage('Portfolio URL must be a valid URL'),

  body('jobTitle')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Job title must be under 100 characters'),
];

export const salaryInsightsValidation = [
  query('title')
    .notEmpty()
    .withMessage('Job title is required')
    .isString()
    .trim(),

  query('location')
    .optional()
    .isString()
    .trim(),
];

export const adminListUsersValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be an integer >= 1'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be an integer between 1 and 100'),
];

export const adminToggleUserStatusValidation = [
  body('isDisabled')
    .isBoolean()
    .withMessage('isDisabled must be a boolean'),
];

export const adminForceResetPasswordValidation = [
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters'),
];
