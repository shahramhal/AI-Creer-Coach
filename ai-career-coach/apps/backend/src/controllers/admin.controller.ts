// apps/backend/src/controllers/admin.controller.ts

import type { Request, Response } from 'express';
import { AdminService } from '../services/admin.service.js';
import { logAdminAction } from '../utils/audit.util.js';

const adminService = new AdminService();

// ─── Dashboard ──────────────────────────────────────────────

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const stats = await adminService.getDashboardStats();
    return res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Admin dashboard stats error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats' });
  }
};

export const getUserGrowthTrend = async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const trend = await adminService.getUserGrowthTrend(days);
    return res.json({ success: true, data: trend });
  } catch (error) {
    console.error('User growth trend error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch user growth trend' });
  }
};

// ─── User Management ───────────────────────────────────────

export const listUsers = async (req: Request, res: Response) => {
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
    console.error('List users error:', error);
    return res.status(500).json({ success: false, message: 'Failed to list users' });
  }
};

export const getUserDetail = async (req: Request, res: Response) => {
  try {
    const user = await adminService.getUserDetail(req.params.userId);
    return res.json({ success: true, data: user });
  } catch (error) {
    console.error('Get user detail error:', error);
    if (error instanceof Error && error.message === 'User not found') {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.status(500).json({ success: false, message: 'Failed to get user details' });
  }
};

export const toggleUserStatus = async (req: Request, res: Response) => {
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
    console.error('Toggle user status error:', error);
    if (error instanceof Error && error.message === 'User not found') {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.status(500).json({ success: false, message: 'Failed to update user status' });
  }
};

export const promoteUser = async (req: Request, res: Response) => {
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
    console.error('Promote user error:', error);
    if (error instanceof Error) {
      if (error.message === 'User not found') {
        return res.status(404).json({ success: false, message: error.message });
      }
      if (error.message === 'User is already an admin') {
        return res.status(400).json({ success: false, message: error.message });
      }
    }
    return res.status(500).json({ success: false, message: 'Failed to promote user' });
  }
};

export const demoteUser = async (req: Request, res: Response) => {
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
    console.error('Demote user error:', error);
    if (error instanceof Error) {
      const clientErrors = ['User not found', 'User is not an admin', 'Cannot demote yourself', 'Cannot demote the last admin'];
      if (clientErrors.includes(error.message)) {
        return res.status(400).json({ success: false, message: error.message });
      }
    }
    return res.status(500).json({ success: false, message: 'Failed to demote user' });
  }
};

export const forceResetPassword = async (req: Request, res: Response) => {
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
    console.error('Force reset password error:', error);
    if (error instanceof Error && error.message === 'User not found') {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.status(500).json({ success: false, message: 'Failed to reset password' });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
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
    console.error('Delete user error:', error);
    if (error instanceof Error) {
      if (error.message === 'User not found') {
        return res.status(404).json({ success: false, message: error.message });
      }
      if (error.message === 'Cannot delete yourself') {
        return res.status(400).json({ success: false, message: error.message });
      }
    }
    return res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
};

// ─── Job Management ────────────────────────────────────────

export const listJobs = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const source = req.query.source as string | undefined;
    const country = req.query.country as string | undefined;

    const result = await adminService.listJobs({ page, limit, source, country });
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('List jobs error:', error);
    return res.status(500).json({ success: false, message: 'Failed to list jobs' });
  }
};

export const getJobStats = async (req: Request, res: Response) => {
  try {
    const stats = await adminService.getJobStats();
    return res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Job stats error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch job stats' });
  }
};

export const triggerJobFetch = async (req: Request, res: Response) => {
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
    console.error('Trigger job fetch error:', error);
    return res.status(500).json({ success: false, message: 'Failed to trigger job fetch' });
  }
};

export const triggerJobCleanup = async (req: Request, res: Response) => {
  try {
    const result = await adminService.triggerJobCleanup();

    logAdminAction(req, {
      action: 'JOB_CLEANUP_TRIGGERED',
      targetType: 'job',
    });

    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('Trigger job cleanup error:', error);
    return res.status(500).json({ success: false, message: 'Failed to trigger job cleanup' });
  }
};

export const deleteJob = async (req: Request, res: Response) => {
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
    console.error('Delete job error:', error);
    if (error instanceof Error && error.message === 'Job not found') {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }
    return res.status(500).json({ success: false, message: 'Failed to delete job' });
  }
};

// ─── System Monitoring ─────────────────────────────────────

export const getServiceHealth = async (req: Request, res: Response) => {
  try {
    const health = await adminService.getServiceHealth();
    return res.json({ success: true, data: health });
  } catch (error) {
    console.error('Service health error:', error);
    return res.status(500).json({ success: false, message: 'Failed to check service health' });
  }
};

export const getCacheStats = async (req: Request, res: Response) => {
  try {
    const stats = await adminService.getCacheStats();
    return res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Cache stats error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch cache stats' });
  }
};

export const getQueueStatus = async (req: Request, res: Response) => {
  try {
    const queues = await adminService.getQueueStatus();
    return res.json({ success: true, data: queues });
  } catch (error) {
    console.error('Queue status error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch queue status' });
  }
};

export const getDatabaseStats = async (req: Request, res: Response) => {
  try {
    const stats = await adminService.getDatabaseStats();
    return res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Database stats error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch database stats' });
  }
};

// ─── Audit Logs ──────────────────────────────────────────────

export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const action = req.query.action as string | undefined;

    const result = await adminService.getAuditLogs({ page, limit, action });
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('Audit logs error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch audit logs' });
  }
};
