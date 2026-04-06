import express from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import {
  analyzeSkillGap,
  getLearningPaths,
  getLearningPathDetails,
  updateProgress,
  updateCourseProgress,
  getProgressSummary,
} from '../controllers/skillGap.controller.js';
import {
  validate,
  analyzeSkillGapValidation,
  updateLearningPathProgressValidation,
  updateCourseProgressValidation,
} from '../middlewares/validation.middleware.js';

const router = express.Router();

router.post('/analyze', authenticate, analyzeSkillGapValidation, validate, analyzeSkillGap);
router.get('/learning-paths', authenticate, getLearningPaths);
router.get('/learning-paths/:learningPathId', authenticate, getLearningPathDetails);
router.patch('/learning-paths/:learningPathId/progress', authenticate, updateLearningPathProgressValidation, validate, updateProgress);
router.patch('/courses/:courseId/progress', authenticate, updateCourseProgressValidation, validate, updateCourseProgress);
router.get('/summary', authenticate, getProgressSummary);

export default router;
