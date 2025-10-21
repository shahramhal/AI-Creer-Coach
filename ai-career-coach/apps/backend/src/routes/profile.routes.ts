// apps/backend/src/routes/profile.routes.ts

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { upload } from '../middlewares/upload.middleware.js';
import {
  getProfile,
  updateProfile,
  uploadAvatar
} from '../controllers/profile.controller.js';

const router = Router();

// All profile routes require authentication
router.use(authenticate);

// GET /api/profile/:userId - Get profile
router.get('/:userId', getProfile);

// PUT /api/profile - Update profile
router.put('/', updateProfile);

// POST /api/profile/avatar - Upload avatar
router.post('/avatar', upload.single('avatar'), uploadAvatar);

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

  // Pass other errors to global error handler
  next(err);
});

export default router;