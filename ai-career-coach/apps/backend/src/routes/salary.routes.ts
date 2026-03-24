import { Router } from 'express';
import type { RequestHandler } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { getInsights, savePreferences } from '../controllers/salary.controller.js';

const router = Router();

router.get('/insights', authenticate as RequestHandler, getInsights as RequestHandler);
router.patch('/preferences', authenticate as RequestHandler, savePreferences as RequestHandler);

export default router;
