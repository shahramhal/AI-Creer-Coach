// apps/backend/src/controllers/profile.controller.ts

import type { Request, Response } from 'express';
import { ProfileService } from '../services/profile.service.js';

const profileService = new ProfileService();

/**
 * GET /api/profile/:userId
 * Get user profile
 */
export const getProfile = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Ensure user can only access their own profile
    const currentUserId = (req as any).user.id;
    if (userId !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const profile = await profileService.getProfile(userId);

    return res.status(200).json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
};

/**
 * PUT /api/profile
 * Update user profile
 */
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const updates = req.body;

    const profile = await profileService.updateProfile(userId, updates);

    return res.status(200).json({
      success: true,
      data: profile,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
};

/**
 * POST /api/profile/avatar
 * Upload profile avatar
 */
export const uploadAvatar = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Build avatar URL
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    
    const profile = await profileService.updateAvatar(userId, avatarUrl);

    return res.status(200).json({
      success: true,
      data: { avatarUrl: profile.avatarUrl },
      message: 'Avatar uploaded successfully'
    });
  } catch (error) {
    console.error('Upload avatar error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload avatar'
    });
  }
};

