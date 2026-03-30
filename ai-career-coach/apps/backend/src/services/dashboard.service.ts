import { prisma } from '../config/database.js';

interface DashboardActivity {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
}

export class DashboardService {
  async getRecentActivity(userId: string, limit: number = 10): Promise<DashboardActivity[]> {
    const activities = await prisma.userActivity.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        type: true,
        title: true,
        description: true,
        createdAt: true,
      },
    });

    return activities.map((activity) => ({
      id: activity.id,
      type: activity.type,
      title: activity.title,
      description: activity.description,
      timestamp: activity.createdAt.toISOString(),
    }));
  }
}
