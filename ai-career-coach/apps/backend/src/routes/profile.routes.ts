// apps/backend/src/routes/profile.routes.ts

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { upload } from '../middlewares/upload.middleware.js';
import {
  getProfile,
  updateProfile,
  uploadAvatar,
  deleteAvatar,
  getCareerPreferences,
  updateCareerPreferences,
  exportData,
  deleteAccount
} from '../controllers/profile.controller.js';
import { validate, updateProfileValidation } from '../middlewares/validation.middleware.js';

const router = Router();

// All profile routes require authentication
router.use(authenticate);

// Named routes MUST come before /:userId to avoid being captured as a param
// GET /api/profile/preferences - Get career preferences
router.get('/preferences', getCareerPreferences);

// PUT /api/profile/preferences - Update career preferences
router.put('/preferences', updateCareerPreferences);

// GET /api/profile/export - Export user data
router.get('/export', exportData);

// DELETE /api/profile/account - Delete user account
router.delete('/account', deleteAccount);

// PUT /api/profile - Update profile
router.put('/', updateProfileValidation, validate, updateProfile);

// POST /api/profile/avatar - Upload avatar
router.post('/avatar', upload.single('avatar'), uploadAvatar);

// DELETE /api/profile/avatar - Delete avatar
router.delete('/avatar', deleteAvatar);

// GET /api/profile/:userId - Get profile (must be last)
router.get('/:userId', getProfile);

// Multer error handler - catches file upload errors
router.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File size too large. Maximum size is 5MB.'
    });
  }

  if (err.message === 'Invalid file type. Only JPEG, PNG allowed') {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }

  next(err);
});

export default router;
