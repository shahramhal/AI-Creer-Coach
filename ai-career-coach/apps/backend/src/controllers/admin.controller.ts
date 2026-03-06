// apps/backend/src/controllers/admin.controller.ts

import type { Request, Response, NextFunction } from 'express';
import { AdminService } from '../services/admin.service.js';
import { logAdminAction } from '../utils/audit.util.js';

const adminService = new AdminService();

// ─── Dashboard ──────────────────────────────────────────────

export const getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await adminService.getDashboardStats();
    return res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

export const getUserGrowthTrend = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const trend = await adminService.getUserGrowthTrend(days);
    return res.json({ success: true, data: trend });
  } catch (error) {
    next(error);
  }
};

// ─── User Management ───────────────────────────────────────

export const listUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const search = req.query.search as string | undefined;
    const role = req.query.role as string | undefined;
    const sortBy = req.query.sortBy as string | undefined;
    const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

    const result = await adminService.listUsers({ page, limit, search, role, sortBy, sortOrder });
    return res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const getUserDetail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await adminService.getUserDetail(req.params.userId);
    return res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

export const toggleUserStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const { disabled } = req.body;

    if (userId === req.user!.id) {
      return res.status(400).json({ success: false, message: 'Cannot disable yourself' });
    }

    if (typeof disabled !== 'boolean') {
      return res.status(400).json({ success: false, message: 'disabled must be a boolean' });
    }

    const result = await adminService.toggleUserDisabled(userId, disabled);

    logAdminAction(req, {
      action: disabled ? 'USER_DISABLED' : 'USER_ENABLED',
      targetType: 'user',
      targetId: userId,
    });

    return res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const promoteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const result = await adminService.promoteUser(userId);

    logAdminAction(req, {
      action: 'USER_PROMOTED',
      targetType: 'user',
      targetId: userId,
    });

    return res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const demoteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const result = await adminService.demoteUser(userId, req.user!.id);

    logAdminAction(req, {
      action: 'USER_DEMOTED',
      targetType: 'user',
      targetId: userId,
    });

    return res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const forceResetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const result = await adminService.forcePasswordReset(userId);

    logAdminAction(req, {
      action: 'FORCE_PASSWORD_RESET',
      targetType: 'user',
      targetId: userId,
    });

    return res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const result = await adminService.deleteUser(userId, req.user!.id);

    logAdminAction(req, {
      action: 'USER_DELETED',
      targetType: 'user',
      targetId: userId,
    });

    return res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// ─── Job Management ────────────────────────────────────────

export const listJobs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const source = req.query.source as string | undefined;
    const country = req.query.country as string | undefined;

    const sortBy = req.query.sortBy as string | undefined;
    const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || undefined;

    const result = await adminService.listJobs({ page, limit, source, country, sortBy, sortOrder });
    return res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const getJobStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await adminService.getJobStats();
    return res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

export const triggerJobFetch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { keywords, country, location } = req.body;

    if (!keywords || !country) {
      return res.status(400).json({ success: false, message: 'keywords and country are required' });
    }

    const result = await adminService.triggerJobFetch(country, keywords, location);

    logAdminAction(req, {
      action: 'JOB_FETCH_TRIGGERED',
      targetType: 'job',
      details: { keywords, country, location },
    });

    return res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const triggerJobCleanup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await adminService.triggerJobCleanup();

    logAdminAction(req, {
      action: 'JOB_CLEANUP_TRIGGERED',
      targetType: 'job',
    });

    return res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const deleteJob = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { jobId } = req.params;
    const result = await adminService.deleteJob(jobId);

    logAdminAction(req, {
      action: 'JOB_DELETED',
      targetType: 'job',
      targetId: jobId,
    });

    return res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// ─── System Monitoring ─────────────────────────────────────

export const getServiceHealth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const health = await adminService.getServiceHealth();
    return res.json({ success: true, data: health });
  } catch (error) {
    next(error);
  }
};

export const getCacheStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await adminService.getCacheStats();
    return res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

export const getQueueStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const queues = await adminService.getQueueStatus();
    return res.json({ success: true, data: queues });
  } catch (error) {
    next(error);
  }
};

export const getDatabaseStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await adminService.getDatabaseStats();
    return res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

// ─── Audit Logs ──────────────────────────────────────────────

export const getAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const action = req.query.action as string | undefined;

    const result = await adminService.getAuditLogs({ page, limit, action });
    return res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
