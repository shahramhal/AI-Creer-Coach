// apps/backend/src/controllers/admin.controller.ts

import type { Request, Response, NextFunction } from 'express';
import { AdminService } from '../services/admin.service.js';
import { logAdminAction } from '../utils/audit.util.js';

const adminService = new AdminService();

export const getDashboardStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const stats = await adminService.getDashboardStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

export const getUserGrowthTrend = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const trend = await adminService.getUserGrowthTrend(days);
    res.json({ success: true, data: trend });
  } catch (error) {
    next(error);
  }
};

export const listUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const search = req.query.search as string | undefined;
    const role = req.query.role as string | undefined;
    const sortBy = req.query.sortBy as string | undefined;
    const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

    const result = await adminService.listUsers({
      page,
      limit,
      sortOrder,
      ...(search !== undefined && { search }),
      ...(role !== undefined && { role }),
      ...(sortBy !== undefined && { sortBy }),
    });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const getUserDetail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await adminService.getUserDetail(req.params['userId'] as string);
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

export const toggleUserStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.params['userId'] as string;
    const { disabled } = req.body;

    if (userId === req.user!.id) {
      res.status(400).json({ success: false, message: 'Cannot disable yourself' });
      return;
    }

    if (typeof disabled !== 'boolean') {
      res.status(400).json({ success: false, message: 'disabled must be a boolean' });
      return;
    }

    const result = await adminService.toggleUserDisabled(userId, disabled);

    logAdminAction(req, {
      action: disabled ? 'USER_DISABLED' : 'USER_ENABLED',
      targetType: 'user',
      targetId: userId,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const promoteUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.params['userId'] as string;
    const result = await adminService.promoteUser(userId);

    logAdminAction(req, {
      action: 'USER_PROMOTED',
      targetType: 'user',
      targetId: userId,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const demoteUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.params['userId'] as string;
    const result = await adminService.demoteUser(userId, req.user!.id);

    logAdminAction(req, {
      action: 'USER_DEMOTED',
      targetType: 'user',
      targetId: userId,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const forceResetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.params['userId'] as string;
    const result = await adminService.forcePasswordReset(userId);

    logAdminAction(req, {
      action: 'FORCE_PASSWORD_RESET',
      targetType: 'user',
      targetId: userId,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.params['userId'] as string;
    const result = await adminService.deleteUser(userId, req.user!.id);

    logAdminAction(req, {
      action: 'USER_DELETED',
      targetType: 'user',
      targetId: userId,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const listJobs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const source = req.query.source as string | undefined;
    const country = req.query.country as string | undefined;
    const sortBy = req.query.sortBy as string | undefined;
    const sortOrder = req.query.sortOrder as 'asc' | 'desc' | undefined;

    const result = await adminService.listJobs({
      page,
      limit,
      ...(source !== undefined && { source }),
      ...(country !== undefined && { country }),
      ...(sortBy !== undefined && { sortBy }),
      ...(sortOrder !== undefined && { sortOrder }),
    });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const getJobStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const stats = await adminService.getJobStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

export const triggerJobFetch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { keywords, country, location } = req.body;

    if (!keywords || !country) {
      res.status(400).json({ success: false, message: 'keywords and country are required' });
      return;
    }

    const result = await adminService.triggerJobFetch(country, keywords, location);

    logAdminAction(req, {
      action: 'JOB_FETCH_TRIGGERED',
      targetType: 'job',
      details: { keywords, country, location },
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const triggerJobCleanup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await adminService.triggerJobCleanup();

    logAdminAction(req, {
      action: 'JOB_CLEANUP_TRIGGERED',
      targetType: 'job',
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const deleteJob = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const jobId = req.params['jobId'] as string;
    const result = await adminService.deleteJob(jobId);

    logAdminAction(req, {
      action: 'JOB_DELETED',
      targetType: 'job',
      targetId: jobId,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const getServiceHealth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const health = await adminService.getServiceHealth();
    res.json({ success: true, data: health });
  } catch (error) {
    next(error);
  }
};

export const getCacheStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const stats = await adminService.getCacheStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

export const getQueueStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const queues = await adminService.getQueueStatus();
    res.json({ success: true, data: queues });
  } catch (error) {
    next(error);
  }
};

export const getDatabaseStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const stats = await adminService.getDatabaseStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

export const getAuditLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const action = req.query.action as string | undefined;

    const result = await adminService.getAuditLogs({
      page,
      limit,
      ...(action !== undefined && { action }),
    });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
