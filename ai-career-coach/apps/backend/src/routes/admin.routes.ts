// apps/backend/src/routes/admin.routes.ts

import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireAdmin } from '../middlewares/admin.middleware.js';
import * as adminController from '../controllers/admin.controller.js';

const router = Router();

// All admin routes require authentication + admin role
router.use(authenticate as any);
router.use(requireAdmin as any);

// Dashboard
router.get('/dashboard/stats', adminController.getDashboardStats as any);
router.get('/dashboard/user-growth', adminController.getUserGrowthTrend as any);

// User Management
router.get('/users', adminController.listUsers as any);
router.get('/users/:userId', adminController.getUserDetail as any);
router.patch('/users/:userId/status', adminController.toggleUserStatus as any);
router.post('/users/:userId/promote', adminController.promoteUser as any);
router.post('/users/:userId/demote', adminController.demoteUser as any);
router.post('/users/:userId/force-reset-password', adminController.forceResetPassword as any);
router.delete('/users/:userId', adminController.deleteUser as any);

// Job Management
router.get('/jobs', adminController.listJobs as any);
router.get('/jobs/stats', adminController.getJobStats as any);
router.post('/jobs/fetch', adminController.triggerJobFetch as any);
router.post('/jobs/cleanup', adminController.triggerJobCleanup as any);
router.delete('/jobs/:jobId', adminController.deleteJob as any);

// System Monitoring
router.get('/system/health', adminController.getServiceHealth as any);
router.get('/system/cache', adminController.getCacheStats as any);
router.get('/system/queues', adminController.getQueueStatus as any);
router.get('/system/database', adminController.getDatabaseStats as any);

// Audit Logs
router.get('/audit-logs', adminController.getAuditLogs as any);

export default router;
