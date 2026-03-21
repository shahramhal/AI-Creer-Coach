import type { Request, Response } from 'express';
import { DashboardService } from '../services/dashboard.service.js';

const dashboardService = new DashboardService();

/**
 * GET /api/dashboard/recent-activity
 * Get recent activity for the authenticated user
 */
export const getRecentActivity = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const limit = Math.min(Number(req.query.limit) || 10, 50);

    const activities = await dashboardService.getRecentActivity(userId, limit);

    return res.status(200).json({
      success: true,
      data: activities,
    });
  } catch (error) {
    console.error('Get recent activity error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch recent activity',
    });
  }
};
