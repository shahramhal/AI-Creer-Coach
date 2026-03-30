import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { getInsights, savePreferences } from '../controllers/salary.controller.js';

const router = Router();

router.get('/insights', authenticate, getInsights);
router.patch('/preferences', authenticate, savePreferences);

export default router;
