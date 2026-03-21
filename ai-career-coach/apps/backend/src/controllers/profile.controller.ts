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

/**
 * DELETE /api/profile/avatar
 * Delete profile avatar
 */
export const deleteAvatar = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    // Get current profile to find avatar file
    const profile = await profileService.getProfile(userId);

    if (profile.avatarUrl) {
      // Delete file from storage
      const fs = await import('fs/promises');
      const path = await import('path');

      const filename = profile.avatarUrl.split('/').pop();
      const filePath = path.join(process.cwd(), 'public', 'uploads', 'avatars', filename!);

      try {
        await fs.unlink(filePath);
      } catch (fileError) {
        console.error('Failed to delete avatar file:', fileError);
        // Continue even if file deletion fails
      }
    }

    // Remove avatar URL from database
    const updatedProfile = await profileService.updateAvatar(userId, null);

    return res.status(200).json({
      success: true,
      data: { avatarUrl: null },
      message: 'Avatar deleted successfully'
    });
  } catch (error) {
    console.error('Delete avatar error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete avatar'
    });
  }
};

