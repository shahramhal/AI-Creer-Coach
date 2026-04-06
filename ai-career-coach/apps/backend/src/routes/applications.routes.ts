import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import {
  createApplication,
  listApplications,
  getApplicationStats,
  updateApplicationStatus,
  deleteApplication,
  atsCheck,
  atsPreview,
  atsScore,
} from '../controllers/applications.controller.js';

const router = Router();

router.post('/', authenticate, createApplication);
router.get('/', authenticate, listApplications);
router.get('/stats', authenticate, getApplicationStats);
router.patch('/:id/status', authenticate, updateApplicationStatus);
router.delete('/:id', authenticate, deleteApplication);

// Static ATS routes must come before parameterised routes to avoid
// Express matching "/ats-check" as ":applicationId"
router.post('/ats-check', authenticate, atsCheck);
router.post('/jobs/:jobId/ats-preview', authenticate, atsPreview);
router.post('/:applicationId/ats-score', authenticate, atsScore);

export default router;
