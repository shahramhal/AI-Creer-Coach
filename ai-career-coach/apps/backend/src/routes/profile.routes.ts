// apps/backend/src/routes/profile.routes.ts

import { Router } from 'express';
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

export default router;