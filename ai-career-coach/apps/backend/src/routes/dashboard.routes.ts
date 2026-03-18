import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { getRecentActivity } from '../controllers/dashboard.controller.js';

const router = Router();

router.use(authenticate);

// GET /api/dashboard/recent-activity
router.get('/recent-activity', getRecentActivity);

export default router;
