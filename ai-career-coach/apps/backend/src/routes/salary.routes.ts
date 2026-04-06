import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { getInsights, savePreferences } from '../controllers/salary.controller.js';
import { validate, salaryInsightsValidation } from '../middlewares/validation.middleware.js';

const router = Router();

router.get('/insights', authenticate, salaryInsightsValidation, validate, getInsights);
router.patch('/preferences', authenticate, savePreferences);

export default router;
