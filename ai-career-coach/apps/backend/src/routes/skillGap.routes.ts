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

const router = express.Router();

router.post('/analyze', authenticate, analyzeSkillGap);
router.get('/learning-paths', authenticate, getLearningPaths);
router.get('/learning-paths/:learningPathId', authenticate, getLearningPathDetails);
router.patch('/learning-paths/:learningPathId/progress', authenticate, updateProgress);
router.patch('/courses/:courseId/progress', authenticate, updateCourseProgress);
router.get('/summary', authenticate, getProgressSummary);

export default router;
