import type { Request, Response } from 'express';
import { logger } from '../utils/logger.js';
import mongoose from 'mongoose';
import { SkillGapService } from '../services/skillGap.service.js';
import { AppError, ErrorCodes } from '../utils/app-error.util.js';
import { type IParsedCV } from '../models/ParsedCV.js';
import { buildCVText } from '../utils/cv-text.util.js';

const skillGapService = new SkillGapService();

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type CVDocument = IParsedCV;

async function fetchUserCV(userId: string): Promise<CVDocument | null> {
  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) return null;
  const cvCollection = mongoose.connection.db.collection<CVDocument>('parsed_cvs');
  return cvCollection.findOne({ user_id: userId }, { sort: { created_at: -1 } });
}

export const analyzeSkillGap = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('Not authenticated', 401, ErrorCodes.INVALID_CREDENTIALS);
    }

    const { targetRole, targetJobDescription } = req.body;

    if (targetJobDescription && targetJobDescription.length > 10000) {
      throw new AppError('targetJobDescription must be under 10,000 characters', 400, ErrorCodes.VALIDATION_ERROR);
    }

    const userCV = await fetchUserCV(userId);
    if (!userCV) {
      throw new AppError(
        'No CV found. Please upload your CV first.',
        404,
        ErrorCodes.NOT_FOUND,
      );
    }

    const cvText = buildCVText(userCV);
    if (!cvText || cvText.length < 10) {
      throw new AppError(
        'CV has no usable content. Please re-upload.',
        404,
        ErrorCodes.NOT_FOUND,
      );
    }

    const parsedData = {
      skills: userCV.skills || [],
      experience: userCV.experience || [],
      education: userCV.education || [],
      summary: userCV.summary || '',
    };

    const result = await skillGapService.analyzeSkillGap(
      userId,
      cvText,
      parsedData,
      targetRole,
      targetJobDescription,
    );

    res.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, message: error.message, code: error.code });
      return;
    }
    logger.error(error);
    res.status(500).json({ success: false, message: 'Skill gap analysis failed' });
  }
};

export const getLearningPaths = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('Not authenticated', 401, ErrorCodes.INVALID_CREDENTIALS);
    }

    const learningPaths = await skillGapService.getLearningPaths(userId);
    res.json({ success: true, data: learningPaths });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    logger.error(error);
    res.status(500).json({ success: false, message: 'Failed to fetch learning paths' });
  }
};

export const getLearningPathDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('Not authenticated', 401, ErrorCodes.INVALID_CREDENTIALS);
    }

    const learningPathId = req.params['learningPathId']!;
    if (!UUID_REGEX.test(learningPathId)) {
      throw new AppError('Invalid learningPathId format', 400, ErrorCodes.VALIDATION_ERROR);
    }
    const learningPath = await skillGapService.getLearningPathWithCourses(userId, learningPathId);

    if (!learningPath) {
      throw new AppError('Learning path not found', 404, ErrorCodes.NOT_FOUND);
    }

    res.json({ success: true, data: learningPath });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    logger.error(error);
    res.status(500).json({ success: false, message: 'Failed to fetch learning path details' });
  }
};

export const updateProgress = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('Not authenticated', 401, ErrorCodes.INVALID_CREDENTIALS);
    }

    const learningPathId = req.params['learningPathId']!;
    if (!UUID_REGEX.test(learningPathId)) {
      throw new AppError('Invalid learningPathId format', 400, ErrorCodes.VALIDATION_ERROR);
    }
    const { progressPercentage } = req.body;

    if (typeof progressPercentage !== 'number' || progressPercentage < 0 || progressPercentage > 100) {
      throw new AppError('progressPercentage must be 0-100', 400, ErrorCodes.VALIDATION_ERROR);
    }

    const updated = await skillGapService.updateLearningPathProgress(userId, learningPathId, progressPercentage);
    if (!updated) {
      throw new AppError('Learning path not found', 404, ErrorCodes.NOT_FOUND);
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    logger.error(error);
    res.status(500).json({ success: false, message: 'Failed to update progress' });
  }
};

export const updateCourseProgress = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('Not authenticated', 401, ErrorCodes.INVALID_CREDENTIALS);
    }

    const courseId = req.params['courseId']!;
    if (!UUID_REGEX.test(courseId)) {
      throw new AppError('Invalid courseId format', 400, ErrorCodes.VALIDATION_ERROR);
    }
    const { progress, status } = req.body;

    if (typeof progress !== 'number' || progress < 0 || progress > 100) {
      throw new AppError('progress must be 0-100', 400, ErrorCodes.VALIDATION_ERROR);
    }

    const validStatuses = ['not_started', 'in_progress', 'completed'];
    if (!validStatuses.includes(status)) {
      throw new AppError(`status must be one of: ${validStatuses.join(', ')}`, 400, ErrorCodes.VALIDATION_ERROR);
    }

    const updated = await skillGapService.updateCourseProgress(userId, courseId, progress, status);
    if (!updated) {
      throw new AppError('Course not found or not in your learning paths', 404, ErrorCodes.NOT_FOUND);
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    logger.error(error);
    res.status(500).json({ success: false, message: 'Failed to update course progress' });
  }
};

export const getProgressSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('Not authenticated', 401, ErrorCodes.INVALID_CREDENTIALS);
    }

    const summary = await skillGapService.getProgressSummary(userId);
    res.json({ success: true, data: summary });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    logger.error(error);
    res.status(500).json({ success: false, message: 'Failed to fetch progress summary' });
  }
};
