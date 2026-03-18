// apps/backend/src/controllers/profile.controller.ts

import type { Request, Response } from 'express';
import { ProfileService } from '../services/profile.service.js';
import { accountService } from '../services/account.service.js';

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

    const currentUserId = req.user!.id;
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
 * Update user profile (supports firstName/lastName for User model)
 */
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { firstName, lastName, ...profileUpdates } = req.body;

    if (firstName !== undefined || lastName !== undefined) {
      const userData: { firstName?: string; lastName?: string } = {};
      if (firstName !== undefined) userData.firstName = firstName;
      if (lastName !== undefined) userData.lastName = lastName;

      const result = await profileService.updateProfileWithUser(userId, profileUpdates, userData);
      return res.status(200).json({
        success: true,
        data: result.profile,
        message: 'Profile updated successfully'
      });
    }

    const profile = await profileService.updateProfile(userId, profileUpdates);

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
 * GET /api/profile/preferences
 * Get career preferences
 */
export const getCareerPreferences = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const preferences = await profileService.getCareerPreferences(userId);

    return res.status(200).json({
      success: true,
      data: preferences
    });
  } catch (error) {
    console.error('Get career preferences error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch career preferences'
    });
  }
};

/**
 * PUT /api/profile/preferences
 * Update career preferences
 */
export const updateCareerPreferences = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const preferences = req.body;

    await profileService.updateCareerPreferences(userId, preferences);
    const updated = await profileService.getCareerPreferences(userId);

    return res.status(200).json({
      success: true,
      data: updated,
      message: 'Career preferences updated successfully'
    });
  } catch (error) {
    console.error('Update career preferences error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update career preferences'
    });
  }
};

/**
 * GET /api/profile/export
 * Export all user data as JSON
 */
export const exportData = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const data = await accountService.exportUserData(userId);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="my-data-export.json"');

    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Export data error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to export data'
    });
  }
};

/**
 * DELETE /api/profile/account
 * Delete user account (requires fullName confirmation)
 */
export const deleteAccount = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { fullName } = req.body;

    if (!fullName) {
      return res.status(400).json({
        success: false,
        message: 'Full name confirmation is required'
      });
    }

    const expectedName = [req.user!.firstName, req.user!.lastName].filter(Boolean).join(' ');

    if (fullName !== expectedName) {
      return res.status(400).json({
        success: false,
        message: 'Name does not match. Please type your full name exactly.'
      });
    }

    await accountService.deleteUserAccount(userId);

    // Clear refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });

    return res.status(200).json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Delete account error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete account'
    });
  }
};

/**
 * POST /api/profile/avatar
 * Upload profile avatar
 */
export const uploadAvatar = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

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
    const userId = req.user!.id;

    const profile = await profileService.getProfile(userId);

    if (profile.avatarUrl) {
      const fs = await import('fs/promises');
      const path = await import('path');

      const filename = profile.avatarUrl.split('/').pop();
      const filePath = path.join(process.cwd(), 'public', 'uploads', 'avatars', filename!);

      try {
        await fs.unlink(filePath);
      } catch (fileError) {
        console.error('Failed to delete avatar file:', fileError);
      }
    }

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
