// apps/backend/src/routes/admin.routes.ts

import { Router } from 'express';
import type { RequestHandler } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireAdmin } from '../middlewares/admin.middleware.js';
import * as adminController from '../controllers/admin.controller.js';

const router = Router();

router.use(authenticate as RequestHandler);
router.use(requireAdmin as RequestHandler);

router.get('/dashboard/stats', adminController.getDashboardStats);
router.get('/dashboard/user-growth', adminController.getUserGrowthTrend);

router.get('/users', adminController.listUsers);
router.get('/users/:userId', adminController.getUserDetail);
router.patch('/users/:userId/status', adminController.toggleUserStatus);
router.post('/users/:userId/promote', adminController.promoteUser);
router.post('/users/:userId/demote', adminController.demoteUser);
router.post('/users/:userId/force-reset-password', adminController.forceResetPassword);
router.delete('/users/:userId', adminController.deleteUser);

router.get('/jobs', adminController.listJobs);
router.get('/jobs/stats', adminController.getJobStats);
router.post('/jobs/fetch', adminController.triggerJobFetch);
router.post('/jobs/cleanup', adminController.triggerJobCleanup);
router.delete('/jobs/:jobId', adminController.deleteJob);

router.get('/system/health', adminController.getServiceHealth);
router.get('/system/cache', adminController.getCacheStats);
router.get('/system/queues', adminController.getQueueStatus);
router.get('/system/database', adminController.getDatabaseStats);

router.get('/audit-logs', adminController.getAuditLogs);

export default router;
